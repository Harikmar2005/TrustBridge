/**
 * Root Server Entrypoint (Backward Compatibility & AI Studio Container)
 *
 * Delegates directly to the modular full-stack backend architecture in ./backend/server.ts.
 * Supports unified execution on port 3000 (Vite dev middleware + API routes).
 */
import app from './backend/server';

export default app;
