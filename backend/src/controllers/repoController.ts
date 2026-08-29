import { Response } from "express";
import { prisma } from "../config/db";
import { AuthRequest } from "../middleware/auth";
import { repoIngestionQueue } from "../workers/queue";
import { qdrantClient, COLLECTION_NAME } from "../config/qdrant";

const RESERVED_GITHUB_PATHS = new Set([
  "settings",
  "applications",
  "features",
  "pricing",
  "marketplace",
  "explore",
  "trending",
  "topics",
  "collections",
  "events",
  "sponsor",
  "sponsors",
  "organizations",
  "orgs",
  "notifications",
  "login",
  "join",
  "logout",
  "search",
  "security",
  "site",
  "team",
  "about",
  "mobile",
  "customer-stories",
  "enterprise",
  "readme",
  "discussions",
  "new",
]);

export function parseAndValidateGithubUrl(urlStr: string): {
  isValid: boolean;
  owner?: string;
  repo?: string;
  canonicalUrl?: string;
  error?: string;
} {
  try {
    const trimmed = urlStr.trim();
    const formattedUrl = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    const parsed = new URL(formattedUrl);

    if (parsed.hostname !== "github.com" && parsed.hostname !== "www.github.com") {
      return { isValid: false, error: "URL must be a valid github.com link." };
    }

    const pathSegments = parsed.pathname.split("/").filter(Boolean);
    if (pathSegments.length < 2) {
      return {
        isValid: false,
        error: "Please enter a complete GitHub repository URL (e.g., https://github.com/owner/repo).",
      };
    }

    const owner = pathSegments[0];
    const repo = pathSegments[1].replace(/\.git$/, "");

    if (RESERVED_GITHUB_PATHS.has(owner.toLowerCase())) {
      return {
        isValid: false,
        error: `Please enter a valid GitHub repository URL`,
      };
    }

    const validNameRegex = /^[A-Za-z0-9_.-]+$/;
    if (!validNameRegex.test(owner) || !validNameRegex.test(repo)) {
      return { isValid: false, error: "Invalid repository URL format." };
    }

    const canonicalUrl = `https://github.com/${owner}/${repo}`;
    return { isValid: true, owner, repo, canonicalUrl };
  } catch {
    return { isValid: false, error: "Invalid URL structure." };
  }
}

export async function ingestRepository(req: AuthRequest, res: Response) {
  try {
    const { githubUrl } = req.body;

    if (!githubUrl) {
      return res.status(400).json({
        error: "GitHub repository URL is required.",
      });
    }

    const validation = parseAndValidateGithubUrl(githubUrl);
    if (!validation.isValid || !validation.canonicalUrl || !validation.owner || !validation.repo) {
      return res.status(400).json({
        error: validation.error || "Invalid GitHub repository link.",
      });
    }

    const { owner, repo: cleanRepoName, canonicalUrl } = validation;
    const fullRepoName = `${owner}/${cleanRepoName}`;

    const authenticatedUserId = req.user?.id;
    if (!authenticatedUserId) {
      return res.status(401).json({ error: "Unauthorized: Missing user session." });
    }

    // Pre-flight check to verify repository actually exists on GitHub
    try {
      const checkRes = await fetch(canonicalUrl, {
        method: "HEAD",
        headers: { "User-Agent": "GitGPT-RAG-Checker" },
      });
      if (checkRes.status === 404) {
        return res.status(404).json({
          error: `GitHub repository '${fullRepoName}' does not exist or is private.`,
        });
      }
      if (!checkRes.ok && checkRes.status !== 301 && checkRes.status !== 302) {
        return res.status(400).json({
          error: `Unable to reach GitHub repository '${fullRepoName}' (HTTP ${checkRes.status}).`,
        });
      }
    } catch (netErr) {
      console.warn("Pre-flight check network notice:", netErr);
    }

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

      const job = await repoIngestionQueue.add(
        "ingest-repo",
        {
          repositoryId: repo.id,
          githubUrl: repo.githubUrl,
        },
        {
          jobId: `job-${repo.id}-${Date.now()}`,
        }
      );

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

    const job = await repoIngestionQueue.add(
      "ingest-repo",
      {
        repositoryId: repo.id,
        githubUrl: repo.githubUrl,
      },
      {
        jobId: `job-${repo.id}-${Date.now()}`,
      }
    );

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

export async function deleteRepository(req: AuthRequest, res: Response) {
  try {
    const authenticatedUserId = req.user?.id;
    if (!authenticatedUserId) {
      return res.status(401).json({ error: "Unauthorized: Missing user session." });
    }

    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;

    const repo = await prisma.repository.findUnique({
      where: { id },
    });

    if (!repo) {
      return res.status(404).json({ error: "Repository not found." });
    }

    if (repo.userId && repo.userId !== authenticatedUserId) {
      const userConvo = await prisma.conversation.findFirst({
        where: { repositoryId: id, userId: authenticatedUserId },
      });
      if (!userConvo) {
        return res.status(403).json({ error: "Forbidden: You do not own this repository." });
      }
    }

    // 1. Purge points from Qdrant vector database
    try {
      await qdrantClient.delete(COLLECTION_NAME, {
        filter: {
          must: [
            {
              key: "repositoryId",
              match: { value: id },
            },
          ],
        },
      });
    } catch (qdrantErr) {
      console.warn(`Qdrant deletion warning for repo ${id}:`, qdrantErr);
    }

    // 2. Delete database record (cascades to conversations and messages)
    await prisma.repository.delete({
      where: { id },
    });

    return res.status(200).json({
      message: "Repository and associated vector data deleted successfully.",
      repositoryId: id,
    });
  } catch (error) {
    console.error("Failed to delete repository:", error);
    return res.status(500).json({ error: "Internal server error deleting repository." });
  }
}

