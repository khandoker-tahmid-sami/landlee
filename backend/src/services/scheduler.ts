import cron from "node-cron";
import { config } from "../config.js";
import { supabaseAdmin } from "../supabaseClient.js";
import { sendDeadlineReminderEmail } from "./emailer.js";

interface JobRow {
  id: string;
  user_id: string;
  title: string | null;
  company: string | null;
  application_deadline: string | null;
}

function daysBetween(today: Date, target: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const startOfToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const startOfTarget = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  return Math.round((startOfTarget - startOfToday) / msPerDay);
}

async function checkDeadlinesAndNotify(): Promise<void> {
  const { data: jobs, error } = await supabaseAdmin
    .from("jobs")
    .select("id, user_id, title, company, application_deadline")
    .not("application_deadline", "is", null)
    .in("status", ["saved", "applied", "interviewing"]);

  if (error) {
    console.error("Failed to load jobs for deadline check:", error.message);
    return;
  }

  const today = new Date();

  for (const job of (jobs ?? []) as JobRow[]) {
    if (!job.application_deadline) continue;
    const deadline = new Date(job.application_deadline);
    const remaining = daysBetween(today, deadline);

    if (!config.deadlineReminderDays.includes(remaining)) continue;

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(job.user_id);
    if (userError || !userData.user?.email) continue;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email_notifications")
      .eq("id", job.user_id)
      .single();
    if (profile && profile.email_notifications === false) continue;

    try {
      await sendDeadlineReminderEmail({
        to: userData.user.email,
        jobTitle: job.title ?? "a saved job",
        company: job.company,
        deadline: job.application_deadline,
        daysRemaining: remaining,
      });
      console.log(`Sent deadline reminder for job ${job.id} to ${userData.user.email} (${remaining}d left)`);
    } catch (sendError) {
      console.error(`Failed to send reminder for job ${job.id}:`, sendError);
    }
  }
}

export function startDeadlineScheduler(): void {
  // Runs once a day at 08:00 server time.
  cron.schedule("0 8 * * *", () => {
    checkDeadlinesAndNotify().catch((err) => console.error("Deadline check failed:", err));
  });

  // Also run once shortly after startup so reminders aren't only checked at 08:00.
  checkDeadlinesAndNotify().catch((err) => console.error("Initial deadline check failed:", err));
}
