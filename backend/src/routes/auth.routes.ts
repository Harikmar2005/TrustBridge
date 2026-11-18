import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  getMe,
  login,
  logout,
  register,
} from "../controllers/auth.controller";

import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";

import {
  loginSchema,
  registerSchema,
} from "../schemas/auth.schema";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
  },
});

// Registration
router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  register
);

// Login
router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  login
);

// Current authenticated user
router.get("/me", authenticate, getMe);

// Logout
router.post("/logout", logout);

export default router;
