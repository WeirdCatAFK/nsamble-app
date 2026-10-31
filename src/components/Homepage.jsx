import { useState, useEffect, useRef, useCallback } from "react";
import { auth, setToken, projects, conversations, files as filesApi, machines as machinesApi, users as usersApi } from "../api/client";
import { templates } from "../data/templates";
import { MACHINE_TYPES } from "../utils/machines";
import MachineIcon from "./MachineIcon";
import "./Homepage.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function HeroArt() {
  return (
    <svg className="hero-art" viewBox="0 0 1200 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#2E3439" strokeWidth="1" />
        </pattern>
        <pattern id="hero-grid-major" width="200" height="200" patternUnits="userSpaceOnUse">
          <path d="M 200 0 L 0 0 0 200" fill="none" stroke="#3A4147" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="1200" height="420" fill="url(#hero-grid)" />
      <rect width="1200" height="420" fill="url(#hero-grid-major)" />
      <g stroke="#A6A78F" strokeWidth="1.5" fill="none" opacity="0.55">
        <polygon points="180,100 274,154 274,262 180,316 86,262 86,154" />
        <polygon points="180,140 240,175 240,245 180,280 120,245 120,175" opacity="0.6" />
      </g>
      <g className="hero-spin" stroke="#858B91" strokeWidth="1" fill="none" opacity="0.7" strokeDasharray="4 8">
        <circle cx="180" cy="208" r="140" />
      </g>
      <g stroke="#BB792A" strokeWidth="1.5" opacity="0.9">
        <line x1="162" y1="208" x2="198" y2="208" />
        <line x1="180" y1="190" x2="180" y2="226" />
      </g>
      <circle cx="180" cy="208" r="4" fill="#BB792A" />
      <g stroke="#3A4147" strokeWidth="1.5" fill="none">
        <circle cx="1020" cy="200" r="120" />
        <circle cx="1020" cy="200" r="90" />
      </g>
      <circle cx="1020" cy="200" r="58" fill="none" stroke="#A6A78F" strokeWidth="1.5" opacity="0.55" />
      <g stroke="#BB792A" strokeWidth="1.5" opacity="0.9">
        <line x1="880" y1="336" x2="1160" y2="336" />
        <line x1="880" y1="328" x2="880" y2="344" />
        <line x1="1160" y1="328" x2="1160" y2="344" />
      </g>
      <text x="1020" y="362" textAnchor="middle" fontSize="13" fill="#A6A78F" fontFamily="monospace">280</text>
      <g stroke="#858B91" strokeWidth="1.5" opacity="0.7">
        <line x1="56" y1="80" x2="56" y2="340" />
        <line x1="48" y1="80" x2="64" y2="80" />
        <line x1="48" y1="340" x2="64" y2="340" />
      </g>
      <text x="34" y="214" textAnchor="middle" fontSize="12" fill="#858B91" fontFamily="monospace" transform="rotate(-90 34 214)">260</text>
      <g fill="#BB792A" opacity="0.85">
        <circle cx="420" cy="120" r="3" />
        <circle cx="790" cy="300" r="3" />
        <circle cx="640" cy="90" r="2.5" />
      </g>
      <g stroke="#3A4147" strokeWidth="1.5" opacity="0.9">
        <line x1="540" y1="320" x2="560" y2="320" />
        <line x1="550" y1="310" x2="550" y2="330" />
        <line x1="700" y1="130" x2="720" y2="130" />
        <line x1="710" y1="120" x2="710" y2="140" />
      </g>
    </svg>
  );
}

function TemplateCard({ template, onClick }) {
  return (
    <button className="template-card" onClick={() => onClick(template)}>
      <div className="template-preview">
        <div className="template-preview-placeholder">
          <span>&#x25B3;</span>
        </div>
      </div>
      <div className="template-info">
        <div className="template-name">{template.name}</div>
        <div className="template-desc">{template.description}</div>
      </div>
    </button>
  );
}

function TemplateModal({ template, onConfirm, onClose }) {
  if (!template) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{template.name}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <p className="modal-desc">{template.description}</p>
        <div className="modal-files">
          <div className="modal-files-label">Files included</div>
          {template.files.map((f) => (
            <div key={f} className="modal-file-row">
              <span className="modal-file-icon">&#x25A1;</span>
              {f}
            </div>
          ))}
        </div>
        <button className="modal-confirm" onClick={() => onConfirm(template)}>
          Start project
        </button>
      </div>
    </div>
  );
}

