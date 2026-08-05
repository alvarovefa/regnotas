import { Router } from 'express';
import { checkRut, loginOrSetup, logout, uploadProfilePicture } from '../controllers/auth';
import { requireAuth } from '../middlewares/auth';
import { uploadProfile } from '../middlewares/upload';

const router = Router();

router.post('/check-rut', checkRut);
router.post('/login', loginOrSetup);
router.post('/logout', logout);
router.post('/profile-picture', requireAuth, uploadProfile.single('foto'), uploadProfilePicture);


export default router;
