import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertClockIcon, AwardIcon, CheckCircleIcon, MessageCircleIcon } from "../components/DashboardIcons";
import { MonthlyBarChart } from "../components/MonthlyBarChart";
import { StatTile } from "../components/StatTile";
import { useAuth } from "../context/AuthContext";
import { api, type JobStats } from "../lib/api";

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<JobStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.jobs
      .stats()
      .then(setStats)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="form-error">{error}</p>;
  if (!stats) return <p>Loading…</p>;

  const hasAnyActivity = stats.monthly.some((m) => m.count > 0);
  const monthlyTotal = stats.monthly.reduce((sum, m) => sum + m.count, 0);
  const firstName = profile?.full_name?.trim().split(" ")[0];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <p className="dashboard-greeting">
            {timeOfDayGreeting()}
            {firstName ? `, ${firstName}` : ""}
          </p>
          <h1>Dashboard</h1>
        </div>
        <Link to="/add-job" className="button-primary">
          + Add job
        </Link>
      </div>

      <div className="stat-grid">
        <StatTile label="Applied" value={stats.applied} color="#0891a3" icon={<CheckCircleIcon />} />
        <StatTile label="Interviewing" value={stats.interviewing} color="#d99a34" icon={<MessageCircleIcon />} />
        <StatTile label="Offers" value={stats.offers} color="#0f9b6e" icon={<AwardIcon />} />
        <StatTile label="Missed deadlines" value={stats.missed} color="#d84315" icon={<AlertClockIcon />} />
      </div>

      <section className="dashboard-chart-section">
        <div className="dashboard-chart-header">
          <h2>Applications by month</h2>
          {hasAnyActivity && (
            <span className="dashboard-chart-total">
              {monthlyTotal} in the last 6 months
            </span>
          )}
        </div>
        {hasAnyActivity ? (
          <MonthlyBarChart data={stats.monthly} color="#0891a3" />
        ) : (
          <p className="hint">
            No applications yet. Once you mark a saved job as "Applied," it'll show up here.
          </p>
        )}
      </section>

      <p className="dashboard-footer-link">
        <Link to="/jobs">View all saved jobs →</Link>
      </p>
    </div>
  );
}
