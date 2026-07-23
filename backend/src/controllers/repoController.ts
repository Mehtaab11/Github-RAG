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

    if (repo && repo.userId && repo.userId !== authenticatedUserId) {
      return res.status(409).json({
        error: "This repository is already associated with another account.",
      });
    }

    if (repo && repo.status === "READY" && !req.body.force) {
      return res.status(200).json({
        message: "This repository is already present and being analyzed",
        repository: repo,
      });
    }

    if (!repo) {
      repo = await prisma.repository.create({
        data: {
          githubUrl,
          name: fullRepoName,
          status: "PENDING",
          userId: authenticatedUserId,
        },
      });
    } else {
      repo = await prisma.repository.update({
        where: { id: repo.id },
        data: {
          status: "PENDING",
          userId: authenticatedUserId,
        },
      });
    }

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

    let repos = await prisma.repository.findMany({
      where: {
        userId: authenticatedUserId,
      },
      orderBy: { createdAt: "desc" },
    });

    if (repos.length === 0) {
      const legacyRepos = await prisma.repository.findMany({
        where: {
          userId: null,
        },
      });

      if (legacyRepos.length > 0) {
        await prisma.repository.updateMany({
          where: {
            id: {
              in: legacyRepos.map((repo) => repo.id),
            },
          },
          data: {
            userId: authenticatedUserId,
          },
        });

        repos = await prisma.repository.findMany({
          where: {
            userId: authenticatedUserId,
          },
          orderBy: { createdAt: "desc" },
        });
      }
    }

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
        userId: authenticatedUserId,
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json(repos);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch repositories" });
  }
}
