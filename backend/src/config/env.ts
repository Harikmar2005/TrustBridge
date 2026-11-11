import dotenv from 'dotenv';
import path from 'path';

// Load .env from root or current directory
dotenv.config();

export interface ServerConfig {
  port: number;
  nodeEnv: string;
  jwtSecret: string;
  geminiApiKey?: string;
  nexconnAppKey?: string;
  nexconnAppSecret?: string;
  nexconnApiUrl: string;
  databasePath: string;
  modelDir: string;
}

export function validateEnvironment(): void {
  const jwtSecret = process.env.JWT_SECRET || 'dev-secret-trustbridge-secure-key-2026-min-32-chars-long';
  if (!process.env.JWT_SECRET) {
    console.warn('[TrustBridge Config] Notice: JWT_SECRET not explicitly set in environment, using development fallback.');
  }

  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in length for secure HMAC-SHA256 operations.');
  }

  if (!process.env.NEXCONN_APP_KEY || !process.env.NEXCONN_APP_SECRET) {
    console.log('[TrustBridge Config] Nexconn Cloud credentials absent. Operating in offline/credential-required mode.');
  }

  if (!process.env.GEMINI_API_KEY) {
    console.log('[TrustBridge Config] GEMINI_API_KEY absent. Sentinel heuristic fallback engine enabled for risk scoring.');
  }
}

export const config: ServerConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-trustbridge-secure-key-2026-min-32-chars-long',
  geminiApiKey: process.env.GEMINI_API_KEY,
  nexconnAppKey: process.env.NEXCONN_APP_KEY,
  nexconnAppSecret: process.env.NEXCONN_APP_SECRET,
  nexconnApiUrl: (process.env.NEXCONN_API_URL || 'https://api-sg.ronghub.com').replace(/\/+$/, ''),
  databasePath: process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data', 'trustbridge.db'),
  modelDir: process.env.MODEL_DIR || path.resolve(process.cwd(), 'data', 'models'),
};
