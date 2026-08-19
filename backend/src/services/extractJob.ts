import * as cheerio from "cheerio";
import { GEMINI_MODEL, generateContentWithRetry } from "../geminiClient.js";
import type { ExtractedJobInfo } from "../types.js";

const MAX_DESCRIPTION_CHARS = 15000;

async function fetchPageText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch job page (${response.status})`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, nav, footer").remove();

  const text = $("body").text().replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return text.slice(0, MAX_DESCRIPTION_CHARS);
}

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    title: { type: ["string", "null"] },
    company: { type: ["string", "null"] },
    location: { type: ["string", "null"] },
    employment_type: {
      type: ["string", "null"],
      description: "e.g. Full-time, Part-time, Contract, Internship",
    },
    salary_range: { type: ["string", "null"] },
    responsibilities: { type: "array", items: { type: "string" } },
    requirements: { type: "array", items: { type: "string" } },
    nice_to_have: { type: "array", items: { type: "string" } },
    application_deadline: {
      type: ["string", "null"],
      description: "ISO date YYYY-MM-DD if a deadline is stated or can be inferred; otherwise null",
    },
    contact_name: {
      type: ["string", "null"],
      description: "Name (and title, if given) of the hiring/recruiter contact named on the posting. Null if none is listed.",
    },
    contact_phone: {
      type: ["string", "null"],
      description: "Phone number of the hiring/recruiter contact, if listed. Null otherwise.",
    },
    contact_email: {
      type: ["string", "null"],
      description: "Email address of the hiring/recruiter contact, if listed. Null otherwise.",
    },
  },
  required: [
    "title",
    "company",
    "location",
    "employment_type",
    "salary_range",
    "responsibilities",
    "requirements",
    "nice_to_have",
    "application_deadline",
    "contact_name",
    "contact_phone",
    "contact_email",
  ],
};

export async function extractJobFromUrl(url: string): Promise<ExtractedJobInfo> {
  const pageText = await fetchPageText(url);

  const response = await generateContentWithRetry({
    model: GEMINI_MODEL,
    contents:
      "Extract structured job posting information from the following page text. " +
      "If a field isn't present, use null (or an empty array for list fields). " +
      "For application_deadline, only fill it in if the posting states or clearly implies a closing date; " +
      "do not guess.\n\n---\n\n" +
      pageText,
    config: {
      responseMimeType: "application/json",
      responseSchema: EXTRACTION_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini did not return structured job data");
  }

  const parsed = JSON.parse(text) as Omit<ExtractedJobInfo, "raw_description">;
  return { ...parsed, raw_description: pageText };
}
