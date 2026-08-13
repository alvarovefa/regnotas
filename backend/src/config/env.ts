import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const ENV = {
  PORT: Number(process.env.PORT) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB_HOST: process.env.DB_HOST || '127.0.0.1',
  DB_PORT: Number(process.env.DB_PORT) || 3307,
  DB_USER: process.env.DB_USER || 'compulab_user',
  DB_PASSWORD: process.env.DB_PASSWORD || 'compulab_password',
  DB_NAME: process.env.DB_NAME || 'compulab_db',
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_production',
  STORAGE_UPLOADS_DIR: path.join(__dirname, '../../storage/uploads'),
  STORAGE_PROFILES_DIR: path.join(__dirname, '../../storage/profiles'),
};
