import { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Clock, BookOpen, MapPin, User, Loader2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type ScheduleSlot = {
  id: number;
  curso_id: number;
  asignatura_id: number;
  profesor_id: number;
  dia_semana: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes';
  bloque_hora: string;
  sala: string;
  asignatura_nombre?: string;
  asignatura_codigo?: string;
  asignatura_color?: string;
  profesor_nombre?: string;
};

type Props = {
  cursoId: number | '';
  cursoNombre?: string;
  canEdit?: boolean;
  subjects?: { id: number; nombre: string; codigo: string }[];
  teachers?: { id: number; nombre_completo: string }[];
};

const DIAS: ('Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes')[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

// Bloques para Cursos Regulares / Diurnos (1° Medio A - 4° Medio E)
const BLOQUES_DIURNOS = [
  '08:15 - 09:45',
  '10:05 - 11:35',
  '11:45 - 13:15',
  '14:05 - 15:35',
  '15:45 - 16:30'
];

// Bloques para Cursos Vespertinos (1 y 2 A, 1 y 2 B, 3 y 4 A, 3 y 4 B)
const BLOQUES_VESPERTINOS = [
  '18:10 - 19:20',
  '19:10 - 20:30',
  '20:50 - 21:50',
  '20:50 - 22:00',
  '21:00 - 22:00'
];

const getValidBlocksForDay = (dia: string, isVesper: boolean): string[] => {
  if (!isVesper) return BLOQUES_DIURNOS;
  if (dia === 'Lunes' || dia === 'Miércoles' || dia === 'Viernes') {
    return ['19:10 - 20:30', '20:50 - 22:00'];
  }
  if (dia === 'Martes' || dia === 'Jueves') {
    return ['18:10 - 19:20', '20:50 - 21:50', '21:00 - 22:00'];
  }
  return [];
};

export default function ScheduleMatrix({ cursoId, cursoNombre, canEdit = false, subjects = [], teachers = [] }: Props) {
  const [schedules, setSchedules] = useState<ScheduleSlot[]>([]);
  const [subjectsList, setSubjectsList] = useState<{ id: number; nombre: string; codigo: string }[]>(subjects);
  const [teachersList, setTeachersList] = useState<{ id: number; nombre_completo: string }[]>(teachers);
  const [courseAssignments, setCourseAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isVespertino = Boolean(
    cursoNombre && (cursoNombre.toLowerCase().includes('1 y 2') || cursoNombre.toLowerCase().includes('3 y 4'))
  );

  const activeBlocks = isVespertino ? BLOQUES_VESPERTINOS : BLOQUES_DIURNOS;

  const [newSlot, setNewSlot] = useState({
    asignatura_id: '',
    profesor_id: '',
    dia_semana: 'Lunes' as 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes',
    bloque_hora: getValidBlocksForDay('Lunes', isVespertino)[0] || activeBlocks[0],
    sala: 'Sala de Clases'
  });

  useEffect(() => {
    const valid = getValidBlocksForDay(newSlot.dia_semana, isVespertino);
    if (!valid.includes(newSlot.bloque_hora)) {
      setNewSlot(prev => ({ ...prev, bloque_hora: valid[0] || activeBlocks[0] }));
    }
  }, [newSlot.dia_semana, isVespertino]);

  const authFetch = (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
      ...options.headers,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    return fetch(url, { ...options, headers, credentials: 'include' });
  };

  const fetchScheduleAndAux = async () => {
    if (!cursoId) return;
    setLoading(true);
    try {
      // 1. Horarios
      const resSched = await authFetch(`/api/academic/schedules/course/${cursoId}`);
      if (resSched.ok) setSchedules(await resSched.json());

      // 2. Asignaturas globales
      const resSub = await authFetch('/api/academic/subjects');
      if (resSub.ok) {
        const subs = await resSub.json();
        setSubjectsList(subs);
      }

      // 3. Profesores
      const resTeach = await authFetch('/api/admin/users?rol=profesor');
      if (resTeach.ok) {
        const teachs = await resTeach.json();
        setTeachersList(teachs);
      }

      // 4. Asignaciones de Asignatura (Curso - Asignatura - Profesor)
      const resCA = await authFetch(`/api/academic/course-subjects?cursoId=${cursoId}`);
      if (resCA.ok) {
        setCourseAssignments(await resCA.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduleAndAux();
  }, [cursoId]);

  const handleAsignaturaChange = (asigId: string) => {
    const matchedCA = courseAssignments.find(ca => String(ca.asignatura_id) === String(asigId));
    setNewSlot(prev => ({
      ...prev,
      asignatura_id: asigId,
      profesor_id: matchedCA ? String(matchedCA.profesor_id) : prev.profesor_id
    }));
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cursoId || !newSlot.asignatura_id || !newSlot.profesor_id) return;

    try {
      const res = await authFetch('/api/academic/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          curso_id: cursoId,
          asignatura_id: Number(newSlot.asignatura_id),
          profesor_id: Number(newSlot.profesor_id),
          dia_semana: newSlot.dia_semana,
          bloque_hora: newSlot.bloque_hora,
          sala: newSlot.sala
        })
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchScheduleAndAux();
      } else {
        const data = await res.json();
        alert(data.message || 'Error al guardar bloque');
      }
    } catch (err) {
      console.error('Error al crear bloque:', err);
      alert('Error al guardar el bloque en el servidor');
    }
  };

  const handleDeleteSlot = async (id: number) => {
    if (!window.confirm('¿Eliminar esta clase del horario?')) return;
    try {
      const res = await authFetch(`/api/academic/schedules/${id}`, { method: 'DELETE' });
      if (res.ok) fetchScheduleAndAux();
    } catch (err) {
      console.error(err);
    }
  };

  if (!cursoId) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-12 text-center text-slate-500 font-medium">
        Selecciona un curso para ver u organizar su horario de clases.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 md:p-8 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Horario de Clases</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              {cursoNombre || `Curso #${cursoId}`} • {isVespertino ? 'Jornada Vespertina (Adultos)' : 'Jornada Diurna'}
            </p>
          </div>
        </div>

        {canEdit && (
          <button
            onClick={() => {
              const valid = getValidBlocksForDay(newSlot.dia_semana, isVespertino);
              setNewSlot(prev => ({ ...prev, bloque_hora: valid[0] || activeBlocks[0] }));
              setIsModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Agregar Bloque
          </button>
        )}
      </div>

      {/* Banner de Información de Jornada */}
      <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center gap-3 text-indigo-300 text-xs font-semibold">
        <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />
        <span>
          {isVespertino
            ? 'Horario Vespertino: Lu, Mi, Vi (19:10-20:30 / 20:50-22:00) | Ma, Ju (18:10-19:20 / 20:50-21:50 / 21:00-22:00)'
            : 'Horario Diurno: Lu a Vi (08:15-09:45 / 10:05-11:35 / 11:45-13:15 / 14:05-15:35 / 15:45-16:30)'
          }
        </span>
      </div>

      {/* Matriz del Horario Semanal */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-500" /> Cargando horario de clases...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse min-w-[800px]">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-4 w-36 border-r border-slate-800 text-left">Hora / Bloque</th>
                  {DIAS.map(dia => (
                    <th key={dia} className="p-4">{dia}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {activeBlocks.map(bloque => (
                  <tr key={bloque} className="hover:bg-slate-800/20">
                    <td className="p-3 font-mono font-semibold text-slate-400 text-xs bg-slate-950/40 border-r border-slate-800 text-left">
                      <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-indigo-400" /> {bloque}</div>
                    </td>
                    {DIAS.map(dia => {
                      const isValidForThisDay = getValidBlocksForDay(dia, isVespertino).includes(bloque);
                      const slot = schedules.find(s => s.dia_semana === dia && s.bloque_hora === bloque);

                      if (!isValidForThisDay) {
                        return (
                          <td key={dia} className="p-2 border-r border-slate-800/50 last:border-r-0 bg-slate-950/20 text-slate-700 text-xs font-mono">
                            -
                          </td>
                        );
                      }

                      return (
                        <td key={dia} className="p-2 border-r border-slate-800/50 last:border-r-0 align-top">
                          {slot ? (
                            <div
                              style={{ backgroundColor: `${slot.asignatura_color || '#6366f1'}20`, borderColor: `${slot.asignatura_color || '#6366f1'}40` }}
                              className="p-3 rounded-xl border text-left space-y-1 relative group transition-all"
                            >
                              <div className="font-bold text-white text-xs flex items-center justify-between">
                                <span className="truncate">{slot.asignatura_nombre}</span>
                                {canEdit && (
                                  <button
                                    onClick={() => handleDeleteSlot(slot.id)}
                                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 p-1 transition-opacity"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-300 font-medium flex items-center gap-1 truncate">
                                <User className="w-3 h-3 text-slate-400" /> {slot.profesor_nombre}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-500" /> {slot.sala}
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                if (!canEdit) return;
                                setNewSlot({
                                  asignatura_id: '',
                                  profesor_id: '',
                                  dia_semana: dia,
                                  bloque_hora: bloque,
                                  sala: 'Sala de Clases'
                                });
                                setIsModalOpen(true);
                              }}
                              className={`h-16 border border-dashed rounded-xl flex items-center justify-center text-xs transition-colors ${
                                canEdit ? 'border-slate-800 hover:border-indigo-500/50 text-slate-500 hover:text-indigo-400 cursor-pointer' : 'border-slate-800/60 text-slate-700'
                              }`}
                            >
                              {canEdit ? '+ Asignar' : '-'}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para Agregar Bloque */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" /> Agregar Bloque al Horario
              </h3>

              <form onSubmit={handleCreateSlot} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Día de la semana</label>
                  <select
                    value={newSlot.dia_semana}
                    onChange={e => {
                      const d = e.target.value as any;
                      const valid = getValidBlocksForDay(d, isVespertino);
                      setNewSlot({
                        ...newSlot,
                        dia_semana: d,
                        bloque_hora: valid[0] || activeBlocks[0]
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-4 py-2.5 rounded-xl text-sm"
                  >
                    {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Bloque de Hora</label>
                  <select
                    value={newSlot.bloque_hora}
                    onChange={e => setNewSlot({ ...newSlot, bloque_hora: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-4 py-2.5 rounded-xl text-sm font-mono"
                  >
                    {getValidBlocksForDay(newSlot.dia_semana, isVespertino).map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Asignatura</label>
                  <select
                    value={newSlot.asignatura_id}
                    onChange={e => handleAsignaturaChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium"
                    required
                  >
                    <option value="">-- Seleccionar Asignatura --</option>
                    {subjectsList.map(s => {
                      const isAssignedToCourse = courseAssignments.some(ca => String(ca.asignatura_id) === String(s.id));
                      return (
                        <option key={s.id} value={s.id}>
                          {s.nombre} ({s.codigo}) {isAssignedToCourse ? '✓ Asignatura Vinculada' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Profesor a Cargo</label>
                  <select
                    value={newSlot.profesor_id}
                    onChange={e => setNewSlot({ ...newSlot, profesor_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium"
                    required
                  >
                    <option value="">-- Seleccionar Profesor --</option>
                    {teachersList.map(t => <option key={t.id} value={t.id}>{t.nombre_completo}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Sala / Laboratorio</label>
                  <input
                    type="text"
                    value={newSlot.sala}
                    onChange={e => setNewSlot({ ...newSlot, sala: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-4 py-2.5 rounded-xl text-sm"
                    placeholder="Ej. Sala 12 / Lab Computación"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/20"
                  >
                    Guardar Bloque
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-3 rounded-xl text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
