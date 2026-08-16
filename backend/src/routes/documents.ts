import { Router } from "express";
import { supabaseAdmin } from "../supabaseClient.js";
import { generateCoverLetter, generateCvSuggestions } from "../services/generateDocuments.js";

export const documentsRouter = Router();

documentsRouter.post("/generate", async (req, res) => {
  const { job_id, doc_type } = req.body as { job_id?: string; doc_type?: "cover_letter" | "cv_suggestions" };

  if (!job_id || !doc_type || !["cover_letter", "cv_suggestions"].includes(doc_type)) {
    return res.status(400).json({ error: "job_id and a valid doc_type are required" });
  }

  const { data: job, error: jobError } = await supabaseAdmin
    .from("jobs")
    .select("*")
    .eq("user_id", req.user!.id)
    .eq("id", job_id)
    .single();

  if (jobError || !job) return res.status(404).json({ error: "Job not found" });

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("resume_text, full_name")
    .eq("id", req.user!.id)
    .single();

  if (profileError || !profile?.resume_text) {
    return res.status(400).json({ error: "Add your resume text in Settings before generating documents" });
  }

  try {
    const content =
      doc_type === "cover_letter"
        ? await generateCoverLetter(job, profile.resume_text, profile.full_name)
        : await generateCvSuggestions(job, profile.resume_text);

    const { data, error } = await supabaseAdmin
      .from("generated_documents")
      .insert({ user_id: req.user!.id, job_id, doc_type, content })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error("Document generation failed:", err);
    res.status(502).json({ error: "Failed to generate document" });
  }
});

documentsRouter.get("/job/:jobId", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("generated_documents")
    .select("*")
    .eq("user_id", req.user!.id)
    .eq("job_id", req.params.jobId)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
