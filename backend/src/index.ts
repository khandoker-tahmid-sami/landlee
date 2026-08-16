import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { requireAuth } from "./middleware/auth.js";
import { documentsRouter } from "./routes/documents.js";
import { jobsRouter } from "./routes/jobs.js";
import { profileRouter } from "./routes/profile.js";
import { startDeadlineScheduler } from "./services/scheduler.js";

const app = express();

app.use(cors({ origin: config.frontendOrigin }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/jobs", requireAuth, jobsRouter);
app.use("/api/documents", requireAuth, documentsRouter);
app.use("/api/profile", requireAuth, profileRouter);

app.use((req, res) => res.status(404).json({ error: "Not found" }));

app.listen(config.port, () => {
  console.log(`Landlee API listening on http://localhost:${config.port}`);
  startDeadlineScheduler();
});
