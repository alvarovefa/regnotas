import { pool } from '../db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { User, UserRole } from '../types';

export class UserRepository {
  async findByCleanRut(cleanRut: string): Promise<User | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM usuarios WHERE REPLACE(REPLACE(rut, '.', ''), '-', '') = ?",
      [cleanRut]
    );
    if (rows.length === 0) return null;
    return rows[0] as User;
  }

  async findById(id: number): Promise<User | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM usuarios WHERE id = ?',
      [id]
    );
    if (rows.length === 0) return null;
    return rows[0] as User;
  }

  async findByCourse(courseId: number): Promise<User[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, rut, nombre_completo, email, curso_id, rol, estado, foto_perfil FROM usuarios WHERE curso_id = ? ORDER BY nombre_completo ASC',
      [courseId]
    );
    return rows as User[];
  }

  async updatePasswordAndActivate(userId: number, passwordHash: string): Promise<void> {
    await pool.query(
      'UPDATE usuarios SET password_hash = ?, estado = "activo" WHERE id = ?',
      [passwordHash, userId]
    );
  }

  async updateProfilePicture(userId: number, photoUrl: string): Promise<void> {
    await pool.query(
      'UPDATE usuarios SET foto_perfil = ? WHERE id = ?',
      [photoUrl, userId]
    );
  }
}

export const userRepository = new UserRepository();
