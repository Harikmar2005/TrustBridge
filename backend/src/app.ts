
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";

import authRoutes from "./routes/auth.routes";
import messagesRoutes from "./routes/messages.routes";

const app = express();

// Hide Express framework information
app.disable("x-powered-by");

// Security headers
app.use(helmet());

// CORS configuration
const allowedOrigins = new Set([
  env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:5173",
]);

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests without an Origin header,
      // such as local health checks.
      if (!origin || allowedOrigins.has(origin)) {
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
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Root endpoint
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    name: "TrustBridge API",
    message: "Welcome to TrustBridge Backend",
    status: "running",
  });
});

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    message: "TrustBridge Backend is running",
    service: "TrustBridge Auth & Core API",
    timestamp: new Date().toISOString(),
  });
});

// Authentication routes
app.use("/api/auth", authRoutes);

// Messaging routes
app.use("/api/messages", messagesRoutes);

// Handle unknown endpoints
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

// Global error handler must remain last
app.use(errorHandler);

export default app;
