import { useEffect, useState } from "react";
import { api, type Profile } from "../lib/api";

export function Settings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [fullName, setFullName] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.profile.get().then((p) => {
      setProfile(p);
      setResumeText(p.resume_text ?? "");
      setFullName(p.full_name ?? "");
      setEmailNotifications(p.email_notifications);
    });
  }, []);

  async function handleSave() {
    setSaved(false);
    const updated = await api.profile.update({
      full_name: fullName,
      resume_text: resumeText,
      email_notifications: emailNotifications,
    });
    setProfile(updated);
    setSaved(true);
  }

  if (!profile) return <p>Loading…</p>;

  return (
    <div className="settings-page">
      <h1>Settings</h1>

      <label>
        Full name
        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </label>

      <label>
        Your resume / CV text
        <p className="hint">
          Paste the plain text of your current CV here. This is what Claude uses to write tailored cover
          letters and CV suggestions — it will never invent experience you haven't listed here.
        </p>
        <textarea rows={16} value={resumeText} onChange={(e) => setResumeText(e.target.value)} />
      </label>

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={emailNotifications}
          onChange={(e) => setEmailNotifications(e.target.checked)}
        />
        Email me deadline reminders
      </label>

      <button onClick={handleSave}>Save settings</button>
      {saved && <p className="form-message">Saved.</p>}
    </div>
  );
}
