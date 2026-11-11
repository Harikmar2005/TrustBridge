export const logger = {
  info: (msg: string, ...meta: any[]) => console.log(`[TrustBridge] ${msg}`, ...meta),
  warn: (msg: string, ...meta: any[]) => console.warn(`[TrustBridge WARN] ${msg}`, ...meta),
  error: (msg: string, ...meta: any[]) => console.error(`[TrustBridge ERROR] ${msg}`, ...meta),
  debug: (msg: string, ...meta: any[]) => {
    if (process.env.DEBUG || process.env.NODE_ENV !== 'production') {
      console.log(`[TrustBridge DEBUG] ${msg}`, ...meta);
    }
  },
};
