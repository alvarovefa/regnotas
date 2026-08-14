import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import { upload } from '../middlewares/upload';
import {
  uploadRecurso,
  getTeacherRecursos,
  getStudentRecursos,
  deleteRecurso,
  downloadRecurso
} from '../controllers/recursos';

const router = Router();

router.post('/upload', requireAuth, upload.single('file'), uploadRecurso);
router.get('/teacher', requireAuth, getTeacherRecursos);
router.get('/me', requireAuth, getStudentRecursos);
router.delete('/:id', requireAuth, deleteRecurso);
router.get('/download/:id', requireAuth, downloadRecurso);

export default router;
