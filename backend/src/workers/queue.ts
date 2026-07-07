import { Queue } from "bullmq";

import { redisConnection } from "../config/redis";

export const REPO_QUEUE_NAME = "repository-ingestion";

export const repoIngestionQueue = new Queue(REPO_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000, // Wait 5s, then 10s, etc.
    },

    removeOnComplete: true,
    removeOnFail: false,
  },
});

console.log(`🤖 BullMQ: Queue "${REPO_QUEUE_NAME}" initialized.`);
