import { Request, Response } from "express";

import { ai } from "../config/gemini";
import { groq } from "../config/groq";
import { qdrantClient, COLLECTION_NAME } from "../config/qdrant";
import { prisma } from "../config/db";
import { Prisma } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";
import { buildRepoPrompt } from "../constants/prompts";
import { generateQueryEmbedding } from "../services/embeddingService";

export async function handleChatMessage(req: AuthRequest, res: Response) {
  try {
    console.log("DEBUG: Checking Input validation");
    const { conversationId, message } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json({ error: "Unauthorized: Missing user authentication session." });
    }

    if (!conversationId || !message) {
      return res
        .status(400)
        .json({ error: "Conversation ID and message content are required." });
    }

    // Secure Gatekeeping: Ensure the conversation exists AND belongs to this specific user
    // Fetch recent message history (last 8 messages) for multi-turn context retention
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: userId, // Cross-tenant access protection
      },
      include: {
        repository: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 8,
        },
      },
    });

    if (!conversation || !conversation.repository) {
      return res.status(404).json({
        error: "Repository or Conversation workspace thread not found.",
      });
    }

    // Chronological order for recent messages
    const recentMessages = [...(conversation.messages || [])].reverse();
    const formattedHistory =
      recentMessages.length > 0
        ? recentMessages
            .map(
              (m) =>
                `${m.role === "USER" ? "Developer" : "RepoGPT"}: ${m.content}`,
            )
            .join("\n\n")
        : "No prior conversation.";

    // Generate query vector via Hugging Face Embedding Engine (BAAI/bge-base-en-v1.5, 768-dim)
    console.log("DEBUG: Generating query vector via Hugging Face Embedding API");
    const queryVector = await generateQueryEmbedding(message);

    // Search Qdrant for top code snippets matching the query vector within this repository
    console.log("DEBUG: Searching the qdrant");

    const targetRepoId = conversation.repositoryId as string;

    const searchResults = await qdrantClient.search(COLLECTION_NAME, {
      vector: queryVector,
      filter: {
        must: [{ key: "repositoryId", match: { value: targetRepoId } }],
      },
      limit: 7,
    });

    console.log("DEBUG: Preparing the code blocks and file path");
    const contextBlocks = searchResults
      .map((hit) => hit.payload?.content)
      .filter(Boolean)
      .join("\n\n---\n\n");

    const uniqueSources = Array.from(
      new Set(searchResults.map((hit) => hit.payload?.filePath)),
    ).filter(Boolean);

    const systemPrompt = buildRepoPrompt({
      repoName: conversation.repository.name,
      contextBlocks,
      formattedHistory,
      message,
    });

    // Call Groq LPU LLM with automatic Gemini fallback
    const assistantAnswer = await generateLLMResponse(systemPrompt);

    console.log("DEBUG: Updating the Prisma Database");
    await prisma.message.create({
      data: { role: "USER", content: message, conversationId },
    });

    await prisma.message.create({
      data: {
        role: "ASSISTANT",
        content: assistantAnswer,
        conversationId,
        sources: uniqueSources as Prisma.InputJsonValue,
      },
    });

    console.log("Complete");
    return res.status(200).json({
      answer: assistantAnswer,
      sources: uniqueSources,
    });
  } catch (error: any) {
    console.error({
      status: error?.status,
      message: error?.message,
      details: error,
    });
    return res
      .status(500)
      .json({ error: "An internal exception occurred during RAG generation." });
  }
}

/**
 * High-performance LLM Response Orchestrator.
 * Tries Groq LPU models (groq/compound, groq/compound-mini, openai/gpt-oss-120b) for sub-second inference.
 * Automatically falls back to Gemini if GROQ_API_KEY is not configured or rate-limited.
 */
async function generateLLMResponse(prompt: string): Promise<string> {
  if (process.env.GROQ_API_KEY) {
    const rawModel = process.env.GROQ_MODEL
      ? process.env.GROQ_MODEL.replace(/["']/g, "").trim()
      : "groq/compound";

    const groqCandidates = Array.from(
      new Set([
        rawModel,
        "groq/compound",
        "groq/compound-mini",
        "openai/gpt-oss-120b",
        "qwen/qwen3.6-27b",
        "llama-3.3-70b-versatile",
      ]),
    );

    for (const model of groqCandidates) {
      try {
        console.log(`⚡ Requesting Groq inference using: ${model}`);

        const chatCompletion = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model,
          temperature: 0.2,
        });

        const responseText = chatCompletion.choices[0]?.message?.content;
        if (responseText) {
          return responseText;
        }
      } catch (groqErr: any) {
        console.warn(
          `⚠️ Groq Model "${model}" failed (${groqErr?.message || groqErr}). Trying next Groq candidate...`,
        );
      }
    }
  }

  // Fallback to Gemini if Groq is unconfigured or all candidates failed
  return await generateGeminiResponse(prompt);
}

/**
 * Resilient Gemini Content Generation with Multi-Model Fallback Queue.
 * Tries the primary requested model first (e.g. models/gemini-3.6-flash),
 * and automatically cascades to backup models if a 503 (high demand) or 429 occurs.
 */
async function generateGeminiResponse(prompt: string): Promise<string> {
  const primaryModel = process.env.GEMINI_MODEL || "models/gemini-3.6-flash";
  const modelCandidates = [
    primaryModel,
    "models/gemini-3.7-flash",
    "models/gemini-3.5-flash",
    "gemini-3.1-pro",
  ];

  // Deduplicate candidate queue while preserving order
  const modelQueue = Array.from(new Set(modelCandidates));
  let lastError: any = null;

  for (const model of modelQueue) {
    try {
      console.log(`🤖 Requesting Gemini inference using: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });

      if (response.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn(
        `⚠️ Model "${model}" failed with status ${err?.status || "ERR"}: ${err?.message || err}. Cascading to next fallback...`,
      );
      lastError = err;
    }
  }

  throw lastError || new Error("All Gemini model endpoints failed to respond.");
}

export async function getChats(req: AuthRequest, res: Response) {
  const repositoryId = req.params.repositoryId as string;

  // 1. Extract the verified user ID from the requireAuth middleware layer
  const userId = req.user?.id;

  if (!userId) {
    return res
      .status(401)
      .json({ error: "Unauthorized: Missing authentication context." });
  }

  try {
    // 2. Look up the conversation matching BOTH this repository AND this authenticated user
    let conversation = await prisma.conversation.findFirst({
      where: {
        repositoryId,
        userId, // Ensures data isolation between different authenticated accounts
      },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    // 3. If it doesn't exist, create it tied to the actual logged-in user
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          repositoryId: repositoryId,
          userId: userId, // 👈 Dynamically binds the real user profile!
          title: "New Chat",
        },
        include: {
          messages: true,
        },
      });
    }

    return res.status(200).json({
      conversationId: conversation.id,
      messages: conversation.messages || [],
    });
  } catch (error) {
    console.error("Error in getChats workspace provisioning:", error);
    return res
      .status(500)
      .json({ error: "Failed to initialize conversation space." });
  }
}
