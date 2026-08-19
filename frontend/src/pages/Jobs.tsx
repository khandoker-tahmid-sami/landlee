import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function rowClass(job: Job, deadlineDaysLeft: number | null): string {
  if (job.status === "rejected") return "job-row-rejected";
  if (deadlineDaysLeft !== null && deadlineDaysLeft < 0 && job.status === "saved") return "job-row-rejected";
  if (job.status === "applied" || job.status === "interviewing" || job.status === "offer") return "job-row-applied";
  return "";
}

const AVATAR_COLORS = ["#0e4b4a", "#b3261e", "#8a5a13", "#3d5a80", "#6a4c93", "#2f6f4f"];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

type DeadlineFilter = "all" | "overdue" | "week" | "month" | "none";

const DEADLINE_FILTER_LABELS: Record<DeadlineFilter, string> = {
  all: "All deadlines",
  overdue: "Overdue",
  week: "Due within 7 days",
  month: "Due within 30 days",
  none: "No deadline set",
};

type FilterKey = "company" | "deadline";

const DEFAULT_ENABLED_FILTERS: Record<FilterKey, boolean> = { company: true, deadline: true };

// The Id column always shows (it's what the always-on ID search filters by), so it's not in this list.
type ColumnKey =
  | "company"
  | "jobLink"
  | "deadline"
  | "position"
  | "contactName"
  | "contactPhone"
  | "contactEmail"
  | "applied"
  | "appliedDate"
  | "mail"
  | "followUp"
  | "testInterview"
  | "time";

const COLUMN_ITEMS: { key: ColumnKey; label: string }[] = [
  { key: "company", label: "Company Name" },
  { key: "jobLink", label: "Job Link" },
  { key: "deadline", label: "Deadline" },
  { key: "position", label: "Position" },
  { key: "contactName", label: "Contact Name" },
  { key: "contactPhone", label: "Contact Phone" },
  { key: "contactEmail", label: "Contact Email" },
  { key: "applied", label: "Applied" },
  { key: "appliedDate", label: "Applied Date" },
  { key: "mail", label: "Mail" },
  { key: "followUp", label: "Follow Up" },
  { key: "testInterview", label: "Test / Interview" },
  { key: "time", label: "Time" },
];

const DEFAULT_VISIBLE_COLUMNS = Object.fromEntries(COLUMN_ITEMS.map((c) => [c.key, true])) as Record<
  ColumnKey,
  boolean
>;

