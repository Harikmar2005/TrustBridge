import { Router } from "express";
import {
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
router.post("/:messageId/translate", translateMessage);
router.delete("/:messageId", deleteMessage);

router.get("/:id", getMessages);
router.post("/:id", sendMessage);

export default router;
