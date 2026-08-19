import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiRequestError, api } from "../lib/api";

export function AddJob() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingJobId, setExistingJobId] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setExistingJobId(null);
    setLoading(true);
    try {
      const job = await api.jobs.extract(url);
      navigate(`/jobs/${job.id}`);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        setError(err.message);
        setExistingJobId(err.body.existingJobId as string);
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="add-job-page">
      <h1>Add a job from a link</h1>
      <p>Paste the URL of a job posting. We'll fetch the page and pull out the key details for you.</p>
      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          Job posting URL
          <input
            type="url"
            placeholder="https://company.com/careers/software-engineer"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </label>
        {error && (
          <p className="form-error">
            {error}
            {existingJobId && <> — <Link to={`/jobs/${existingJobId}`}>view it</Link></>}
          </p>
        )}
        <button type="submit" disabled={loading}>
          {loading ? "Extracting…" : "Extract job details"}
        </button>
      </form>
    </div>
  );
}
