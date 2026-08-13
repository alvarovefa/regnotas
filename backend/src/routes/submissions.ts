import { Router } from 'express';
import { uploadSubmission, getMySubmissions, getMyGrades, downloadSubmission, deleteSubmission } from '../controllers/submissions';
import { requireAuth } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();

router.post('/upload', requireAuth, upload.single('file'), uploadSubmission);
router.get('/me', requireAuth, getMySubmissions);
router.get('/me/grades', requireAuth, getMyGrades);
router.get('/download/:id', requireAuth, downloadSubmission);
router.delete('/:id', requireAuth, deleteSubmission);

export default router;
