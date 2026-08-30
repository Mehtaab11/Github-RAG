import { Request, Response } from "express";
import { prisma } from "../config/db";
import { qdrantClient, COLLECTION_NAME } from "../config/qdrant";
import { JWT_SECRET } from "../config/jwt";

export const getHealthStatus = async (req: Request, res: Response) => {
  const startTime = Date.now();
  let dbStatus: { status: "ok" | "error"; message?: string; latencyMs?: number } = {
    status: "ok",
  };
  let qdrantStatus: { status: "ok" | "error"; message?: string; latencyMs?: number } = {
    status: "ok",
  };

  // 1. Check Database (Prisma) connection
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus.latencyMs = Date.now() - dbStart;
  } catch (err: any) {
    dbStatus = {
      status: "error",
      message: err?.message || "Database connection failed",
    };
  }

  // 2. Check Qdrant Vector DB connection
  const qdrantStart = Date.now();
  try {
    await qdrantClient.getCollections();
    qdrantStatus.latencyMs = Date.now() - qdrantStart;
  } catch (err: any) {
    qdrantStatus = {
      status: "error",
      message: err?.message || "Qdrant connection failed",
    };
  }

  // 3. Check JWT configuration
  const jwtStatus = JWT_SECRET ? "ok" : "missing_secret";

  const overallStatus =
    dbStatus.status === "ok" && qdrantStatus.status === "ok" && jwtStatus === "ok"
      ? "healthy"
      : dbStatus.status === "error" && qdrantStatus.status === "error"
      ? "unhealthy"
      : "degraded";

  const statusCode = overallStatus === "unhealthy" ? 503 : 200;

  return res.status(statusCode).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || "development",
    responseTimeMs: Date.now() - startTime,
    services: {
      database: dbStatus,
      qdrant: qdrantStatus,
      jwt: { status: jwtStatus },
    },
  });
};

export const getBasicHealth = (req: Request, res: Response) => {
  return res.status(200).json({
    status: "healthy",
    message: "Server is running",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
};
