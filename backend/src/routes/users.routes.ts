import { Router } from "express";
import {
  getDashboardSummary,
  listSellers,
  reportAccount,
  requestAccountDeletion,
  updateProfile,
  upsertSellerProfile,
} from "../controllers/users.controller";
import { authenticate, requireRole } from "../middleware/authenticate";

const router = Router();

// Public seller discovery directory
router.get("/sellers", listSellers);

// Authenticated user endpoints
router.get("/dashboard", authenticate, getDashboardSummary);
router.patch("/profile", authenticate, updateProfile);
router.put(
  "/seller-profile",
  authenticate,
  requireRole("seller"),
  upsertSellerProfile
);
router.post("/report", authenticate, reportAccount);
router.post("/delete-request", authenticate, requestAccountDeletion);

export default router;
