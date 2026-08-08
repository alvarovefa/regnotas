import { useState, useEffect } from 'react';
import { LogOut, Users, Download, FileText, CheckCircle2, Plus, BookOpen, User, Edit2, Trash2, Award, LayoutDashboard, Settings, Menu, X, ShieldCheck, UserCheck, Check, Calendar, FileCheck2, BarChart3, Layers } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

import AttendanceSheet from '../../components/AttendanceSheet';
import AttendanceDashboard from '../../components/AttendanceDashboard';
import ScheduleMatrix from '../../components/ScheduleMatrix';
import SubjectManagement from '../../components/SubjectManagement';
import GradeReportModule from '../../components/GradeReportModule';

// Tipos
type Course = { id: number; nombre: string; profesor_jefe_id?: number | null; profesor_jefe_nombre?: string };
type Submission = { id: number; nombre_original: string; tamano_bytes: number; fecha_hora_subida: string; rut: string; nombre_completo: string; tipo_entrega: 'tarea' | 'evaluacion'; };
type Student = { id: number; rut: string; nombre_completo: string; curso_id: number | null; };
type UserItem = { id: number; rut: string; nombre_completo: string; email: string; rol: 'alumno' | 'profesor' | 'directivo' | 'administrador'; curso_id: number | null; curso_nombre?: string; };
type GradeRow = {
  usuario_id: number; rut: string; nombre_completo: string;
  s1_n1: string | null; s1_n2: string | null; s1_n3: string | null; s1_n4: string | null; s1_n5: string | null; s1_n6: string | null;
  s2_n1: string | null; s2_n2: string | null; s2_n3: string | null; s2_n4: string | null; s2_n5: string | null; s2_n6: string | null;
  nota_recuperativa: string | null;
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | ''>('');
  
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [usersList, setUsersList] = useState<UserItem[]>([]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'entregas' | 'alumnos' | 'cursos' | 'calificaciones' | 'usuarios' | 'asistencia' | 'horario' | 'asignaturas' | 'asistencia_dashboard' | 'informes'>('dashboard');
  const [subTab, setSubTab] = useState<'tarea' | 'evaluacion'>('tarea');
  const [semesterTab, setSemesterTab] = useState<'s1' | 's2'>('s1');
  const [filterRole, setFilterRole] = useState<'todos' | 'alumno' | 'profesor' | 'directivo' | 'administrador'>('todos');
  
  const [studentsRaw, setStudentsRaw] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  
  const [newCourseName, setNewCourseName] = useState('');
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudentId, setDeletingStudentId] = useState<number | null>(null);

  // Estados para gestión de usuarios
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState({ rut: '', nombre_completo: '', email: '', rol: 'alumno' as 'alumno' | 'profesor' | 'administrador', curso_id: '', password: '' });
  const [editingUser, setEditingUser] = useState<{ id: number; rut: string; nombre_completo: string; email: string; rol: 'alumno' | 'profesor' | 'administrador'; curso_id: string; password?: string } | null>(null);
  const [userFeedbackMsg, setUserFeedbackMsg] = useState('');

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const authFetch = (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
      ...options.headers,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    return fetch(url, { ...options, headers, credentials: 'include' });
  };

  useEffect(() => { fetchCourses(); fetchUsers(); }, []);
  useEffect(() => {
    if (selectedCourseId) {
      fetchSubmissions(); fetchStudents(); fetchGrades();
    } else {
      fetchSubmissions(); fetchStudents(); setGrades([]);
    }
  }, [selectedCourseId]);

  const fetchCourses = async () => { const res = await authFetch('/api/admin/courses'); if (res.ok) setCourses(await res.json()); };
  const fetchSubmissions = async () => { const res = await authFetch(`/api/admin/submissions?cursoId=${selectedCourseId}`); if (res.ok) setSubmissions(await res.json()); };
  const fetchStudents = async () => { const res = await authFetch(`/api/admin/students?cursoId=${selectedCourseId}`); if (res.ok) setStudents(await res.json()); };
  const fetchGrades = async () => { const res = await authFetch(`/api/admin/grades?cursoId=${selectedCourseId}`); if (res.ok) setGrades(await res.json()); };
  const fetchUsers = async () => { const res = await authFetch('/api/admin/users'); if (res.ok) setUsersList(await res.json()); };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim()) return;
    const res = await authFetch('/api/admin/courses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: newCourseName }) });
    if (res.ok) { setNewCourseName(''); setIsCreatingCourse(false); await fetchCourses(); }
    else { const data = await res.json().catch(() => ({})); alert(data.message || 'Error al crear curso'); }
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse || !editingCourse.nombre.trim()) return;
    const res = await authFetch(`/api/admin/courses/${editingCourse.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: editingCourse.nombre }) });
    if (res.ok) { setEditingCourse(null); fetchCourses(); }
  };

  const handleDeleteCourse = async (id: number) => {
    if (!window.confirm('¿Eliminar este curso y dejar a los alumnos sin curso?')) return;
    const res = await authFetch(`/api/admin/courses/${id}`, { method: 'DELETE' });
    if (res.ok) { if (selectedCourseId === id) setSelectedCourseId(''); fetchCourses(); }
  };

  const handleUpdateStudent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingStudent || !editingStudent.rut.trim()) return;
    const res = await authFetch(`/api/admin/students/${editingStudent.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editingStudent) });
    if (res.ok) { setEditingStudent(null); fetchStudents(); fetchUsers(); }
  };

  const handleDeleteStudent = async (id: number) => {
    const res = await authFetch(`/api/admin/students/${id}`, { method: 'DELETE' });
    if (res.ok) { setDeletingStudentId(null); fetchStudents(); fetchSubmissions(); fetchGrades(); fetchUsers(); }
  };

  const handleBulkAdd = async () => {
    if (!studentsRaw.trim() || !selectedCourseId) return;
    setUploading(true); setMessage('');
    const parsedStudents = studentsRaw.split('\n').map(l => l.split(',')).filter(p => p.length >= 2).map(p => ({ rut: p[0].trim(), nombre_completo: p[1].trim() }));
    if (parsedStudents.length === 0) { setMessage('Formato incorrecto.'); setUploading(false); return; }
    try {
      const res = await authFetch('/api/admin/students/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ students: parsedStudents, cursoId: selectedCourseId }) });
      const data = await res.json();
      setMessage(data.message || (res.ok ? 'Ok' : 'Error'));
      if (res.ok) { setStudentsRaw(''); fetchStudents(); fetchGrades(); }
    } catch (err) { setMessage('Error'); } finally { setUploading(false); }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFeedbackMsg('');
    try {
      const res = await authFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newUser,
          curso_id: newUser.curso_id ? Number(newUser.curso_id) : null
        })
      });
      const data = await res.json();
      if (res.ok) {
        setIsCreatingUser(false);
        setNewUser({ rut: '', nombre_completo: '', email: '', rol: 'alumno', curso_id: '', password: '' });
        fetchUsers();
        fetchStudents();
      } else {
        setUserFeedbackMsg(data.message || 'Error al crear usuario');
      }
    } catch (err) {
      setUserFeedbackMsg('Error de conexión');
    }
  };

  const handleUpdateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setUserFeedbackMsg('');
    try {
      const res = await authFetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingUser,
          curso_id: editingUser.curso_id ? Number(editingUser.curso_id) : null
        })
      });
      const data = await res.json();
      if (res.ok) {
        setEditingUser(null);
        fetchUsers();
        fetchStudents();
      } else {
        setUserFeedbackMsg(data.message || 'Error al actualizar usuario');
      }
    } catch (err) {
      setUserFeedbackMsg('Error de conexión');
    }
  };

  const handleDeleteUser = async (id: number, nombre: string) => {
    if (!window.confirm(`¿Eliminar al usuario "${nombre}"?`)) return;
    const res = await authFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchUsers();
      fetchStudents();
    } else {
      const data = await res.json();
      alert(data.message || 'Error al eliminar usuario');
    }
  };

  const handleLogout = async () => { if (!window.confirm('¿Cerrar sesión?')) return; await authFetch('/api/auth/logout', { method: 'POST' }); localStorage.removeItem('token'); logout(); };

  // Grade Handling
  const handleGradeChange = (userId: number, field: keyof GradeRow, value: string) => {
    const sanitized = value.replace(',', '.');
    if (sanitized !== '' && (isNaN(Number(sanitized)) || Number(sanitized) < 1.0 || Number(sanitized) > 7.0)) return;
    setGrades(prev => prev.map(g => g.usuario_id === userId ? { ...g, [field]: sanitized } : g));
  };
  const handleGradeBlur = async (row: GradeRow) => {
    try { await authFetch(`/api/admin/grades/${row.usuario_id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) }); } catch (err) { }
  };

  // Math
  const calcAvg = (vals: (string | null)[]) => {
    const valid = vals.map(v => parseFloat(v || '')).filter(v => !isNaN(v));
    if (valid.length === 0) return null;
    return Number((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1));
  };

  const getStudentAvgs = (row: GradeRow) => {
    const s1 = calcAvg([row.s1_n1, row.s1_n2, row.s1_n3, row.s1_n4, row.s1_n5, row.s1_n6]);
    const s2 = calcAvg([row.s2_n1, row.s2_n2, row.s2_n3, row.s2_n4, row.s2_n5, row.s2_n6]);
    let anual = null; let final = null; let necesitaRecup = false;

    if (s1 !== null && s2 !== null) anual = Number(((s1 + s2) / 2).toFixed(1));
    else if (s1 !== null) anual = s1;
    else if (s2 !== null) anual = s2;

    if (anual !== null) {
      final = anual;
      if (anual < 4.0) {
        necesitaRecup = true;
        if (row.nota_recuperativa) {
          const recup = Number(row.nota_recuperativa);
          if (recup >= 4.0) final = 4.0;
          else final = anual;
        }
      }
    }
    return { s1, s2, anual, final, necesitaRecup };
  };

  const stats = () => {
    const allAvgs = grades.map(g => getStudentAvgs(g).final).filter(a => a !== null) as number[];
    const approved = allAvgs.filter(a => a >= 4.0).length;
    const reprobates = allAvgs.filter(a => a < 4.0).length;
    const total = grades.length;
    const pct = (val: number) => total > 0 ? Math.round((val / total) * 100) : 0;

    return {
      generalAvg: allAvgs.length > 0 ? (allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length).toFixed(1) : '-',
      maxAvg: allAvgs.length > 0 ? Math.max(...allAvgs).toFixed(1) : '-',
      minAvg: allAvgs.length > 0 ? Math.min(...allAvgs).toFixed(1) : '-',
      approved, pctApproved: pct(approved),
      reprobates, pctReprobates: pct(reprobates),
      pending: grades.length - allAvgs.length, pctPending: pct(grades.length - allAvgs.length)
    };
  };
  const st = stats();

  const totalEntregasHoy = submissions.filter(s => new Date(s.fecha_hora_subida).toDateString() === new Date().toDateString()).length;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Oscuro */}
      <aside className={cn(
        "w-72 bg-slate-900 border-r border-slate-800 flex flex-col z-50 fixed inset-y-0 left-0 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">RegNote</h1>
              <span className="text-xs font-medium text-indigo-400 uppercase tracking-widest">Workspace</span>
            </div>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Selector de Curso</div>
          <select 
            value={selectedCourseId} 
            onChange={(e) => {
              setSelectedCourseId(e.target.value ? Number(e.target.value) : '');
              if (activeTab === 'dashboard') setActiveTab('calificaciones');
            }}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium appearance-none"
          >
            <option value="">Todos los cursos</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', adminOnly: false },
            { id: 'calificaciones', icon: Award, label: 'Calificaciones', adminOnly: false },
            { id: 'informes', icon: FileText, label: 'Informes de Notas', adminOnly: false },
            { id: 'asistencia', icon: FileCheck2, label: 'Pasar Asistencia', adminOnly: false },
            { id: 'asistencia_dashboard', icon: BarChart3, label: 'Métricas Asistencia', adminOnly: false },
            { id: 'horario', icon: Calendar, label: 'Horario de Clases', adminOnly: false },
            { id: 'entregas', icon: FileText, label: 'Entregas', adminOnly: false },
            { id: 'alumnos', icon: Users, label: 'Alumnos', adminOnly: false },
            { id: 'asignaturas', icon: Layers, label: 'Asignaturas & Cátedras', adminOnly: true },
            { id: 'cursos', icon: BookOpen, label: 'Cursos', adminOnly: true },
            { id: 'usuarios', icon: UserCheck, label: 'Usuarios / Personal', adminOnly: true }
          ]
          .filter(item => !item.adminOnly || user?.rol === 'administrador' || user?.rol === 'directivo')
          .map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300",
                activeTab === item.id 
                  ? "bg-indigo-500/10 text-indigo-400 shadow-inner" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              )}
            >
              <item.icon className="w-5 h-5" /> {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold overflow-hidden">
                {user?.foto_perfil ? (
                  <img src={user.foto_perfil} alt="Perfil" className="w-full h-full object-cover" />
                ) : (
                  user?.nombre_completo ? user.nombre_completo.charAt(0) : ''
                )}
              </div>
              <div className="text-sm">
                <p className="font-semibold text-white">{user?.nombre_completo ? user.nombre_completo.split(' ')[0] : ''}</p>
                <p className="text-xs text-slate-500">{user?.rol === 'administrador' ? 'Administrador' : 'Profesor'}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-slate-950 relative w-full lg:w-auto">
        {/* Mobile Header */}
        <div className="lg:hidden p-4 border-b border-slate-800 flex items-center gap-4 bg-slate-900/50 backdrop-blur-md sticky top-0 z-20">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg">
            <Menu className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-bold text-white capitalize">{activeTab}</h2>
        </div>

        {/* Decorative ambient light */}
        <div className="absolute top-0 right-0 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full relative z-10 space-y-8">
          
          <AnimatePresence mode="wait">
            {/* Dashboard Start */}
            {activeTab === 'dashboard' && (
              <motion.section 
                key="dash"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-bold text-white tracking-tight">Bienvenido, {user?.nombre_completo}</h2>
                  <p className="text-slate-400 mt-1">Aquí tienes un resumen de la actividad en la plataforma.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500">
                      <FileText className="w-16 h-16 text-indigo-400" />
                    </div>
                    <div className="relative z-10">
                      <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Entregas Hoy</p>
                      <p className="text-5xl font-bold text-white">{totalEntregasHoy}</p>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500">
                      <Users className="w-16 h-16 text-emerald-400" />
                    </div>
                    <div className="relative z-10">
                      <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Total Alumnos</p>
                      <p className="text-5xl font-bold text-white">{students.length}</p>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500">
                      <BookOpen className="w-16 h-16 text-amber-400" />
                    </div>
                    <div className="relative z-10">
                      <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Cursos Activos</p>
                      <p className="text-5xl font-bold text-white">{courses.length}</p>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}

            {/* Calificaciones */}
            {activeTab === 'calificaciones' && selectedCourseId && (
              <motion.section 
                key="grades"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Award className="text-amber-400" /> Libro de Calificaciones
                </h2>
                
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  {[
                    { label: 'Prom General', value: st.generalAvg, color: 'text-white' },
                    { label: 'Nota Mayor', value: st.maxAvg, color: 'text-emerald-400' },
                    { label: 'Nota Menor', value: st.minAvg, color: 'text-rose-400' },
                    { label: 'Aprobados', value: `${st.approved} (${st.pctApproved}%)`, color: 'text-emerald-400' },
                    { label: 'Reprobados', value: `${st.reprobates} (${st.pctReprobates}%)`, color: 'text-rose-400' },
                    { label: 'Pendientes', value: `${st.pending} (${st.pctPending}%)`, color: 'text-amber-400' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-slate-900 border border-slate-800 p-5 rounded-[1.5rem] flex flex-col items-center justify-center text-center shadow-lg">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">{stat.label}</span>
                      <span className={cn("text-2xl font-bold", stat.color)}>{stat.value}</span>
                    </div>
                  ))}
                </div>

                {/* Table */}
                <div className="flex w-max gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800 mb-2">
                  <button onClick={() => setSemesterTab('s1')} className={cn("px-6 py-2 rounded-lg text-sm font-bold transition-all", semesterTab === 's1' ? 'bg-slate-800 text-indigo-400' : 'text-slate-500 hover:text-slate-300')}>1er Semestre</button>
                  <button onClick={() => setSemesterTab('s2')} className={cn("px-6 py-2 rounded-lg text-sm font-bold transition-all", semesterTab === 's2' ? 'bg-slate-800 text-violet-400' : 'text-slate-500 hover:text-slate-300')}>2do Semestre</button>
                </div>
                
                <div className="bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] shadow-xl border border-slate-800 overflow-hidden w-full">
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
                      <thead>
                        <tr className="bg-slate-950/50 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
                          <th className="p-4 sticky left-0 bg-slate-950/90 backdrop-blur-md z-10 w-64 border-r border-slate-800">Alumno</th>
                          {semesterTab === 's1' && (
                            <>
                              <th colSpan={6} className="p-4 text-center border-r border-slate-800 text-indigo-400">1er Semestre</th>
                              <th className="p-4 text-center border-r border-slate-800 text-white bg-indigo-500/10">PROM 1S</th>
                            </>
                          )}
                          {semesterTab === 's2' && (
                            <>
                              <th colSpan={6} className="p-4 text-center border-r border-slate-800 text-violet-400">2do Semestre</th>
                              <th className="p-4 text-center border-r border-slate-800 text-white bg-violet-500/10">PROM 2S</th>
                              <th className="p-4 text-center border-r border-slate-800 text-amber-400">RECUP</th>
                              <th className="p-4 text-center font-bold text-white bg-slate-800">FINAL</th>
                            </>
                          )}
                        </tr>
                        <tr className="bg-slate-900 border-b border-slate-800 text-xs font-mono text-slate-500 text-center">
                          <th className="p-2 sticky left-0 bg-slate-900 z-10 border-r border-slate-800"></th>
                          {semesterTab === 's1' && (
                            <>
                              {[1,2,3,4,5,6].map(n => <th key={`1-${n}`} className="p-2 border-r border-slate-800/50 w-14">N{n}</th>)}
                              <th className="p-2 border-r border-slate-800 bg-indigo-500/5"></th>
                            </>
                          )}
                          {semesterTab === 's2' && (
                            <>
                              {[1,2,3,4,5,6].map(n => <th key={`2-${n}`} className="p-2 border-r border-slate-800/50 w-14">N{n}</th>)}
                              <th className="p-2 border-r border-slate-800 bg-violet-500/5"></th>
                              <th className="p-2 border-r border-slate-800 bg-amber-500/5"></th>
                              <th className="p-2 bg-slate-800/50"></th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-sm font-mono">
                        {grades.map((g) => {
                          const avgs = getStudentAvgs(g);
                          const getColor = (val: number | null) => val === null ? 'text-slate-600' : val >= 4.0 ? 'text-indigo-400 font-bold' : 'text-rose-400 font-bold';

                          return (
                            <tr key={g.usuario_id} className="hover:bg-slate-800/50 transition-colors group">
                              <td className="p-3 sticky left-0 bg-slate-900 group-hover:bg-slate-800/90 border-r border-slate-800 flex items-center justify-between transition-colors">
                                <div className="truncate w-full pr-2 font-sans">
                                  <div className="font-semibold text-slate-200 truncate">{g.nombre_completo}</div>
                                  <div className="text-[10px] text-slate-500 truncate font-mono">{g.rut}</div>
                                </div>
                              </td>
                              
                              {/* S1 */}
                              {semesterTab === 's1' && (
                                <>
                                  {['s1_n1', 's1_n2', 's1_n3', 's1_n4', 's1_n5', 's1_n6'].map((f) => (
                                    <td key={f} className="p-1 border-r border-slate-800/50">
                                      <input 
                                        type="text" value={(g as any)[f] || ''}
                                        onChange={(e) => handleGradeChange(g.usuario_id, f as keyof GradeRow, e.target.value)}
                                        onBlur={() => handleGradeBlur(g)}
                                        className="w-full p-2 text-center bg-transparent focus:bg-slate-950 border border-transparent focus:border-indigo-500 rounded-lg outline-none font-medium text-slate-300 transition-all"
                                        placeholder="-"
                                      />
                                    </td>
                                  ))}
                                  <td className={`p-2 text-center border-r border-slate-800 bg-indigo-500/5 ${getColor(avgs.s1)}`}>
                                    {avgs.s1 !== null ? avgs.s1.toFixed(1) : '-'}
                                  </td>
                                </>
                              )}

                              {/* S2 */}
                              {semesterTab === 's2' && (
                                <>
                                  {['s2_n1', 's2_n2', 's2_n3', 's2_n4', 's2_n5', 's2_n6'].map((f) => (
                                    <td key={f} className="p-1 border-r border-slate-800/50">
                                      <input 
                                        type="text" value={(g as any)[f] || ''}
                                        onChange={(e) => handleGradeChange(g.usuario_id, f as keyof GradeRow, e.target.value)}
                                        onBlur={() => handleGradeBlur(g)}
                                        className="w-full p-2 text-center bg-transparent focus:bg-slate-950 border border-transparent focus:border-violet-500 rounded-lg outline-none font-medium text-slate-300 transition-all"
                                        placeholder="-"
                                      />
                                    </td>
                                  ))}
                                  <td className={`p-2 text-center border-r border-slate-800 bg-violet-500/5 ${getColor(avgs.s2)}`}>
                                    {avgs.s2 !== null ? avgs.s2.toFixed(1) : '-'}
                                  </td>

                                  {/* Recup */}
                                  <td className={`p-1 border-r border-slate-800 text-center ${avgs.necesitaRecup ? 'bg-amber-500/5' : 'bg-transparent'}`}>
                                    {avgs.necesitaRecup ? (
                                      <input 
                                        type="text" value={g.nota_recuperativa || ''}
                                        onChange={(e) => handleGradeChange(g.usuario_id, 'nota_recuperativa', e.target.value)}
                                        onBlur={() => handleGradeBlur(g)}
                                        className="w-full p-2 text-center bg-transparent focus:bg-slate-950 border border-transparent focus:border-amber-500 rounded-lg outline-none font-bold text-amber-400 transition-all"
                                        placeholder="-"
                                      />
                                    ) : (
                                      <span className="text-slate-700">-</span>
                                    )}
                                  </td>

                                  {/* Final */}
                                  <td className={`p-2 text-center bg-slate-800/50 text-base ${getColor(avgs.final)}`}>
                                    {avgs.final !== null ? avgs.final.toFixed(1) : '-'}
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                        {grades.length === 0 && (
                          <tr><td colSpan={17} className="p-8 text-center text-slate-500 font-sans">No hay alumnos en este curso.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.section>
            )}

            {/* Resto de Tabs - Adaptadas a Dark Mode Minimalista */}
            {activeTab === 'entregas' && (
              <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex w-full sm:w-auto gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
                    <button onClick={() => setSubTab('tarea')} className={cn("flex-1 sm:flex-none px-4 md:px-6 py-2.5 rounded-lg text-sm font-bold transition-all", subTab === 'tarea' ? 'bg-slate-800 text-indigo-400' : 'text-slate-500 hover:text-slate-300')}>Tareas</button>
                    <button onClick={() => setSubTab('evaluacion')} className={cn("flex-1 sm:flex-none px-4 md:px-6 py-2.5 rounded-lg text-sm font-bold transition-all", subTab === 'evaluacion' ? 'bg-slate-800 text-violet-400' : 'text-slate-500 hover:text-slate-300')}>Evaluaciones</button>
                  </div>
                  <a href={`/api/admin/download-all?cursoId=${selectedCourseId}&tipo=${subTab}`} className="w-full sm:w-auto justify-center bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20">
                    <Download className="w-4 h-4" /> Descargar {subTab === 'tarea' ? 'Tareas' : 'Evaluaciones'}
                  </a>
                </div>

                <div className="bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] border border-slate-800 overflow-x-auto shadow-xl">
                  <table className="w-full text-left whitespace-nowrap min-w-[600px]">
                    <thead className="bg-slate-950/50">
                      <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800">
                        <th className="p-5">Alumno</th><th className="p-5">Archivo</th><th className="p-5">Fecha</th><th className="p-5 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {submissions.filter(s => s.tipo_entrega === subTab || (!s.tipo_entrega && subTab === 'tarea')).map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-5"><div className="font-semibold text-slate-200">{sub.nombre_completo}</div><div className="text-xs text-slate-500 font-mono mt-1">{sub.rut}</div></td>
                          <td className="p-5 text-slate-300 text-sm flex items-center gap-3"><FileText className="w-5 h-5 text-indigo-400" /> {sub.nombre_original}</td>
                          <td className="p-5 text-slate-400 text-sm">{new Date(sub.fecha_hora_subida).toLocaleString('es-CL')}</td>
                          <td className="p-5 text-center"><a href={`/api/admin/download/${sub.id}`} className="inline-flex p-2 text-indigo-400 hover:bg-indigo-500/20 rounded-lg transition-colors"><Download className="w-5 h-5" /></a></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.section>
            )}

            {activeTab === 'alumnos' && (() => {
              const currentCourseObj = courses.find(c => c.id === selectedCourseId);
              const isJefeOrAdmin = user?.rol === 'administrador' || user?.rol === 'directivo' || (user?.rol === 'profesor' && currentCourseObj?.profesor_jefe_id === user.id);

              return (
                <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">Alumnos Inscritos ({students.length})</h2>
                        <p className="text-slate-400 text-xs mt-0.5">
                          {selectedCourseId === '' ? 'Mostrando todos los alumnos' : `Filtrado por: ${currentCourseObj?.nombre || 'Curso'}`}
                        </p>
                      </div>
                    </div>

                    {!isJefeOrAdmin && selectedCourseId !== '' && (
                      <span className="px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold rounded-xl flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" /> Modo Lectura (Profesor de Asignatura)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Lista de Alumnos Ampliada */}
                    <div className="xl:col-span-2 bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] border border-slate-800 overflow-hidden shadow-xl flex flex-col w-full h-[520px]">
                      <div className="overflow-auto flex-1">
                        <table className="w-full text-left whitespace-nowrap min-w-[550px]">
                          <thead className="bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
                            <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800">
                              <th className="p-4 w-1/4">RUT</th>
                              <th className="p-4 w-1/2">Nombre Completo</th>
                              <th className="p-4 text-center w-1/4">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {students.map(student => {
                              const isEditing = editingStudent?.id === student.id;
                              const isDeleting = deletingStudentId === student.id;

                              if (isEditing && isJefeOrAdmin) {
                                return (
                                  <tr key={student.id} className="bg-indigo-500/10 transition-colors">
                                    <td className="p-3">
                                      <input 
                                        type="text" 
                                        value={editingStudent.rut} 
                                        onChange={e => setEditingStudent({...editingStudent, rut: e.target.value})}
                                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-lg outline-none focus:border-indigo-500 font-mono text-sm"
                                      />
                                    </td>
                                    <td className="p-3">
                                      <input 
                                        type="text" 
                                        value={editingStudent.nombre_completo} 
                                        onChange={e => setEditingStudent({...editingStudent, nombre_completo: e.target.value})}
                                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-lg outline-none focus:border-indigo-500 text-sm font-semibold"
                                      />
                                    </td>
                                    <td className="p-3">
                                      <div className="flex items-center justify-center gap-2">
                                        <button 
                                          onClick={() => handleUpdateStudent()} 
                                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-md"
                                          title="Guardar Cambios"
                                        >
                                          <Check className="w-3.5 h-3.5" /> Aceptar
                                        </button>
                                        <button 
                                          onClick={() => setEditingStudent(null)} 
                                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                                          title="Cancelar Edición"
                                        >
                                          <X className="w-3.5 h-3.5" /> Cancelar
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }

                              if (isDeleting && isJefeOrAdmin) {
                                return (
                                  <tr key={student.id} className="bg-rose-500/10 transition-colors">
                                    <td colSpan={2} className="p-4 text-rose-300 font-medium text-sm">
                                      ¿Confirmar eliminación de <strong>{student.nombre_completo}</strong>?
                                    </td>
                                    <td className="p-4">
                                      <div className="flex items-center justify-center gap-2">
                                        <button 
                                          onClick={() => handleDeleteStudent(student.id)} 
                                          className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-md shadow-rose-600/20"
                                        >
                                          <Check className="w-3.5 h-3.5" /> Aceptar
                                        </button>
                                        <button 
                                          onClick={() => setDeletingStudentId(null)} 
                                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                                        >
                                          <X className="w-3.5 h-3.5" /> Cancelar
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }

                              return (
                                <tr key={student.id} className="hover:bg-slate-800/30 transition-colors">
                                  <td className="p-4 text-slate-400 font-mono text-sm">{student.rut}</td>
                                  <td className="p-4 text-slate-200 font-semibold">{student.nombre_completo}</td>
                                  <td className="p-4 text-center">
                                    {isJefeOrAdmin ? (
                                      <div className="flex items-center justify-center gap-2">
                                        <button 
                                          onClick={() => { setDeletingStudentId(null); setEditingStudent(student); }} 
                                          className="px-3 py-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                                          title="Editar Alumno"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" /> Editar
                                        </button>
                                        <button 
                                          onClick={() => { setEditingStudent(null); setDeletingStudentId(student.id); }} 
                                          className="px-3 py-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                                          title="Eliminar Alumno"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-slate-500 font-medium">Lectura</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                            {students.length === 0 && (
                              <tr>
                                <td colSpan={3} className="p-8 text-center text-slate-500 font-sans">
                                  No hay alumnos en este curso.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Carga Masiva (Solo para Profesor Jefe o Directivo) */}
                    {isJefeOrAdmin ? (
                      <div className="xl:col-span-1 bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] border border-slate-800 p-5 md:p-6 shadow-xl flex flex-col justify-between h-[520px]">
                        <div>
                          <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-400" /> Carga Masiva (Excel)
                          </h3>
                          <p className="text-slate-400 text-xs mb-3">
                            Pega RUT y Nombre separados por coma.
                          </p>
                          <textarea 
                            value={studentsRaw} onChange={e => setStudentsRaw(e.target.value)} 
                            className="w-full h-56 bg-slate-950 border border-slate-800 text-slate-300 p-3.5 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none font-mono text-xs leading-relaxed"
                            placeholder={"11111111-1, Juan Pérez\n22222222-2, María Silva"}
                          />
                        </div>
                        <div>
                          {message && <div className="mb-3 p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl text-xs font-semibold">{message}</div>}
                          <button 
                            onClick={handleBulkAdd} disabled={uploading || !studentsRaw.trim() || selectedCourseId === ''} 
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-lg shadow-indigo-600/20"
                          >
                            {selectedCourseId === '' ? 'Selecciona un curso arriba' : 'Registrar Alumnos'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="xl:col-span-1 bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] border border-slate-800 p-6 shadow-xl flex flex-col justify-center items-center text-center h-[520px]">
                        <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center font-bold mb-3">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-white mb-2">Permisos de Solo Lectura</h3>
                        <p className="text-slate-400 text-xs leading-relaxed max-w-xs">
                          Solo el <strong>Profesor Jefe</strong> asignado a este curso o el equipo <strong>Directivo</strong> pueden agregar, modificar o eliminar alumnos.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.section>
              );
            })()}

            {activeTab === 'cursos' && (
              <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl md:text-2xl font-bold text-white">Gestión de Cursos</h2>
                  <button onClick={() => setIsCreatingCourse(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 md:px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"><Plus className="w-4 h-4" /> <span className="hidden sm:inline">Crear Curso</span></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {courses.map(course => (
                    <div key={course.id} className="bg-slate-900 border border-slate-800 rounded-[1.5rem] p-6 flex flex-col gap-4 group hover:border-slate-700 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center font-mono text-lg group-hover:text-emerald-400 transition-colors">#{course.id}</div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingCourse(course)} className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteCourse(course.id)} className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-white">{course.nombre}</h3>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            {activeTab === 'usuarios' && (
              <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                      <UserCheck className="w-7 h-7 text-indigo-400" /> Gestión de Usuarios y Personal
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Administra alumnos, docentes y usuarios administradores.</p>
                  </div>
                  <button 
                    onClick={() => { setUserFeedbackMsg(''); setIsCreatingUser(true); }} 
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
                  >
                    <Plus className="w-4 h-4" /> <span>Crear Usuario</span>
                  </button>
                </div>

                {/* Filtro por Rol */}
                <div className="flex gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800 w-fit">
                  {(['todos', 'alumno', 'profesor', 'administrador'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setFilterRole(r)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider",
                        filterRole === r ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                      )}
                    >
                      {r === 'todos' ? 'Todos' : r === 'alumno' ? 'Alumnos' : r === 'profesor' ? 'Docentes' : 'Administradores'}
                    </button>
                  ))}
                </div>

                {/* Tabla de Usuarios */}
                <div className="bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] border border-slate-800 overflow-x-auto shadow-xl">
                  <table className="w-full text-left whitespace-nowrap min-w-[700px]">
                    <thead className="bg-slate-950/80 backdrop-blur-md">
                      <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800">
                        <th className="p-5">RUT</th>
                        <th className="p-5">Nombre Completo</th>
                        <th className="p-5">Email</th>
                        <th className="p-5">Rol</th>
                        <th className="p-5">Curso</th>
                        <th className="p-5 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {usersList
                        .filter(u => filterRole === 'todos' || u.rol === filterRole)
                        .map(u => (
                          <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-5 font-mono text-sm text-slate-400">{u.rut}</td>
                            <td className="p-5 font-semibold text-slate-200">{u.nombre_completo}</td>
                            <td className="p-5 text-slate-400 text-sm">{u.email}</td>
                            <td className="p-5">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
                                u.rol === 'administrador' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                u.rol === 'profesor' ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" :
                                "bg-slate-800 text-slate-400 border-slate-700"
                              )}>
                                {u.rol === 'administrador' ? 'Admin' : u.rol === 'profesor' ? 'Docente' : 'Alumno'}
                              </span>
                            </td>
                            <td className="p-5 text-slate-400 text-sm">{u.curso_nombre || '-'}</td>
                            <td className="p-5 flex justify-center gap-2">
                              <button 
                                onClick={() => {
                                  setUserFeedbackMsg('');
                                  setEditingUser({
                                    id: u.id,
                                    rut: u.rut,
                                    nombre_completo: u.nombre_completo,
                                    email: u.email,
                                    rol: u.rol,
                                    curso_id: u.curso_id ? String(u.curso_id) : '',
                                    password: ''
                                  });
                                }} 
                                className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(u.id, u.nombre_completo)} 
                                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      {usersList.filter(u => filterRole === 'todos' || u.rol === filterRole).length === 0 && (
                        <tr><td colSpan={6} className="p-8 text-center text-slate-500 font-sans">No hay usuarios registrados en esta categoría.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.section>
            )}

            {activeTab === 'asistencia' && (
              <motion.section key="asistencia" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <AttendanceSheet 
                  cursoId={selectedCourseId} 
                  cursoNombre={courses.find(c => c.id === selectedCourseId)?.nombre} 
                />
              </motion.section>
            )}

            {activeTab === 'asistencia_dashboard' && (
              <motion.section key="asistencia_dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <AttendanceDashboard 
                  cursoId={selectedCourseId} 
                  cursoNombre={courses.find(c => c.id === selectedCourseId)?.nombre} 
                />
              </motion.section>
            )}

            {activeTab === 'horario' && (
              <motion.section key="horario" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <ScheduleMatrix 
                  cursoId={selectedCourseId} 
                  cursoNombre={courses.find(c => c.id === selectedCourseId)?.nombre}
                  canEdit={user?.rol === 'administrador' || user?.rol === 'directivo' || user?.rol === 'profesor'}
                  teachers={usersList.filter(u => u.rol === 'profesor' || u.rol === 'administrador' || u.rol === 'directivo')}
                />
              </motion.section>
            )}

            {activeTab === 'asignaturas' && (
              <motion.section key="asignaturas" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <SubjectManagement 
                  courses={courses} 
                  teachers={usersList.filter(u => u.rol === 'profesor' || u.rol === 'administrador' || u.rol === 'directivo')} 
                />
              </motion.section>
            )}

            {activeTab === 'informes' && (
              <motion.section key="informes" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <GradeReportModule 
                  courses={courses} 
                  initialCourseId={selectedCourseId}
                  userRole={user?.rol}
                />
              </motion.section>
            )}

          </AnimatePresence>
        </div>
      </main>

      {/* Modales (Minimalistas Dark) */}
      <AnimatePresence>
        {isCreatingCourse && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 w-full max-w-sm shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-6">Nuevo Curso</h3>
              <form onSubmit={handleCreateCourse} className="space-y-4">
                <input type="text" placeholder="Ej. 1ro Medio A" value={newCourseName} onChange={e => setNewCourseName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" required />
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsCreatingCourse(false)} className="flex-1 py-3 text-slate-400 font-semibold hover:bg-slate-800 rounded-xl">Cancelar</button>
                  <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl">Guardar</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
        
        {editingCourse && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 w-full max-w-sm shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-6">Editar Curso</h3>
              <form onSubmit={handleUpdateCourse} className="space-y-4">
                <input type="text" value={editingCourse.nombre} onChange={e => setEditingCourse({...editingCourse, nombre: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" required />
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setEditingCourse(null)} className="flex-1 py-3 text-slate-400 font-semibold hover:bg-slate-800 rounded-xl">Cancelar</button>
                  <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl">Guardar</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Modal Crear Usuario */}
        {isCreatingUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4">Crear Nuevo Usuario</h3>
              {userFeedbackMsg && <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm font-semibold">{userFeedbackMsg}</div>}
              <form onSubmit={handleCreateUserSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">RUT</label>
                  <input type="text" placeholder="12345678-9" value={newUser.rut} onChange={e => setNewUser({...newUser, rut: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:border-indigo-500 font-mono text-sm" required />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Nombre Completo</label>
                  <input type="text" placeholder="Ej. Álvaro Vergara" value={newUser.nombre_completo} onChange={e => setNewUser({...newUser, nombre_completo: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:border-indigo-500 text-sm" required />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Email</label>
                  <input type="email" placeholder="usuario@regnote.cl" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:border-indigo-500 text-sm" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Rol</label>
                    <select value={newUser.rol} onChange={e => setNewUser({...newUser, rol: e.target.value as any})} className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:border-indigo-500 text-sm">
                      <option value="alumno">Alumno</option>
                      <option value="profesor">Docente</option>
                      <option value="directivo">Directivo</option>
                      <option value="administrador">Administrador</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Curso (opcional)</label>
                    <select value={newUser.curso_id} onChange={e => setNewUser({...newUser, curso_id: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:border-indigo-500 text-sm">
                      <option value="">Sin curso</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Contraseña (opcional)</label>
                  <input type="password" placeholder="Definir contraseña inicial" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:border-indigo-500 text-sm" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsCreatingUser(false)} className="flex-1 py-3 text-slate-400 font-semibold hover:bg-slate-800 rounded-xl">Cancelar</button>
                  <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl">Crear</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Modal Editar Usuario */}
        {editingUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4">Editar Usuario</h3>
              {userFeedbackMsg && <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm font-semibold">{userFeedbackMsg}</div>}
              <form onSubmit={handleUpdateUserSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">RUT</label>
                  <input type="text" value={editingUser.rut} onChange={e => setEditingUser({...editingUser, rut: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:border-indigo-500 font-mono text-sm" required />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Nombre Completo</label>
                  <input type="text" value={editingUser.nombre_completo} onChange={e => setEditingUser({...editingUser, nombre_completo: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:border-indigo-500 text-sm" required />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Email</label>
                  <input type="email" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:border-indigo-500 text-sm" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Rol</label>
                    <select value={editingUser.rol} onChange={e => setEditingUser({...editingUser, rol: e.target.value as any})} className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:border-indigo-500 text-sm">
                      <option value="alumno">Alumno</option>
                      <option value="profesor">Docente</option>
                      <option value="directivo">Directivo</option>
                      <option value="administrador">Administrador</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Curso (opcional)</label>
                    <select value={editingUser.curso_id} onChange={e => setEditingUser({...editingUser, curso_id: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:border-indigo-500 text-sm">
                      <option value="">Sin curso</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Cambiar Contraseña (dejar vacío para mantener)</label>
                  <input type="password" placeholder="Nueva contraseña (opcional)" value={editingUser.password || ''} onChange={e => setEditingUser({...editingUser, password: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:border-indigo-500 text-sm" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-3 text-slate-400 font-semibold hover:bg-slate-800 rounded-xl">Cancelar</button>
                  <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl">Guardar</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
