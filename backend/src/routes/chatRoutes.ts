import { Router } from "express";
import { getChats, handleChatMessage } from "../controllers/chatController";
import { requireAuth } from "../middleware/auth";
const router = Router();

router.post("/message", requireAuth, handleChatMessage);
router.post("/conversation/:repositoryId", requireAuth, getChats);

export default router;
