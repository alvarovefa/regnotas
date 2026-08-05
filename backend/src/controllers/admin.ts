import { Request, Response, NextFunction } from 'express';
import { pool } from '../db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import path from 'path';
import fs from 'fs';
import * as archiverModule from 'archiver';

// Middleware para verificar si es profesor
export const requireTeacher = (req: Request, res: Response, next: NextFunction): any => {
  const user = (req as any).user;
  if (!user || user.rol !== 'profesor') {
    return res.status(403).json({ message: 'Acceso denegado: Se requiere rol de profesor' });
  }
  next();
};

export const getCourses = async (req: Request, res: Response): Promise<any> => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM cursos ORDER BY nombre ASC');
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al obtener cursos' });
  }
};

export const createCourse = async (req: Request, res: Response): Promise<any> => {
  try {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ message: 'El nombre del curso es obligatorio' });

    const [result] = await pool.query<ResultSetHeader>('INSERT INTO cursos (nombre) VALUES (?)', [nombre]);
    return res.json({ message: 'Curso creado', id: result.insertId, nombre });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al crear el curso' });
  }
};

export const updateCourse = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ message: 'El nombre es obligatorio' });
    await pool.query('UPDATE cursos SET nombre = ? WHERE id = ?', [nombre, id]);
    return res.json({ message: 'Curso actualizado' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al actualizar el curso' });
  }
};

export const deleteCourse = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM cursos WHERE id = ?', [id]);
    return res.json({ message: 'Curso eliminado' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al eliminar el curso' });
  }
};

export const getStudents = async (req: Request, res: Response): Promise<any> => {
  try {
    const { cursoId } = req.query;
    let query = 'SELECT id, rut, nombre_completo, curso_id FROM usuarios WHERE rol = "alumno"';
    const params: any[] = [];
    
    if (cursoId) {
      query += ' AND curso_id = ?';
      params.push(cursoId);
    }
    
    query += ' ORDER BY nombre_completo ASC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al obtener alumnos' });
  }
};

export const getSubmissions = async (req: Request, res: Response): Promise<any> => {
  try {
    const { cursoId, tipo } = req.query;
    let query = `
      SELECT e.id, e.nombre_original, e.nombre_almacenado, e.tamano_bytes, e.fecha_hora_subida, e.tipo_entrega,
             u.rut, u.nombre_completo, c.nombre as curso_nombre
      FROM entregas e
      JOIN usuarios u ON e.usuario_id = u.id
      LEFT JOIN cursos c ON u.curso_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (cursoId) {
      query += ` AND u.curso_id = ? `;
      params.push(cursoId);
    }
    if (tipo) {
      query += ` AND e.tipo_entrega = ? `;
      params.push(tipo);
    }
    
    query += ` ORDER BY e.fecha_hora_subida DESC`;

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al obtener entregas' });
  }
};

export const addStudentsBulk = async (req: Request, res: Response): Promise<any> => {
  try {
    const { students, cursoId } = req.body;

    if (!cursoId) return res.status(400).json({ message: 'El curso es obligatorio' });
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: 'La lista de alumnos está vacía' });
    }

    let addedCount = 0;
    for (const student of students) {
      const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM usuarios WHERE rut = ?', [student.rut]);
      if (existing.length === 0) {
        const dummyEmail = `${student.rut}@alumno.local`;
        await pool.query(
          'INSERT INTO usuarios (rut, nombre_completo, email, curso_id, rol) VALUES (?, ?, ?, ?, "alumno")',
          [student.rut, student.nombre_completo, dummyEmail, cursoId]
        );
        addedCount++;
      } else {
        // Opcional: Actualizar al nuevo curso si ya existía el RUT
        await pool.query('UPDATE usuarios SET curso_id = ?, nombre_completo = ? WHERE rut = ?', [cursoId, student.nombre_completo, student.rut]);
      }
    }

    return res.json({ message: `Procesados: ${addedCount} alumnos nuevos y los demás actualizados en este curso.` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error interno al agregar alumnos' });
  }
};

export const updateStudent = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { rut, nombre_completo, curso_id } = req.body;
    if (!rut || !nombre_completo) return res.status(400).json({ message: 'RUT y Nombre son obligatorios' });
    await pool.query('UPDATE usuarios SET rut = ?, nombre_completo = ?, curso_id = ? WHERE id = ?', [rut, nombre_completo, curso_id || null, id]);
    return res.json({ message: 'Alumno actualizado' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al actualizar el alumno' });
  }
};

export const deleteStudent = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);
    return res.json({ message: 'Alumno eliminado' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al eliminar el alumno' });
  }
};

export const downloadSingle = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query<RowDataPacket[]>('SELECT nombre_almacenado, nombre_original FROM entregas WHERE id = ?', [id]);
    
    if (rows.length === 0) return res.status(404).json({ message: 'Archivo no encontrado' });

    const file = rows[0];
    const filePath = path.join(__dirname, '../../storage/uploads', file.nombre_almacenado);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'El archivo físico no existe en el disco' });
    }

    return res.download(filePath, file.nombre_original);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al descargar el archivo' });
  }
};

export const downloadAllZip = async (req: Request, res: Response): Promise<any> => {
  try {
    const { cursoId, tipo } = req.query;
    
    let query = `
      SELECT e.nombre_almacenado, e.nombre_original, u.nombre_completo, u.rut 
      FROM entregas e
      JOIN usuarios u ON e.usuario_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (cursoId) {
      query += ` AND u.curso_id = ? `;
      params.push(cursoId);
    }
    if (tipo) {
      query += ` AND e.tipo_entrega = ? `;
      params.push(tipo);
    }

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No hay entregas para descargar' });
    }

    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-disposition': 'attachment; filename=entregas.zip'
    });

    const archiverFn = (archiverModule as any).default || archiverModule;
    const archive = archiverFn('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    for (const file of rows) {
      const filePath = path.join(__dirname, '../../storage/uploads', file.nombre_almacenado);
      if (fs.existsSync(filePath)) {
        const nameInZip = `${file.rut} - ${file.nombre_completo}/${file.nombre_original}`;
        archive.file(filePath, { name: nameInZip });
      }
    }

    archive.finalize();
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Error al generar el ZIP' });
    }
  }
};

