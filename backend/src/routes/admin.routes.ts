import { Router } from "express";
import {
  adminListDisputes,
  adminListSecurityData,
  adminListUsers,
  adminUpdateDispute,
  adminUpdatePolicy,
  adminUpdateReport,
  adminUpdateSecurityEvent,
  adminUpdateUserStatus,
  adminVerifySeller,
  getAdminOverview,
} from "../controllers/admin.controller";
import { authenticate, requireRole } from "../middleware/authenticate";

const router = Router();

router.use(authenticate, requireRole("admin"));

router.get("/overview", getAdminOverview);
router.get("/users", adminListUsers);
router.patch("/users/:id/status", adminUpdateUserStatus);
router.patch("/sellers/:userId/verify", adminVerifySeller);
router.get("/security", adminListSecurityData);
router.patch("/security/:id", adminUpdateSecurityEvent);
router.patch("/reports/:id", adminUpdateReport);
router.get("/disputes", adminListDisputes);
router.patch("/disputes/:id", adminUpdateDispute);
router.put("/policies/:key", adminUpdatePolicy);

export default router;
