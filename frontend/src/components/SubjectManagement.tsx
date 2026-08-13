import { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, User, Layers, Check } from 'lucide-react';

type Subject = {
  id: number;
  nombre: string;
  codigo: string;
  color: string;
};

type CourseSubject = {
  id: number;
  curso_id: number;
  asignatura_id: number;
  profesor_id: number;
  asignatura_nombre: string;
  asignatura_codigo: string;
  asignatura_color: string;
  profesor_nombre: string;
  curso_nombre: string;
};

type Props = {
  courses: { id: number; nombre: string }[];
  teachers: { id: number; nombre_completo: string }[];
};

export default function SubjectManagement({ courses, teachers }: Props) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courseSubjects, setCourseSubjects] = useState<CourseSubject[]>([]);
  const [selectedCourseId] = useState<number | ''>('');
  
  const [newSub, setNewSub] = useState({ nombre: '', codigo: '', color: '#6366f1' });
  const [assign, setAssign] = useState({ curso_id: '', asignatura_id: '', profesor_id: '' });
  const [msg, setMsg] = useState('');

  const authFetch = (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
      ...options.headers,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    return fetch(url, { ...options, headers, credentials: 'include' });
  };

  const fetchSubjects = async () => {
    try {
      const res = await authFetch('/api/academic/subjects');
      if (res.ok) setSubjects(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAssignments = async () => {
    try {
      const res = await authFetch(`/api/academic/course-subjects${selectedCourseId ? `?cursoId=${selectedCourseId}` : ''}`);
      if (res.ok) setCourseSubjects(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [selectedCourseId]);

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSub.nombre.trim() || !newSub.codigo.trim()) return;
    try {
      const res = await authFetch('/api/academic/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSub)
      });
      if (res.ok) {
        setNewSub({ nombre: '', codigo: '', color: '#6366f1' });
        fetchSubjects();
      } else {
        const d = await res.json();
        alert(d.message || 'Error al crear asignatura');
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const handleDeleteSubject = async (id: number) => {
    if (!window.confirm('¿Eliminar esta asignatura y todas sus asignaciones?')) return;
    try {
      const res = await authFetch(`/api/academic/subjects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchSubjects();
        fetchAssignments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assign.curso_id || !assign.asignatura_id || !assign.profesor_id) return;
    setMsg('');
    try {
      const res = await authFetch('/api/academic/course-subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          curso_id: Number(assign.curso_id),
          asignatura_id: Number(assign.asignatura_id),
          profesor_id: Number(assign.profesor_id)
        })
      });
      const d = await res.json();
      setMsg(d.message || 'Procesado');
      if (res.ok) fetchAssignments();
    } catch (err) {
      setMsg('Error al asignar');
    }
  };

  const handleRemoveAssignment = async (id: number) => {
    try {
      const res = await authFetch(`/api/academic/course-subjects/${id}`, { method: 'DELETE' });
      if (res.ok) fetchAssignments();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Crear Asignatura */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-white">Nueva Asignatura</h3>
          </div>

          <form onSubmit={handleCreateSubject} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nombre Materia</label>
              <input
                type="text"
                placeholder="Ej. Matemáticas"
                value={newSub.nombre}
                onChange={e => setNewSub({ ...newSub, nombre: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-4 py-2.5 rounded-xl text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Código Corto</label>
              <input
                type="text"
                placeholder="Ej. MAT"
                value={newSub.codigo}
                onChange={e => setNewSub({ ...newSub, codigo: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-4 py-2.5 rounded-xl text-sm font-mono uppercase"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Color Distintivo</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={newSub.color}
                  onChange={e => setNewSub({ ...newSub, color: e.target.value })}
                  className="w-12 h-10 bg-transparent cursor-pointer rounded-lg border border-slate-800"
                />
                <span className="text-xs font-mono text-slate-400">{newSub.color}</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Registrar Materia
            </button>
          </form>
        </div>

        {/* Lista de Asignaturas */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-xl space-y-4">
          <h3 className="text-xl font-bold text-white">Catálogo de Asignaturas ({subjects.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {subjects.map(s => (
              <div
                key={s.id}
                style={{ borderLeftColor: s.color }}
                className="bg-slate-950 border border-slate-800 border-l-4 p-4 rounded-xl flex items-center justify-between group"
              >
                <div>
                  <h4 className="font-bold text-slate-200 text-sm">{s.nombre}</h4>
                  <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded mt-1 inline-block">{s.codigo}</span>
                </div>
                <button
                  onClick={() => handleDeleteSubject(s.id)}
                  className="p-2 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Asignación de Profesores a Cursos */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 md:p-8 shadow-xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">Asignación de Profesores por Curso</h3>
            <p className="text-slate-400 text-xs mt-0.5">Asocia qué profesor imparte cada asignatura en cada curso.</p>
          </div>
        </div>

        <form onSubmit={handleAssignSubject} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">1. Curso</label>
            <select
              value={assign.curso_id}
              onChange={e => setAssign({ ...assign, curso_id: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl text-sm"
              required
            >
              <option value="">-- Seleccionar Curso --</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">2. Asignatura</label>
            <select
              value={assign.asignatura_id}
              onChange={e => setAssign({ ...assign, asignatura_id: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl text-sm"
              required
            >
              <option value="">-- Seleccionar Asignatura --</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.nombre} ({s.codigo})</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">3. Profesor a Cargo</label>
            <select
              value={assign.profesor_id}
              onChange={e => setAssign({ ...assign, profesor_id: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl text-sm"
              required
            >
              <option value="">-- Seleccionar Profesor --</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.nombre_completo}</option>)}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-sm transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Asignar Cátedra
            </button>
          </div>
        </form>

        {msg && <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-bold">{msg}</div>}

        {/* Tabla de Cátedras Asignadas */}
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-950 border-b border-slate-800 text-xs font-bold text-slate-500 uppercase">
              <tr>
                <th className="p-4">Curso</th>
                <th className="p-4">Asignatura</th>
                <th className="p-4">Profesor Asignado</th>
                <th className="p-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {courseSubjects.map(cs => (
                <tr key={cs.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 font-bold text-slate-200">{cs.curso_nombre}</td>
                  <td className="p-4">
                    <span style={{ backgroundColor: `${cs.asignatura_color}20`, color: cs.asignatura_color }} className="px-2.5 py-1 rounded-lg font-semibold text-xs border border-current">
                      {cs.asignatura_nombre} ({cs.asignatura_codigo})
                    </span>
                  </td>
                  <td className="p-4 text-slate-300 font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-400" /> {cs.profesor_nombre}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleRemoveAssignment(cs.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {courseSubjects.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    No hay asignaciones de asignaturas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
