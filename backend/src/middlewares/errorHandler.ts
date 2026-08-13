import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger';
import { ENV } from '../config/env';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`AppError ${err.statusCode}: ${err.message}`, err);
    } else {
      logger.warn(`AppError ${err.statusCode}: ${err.message}`);
    }

    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  // Errores no controlados
  logger.error('Unhandled Exception:', err);

  const responseMessage = ENV.NODE_ENV === 'production'
    ? 'Error interno del servidor'
    : err.message || 'Error interno del servidor';

  res.status(500).json({
    status: 'error',
    message: responseMessage,
  });
}
