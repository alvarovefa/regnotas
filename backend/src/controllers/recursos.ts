import { Request, Response } from 'express';
import { pool } from '../db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import path from 'path';
import fs from 'fs';
import { ENV } from '../config/env';

export const uploadRecurso = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    if (!user || (user.rol !== 'profesor' && user.rol !== 'directivo' && user.rol !== 'administrador')) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'No se subió ningún archivo' });
    }

    const { cursoId, asignaturaId, alumnoId } = req.body;

    if (!asignaturaId) {
      return res.status(400).json({ message: 'Debe especificar la asignatura' });
    }
    if (!cursoId && !alumnoId) {
      return res.status(400).json({ message: 'Debe especificar el curso o el alumno' });
    }

    const { originalname, filename, size } = file;
    const extension = path.extname(originalname);
    const ruta_archivo = path.join('uploads', filename);

    await pool.query(
      `INSERT INTO recursos_compartidos 
       (profesor_id, curso_id, asignatura_id, alumno_id, nombre_original, nombre_almacenado, ruta_archivo, tamano_bytes, extension) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user.id, cursoId || null, asignaturaId, alumnoId || null, originalname, filename, ruta_archivo, size, extension]
    );

    return res.status(201).json({ message: 'Recurso subido exitosamente' });
  } catch (error) {
    console.error('Error al subir recurso:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const getTeacherRecursos = async (req: Request, res: Response): Promise<any> => {
  try {
    const { cursoId, asignaturaId } = req.query;

    let query = `
      SELECT r.*, 
             a.nombre as asignatura_nombre,
             c.nombre as curso_nombre,
             u.nombre_completo as alumno_nombre
      FROM recursos_compartidos r
      JOIN asignaturas a ON r.asignatura_id = a.id
      LEFT JOIN cursos c ON r.curso_id = c.id
      LEFT JOIN usuarios u ON r.alumno_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (cursoId) {
      query += ` AND r.curso_id = ?`;
      params.push(cursoId);
    }
    if (asignaturaId) {
      query += ` AND r.asignatura_id = ?`;
      params.push(asignaturaId);
    }

    query += ` ORDER BY r.fecha_hora_subida DESC`;

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al obtener recursos' });
  }
};

export const getStudentRecursos = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: 'No autenticado' });

    // Obtain the user's curso_id from DB since it's not in the JWT payload
    const [userRows] = await pool.query<RowDataPacket[]>('SELECT curso_id FROM usuarios WHERE id = ?', [user.id]);
    const curso_id = userRows.length > 0 ? userRows[0].curso_id : null;

    // The student can see resources targeted to their specific alumno_id, 
    // or targeted to their curso_id ONLY if it's not targeted to a specific student
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT r.*, 
             a.nombre as asignatura_nombre,
             a.color as asignatura_color,
             p.nombre_completo as profesor_nombre
      FROM recursos_compartidos r
      JOIN asignaturas a ON r.asignatura_id = a.id
      JOIN usuarios p ON r.profesor_id = p.id
      WHERE r.alumno_id = ? OR (r.curso_id = ? AND r.alumno_id IS NULL)
      ORDER BY r.fecha_hora_subida DESC
    `, [user.id, curso_id]);

    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al obtener recursos' });
  }
};

export const deleteRecurso = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    
    if (!user || (user.rol !== 'profesor' && user.rol !== 'administrador')) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const [rows] = await pool.query<RowDataPacket[]>('SELECT id, nombre_almacenado, profesor_id FROM recursos_compartidos WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'El recurso no existe' });
    }

    const recurso = rows[0];

    // Only allow deletion if admin, or if the teacher is the one who uploaded it
    if (user.rol !== 'administrador' && recurso.profesor_id !== user.id) {
      return res.status(403).json({ message: 'No tienes permiso para eliminar este recurso' });
    }

    if (recurso.nombre_almacenado) {
      const safeFilename = path.basename(recurso.nombre_almacenado);
      const filePath = path.join(ENV.STORAGE_UPLOADS_DIR, safeFilename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (fsErr) {
          console.error(`Error al eliminar archivo físico ${filePath}:`, fsErr);
        }
      }
    }

    await pool.query('DELETE FROM recursos_compartidos WHERE id = ?', [id]);

    return res.json({ message: 'Recurso eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar recurso:', error);
    return res.status(500).json({ message: 'Error interno al eliminar recurso' });
  }
};

export const downloadRecurso = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM recursos_compartidos WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Archivo no encontrado' });
    }

    const recurso = rows[0];

    // Simple auth check
    if (user.rol === 'alumno') {
      const [userRows] = await pool.query<RowDataPacket[]>('SELECT curso_id FROM usuarios WHERE id = ?', [user.id]);
      const curso_id = userRows.length > 0 ? userRows[0].curso_id : null;

      if (recurso.alumno_id) {
        if (recurso.alumno_id !== user.id) {
          return res.status(403).json({ message: 'Acceso denegado' });
        }
      } else if (recurso.curso_id) {
        if (recurso.curso_id !== curso_id) {
          return res.status(403).json({ message: 'Acceso denegado' });
        }
      }
    }

    const safeFilename = path.basename(recurso.nombre_almacenado);
    const filePath = path.join(ENV.STORAGE_UPLOADS_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'El archivo físico no existe en el servidor' });
    }

    return res.download(filePath, recurso.nombre_original);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al descargar el archivo' });
  }
};
