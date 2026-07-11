import { Router } from "express";
import { handleChatMessage } from "../controllers/chatController";
const router = Router();

router.post("/message", handleChatMessage);

export default router;
