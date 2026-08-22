import { Router } from "express";
import {
  ingestRepository,
  getAllRepository,
  getRepository,
  deleteRepository,
} from "../controllers/repoController";
import { requireAuth } from "../middleware/auth";
const router = Router();

router.post("/ingest", requireAuth, ingestRepository);
router.get("/", requireAuth, getRepository);
router.get("/all", requireAuth, getAllRepository);
router.delete("/:id", requireAuth, deleteRepository);

export default router;
