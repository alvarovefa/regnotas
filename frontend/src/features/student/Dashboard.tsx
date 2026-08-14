import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDropzone } from 'react-dropzone';
import { LogOut, UploadCloud, File as FileIcon, FileText, Clock, ShieldCheck, X, FileArchive, Loader2, Camera as CameraIcon, Download, Users, ChevronRight, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import CameraModal from '../../components/CameraModal';


type Submission = {
  id: number;
  nombre_original: string;
  tamano_bytes: number;
  fecha_hora_subida: string;
  tipo_entrega: 'tarea' | 'evaluacion';
  grupo_id?: number | null;
  grupo_nombre?: string | null;
  subido_por?: string | null;
  usuario_id?: number;
  asignatura_id?: number;
};

type GroupMember = { usuario_id: number; rut: string; nombre_completo: string; foto_perfil?: string };
type MyGroup = { id: number; nombre: string; curso_nombre: string; integrantes: GroupMember[]; entregas: Submission[] };
type Recurso = { id: number; nombre_original: string; tamano_bytes: number; fecha_hora_subida: string; asignatura_nombre: string; asignatura_color: string; profesor_nombre: string; asignatura_id: number; };

type AsignaturaSummary = {
  id: number;
  nombre: string;
  codigo: string;
  color: string;
  profesor_nombre: string;
  promedio: number | null;
  calificaciones: any;
};

export default function Dashboard() {
  const { user, logout, login } = useAuth();
  
  const [asignaturas, setAsignaturas] = useState<AsignaturaSummary[]>([]);
  const [selectedAsignaturaId, setSelectedAsignaturaId] = useState<number | null>(null);

  const promedioGeneral = useMemo(() => {
    const validPromedios = asignaturas.map(a => a.promedio).filter((p): p is number => p !== null);
    if (validPromedios.length === 0) return null;
    return Number((validPromedios.reduce((a, b) => a + b, 0) / validPromedios.length).toFixed(1));
  }, [asignaturas]);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [myGroups, setMyGroups] = useState<MyGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'tarea' | 'evaluacion' | 'calificaciones' | 'grupo' | 'recursos'>('tarea');
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const fetchAsignaturas = useCallback(async () => {
    try {
      const res = await fetch('/api/academic/student-summary');
      if (res.ok) {
        const data = await res.json();
        setAsignaturas(data.asignaturas || []);
        if (data.asignaturas?.length > 0 && selectedAsignaturaId === null) {
          setSelectedAsignaturaId(data.asignaturas[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [selectedAsignaturaId]);

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await fetch('/api/submissions/me');
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/groups/my-groups');
      if (res.ok) {
        const data = await res.json();
        setMyGroups(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchRecursos = useCallback(async () => {
    try {
      const res = await fetch('/api/recursos/me');
      if (res.ok) setRecursos(await res.json());
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchAsignaturas();
    fetchSubmissions();
    fetchGroups();
    fetchRecursos();
  }, [fetchAsignaturas, fetchSubmissions, fetchGroups, fetchRecursos]);

  const handleProfileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('foto', file);
    try {
      const res = await fetch('/api/auth/profile-picture', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (user) {
          login({ ...user, foto_perfil: data.foto_perfil });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const confirmUpload = async (tipo: 'tarea' | 'evaluacion', targetGroupId?: number | null) => {
    if (!pendingFile) return;
    if (!selectedAsignaturaId) {
      setError('Debes seleccionar una asignatura antes de subir el archivo');
      return;
    }
    
    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', pendingFile);
    formData.append('tipo_entrega', tipo);
    formData.append('asignatura_id', selectedAsignaturaId.toString());
    
    if (targetGroupId) {
      formData.append('grupo_id', targetGroupId.toString());
    }

    try {
      const res = await fetch('/api/submissions/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al subir el archivo');
      }

      setPendingFile(null);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
      if (targetGroupId) {
        setActiveTab('grupo');
      } else {
        setActiveTab(tipo);
      }
      fetchSubmissions();
      fetchGroups();
    } catch (err: any) {
      setError(err.message);
      setPendingFile(null);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setPendingFile(acceptedFiles[0]);
      if (activeTab === 'grupo' && myGroups.length > 0) {
        setSelectedGroupId(myGroups[0].id);
      } else {
        setSelectedGroupId(null);
      }
    }
  }, [activeTab, myGroups]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  });

  const handleLogout = async () => {
    if (!window.confirm('¿Estás seguro de que deseas cerrar sesión?')) return;
    await fetch('/api/auth/logout', { method: 'POST' });
    logout();
  };

  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return (bytes / 1024).toFixed(1) + ' KB';
    return mb.toFixed(1) + ' MB';
  };

  const getFileIcon = (filename: string) => {
    if (filename.endsWith('.pdf')) return <FileText className="w-8 h-8 text-rose-500" />;
    if (filename.endsWith('.zip') || filename.endsWith('.rar')) return <FileArchive className="w-8 h-8 text-amber-500" />;
    return <FileIcon className="w-8 h-8 text-blue-500" />;
  };

  const selectedAsignatura = useMemo(() => asignaturas.find(a => a.id === selectedAsignaturaId) || null, [asignaturas, selectedAsignaturaId]);
  
  const filteredSubmissions = useMemo(() => {
    if (!selectedAsignaturaId) return [];
    return submissions.filter(s => s.asignatura_id === selectedAsignaturaId && (s.tipo_entrega === activeTab || (!s.tipo_entrega && activeTab === 'tarea')));
  }, [submissions, selectedAsignaturaId, activeTab]);

  const getAvgs = (g: any) => {
    if (!g) return { s1: null, s2: null, final: null };
    
    const calcAvg = (vals: (string | null)[]) => {
      const valid = vals.map(v => parseFloat(v || '')).filter(v => !isNaN(v));
      if (valid.length === 0) return null;
      return Number((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1));
    };

    const s1 = calcAvg([g.s1_n1, g.s1_n2, g.s1_n3, g.s1_n4, g.s1_n5, g.s1_n6]);
    const s2 = calcAvg([g.s2_n1, g.s2_n2, g.s2_n3, g.s2_n4, g.s2_n5, g.s2_n6]);
    let anual = null; let final = null;
    if (s1 !== null && s2 !== null) anual = Number(((s1 + s2) / 2).toFixed(1));
    else if (s1 !== null) anual = s1;
    else if (s2 !== null) anual = s2;
    if (anual !== null) {
      final = anual;
      if (anual < 4.0 && g.nota_recuperativa) {
        const recup = Number(g.nota_recuperativa);
        if (!isNaN(recup)) {
          if (recup >= 4.0) final = 4.0;
          else final = Math.max(anual, recup);
        }
      }
    }
    return { s1, s2, final };
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          header, section, .no-print {
            display: none !important;
          }
          .print-area {
            display: block !important;
            width: 100% !important;
          }
        }
      `}</style>
      {/* Header */}
      <header className="bg-white border-b border-slate-200/60 sticky top-0 z-40 backdrop-blur-md bg-white/80">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsCameraOpen(true)}
              className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-500/20 overflow-hidden group border-2 border-transparent hover:border-indigo-200 transition-all"
            >
              {user?.foto_perfil ? (
                <img src={user.foto_perfil} alt="Perfil" className="w-full h-full object-cover" />
              ) : (
                user?.nombre_completo ? user.nombre_completo.charAt(0).toUpperCase() : ''
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <CameraIcon className="w-4 h-4 text-white" />
              </div>
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">Hola, {user?.nombre_completo ? user.nombre_completo.split(' ')[0] : ''}</h1>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{user?.rut}</span>
            </div>
          </div>
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-rose-600 transition-colors p-2 rounded-lg hover:bg-rose-50"
          >
            Salir <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-12">
        
        {/* Asignaturas Selector */}
        <section className="no-print">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-800">Tus Asignaturas</h2>
              <p className="text-slate-500 mt-1 text-sm">Selecciona una asignatura para subir archivos y ver tu progreso.</p>
            </div>
            
            {promedioGeneral !== null && (
              <div className="flex items-center gap-3 bg-white border border-slate-200 px-5 py-3 rounded-2xl shadow-sm">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Promedio General</p>
                  <div className="flex items-baseline gap-1">
                    <span className={cn(
                      "text-2xl font-black",
                      promedioGeneral >= 4.0 ? "text-indigo-600" : "text-rose-500"
                    )}>
                      {promedioGeneral.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x">
            {asignaturas.length === 0 ? (
              <div className="text-slate-500 italic p-6 bg-white border border-slate-200 rounded-2xl w-full text-center">
                Aún no tienes asignaturas registradas en tu curso.
              </div>
            ) : (
              asignaturas.map((asig) => (
                <button
                  key={asig.id}
                  onClick={() => setSelectedAsignaturaId(asig.id)}
                  className={cn(
                    "snap-start shrink-0 w-64 text-left p-5 rounded-3xl border-2 transition-all duration-300 relative overflow-hidden",
                    selectedAsignaturaId === asig.id 
                      ? "border-indigo-500 bg-white shadow-xl shadow-indigo-500/10 scale-100" 
                      : "border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 scale-[0.98] opacity-80 hover:opacity-100"
                  )}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 -mt-8 -mr-8 rounded-full opacity-10" style={{ backgroundColor: asig.color || '#6366f1' }}></div>
                  <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded-md mb-2 inline-block" style={{ backgroundColor: `${asig.color || '#6366f1'}20`, color: asig.color || '#6366f1' }}>
                        {asig.codigo}
                      </span>
                      <h3 className="font-bold text-slate-800 text-lg leading-tight line-clamp-2">{asig.nombre}</h3>
                    </div>
                    <div className="flex items-end justify-between mt-4">
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase mb-0.5">Promedio</p>
                        <span className={cn(
                          "text-3xl font-black",
                          asig.promedio === null ? "text-slate-300" : asig.promedio >= 4.0 ? "text-indigo-600" : "text-rose-500"
                        )}>
                          {asig.promedio !== null ? asig.promedio.toFixed(1) : '-'}
                        </span>
                      </div>
                      {selectedAsignaturaId === asig.id && (
                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Workspace for Selected Asignatura */}
        {selectedAsignatura && (
          <div className="space-y-12 no-print">
            
            {/* Upload Zone */}
            <section>
              <div className="mb-6">
                <h2 className="text-xl font-bold tracking-tight text-slate-800">Subir a {selectedAsignatura.nombre}</h2>
              </div>
              <div 
                {...getRootProps()} 
                className={cn(
                  "relative overflow-hidden rounded-[2rem] border-2 border-dashed transition-all duration-300 p-6 md:p-10 text-center cursor-pointer group bg-white",
                  isDragActive ? "border-indigo-500 bg-indigo-50/50 scale-[1.02] shadow-xl shadow-indigo-500/10" : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50 hover:scale-[1.01] active:scale-[0.98] shadow-sm"
                )}
              >
                <input {...getInputProps()} />
                <AnimatePresence mode="wait">
                  {uploadSuccess ? (
                    <motion.div key="success" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="flex flex-col items-center justify-center space-y-4">
                      <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                        <ShieldCheck className="w-10 h-10" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-emerald-700">¡Entrega Exitosa!</h3>
                      </div>
                    </motion.div>
                  ) : uploading ? (
                    <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center space-y-6 py-4">
                      <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                    </motion.div>
                  ) : (
                    <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center space-y-4 pointer-events-none">
                      <div className={cn("w-20 h-20 rounded-full flex items-center justify-center transition-colors duration-300", isDragActive ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500")}>
                        <UploadCloud className="w-10 h-10" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">
                          {isDragActive ? 'Suelta el archivo aquí' : 'Haz clic o arrastra tu archivo'}
                        </h3>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-semibold flex items-center gap-2">
                  <X className="w-4 h-4" /> {error}
                </div>
              )}
            </section>

            {/* Submissions & Grades */}
            <section>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <h2 className="text-xl font-bold tracking-tight text-slate-800">Detalles en {selectedAsignatura.nombre}</h2>
                
                <div className="flex flex-wrap w-full sm:w-auto gap-2 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/50">
                  <button onClick={() => setActiveTab('tarea')} className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", activeTab === 'tarea' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Tareas</button>
                  <button onClick={() => setActiveTab('evaluacion')} className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", activeTab === 'evaluacion' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Evaluaciones</button>
                  {myGroups.filter(g => g.curso_nombre === selectedAsignatura?.nombre).length > 0 && (
                    <button onClick={() => setActiveTab('grupo')} className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5", activeTab === 'grupo' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                      <Users className="w-4 h-4" /> Grupos
                    </button>
                  )}
                  <button onClick={() => setActiveTab('recursos')} className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5", activeTab === 'recursos' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                    <Download className="w-4 h-4" /> Material
                  </button>
                  <button onClick={() => setActiveTab('calificaciones')} className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", activeTab === 'calificaciones' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Calificaciones</button>
                </div>
              </div>

              {activeTab === 'calificaciones' ? (
                <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm overflow-hidden w-full">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {[
                      { title: '1er Semestre', val: getAvgs(selectedAsignatura.calificaciones).s1 },
                      { title: '2do Semestre', val: getAvgs(selectedAsignatura.calificaciones).s2 },
                      { title: 'Promedio Final', val: getAvgs(selectedAsignatura.calificaciones).final, isFinal: true }
                    ].map((item, i) => (
                      <div key={i} className={cn("bg-white border rounded-2xl p-5 shadow-sm", item.isFinal ? "border-indigo-200 bg-indigo-50/30" : "border-slate-200")}>
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{item.title}</h4>
                        <span className={cn("text-4xl font-black", item.val === null ? "text-slate-300" : item.val >= 4.0 ? "text-indigo-600" : "text-rose-500")}>
                          {item.val !== null ? item.val.toFixed(1) : '-'}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap min-w-[600px]">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-widest">
                          <th className="pb-4 pr-4">Semestre</th>
                          {[1,2,3,4,5,6].map(n => <th key={n} className="pb-4 px-4 text-center">N{n}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        <tr>
                          <td className="py-4 font-bold text-slate-700">1er Semestre</td>
                          {[1,2,3,4,5,6].map(n => {
                            const val = selectedAsignatura.calificaciones?.[`s1_n${n}`];
                            return (
                            <td key={`s1_${n}`} className={cn("py-4 px-4 text-center font-mono font-medium", val ? (parseFloat(val) >= 4.0 ? 'text-indigo-600' : 'text-rose-500') : 'text-slate-300')}>
                              {val || '-'}
                            </td>
                          )})}
                        </tr>
                        <tr>
                          <td className="py-4 font-bold text-slate-700">2do Semestre</td>
                          {[1,2,3,4,5,6].map(n => {
                            const val = selectedAsignatura.calificaciones?.[`s2_n${n}`];
                            return (
                            <td key={`s2_${n}`} className={cn("py-4 px-4 text-center font-mono font-medium", val ? (parseFloat(val) >= 4.0 ? 'text-indigo-600' : 'text-rose-500') : 'text-slate-300')}>
                              {val || '-'}
                            </td>
                          )})}
                        </tr>
                        {selectedAsignatura.calificaciones?.nota_recuperativa && (
                          <tr>
                            <td className="py-4 font-bold text-amber-600">Prueba Recuperativa</td>
                            <td colSpan={6} className={cn("py-4 px-4 font-mono font-medium", parseFloat(selectedAsignatura.calificaciones.nota_recuperativa) >= 4.0 ? 'text-indigo-600' : 'text-rose-500')}>
                              {selectedAsignatura.calificaciones.nota_recuperativa}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : activeTab === 'grupo' ? (
                <div className="space-y-6">
                  {myGroups.map((group) => (
                    <div key={group.id} className="bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-sm">
                      <div className="flex flex-col sm:flex-row justify-between mb-6 gap-4">
                        <div>
                          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-indigo-600" />
                            {group.nombre}
                          </h3>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {group.entregas.filter(e => e.asignatura_id === selectedAsignaturaId).length === 0 ? (
                           <div className="col-span-full p-6 text-center text-slate-400 italic">No hay entregas grupales en esta asignatura.</div>
                        ) : (
                          group.entregas.filter(e => e.asignatura_id === selectedAsignaturaId).map((file) => (
                            <div key={file.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between">
                              <div className="flex items-start gap-3 mb-3">
                                <FileText className="w-6 h-6 text-indigo-500 shrink-0 mt-0.5" />
                                <div className="min-w-0 flex-1">
                                  <h5 className="font-semibold text-xs text-slate-800 truncate" title={file.nombre_original}>{file.nombre_original}</h5>
                                  <p className="text-[10px] text-slate-500 mt-0.5">Subido por: <strong>{file.subido_por}</strong></p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 text-[10px] text-slate-500">
                                <span className="flex items-center gap-1.5 font-medium font-mono">
                                  <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  {new Date(file.fecha_hora_subida).toLocaleString('es-CL')}
                                </span>
                                <a href={`/api/submissions/download/${file.id}`} download className="text-indigo-600 hover:text-indigo-500 font-bold">Descargar</a>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : activeTab === 'recursos' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recursos.filter(r => r.asignatura_id === selectedAsignaturaId).length === 0 ? (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 bg-white/50 rounded-2xl border border-dashed border-slate-200">
                      <Download className="w-12 h-12 mb-3 text-slate-300" />
                      <p>No hay material compartido en esta asignatura</p>
                    </div>
                  ) : (
                    recursos.filter(r => r.asignatura_id === selectedAsignaturaId).map(rec => (
                      <div key={rec.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group flex items-center justify-between">
                        <div className="flex items-center gap-4 truncate">
                          <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div className="truncate pr-4">
                            <div className="font-bold text-slate-700 truncate" title={rec.nombre_original}>{rec.nombre_original}</div>
                            <div className="text-xs text-slate-400 mt-0.5 font-medium flex gap-2">
                              <span>Prof: {rec.profesor_nombre}</span>
                            </div>
                          </div>
                        </div>
                        <a href={`/api/recursos/download/${rec.id}`} className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors flex-shrink-0">
                          <Download className="w-5 h-5" />
                        </a>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredSubmissions.length === 0 ? (
                    <div className="col-span-full py-20 text-center">
                      <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileIcon className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-700">No hay entregas</h3>
                    </div>
                  ) : (
                    filteredSubmissions.map((sub) => (
                      <div key={sub.id} className="bg-white border border-slate-200/60 rounded-2xl p-5 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group">
                        <div className="flex items-start gap-4 mb-3">
                          <div className="p-3 bg-slate-50 rounded-xl group-hover:scale-110 transition-transform duration-300">
                            {getFileIcon(sub.nombre_original)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-800 truncate" title={sub.nombre_original}>{sub.nombre_original}</h4>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{formatSize(sub.tamano_bytes)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="font-mono">{new Date(sub.fecha_hora_subida).toLocaleString('es-CL')}</span>
                          </div>
                          <a href={`/api/submissions/download/${sub.id}`} download className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white font-bold rounded-lg transition-colors text-xs shrink-0">
                            <Download className="w-3.5 h-3.5" /> Descargar
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Modal de Subida */}
        <AnimatePresence>
          {pendingFile && !uploading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-slate-100">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-center text-slate-800 mb-2">Clasificar Entrega</h3>
                <p className="text-center text-slate-500 mb-6 text-sm">
                  Subiendo a <strong>{selectedAsignatura?.nombre}</strong>
                </p>

                {myGroups.length > 0 && (
                  <div className="mb-6 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">¿A quién pertenece la entrega?</label>
                    <div className="space-y-2">
                      <div onClick={() => setSelectedGroupId(null)} className={cn("flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer", selectedGroupId === null ? "bg-white border-indigo-500 text-indigo-900 shadow-xs ring-2 ring-indigo-500/10" : "bg-transparent border-slate-200 text-slate-600 hover:bg-white")}>
                        <input type="radio" checked={selectedGroupId === null} readOnly className="accent-indigo-600 cursor-pointer" />
                        <span>Entrega Individual (Solo yo)</span>
                      </div>
                      {myGroups.map(g => (
                        <div key={g.id} onClick={() => setSelectedGroupId(g.id)} className={cn("flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer", selectedGroupId === g.id ? "bg-white border-indigo-500 text-indigo-900 shadow-xs ring-2 ring-indigo-500/10" : "bg-transparent border-slate-200 text-slate-600 hover:bg-white")}>
                          <input type="radio" checked={selectedGroupId === g.id} readOnly className="accent-indigo-600 cursor-pointer" />
                          <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-indigo-600" /> {g.nombre} (Compartido)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  <button onClick={() => confirmUpload('tarea', selectedGroupId)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl transition-colors">Es Tarea</button>
                  <button onClick={() => confirmUpload('evaluacion', selectedGroupId)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-2xl transition-colors shadow-lg shadow-indigo-600/20">Es Evaluación</button>
                </div>
                <button onClick={() => setPendingFile(null)} className="w-full mt-4 py-3 text-slate-400 font-semibold hover:text-slate-600 transition-colors">Cancelar</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>



      </main>
      
      <CameraModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={handleProfileUpload} />
    </div>
  );
}
