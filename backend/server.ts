import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { config, validateEnvironment } from './src/config/env';
import { applySecurityHeaders } from './src/config/security';
import { initializeDatabase, seedInitialDataIfEmpty } from './src/database';
import { validateSecurityConfiguration } from './src/services/authService';
import { getNexconnConfigStatus } from './src/services/nexconnService';
import { apiRouter } from './src/routes';
import { errorHandler } from './src/middleware/errorHandler';
import { logger } from './src/utils/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate environment and cryptographic security parameters
validateEnvironment();
validateSecurityConfiguration();

// Initialize DB schema & seed initial demo data
initializeDatabase();
seedInitialDataIfEmpty();

const app = express();
const PORT = config.port;

// Enterprise Security Headers & CORS
app.use(applySecurityHeaders);

// Body Parser
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'TrustBridge Backend', timestamp: new Date().toISOString() });
});

// Mount All Backend API Routes
app.use('/api', apiRouter);

// Centralized Error Handling
app.use(errorHandler);

// Frontend Vite Integration & Static File Serving
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const frontendDir = path.resolve(__dirname, '../frontend');
  const frontendDist = path.resolve(frontendDir, 'dist');
  const fallbackDist = path.resolve(__dirname, '../dist');

  // Check if frontend directory exists
  const hasFrontendSource = fs.existsSync(frontendDir);

  if (!isProduction && hasFrontendSource && process.env.STANDALONE_API !== 'true') {
    try {
      const vite = await createViteServer({
        root: frontendDir,
        configFile: path.resolve(frontendDir, 'vite.config.ts'),
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      logger.info('Vite development middleware mounted for frontend/');
    } catch (viteErr) {
      logger.warn('Could not mount Vite middleware directly:', viteErr);
    }
  } else if (isProduction) {
    const distPath = fs.existsSync(frontendDist) ? frontendDist : fallbackDist;
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
      logger.info(`Static frontend served from: ${distPath}`);
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on http://0.0.0.0:${PORT}`);
    logger.info(`SQLite database persisted at: ${config.databasePath}`);

    // Startup Nexconn configuration validation
    const ncStatus = getNexconnConfigStatus();
    if (ncStatus.isConfigured) {
      logger.info(`Nexconn Cloud configuration: CONFIGURED (Area: SG, Endpoint: ${ncStatus.apiUrl})`);
    } else {
      logger.info(`Nexconn Cloud configuration: CREDENTIALS_REQUIRED (NEXCONN_APP_KEY & NEXCONN_APP_SECRET missing in environment)`);
    }
  });
}

startServer();

export default app;
