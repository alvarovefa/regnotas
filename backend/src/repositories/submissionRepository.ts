import { pool } from '../db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { Submission, SubmissionType } from '../types';

export class SubmissionRepository {
  async create(
    userId: number,
    groupId: number | null,
    asignaturaId: number,
    nombreOriginal: string,
    nombreAlmacenado: string,
    rutaArchivo: string,
    tamanoBytes: number,
    extension: string,
    tipoEntrega: SubmissionType
  ): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO entregas (usuario_id, grupo_id, asignatura_id, nombre_original, nombre_almacenado, ruta_archivo, tamano_bytes, extension, tipo_entrega) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, groupId, asignaturaId, nombreOriginal, nombreAlmacenado, rutaArchivo, tamanoBytes, extension, tipoEntrega]
    );
    return result.insertId;
  }

  async findUserSubmissions(userId: number): Promise<Submission[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT e.id, e.usuario_id, e.grupo_id, e.asignatura_id, e.nombre_original, e.nombre_almacenado, e.tamano_bytes, e.extension, e.fecha_hora_subida, e.tipo_entrega,
              g.nombre AS grupo_nombre, u.nombre_completo AS subido_por
       FROM entregas e
       JOIN usuarios u ON e.usuario_id = u.id
       LEFT JOIN grupos_trabajo g ON e.grupo_id = g.id
       LEFT JOIN grupo_integrantes gi ON g.id = gi.grupo_id
       WHERE e.usuario_id = ? OR gi.usuario_id = ?
       ORDER BY e.fecha_hora_subida DESC`,
      [userId, userId]
    );
    return rows as Submission[];
  }

  async findById(id: number): Promise<Submission | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM entregas WHERE id = ?',
      [id]
    );
    if (rows.length === 0) return null;
    return rows[0] as Submission;
  }

  async isUserAuthorizedToDownload(submissionId: number, userId: number): Promise<boolean> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT e.id
       FROM entregas e
       LEFT JOIN grupo_integrantes gi ON e.grupo_id = gi.grupo_id
       WHERE e.id = ? AND (e.usuario_id = ? OR gi.usuario_id = ?)`,
      [submissionId, userId, userId]
    );
    return rows.length > 0;
  }
}

export const submissionRepository = new SubmissionRepository();
