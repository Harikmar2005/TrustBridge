import { Router } from "express";
import {
  getMySecurityOverview,
  markSecurityAlertRead,
} from "../controllers/security.controller";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.use(authenticate);

router.get("/overview", getMySecurityOverview);
router.patch("/alerts/:id/read", markSecurityAlertRead);

export default router;
