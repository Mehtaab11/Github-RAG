import { Router } from "express";
import { getChats, handleChatMessage } from "../controllers/chatController";
const router = Router();

router.post("/message", handleChatMessage);
router.post("/conversation/:repositoryId", getChats);

export default router;
