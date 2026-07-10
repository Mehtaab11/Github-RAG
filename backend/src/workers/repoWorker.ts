import { Worker, Job } from "bullmq";
import { redisConnection } from "../config/redis";
import { REPO_QUEUE_NAME } from "./queue";
import { prisma } from "../config/db";
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

      console.log(job.data);
      console.log("repositoryId:", repositoryId);
      console.log("githubUrl:", githubUrl);

      let localWorkspacePath = "";

      console.log(`⏳ Worker picked up job ${job.id} for repo: ${githubUrl}`);

      try {
        // 1. Move Postgres tracking row status to CLONING
        await prisma.repository.update({
          where: { id: repositoryId },
          data: { status: "CLONING" },
        });
        await job.updateProgress(15);

        // 2. Clone Repository down into temp workspace
        localWorkspacePath = await cloneRepository(githubUrl);

        // 3. Move status tracking row to PROCESSING
        await prisma.repository.update({
          where: { id: repositoryId },
          data: { status: "PROCESSING" },
        });
        await job.updateProgress(40);

        // 4. Scan, Filter, and Chunk codebase contents
        const chunks = await scanAndChunkRepository(localWorkspacePath);
        await job.updateProgress(60);

        if (chunks.length === 0) {
          throw new Error(
            "No readable source code files discovered inside target workspace repository.",
          );
        }

        // 5. Query Gemini SDK and insert records into Qdrant
        await generateAndStoreEmbeddings(repositoryId, chunks);

        // 6. Finalize Postgres tracking state
        await prisma.repository.update({
          where: { id: repositoryId },
          data: { status: "READY" },
        });
        await job.updateProgress(100);
        console.log(
          `✅ Success: Ingestion complete for Repository ID: ${repositoryId}`,
        );
      } catch (error: any) {
        console.error(`❌ Ingestion Failure inside Job ${job.id}:`, error);

        // Mark tracking state failure flags safely
        await prisma.repository.update({
          where: { id: repositoryId },
          data: { status: "FAILED" },
        });

        throw error; // Retain standard worker exception behavior
      } finally {
        // Safe housekeeping cleanup of local temporary code storage spaces
        if (localWorkspacePath) {
          try {
            await fs.rm(localWorkspacePath, { recursive: true, force: true });
            console.log(
              `🧹 Cleaned up temporary folder: ${localWorkspacePath}`,
            );
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
    { connection: redisConnection },
  );

  worker.on("completed", (job) => {
    console.log(
      `🎉 Ingestion Pipeline execution finished cleanly for Job ID: ${job.id}`,
    );
  });

  worker.on("failed", (job, err) => {
    console.error(
      `💥 Job execution completely aborted for Job ID: ${job?.id}. Reason: ${err.message}`,
    );
  });

  console.log("👷 Background worker engine fully online and operational.");
}
