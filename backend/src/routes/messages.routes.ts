import { Router } from "express";
import {
  attachNexconnMessageId,
  broadcastMessageFallback,
  createConversation,
  deleteMessage,
  getConversations,
  getMessages,
  markConversationRead,
  sendMessage,
  translateMessage,
} from "../controllers/messages.controller";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.use(authenticate);

router.get("/conversations", getConversations);
router.post("/conversations", createConversation);

router.patch("/:id/read", markConversationRead);
router.patch("/:messageId/nexconn", attachNexconnMessageId);
router.post("/:messageId/fallback", broadcastMessageFallback);
router.post("/:messageId/translate", translateMessage);
router.delete("/:messageId", deleteMessage);

router.get("/:id", getMessages);
router.post("/:id", sendMessage);

export default router;
