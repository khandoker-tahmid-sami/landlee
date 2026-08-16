import nodemailer from "nodemailer";
import { config } from "../config.js";

const transporter =
  config.smtp.host && config.smtp.user
    ? nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        auth: { user: config.smtp.user, pass: config.smtp.pass },
      })
    : null;

export async function sendDeadlineReminderEmail(params: {
  to: string;
  jobTitle: string;
  company: string | null;
  deadline: string;
  daysRemaining: number;
}): Promise<void> {
  if (!transporter) {
    console.warn("SMTP not configured — skipping email send. Set SMTP_* env vars to enable.");
    return;
  }

  const { to, jobTitle, company, deadline, daysRemaining } = params;
  const subject =
    daysRemaining <= 0
      ? `Deadline today: ${jobTitle}`
      : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left to apply: ${jobTitle}`;

  await transporter.sendMail({
    from: config.smtp.from,
    to,
    subject,
    text:
      `Reminder: the application deadline for "${jobTitle}"${company ? ` at ${company}` : ""} ` +
      `is ${deadline} (${daysRemaining} day${daysRemaining === 1 ? "" : "s"} from now).\n\n` +
      `Log in to Landlee to review the job details, your tailored CV notes, and cover letter.`,
    html:
      `<p>Reminder: the application deadline for <strong>${jobTitle}</strong>` +
      `${company ? ` at ${company}` : ""} is <strong>${deadline}</strong> ` +
      `(${daysRemaining} day${daysRemaining === 1 ? "" : "s"} from now).</p>` +
      `<p>Log in to Landlee to review the job details, your tailored CV notes, and cover letter.</p>`,
  });
}
