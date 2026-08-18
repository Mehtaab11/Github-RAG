import { Response } from "express";
import { prisma } from "../config/db";
import { AuthRequest } from "../middleware/auth";
import { repoIngestionQueue } from "../workers/queue";

export async function ingestRepository(req: AuthRequest, res: Response) {
  try {
    const { githubUrl } = req.body;

    if (!githubUrl) {
      return res.status(400).json({
        error: "GitHub repository URL is required.",
      });
    }

    const regex = /github\.com\/([^/]+)\/([^/]+)/;
    const match = githubUrl.match(regex);

    if (!match) {
      return res.status(400).json({
        error: "Invalid URL. Please enter a valid GitHub repository link.",
      });
    }

    const authenticatedUserId = req.user?.id;
    if (!authenticatedUserId) {
      return res.status(401).json({ error: "Unauthorized: Missing user session." });
    }

    const owner = match[1];
    const cleanRepoName = match[2].replace(/\.git$/, "");
    const fullRepoName = `${owner}/${cleanRepoName}`;

    let repo = await prisma.repository.findUnique({
      where: {
        githubUrl,
      },
    });

    if (repo) {
      // Ensure this user has an active conversation / access link to this repository
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          repositoryId: repo.id,
          userId: authenticatedUserId,
        },
      });

      if (!existingConversation) {
        await prisma.conversation.create({
          data: {
            repositoryId: repo.id,
            userId: authenticatedUserId,
            title: "New Chat",
          },
        });
      }

      // If repository is already indexed and READY, return immediately (instant access)
      if (repo.status === "READY" && !req.body.force) {
        return res.status(200).json({
          message: "Repository is already indexed and ready in your workspace.",
          repository: repo,
        });
      }

      // If repository is currently being ingested by another process
      if (
        (repo.status === "PENDING" || repo.status === "CLONING" || repo.status === "PROCESSING") &&
        !req.body.force
      ) {
        return res.status(200).json({
          message: "Repository ingestion is currently in progress.",
          repository: repo,
        });
      }

      // If status is FAILED or forced re-indexing was explicitly requested:
      repo = await prisma.repository.update({
        where: { id: repo.id },
        data: {
          status: "PENDING",
        },
      });

      const job = await repoIngestionQueue.add(`ingest-${repo.id}`, {
        repositoryId: repo.id,
        githubUrl: repo.githubUrl,
      });

      return res.status(201).json({
        message: "Repository submission tracking initiated. Ingestion queued.",
        repository: repo,
        jobId: job.id,
      });
    }

    // New repository creation
    repo = await prisma.repository.create({
      data: {
        githubUrl,
        name: fullRepoName,
        status: "PENDING",
        userId: authenticatedUserId,
      },
    });

    // Provision default user conversation
    await prisma.conversation.create({
      data: {
        repositoryId: repo.id,
        userId: authenticatedUserId,
        title: "New Chat",
      },
    });

    const job = await repoIngestionQueue.add(`ingest-${repo.id}`, {
      repositoryId: repo.id,
      githubUrl: repo.githubUrl,
    });

    return res.status(201).json({
      message: "Repository submission tracking initiated. Ingestion queued.",
      repository: repo,
      jobId: job.id,
    });
  } catch (error) {
    console.error("Ingestion endpoint error:", error);
    return res.status(500).json({
      error: "An internal server error occurred while queuing ingestion.",
    });
  }
}

export async function getRepository(req: AuthRequest, res: Response) {
  try {
    const authenticatedUserId = req.user?.id;
    if (!authenticatedUserId) {
      return res.status(401).json({ error: "Unauthorized: Missing user session." });
    }

    // A user sees any repository they added OR any repository they have an active conversation / study session with
    const repos = await prisma.repository.findMany({
      where: {
        OR: [
          { userId: authenticatedUserId },
          { conversations: { some: { userId: authenticatedUserId } } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(repos);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch repositories" });
  }
}

export async function getAllRepository(req: AuthRequest, res: Response) {
  try {
    const authenticatedUserId = req.user?.id;
    if (!authenticatedUserId) {
      return res.status(401).json({ error: "Unauthorized: Missing user session." });
    }

    const repos = await prisma.repository.findMany({
      where: {
        OR: [
          { userId: authenticatedUserId },
          { conversations: { some: { userId: authenticatedUserId } } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json(repos);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch repositories" });
  }
}
