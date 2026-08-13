import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/userRepository';
import { RutUtil } from '../utils/rut';
import { ENV } from '../config/env';
import { User, JWTPayload } from '../types';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../errors/AppError';

export class AuthService {
  async checkRut(rut: string): Promise<{ status: 'needs_password' | 'registered'; name: string; rut: string }> {
    const cleanRut = RutUtil.clean(rut);
    if (!cleanRut) {
      throw new BadRequestError('El RUT proporcionado es inválido');
    }

    const user = await userRepository.findByCleanRut(cleanRut);
    if (!user) {
      throw new NotFoundError('Estudiante no encontrado en el sistema. Contacta al profesor.');
    }

    if (!user.password_hash) {
      return { status: 'needs_password', name: user.nombre_completo, rut: user.rut };
    }

    return { status: 'registered', name: user.nombre_completo, rut: user.rut };
  }

  async loginOrSetup(rut: string, password: string): Promise<{ user: Partial<User>; token: string }> {
    const cleanRut = RutUtil.clean(rut);
    if (!cleanRut || !password) {
      throw new BadRequestError('RUT y contraseña son obligatorios');
    }

    const user = await userRepository.findByCleanRut(cleanRut);
    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    if (!user.password_hash) {
      if (password.length < 4) {
        throw new BadRequestError('La contraseña debe tener al menos 4 caracteres');
      }
      const hashed = await bcrypt.hash(password, 10);
      await userRepository.updatePasswordAndActivate(user.id, hashed);
    } else {
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        throw new UnauthorizedError('Contraseña incorrecta');
      }
    }

    const payload: JWTPayload = {
      id: user.id,
      rut: user.rut,
      rol: user.rol,
      nombre: user.nombre_completo,
      foto_perfil: user.foto_perfil,
    };

    const token = jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '8h' });

    const { password_hash, ...userData } = user;
    return { user: userData, token };
  }

  async updateProfilePicture(userId: number, filename: string): Promise<string> {
    if (!filename) {
      throw new BadRequestError('No se proporcionó ningún archivo de imagen');
    }

    const photoUrl = `/api/profiles/${filename}`;
    await userRepository.updateProfilePicture(userId, photoUrl);
    return photoUrl;
  }
}

export const authService = new AuthService();
