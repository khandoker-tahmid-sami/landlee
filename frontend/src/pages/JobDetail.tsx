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

  useEffect(() => {
    if (!id) return;
    api.jobs.get(id).then((j) => {
      setJob(j);
      setDeadlineInput(j.application_deadline ?? "");
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
