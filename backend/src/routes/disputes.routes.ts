import { Router } from "express";
import {
  addDisputeResponse,
  createDispute,
  getDisputeDetails,
  listMyDisputes,
} from "../controllers/disputes.controller";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.use(authenticate);

router.get("/", listMyDisputes);
router.post("/", createDispute);
router.get("/:id", getDisputeDetails);
router.post("/:id/responses", addDisputeResponse);

export default router;
