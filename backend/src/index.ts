import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import './db';

import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';
import submissionsRoutes from './routes/submissions';
import adminRoutes from './routes/admin';
import academicRoutes from './routes/academic';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5000,
  skip: (req) => req.path.startsWith('/admin') || req.path.startsWith('/api/admin') || req.path.startsWith('/api/academic')
});
app.use(limiter);

// Rutas de API
app.use('/api/auth', authRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/academic', academicRoutes);

// Rutas básicas
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Create storage directories if they don't exist
const profilesDir = path.join(__dirname, '../storage/profiles');
if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir, { recursive: true });
}
app.use('/api/profiles', express.static(profilesDir));

// Start server
app.listen(port, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${port}`);
});
