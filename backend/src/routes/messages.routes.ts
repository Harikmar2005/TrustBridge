import { Router } from "express";
import {
  createConversation,
  getConversations,
  getMessages,
  sendMessage,
} from "../controllers/messages.controller";
import { authenticate } from "../middleware/authenticate";

const router = Router();

// Protect all messaging routes with authentication
router.use(authenticate);

// Conversations endpoints
router.get("/conversations", getConversations);
router.post("/conversations", createConversation);

// Message history & send endpoints
router.get("/:id", getMessages);
router.post("/:id", sendMessage);

export default router;