export const getGrades = async (req: Request, res: Response): Promise<any> => {
  try {
    const { cursoId } = req.query;
    if (!cursoId) return res.status(400).json({ message: 'Debe especificar un curso' });

    let query = `
      SELECT u.id as usuario_id, u.rut, u.nombre_completo,
             c.s1_n1, c.s1_n2, c.s1_n3, c.s1_n4, c.s1_n5, c.s1_n6,
             c.s2_n1, c.s2_n2, c.s2_n3, c.s2_n4, c.s2_n5, c.s2_n6,
             c.nota_recuperativa
      FROM usuarios u
      LEFT JOIN calificaciones c ON u.id = c.usuario_id
      WHERE u.rol = "alumno" AND u.curso_id = ?
      ORDER BY u.nombre_completo ASC
    `;
    const [rows] = await pool.query<RowDataPacket[]>(query, [cursoId]);
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al obtener calificaciones' });
  }
};

export const updateGrades = async (req: Request, res: Response): Promise<any> => {
  try {
    const { usuario_id } = req.params;
    const { s1_n1, s1_n2, s1_n3, s1_n4, s1_n5, s1_n6, s2_n1, s2_n2, s2_n3, s2_n4, s2_n5, s2_n6, nota_recuperativa } = req.body;
    
    await pool.query(`
      INSERT INTO calificaciones (usuario_id, s1_n1, s1_n2, s1_n3, s1_n4, s1_n5, s1_n6, s2_n1, s2_n2, s2_n3, s2_n4, s2_n5, s2_n6, nota_recuperativa)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      s1_n1 = VALUES(s1_n1), s1_n2 = VALUES(s1_n2), s1_n3 = VALUES(s1_n3), s1_n4 = VALUES(s1_n4), s1_n5 = VALUES(s1_n5), s1_n6 = VALUES(s1_n6),
      s2_n1 = VALUES(s2_n1), s2_n2 = VALUES(s2_n2), s2_n3 = VALUES(s2_n3), s2_n4 = VALUES(s2_n4), s2_n5 = VALUES(s2_n5), s2_n6 = VALUES(s2_n6),
      nota_recuperativa = VALUES(nota_recuperativa)
    `, [
      usuario_id, 
      s1_n1 || null, s1_n2 || null, s1_n3 || null, s1_n4 || null, s1_n5 || null, s1_n6 || null,
      s2_n1 || null, s2_n2 || null, s2_n3 || null, s2_n4 || null, s2_n5 || null, s2_n6 || null,
      nota_recuperativa || null
    ]);

    return res.json({ message: 'Calificaciones actualizadas' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al actualizar calificaciones' });
  }
};
