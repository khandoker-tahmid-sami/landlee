import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Job } from "../lib/api";

const STATUS_LABELS: Record<Job["status"], string> = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  archived: "Archived",
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const today = new Date();
  const ms = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate())
    - Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

export function Dashboard() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.jobs
      .list()
      .then(setJobs)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="form-error">{error}</p>;
  if (!jobs) return <p>Loading jobs…</p>;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Your saved jobs</h1>
        <Link to="/add-job" className="button-primary">
          + Add job
        </Link>
      </div>

      {jobs.length === 0 ? (
        <p>
          No jobs saved yet. <Link to="/add-job">Paste a job link</Link> to get started.
        </p>
      ) : (
        <ul className="job-list">
          {jobs.map((job) => {
            const remaining = daysUntil(job.application_deadline);
            return (
              <li key={job.id} className="job-card">
                <Link to={`/jobs/${job.id}`}>
                  <h2>{job.title ?? "Untitled role"}</h2>
                  <p className="job-meta">
                    {job.company ?? "Unknown company"}
                    {job.location ? ` · ${job.location}` : ""}
                  </p>
                  <div className="job-card-footer">
                    <span className={`status-badge status-${job.status}`}>{STATUS_LABELS[job.status]}</span>
                    {job.application_deadline && (
                      <span className={remaining !== null && remaining <= 3 ? "deadline-soon" : "deadline"}>
                        Deadline: {job.application_deadline}
                        {remaining !== null && remaining >= 0 ? ` (${remaining}d left)` : ""}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
