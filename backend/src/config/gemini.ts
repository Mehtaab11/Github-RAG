import { GoogleGenAI } from "@google/genai";

import dotenv from "dotenv";

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  console.warn("⚠️ Warning: GEMINI_API_KEY environment variable is missing.");
}

export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});
