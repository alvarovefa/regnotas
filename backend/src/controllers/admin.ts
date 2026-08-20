import { Request, Response, NextFunction } from 'express';
import { pool } from '../db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import path from 'path';
import fs from 'fs';
import * as archiverModule from 'archiver';

import bcrypt from 'bcrypt';
import { ENV } from '../config/env';

// Middleware para verificar si es profesor o administrador
export const requireTeacher = (req: Request, res: Response, next: NextFunction): any => {
  const user = (req as any).user;
  if (!user || (user.rol !== 'profesor' && user.rol !== 'directivo' && user.rol !== 'administrador')) {
    return res.status(403).json({ message: 'Acceso denegado: Se requiere rol de profesor, directivo o administrador' });
  }
  next();
};

export const getCourses = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    let query = `
      SELECT DISTINCT c.*, u.nombre_completo AS profesor_jefe_nombre 
      FROM cursos c 
      LEFT JOIN usuarios u ON c.profesor_jefe_id = u.id 
    `;
    const params: any[] = [];

    if (user && user.rol === 'profesor') {
      query += `
        LEFT JOIN curso_asignaturas ca ON c.id = ca.curso_id
        LEFT JOIN horarios h ON c.id = h.curso_id
        WHERE c.profesor_jefe_id = ? OR ca.profesor_id = ? OR h.profesor_id = ?
      `;
      params.push(user.id, user.id, user.id);
    }

    query += ' ORDER BY c.nombre ASC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al obtener cursos' });
  }
};

const isProfesorJefeOrAdmin = async (user: any, cursoId: number): Promise<boolean> => {
  if (!user) return false;
  if (user.rol === 'administrador' || user.rol === 'directivo') return true;
  if (user.rol === 'profesor') {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT profesor_jefe_id FROM cursos WHERE id = ?', [cursoId]);
    if (rows.length > 0 && rows[0].profesor_jefe_id === user.id) return true;
  }
  return false;
};

export const createCourse = async (req: Request, res: Response): Promise<any> => {
  try {
    const { nombre, profesor_jefe_id } = req.body;
    if (!nombre) return res.status(400).json({ message: 'El nombre del curso es obligatorio' });

    const [result] = await pool.query<ResultSetHeader>('INSERT INTO cursos (nombre, profesor_jefe_id) VALUES (?, ?)', [nombre, profesor_jefe_id || null]);
    return res.json({ message: 'Curso creado', id: result.insertId, nombre, profesor_jefe_id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al crear curso' });
  }
};

export const updateCourse = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { nombre, profesor_jefe_id } = req.body;
    if (!nombre) return res.status(400).json({ message: 'El nombre es obligatorio' });
    await pool.query('UPDATE cursos SET nombre = ?, profesor_jefe_id = ? WHERE id = ?', [nombre, profesor_jefe_id || null, id]);
    return res.json({ message: 'Curso actualizado' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al actualizar curso' });
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
    const user = (req as any).user;
    const { cursoId } = req.query;
    let query = 'SELECT u.id, u.rut, u.nombre_completo, u.curso_id, c.nombre as curso_nombre FROM usuarios u LEFT JOIN cursos c ON u.curso_id = c.id WHERE u.rol = "alumno"';
    const params: any[] = [];

    if (user && user.rol === 'profesor') {
      const [assignedCourses] = await pool.query<RowDataPacket[]>(
        `SELECT DISTINCT c.id FROM cursos c
         LEFT JOIN curso_asignaturas ca ON c.id = ca.curso_id
         LEFT JOIN horarios h ON c.id = h.curso_id
         LEFT JOIN usuarios u_prof ON u_prof.id = ? AND u_prof.curso_id = c.id
         WHERE c.profesor_jefe_id = ? OR u_prof.id IS NOT NULL OR ca.profesor_id = ? OR h.profesor_id = ?`,
        [user.id, user.id, user.id, user.id]
      );
      const courseIds = assignedCourses.map(c => c.id);

      if (courseIds.length === 0) {
        return res.json([]);
      }

      if (cursoId) {
        if (!courseIds.includes(Number(cursoId))) {
          return res.status(403).json({ message: 'No tienes acceso a los alumnos de este curso' });
        }
        query += ' AND u.curso_id = ?';
        params.push(cursoId);
      } else {
        query += ` AND u.curso_id IN (${courseIds.map(() => '?').join(',')})`;
        params.push(...courseIds);
      }
    } else {
      if (cursoId) {
        query += ' AND u.curso_id = ?';
        params.push(cursoId);
      }
    }

    query += ' ORDER BY u.nombre_completo ASC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al obtener alumnos' });
  }
};

