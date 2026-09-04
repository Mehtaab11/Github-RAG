import { Worker, Job } from "bullmq";
import { redisConnection } from "../config/redis";
import { REPO_QUEUE_NAME } from "./queue";
import { prisma } from "../config/db";
import { getIO } from "../config/socket";
import {
  cloneRepository,
  scanAndChunkRepository,
  generateAndStoreEmbeddings,
} from "../services/codeProcessor";
import fs from "fs/promises";

interface IngestionJobData {
  repositoryId: string;
  githubUrl: string;
}

export function startRepoWorker() {
  const worker = new Worker<IngestionJobData>(
    REPO_QUEUE_NAME,
    async (job: Job<IngestionJobData>) => {
      const { repositoryId, githubUrl } = job.data;
      let localWorkspacePath = "";

      console.log(`⏳ Worker picked up job ${job.id} for repo: ${githubUrl}`);

      const existingRepo = await prisma.repository.findUnique({
        where: { id: repositoryId },
      });

      if (!existingRepo) {
        console.warn(
          `⚠️ Repository record ${repositoryId} no longer exists in database. Aborting orphaned job ${job.id}.`,
        );
        return { success: false, reason: "Repository deleted" };
      }

      const emitProgress = (
        status: string,
        progress: number,
        error?: string,
        vectorCount?: number,
      ) => {
        const payload = { repositoryId, status, progress, error, vectorCount, totalVectors: vectorCount };
        try {
          const ioInstance = getIO();
          if (ioInstance) {
            ioInstance.emit("ingestion-progress", payload);
            ioInstance.to(repositoryId).emit("ingestion-progress", payload);
          }
        } catch (err) {
          // Socket optional
        }
      };

      try {
        // 1. Move to CLONING
        await prisma.repository.update({
          where: { id: repositoryId },
          data: { status: "CLONING" },
        });
        emitProgress("CLONING", 15);
        await job.updateProgress(15);

        // 2. Clone Repository
        localWorkspacePath = await cloneRepository(githubUrl);

        // 3. Move to PROCESSING
        await prisma.repository.update({
          where: { id: repositoryId },
          data: { status: "PROCESSING" },
        });
        emitProgress("PROCESSING", 50);
        await job.updateProgress(50);

        // 4. Scan, Filter, and Chunk
        const chunks = await scanAndChunkRepository(localWorkspacePath);

        if (chunks.length === 0) {
          throw new Error(
            "No readable source code files discovered inside target workspace repository.",
          );
        }

        // 5. Build Vectors and store in Qdrant
        await generateAndStoreEmbeddings(repositoryId, chunks, job);

        // 6. Finalize Postgres State to READY with vector count
        await prisma.repository.update({
          where: { id: repositoryId },
          data: {
            status: "READY",
            vectorCount: chunks.length,
          },
        });
        emitProgress("READY", 100, undefined, chunks.length);
        await job.updateProgress(100);
      } catch (error: any) {
        console.error(`❌ Ingestion Failure inside Job ${job.id}:`, error);
        try {
          await prisma.repository.update({
            where: { id: repositoryId },
            data: { status: "FAILED" },
          });

          emitProgress("FAILED", 0, error.message);
        } catch (dbErr) {
          // Ignore if repo record was deleted from database
        }
        throw error;
      } finally {
        if (localWorkspacePath) {
          try {
            await fs.rm(localWorkspacePath, { recursive: true, force: true });
          } catch (cleanupErr) {
            console.error(
              "⚠️ Failed to wipe temporary folder target directory:",
              cleanupErr,
            );
          }
        }
      }
      return { success: true, repositoryId };
    },
    {
      connection: redisConnection,
      lockDuration: 300000, // 5 minutes lock duration for long git clones & model loading
      stalledInterval: 60000,
      maxStalledCount: 3,
    },
  );

  worker.on("completed", (job) => {
    console.log(
      ` Ingestion Pipeline execution finished cleanly for Job ID: ${job.id}`,
    );
  });

  worker.on("failed", (job, err) => {
    console.error(
      ` Job execution completely aborted for Job ID: ${job?.id}. Reason: ${err.message}`,
    );
  });

  console.log(" Background worker engine fully online and operational.");
}
