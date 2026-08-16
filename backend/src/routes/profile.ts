import { Router } from "express";
import { supabaseAdmin } from "../supabaseClient.js";

export const profileRouter = Router();

profileRouter.get("/", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", req.user!.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (data) return res.json(data);

  // No profile row — the signup trigger normally creates one, but it only
  // fires once at signup, so a deleted or otherwise missing row is never
  // recreated on its own. Self-heal instead of leaving the account stuck.
  const { data: created, error: createError } = await supabaseAdmin
    .from("profiles")
    .insert({ id: req.user!.id })
    .select()
    .single();

  if (createError) return res.status(500).json({ error: createError.message });
  res.json(created);
});

profileRouter.patch("/", async (req, res) => {
  const allowedFields = ["full_name", "resume_text", "email_notifications"];
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in req.body) updates[field] = req.body[field];
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", req.user!.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});
