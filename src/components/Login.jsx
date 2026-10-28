import { useState, useEffect, useRef, useCallback } from "react";
import { auth, setToken } from "../api/client";
import "./Login.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Login({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
      const result =
        mode === "login"
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
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <h1 className="login-title">nsamble</h1>
        <p className="login-subtitle">Natural-language manufacturing</p>

        {GOOGLE_CLIENT_ID && (
          <>
            <div className="google-btn-wrapper" ref={googleRef} />
            <div className="login-divider"><span>or</span></div>
          </>
        )}

        {mode === "register" && (
          <input
            className="login-input"
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        <input
          className="login-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div className="login-password-wrapper">
          <input
            className="login-input"
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

        {error && <div className="login-error">{error}</div>}

        <button className="login-button" type="submit" disabled={loading}>
          {loading ? "..." : mode === "login" ? "Sign in" : "Create account"}
        </button>

        <button
          className="login-toggle"
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
          }}
        >
          {mode === "login"
            ? "No account? Register"
            : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
