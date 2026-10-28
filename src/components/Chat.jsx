import { useState, useRef, useEffect, useCallback } from "react";
import { projects, conversations, files as filesApi } from "../api/client";
import "./Chat.css";

export default function Chat({ projectId, onProjectCreated, onFilesUpdated, onViewFile }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  const ensureProject = useCallback(async () => {
    if (projectId) return projectId;
    const project = await projects.create({ name: "New Project" });
    onProjectCreated(project.id);
    return project.id;
  }, [projectId, onProjectCreated]);

  const ensureSession = useCallback(async (pid) => {
    if (sessionId) return sessionId;
    const session = await conversations.start(pid);
    setSessionId(session.id);
    return session.id;
  }, [sessionId]);

  const refreshFiles = useCallback(async (pid) => {
    try {
      const list = await filesApi.list(pid);
      onFilesUpdated(list);
      const stl = list.find((f) => f.filename?.endsWith(".stl"));
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
      const response = await conversations.send(sid, text);

      const assistantText =
        response.output || response.content || JSON.stringify(response);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: assistantText },
      ]);
      setStatus(null);
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
        <span className="label">Chat</span>
        {projectId && <span className="project-tag">Project active</span>}
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
