import { ConnectionOptions } from "bullmq";
import dotenv from "dotenv";

dotenv.config();

// Supports both:
// - Upstash (production): REDIS_URL=rediss://:password@host:port
// - Local Docker dev: REDIS_HOST + REDIS_PORT
export const redisConnection: ConnectionOptions = process.env.REDIS_URL
  ? {
      url: process.env.REDIS_URL,
      tls: process.env.REDIS_URL.startsWith("rediss://") ? {} : undefined,
    }
  : {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379", 10),
    };
