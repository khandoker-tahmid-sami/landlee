import { GEMINI_MODEL, generateContentWithRetry } from "../geminiClient.js";

export interface JobContext {
  title: string | null;
  company: string | null;
  location: string | null;
  responsibilities: string[];
  requirements: string[];
  nice_to_have: string[];
  raw_description: string;
}

function jobSummaryBlock(job: JobContext): string {
  return [
    `Job title: ${job.title ?? "Unknown"}`,
    `Company: ${job.company ?? "Unknown"}`,
    `Location: ${job.location ?? "Unknown"}`,
    job.responsibilities.length ? `Responsibilities:\n- ${job.responsibilities.join("\n- ")}` : "",
    job.requirements.length ? `Requirements:\n- ${job.requirements.join("\n- ")}` : "",
    job.nice_to_have.length ? `Nice to have:\n- ${job.nice_to_have.join("\n- ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function generateCoverLetter(
  job: JobContext,
  resumeText: string,
  applicantName: string | null,
): Promise<string> {
  const response = await generateContentWithRetry({
    model: GEMINI_MODEL,
    contents:
      `Write a cover letter for ${applicantName ?? "the applicant"} applying to this job:\n\n` +
      `${jobSummaryBlock(job)}\n\n---\n\nApplicant's background (resume text):\n\n${resumeText}`,
    config: {
      systemInstruction:
        "You write concise, specific, and honest cover letters. Ground every claim in the applicant's " +
        "actual background — never invent experience, employers, or skills they don't have. Match tone to " +
        "the role (professional, no cliches like 'I am writing to express my interest'). Keep it under 350 words.",
    },
  });

  return response.text ?? "";
}

export async function generateCvSuggestions(job: JobContext, resumeText: string): Promise<string> {
  const response = await generateContentWithRetry({
    model: GEMINI_MODEL,
    contents:
      `Here is the job to tailor for:\n\n${jobSummaryBlock(job)}\n\n---\n\n` +
      `Here is the applicant's current resume text:\n\n${resumeText}`,
    config: {
      systemInstruction:
        "You help candidates tailor their existing CV/resume to a specific job. Compare the job's requirements " +
        "against the resume and produce: (1) which existing bullet points to emphasize or reorder, (2) specific " +
        "rewordings that better mirror the job's language while staying truthful, (3) real gaps the applicant " +
        "should be aware of. Never invent experience. Be concrete and reference the applicant's actual resume content.",
    },
  });

  return response.text ?? "";
}
