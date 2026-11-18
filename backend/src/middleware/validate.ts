import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodTypeAny } from 'zod';
import { ApiFieldError } from '../types/auth';

export function validate(schema: ZodTypeAny) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync(req.body);
      req.body = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: ApiFieldError[] = error.errors.map((err) => ({
          field: err.path.join('.') || 'body',
          message: err.message,
        }));

        res.status(400).json({
          success: false,
          message: errors[0]?.message || 'Validation failed',
          errors,
        });
        return;
      }

      next(error);
    }
  };
}

