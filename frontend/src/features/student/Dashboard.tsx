import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDropzone } from 'react-dropzone';
import { LogOut, UploadCloud, File as FileIcon, FileText, CheckCircle2, Clock, Trash2, ShieldCheck, X, FileArchive, Loader2, Camera as CameraIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import CameraModal from '../../components/CameraModal';

type Submission = {
  id: number;
  nombre_original: string;
  tamano_bytes: number;
  fecha_hora_subida: string;
  tipo_entrega: 'tarea' | 'evaluacion';
};

export default function Dashboard() {
  const { user, logout, login } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'tarea' | 'evaluacion' | 'calificaciones'>('tarea');
  const [grades, setGrades] = useState<any>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const calcAvg = (vals: (string | null)[]) => {
    const valid = vals.map(v => parseFloat(v || '')).filter(v => !isNaN(v));
    if (valid.length === 0) return null;
    return Number((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1));
  };

  const getAvgs = (g: any) => {
    if (!g) return { s1: null, s2: null, final: null };
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
        if (recup >= 4.0) final = 4.0;
      }
    }
    return { s1, s2, final };
  };

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

  const fetchGrades = useCallback(async () => {
    try {
      const res = await fetch('/api/submissions/me/grades');
      if (res.ok) {
        const data = await res.json();
        setGrades(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
    fetchGrades();
  }, [fetchSubmissions, fetchGrades]);

  const confirmUpload = async (tipo: 'tarea' | 'evaluacion') => {
    if (!pendingFile) return;
    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', pendingFile);
    formData.append('tipo_entrega', tipo);

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
      setActiveTab(tipo);
      fetchSubmissions();
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
    }
  }, []);

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
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

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-12">
        {/* Upload Zone */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">Subir Archivo</h2>
            <p className="text-slate-500 mt-1">Arrastra tu trabajo escolar aquí para enviarlo al profesor.</p>
          </div>

          <div 
            {...getRootProps()} 
            className={cn(
              "relative overflow-hidden rounded-[2rem] border-2 border-dashed transition-all duration-300 p-6 md:p-12 text-center cursor-pointer group bg-white",
              isDragActive ? "border-indigo-500 bg-indigo-50/50 scale-[1.02] shadow-xl shadow-indigo-500/10" : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50 hover:scale-[1.01] active:scale-[0.98] shadow-sm"
            )}
          >
            <input {...getInputProps()} />
            
            <AnimatePresence mode="wait">
              {uploadSuccess ? (
                <motion.div 
                  key="success"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex flex-col items-center justify-center space-y-4"
                >
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                    <ShieldCheck className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-emerald-700">¡Entrega Exitosa!</h3>
                    <p className="text-emerald-600/80 mt-1 font-medium">Tu archivo ha sido guardado de forma segura.</p>
                  </div>
                </motion.div>
              ) : uploading ? (
                <motion.div 
                  key="uploading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center space-y-6 py-4"
                >
                  <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                  <h3 className="text-lg font-bold text-slate-700">Subiendo archivo...</h3>
                </motion.div>
              ) : (
                <motion.div 
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center space-y-6 pointer-events-none"
                >
                  <div className={cn(
                    "w-24 h-24 rounded-full flex items-center justify-center transition-colors duration-300",
                    isDragActive ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500"
                  )}>
                    <UploadCloud className="w-12 h-12" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">
                      {isDragActive ? 'Suelta el archivo aquí' : 'Haz clic o arrastra tu archivo'}
                    </h3>
                    <p className="text-slate-500 mt-2 text-sm max-w-sm mx-auto leading-relaxed">
                      Soporta PDFs, Word, ZIPs y más. Límite de 50MB.
                    </p>
                  </div>
                  <div className="px-6 py-2.5 bg-slate-900 text-white font-semibold rounded-xl text-sm shadow-md group-hover:bg-indigo-600 transition-colors pointer-events-auto">
                    Explorar archivos
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-semibold border border-rose-100 flex items-center gap-2"
              >
                <X className="w-4 h-4" /> {error}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {pendingFile && !uploading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-slate-100"
              >
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-center text-slate-800 mb-2">Clasificar Entrega</h3>
                <p className="text-center text-slate-500 mb-6 text-sm">
                  Estás a punto de subir <strong>{pendingFile.name}</strong>. ¿Qué tipo de documento es?
                </p>
                <div className="flex gap-4">
                  <button onClick={() => confirmUpload('tarea')} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 rounded-2xl transition-colors">
                    Es una Tarea
                  </button>
                  <button onClick={() => confirmUpload('evaluacion')} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-colors shadow-lg shadow-indigo-600/20">
                    Es Evaluación
                  </button>
                </div>
                <button onClick={() => setPendingFile(null)} className="w-full mt-4 py-3 text-slate-400 font-semibold hover:text-slate-600 transition-colors">
                  Cancelar
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History Area */}
        <section>
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 border-b border-slate-200 pb-4 gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-800">Mi Historial</h2>
              <p className="text-slate-500 mt-1">Revisa los documentos que has enviado.</p>
            </div>
            <div className="flex w-full sm:w-auto gap-2 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/50">
              <button 
                onClick={() => setActiveTab('tarea')}
                className={cn(
                  "flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300",
                  activeTab === 'tarea' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Tareas
              </button>
              <button 
                onClick={() => setActiveTab('evaluacion')}
                className={cn(
                  "flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300",
                  activeTab === 'evaluacion' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Evaluaciones
              </button>
              <button 
                onClick={() => setActiveTab('calificaciones')}
                className={cn(
                  "flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300",
                  activeTab === 'calificaciones' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Mis Notas
              </button>
            </div>
          </div>

          {activeTab === 'calificaciones' ? (
            <AnimatePresence mode="wait">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                {!grades ? (
                  <div className="bg-white border border-slate-200/60 rounded-[2rem] p-8 text-center text-slate-500">
                    Aún no tienes calificaciones registradas en el sistema.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        { title: '1er Semestre', val: getAvgs(grades).s1 },
                        { title: '2do Semestre', val: getAvgs(grades).s2 },
                        { title: 'Promedio Final', val: getAvgs(grades).final, isFinal: true }
                      ].map((item, i) => (
                        <div key={i} className={cn("bg-white border rounded-[2rem] p-6 shadow-sm relative overflow-hidden", item.isFinal ? "border-indigo-200 bg-indigo-50/30" : "border-slate-200")}>
                          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">{item.title}</h4>
                          <span className={cn("text-5xl font-black", item.val === null ? "text-slate-300" : item.val >= 4.0 ? "text-indigo-600" : "text-rose-500")}>
                            {item.val !== null ? item.val.toFixed(1) : '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm overflow-hidden w-full">
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
                              {[1,2,3,4,5,6].map(n => (
                                <td key={`s1_${n}`} className={cn("py-4 px-4 text-center font-mono font-medium", grades[`s1_n${n}`] ? (parseFloat(grades[`s1_n${n}`]) >= 4.0 ? 'text-indigo-600' : 'text-rose-500') : 'text-slate-300')}>
                                  {grades[`s1_n${n}`] || '-'}
                                </td>
                              ))}
                            </tr>
                            <tr>
                              <td className="py-4 font-bold text-slate-700">2do Semestre</td>
                              {[1,2,3,4,5,6].map(n => (
                                <td key={`s2_${n}`} className={cn("py-4 px-4 text-center font-mono font-medium", grades[`s2_n${n}`] ? (parseFloat(grades[`s2_n${n}`]) >= 4.0 ? 'text-indigo-600' : 'text-rose-500') : 'text-slate-300')}>
                                  {grades[`s2_n${n}`] || '-'}
                                </td>
                              ))}
                            </tr>
                            {grades.nota_recuperativa && (
                              <tr>
                                <td className="py-4 font-bold text-amber-600">Prueba Recuperativa</td>
                                <td colSpan={6} className={cn("py-4 px-4 font-mono font-medium", parseFloat(grades.nota_recuperativa) >= 4.0 ? 'text-indigo-600' : 'text-rose-500')}>
                                  {grades.nota_recuperativa}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {submissions.filter(s => s.tipo_entrega === activeTab || (!s.tipo_entrega && activeTab === 'tarea')).length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="col-span-full py-20 text-center"
                  >
                    <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileIcon className="w-10 h-10" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">No hay entregas</h3>
                    <p className="text-slate-400 mt-1">No has subido {activeTab === 'tarea' ? 'tareas' : 'evaluaciones'} aún.</p>
                  </motion.div>
                ) : (
                  submissions.filter(s => s.tipo_entrega === activeTab || (!s.tipo_entrega && activeTab === 'tarea')).map((sub, i) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: i * 0.05 }}
                      key={sub.id}
                      className="bg-white border border-slate-200/60 rounded-2xl p-5 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div className="p-3 bg-slate-50 rounded-xl group-hover:scale-110 transition-transform duration-300">
                          {getFileIcon(sub.nombre_original)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-800 truncate" title={sub.nombre_original}>
                            {sub.nombre_original}
                          </h4>
                          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-1">
                            {formatSize(sub.tamano_bytes)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <Clock className="w-4 h-4 text-emerald-500" />
                        Entregado: {new Date(sub.fecha_hora_subida).toLocaleString('es-CL', { 
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                        })}
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          )}
        </section>
      </main>
      
      <CameraModal 
        isOpen={isCameraOpen} 
        onClose={() => setIsCameraOpen(false)} 
        onCapture={handleProfileUpload} 
      />
    </div>
  );
}
