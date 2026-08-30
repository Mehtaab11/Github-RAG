import express from "express";
import { getHealthStatus, getBasicHealth } from "../controllers/healthController";

const router = express.Router();

// GET /api/health or GET /health -> Detailed status by default or basic
router.get("/", getHealthStatus);
router.get("/ping", getBasicHealth);
router.get("/details", getHealthStatus);

export default router;
