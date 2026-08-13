import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth';
import { createGroup, getCourseGroups, updateGroup, deleteGroup, getMyGroups } from '../controllers/groups';

const router = Router();

router.use(requireAuth);

router.post('/', requireRole('profesor', 'directivo', 'administrador'), createGroup);
router.get('/my-groups', getMyGroups);
router.get('/course/:cursoId', requireRole('profesor', 'directivo', 'administrador'), getCourseGroups);
router.put('/:id', requireRole('profesor', 'directivo', 'administrador'), updateGroup);
router.delete('/:id', requireRole('profesor', 'directivo', 'administrador'), deleteGroup);

export default router;
