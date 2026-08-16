import { GoogleGenAI } from "@google/genai";
import { config } from "./config.js";

export const genAI = new GoogleGenAI({ apiKey: config.geminiApiKey });

export const GEMINI_MODEL = config.geminiModel;
