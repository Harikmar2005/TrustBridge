import { ErrorRequestHandler } from 'express';
import { env } from '../config/env';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  if (env.NODE_ENV !== 'test') {
    console.error(`[Error] ${statusCode} - ${message}`);
    if (env.NODE_ENV === 'development' && err.stack) {
      console.error(err.stack);
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
};

