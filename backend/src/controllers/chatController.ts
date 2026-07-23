import { Request, Response } from "express";

import { ai } from "../config/gemini";
import { qdrantClient, COLLECTION_NAME } from "../config/qdrant";
import { prisma } from "../config/db";
import { Prisma } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";

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
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: userId, // 👈 Cross-tenant access protection
      },
      include: {
        repository: true,
      },
    });

    if (!conversation || !conversation.repository) {
      return res.status(404).json({
        error: "Repository or Conversation workspace thread not found.",
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

    // Fix: Explicitly ensure repositoryId is string evaluated
    const targetRepoId = conversation.repositoryId as string;

    const searchResults = await qdrantClient.search(COLLECTION_NAME, {
      vector: queryVector,
      filter: {
        must: [{ key: "repositoryId", match: { value: targetRepoId } }],
      },
      limit: 5,
    });

    // console.log("DEBUG: Search results from vector DB:", searchResults);

    console.log("DEBUG: Preparing the code blocks and file path");
    const contextBlocks = searchResults
      .map((hit) => hit.payload?.content)
      .join("\n\n---\n\n");

    const uniqueSources = Array.from(
      new Set(searchResults.map((hit) => hit.payload?.filePath)),
    ).filter(Boolean);

    const systemPrompt = `You are RepoGPT, an expert AI software engineering assistant specializing in understanding, analyzing, debugging, and explaining GitHub repositories.

You are helping a developer understand the following repository:

Repository:
${conversation.repository.name}

======================================================================
REPOSITORY CONTEXT
======================================================================

The following code snippets were retrieved using semantic search because they are relevant to the user's question.

${contextBlocks}

======================================================================
END OF REPOSITORY CONTEXT
======================================================================

======================================================================
USER QUESTION
======================================================================

${message}

======================================================================
INSTRUCTIONS
======================================================================

The repository context above is your primary source of truth.
Use it to answer the user's question accurately.
If the provided context does not contain enough information to answer confidently, explicitly state that you don't have enough repository context instead of guessing.

Never invent:
- files
- classes
- functions
- APIs
- implementation details
- project architecture

When possible, reference relevant files, modules, classes, interfaces, functions, or methods.
Connect information from multiple retrieved snippets whenever appropriate.
Do not simply summarize the code. Explain what it does, why it exists, and how it relates to the user's question.

======================================================================
RESPONSE STYLE
======================================================================

Adapt the depth and structure of your response to the user's question.

For simple factual questions:
- Answer directly.
- Keep the response concise.
- Avoid unnecessary headings.
- Use bullet points only when they improve readability.
- Mention relevant files only if they add value.

For explanatory questions:
- Explain the reasoning.
- Reference important repository components.
- Use headings only when they improve clarity.

For debugging questions:
- Explain the likely cause.
- Explain your reasoning.
- Suggest possible fixes.
- Mention assumptions if context is incomplete.

For architecture or design questions:
Explain:
- component responsibilities
- execution flow
- data flow
- dependencies
- trade-offs
Use clear headings where appropriate.

For code generation:
Generate clean, production-quality code that follows the apparent coding style of the repository.

======================================================================
FORMATTING
======================================================================

Produce clean Markdown.
Use headings only when needed, bullet points when appropriate, and numbered steps when explaining workflows.
Keep paragraphs short. Avoid repeating information. Avoid unnecessary introductions or conclusions.
Match the amount of detail to the complexity of the user's question.

======================================================================
FINAL RULES
======================================================================

1. Be technically accurate.
2. Stay grounded in the repository context.
3. Explain clearly.
4. Never hallucinate repository details.
5. Optimize for usefulness rather than verbosity.
6. If information is missing, explicitly say so instead of guessing.

Guidelines:
- Use bullet lists where appropriate.
- Use **bold** for important technologies.
- Use inline code for filenames, functions, classes, and libraries.
- Use fenced code blocks with the language specified when including code.
- Do not output HTML.
`;

    // console.log(contextBlocks);

    // Initialize Gemini call
    const geminiResponse = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
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
