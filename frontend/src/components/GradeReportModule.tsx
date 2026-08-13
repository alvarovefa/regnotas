import { useState, useEffect } from 'react';
import { FileText, Printer, Filter, User, Users, Calendar, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import GradeReportTemplate, { type StudentReportData } from './GradeReportTemplate';

type Course = {
  id: number;
  nombre: string;
  profesor_jefe_nombre?: string;
};

type Props = {
  courses: Course[];
  initialCourseId?: number | '';
  userRole?: string;
};

export default function GradeReportModule({ courses = [], initialCourseId = '' }: Props) {
  const [selectedCourseId, setSelectedCourseId] = useState<number | ''>(initialCourseId || (courses[0]?.id || ''));
  const [mode, setMode] = useState<'alumno' | 'curso'>('curso');
  const [periodo, setPeriodo] = useState<'s1' | 's2' | 'anual'>('s1');
  const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('');
  const [errorMsg, setErrorMsg] = useState('');

  const [loading, setLoading] = useState(false);
  const [reportResponse, setReportResponse] = useState<{
    curso: any;
    periodo: 's1' | 's2' | 'anual';
    isJefeOrAdmin: boolean;
    informes: StudentReportData[];
  } | null>(null);

  const authFetch = (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
      ...options.headers,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    return fetch(url, { ...options, headers, credentials: 'include' });
  };

  const fetchReportData = async () => {
    if (!selectedCourseId) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const url = `/api/academic/grade-reports/data?cursoId=${selectedCourseId}&periodo=${periodo}`;
      const res = await authFetch(url);
      if (res.ok) {
        const data = await res.json();
        setReportResponse(data);

        // Si se cambió de curso o no hay alumno seleccionado, preseleccionar el primer alumno
        if (data.informes?.length > 0) {
          const exists = data.informes.some((i: any) => i.alumno.id === Number(selectedStudentId));
          if (!selectedStudentId || !exists) {
            setSelectedStudentId(data.informes[0].alumno.id);
          }
        }
      } else {
        const errorData = await res.json();
        setReportResponse(null);
        setErrorMsg(errorData.message || 'Error al obtener informes');
      }
    } catch (err) {
      console.error(err);
      setReportResponse(null);
      setErrorMsg('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses]);

  useEffect(() => {
    fetchReportData();
  }, [selectedCourseId, periodo]);

  const handlePrint = () => {
    window.print();
  };

  const selectedCourseObj = courses.find(c => c.id === selectedCourseId);
  const reportsToDisplay = mode === 'alumno' && selectedStudentId
    ? (reportResponse?.informes || []).filter(i => i.alumno.id === Number(selectedStudentId))
    : (reportResponse?.informes || []);

  return (
    <div className="space-y-6">
      {/* CSS para Impresión Limpia de Informes */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          /* Ocultar elementos no imprimibles */
          header, sidebar, nav, button, .no-print, .print\\:hidden {
            display: none !important;
          }
          /* Mostrar contenedor de informes */
          .print-area {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Salto de página para informe por alumno en modo curso */
          .page-break {
            page-break-after: always !important;
            break-after: page !important;
          }
        }
      `}</style>

      {/* Control Panel (No se imprime) */}
      <div className="no-print bg-slate-900 border border-slate-800 rounded-[2rem] p-6 md:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center font-bold">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                Emisión de Informes de Notas
                <span className="text-xs bg-indigo-500/20 text-indigo-300 font-medium px-2.5 py-1 rounded-lg border border-indigo-500/30">
                  PDF Oficial
                </span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Genera e imprime boletines oficiales semestrales y anuales en formato Liceo Polivalente de Molina.
              </p>
            </div>
          </div>

          <button
            onClick={handlePrint}
            disabled={loading || reportsToDisplay.length === 0}
            className="w-full md:w-auto bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            {mode === 'curso' ? `Imprimir / PDF del Curso (${reportsToDisplay.length} Alumnos)` : 'Imprimir / PDF Alumno'}
          </button>
        </div>

        {/* Formulario de Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-800">
          {/* Seleccionar Curso */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-400" /> Curso
            </label>
            <select
              value={selectedCourseId}
              onChange={e => {
                setSelectedCourseId(Number(e.target.value));
                setSelectedStudentId('');
              }}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold focus:border-indigo-500 focus:outline-none"
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.profesor_jefe_nombre ? `(Jefe: ${c.profesor_jefe_nombre})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Modo de Emisión */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" /> Modo de Emisión
            </label>
            <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setMode('curso')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                  mode === 'curso' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Por Curso
              </button>
              <button
                type="button"
                onClick={() => setMode('alumno')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                  mode === 'alumno' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Por Alumno
              </button>
            </div>
          </div>

          {/* Seleccionar Periodo */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Periodo Evaluativo
            </label>
            <select
              value={periodo}
              onChange={e => setPeriodo(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold focus:border-indigo-500 focus:outline-none"
            >
              <option value="s1">1º Semestre</option>
              <option value="s2">2º Semestre</option>
              <option value="anual">Informe Anual Consolidado</option>
            </select>
          </div>

          {/* Seleccionar Alumno (Si mode === 'alumno') */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" /> Alumno Específico
            </label>
            <select
              value={selectedStudentId}
              disabled={mode !== 'alumno'}
              onChange={e => setSelectedStudentId(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed focus:border-indigo-500 focus:outline-none"
            >
              <option value="">-- Todos los del curso --</option>
              {reportResponse?.informes?.map(inf => (
                <option key={inf.alumno.id} value={inf.alumno.id}>
                  {inf.alumno.nombre_completo}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Indicador de Alcance de Rol */}
        {reportResponse && (
          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>
                {reportResponse.isJefeOrAdmin
                  ? `Modo Completo: Tienes permisos para ver la nómina completa de asignaturas del curso ${selectedCourseObj?.nombre}.`
                  : `Modo Asignatura: Como docente de cátedra, el informe incluye únicamente las materias que impartes.`
                }
              </span>
            </div>
            <span className="font-mono text-slate-400">
              {reportsToDisplay.length} informe(s) generados
            </span>
          </div>
        )}
      </div>

      {/* Contenedor Imprimible y de Vista Previa */}
      <div className="print-area">
        {loading ? (
          <div className="no-print bg-slate-900 border border-slate-800 rounded-[2rem] p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="font-medium text-sm">Generando boletines oficiales de notas...</p>
          </div>
        ) : reportsToDisplay.length > 0 ? (
          <div className="space-y-8">
            {reportsToDisplay.map((reportData, index) => (
              <div key={reportData.alumno.id} className={index < reportsToDisplay.length - 1 ? 'page-break' : ''}>
                <GradeReportTemplate report={reportData} />
              </div>
            ))}
          </div>
        ) : errorMsg ? (
          <div className="no-print bg-slate-900 border border-slate-800 rounded-[2rem] p-16 text-center text-rose-500 space-y-2">
            <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
            <p className="font-bold text-rose-500 text-lg">Acceso Denegado</p>
            <p className="text-sm font-medium">{errorMsg}</p>
          </div>
        ) : (
          <div className="no-print bg-slate-900 border border-slate-800 rounded-[2rem] p-16 text-center text-slate-500 space-y-2">
            <AlertCircle className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="font-bold text-slate-400 text-lg">No se encontraron datos para este informe</p>
            <p className="text-xs">Selecciona un curso y periodo evaluativo para visualizar los informes de notas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