export const getSubmissions = async (req: Request, res: Response): Promise<any> => {
  try {
    const { cursoId, tipo, asignaturaId } = req.query;
    let query = `
      SELECT e.id, e.asignatura_id, e.nombre_original, e.nombre_almacenado, e.tamano_bytes, e.fecha_hora_subida, e.tipo_entrega,
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
    if (asignaturaId) {
      query += ` AND e.asignatura_id = ? `;
      params.push(asignaturaId);
    }
    if (tipo) {
      query += ` AND e.tipo_entrega = ? `;
      params.push(tipo);
    }
    
    query += ' ORDER BY e.fecha_hora_subida DESC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al obtener entregas' });
  }
};

export const addStudentsBulk = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const { students, cursoId } = req.body;

    if (!cursoId) return res.status(400).json({ message: 'El curso es obligatorio' });
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: 'La lista de alumnos está vacía' });
    }

    const canManage = await isProfesorJefeOrAdmin(user, Number(cursoId));
    if (!canManage) {
      return res.status(403).json({ message: 'Acceso denegado: Solo el Profesor Jefe de este curso o un Directivo puede agregar alumnos' });
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
    const user = (req as any).user;
    const { id } = req.params;
    const { rut, nombre_completo, curso_id } = req.body;
    if (!rut || !nombre_completo) return res.status(400).json({ message: 'RUT y Nombre son obligatorios' });

    const [stud] = await pool.query<RowDataPacket[]>('SELECT curso_id FROM usuarios WHERE id = ?', [id]);
    const targetCursoId = curso_id || (stud.length > 0 ? stud[0].curso_id : null);

    if (targetCursoId) {
      const canManage = await isProfesorJefeOrAdmin(user, Number(targetCursoId));
      if (!canManage) {
        return res.status(403).json({ message: 'Acceso denegado: Solo el Profesor Jefe de este curso o un Directivo puede editar este alumno' });
      }
    }

    await pool.query('UPDATE usuarios SET rut = ?, nombre_completo = ?, curso_id = ? WHERE id = ?', [rut, nombre_completo, curso_id || null, id]);
    return res.json({ message: 'Alumno actualizado' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al actualizar el alumno' });
  }
};

export const deleteStudent = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const [stud] = await pool.query<RowDataPacket[]>('SELECT curso_id FROM usuarios WHERE id = ?', [id]);
    if (stud.length > 0 && stud[0].curso_id) {
      const canManage = await isProfesorJefeOrAdmin(user, Number(stud[0].curso_id));
      if (!canManage) {
        return res.status(403).json({ message: 'Acceso denegado: Solo el Profesor Jefe de este curso o un Directivo puede eliminar este alumno' });
      }
    }

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

    const filePath = path.join(__dirname, '../../storage/uploads', rows[0].nombre_almacenado);
    return res.download(filePath, rows[0].nombre_original);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al descargar archivo' });
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
    const { cursoId, asignaturaId } = req.query;
    if (!cursoId) return res.status(400).json({ message: 'El cursoId es requerido' });

    const params: any[] = [];
    let joinCond = 'g.usuario_id = u.id';
    if (asignaturaId) {
      joinCond += ' AND g.asignatura_id = ?';
      params.push(asignaturaId);
    }
    params.push(cursoId);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT u.id AS usuario_id, u.rut, u.nombre_completo,
              g.s1_n1, g.s1_n2, g.s1_n3, g.s1_n4, g.s1_n5, g.s1_n6,
              g.s2_n1, g.s2_n2, g.s2_n3, g.s2_n4, g.s2_n5, g.s2_n6,
              g.nota_recuperativa, g.asignatura_id
       FROM usuarios u
       LEFT JOIN calificaciones g ON ${joinCond}
       WHERE u.rol = 'alumno' AND u.curso_id = ?
       ORDER BY u.nombre_completo ASC`,
      params
    );

    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al obtener calificaciones' });
  }
};

