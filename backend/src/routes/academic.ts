import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import { requireTeacher } from '../controllers/admin';
import {
  getAsignaturas,
  createAsignatura,
  deleteAsignatura,
  getCursoAsignaturas,
  assignCursoAsignatura,
  removeCursoAsignatura,
  getHorarioCurso,
  saveHorarioBloque,
  deleteHorarioBloque,
  getAsistenciaSheet,
  saveAsistenciaSheet,
  registrarPaseAtraso,
  getAsistenciaDashboard,
  getGradeReportData,
  getStudentSummary
} from '../controllers/academic';

const router = Router();

// Todas las rutas requieren autenticación
router.use(requireAuth);

// Asignaturas
router.get('/subjects', getAsignaturas);
router.post('/subjects', requireTeacher, createAsignatura);
router.delete('/subjects/:id', requireTeacher, deleteAsignatura);

// Asignación Asignaturas a Cursos
router.get('/course-subjects', getCursoAsignaturas);
router.post('/course-subjects', requireTeacher, assignCursoAsignatura);
router.delete('/course-subjects/:id', requireTeacher, removeCursoAsignatura);

// Horarios de Clases
router.get('/schedules/course/:cursoId', getHorarioCurso);
router.post('/schedules', requireTeacher, saveHorarioBloque);
router.delete('/schedules/:id', requireTeacher, deleteHorarioBloque);

// Registro de Asistencia y Pases
router.get('/attendance/sheet', requireTeacher, getAsistenciaSheet);
router.post('/attendance/sheet', requireTeacher, saveAsistenciaSheet);
router.post('/attendance/pass', requireTeacher, registrarPaseAtraso);

// Dashboard Analítico de Asistencia
router.get('/attendance/dashboard', requireTeacher, getAsistenciaDashboard);

// Emisión de Informes de Notas
router.get('/grade-reports/data', getGradeReportData);

// Resumen del Estudiante
router.get('/student-summary', getStudentSummary);

export default router;
