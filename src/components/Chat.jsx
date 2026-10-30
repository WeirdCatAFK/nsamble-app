import { useState, useRef, useEffect, useCallback } from "react";
import { marked } from "marked";
import { projects, conversations, models, files as filesApi, toAttachmentRefs } from "../api/client";
import "./Chat.css";

marked.setOptions({ breaks: true, gfm: true });

function renderMarkdown(text) {
  return { __html: marked.parse(text || "") };
}

function ToolCallBlock({ call }) {
  const hasArgs = call.args && Object.keys(call.args).length > 0;
  const hasResult = call.result != null;
  const failed = !!call.error;

  return (
    <details className="activity-call">
      <summary className={`activity-call-header ${failed ? "failed" : ""}`}>
        <span className="activity-call-icon">{failed ? "✗" : "✓"}</span>
        <span className="activity-call-name">{call.name}</span>
        {failed && <span className="activity-call-error-badge">error</span>}
      </summary>
      <div className="activity-call-body">
        {hasArgs && (
          <div className="activity-section">
            <div className="activity-section-label">Input</div>
            <pre className="activity-pre">{JSON.stringify(call.args, null, 2)}</pre>
          </div>
        )}
        {hasResult && (
          <div className="activity-section">
            <div className="activity-section-label">Output</div>
            <pre className="activity-pre">{typeof call.result === "string" ? call.result : JSON.stringify(call.result, null, 2)}</pre>
          </div>
        )}
      </div>
    </details>
  );
}

function ActivityBlock({ msg }) {
  const callCount = msg.calls?.length ?? 0;
  const label = callCount === 1
    ? msg.calls[0].name
    : `${callCount} tool calls`;

  return (
    <div className="chat-msg chat-msg-activity">
      <details className="activity-block" open={false}>
        <summary className="activity-header">
          <span className="activity-dot" />
          <span className="activity-label">{label}</span>
          {msg.reasoning && <span className="activity-has-reasoning" title="Has reasoning">R</span>}
          <span className="activity-round">round {msg.round}</span>
        </summary>
        <div className="activity-body">
          {msg.reasoning && (
            <div className="activity-reasoning">
              <div className="activity-section-label">Reasoning</div>
              <div className="activity-reasoning-text">{msg.reasoning}</div>
            </div>
          )}
          {(msg.calls || []).map((call, j) => (
            <ToolCallBlock key={j} call={call} />
          ))}
        </div>
      </details>
    </div>
  );
}

