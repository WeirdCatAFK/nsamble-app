import { useState, useEffect, useRef, useCallback } from "react";
import { auth, setToken, projects } from "../api/client";
import { templates } from "../data/templates";
import "./Homepage.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

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

function ProjectCard({ project, onClick }) {
  const date = new Date(project.createdAt || project.updatedAt);
  const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <button className="project-card" onClick={() => onClick(project)}>
      <div className="project-card-icon">&#x2B21;</div>
      <div className="project-card-info">
        <div className="project-card-name">{project.name}</div>
        <div className="project-card-date">{label}</div>
      </div>
    </button>
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

export default function Homepage({ user, onAuth, onLogout, onOpenProject }) {
  const [userProjects, setUserProjects] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const carouselRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    projects.list().then(setUserProjects).catch(() => {});
  }, [user]);

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

      {user && userProjects.length > 0 && (
        <section className="homepage-section">
          <h2 className="section-title">Your projects</h2>
          <div className="projects-grid">
            {userProjects.map((p) => (
              <ProjectCard key={p.id} project={p} onClick={onOpenProject} />
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
