import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';

import './db';
import { ENV } from './config/env';
import { inputSanitizer } from './middlewares/sanitizer';
import { errorHandler } from './middlewares/errorHandler';

import authRoutes from './routes/auth';
import submissionsRoutes from './routes/submissions';
import adminRoutes from './routes/admin';
import academicRoutes from './routes/academic';
import groupsRoutes from './routes/groups';

dotenv.config();

const app = express();

// Middlewares de Seguridad y Parsing
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(inputSanitizer);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5000,
  skip: (req) => req.path.startsWith('/admin') || req.path.startsWith('/api/admin') || req.path.startsWith('/api/academic')
});
app.use(limiter);

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date(), env: ENV.NODE_ENV });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/groups', groupsRoutes);

// Archivos estáticos de perfiles
const profilesDir = ENV.STORAGE_PROFILES_DIR;
if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir, { recursive: true });
}
app.use('/api/profiles', express.static(profilesDir));

// Middleware Global de Errores
app.use(errorHandler);

// Iniciar servidor
app.listen(ENV.PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${ENV.PORT}`);
});

export default app;