function LiveActivity({ calls }) {
  return (
    <div className="chat-msg chat-msg-activity live">
      <div className="activity-block">
        <div className="activity-header live-header">
          <span className="activity-dot pulsing" />
          {calls.map((c, i) => (
            <span key={i} className="activity-live-chip">
              <span className="activity-call-name">{c.name}</span>
              {c.status === "running" && <span className="dot-pulse" />}
              {c.status === "done" && <span className="activity-call-icon">{c.error ? "✗" : "✓"}</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuestionsBlock({ questions, onSubmit, disabled }) {
  const [answers, setAnswers] = useState(() => questions.map(() => ""));
  const [submitted, setSubmitted] = useState(false);
  const locked = disabled || submitted;
  const answeredCount = answers.filter((a) => a.trim().length > 0).length;
  const allAnswered = answeredCount === questions.length;
  const hasRecommended = questions.some((q) => q.recommended);

  const setAnswer = (idx, value) =>
    setAnswers((prev) => prev.map((a, i) => (i === idx ? value : a)));

  const fillAllSuggested = () => {
    if (locked) return;
    setAnswers(questions.map((q) => q.recommended || ""));
  };

  const handleSubmit = () => {
    if (locked || !allAnswered) return;
    setSubmitted(true);
    const lines = questions.map(
      (q, i) => `${i + 1}. ${q.question}\n   ${answers[i]}`,
    );
    onSubmit(lines.join("\n\n"));
  };

  return (
    <div className="chat-msg chat-msg-questions" onClick={(e) => e.stopPropagation()}>
      <div className="questions-head">
        <div>
          <div className="questions-title">Questions before generation</div>
          <div className="questions-sub">
            {locked ? "Answered" : `${answeredCount} of ${questions.length} answered`}
          </div>
        </div>
        {!locked && hasRecommended && (
          <button type="button" className="questions-fill" onClick={fillAllSuggested}>
            Use all suggested
          </button>
        )}
      </div>
      <div className="questions-block">
        {questions.map((q, i) => (
          <div key={i} className={`question-card ${answers[i].trim() ? "done" : ""}`}>
            <div className="question-head">
              <span className="question-num">{i + 1}</span>
              <span className="question-text">{q.question}</span>
            </div>
            {(q.qualityPick || q.costPick) && (
              <div className="question-picks">
                {q.qualityPick && (
                  <button
                    type="button"
                    className={`pick-card ${answers[i] === q.qualityPick.label ? "selected" : ""}`}
                    onClick={() => !locked && setAnswer(i, q.qualityPick.label)}
                    disabled={locked}
                  >
                    <span className="pick-badge pick-badge-quality">Quality</span>
                    <span className="pick-label">{q.qualityPick.label}</span>
                    {q.qualityPick.price && <span className="pick-price">{q.qualityPick.price}</span>}
                    <span className="pick-reason">{q.qualityPick.reason}</span>
                  </button>
                )}
                {q.costPick && (
                  <button
                    type="button"
                    className={`pick-card ${answers[i] === q.costPick.label ? "selected" : ""}`}
                    onClick={() => !locked && setAnswer(i, q.costPick.label)}
                    disabled={locked}
                  >
                    <span className="pick-badge pick-badge-budget">Budget</span>
                    <span className="pick-label">{q.costPick.label}</span>
                    {q.costPick.price && <span className="pick-price">{q.costPick.price}</span>}
                    <span className="pick-reason">{q.costPick.reason}</span>
                  </button>
                )}
              </div>
            )}
            {q.options?.length > 0 && (
              <div className="question-options">
                {q.options.map((opt, j) => (
                  <button
                    key={j}
                    type="button"
                    className={`question-chip ${answers[i] === opt ? "selected" : ""}`}
                    onClick={() => !locked && setAnswer(i, opt)}
                    disabled={locked}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
            {q.recommended && answers[i] !== q.recommended && (
              <button
                type="button"
                className="question-suggest"
                onClick={() => !locked && setAnswer(i, q.recommended)}
                disabled={locked}
              >
                Suggested: {q.recommended}
              </button>
            )}
            <input
              className="question-input"
              value={answers[i]}
              onChange={(e) => setAnswer(i, e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
              placeholder="Type your answer..."
              disabled={locked}
            />
          </div>
        ))}
        <div className="questions-foot">
          <span className="questions-hint">
            {locked ? "" : "Answer each question, then submit."}
          </span>
          <button
            type="button"
            className="questions-submit"
            onClick={handleSubmit}
            disabled={locked || !allAnswered}
          >
            Submit answers
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Chat({ projectId, onProjectCreated, onFilesUpdated, user, onLogout, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState(null);
  const [liveCalls, setLiveCalls] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [modelSlug, setModelSlug] = useState("");
  const [pending, setPending] = useState([]);
  const namedRef = useRef(false);
  const bottomRef = useRef(null);
  const abortRef = useRef(null);
  const attachRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status, liveCalls]);

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
        const mapped = [];
        for (const m of msgs) {
          if (m.role === "USER") {
            mapped.push({
              role: "user",
              content: m.content?.text ?? "",
              attachments: m.content?.attachments ?? [],
            });
          } else if (m.role === "TOOL") {
            const askCall = m.content?.calls?.find((c) => c.name === "ask_user");
            if (askCall?.args?.questions) {
              mapped.push({ role: "questions", questions: askCall.args.questions, answered: true });
            } else {
              mapped.push({
                role: "activity",
                round: m.content?.round ?? 0,
                reasoning: m.content?.reasoning ?? null,
                calls: m.content?.calls ?? [],
              });
            }
          } else if (m.role === "ASSISTANT") {
            mapped.push({ role: "assistant", content: m.content?.text ?? "" });
          }
        }
        if (mapped.length) {
          let lastUser = -1;
          mapped.forEach((m, i) => { if (m.role === "user") lastUser = i; });
          mapped.forEach((m, i) => {
            if (m.role === "questions" && i > lastUser) m.answered = false;
          });
          const withUrls = await Promise.all(mapped.map(async (m) => {
            if (m.role !== "user" || !m.attachments?.length) return m;
            const resolved = await Promise.all(m.attachments.map(async (a) => {
              try {
                const url = await filesApi.contentBlob(projectId, a.fileId);
                return { ...a, url };
              } catch {
                return a;
              }
            }));
            return { ...m, attachments: resolved };
          }));
          if (cancelled) return;
          setMessages(withUrls);
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
    } catch {}
  }, [onFilesUpdated]);

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  const sendText = async (text, uploads = []) => {
    if ((!text && uploads.length === 0) || sending) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text, attachments: uploads }]);
    setSending(true);
    setStatus("Reasoning...");
    setLiveCalls([]);

    const controller = new AbortController();
    abortRef.current = controller;
    let currentRound = 0;
    let pidCapture = null;

    try {
      const pid = await ensureProject();
      pidCapture = pid;
      const sid = await ensureSession(pid);

      const onEvent = (event) => {
        if (event.type === "status") {
          setStatus(event.message);
        } else if (event.type === "reasoning") {
          setStatus("Thinking...");
        } else if (event.type === "tool_start") {
          if (event.round !== currentRound) {
            if (currentRound > 0) setLiveCalls([]);
            currentRound = event.round;
          }
          if (event.name === "ask_user") {
            setStatus("Preparing questions...");
          } else {
            setStatus(`Running ${event.name}...`);
          }
          setLiveCalls((prev) => [...prev, { name: event.name, status: "running" }]);
        } else if (event.type === "tool_end") {
          setLiveCalls((prev) =>
            prev.map((c) =>
              c.name === event.name && c.status === "running"
                ? { ...c, status: "done", error: event.error }
                : c,
            ),
          );
          if (event.name === "ask_user" && event.args?.questions) {
            setMessages((prev) => [
              ...prev,
              { role: "questions", questions: event.args.questions, answered: false },
            ]);
          } else if (event.round !== undefined) {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "activity" && last.round === event.round) {
                return [
                  ...prev.slice(0, -1),
                  {
                    ...last,
                    calls: [...last.calls, { name: event.name, args: event.args, result: event.result, error: event.error }],
                  },
                ];
              }
              return [
                ...prev,
                {
                  role: "activity",
                  round: event.round,
                  reasoning: event.reasoning ?? null,
                  calls: [{ name: event.name, args: event.args, result: event.result, error: event.error }],
                },
              ];
            });
          }
        } else if (event.type === "subagent_tool_start") {
          setStatus(`${event.role}: Running ${event.name}...`);
        } else if (event.type === "subagent_tool_end") {
          setStatus(`${event.role}: ${event.name} ${event.error ? "failed" : "done"}`);
        } else if (event.type === "error") {
          setMessages((prev) => [...prev, { role: "error", content: event.message }]);
        }
      };

      const result = await conversations.stream(pid, sid, text, onEvent, {
        signal: controller.signal,
        attachments: uploads.map((u) => ({ fileId: u.fileId })),
      });

      setLiveCalls([]);
      const assistantText = result?.text || "";
      if (assistantText) {
        setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
      }
      setStatus(null);
      if (!namedRef.current) {
        namedRef.current = true;
        const source = text || "Image message";
        const title = source.length > 60 ? source.slice(0, 57) + "..." : source;
        projects.update(pid, { name: title }).catch(() => {});
      }
      await refreshFiles(pid);
    } catch (error) {
      setLiveCalls([]);
      if (error.name === "AbortError") {
        setMessages((prev) => [...prev, { role: "error", content: "Stopped by user." }]);
      } else {
        setMessages((prev) => [...prev, { role: "error", content: error.message }]);
      }
      setStatus(null);
    } finally {
      abortRef.current = null;
      setSending(false);
    }
  };

  const send = async () => {
    const text = input.trim();
    if ((!text && pending.length === 0) || sending) return;
    if (pending.length === 0) {
      sendText(text);
      return;
    }
    setStatus("Uploading images...");
    try {
      const pid = await ensureProject();
      const items = [...pending];
      const savedList = [];
      for (const item of items) {
        savedList.push(await filesApi.upload(pid, item.file));
      }
      const uploads = toAttachmentRefs(savedList).map((ref, i) => ({
        ...ref,
        name: items[i].file.name,
        url: items[i].url,
      }));
      setPending([]);
      await refreshFiles(pid);
      sendText(text, uploads);
    } catch (error) {
      setStatus(null);
      setMessages((prev) => [...prev, { role: "error", content: error.message }]);
    }
  };

  const pickImages = (e) => {
    const picked = [...(e.target.files || [])].filter((f) => f.type.startsWith("image/"));
    if (attachRef.current) attachRef.current.value = "";
    if (picked.length === 0) return;
    setPending((prev) => {
      const room = Math.max(0, 4 - prev.length);
      return [
        ...prev,
        ...picked.slice(0, room).map((file, i) => ({
          id: `${Date.now()}-${prev.length + i}-${file.name}`,
          file,
          url: URL.createObjectURL(file),
        })),
      ];
    });
  };

  const removePending = (id) => {
    setPending((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleAnswers = (text) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.role === "questions" && !m.answered ? { ...m, answered: true } : m,
      ),
    );
    sendText(text);
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
        {messages.length === 0 && !sending && (
          <div className="chat-empty">
            <p>Describe what you want to build.</p>
            <p className="hint">
              Try: &quot;Design a rack-mountable MicroATX server casing with side ventilation&quot;
            </p>
          </div>
        )}
        {messages.map((msg, i) =>
          msg.role === "activity" ? (
            <ActivityBlock key={i} msg={msg} />
          ) : msg.role === "questions" ? (
            <QuestionsBlock
              key={i}
              questions={msg.questions}
              onSubmit={handleAnswers}
              disabled={msg.answered}
            />
          ) : (
            <div key={i} className={`chat-msg chat-msg-${msg.role}`}>
              <div className="chat-msg-label">
                {msg.role === "user" ? "You" : msg.role === "error" ? "Error" : "nsamble"}
              </div>
              {msg.role === "assistant" ? (
                <div className="chat-msg-text markdown" dangerouslySetInnerHTML={renderMarkdown(msg.content)} />
              ) : (
                <div className="chat-msg-text">
                  {msg.attachments?.length > 0 && (
                    <div className="chat-msg-images">
                      {msg.attachments.map((a) => (
                        a.url
                          ? <img key={a.fileId || a.id} src={a.url} alt={a.name || ""} className="chat-msg-img" />
                          : <span key={a.fileId || a.id} className="chat-msg-img-missing">{a.name || "image"}</span>
                      ))}
                    </div>
                  )}
                  {msg.content}
                </div>
              )}
            </div>
          ),
        )}
        {liveCalls.length > 0 && <LiveActivity calls={liveCalls} />}
        {status && (
          <div className="chat-status">
            <span className="dot-pulse" />
            {status}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-bar">
        <div className="chat-composer">
          {pending.length > 0 && (
            <div className="chat-pending">
              {pending.map((p) => (
                <div key={p.id} className="chat-pending-item">
                  <img src={p.url} alt={p.file.name} className="chat-pending-img" />
                  <button
                    type="button"
                    className="chat-pending-remove"
                    onClick={() => removePending(p.id)}
                    disabled={sending}
                    title="Remove"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
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
          <div className="chat-composer-row">
            <div className="chat-composer-left">
              <button
                type="button"
                className="chat-attach"
                onClick={() => attachRef.current?.click()}
                disabled={sending}
                title="Attach images"
              >
                +
              </button>
              <input
                ref={attachRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={pickImages}
                disabled={sending}
              />
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
            </div>
            {sending ? (
              <button className="chat-stop" onClick={stop} title="Stop">&#x25A0;</button>
            ) : (
              <button className="chat-send" onClick={send} disabled={!input.trim() && pending.length === 0} title="Send">
                &uarr;
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
