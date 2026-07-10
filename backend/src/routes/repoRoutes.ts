import { Router } from "express";
import { ingestRepository } from "../controllers/repoController";
const router = Router();

router.post("/ingest", ingestRepository);

export default router;
