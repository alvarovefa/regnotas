import { Request, Response } from 'express';
import { pool } from '../db';
import path from 'path';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export const uploadSubmission = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const file = req.file;

    if (!file) return res.status(400).json({ message: 'No se subió ningún archivo' });

    const { tipo_entrega } = req.body;
    const tipo = tipo_entrega === 'evaluacion' ? 'evaluacion' : 'tarea';

    const extension = path.extname(file.originalname);
    const relativePath = path.join('uploads', file.filename);

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO entregas (usuario_id, nombre_original, nombre_almacenado, ruta_archivo, tamano_bytes, extension, tipo_entrega) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user.id, file.originalname, file.filename, relativePath, file.size, extension, tipo]
    );

    return res.json({ message: 'Archivo subido correctamente' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const getMySubmissions = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, nombre_original, tamano_bytes, extension, fecha_hora_subida, tipo_entrega FROM entregas WHERE usuario_id = ? ORDER BY fecha_hora_subida DESC',
      [user.id]
    );

    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const getMyGrades = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM calificaciones WHERE usuario_id = ?',
      [user.id]
    );

    if (rows.length === 0) {
      return res.json(null);
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};
