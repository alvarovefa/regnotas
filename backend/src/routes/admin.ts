import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import { 
  requireTeacher, 
  getSubmissions, 
  addStudentsBulk, 
  downloadSingle, 
  downloadAllZip,
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getStudents,
  updateStudent,
  deleteStudent,
  getGrades,
  updateGrades
} from '../controllers/admin';

const router = Router();

router.use(requireAuth, requireTeacher);

router.get('/courses', getCourses);
router.post('/courses', createCourse);
router.put('/courses/:id', updateCourse);
router.delete('/courses/:id', deleteCourse);

router.get('/students', getStudents);
router.post('/students/bulk', addStudentsBulk);
router.put('/students/:id', updateStudent);
router.delete('/students/:id', deleteStudent);

router.get('/grades', getGrades);
router.put('/grades/:usuario_id', updateGrades);

router.get('/submissions', getSubmissions);
router.get('/download/:id', downloadSingle);
router.get('/download-all', downloadAllZip);

router.get('/grades', getGrades);
router.put('/grades/:usuario_id', updateGrades);

export default router;
