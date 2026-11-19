import { Router } from "express";
import { getChatStatus, getChatToken } from "../controllers/chat.controller";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.use(authenticate);

router.get("/token", getChatToken);
router.get("/status", getChatStatus);

export default router;
