import { Router } from "express";
import {
  ingestRepository,
  getAllRepository,
  getRepository,
} from "../controllers/repoController";
import { requireAuth } from "../middleware/auth";
const router = Router();

router.post("/ingest", requireAuth, ingestRepository);
router.get("/", requireAuth, getRepository);
router.get("/all", getAllRepository);

export default router;
