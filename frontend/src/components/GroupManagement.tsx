import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Trash2, Edit2, Download, FileText, Check, Search, X, Sparkles, UserPlus, AlertTriangle, Loader2, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

type Course = { id: number; nombre: string };
type Student = { id: number; rut: string; nombre_completo: string; foto_perfil?: string };
type GroupMember = { usuario_id: number; rut: string; nombre_completo: string; foto_perfil?: string };
type GroupSubmission = { id: number; nombre_original: string; tamano_bytes: number; fecha_hora_subida: string; tipo_entrega: string; subido_por: string };
type Group = {
  id: number;
  nombre: string;
  curso_id: number;
  creador_nombre: string;
  fecha_creacion: string;
  integrantes: GroupMember[];
  entregas: GroupSubmission[];
};

interface Props {
  courses: Course[];
  selectedCourseId?: number | '';
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

export default function GroupManagement({ courses, selectedCourseId: propSelectedCourseId = '', authFetch }: Props) {
  const [selectedCourseId, setSelectedCourseId] = useState<number | ''>(propSelectedCourseId || (courses[0]?.id ?? ''));
  const [groups, setGroups] = useState<Group[]>([]);
  const [courseStudents, setCourseStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [groupName, setGroupName] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [searchStudent, setSearchStudent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado para eliminación de entregas grupales
  const [deletingSubmission, setDeletingSubmission] = useState<{ id: number; nombre_original: string; subido_por: string } | null>(null);
  const [isDeletingSub, setIsDeletingSub] = useState(false);

  const handleDeleteSubmission = async () => {
    if (!deletingSubmission) return;
    setIsDeletingSub(true);
    try {
      const res = await authFetch(`/api/admin/submissions/${deletingSubmission.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchCourseData();
        setDeletingSubmission(null);
      } else {
        let msg = 'Error al eliminar la entrega';
        try {
          const data = await res.json();
          msg = data.message || msg;
        } catch (_) {}
        alert(msg);
      }
    } catch (err) {
      console.error('Error al eliminar entrega:', err);
      alert('Error al conectar con el servidor');
    } finally {
      setIsDeletingSub(false);
    }
  };
  const [errorMsg, setErrorMsg] = useState('');

  // Sync selected course with sidebar selection prop
  useEffect(() => {
    if (propSelectedCourseId !== '') {
      setSelectedCourseId(propSelectedCourseId);
    } else if (courses.length > 0 && (selectedCourseId === '' || !courses.some(c => c.id === selectedCourseId))) {
      setSelectedCourseId(courses[0].id);
    }
  }, [propSelectedCourseId, courses]);


  const fetchCourseData = useCallback(async () => {
    if (!selectedCourseId) return;
    setLoading(true);
    try {
      const [resGroups, resStudents] = await Promise.all([
        authFetch(`/api/groups/course/${selectedCourseId}`),
        authFetch(`/api/admin/students?cursoId=${selectedCourseId}`)
      ]);

      if (resGroups.ok) setGroups(await resGroups.json());
      if (resStudents.ok) setCourseStudents(await resStudents.json());
    } catch (err) {
      console.error('Error al cargar datos de grupos:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId, authFetch]);

  useEffect(() => {
    fetchCourseData();
  }, [fetchCourseData]);

  const openCreateModal = () => {
    setEditingGroup(null);
    setGroupName('');
    setSelectedStudentIds([]);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (group: Group) => {
    setEditingGroup(group);
    setGroupName(group.nombre);
    setSelectedStudentIds(group.integrantes.map(m => m.usuario_id));
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const toggleStudentSelection = (studentId: number) => {
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds(selectedStudentIds.filter(id => id !== studentId));
    } else {
      setSelectedStudentIds([...selectedStudentIds, studentId]);
    }
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setErrorMsg('El nombre del grupo es obligatorio');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      if (editingGroup) {
        // Actualizar grupo existente
        const res = await authFetch(`/api/groups/${editingGroup.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: groupName,
            estudiante_ids: selectedStudentIds
          })
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Error al actualizar grupo');
        }
      } else {
        // Crear grupo nuevo
        const res = await authFetch('/api/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: groupName,
            curso_id: selectedCourseId,
            estudiante_ids: selectedStudentIds
          })
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Error al crear grupo');
        }
      }

      setIsModalOpen(false);
      fetchCourseData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error inesperado');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGroup = async (groupId: number, name: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el grupo "${name}"?`)) return;

    try {
      const res = await authFetch(`/api/groups/${groupId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCourseData();
      } else {
        alert('Error al eliminar el grupo');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredStudents = courseStudents.filter(s =>
    s.nombre_completo.toLowerCase().includes(searchStudent.toLowerCase()) ||
    s.rut.toLowerCase().includes(searchStudent.toLowerCase())
  );

  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return (bytes / 1024).toFixed(1) + ' KB';
    return mb.toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-8">
      {/* Header Controls */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            Grupos de Trabajo por Curso
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Crea equipos para que los estudiantes compartan sus archivos y entregas grupales.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {propSelectedCourseId !== '' ? (
            <div className="px-4 py-2.5 rounded-xl border border-indigo-100 bg-indigo-50/80 text-sm font-bold text-indigo-700 flex items-center gap-2 shadow-xs">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>{courses.find(c => c.id === selectedCourseId)?.nombre || 'Curso Seleccionado'}</span>
            </div>
          ) : (
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value ? Number(e.target.value) : '')}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 cursor-pointer"
            >
              <option value="">Seleccionar curso...</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          )}

          <button
            onClick={openCreateModal}
            disabled={!selectedCourseId}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nuevo Grupo
          </button>
        </div>
      </div>

      {/* Groups Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">Cargando grupos del curso...</div>
      ) : groups.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-1">No hay grupos creados en este curso</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
            Haz clic en "Nuevo Grupo" para formar equipos de trabajo y asignar estudiantes.
          </p>
          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Crear Primer Grupo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {groups.map((group) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={group.id}
              className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-4 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      {group.nombre}
                    </h3>
                    <p className="text-xs font-medium text-slate-400 mt-1">
                      Creado por {group.creador_nombre} • {group.integrantes.length} integrante(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(group)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      title="Editar integrantes"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group.id, group.nombre)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar grupo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Integrantes */}
                <div className="mb-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Integrantes del Equipo</h4>
                  {group.integrantes.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Sin alumnos asignados.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {group.integrantes.map((member) => (
                        <div
                          key={member.usuario_id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl"
                        >
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 font-bold text-xs flex items-center justify-center overflow-hidden">
                            {member.foto_perfil ? (
                              <img src={member.foto_perfil} alt="" className="w-full h-full object-cover" />
                            ) : (
                              member.nombre_completo.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="text-xs font-semibold text-slate-700">
                            {member.nombre_completo.split(' ')[0]} {member.nombre_completo.split(' ')[2] || ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Archivos subidos por el grupo */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Entregas Grupales ({group.entregas.length})</h4>
                  {group.entregas.length === 0 ? (
                    <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl">No han realizado entregas grupales aún.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {group.entregas.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3 bg-indigo-50/40 border border-indigo-100/50 rounded-xl text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 truncate" title={file.nombre_original}>{file.nombre_original}</p>
                              <p className="text-[10px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span>Subido por <strong>{file.subido_por}</strong></span>
                                <span>•</span>
                                <span className="font-medium text-indigo-700 bg-indigo-100/50 px-1.5 py-0.5 rounded">
                                  {new Date(file.fecha_hora_subida).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })} hrs
                                </span>
                                <span>•</span>
                                <span>{formatSize(file.tamano_bytes)}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={`/api/submissions/download/${file.id}`}
                              download
                              className="p-1.5 bg-white text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors border border-indigo-100 shadow-xs"
                              title="Descargar entrega"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => setDeletingSubmission({ id: file.id, nombre_original: file.nombre_original, subido_por: file.subido_por })}
                              className="p-1.5 bg-white text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg transition-colors border border-rose-100 shadow-xs"
                              title="Eliminar entrega"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal Crear/Editar Grupo */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-600" />
                  {editingGroup ? 'Editar Grupo' : 'Nuevo Grupo de Trabajo'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold border border-rose-100">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSaveGroup} className="space-y-4 flex-1 overflow-hidden flex flex-col">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nombre del Grupo
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Grupo 1 - Proyecto Robótica"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-medium text-sm text-slate-800"
                    required
                  />
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Seleccionar Integrantes ({selectedStudentIds.length})
                    </label>
                    <span className="text-xs text-slate-400">Curso: {courses.find(c => c.id === selectedCourseId)?.nombre}</span>
                  </div>

                  <div className="relative mb-2">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o RUT..."
                      value={searchStudent}
                      onChange={(e) => setSearchStudent(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto border border-slate-200/80 rounded-2xl divide-y divide-slate-100 max-h-60 p-1">
                    {filteredStudents.length === 0 ? (
                      <p className="p-4 text-center text-xs text-slate-400">No hay estudiantes en este curso.</p>
                    ) : (
                      filteredStudents.map((student) => {
                        const isSelected = selectedStudentIds.includes(student.id);
                        return (
                          <div
                            key={student.id}
                            onClick={() => toggleStudentSelection(student.id)}
                            className={cn(
                              "flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors text-xs font-medium",
                              isSelected ? "bg-indigo-50/80 text-indigo-900 font-bold" : "hover:bg-slate-50 text-slate-700"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300"
                              )}>
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span>{student.nombre_completo}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">{student.rut}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 text-slate-500 font-bold text-sm hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? 'Guardando...' : (editingGroup ? 'Guardar Cambios' : 'Crear Grupo')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Modal de Confirmación de Eliminación de Entrega */}
        {deletingSubmission && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">¿Eliminar esta entrega grupal?</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Esta acción borrará el archivo del servidor de forma permanente.</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs space-y-2">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Subido por</span>
                  <p className="font-semibold text-slate-800">{deletingSubmission.subido_por}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Archivo</span>
                  <p className="font-medium text-indigo-600 truncate">{deletingSubmission.nombre_original}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeletingSub}
                  onClick={() => setDeletingSubmission(null)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeletingSub}
                  onClick={handleDeleteSubmission}
                  className="flex-1 px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-600/20 disabled:opacity-50 text-xs"
                >
                  {isDeletingSub ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      Eliminar Archivo
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
