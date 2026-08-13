import { pool } from '../db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { Group, GroupMember, Submission } from '../types';

export class GroupRepository {
  async createGroup(nombre: string, cursoId: number, creadoPor: number): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO grupos_trabajo (nombre, curso_id, creado_por) VALUES (?, ?, ?)',
      [nombre.trim(), cursoId, creadoPor]
    );
    return result.insertId;
  }

  async setGroupMembers(groupId: number, studentIds: number[]): Promise<void> {
    await pool.query('DELETE FROM grupo_integrantes WHERE grupo_id = ?', [groupId]);
    if (studentIds.length > 0) {
      const values = studentIds.map(uId => [groupId, uId]);
      await pool.query('INSERT INTO grupo_integrantes (grupo_id, usuario_id) VALUES ?', [values]);
    }
  }

  async findByCourse(courseId: number): Promise<Group[]> {
    const [groups] = await pool.query<RowDataPacket[]>(
      `SELECT g.id, g.nombre, g.curso_id, g.creado_por, g.fecha_creacion,
              u.nombre_completo AS creador_nombre
       FROM grupos_trabajo g
       JOIN usuarios u ON g.creado_por = u.id
       WHERE g.curso_id = ?
       ORDER BY g.fecha_creacion DESC`,
      [courseId]
    );

    if (groups.length === 0) return [];

    const groupIds = groups.map(g => g.id);

    const [members] = await pool.query<RowDataPacket[]>(
      `SELECT gi.grupo_id, u.id AS usuario_id, u.rut, u.nombre_completo, u.foto_perfil
       FROM grupo_integrantes gi
       JOIN usuarios u ON gi.usuario_id = u.id
       WHERE gi.grupo_id IN (?)`,
      [groupIds]
    );

    const [submissions] = await pool.query<RowDataPacket[]>(
      `SELECT e.id, e.grupo_id, e.nombre_original, e.tamano_bytes, e.fecha_hora_subida, e.tipo_entrega, u.nombre_completo AS subido_por
       FROM entregas e
       JOIN usuarios u ON e.usuario_id = u.id
       WHERE e.grupo_id IN (?)
       ORDER BY e.fecha_hora_subida DESC`,
      [groupIds]
    );

    return groups.map(g => ({
      ...g,
      integrantes: members.filter(m => m.grupo_id === g.id) as GroupMember[],
      entregas: submissions.filter(s => s.grupo_id === g.id) as any[]
    })) as Group[];
  }

  async findUserGroups(userId: number): Promise<Group[]> {
    const [groups] = await pool.query<RowDataPacket[]>(
      `SELECT g.id, g.nombre, g.curso_id, g.fecha_creacion, c.nombre AS curso_nombre
       FROM grupos_trabajo g
       JOIN grupo_integrantes gi ON g.id = gi.grupo_id
       LEFT JOIN cursos c ON g.curso_id = c.id
       WHERE gi.usuario_id = ?
       ORDER BY g.fecha_creacion DESC`,
      [userId]
    );

    if (groups.length === 0) return [];

    const groupIds = groups.map(g => g.id);

    const [members] = await pool.query<RowDataPacket[]>(
      `SELECT gi.grupo_id, u.id AS usuario_id, u.rut, u.nombre_completo, u.foto_perfil
       FROM grupo_integrantes gi
       JOIN usuarios u ON gi.usuario_id = u.id
       WHERE gi.grupo_id IN (?)`,
      [groupIds]
    );

    const [submissions] = await pool.query<RowDataPacket[]>(
      `SELECT e.id, e.grupo_id, e.usuario_id, e.nombre_original, e.tamano_bytes, e.extension, e.fecha_hora_subida, e.tipo_entrega, u.nombre_completo AS subido_por
       FROM entregas e
       JOIN usuarios u ON e.usuario_id = u.id
       WHERE e.grupo_id IN (?)
       ORDER BY e.fecha_hora_subida DESC`,
      [groupIds]
    );

    return groups.map(g => ({
      ...g,
      integrantes: members.filter(m => m.grupo_id === g.id) as GroupMember[],
      entregas: submissions.filter(s => s.grupo_id === g.id) as any[]
    })) as Group[];
  }

  async updateName(groupId: number, name: string): Promise<void> {
    await pool.query('UPDATE grupos_trabajo SET nombre = ? WHERE id = ?', [name.trim(), groupId]);
  }

  async deleteGroup(groupId: number): Promise<void> {
    await pool.query('DELETE FROM grupos_trabajo WHERE id = ?', [groupId]);
  }

  async isUserInGroup(userId: number, groupId: number): Promise<boolean> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM grupo_integrantes WHERE grupo_id = ? AND usuario_id = ?',
      [groupId, userId]
    );
    return rows.length > 0;
  }
}

export const groupRepository = new GroupRepository();
