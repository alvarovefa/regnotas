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
  updateGrade,
  getUsers,
  createUser,
  updateUser,
  deleteUser
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

router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

router.get('/grades', getGrades);
router.put('/grades', updateGrade);

router.get('/submissions', getSubmissions);
router.get('/download/:id', downloadSingle);
router.get('/download-all', downloadAllZip);

export default router;
