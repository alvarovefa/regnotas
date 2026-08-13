import { Request, Response, NextFunction } from 'express';
import { submissionService } from '../services/submissionService';
import { AuthenticatedRequest } from '../types';
import { pool } from '../db';
import { RowDataPacket } from 'mysql2';
import path from 'path';
import fs from 'fs';
import { ENV } from '../config/env';

export const uploadSubmission = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const file = req.file!;
    const { tipo_entrega, grupo_id, asignatura_id } = req.body;

    await submissionService.processUpload(user.id, file, tipo_entrega, grupo_id, asignatura_id);
    res.json({ message: 'Archivo subido correctamente' });
  } catch (error) {
    next(error);
  }
};

export const getMySubmissions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const result = await submissionService.getUserSubmissions(user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getMyGrades = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM calificaciones WHERE usuario_id = ?',
      [user.id]
    );

    if (rows.length === 0) {
      res.json(null);
      return;
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
};

export const downloadSubmission = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const { absolutePath, originalName } = await submissionService.getFileForDownload(
      Number(id),
      user.id,
      user.rol
    );

    res.download(absolutePath, originalName);
  } catch (error) {
    next(error);
  }
};

export const deleteSubmission = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, usuario_id, nombre_almacenado FROM entregas WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json({ message: 'La entrega no existe o ya fue eliminada' });
      return;
    }

    const sub = rows[0];
    const isOwner = sub.usuario_id === user.id;
    const isStaff = ['profesor', 'directivo', 'administrador'].includes(user.rol);

    if (!isOwner && !isStaff) {
      res.status(403).json({ message: 'No tienes permiso para eliminar esta entrega' });
      return;
    }

    if (sub.nombre_almacenado) {
      const safeFilename = path.basename(sub.nombre_almacenado);
      const filePath = path.join(ENV.STORAGE_UPLOADS_DIR, safeFilename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (fsErr) {
          console.error(`Error al eliminar archivo físico ${filePath}:`, fsErr);
        }
      }
    }

    await pool.query('DELETE FROM entregas WHERE id = ?', [id]);
    res.json({ message: 'Entrega eliminada exitosamente' });
  } catch (error) {
    next(error);
  }
};
