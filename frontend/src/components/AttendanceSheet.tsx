import { useState, useEffect } from 'react';
import { Users, Calendar, CheckCircle2, XCircle, Clock, ShieldCheck, FileCheck2, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type StudentAttendance = {
  usuario_id: number;
  rut: string;
  nombre_completo: string;
  estado: 'presente' | 'ausente' | 'atrasado' | null;
  hora_llegada?: string;
  tiene_pase?: boolean;
  observacion?: string;
};

type Props = {
  cursoId: number | '';
  cursoNombre?: string;
};

export default function AttendanceSheet({ cursoId, cursoNombre }: Props) {
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Modal para Pase de Atraso
  const [selectedStudentPass, setSelectedStudentPass] = useState<StudentAttendance | null>(null);
  const [passMotivo, setPassMotivo] = useState('Ingreso con pase de atraso desde inspectoría');
  const [passHora, setPassHora] = useState(new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false }));
  const [passLoading, setPassLoading] = useState(false);

  const authFetch = (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
      ...options.headers,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    return fetch(url, { ...options, headers, credentials: 'include' });
  };

  const fetchSheet = async () => {
    if (!cursoId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/academic/attendance/sheet?cursoId=${cursoId}&fecha=${fecha}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.map((s: any) => ({
          ...s,
          estado: s.estado || 'presente',
          hora_llegada: s.hora_llegada || (s.estado === 'atrasado' ? '08:15' : '')
        })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheet();
  }, [cursoId, fecha]);

  const handleToggleState = (usuario_id: number, nextState: 'presente' | 'ausente' | 'atrasado') => {
    setStudents(prev => prev.map(s => {
      if (s.usuario_id === usuario_id) {
        const defaultTime = s.hora_llegada || new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
        return {
          ...s,
          estado: nextState,
          hora_llegada: nextState === 'atrasado' ? defaultTime : ''
        };
      }
      return s;
    }));
  };

  const handleTimeChange = (usuario_id: number, timeStr: string) => {
    setStudents(prev => prev.map(s => s.usuario_id === usuario_id ? { ...s, hora_llegada: timeStr } : s));
  };

  const handleSaveSheet = async () => {
    if (!cursoId) return;
    setSaving(true);
    setMsg('');
    try {
      const res = await authFetch('/api/academic/attendance/sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cursoId,
          fecha,
          registros: students.map(s => ({
            usuario_id: s.usuario_id,
            estado: s.estado,
            hora_llegada: s.hora_llegada || null,
            observacion: s.observacion
          }))
        })
      });
      const data = await res.json();
      setMsg(data.message || (res.ok ? 'Asistencia guardada' : 'Error al guardar'));
      if (res.ok) fetchSheet();
    } catch (err) {
      setMsg('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentPass || !cursoId) return;
    setPassLoading(true);
    try {
      const res = await authFetch('/api/academic/attendance/pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alumnoId: selectedStudentPass.usuario_id,
          cursoId,
          fecha,
          horaLlegada: passHora,
          motivo: passMotivo
        })
      });
      if (res.ok) {
        setSelectedStudentPass(null);
        setPassMotivo('Ingreso con pase de atraso desde inspectoría');
        fetchSheet();
      } else {
        const data = await res.json();
        alert(data.message || 'Error al aplicar pase');
      }
    } catch (err) {
      alert('Error de conexión');
    } finally {
      setPassLoading(false);
    }
  };

  const summary = {
    presentes: students.filter(s => s.estado === 'presente').length,
    ausentes: students.filter(s => s.estado === 'ausente').length,
    atrasados: students.filter(s => s.estado === 'atrasado').length,
  };

  if (!cursoId) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-12 text-center text-slate-500 font-medium">
        Por favor, selecciona un curso en el menú superior para registrar la asistencia.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado y Selector de Fecha */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 md:p-8 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center font-bold">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Toma de Asistencia</h2>
              <p className="text-slate-400 text-xs mt-0.5">{cursoNombre || `Curso #${cursoId}`}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="bg-transparent text-slate-200 text-sm font-semibold outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleSaveSheet}
            disabled={saving || loading || students.length === 0}
            className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Guardar Lista
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl text-sm font-bold text-center">
          {msg}
        </div>
      )}

      {/* Tarjetas de Resumen KPI de Asistencia del día */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Presentes</span>
            <div className="text-3xl font-black text-emerald-400 mt-1">{summary.presentes}</div>
          </div>
          <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ausentes</span>
            <div className="text-3xl font-black text-rose-400 mt-1">{summary.ausentes}</div>
          </div>
          <div className="w-10 h-10 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center font-bold">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Atrasados</span>
            <div className="text-3xl font-black text-amber-400 mt-1">{summary.atrasados}</div>
          </div>
          <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Lista de Alumnos con Toggle de Estado */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" /> Cargando nómina del curso...
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No hay alumnos matriculados en este curso.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap min-w-[600px]">
              <thead className="bg-slate-950/80 border-b border-slate-800">
                <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">Alumno</th>
                  <th className="p-4 text-center">Estado de Asistencia</th>
                  <th className="p-4 text-center">Pase de Atraso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {students.map(student => (
                  <tr key={student.usuario_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-slate-200">{student.nombre_completo}</div>
                      <div className="text-xs font-mono text-slate-500">{student.rut}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleState(student.usuario_id, 'presente')}
                          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                            student.estado === 'presente'
                              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                              : 'bg-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-slate-700'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" /> Presente
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleState(student.usuario_id, 'ausente')}
                          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                            student.estado === 'ausente'
                              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                              : 'bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700'
                          }`}
                        >
                          <XCircle className="w-4 h-4" /> Ausente
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleState(student.usuario_id, 'atrasado')}
                          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                            student.estado === 'atrasado'
                              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                              : 'bg-slate-800 text-slate-400 hover:text-amber-400 hover:bg-slate-700'
                          }`}
                        >
                          <Clock className="w-4 h-4" /> Atrasado
                        </button>

                        {student.estado === 'atrasado' && (
                          <input
                            type="time"
                            value={student.hora_llegada || '08:15'}
                            onChange={e => handleTimeChange(student.usuario_id, e.target.value)}
                            className="bg-slate-950 border border-slate-700 text-amber-300 px-3 py-1.5 rounded-xl text-xs font-mono outline-none focus:border-amber-500"
                            title="Hora de llegada"
                          />
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {student.tiene_pase ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-lg">
                          <ShieldCheck className="w-4 h-4" /> Con Pase ({student.hora_llegada || 's/h'})
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedStudentPass(student);
                            setPassHora(student.hora_llegada || new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false }));
                          }}
                          className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Ingresar Pase
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para Aplicar Pase de Atraso */}
      <AnimatePresence>
        {selectedStudentPass && (
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
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center font-bold">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Ingreso con Pase de Atraso</h3>
                  <p className="text-slate-400 text-xs mt-0.5">{selectedStudentPass.nombre_completo}</p>
                </div>
              </div>

              <form onSubmit={handleApplyPass} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Hora de Llegada
                  </label>
                  <input
                    type="time"
                    value={passHora}
                    onChange={e => setPassHora(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 p-3 rounded-xl outline-none focus:border-indigo-500 font-mono text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Motivo / Observación del Pase
                  </label>
                  <textarea
                    rows={3}
                    value={passMotivo}
                    onChange={e => setPassMotivo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 p-3 rounded-xl outline-none focus:border-indigo-500 text-sm resize-none"
                    required
                  />
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs rounded-xl">
                  Al registrar este pase, la asistencia del alumno se actualizará automáticamente a <strong>Presente</strong> dejando registro auditado.
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={passLoading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-emerald-600/20"
                  >
                    {passLoading ? 'Guardando...' : 'Confirmar Pase y Marcar Presente'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStudentPass(null)}
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
