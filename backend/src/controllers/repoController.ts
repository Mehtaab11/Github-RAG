import { Request, Response } from "express";
import { prisma } from "../config/db";
import { repoIngestionQueue } from "../workers/queue";

export async function ingestRepository(req: Request, res: Response) {
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

    const owner = match[1];
    const cleanRepoName = match[2].replace(/\.git$/, "");
    const fullRepoName = `${owner}/${cleanRepoName}`;

    let repo = await prisma.repository.findUnique({
      where: {
        githubUrl,
      },
    });

    if (repo) {
      return res.status(200).json({
        message:
          "This repostiry is already present is already present and being analyzed",
        repository: repo,
      });
    }

    repo = await prisma.repository.create({
      data: {
        githubUrl,
        name: fullRepoName,
        status: "PENDING",
      },
    });

    const job = await repoIngestionQueue.add(`ingest-${repo.id}`, {
      repository: repo.id,
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
