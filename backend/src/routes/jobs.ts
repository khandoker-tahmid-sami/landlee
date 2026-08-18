import { Router } from "express";
import { supabaseAdmin } from "../supabaseClient.js";
import { extractJobFromUrl } from "../services/extractJob.js";

export const jobsRouter = Router();

// Paste a job URL -> fetch + Claude-extract -> save under the current user.
jobsRouter.post("/extract", async (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Missing 'url' in request body" });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("invalid protocol");
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  try {
    const extracted = await extractJobFromUrl(parsedUrl.toString());

    const { data, error } = await supabaseAdmin
      .from("jobs")
      .insert({
        user_id: req.user!.id,
        source_url: parsedUrl.toString(),
        title: extracted.title,
        company: extracted.company,
        location: extracted.location,
        employment_type: extracted.employment_type,
        salary_range: extracted.salary_range,
        responsibilities: extracted.responsibilities,
        requirements: extracted.requirements,
        nice_to_have: extracted.nice_to_have,
        raw_description: extracted.raw_description,
        application_deadline: extracted.application_deadline,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error("Job extraction failed:", err);
    res.status(502).json({ error: "Failed to extract job information from that URL" });
  }
});

jobsRouter.get("/", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("jobs")
    .select("*")
    .eq("user_id", req.user!.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

jobsRouter.get("/:id", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("jobs")
    .select("*")
    .eq("user_id", req.user!.id)
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(404).json({ error: "Job not found" });
  res.json(data);
});

jobsRouter.patch("/:id", async (req, res) => {
  const allowedFields = ["status", "application_deadline", "title", "company"];
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in req.body) updates[field] = req.body[field];
  }

  // Record the moment a job first becomes 'applied', so the dashboard's
  // monthly chart reflects when the user actually applied rather than
  // whatever the status happens to be as of the latest edit.
  if (updates.status === "applied") {
    const { data: existing } = await supabaseAdmin
      .from("jobs")
      .select("applied_at")
      .eq("user_id", req.user!.id)
      .eq("id", req.params.id)
      .single();

    if (existing && !existing.applied_at) {
      updates.applied_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabaseAdmin
    .from("jobs")
    .update(updates)
    .eq("user_id", req.user!.id)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

jobsRouter.get("/stats/summary", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("jobs")
    .select("status, application_deadline, applied_at")
    .eq("user_id", req.user!.id);

  if (error) return res.status(500).json({ error: error.message });

  const today = new Date();
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

  let applied = 0;
  let interviewing = 0;
  let offers = 0;
  let missed = 0;

  for (const job of data) {
    if (job.status === "interviewing") interviewing++;
    if (job.status === "offer") offers++;
    if (job.applied_at) applied++;

    if (job.status === "saved" && job.application_deadline) {
      const [year, month, day] = job.application_deadline.split("-").map(Number);
      const deadlineUTC = Date.UTC(year, month - 1, day);
      if (deadlineUTC < todayUTC) missed++;
    }
  }

  // Last 6 months, oldest first, zero-filled so months with no applications
  // still show up on the chart instead of just disappearing.
  const monthly: { month: string; label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
    monthly.push({ month: key, label, count: 0 });
  }
  const monthIndex = new Map(monthly.map((m, i) => [m.month, i]));

  for (const job of data) {
    if (!job.applied_at) continue;
    const key = job.applied_at.slice(0, 7); // "YYYY-MM"
    const idx = monthIndex.get(key);
    if (idx !== undefined) monthly[idx].count++;
  }

  res.json({ applied, interviewing, offers, missed, monthly });
});

jobsRouter.delete("/:id", async (req, res) => {
  const { error } = await supabaseAdmin
    .from("jobs")
    .delete()
    .eq("user_id", req.user!.id)
    .eq("id", req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
});
