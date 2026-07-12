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
      return res.status(404).json({
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
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    pastMessages.reverse();

    const conversationHistoryString = pastMessages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    console.log("DEBUG: Analysing repository and generating response");

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

Conversation History:

${conversationHistoryString}

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

Do not simply summarize the code.
Explain what it does, why it exists, and how it relates to the user's question.

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

Use:

- headings only when needed
- bullet points when appropriate
- numbered steps when explaining workflows
- tables only if they genuinely improve readability
- fenced code blocks with the correct language when including code

Keep paragraphs short.

Avoid repeating information.

Avoid unnecessary introductions or conclusions.

Match the amount of detail to the complexity of the user's question.

A one-line question should usually receive a concise answer.

A complex architectural question should receive a comprehensive explanation.

======================================================================
FINAL RULES
======================================================================

Your goals are:

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

    console.log("Complete");
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

export async function getChats(req: Request, res: Response) {
  const { repositoryId } = req.params;

  try {
    // 1. Ensure a default user exists to satisfy the relational database constraint
    let defaultUser = await prisma.user.findFirst();

    // If you recently wiped the DB and no users exist, auto-generate a mock profile
    if (!defaultUser) {
      defaultUser = await prisma.user.create({
        data: {
          id: "u1111111-1111-1111-1111-111111111111",
          email: "mehtab.dev@example.com",
          name: "Mehtab",
        },
      });
    }

    // 2. Look up the existing conversation for this repository context
    let conversation = await prisma.conversation.findFirst({
      where: { repositoryId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    // 3. If it doesn't exist, create it while providing the required userId relation
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          repositoryId: repositoryId,
          userId: defaultUser.id, // 👈 Relational payload link added here!
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