const HOME_FILE_ICONS = {
  stl: "\u25B3",
  scad: "\u2B21",
  png: "\u25A3",
  svg: "\u25C7",
  json: "{",
  md: "\u2630",
};

function homeFileExt(name) {
  if (!name) return "";
  const dot = name.lastIndexOf(".");
  return dot > -1 ? name.slice(dot + 1).toLowerCase() : "";
}

function homeFileBase(name) {
  if (!name) return "";
  const slash = name.lastIndexOf("/");
  return slash > -1 ? name.slice(slash + 1) : name;
}

function homeFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function HomeFileRow({ file, projectName, onOpen }) {
  const date = new Date(file.createdAt);
  const label = Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const meta = [projectName, homeFileSize(file.size), label].filter(Boolean).join("  ·  ");

  return (
    <div className="project-row" onClick={() => onOpen(file.projectId)} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(file.projectId); }}>
      <div className="project-card-icon">{HOME_FILE_ICONS[homeFileExt(file.name)] || "\u25A1"}</div>
      <div className="project-row-main">
        <div className="project-row-name" title={file.name}>{homeFileBase(file.name)}</div>
        <div className="project-row-meta">{meta}</div>
      </div>
      <div className="project-row-actions" onClick={(e) => e.stopPropagation()}>
        <button
          className="row-btn"
          onClick={() => {
            filesApi.contentBlob(file.projectId, file.id).then((url) => {
              const a = document.createElement("a");
              a.href = url;
              a.download = homeFileBase(file.name);
              a.click();
              URL.revokeObjectURL(url);
            }).catch(() => {});
          }}
        >
          Download
        </button>
      </div>
    </div>
  );
}

