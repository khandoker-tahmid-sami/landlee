import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
  }

  return (
    <div className="auth-page">
      <h1>Reset your password</h1>
      {sent ? (
        <p className="form-message">
          If an account exists for {email}, we've sent a link to reset your password. Check your
          inbox (and spam folder) for an email from Supabase.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form">
          <p className="hint">Enter your account email and we'll send you a reset link.</p>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
      <p>
        <Link to="/login">Back to log in</Link>
      </p>
    </div>
  );
}
