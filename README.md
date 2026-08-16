# Landlee

A web app that helps you while job hunting:

- **Paste a job link** → the backend fetches the page and uses Gemini to extract structured info
  (title, company, requirements, responsibilities, deadline, etc.) and saves it to your account.
- **Generate a tailored cover letter and CV notes** for any saved job, grounded in your own resume
  text (Gemini is instructed never to invent experience).
- **Deadline email reminders** — a daily job checks upcoming application deadlines and emails you
  (7 / 3 / 1 days out by default).
- **Accounts** — each user has their own login and only sees their own jobs (Supabase Auth + Row
  Level Security).

Stack: **React + Vite** (frontend), **Node.js + Express** (backend), **Supabase** (Postgres +
Auth), **Google Gemini API** (extraction + writing, free tier), **Nodemailer** (email) +
**node-cron** (scheduling).

## Project layout

```
frontend/    React app (Vite, TypeScript, react-router)
backend/     Express API (TypeScript)
supabase/    schema.sql — run this once in your Supabase project
```

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the Supabase SQL editor, run the contents of `supabase/schema.sql`. This creates the
   `profiles`, `jobs`, and `generated_documents` tables, Row Level Security policies, and a
   trigger that auto-creates a profile row on signup.
3. From **Project Settings → API Keys**, note down:
   - `Project URL`
   - `anon` public key — labeled **"Publishable key"** (`sb_publishable_...`) on projects using
     Supabase's newer API key system (frontend)
   - `service_role` secret key — labeled **"Secret key"** (`sb_secret_...`) on the newer system
     (backend — **never expose this to the browser or commit it to git**)

   You do **not** need anything from the **JWT Keys** / **JWT Settings** page — this app verifies
   sessions by calling Supabase's Auth API, not by checking the JWT signature locally.

## 2. Get a Gemini API key (free)

Go to [Google AI Studio](https://aistudio.google.com/apikey), sign in with a personal Google
account, and click **Create API key**. No credit card required for the free tier. This powers
both job-listing extraction and the cover-letter/CV writing.

## 3. Set up outbound email (for deadline reminders)

Any SMTP provider works — Gmail with an [App Password](https://myaccount.google.com/apppasswords),
or a transactional provider like Resend/Mailgun/SendGrid's SMTP endpoint. If you skip this, the
app still works — it just logs a warning instead of sending reminder emails.

## 4. Configure environment variables

```bash
cd backend && cp .env.example .env      # fill in Supabase + Gemini + SMTP values
cd ../frontend && cp .env.example .env  # fill in Supabase URL + anon key
```

## 5. Run it

There's no single `npm install` at the repo root that installs everything on its own — `frontend/`
and `backend/` are separate Node projects, each with their own `package.json`. Use one of:

**Option A — from the repo root** (a thin root `package.json` wraps both):

```bash
npm install          # installs the root's one dev dependency (concurrently)
npm run install:all  # installs backend/ and frontend/ dependencies
npm run dev          # runs both dev servers together (backend :4000, frontend :5173)
```

**Option B — two terminals, running each project directly:**

```bash
# Terminal 1 — backend
cd backend
npm install
npm run dev      # http://localhost:4000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev       # http://localhost:5173
```

Sign up for an account in the frontend, add your resume text under **Settings**, then paste a job
link on the **Add job** page.

## How it works

- **Auth**: Supabase Auth (email/password) on the frontend; the backend verifies the Supabase JWT
  on every request via `supabaseAdmin.auth.getUser(token)`.
- **Extraction**: `backend/src/services/extractJob.ts` fetches the job page's HTML, strips it down
  to plain text with `cheerio`, and asks Gemini to return structured JSON matching a fixed schema
  (`responseSchema` / structured outputs — no fragile regex parsing).
- **Writing**: `backend/src/services/generateDocuments.ts` sends the job's requirements plus the
  user's saved resume text to Gemini and asks for a cover letter or CV tailoring notes. The prompt
  explicitly forbids inventing experience.
- **Reminders**: `backend/src/services/scheduler.ts` runs once at startup and then daily via
  `node-cron`, checks every saved job's `application_deadline`, and emails the user when the
  remaining days match `DEADLINE_REMINDER_DAYS` (default `7,3,1`).

## Notes / next steps

This is a working first version. Natural things to add next: password reset flow, resume file
upload (PDF/DOCX) instead of pasting plain text, richer job-status tracking (interview notes),
and per-user notification preferences beyond the single on/off toggle.
