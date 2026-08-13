import { Request } from 'express';

export type UserRole = 'alumno' | 'profesor' | 'directivo' | 'administrador';
export type UserStatus = 'pendiente' | 'activo';
export type SubmissionType = 'tarea' | 'evaluacion';

export interface User {
  id: number;
  rut: string;
  nombre_completo: string;
  email: string;
  curso_id: number | null;
  rol: UserRole;
  password_hash?: string | null;
  foto_perfil?: string | null;
  estado: UserStatus;
}

export interface Course {
  id: number;
  nombre: string;
  nivel?: string | null;
  profesor_jefe_id?: number | null;
  profesor_jefe_nombre?: string | null;
}

export interface Group {
  id: number;
  nombre: string;
  curso_id: number;
  creado_por: number;
  fecha_creacion: string;
  integrantes?: GroupMember[];
  entregas?: Submission[];
}

export interface GroupMember {
  usuario_id: number;
  rut: string;
  nombre_completo: string;
  foto_perfil?: string | null;
}

export interface Submission {
  id: number;
  usuario_id: number;
  grupo_id?: number | null;
  grupo_nombre?: string | null;
  subido_por?: string | null;
  nombre_original: string;
  nombre_almacenado: string;
  ruta_archivo: string;
  tamano_bytes: number;
  extension: string;
  tipo_entrega: SubmissionType;
  fecha_hora_subida: string;
}

export interface JWTPayload {
  id: number;
  rut: string;
  rol: UserRole;
  nombre: string;
  foto_perfil?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}
