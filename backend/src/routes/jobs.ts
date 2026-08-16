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

jobsRouter.delete("/:id", async (req, res) => {
  const { error } = await supabaseAdmin
    .from("jobs")
    .delete()
    .eq("user_id", req.user!.id)
    .eq("id", req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
});
