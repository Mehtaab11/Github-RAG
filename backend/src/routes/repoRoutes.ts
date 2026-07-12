import { Router } from "express";
import { ingestRepository , getRepository } from "../controllers/repoController";
const router = Router();

router.post("/ingest", ingestRepository);
router.get("/" , getRepository )

export default router;