function ProjectRow({ project, onOpen, onRenamed, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project.name);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const date = new Date(project.updatedAt || project.createdAt);
  const label = Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const saveRename = async () => {
    const name = draft.trim();
    setEditing(false);
    if (!name || name === project.name) {
      setDraft(project.name);
      return;
    }
    setBusy(true);
    try {
      await projects.update(project.id, { name });
      onRenamed(project.id, name);
    } catch {
      setDraft(project.name);
    } finally {
      setBusy(false);
    }
  };

  const generateTitle = async () => {
    setBusy(true);
    try {
      const sessions = await conversations.list(project.id);
      for (const session of sessions) {
        const msgs = await conversations.messages(project.id, session.id);
        const first = msgs.find((m) => m.role === "USER" && m.content?.text?.trim());
        if (first) {
          const text = first.content.text.trim();
          const name = text.length > 60 ? text.slice(0, 57) + "..." : text;
          await projects.update(project.id, { name });
          onRenamed(project.id, name);
          return;
        }
      }
    } catch {
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await projects.remove(project.id);
      onDeleted(project.id);
    } catch {
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="project-row" onClick={() => !editing && onOpen(project)} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" && !editing) onOpen(project); }}>
      <div className="project-card-icon">&#x2B21;</div>
      <div className="project-row-main">
        {editing ? (
          <input
            className="project-rename-input"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={saveRename}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") saveRename();
              if (e.key === "Escape") { setDraft(project.name); setEditing(false); }
            }}
            disabled={busy}
          />
        ) : (
          <div className="project-row-name" title={project.name}>{project.name}</div>
        )}
        <div className="project-card-date">{label}</div>
      </div>
      <div className="project-row-actions" onClick={(e) => e.stopPropagation()}>
        {confirming ? (
          <>
            <button className="row-btn row-btn-danger" onClick={confirmDelete} disabled={busy}>
              {busy ? "..." : "Confirm"}
            </button>
            <button className="row-btn" onClick={() => setConfirming(false)} disabled={busy}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button className="row-btn" onClick={generateTitle} disabled={busy} title="Generate a title from the conversation">
              {busy ? "..." : "Generate title"}
            </button>
            <button className="row-btn" onClick={() => { setDraft(project.name); setEditing(true); }} disabled={busy}>
              Rename
            </button>
            <button className="row-btn row-btn-danger" onClick={() => setConfirming(true)} disabled={busy}>
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function AuthSection({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const googleRef = useRef(null);

  const handleGoogle = useCallback(async (response) => {
    setError(null);
    setLoading(true);
    try {
      const result = await auth.google(response.credential);
      setToken(result.token);
      onAuth(result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [onAuth]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogle,
    });
    window.google.accounts.id.renderButton(googleRef.current, {
      theme: "filled_black",
      size: "large",
      width: 256,
      text: "continue_with",
    });
    window.google.accounts.id.prompt();
  }, [handleGoogle]);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = mode === "login"
        ? await auth.login({ email, password })
        : await auth.register({ email, name, password });
      setToken(result.token);
      onAuth(result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-section">
      <h2 className="auth-title">Sign in to get started</h2>
      {GOOGLE_CLIENT_ID && (
        <>
          <div className="google-btn-wrapper" ref={googleRef} />
          <div className="auth-divider"><span>or</span></div>
        </>
      )}
      <form className="auth-form" onSubmit={submit}>
        {mode === "register" && (
          <input
            className="auth-input"
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        <input
          className="auth-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div className="auth-password-wrapper">
          <input
            className="auth-input"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <button
            className="password-toggle"
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        {error && <div className="auth-error">{error}</div>}
        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? "..." : mode === "login" ? "Sign in" : "Create account"}
        </button>
        <button
          className="auth-toggle"
          type="button"
          onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
        >
          {mode === "login" ? "No account? Register" : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}

function WorkshopSection() {
  const [machines, setMachines] = useState([]);
  const [typeId, setTypeId] = useState(MACHINE_TYPES[0].id);
  const [customType, setCustomType] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [materials, setMaterials] = useState("");
  const [savedTick, setSavedTick] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    machinesApi.list().then(setMachines).catch(() => {});
    usersApi.me().then((u) => setMaterials(u.preferredMaterials ?? "")).catch(() => {});
  }, []);

  const addMachine = async (e) => {
    e.preventDefault();
    const preset = MACHINE_TYPES.find((t) => t.id === typeId);
    const type = typeId === "other" ? customType.trim() || "Other" : (preset?.label ?? "");
    if (!type || !name.trim() || busy) return;
    setBusy(true);
    try {
      const created = await machinesApi.create({
        type,
        name: name.trim(),
        notes: notes.trim() ? notes.trim() : null,
      });
      setMachines((prev) => [...prev, created]);
      setCustomType("");
      setName("");
      setNotes("");
    } catch {
    } finally {
      setBusy(false);
    }
  };

  const removeMachine = async (id) => {
    const prev = machines;
    setMachines(prev.filter((m) => m.id !== id));
    try {
      await machinesApi.remove(id);
    } catch {
      setMachines(prev);
    }
  };

  const saveMaterials = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await usersApi.updateMe({ preferredMaterials: materials });
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 2000);
    } catch {
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="homepage-section">
      <h2 className="section-title">Your workshop</h2>
      <p className="workshop-hint">Machines and materials the agent assumes for every project.</p>
      {machines.length > 0 && (
        <div className="machines-grid">
          {machines.map((m) => (
            <div key={m.id} className="machine-card">
              <MachineIcon type={m.type} />
              <div className="machine-main">
                <div className="machine-name">{m.name}</div>
                <div className="machine-type">{m.notes ? `${m.type} · ${m.notes}` : m.type}</div>
              </div>
              <button className="row-btn row-btn-danger" onClick={() => removeMachine(m.id)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      <form className="machine-form" onSubmit={addMachine}>
        <select
          className="machine-select"
          value={typeId}
          onChange={(e) => setTypeId(e.target.value)}
          aria-label="Machine type"
        >
          {MACHINE_TYPES.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        {typeId === "other" && (
          <input
            className="projects-search"
            type="text"
            placeholder="Machine type"
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
          />
        )}
        <input
          className="projects-search"
          type="text"
          placeholder="Name (e.g. K40)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="projects-search"
          type="text"
          placeholder="Notes (e.g. 40W, 300×200mm)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button className="row-btn" type="submit" disabled={busy}>
          {busy ? "..." : "Add machine"}
        </button>
      </form>
      <form className="materials-row" onSubmit={saveMaterials}>
        <label className="materials-label" htmlFor="workshop-materials">Preferred materials</label>
        <input
          id="workshop-materials"
          className="projects-search materials-input"
          type="text"
          placeholder="MDF, PLA, ..."
          value={materials}
          onChange={(e) => setMaterials(e.target.value)}
        />
        <button className="row-btn" type="submit" disabled={busy}>
          {busy ? "..." : "Save"}
        </button>
        {savedTick && <span className="materials-saved">Saved</span>}
      </form>
    </section>
  );
}

export default function Homepage({ user, onAuth, onLogout, onOpenProject }) {
  const [userProjects, setUserProjects] = useState([]);
  const [userFiles, setUserFiles] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [projectQuery, setProjectQuery] = useState("");
  const carouselRef = useRef(null);

  const filteredProjects = userProjects.filter((p) =>
    p.name?.toLowerCase().includes(projectQuery.trim().toLowerCase()),
  );

  const handleRenamed = useCallback((id, name) => {
    setUserProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  }, []);

  const handleDeleted = useCallback((id) => {
    setUserProjects((prev) => prev.filter((p) => p.id !== id));
  }, []);

  useEffect(() => {
    if (!user) return;
    projects.list().then(setUserProjects).catch(() => {});
    filesApi.listAll(50).then(setUserFiles).catch(() => {});
  }, [user]);

  const projectNameById = useCallback((id) => {
    return userProjects.find((p) => p.id === id)?.name || "";
  }, [userProjects]);

  const openFileProject = useCallback((projectId) => {
    const project = userProjects.find((p) => p.id === projectId);
    if (project) onOpenProject(project);
  }, [userProjects, onOpenProject]);

  const scrollCarousel = (direction) => {
    if (!carouselRef.current) return;
    const amount = 300;
    carouselRef.current.scrollBy({ left: direction * amount, behavior: "smooth" });
  };

  const handleNewProject = async () => {
    const project = await projects.create({ name: "New Project" });
    onOpenProject(project);
  };

  const handleTemplateConfirm = async (template) => {
    const project = await projects.create({
      name: template.name,
      templateId: template.id,
    });
    setSelectedTemplate(null);
    onOpenProject(project);
  };

  return (
    <div className="homepage">
      <nav className="homepage-nav">
        <span className="homepage-logo">nsamble</span>
        {user ? (
          <div className="homepage-nav-right">
            <span className="homepage-user">{user.name || user.email}</span>
            <button className="homepage-signout" onClick={onLogout}>Sign out</button>
          </div>
        ) : (
          <button className="homepage-nav-signin" onClick={() => setShowAuth(true)}>Sign in</button>
        )}
      </nav>

      <header className="homepage-hero">
        <HeroArt />
        <h1 className="homepage-title">Natural-language manufacturing</h1>
        <p className="homepage-subtitle">
          Describe parts and assemblies in plain language.
          Get parametric CAD files, 3D previews, and cost reports.
        </p>
        {user && (
          <div className="homepage-actions">
            <button className="action-btn action-primary" onClick={handleNewProject}>
              New project
            </button>
            <button className="action-btn" onClick={() => {
              const last = userProjects[0];
              if (last) onOpenProject(last);
              else handleNewProject();
            }}>
              Continue last
            </button>
          </div>
        )}
      </header>

      {user && <WorkshopSection />}

      {user && userProjects.length > 0 && (
        <section className="homepage-section">
          <div className="projects-toolbar">
            <h2 className="section-title">Your projects</h2>
            <input
              className="projects-search"
              type="search"
              placeholder="Search projects..."
              value={projectQuery}
              onChange={(e) => setProjectQuery(e.target.value)}
            />
          </div>
          <div className="projects-list">
            {filteredProjects.length === 0 && (
              <div className="projects-empty">No projects match your search.</div>
            )}
            {filteredProjects.map((p) => (
              <ProjectRow
                key={p.id}
                project={p}
                onOpen={onOpenProject}
                onRenamed={handleRenamed}
                onDeleted={handleDeleted}
              />
            ))}
          </div>
        </section>
      )}

      {user && userFiles.length > 0 && (
        <section className="homepage-section">
          <h2 className="section-title">Your files</h2>
          <div className="projects-list">
            {userFiles.map((f) => (
              <HomeFileRow
                key={f.id}
                file={f}
                projectName={projectNameById(f.projectId)}
                onOpen={openFileProject}
              />
            ))}
          </div>
        </section>
      )}

      <section className="homepage-section">
        <h2 className="section-title">Templates</h2>
        <div className="carousel-wrapper">
          <button className="carousel-arrow carousel-left" onClick={() => scrollCarousel(-1)}>
            &lsaquo;
          </button>
          <div className="carousel" ref={carouselRef}>
            {templates.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onClick={user ? setSelectedTemplate : () => setShowAuth(true)}
              />
            ))}
          </div>
          <button className="carousel-arrow carousel-right" onClick={() => scrollCarousel(1)}>
            &rsaquo;
          </button>
        </div>
      </section>

      {showAuth && !user && (
        <div className="modal-overlay" onClick={() => setShowAuth(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <AuthSection onAuth={(u) => { setShowAuth(false); onAuth(u); }} />
          </div>
        </div>
      )}

      <TemplateModal
        template={selectedTemplate}
        onConfirm={handleTemplateConfirm}
        onClose={() => setSelectedTemplate(null)}
      />
    </div>
  );
}
