import { useState, useEffect } from 'react';
import { BarChart3, Calendar, CheckCircle2, XCircle, Clock, ShieldCheck, TrendingUp, BookOpen, UserCheck, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

type Props = {
  cursoId: number | '';
  cursoNombre?: string;
};

export default function AttendanceDashboard({ cursoId, cursoNombre }: Props) {
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'dia' | 'asignaturas' | 'individual' | 'criticos'>('dia');

  const authFetch = (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
      ...options.headers,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    return fetch(url, { ...options, headers, credentials: 'include' });
  };

  const fetchDashboardData = async () => {
    if (!cursoId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/academic/attendance/dashboard?cursoId=${cursoId}&fecha=${fecha}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [cursoId, fecha]);

  if (!cursoId) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-12 text-center text-slate-500 font-medium">
        Selecciona un curso en el menú superior para revisar sus métricas de asistencia.
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-12 text-center text-slate-500 font-medium">
        Cargando estadísticas de asistencia...
      </div>
    );
  }

  const { totalAlumnos = 0, stats = {}, detalleDia = { presentes: [], ausentes: [], atrasados: [] }, porAsignatura = [], alumnosIndividual = [], criticos = [] } = data || {};

  const totalReg = Number(stats.total_registros || 0);
  const totalPresentesGlobal = Number(stats.total_presentes || 0);
  const pctGlobal = totalReg > 0 ? Number(((totalPresentesGlobal / totalReg) * 100).toFixed(1)) : 100;

  return (
    <div className="space-y-6">
      {/* Encabezado y Selector de Fecha */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 md:p-8 shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center font-bold">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Métricas y Resumen de Asistencia</h2>
            <p className="text-slate-400 text-xs mt-0.5">{cursoNombre || `Curso #${cursoId}`} • Matrícula Total: {totalAlumnos} Alumnos</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          {/* Selector de Día */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-slate-500 uppercase">Día:</span>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="bg-transparent text-slate-200 text-sm font-semibold outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-4 py-2.5 rounded-xl text-sm font-bold">
            <TrendingUp className="w-4 h-4" /> Asistencia Global: {pctGlobal}%
          </div>
        </div>
      </div>

      {/* Tarjetas KPI de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Presentes Hoy / Fecha</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white">{detalleDia.presentes.length}</div>
          <p className="text-xs text-emerald-400 mt-1 font-semibold">Alumnos en la sala ({fecha})</p>
        </motion.div>

        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.05 }} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ausentes Hoy / Fecha</span>
            <XCircle className="w-5 h-5 text-rose-400" />
          </div>
          <div className="text-3xl font-black text-white">{detalleDia.ausentes.length}</div>
          <p className="text-xs text-rose-400 mt-1 font-semibold">Alumnos que no asistieron</p>
        </motion.div>

        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Atrasados Hoy / Fecha</span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-white">{detalleDia.atrasados.length}</div>
          <p className="text-xs text-amber-400 mt-1 font-semibold">Llegadas diferidas con hora</p>
        </motion.div>

        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15 }} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pases de Atraso</span>
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-white">{Number(stats.total_pases || 0)}</div>
          <p className="text-xs text-indigo-400 mt-1 font-semibold">Ingresos justificados acumulados</p>
        </motion.div>
      </div>

      {/* Subnavegación de Vistas del Resumen */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-900 rounded-2xl border border-slate-800">
        <button
          onClick={() => setActiveSubTab('dia')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
            activeSubTab === 'dia' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" /> Detalle del Día ({fecha})
        </button>

        <button
          onClick={() => setActiveSubTab('asignaturas')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
            activeSubTab === 'asignaturas' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Asistencia por Asignatura
        </button>

        <button
          onClick={() => setActiveSubTab('individual')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
            activeSubTab === 'individual' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" /> Asistencia Individual Alumnos
        </button>

        <button
          onClick={() => setActiveSubTab('criticos')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
            activeSubTab === 'criticos' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-400" /> Alertas / Inasistencias
        </button>
      </div>

      {/* VISTA 1: Detalle del Día Seleccionado */}
      {activeSubTab === 'dia' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Columna Presentes */}
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-xl flex flex-col h-[480px]">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="font-bold text-emerald-400 flex items-center gap-2 text-base">
                <CheckCircle2 className="w-5 h-5" /> Alumnos Presentes ({detalleDia.presentes.length})
              </h3>
            </div>
            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {detalleDia.presentes.map((p: any) => (
                <div key={p.usuario_id} className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200 text-sm">{p.nombre_completo}</div>
                    <div className="text-xs font-mono text-slate-500">{p.rut}</div>
                  </div>
                  {p.tiene_pase && (
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded">
                      Con Pase
                    </span>
                  )}
                </div>
              ))}
              {detalleDia.presentes.length === 0 && (
                <div className="text-slate-500 text-xs text-center py-12">No hay registros de alumnos presentes en esta fecha.</div>
              )}
            </div>
          </div>

          {/* Columna Ausentes */}
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-xl flex flex-col h-[480px]">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="font-bold text-rose-400 flex items-center gap-2 text-base">
                <XCircle className="w-5 h-5" /> Alumnos Ausentes ({detalleDia.ausentes.length})
              </h3>
            </div>
            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {detalleDia.ausentes.map((a: any) => (
                <div key={a.usuario_id} className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200 text-sm">{a.nombre_completo}</div>
                    <div className="text-xs font-mono text-slate-500">{a.rut}</div>
                  </div>
                  <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold rounded">
                    Falta
                  </span>
                </div>
              ))}
              {detalleDia.ausentes.length === 0 && (
                <div className="text-slate-500 text-xs text-center py-12">¡Sin faltas registradas en esta fecha!</div>
              )}
            </div>
          </div>

          {/* Columna Atrasados con Hora de Llegada */}
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-xl flex flex-col h-[480px]">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="font-bold text-amber-400 flex items-center gap-2 text-base">
                <Clock className="w-5 h-5" /> Atrasados ({detalleDia.atrasados.length})
              </h3>
            </div>
            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {detalleDia.atrasados.map((t: any) => (
                <div key={t.usuario_id} className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200 text-sm">{t.nombre_completo}</div>
                    <div className="text-xs font-mono text-slate-500">{t.rut}</div>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-mono font-bold rounded-lg inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {t.hora_llegada || '08:15'}
                    </span>
                  </div>
                </div>
              ))}
              {detalleDia.atrasados.length === 0 && (
                <div className="text-slate-500 text-xs text-center py-12">Sin atrasos registrados en esta fecha.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: Asistencia por Asignatura */}
      {activeSubTab === 'asignaturas' && (
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 md:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" /> Asistencia del Curso por Asignatura
            </h3>
            <span className="text-xs font-bold text-slate-500">Cátedras Oficiales</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {porAsignatura.map((sub: any) => {
              const total = Number(sub.total_clases || 0);
              const p = Number(sub.presentes || 0);
              const pct = total > 0 ? Math.round((p / total) * 100) : 100;
              return (
                <div
                  key={sub.asignatura_id}
                  style={{ borderLeftColor: sub.asignatura_color || '#6366f1' }}
                  className="bg-slate-950 border border-slate-800 border-l-4 p-5 rounded-2xl space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-base">{sub.asignatura_nombre}</h4>
                      <span className="text-xs font-mono text-slate-400">{sub.asignatura_codigo}</span>
                    </div>
                    <span className={`text-xl font-black ${pct >= 85 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {pct}%
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden">
                    <div style={{ width: `${pct}%`, backgroundColor: sub.asignatura_color || '#6366f1' }} className="h-full rounded-full transition-all" />
                  </div>

                  <div className="flex justify-between text-xs text-slate-400 font-medium">
                    <span>Presentes: <strong className="text-emerald-400">{sub.presentes}</strong></span>
                    <span>Ausentes: <strong className="text-rose-400">{sub.ausentes}</strong></span>
                    <span>Atrasos: <strong className="text-amber-400">{sub.atrasados}</strong></span>
                  </div>
                </div>
              );
            })}
            {porAsignatura.length === 0 && (
              <div className="col-span-full p-8 text-center text-slate-500">
                No hay asignaturas asociadas aún a este curso.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISTA 3: Asistencia Individual por Alumno */}
      {activeSubTab === 'individual' && (
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 md:p-8 shadow-xl space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-400" /> Resumen de Asistencia Individual por Alumno
            </h3>
            <span className="text-xs font-bold text-slate-500">Matrícula ({alumnosIndividual.length})</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap min-w-[700px]">
              <thead className="bg-slate-950 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase">
                <tr>
                  <th className="p-4">Alumno</th>
                  <th className="p-4 text-center">Días Registrados</th>
                  <th className="p-4 text-center">Presentes</th>
                  <th className="p-4 text-center">Inasistencias</th>
                  <th className="p-4 text-center">Atrasos</th>
                  <th className="p-4 text-center">% Asistencia</th>
                  <th className="p-4">Detalle Atrasos (Fecha y Hora)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {alumnosIndividual.map((al: any) => {
                  const total = Number(al.total_dias || 0);
                  const p = Number(al.presentes || 0);
                  const pct = total > 0 ? Number(((p / total) * 100).toFixed(1)) : 100;
                  return (
                    <tr key={al.usuario_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-slate-200">{al.nombre_completo}</div>
                        <div className="text-xs font-mono text-slate-500">{al.rut}</div>
                      </td>
                      <td className="p-4 text-center font-mono font-semibold text-slate-400">{total}</td>
                      <td className="p-4 text-center font-bold text-emerald-400">{al.presentes}</td>
                      <td className="p-4 text-center font-bold text-rose-400">{al.ausentes}</td>
                      <td className="p-4 text-center font-bold text-amber-400">{al.atrasados}</td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${pct >= 85 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                          {pct}%
                        </span>
                      </td>
                      <td className="p-4 text-xs font-mono text-slate-400 truncate max-w-xs" title={al.atrasos_detalle || 'Sin atrasos'}>
                        {al.atrasos_detalle ? al.atrasos_detalle : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 4: Alertas de Inasistencia Crítica */}
      {activeSubTab === 'criticos' && (
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 md:p-8 shadow-xl space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" /> Alerta de Inasistencia y Atrasos Frecuentes
            </h3>
            <span className="text-xs font-bold text-slate-500">Ranking Crítico</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap min-w-[600px]">
              <thead className="bg-slate-950 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase">
                <tr>
                  <th className="p-4">Alumno</th>
                  <th className="p-4 text-center">Inasistencias Acumuladas</th>
                  <th className="p-4 text-center">Atrasos Acumulados</th>
                  <th className="p-4 text-center">Estado Alerta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {criticos && criticos.length > 0 ? (
                  criticos.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-slate-200">{c.nombre_completo}</div>
                        <div className="text-xs font-mono text-slate-500">{c.rut}</div>
                      </td>
                      <td className="p-4 text-center font-bold text-rose-400 text-base">{c.inasistencias}</td>
                      <td className="p-4 text-center font-bold text-amber-400 text-base">{c.atrasos}</td>
                      <td className="p-4 text-center">
                        {c.inasistencias >= 3 ? (
                          <span className="px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold rounded-lg">
                            Riesgo Reprobación
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold rounded-lg">
                            Advertencia
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      ¡Excelente! No hay alumnos en estado de riesgo de inasistencia en este curso.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
