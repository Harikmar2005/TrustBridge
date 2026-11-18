import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import fs from "fs";
import helmet from "helmet";
import path from "path";

import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";

import adminRoutes from "./routes/admin.routes";
import authRoutes from "./routes/auth.routes";
import disputesRoutes from "./routes/disputes.routes";
import messagesRoutes from "./routes/messages.routes";
import notificationsRoutes from "./routes/notifications.routes";
import securityRoutes from "./routes/security.routes";
import trustRoutes from "./routes/trust.routes";
import usersRoutes from "./routes/users.routes";

const app = express();

// Trust reverse proxy headers (Cloud Run / AI Studio preview)
app.set("trust proxy", 1);

// Hide Express framework information
app.disable("x-powered-by");

// Security headers (iframe embedding permitted for AI Studio preview)
app.use(
  helmet({
    contentSecurityPolicy: false,
    xFrameOptions: false,
  })
);

// CORS allowlist
const allowedOrigins = new Set([
  env.FRONTEND_URL,
  "http://localhost:3000",
  "http://0.0.0.0:3000",
  "http://localhost:5173",
]);

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  if (origin.endsWith(".run.app") && origin.startsWith("https://")) return true;
  return false;
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Parse incoming requests
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// API info & health check
app.get("/api", (_req, res) => {
  res.status(200).json({
    success: true,
    name: "TrustBridge API",
    message: "Welcome to TrustBridge Backend",
    status: "running",
  });
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    message: "TrustBridge Backend is running",
    service: "TrustBridge Platform API",
    timestamp: new Date().toISOString(),
  });
});

// Domain routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/trust", trustRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/disputes", disputesRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/admin", adminRoutes);

// Handle unknown API endpoints
app.use("/api", (_req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

// Serve compiled frontend static assets
const frontendDistPath = path.resolve(__dirname, "../../frontend/dist");
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    res.status(200).json({
      success: true,
      name: "TrustBridge API",
      message: "Welcome to TrustBridge Backend",
      status: "running",
    });
  });

  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      message: "API endpoint not found",
    });
  });
}

// Global error handler must remain last
app.use(errorHandler);

export default app;
