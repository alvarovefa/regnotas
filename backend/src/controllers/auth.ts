import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { AuthenticatedRequest } from '../types';
import { ENV } from '../config/env';

export const checkRut = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { rut } = req.body;
    const result = await authService.checkRut(rut);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const loginOrSetup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { rut, password } = req.body;
    const { user, token } = await authService.loginOrSetup(rut, password);

    res.cookie('token', token, {
      httpOnly: true,
      secure: ENV.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
    });

    res.json({ message: 'Autenticación exitosa', user, token });
  } catch (error) {
    next(error);
  }
};

export const logout = (req: Request, res: Response): void => {
  res.clearCookie('token');
  res.json({ message: 'Sesión cerrada' });
};

export const uploadProfilePicture = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const file = req.file;

    const photoUrl = await authService.updateProfilePicture(user.id, file?.filename || '');
    res.json({ message: 'Foto de perfil actualizada', foto_perfil: photoUrl });
  } catch (error) {
    next(error);
  }
};
