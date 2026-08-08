import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import { RowDataPacket } from 'mysql2';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export const checkRut = async (req: Request, res: Response): Promise<any> => {
  try {
    const { rut } = req.body;
    if (!rut) return res.status(400).json({ message: 'RUT requerido' });

    const [rows] = await pool.query<RowDataPacket[]>('SELECT id, password_hash, nombre_completo FROM usuarios WHERE rut = ?', [rut]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Estudiante no encontrado en el sistema. Contacta al profesor.' });
    }

    const user = rows[0];
    if (!user.password_hash) {
      return res.json({ status: 'needs_password', name: user.nombre_completo });
    }

    return res.json({ status: 'registered', name: user.nombre_completo });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const loginOrSetup = async (req: Request, res: Response): Promise<any> => {
  try {
    const { rut, password } = req.body;
    if (!rut || !password) return res.status(400).json({ message: 'RUT y contraseña requeridos' });

    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM usuarios WHERE rut = ?', [rut]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const user = rows[0];

    if (!user.password_hash) {
      const hashed = await bcrypt.hash(password, 10);
      await pool.query('UPDATE usuarios SET password_hash = ?, estado = "activo" WHERE id = ?', [hashed, user.id]);
    } else {
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ message: 'Contraseña incorrecta' });
      }
    }

    const token = jwt.sign(
      { id: user.id, rut: user.rut, rol: user.rol, nombre: user.nombre_completo, foto_perfil: user.foto_perfil },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000 
    });

    const { password_hash, token_activacion, token_expiracion, ...userData } = user;
    return res.json({ message: 'Autenticación exitosa', user: userData, token });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ message: 'Sesión cerrada' });
};

export const uploadProfilePicture = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: 'No autorizado' });

    if (!req.file) {
      return res.status(400).json({ message: 'No se subió ninguna imagen' });
    }

    const filename = req.file.filename;
    const photoUrl = `/api/profiles/${filename}`;

    await pool.query('UPDATE usuarios SET foto_perfil = ? WHERE id = ?', [photoUrl, user.id]);

    return res.json({ message: 'Foto de perfil actualizada', foto_perfil: photoUrl });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return res.status(500).json({ message: 'Error al procesar la imagen' });
  }
};
