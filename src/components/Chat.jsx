import { useState, useRef, useEffect, useCallback } from "react";
import { projects, conversations, models, files as filesApi } from "../api/client";
import "./Chat.css";

export default function Chat({ projectId, onProjectCreated, onFilesUpdated, onViewFile, user, onLogout, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState(null);
  const [availableModels, setAvailableModels] = useState([]);
  const [modelSlug, setModelSlug] = useState("");
  const namedRef = useRef(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    models.list().then((list) => {
      setAvailableModels(list);
      if (list.length && !modelSlug) setModelSlug(list[0].slug);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      try {
        const sessions = await conversations.list(projectId);
        if (cancelled || !sessions.length) return;
        const latest = sessions[0];
        setSessionId(latest.id);
        if (latest.model?.slug) setModelSlug(latest.model.slug);
        const msgs = await conversations.messages(projectId, latest.id);
        if (cancelled) return;
        const mapped = msgs
          .filter((m) => m.role === "USER" || m.role === "ASSISTANT")
          .map((m) => ({ role: m.role === "USER" ? "user" : "assistant", content: m.content?.text ?? m.content }));
        if (mapped.length) {
          setMessages(mapped);
          namedRef.current = true;
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  const ensureProject = useCallback(async () => {
    if (projectId) return projectId;
    const project = await projects.create({ name: "New Project" });
    onProjectCreated(project.id);
    return project.id;
  }, [projectId, onProjectCreated]);

  const ensureSession = useCallback(async (pid) => {
    if (sessionId) return sessionId;
    const session = await conversations.start(pid, modelSlug);
    setSessionId(session.id);
    return session.id;
  }, [sessionId, modelSlug]);

  const refreshFiles = useCallback(async (pid) => {
    try {
      const list = await filesApi.list(pid);
      onFilesUpdated(list);
      const stl = list.find((f) => f.name?.endsWith(".stl"));
      if (stl) onViewFile(stl);
    } catch {
    }
  }, [onFilesUpdated, onViewFile]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setSending(true);
    setStatus("Thinking...");

    try {
      const pid = await ensureProject();
      const sid = await ensureSession(pid);
      const response = await conversations.send(pid, sid, text);

      const assistantText =
        response.text || response.output || response.content || JSON.stringify(response);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: assistantText },
      ]);
      setStatus(null);
      if (!namedRef.current) {
        namedRef.current = true;
        const title = text.length > 60 ? text.slice(0, 57) + "..." : text;
        projects.update(pid, { name: title }).catch(() => {});
      }
      await refreshFiles(pid);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "error", content: error.message },
      ]);
      setStatus(null);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      <div className="panel-header">
        <span className="label">
          {onBack && <button className="back-btn" onClick={onBack}>&larr;</button>}
          Chat
        </span>
        <div className="chat-header-right">
          {projectId && <span className="project-tag">Project active</span>}
          {user && (
            <button className="logout-btn" onClick={onLogout}>
              Sign out
            </button>
          )}
        </div>
      </div>
      <div className="panel-body chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>Describe what you want to build.</p>
            <p className="hint">
              Try: "Design a rack-mountable MicroATX server casing with side ventilation"
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg chat-msg-${msg.role}`}>
            <div className="chat-msg-label">
              {msg.role === "user" ? "You" : msg.role === "error" ? "Error" : "nsamble"}
            </div>
            <div className="chat-msg-text">{msg.content}</div>
          </div>
        ))}
        {status && (
          <div className="chat-status">
            <span className="dot-pulse" />
            {status}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-bar">
        {availableModels.length > 1 && !sessionId && (
          <select
            className="chat-model-select"
            value={modelSlug}
            onChange={(e) => setModelSlug(e.target.value)}
          >
            {availableModels.map((m) => (
              <option key={m.slug} value={m.slug}>{m.slug}</option>
            ))}
          </select>
        )}
        <textarea
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Describe a part or assembly..."
          rows={1}
          disabled={sending}
        />
        <button className="chat-send" onClick={send} disabled={sending || !input.trim()}>
          Send
        </button>
      </div>
    </>
  );
}
