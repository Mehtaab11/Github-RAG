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

      try {
        // 1. Move to CLONING
        await prisma.repository.update({
          where: { id: repositoryId },
          data: { status: "CLONING" },
        });
        //  Broadcast update to everyone in this repo's socket room
        getIO()
          .to(repositoryId)
          .emit("ingestion-progress", { status: "CLONING", progress: 15 });
        await job.updateProgress(15);

        // 2. Clone Repository
        localWorkspacePath = await cloneRepository(githubUrl);

        // 3. Move to PROCESSING
        await prisma.repository.update({
          where: { id: repositoryId },
          data: { status: "PROCESSING" },
        });
        //  Broadcast update
        getIO()
          .to(repositoryId)
          .emit("ingestion-progress", { status: "PROCESSING", progress: 50 });
        await job.updateProgress(50);

        // 4. Scan, Filter, and Chunk
        const chunks = await scanAndChunkRepository(localWorkspacePath);

        if (chunks.length === 0) {
          throw new Error(
            "No readable source code files discovered inside target workspace repository.",
          );
        }

        // 5. Build Vectors and store in Qdrant
        await generateAndStoreEmbeddings(repositoryId, chunks);

        // 6. Finalize Postgres State to READY
        await prisma.repository.update({
          where: { id: repositoryId },
          data: { status: "READY" },
        });
        //  Broadcast ultimate completion
        getIO()
          .to(repositoryId)
          .emit("ingestion-progress", { status: "READY", progress: 100 });
        await job.updateProgress(100);
      } catch (error: any) {
        console.error(`❌ Ingestion Failure inside Job ${job.id}:`, error);
        await prisma.repository.update({
          where: { id: repositoryId },
          data: { status: "FAILED" },
        });

        //  Broadcast catastrophic failure state
        getIO().to(repositoryId).emit("ingestion-progress", {
          status: "FAILED",
          error: error.message,
        });
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
    { connection: redisConnection },
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
