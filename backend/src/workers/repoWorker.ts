import { Worker, Job } from "bullmq";
import { redisConnection } from "../config/redis";
import { REPO_QUEUE_NAME } from "./queue";

interface ingestionJobData {
  repositoryId: string;
  githubUrl: string;
}

export function startRepoWorker() {
  const worker = new Worker<ingestionJobData>(
    REPO_QUEUE_NAME,

    async (job: Job<ingestionJobData>) => {
      const { repositoryId, githubUrl } = job.data;

      await job.updateProgress(10);

      // TODO: Clone repo
      // TODO: Parse & Split
      // TODO: Generate Embeddings

      await job.updateProgress(100);
      console.log(`✅ Job ${job.id} complete! Repository ingested.`);

      return { success: true, repositoryId };
    },
    { connection: redisConnection },
  );

  worker.on("completed", (job) => {
    console.log(`🎉 Job ${job.id} has completed successfully.`);
  });

  worker.on("failed", (job, err) => {
    console.error(`❌ Job ${job?.id} failed with error: ${err.message}`);
  });

  console.log("👷 BullMQ: Background worker started and listening for jobs...");
}
