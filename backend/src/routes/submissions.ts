import { Router } from 'express';
import { uploadSubmission, getMySubmissions, getMyGrades } from '../controllers/submissions';
import { requireAuth } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();

router.post('/upload', requireAuth, upload.single('file'), uploadSubmission);
router.get('/me', requireAuth, getMySubmissions);
router.get('/me/grades', requireAuth, getMyGrades);

export default router;
