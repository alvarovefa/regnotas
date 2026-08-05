import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../storage/uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + '-' + uniqueSuffix + ext);
  }
});

// Límite de 50MB
export const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } 
});

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../storage/profiles'));
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4() + '.jpg');
  }
});

export const uploadProfile = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit for profile pics
});