export function Jobs() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deadlineSort, setDeadlineSort] = useState<"asc" | "desc" | null>(null);
  const [idSearch, setIdSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>("all");
  const [enabledFilters, setEnabledFilters] = useState<Record<FilterKey, boolean>>(DEFAULT_ENABLED_FILTERS);
  const [filtersModalOpen, setFiltersModalOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS);
  const [columnsModalOpen, setColumnsModalOpen] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const navigate = useNavigate();

  const activeFilterCount = [
    idSearch.trim() !== "",
    companyFilter !== "all",
    deadlineFilter !== "all",
  ].filter(Boolean).length;

  // Load saved column/filter choices from the user's profile so they follow the
  // account across devices, rather than being stuck to one browser's localStorage.
  useEffect(() => {
    api.profile
      .get()
      .then((profile) => {
        const prefs = profile.jobs_table_prefs ?? {};
        if (prefs.enabledFilters) {
          setEnabledFilters((prev) => ({ ...prev, ...prefs.enabledFilters }));
        }
        if (prefs.visibleColumns) {
          setVisibleColumns((prev) => ({ ...prev, ...prefs.visibleColumns }));
        }
      })
      .finally(() => setPrefsLoaded(true));
  }, []);

  // Persist toggle changes back to the profile once the initial load has completed,
  // so an early save (with defaults) can't clobber the user's saved preferences.
  useEffect(() => {
    if (!prefsLoaded) return;
    api.profile.update({ jobs_table_prefs: { enabledFilters, visibleColumns } }).catch(() => {});
  }, [prefsLoaded, enabledFilters, visibleColumns]);

  function toggleColumn(key: ColumnKey) {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleFilterVisibility(key: FilterKey) {
    setEnabledFilters((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Turning a filter off also clears its value, so a hidden filter never keeps acting behind the scenes.
      if (!next[key]) {
        if (key === "company") setCompanyFilter("all");
        if (key === "deadline") setDeadlineFilter("all");
      }
      return next;
    });
  }

  useEffect(() => {
    api.jobs
      .list()
      .then(setJobs)
      .catch((err) => setError(err.message));
  }, []);

  const sortedJobs = useMemo(() => {
    if (!jobs || !deadlineSort) return jobs;
    const withIndex = jobs.map((job, index) => ({ job, index }));
    withIndex.sort((a, b) => {
      const aTime = a.job.application_deadline ? new Date(a.job.application_deadline).getTime() : null;
      const bTime = b.job.application_deadline ? new Date(b.job.application_deadline).getTime() : null;
      // Jobs without a deadline always sink to the bottom, regardless of direction.
      if (aTime === null && bTime === null) return a.index - b.index;
      if (aTime === null) return 1;
      if (bTime === null) return -1;
      return deadlineSort === "asc" ? aTime - bTime : bTime - aTime;
    });
    return withIndex.map((entry) => entry.job);
  }, [jobs, deadlineSort]);

  // Row numbers are assigned from the sort order and kept stable while filtering,
  // so filtering down to a subset never renumbers the rows the user already saw.
  const numberedJobs = useMemo(
    () => sortedJobs?.map((job, index) => ({ job, rowId: index + 1 })) ?? null,
    [sortedJobs],
  );

  const companies = useMemo(() => {
    if (!jobs) return [];
    const names = new Set(jobs.map((j) => j.company).filter((c): c is string => !!c));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  const visibleJobs = useMemo(() => {
    if (!numberedJobs) return null;
    const query = idSearch.trim();
    return numberedJobs.filter(({ job, rowId }) => {
      if (query && !String(rowId).includes(query)) return false;
      if (companyFilter !== "all" && job.company !== companyFilter) return false;
      if (deadlineFilter !== "all") {
        const days = daysUntil(job.application_deadline);
        if (deadlineFilter === "none") return job.application_deadline === null;
        if (days === null) return false;
        if (deadlineFilter === "overdue") return days < 0;
        if (deadlineFilter === "week") return days >= 0 && days <= 7;
        if (deadlineFilter === "month") return days >= 0 && days <= 30;
      }
      return true;
    });
  }, [numberedJobs, idSearch, companyFilter, deadlineFilter]);

  function toggleDeadlineSort() {
    setDeadlineSort((prev) => (prev === "asc" ? "desc" : prev === "desc" ? null : "asc"));
  }

  if (error) return <p className="form-error">{error}</p>;
  if (!jobs || !visibleJobs) return <p>Loading jobs…</p>;

  return (
    <div className="dashboard jobs-page">
      <div className="dashboard-header">
        <h1>Your saved jobs</h1>
        <Link to="/add-job" className="button-primary">
          + Add job
        </Link>
      </div>

      {jobs.length === 0 ? (
        <p>No jobs saved yet. Paste a job link on the Add job page to get started.</p>
      ) : (
        <>
          <div className="jobs-toolbar">
            <label className="jobs-toolbar-field">
              Search by ID
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 5"
                value={idSearch}
                onChange={(e) => setIdSearch(e.target.value)}
              />
            </label>
            {enabledFilters.company && (
              <label className="jobs-toolbar-field">
                Company
                <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
                  <option value="all">All companies</option>
                  {companies.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {enabledFilters.deadline && (
              <label className="jobs-toolbar-field">
                Deadline
                <select
                  value={deadlineFilter}
                  onChange={(e) => setDeadlineFilter(e.target.value as DeadlineFilter)}
                >
                  {(Object.keys(DEADLINE_FILTER_LABELS) as DeadlineFilter[]).map((key) => (
                    <option key={key} value={key}>
                      {DEADLINE_FILTER_LABELS[key]}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="jobs-toolbar-right">
              <span className="jobs-toolbar-count">
                {visibleJobs.length} of {jobs.length} jobs
              </span>
              <button type="button" className="filters-button" onClick={() => setColumnsModalOpen(true)}>
                Columns
              </button>
              <button type="button" className="filters-button" onClick={() => setFiltersModalOpen(true)}>
                Filters
                {activeFilterCount > 0 && <span className="filters-button-badge">{activeFilterCount}</span>}
              </button>
            </div>
          </div>

          {filtersModalOpen && (
            <div className="modal-overlay" onClick={() => setFiltersModalOpen(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>Filters</h2>
                  <button
                    type="button"
                    className="modal-close"
                    onClick={() => setFiltersModalOpen(false)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <div className="toggle-list">
                  <div className="toggle-row-item">
                    <span>Company</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabledFilters.company}
                      className={`toggle-switch ${enabledFilters.company ? "is-on" : ""}`}
                      onClick={() => toggleFilterVisibility("company")}
                    >
                      <span className="toggle-switch-knob" />
                    </button>
                  </div>
                  <div className="toggle-row-item">
                    <span>Deadline</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabledFilters.deadline}
                      className={`toggle-switch ${enabledFilters.deadline ? "is-on" : ""}`}
                      onClick={() => toggleFilterVisibility("deadline")}
                    >
                      <span className="toggle-switch-knob" />
                    </button>
                  </div>
                </div>

                <button type="button" className="button-primary modal-done" onClick={() => setFiltersModalOpen(false)}>
                  Done
                </button>
              </div>
            </div>
          )}

          {columnsModalOpen && (
            <div className="modal-overlay" onClick={() => setColumnsModalOpen(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>Columns</h2>
                  <button
                    type="button"
                    className="modal-close"
                    onClick={() => setColumnsModalOpen(false)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <div className="toggle-list">
                  {COLUMN_ITEMS.map(({ key, label }) => (
                    <div className="toggle-row-item" key={key}>
                      <span>{label}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={visibleColumns[key]}
                        className={`toggle-switch ${visibleColumns[key] ? "is-on" : ""}`}
                        onClick={() => toggleColumn(key)}
                      >
                        <span className="toggle-switch-knob" />
                      </button>
                    </div>
                  ))}
                </div>

                <button type="button" className="button-primary modal-done" onClick={() => setColumnsModalOpen(false)}>
                  Done
                </button>
              </div>
            </div>
          )}

          <div className="jobs-table-wrap">
            <table className="jobs-table">
              <thead>
                <tr>
                  <th>Id</th>
                  {visibleColumns.company && <th>Company Name</th>}
                  {visibleColumns.jobLink && <th>Job Link</th>}
                  {visibleColumns.deadline && (
                    <th className="jobs-table-sortable" onClick={toggleDeadlineSort}>
                      Deadline
                      <span className="sort-indicator">
                        {deadlineSort === "asc" ? "▲" : deadlineSort === "desc" ? "▼" : "⇅"}
                      </span>
                    </th>
                  )}
                  {visibleColumns.position && <th>Position</th>}
                  {visibleColumns.contactName && <th>Contact Name</th>}
                  {visibleColumns.contactPhone && <th>Contact Phone</th>}
                  {visibleColumns.contactEmail && <th>Contact Email</th>}
                  {visibleColumns.applied && <th>Applied</th>}
                  {visibleColumns.appliedDate && <th>Applied date</th>}
                  {visibleColumns.mail && <th>Mail</th>}
                  {visibleColumns.followUp && <th>Follow up</th>}
                  {visibleColumns.testInterview && <th>Test / Interview</th>}
                  {visibleColumns.time && <th>Time</th>}
                </tr>
              </thead>
              <tbody>
                {visibleJobs.length === 0 ? (
                  <tr>
                    <td colSpan={1 + Object.values(visibleColumns).filter(Boolean).length} className="jobs-table-empty">
                      No jobs match your search or filters.
                    </td>
                  </tr>
                ) : (
                  visibleJobs.map(({ job, rowId }) => {
                    const remaining = daysUntil(job.application_deadline);
                    return (
                      <tr
                        key={job.id}
                        className={rowClass(job, remaining)}
                        onClick={() => navigate(`/jobs/${job.id}`)}
                      >
                        <td className="jobs-table-id">{rowId}</td>
                        {visibleColumns.company && (
                          <td>
                            {job.company ? (
                              <span className="company-cell">
                                <span className="company-avatar" style={{ background: avatarColor(job.company) }}>
                                  {job.company.charAt(0).toUpperCase()}
                                </span>
                                {job.company}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        )}
                        {visibleColumns.jobLink && (
                          <td className="jobs-table-link" onClick={(e) => e.stopPropagation()}>
                            <a href={job.source_url} target="_blank" rel="noreferrer" title={job.source_url}>
                              Job Link ↗
                            </a>
                          </td>
                        )}
                        {visibleColumns.deadline && (
                          <td>
                            {job.application_deadline ? (
                              <span className={remaining !== null && remaining <= 3 ? "deadline-soon" : "deadline"}>
                                {formatDate(job.application_deadline)}
                                {remaining !== null ? ` (${remaining}d)` : ""}
                              </span>
                            ) : (
                              <span className="deadline">{job.deadline_note || "—"}</span>
                            )}
                          </td>
                        )}
                        {visibleColumns.position && (
                          <td className="jobs-table-position">{job.title ?? "—"}</td>
                        )}
                        {visibleColumns.contactName && (
                          <td className="jobs-table-truncate" title={job.contact_name ?? undefined}>
                            {job.contact_name || "—"}
                          </td>
                        )}
                        {visibleColumns.contactPhone && <td>{job.contact_phone || "—"}</td>}
                        {visibleColumns.contactEmail && (
                          <td className="jobs-table-truncate" title={job.contact_email ?? undefined}>
                            {job.contact_email || "—"}
                          </td>
                        )}
                        {visibleColumns.applied && (
                          <td>
                            <span className={`status-badge status-${job.status}`}>{STATUS_LABELS[job.status]}</span>
                          </td>
                        )}
                        {visibleColumns.appliedDate && (
                          <td>{job.applied_at ? formatDate(job.applied_at) : "—"}</td>
                        )}
                        {visibleColumns.mail && (
                          <td className="jobs-table-truncate" title={job.mail_notes ?? undefined}>
                            {job.mail_notes || "—"}
                          </td>
                        )}
                        {visibleColumns.followUp && (
                          <td className="jobs-table-truncate" title={job.follow_up_notes ?? undefined}>
                            {job.follow_up_notes || "—"}
                          </td>
                        )}
                        {visibleColumns.testInterview && (
                          <td className="jobs-table-truncate" title={job.interview_notes ?? undefined}>
                            {job.interview_notes || "—"}
                          </td>
                        )}
                        {visibleColumns.time && <td>{job.interview_time || "—"}</td>}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