export const updateGrade = async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      usuario_id, asignatura_id,
      s1_n1, s1_n2, s1_n3, s1_n4, s1_n5, s1_n6,
      s2_n1, s2_n2, s2_n3, s2_n4, s2_n5, s2_n6,
      nota_recuperativa
    } = req.body;

    if (!usuario_id || !asignatura_id) return res.status(400).json({ message: 'usuario_id y asignatura_id son requeridos' });

    await pool.query(
      `INSERT INTO calificaciones (
        usuario_id, asignatura_id,
        s1_n1, s1_n2, s1_n3, s1_n4, s1_n5, s1_n6,
        s2_n1, s2_n2, s2_n3, s2_n4, s2_n5, s2_n6,
        nota_recuperativa
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        s1_n1 = VALUES(s1_n1), s1_n2 = VALUES(s1_n2), s1_n3 = VALUES(s1_n3), s1_n4 = VALUES(s1_n4), s1_n5 = VALUES(s1_n5), s1_n6 = VALUES(s1_n6),
        s2_n1 = VALUES(s2_n1), s2_n2 = VALUES(s2_n2), s2_n3 = VALUES(s2_n3), s2_n4 = VALUES(s2_n4), s2_n5 = VALUES(s2_n5), s2_n6 = VALUES(s2_n6),
        nota_recuperativa = VALUES(nota_recuperativa)
    `, [
      usuario_id, asignatura_id,
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

export const getUsers = async (req: Request, res: Response): Promise<any> => {
  try {
    const { rol } = req.query;
    let query = 'SELECT u.id, u.rut, u.nombre_completo, u.email, u.rol, u.curso_id, c.nombre as curso_nombre FROM usuarios u LEFT JOIN cursos c ON u.curso_id = c.id';
    const params: any[] = [];

    if (rol) {
      query += ' WHERE u.rol = ?';
      params.push(rol);
    }
    query += ' ORDER BY u.nombre_completo ASC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al obtener usuarios' });
  }
};

export const createUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const { rut, nombre_completo, email, rol, curso_id, password } = req.body;
    if (!rut || !nombre_completo || !email || !rol) {
      return res.status(400).json({ message: 'RUT, Nombre, Email y Rol son obligatorios' });
    }

    const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM usuarios WHERE rut = ? OR email = ?', [rut, email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'El RUT o el Email ya se encuentran registrados' });
    }

    let password_hash: string | null = null;
    let estado: 'pendiente' | 'activo' = 'pendiente';
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
      }
      password_hash = await bcrypt.hash(password, 10);
      estado = 'activo';
    }

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO usuarios (rut, nombre_completo, email, rol, curso_id, password_hash, estado) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [rut, nombre_completo, email, rol, curso_id || null, password_hash, estado]
    );

    const newUserId = result.insertId;
    if (rol === 'profesor' && curso_id) {
      await pool.query('UPDATE cursos SET profesor_jefe_id = ? WHERE id = ?', [newUserId, curso_id]);
    }

    return res.json({ message: 'Usuario creado exitosamente', id: newUserId });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al crear el usuario' });
  }
};

export const updateUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { rut, nombre_completo, email, rol, curso_id, password } = req.body;

    if (!rut || !nombre_completo || !email || !rol) {
      return res.status(400).json({ message: 'RUT, Nombre, Email y Rol son obligatorios' });
    }

    if (password && password.trim() !== '') {
      if (password.length < 6) {
        return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
      }
      const password_hash = await bcrypt.hash(password, 10);
      await pool.query(
        'UPDATE usuarios SET rut = ?, nombre_completo = ?, email = ?, rol = ?, curso_id = ?, password_hash = ?, estado = "activo" WHERE id = ?',
        [rut, nombre_completo, email, rol, curso_id || null, password_hash, id]
      );
    } else {
      await pool.query(
        'UPDATE usuarios SET rut = ?, nombre_completo = ?, email = ?, rol = ?, curso_id = ? WHERE id = ?',
        [rut, nombre_completo, email, rol, curso_id || null, id]
      );
    }

    if (rol === 'profesor') {
      if (curso_id) {
        await pool.query('UPDATE cursos SET profesor_jefe_id = ? WHERE id = ?', [id, curso_id]);
      } else {
        await pool.query('UPDATE cursos SET profesor_jefe_id = NULL WHERE profesor_jefe_id = ?', [id]);
      }
    }

    return res.json({ message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al actualizar el usuario' });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;
    if (currentUser && currentUser.id === Number(id)) {
      return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta de usuario' });
    }

    await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);
    return res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al eliminar el usuario' });
  }
};

export const deleteSubmission = async (req: Request, res: Response): Promise<any> => {
  try {
    const currentUser = (req as any).user;
    if (currentUser?.rol !== 'administrador') {
      return res.status(403).json({ message: 'Acceso denegado: Solo el administrador puede eliminar entregas.' });
    }

    const { id } = req.params;
    const [rows] = await pool.query<RowDataPacket[]>('SELECT id, nombre_almacenado FROM entregas WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'La entrega no existe o ya fue eliminada' });
    }

    const submission = rows[0];
    
    if (submission.nombre_almacenado) {
      const safeFilename = path.basename(submission.nombre_almacenado);
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

    return res.json({ message: 'Entrega eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar entrega:', error);
    return res.status(500).json({ message: 'Error interno al eliminar la entrega' });
  }
};

