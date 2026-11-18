import argon2 from "argon2";
import crypto from "crypto";
import { Request, Response } from "express";
import { db } from "../config/database";
import { LoginInput, RegisterInput } from "../schemas/auth.schema";
import { AuthenticatedRequest, AuthUser, User } from "../types/auth";
import { clearAuthCookie, generateToken, setAuthCookie } from "../utils/token";

// POST /api/auth/register
export async function register(
  req: Request<unknown, unknown, RegisterInput>,
  res: Response
): Promise<void> {
  try {
    const { fullName, email, password, role } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    // Check if an account already exists with this email
    const existingUser = db
      .prepare<[string], { id: string }>(
        "SELECT id FROM users WHERE email = ?"
      )
      .get(normalizedEmail);

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "An account with this email address already exists.",
      });
      return;
    }

    // Hash password securely with argon2
    const passwordHash = await argon2.hash(password);
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // Insert user into SQLite database
    db.prepare<[string, string, string, string, string, string]>(
      `INSERT INTO users (id, fullName, email, passwordHash, role, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, fullName.trim(), normalizedEmail, passwordHash, role, createdAt);

    const authUser: AuthUser = {
      id,
      fullName: fullName.trim(),
      email: normalizedEmail,
      role,
      createdAt,
    };

    // Generate JWT token and set HTTP-only cookie
    const token = generateToken({
      userId: id,
      email: authUser.email,
      role: authUser.role,
    });
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      message: "Account created successfully!",
      user: authUser,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to complete registration. Please try again later.",
    });
  }
}

// POST /api/auth/login
export async function login(
  req: Request<unknown, unknown, LoginInput>,
  res: Response
): Promise<void> {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    // Query user by email
    const user = db
      .prepare<[string], User>(
        "SELECT id, fullName, email, passwordHash, role, createdAt FROM users WHERE email = ?"
      )
      .get(normalizedEmail);

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    // Verify password hash with argon2
    const isValidPassword = await argon2.verify(user.passwordHash, password);
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    const authUser: AuthUser = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };

    // Generate JWT token and set HTTP-only cookie
    const token = generateToken({
      userId: user.id,
      email: authUser.email,
      role: authUser.role,
    });
    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      message: "Signed in successfully!",
      user: authUser,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to log in. Please try again later.",
    });
  }
}

// GET /api/auth/me
export function getMe(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: "User authenticated",
    user: req.user,
  });
}

// POST /api/auth/logout
export function logout(_req: Request, res: Response): void {
  clearAuthCookie(res);
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
}
