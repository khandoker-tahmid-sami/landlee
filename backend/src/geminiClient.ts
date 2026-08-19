import { GoogleGenAI } from "@google/genai";
import { config } from "./config.js";

export const genAI = new GoogleGenAI({ apiKey: config.geminiApiKey });

export const GEMINI_MODEL = config.geminiModel;

const RETRYABLE_STATUS_CODES = new Set([429, 500, 503]);
const MAX_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Gemini's free tier occasionally returns 503 "model overloaded" / 429 "rate limited" for a
// moment under load; these are transient, so a short retry clears most of them automatically
// instead of surfacing an error the user just has to retry by hand.
export async function generateContentWithRetry(
  params: Parameters<typeof genAI.models.generateContent>[0],
): ReturnType<typeof genAI.models.generateContent> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await genAI.models.generateContent(params);
    } catch (err) {
      const status = (err as { status?: number }).status;
      const isRetryable = typeof status === "number" && RETRYABLE_STATUS_CODES.has(status);
      if (!isRetryable || attempt === MAX_ATTEMPTS) throw err;
      await sleep(800 * attempt);
    }
  }
  throw new Error("unreachable");
}
