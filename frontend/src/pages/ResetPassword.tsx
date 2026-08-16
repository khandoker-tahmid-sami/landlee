import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PasswordField } from "../components/PasswordField";
import { supabase } from "../lib/supabaseClient";

export function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let readyFlag = false;

    const timeout = setTimeout(() => {
      if (!readyFlag) setInvalid(true);
    }, 6000);

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        readyFlag = true;
        setReady(true);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        readyFlag = true;
        setReady(true);
      }
    });

    return () => {
      clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    navigate("/");
  }

  if (invalid) {
    return (
      <div className="auth-page">
        <h1>Link expired</h1>
        <p className="form-error">This password reset link is invalid or has expired.</p>
        <p>
          <Link to="/forgot-password">Request a new link</Link>
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="auth-page">
        <h1>Reset your password</h1>
        <p className="hint">Verifying your reset link…</p>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <h1>Choose a new password</h1>
      <form onSubmit={handleSubmit} className="auth-form">
        <PasswordField
          label="New password"
          value={password}
          onChange={setPassword}
          required
          minLength={6}
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
          minLength={6}
          autoComplete="new-password"
        />
        {error && <p className="form-error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
