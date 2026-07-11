import { Request, Response } from "express";

import { ai } from "../config/gemini";
import { qdrantClient, COLLECTION_NAME } from "../config/qdrant";
import { prisma } from "../config/db";
import { Prisma } from "@prisma/client";

export async function handleChatMessage(req: Request, res: Response) {
  try {
    console.log("DEBUG: Checking Input validation");
    const { conversationId, message } = req.body;

    if (!conversationId || !message) {
      return res
        .status(400)
        .json({ error: "Conversation ID and message content are required." });
    }

    const conversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
      include: {
        repository: true,
      },
    });

    if (!conversation || !conversation?.repository) {
      return res.status(401).json({
        error: "Repository / Conversation not found",
      });
    }

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

    const searchResults = await qdrantClient.search(COLLECTION_NAME, {
      vector: queryVector,
      filter: {
        must: [
          { key: "repositoryId", match: { value: conversation.repositoryId } },
        ],
      },
      limit: 5, // Retrieve top 5 most relevant code blocks
    });

    // console.log("🔍 DEBUG: Qdrant matches found:", searchResults.length, searchResults);
    // Extract context code strings and unique file sources

    // this extract the codeblock/content from vectors

    console.log("DEBUG: Preparing the code blocks and file path");

    const contextBlocks = searchResults
      .map((hit) => hit.payload?.content)
      .join("\n\n---\n\n");

    const uniqueSources = Array.from(
      new Set(searchResults.map((hit) => hit.payload?.filePath)),
    ).filter(Boolean);

    // loading the past messages for giving the chat context

    console.log("DEBUG: Loading the previous message ");

    const pastMessages = await prisma.message.findMany({
      where: {
        conversationId,
      },

      orderBy: { createdAt: "asc" },
      take: 10,
    });

    const conversationHistoryString = pastMessages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    console.log("DEBUG: Analysing repository and generating response");

    const systemPrompt = `
You are an expert AI software engineering assistant specializing in code analysis.
You are helping a developer understand their codebase repository: "${conversation.repository.name}".

Here is the relevant source code retrieved semantically from the codebase to help answer the user's question:
${contextBlocks}

Recent Conversation History:
${conversationHistoryString}

User Question: "${message}"

Instructions:
- Use the provided source code snippets to construct a technically precise, highly accurate answer.
- Reference exact file names and structural boundaries where applicable.
- If the provided context doesn't contain enough details to confidently answer, clearly state that rather than fabricating solutions.
    `;

    // Prompt

    const geminiResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash", // Fast, highly capable context-handling model
      contents: systemPrompt,
    });

    const assistantAnswer =
      geminiResponse.text ||
      "I was unable to analyze the codebase context successfully.";

    console.log("DEBUG: Updating the Prisma Database");

    await prisma.$transaction([
      prisma.message.create({
        data: { role: "USER", content: message, conversationId },
      }),
      prisma.message.create({
        data: {
          role: "ASSISTANT",
          content: assistantAnswer,
          conversationId,
          sources: uniqueSources as Prisma.InputJsonValue,
        },
      }),
    ]);

    return res.status(200).json({
      answer: assistantAnswer,
      sources: uniqueSources,
    });
  } catch (error) {
    console.error("RAG Engine Error:", error);
    return res
      .status(500)
      .json({ error: "An internal exception occurred during RAG generation." });
  }
}
