import { Router } from "express";
import {
  getMyTrustScore,
  getPublicUserTrustScore,
  recalculateMyTrustScore,
} from "../controllers/trust.controller";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.get("/user/:userId", getPublicUserTrustScore);
router.get("/me", authenticate, getMyTrustScore);
router.post("/recalculate", authenticate, recalculateMyTrustScore);

export default router;
