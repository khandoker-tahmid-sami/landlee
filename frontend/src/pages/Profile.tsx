import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Avatar } from "../components/Avatar";
import { PasswordField } from "../components/PasswordField";
import { useAuth } from "../context/AuthContext";
import { api, type Profile as ProfileData } from "../lib/api";
import { supabase } from "../lib/supabaseClient";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2MB

export function Profile() {
  const { session, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    api.profile.get().then(setProfile);
  }, []);

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file || !session) return;

    setAvatarError(null);

    if (!file.type.startsWith("image/")) {
      setAvatarError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("Image must be smaller than 2MB.");
      return;
    }

    setAvatarUploading(true);

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${session.user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600" });

    if (uploadError) {
      setAvatarUploading(false);
      setAvatarError(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    // Cache-bust so the new image shows immediately instead of a browser-cached old one.
    const bustedUrl = `${data.publicUrl}?t=${Date.now()}`;

    try {
      const updated = await api.profile.update({ avatar_url: bustedUrl });
      setProfile(updated);
      await refreshProfile();
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Failed to save profile picture");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordLoading(false);

    if (error) {
      setPasswordError(error.message);
      return;
    }

    setPasswordMessage("Password updated.");
    setNewPassword("");
    setConfirmPassword("");
  }

  if (!profile) return <p>Loading…</p>;

  return (
    <div className="settings-page">
      <h1>Profile</h1>

      <section className="settings-section">
        <h2>Profile picture</h2>
        <div className="avatar-uploader">
          <Avatar url={profile.avatar_url} name={profile.full_name ?? session?.user.email} size={72} />
          <div>
            <label className="button-ghost avatar-upload-button">
              {avatarUploading ? "Uploading…" : "Change photo"}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={avatarUploading}
                hidden
              />
            </label>
            <p className="hint">PNG, JPG, or WebP. Up to 2MB.</p>
          </div>
        </div>
        {avatarError && <p className="form-error">{avatarError}</p>}
      </section>

      <section className="settings-section">
        <h2>Change password</h2>
        <form onSubmit={handlePasswordChange} className="auth-form">
          <PasswordField
            label="New password"
            value={newPassword}
            onChange={setNewPassword}
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
          {passwordError && <p className="form-error">{passwordError}</p>}
          {passwordMessage && <p className="form-message">{passwordMessage}</p>}
          <button type="submit" disabled={passwordLoading}>
            {passwordLoading ? "Updating…" : "Update password"}
          </button>
        </form>
      </section>
    </div>
  );
}
