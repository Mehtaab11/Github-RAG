import { Request, Response } from "express";

import { ai } from "../config/gemini";
import { qdrantClient, COLLECTION_NAME } from "../config/qdrant";
import { prisma } from "../config/db";
import { Prisma } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";
import { buildRepoPrompt } from "../constants/prompts";

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
        userId: userId, // 👈 Cross-tenant access protection
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

    // Building the vector of the given message
    console.log("DEBUG: Building pipeline");
    const { pipeline } = await import("@xenova/transformers");

    const extractor = await pipeline(
      "feature-extraction",
      "Xenova/bge-base-en-v1.5",
    );

    console.log("DEBUG: Converting Message to vector");
    const output = await extractor(message, {
      pooling: "mean",
      normalize: true,
    });

    const queryVector = Array.from(output.data) as number[];

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

    // Initialize Gemini call with models/gemini-3.6-flash
    const geminiResponse = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "models/gemini-3.6-flash",
      contents: systemPrompt,
    });

    const assistantAnswer =
      geminiResponse.text ||
      "I was unable to analyze the codebase context successfully.";

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
