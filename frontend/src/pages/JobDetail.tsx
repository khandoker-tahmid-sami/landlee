import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type GeneratedDocument, type Job } from "../lib/api";

const STATUS_OPTIONS: Job["status"][] = ["saved", "applied", "interviewing", "offer", "rejected", "archived"];

export function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [deadlineInput, setDeadlineInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<"cover_letter" | "cv_suggestions" | null>(null);

  const [tracking, setTracking] = useState({
    deadline_note: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    mail_notes: "",
    follow_up_notes: "",
    interview_notes: "",
    interview_time: "",
  });
  const [trackingSaved, setTrackingSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.jobs.get(id).then((j) => {
      setJob(j);
      setDeadlineInput(j.application_deadline ?? "");
      setTracking({
        deadline_note: j.deadline_note ?? "",
        contact_name: j.contact_name ?? "",
        contact_phone: j.contact_phone ?? "",
        contact_email: j.contact_email ?? "",
        mail_notes: j.mail_notes ?? "",
        follow_up_notes: j.follow_up_notes ?? "",
        interview_notes: j.interview_notes ?? "",
        interview_time: j.interview_time ?? "",
      });
    });
    api.documents.listForJob(id).then(setDocuments);
  }, [id]);

  async function handleStatusChange(status: Job["status"]) {
    if (!id) return;
    const updated = await api.jobs.update(id, { status });
    setJob(updated);
  }

  async function handleDeadlineSave() {
    if (!id) return;
    const updated = await api.jobs.update(id, { application_deadline: deadlineInput || null });
    setJob(updated);
  }

  function updateTrackingField(field: keyof typeof tracking, value: string) {
    setTrackingSaved(false);
    setTracking((prev) => ({ ...prev, [field]: value }));
  }

  async function handleTrackingSave() {
    if (!id) return;
    const updated = await api.jobs.update(id, {
      deadline_note: tracking.deadline_note || null,
      contact_name: tracking.contact_name || null,
      contact_phone: tracking.contact_phone || null,
      contact_email: tracking.contact_email || null,
      mail_notes: tracking.mail_notes || null,
      follow_up_notes: tracking.follow_up_notes || null,
      interview_notes: tracking.interview_notes || null,
      interview_time: tracking.interview_time || null,
    });
    setJob(updated);
    setTrackingSaved(true);
  }

  async function handleGenerate(docType: "cover_letter" | "cv_suggestions") {
    if (!id) return;
    setError(null);
    setGenerating(docType);
    try {
      const doc = await api.documents.generate(id, docType);
      setDocuments((prev) => [doc, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate document");
    } finally {
      setGenerating(null);
    }
  }

  async function handleDelete() {
    if (!id || !confirm("Remove this saved job?")) return;
    await api.jobs.remove(id);
    navigate("/");
  }

  if (!job) return <p>Loading…</p>;

  return (
    <div className="job-detail">
      <div className="job-detail-header">
        <div>
          <h1>{job.title ?? "Untitled role"}</h1>
          <p className="job-meta">
            {job.company ?? "Unknown company"}
            {job.location ? ` · ${job.location}` : ""}
            {job.employment_type ? ` · ${job.employment_type}` : ""}
          </p>
          <a href={job.source_url} target="_blank" rel="noreferrer">
            View original posting →
          </a>
        </div>
        <button onClick={handleDelete} className="button-danger">
          Remove
        </button>
      </div>

      <section className="job-controls">
        <label>
          Status
          <select value={job.status} onChange={(e) => handleStatusChange(e.target.value as Job["status"])}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Application deadline
          <input type="date" value={deadlineInput} onChange={(e) => setDeadlineInput(e.target.value)} />
        </label>
        <button onClick={handleDeadlineSave}>Save deadline</button>
      </section>

      <section className="tracking-section">
        <h2>Application tracking</h2>
        <div className="tracking-grid">
          <label>
            Deadline note
            <input
              type="text"
              placeholder="e.g. Soon, Rolling, ASAP"
              value={tracking.deadline_note}
              onChange={(e) => updateTrackingField("deadline_note", e.target.value)}
            />
          </label>
          <label>
            Contact name
            <input
              type="text"
              placeholder="e.g. Jane Doe, Recruiter"
              value={tracking.contact_name}
              onChange={(e) => updateTrackingField("contact_name", e.target.value)}
            />
          </label>
          <label>
            Contact phone
            <input
              type="text"
              placeholder="e.g. 90 12 34 56"
              value={tracking.contact_phone}
              onChange={(e) => updateTrackingField("contact_phone", e.target.value)}
            />
          </label>
          <label>
            Contact email
            <input
              type="email"
              placeholder="e.g. jane@company.com"
              value={tracking.contact_email}
              onChange={(e) => updateTrackingField("contact_email", e.target.value)}
            />
          </label>
          <label>
            Mail
            <textarea
              rows={3}
              placeholder="Notes on emails sent…"
              value={tracking.mail_notes}
              onChange={(e) => updateTrackingField("mail_notes", e.target.value)}
            />
          </label>
          <label>
            Follow up
            <textarea
              rows={3}
              placeholder="Follow-up plan or notes…"
              value={tracking.follow_up_notes}
              onChange={(e) => updateTrackingField("follow_up_notes", e.target.value)}
            />
          </label>
          <label>
            Test / Interview
            <textarea
              rows={3}
              placeholder="Test or interview notes…"
              value={tracking.interview_notes}
              onChange={(e) => updateTrackingField("interview_notes", e.target.value)}
            />
          </label>
          <label>
            Time
            <input
              type="text"
              placeholder="e.g. 14:00, 25 Aug"
              value={tracking.interview_time}
              onChange={(e) => updateTrackingField("interview_time", e.target.value)}
            />
          </label>
        </div>
        <button onClick={handleTrackingSave}>Save tracking info</button>
        {trackingSaved && <p className="form-message">Saved.</p>}
      </section>

      <section>
        <h2>Requirements</h2>
        <ul>
          {job.requirements.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Responsibilities</h2>
        <ul>
          {job.responsibilities.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </section>

      {job.nice_to_have.length > 0 && (
        <section>
          <h2>Nice to have</h2>
          <ul>
            {job.nice_to_have.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="generate-section">
        <h2>Generate application materials</h2>
        <p>Uses the resume text saved in your Settings.</p>
        {error && <p className="form-error">{error}</p>}
        <div className="generate-buttons">
          <button onClick={() => handleGenerate("cover_letter")} disabled={generating !== null}>
            {generating === "cover_letter" ? "Writing cover letter…" : "Generate cover letter"}
          </button>
          <button onClick={() => handleGenerate("cv_suggestions")} disabled={generating !== null}>
            {generating === "cv_suggestions" ? "Analyzing CV…" : "Generate CV tailoring notes"}
          </button>
        </div>

        {documents.map((doc) => (
          <article key={doc.id} className="generated-document">
            <h3>{doc.doc_type === "cover_letter" ? "Cover letter" : "CV tailoring notes"}</h3>
            <pre>{doc.content}</pre>
          </article>
        ))}
      </section>
    </div>
  );
}
