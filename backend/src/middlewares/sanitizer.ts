import { Request, Response, NextFunction } from 'express';

/**
 * Sanitiza valores de cadena eliminando caracteres potencialmente peligrosos de XSS o inyección de código.
 */
export function sanitizeString(value: string): string {
  if (typeof value !== 'string') return value;
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

export function sanitizeObject(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    if (typeof obj === 'string') return sanitizeString(obj);
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    sanitized[key] = sanitizeObject(obj[key]);
  }
  return sanitized;
}

export function inputSanitizer(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // En Express 5, req.query y req.params son getters de solo lectura en el prototipo
    if (req.query && typeof req.query === 'object') {
      for (const key of Object.keys(req.query)) {
        (req.query as any)[key] = sanitizeObject((req.query as any)[key]);
      }
    }

    if (req.params && typeof req.params === 'object') {
      for (const key of Object.keys(req.params)) {
        (req.params as any)[key] = sanitizeObject((req.params as any)[key]);
      }
    }
  } catch (err) {
    // Ignorar mutaciones en objetos congelados
  }
  next();
}
