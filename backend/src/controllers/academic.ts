import { Request, Response } from 'express';
import { pool } from '../db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// ----------------------------------------------------
// 1. GESTIÓN DE ASIGNATURAS
// ----------------------------------------------------
export const getAsignaturas = async (req: Request, res: Response): Promise<any> => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM asignaturas ORDER BY nombre ASC');
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al obtener asignaturas' });
  }
};

export const createAsignatura = async (req: Request, res: Response): Promise<any> => {
  try {
    const { nombre, codigo, color } = req.body;
    if (!nombre || !codigo) return res.status(400).json({ message: 'Nombre y código son requeridos' });

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO asignaturas (nombre, codigo, color) VALUES (?, ?, ?)',
      [nombre, codigo.toUpperCase(), color || '#6366f1']
    );
    return res.json({ message: 'Asignatura creada', id: result.insertId, nombre, codigo, color });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al crear asignatura' });
  }
};

export const deleteAsignatura = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM asignaturas WHERE id = ?', [id]);
    return res.json({ message: 'Asignatura eliminada' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al eliminar asignatura' });
  }
};

// ----------------------------------------------------
// 2. ASIGNACIÓN ASIGNATURAS A CURSOS
// ----------------------------------------------------
export const getCursoAsignaturas = async (req: Request, res: Response): Promise<any> => {
  try {
    const { cursoId } = req.query;
    let query = `
      SELECT ca.id, ca.curso_id, ca.asignatura_id, ca.profesor_id,
             a.nombre AS asignatura_nombre, a.codigo AS asignatura_codigo, a.color AS asignatura_color,
             u.nombre_completo AS profesor_nombre, c.nombre AS curso_nombre
      FROM curso_asignaturas ca
      JOIN asignaturas a ON ca.asignatura_id = a.id
      JOIN usuarios u ON ca.profesor_id = u.id
      JOIN cursos c ON ca.curso_id = c.id
    `;
    const params: any[] = [];
    if (cursoId) {
      query += ' WHERE ca.curso_id = ?';
      params.push(cursoId);
    }
    query += ' ORDER BY a.nombre ASC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al obtener asignaciones' });
  }
};

export const assignCursoAsignatura = async (req: Request, res: Response): Promise<any> => {
  try {
    const { curso_id, asignatura_id, profesor_id } = req.body;
    if (!curso_id || !asignatura_id || !profesor_id) {
      return res.status(400).json({ message: 'Curso, Asignatura y Profesor son obligatorios' });
    }

    await pool.query(
      `INSERT INTO curso_asignaturas (curso_id, asignatura_id, profesor_id) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE profesor_id = VALUES(profesor_id)`,
      [curso_id, asignatura_id, profesor_id]
    );

    return res.json({ message: 'Asignatura asignada al curso exitosamente' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al asignar asignatura al curso' });
  }
};

export const removeCursoAsignatura = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM curso_asignaturas WHERE id = ?', [id]);
    return res.json({ message: 'Asignación eliminada' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al eliminar asignación' });
  }
};

// ----------------------------------------------------
// 3. HORARIOS DE CLASES
// ----------------------------------------------------
export const getHorarioCurso = async (req: Request, res: Response): Promise<any> => {
  try {
    const { cursoId } = req.params;
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT h.id, h.curso_id, h.asignatura_id, h.profesor_id, h.dia_semana, h.bloque_hora, h.sala,
              a.nombre AS asignatura_nombre, a.codigo AS asignatura_codigo, a.color AS asignatura_color,
              u.nombre_completo AS profesor_nombre
       FROM horarios h
       JOIN asignaturas a ON h.asignatura_id = a.id
       JOIN usuarios u ON h.profesor_id = u.id
       WHERE h.curso_id = ?
       ORDER BY h.bloque_hora ASC`,
      [cursoId]
    );
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al obtener horario del curso' });
  }
};

export const saveHorarioBloque = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const { id, curso_id, asignatura_id, profesor_id, dia_semana, bloque_hora, sala } = req.body;

    if (!curso_id || !asignatura_id || !profesor_id || !dia_semana || !bloque_hora) {
      return res.status(400).json({ message: 'Todos los campos del bloque de horario son requeridos' });
    }

    // Verificar si es Profesor Jefe del curso, Directivo o Admin
    if (user.rol !== 'administrador' && user.rol !== 'directivo') {
      const [curso] = await pool.query<RowDataPacket[]>('SELECT profesor_jefe_id FROM cursos WHERE id = ?', [curso_id]);
      if (curso.length === 0 || curso[0].profesor_jefe_id !== user.id) {
        return res.status(403).json({ message: 'Solo el Profesor Jefe del curso o un Directivo puede modificar el horario' });
      }
    }

    if (id) {
      await pool.query(
        `UPDATE horarios SET asignatura_id = ?, profesor_id = ?, dia_semana = ?, bloque_hora = ?, sala = ? WHERE id = ?`,
        [asignatura_id, profesor_id, dia_semana, bloque_hora, sala || 'Sala de Clases', id]
      );
      return res.json({ message: 'Bloque de horario actualizado' });
    } else {
      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO horarios (curso_id, asignatura_id, profesor_id, dia_semana, bloque_hora, sala) VALUES (?, ?, ?, ?, ?, ?)`,
        [curso_id, asignatura_id, profesor_id, dia_semana, bloque_hora, sala || 'Sala de Clases']
      );
      return res.json({ message: 'Bloque de horario creado', id: result.insertId });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al guardar bloque de horario' });
  }
};

export const deleteHorarioBloque = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM horarios WHERE id = ?', [id]);
    return res.json({ message: 'Bloque eliminado' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al eliminar bloque de horario' });
  }
};

// ----------------------------------------------------
// 4. REGISTRO Y MÓDULO DE ASISTENCIA
// ----------------------------------------------------
export const getAsistenciaSheet = async (req: Request, res: Response): Promise<any> => {
  try {
    const { cursoId, fecha } = req.query;
    if (!cursoId || !fecha) return res.status(400).json({ message: 'Curso y Fecha son obligatorios' });

    const [alumnos] = await pool.query<RowDataPacket[]>(
      `SELECT u.id AS usuario_id, u.rut, u.nombre_completo,
              a.estado, a.hora_llegada, a.tiene_pase, a.observacion, a.id AS asistencia_id
       FROM usuarios u
       LEFT JOIN asistencia a ON u.id = a.usuario_id AND a.fecha = ? AND a.curso_id = ?
       WHERE u.rol = 'alumno' AND u.curso_id = ?
       ORDER BY u.nombre_completo ASC`,
      [fecha, cursoId, cursoId]
    );

    return res.json(alumnos);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al obtener lista de asistencia' });
  }
};

export const saveAsistenciaSheet = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const { cursoId, fecha, registros } = req.body;

    if (!cursoId || !fecha || !Array.isArray(registros)) {
      return res.status(400).json({ message: 'Datos de asistencia inválidos' });
    }

    for (const reg of registros) {
      await pool.query(
        `INSERT INTO asistencia (usuario_id, curso_id, fecha, estado, hora_llegada, observacion, registrado_por)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE estado = VALUES(estado), hora_llegada = VALUES(hora_llegada), observacion = VALUES(observacion), registrado_por = VALUES(registrado_por)`,
        [reg.usuario_id, cursoId, fecha, reg.estado || 'presente', reg.hora_llegada || null, reg.observacion || null, user.id]
      );
    }

    return res.json({ message: 'Asistencia registrada correctamente' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al guardar la asistencia' });
  }
};

export const registrarPaseAtraso = async (req: Request, res: Response): Promise<any> => {
  try {
    const emisor = (req as any).user;
    const { alumnoId, cursoId, fecha, horaLlegada, motivo } = req.body;

    if (!alumnoId || !cursoId || !fecha) {
      return res.status(400).json({ message: 'Alumno, Curso y Fecha son obligatorios' });
    }

    const hora = horaLlegada || new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });

    await pool.query(
      `INSERT INTO asistencia (usuario_id, curso_id, fecha, estado, hora_llegada, tiene_pase, observacion, registrado_por)
       VALUES (?, ?, ?, 'presente', ?, TRUE, 'Ingresó con pase de atraso', ?)
       ON DUPLICATE KEY UPDATE estado = 'presente', hora_llegada = VALUES(hora_llegada), tiene_pase = TRUE, observacion = 'Ingresó con pase de atraso', registrado_por = ?`,
      [alumnoId, cursoId, fecha, hora, emisor.id, emisor.id]
    );

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM asistencia WHERE usuario_id = ? AND curso_id = ? AND fecha = ?`,
      [alumnoId, cursoId, fecha]
    );

    if (rows.length > 0) {
      await pool.query(
        `INSERT INTO pases_atraso (asistencia_id, usuario_id, emisor_id, motivo) VALUES (?, ?, ?, ?)`,
        [rows[0].id, alumnoId, emisor.id, motivo || `Pase de atraso (llegada a las ${hora})`]
      );
    }

    return res.json({ message: `Pase de atraso registrado (${hora}) y alumno marcado como Presente` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al registrar pase de atraso' });
  }
};

export const getAsistenciaDashboard = async (req: Request, res: Response): Promise<any> => {
  try {
    const { cursoId, fecha: reqFecha } = req.query;
    if (!cursoId) return res.status(400).json({ message: 'Curso es requerido' });

    const fechaSeleccionada = (reqFecha as string) || new Date().toISOString().split('T')[0];

    // 1. Total alumnos del curso
    const [totalAlumnos] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'alumno' AND curso_id = ?`,
      [cursoId]
    );

    // 2. Detalle del día seleccionado (Presentes, Ausentes, Atrasados con hora de llegada)
    const [detalleDia] = await pool.query<RowDataPacket[]>(
      `SELECT u.id AS usuario_id, u.rut, u.nombre_completo,
              a.estado, a.hora_llegada, a.tiene_pase, a.observacion
       FROM usuarios u
       LEFT JOIN asistencia a ON u.id = a.usuario_id AND a.fecha = ? AND a.curso_id = ?
       WHERE u.rol = 'alumno' AND u.curso_id = ?
       ORDER BY u.nombre_completo ASC`,
      [fechaSeleccionada, cursoId, cursoId]
    );

    const diaPresentes = detalleDia.filter(d => d.estado === 'presente');
    const diaAusentes = detalleDia.filter(d => d.estado === 'ausente' || !d.estado);
    const diaAtrasados = detalleDia.filter(d => d.estado === 'atrasado');

    // 3. Métricas globales de asistencia del curso
    const [metricas] = await pool.query<RowDataPacket[]>(
      `SELECT 
         COUNT(*) AS total_registros,
         SUM(CASE WHEN estado = 'presente' THEN 1 ELSE 0 END) AS total_presentes,
         SUM(CASE WHEN estado = 'ausente' THEN 1 ELSE 0 END) AS total_ausentes,
         SUM(CASE WHEN estado = 'atrasado' THEN 1 ELSE 0 END) AS total_atrasados,
         SUM(CASE WHEN tiene_pase = TRUE THEN 1 ELSE 0 END) AS total_pases
       FROM asistencia WHERE curso_id = ?`,
      [cursoId]
    );

    // 4. Asistencia por Asignatura (Cátedras asociadas al curso)
    const [porAsignatura] = await pool.query<RowDataPacket[]>(
      `SELECT a.id AS asignatura_id, a.nombre AS asignatura_nombre, a.codigo AS asignatura_codigo, a.color AS asignatura_color,
              COUNT(ast.id) AS total_clases,
              SUM(CASE WHEN ast.estado = 'presente' THEN 1 ELSE 0 END) AS presentes,
              SUM(CASE WHEN ast.estado = 'ausente' THEN 1 ELSE 0 END) AS ausentes,
              SUM(CASE WHEN ast.estado = 'atrasado' THEN 1 ELSE 0 END) AS atrasados
       FROM curso_asignaturas ca
       JOIN asignaturas a ON ca.asignatura_id = a.id
       LEFT JOIN asistencia ast ON ast.curso_id = ca.curso_id AND ast.asignatura_id = a.id
       WHERE ca.curso_id = ?
       GROUP BY a.id, a.nombre, a.codigo, a.color`,
      [cursoId]
    );

    // 5. Asistencia Individual de cada Alumno
    const [alumnosIndividual] = await pool.query<RowDataPacket[]>(
      `SELECT u.id AS usuario_id, u.rut, u.nombre_completo,
              COUNT(a.id) AS total_dias,
              SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) AS presentes,
              SUM(CASE WHEN a.estado = 'ausente' THEN 1 ELSE 0 END) AS ausentes,
              SUM(CASE WHEN a.estado = 'atrasado' THEN 1 ELSE 0 END) AS atrasados,
              GROUP_CONCAT(DISTINCT CASE WHEN a.estado = 'atrasado' OR a.tiene_pase = TRUE THEN CONCAT(DATE_FORMAT(a.fecha, '%d/%m'), ' (', COALESCE(a.hora_llegada, 's/h'), ')') ELSE NULL END SEPARATOR ', ') AS atrasos_detalle
       FROM usuarios u
       LEFT JOIN asistencia a ON u.id = a.usuario_id AND a.curso_id = ?
       WHERE u.rol = 'alumno' AND u.curso_id = ?
       GROUP BY u.id, u.rut, u.nombre_completo
       ORDER BY u.nombre_completo ASC`,
      [cursoId, cursoId]
    );

    // 6. Ranking de alumnos críticos
    const [criticos] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.rut, u.nombre_completo,
              SUM(CASE WHEN a.estado = 'ausente' THEN 1 ELSE 0 END) AS inasistencias,
              SUM(CASE WHEN a.estado = 'atrasado' THEN 1 ELSE 0 END) AS atrasos,
              COUNT(a.id) AS total_dias
       FROM usuarios u
       LEFT JOIN asistencia a ON u.id = a.usuario_id AND a.curso_id = ?
       WHERE u.rol = 'alumno' AND u.curso_id = ?
       GROUP BY u.id, u.rut, u.nombre_completo
       HAVING inasistencias > 0 OR atrasos > 0
       ORDER BY inasistencias DESC, atrasos DESC
       LIMIT 10`,
      [cursoId, cursoId]
    );

    return res.json({
      fechaSeleccionada,
      totalAlumnos: totalAlumnos[0]?.total || 0,
      stats: metricas[0] || {},
      detalleDia: {
        presentes: diaPresentes,
        ausentes: diaAusentes,
        atrasados: diaAtrasados
      },
      porAsignatura,
      alumnosIndividual,
      criticos
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al obtener dashboard de asistencia' });
  }
};

// ----------------------------------------------------
// 6. EMISIÓN DE INFORMES DE NOTAS (PDF)
// ----------------------------------------------------
export const getGradeReportData = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    let { cursoId, periodo = 's1', alumnoId } = req.query;

    if (user.rol === 'alumno') {
      return res.status(403).json({ message: 'Los alumnos no tienen permiso para generar informes de notas.' });
    }

    if (!cursoId) return res.status(400).json({ message: 'El curso es obligatorio' });

    // 1. Obtener información del curso y su Profesor Jefe
    const [cursoRows] = await pool.query<RowDataPacket[]>(
      `SELECT c.id, c.nombre, c.profesor_jefe_id, u.nombre_completo AS profesor_jefe_nombre
       FROM cursos c
       LEFT JOIN usuarios u ON c.profesor_jefe_id = u.id
       WHERE c.id = ?`,
      [cursoId]
    );

    if (cursoRows.length === 0) return res.status(404).json({ message: 'Curso no encontrado' });
    const cursoInfo = cursoRows[0];
    
    // Verificar si es Profesor Jefe, Directivo o Administrador
    const isJefeOrAdmin = user.rol === 'administrador' || user.rol === 'directivo' || (user.rol === 'profesor' && cursoInfo.profesor_jefe_id === user.id);
    
    if (!isJefeOrAdmin) {
      return res.status(403).json({ message: 'Solo el profesor jefe, directivos o administradores pueden generar informes de notas.' });
    }

    // 2. Obtener lista de alumnos
    let studentQuery = `SELECT id, rut, nombre_completo FROM usuarios WHERE rol = 'alumno' AND curso_id = ?`;
    const studentParams: any[] = [cursoId];

    if (alumnoId) {
      studentQuery += ` AND id = ?`;
      studentParams.push(alumnoId);
    }
    studentQuery += ` ORDER BY nombre_completo ASC`;

    const [alumnos] = await pool.query<RowDataPacket[]>(studentQuery, studentParams);

    // 3. Determinar asignaturas
    let asignaturasQuery = `SELECT id, nombre, codigo FROM asignaturas ORDER BY nombre ASC`;
    const asignaturasParams: any[] = [];

    const [asignaturas] = await pool.query<RowDataPacket[]>(asignaturasQuery, asignaturasParams);

    // 4. Construir la nómina detallada de informes por alumno
    const informes = [];

    for (const alumno of alumnos) {
      const [califRows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM calificaciones WHERE usuario_id = ?`,
        [alumno.id]
      );

      const [astRows] = await pool.query<RowDataPacket[]>(
        `SELECT 
           COUNT(*) AS total,
           SUM(CASE WHEN estado = 'presente' OR estado = 'atrasado' OR tiene_pase = TRUE THEN 1 ELSE 0 END) AS asistidos
         FROM asistencia WHERE usuario_id = ? AND curso_id = ?`,
        [alumno.id, cursoId]
      );

      const totalDias = Number(astRows[0]?.total || 0);
      const diasAsistidos = Number(astRows[0]?.asistidos || 0);
      const pctAsistencia = totalDias > 0 ? Number(((diasAsistidos / totalDias) * 100).toFixed(1)) : 100;

      let sumaPromedios = 0;
      let asignaturasConPromedio = 0;

      const filasAsignaturas = asignaturas.map(asig => {
        const calif = califRows.find((c: any) => c.asignatura_id === asig.id) || {};
        const n1 = periodo === 's2' ? calif.s2_n1 : calif.s1_n1;
        const n2 = periodo === 's2' ? calif.s2_n2 : calif.s1_n2;
        const n3 = periodo === 's2' ? calif.s2_n3 : calif.s1_n3;
        const n4 = periodo === 's2' ? calif.s2_n4 : calif.s1_n4;
        const n5 = periodo === 's2' ? calif.s2_n5 : calif.s1_n5;
        const n6 = periodo === 's2' ? calif.s2_n6 : calif.s1_n6;
        const n7 = periodo === 's2' ? calif.s2_n7 : null;
        const n8 = periodo === 's2' ? calif.s2_n8 : null;

        const notasValidas = [n1, n2, n3, n4, n5, n6, n7, n8].map(n => n ? parseFloat(String(n)) : null).filter((n): n is number => n !== null && !isNaN(n));
        
        let promVal = null;
        if (notasValidas.length > 0) {
          const sum = notasValidas.reduce((acc, curr) => acc + curr, 0);
          promVal = Number((sum / notasValidas.length).toFixed(1));
          sumaPromedios += promVal;
          asignaturasConPromedio++;
        }

        return {
          asignatura_id: asig.id,
          asignatura_nombre: asig.nombre,
          n1: n1 || '',
          n2: n2 || '',
          n3: n3 || '',
          n4: n4 || '',
          n5: n5 || '',
          n6: n6 || '',
          n7: n7 || '',
          n8: n8 || '',
          promedio: promVal !== null ? promVal.toFixed(1) : '',
          observacion: ''
        };
      });

      const promedioGeneral = asignaturasConPromedio > 0 ? (sumaPromedios / asignaturasConPromedio).toFixed(1) : '-';

      informes.push({
        alumno: {
          id: alumno.id,
          rut: alumno.rut,
          nombre_completo: alumno.nombre_completo
        },
        curso: {
          id: cursoInfo.id,
          nombre: cursoInfo.nombre,
          profesor_jefe_nombre: cursoInfo.profesor_jefe_nombre || 'No asignado'
        },
        periodo,
        filasAsignaturas,
        promedioGeneral,
        asistenciaPct: `${pctAsistencia}%`
      });
    }

    return res.json({
      curso: cursoInfo,
      periodo,
      isJefeOrAdmin,
      informes
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al generar datos del informe de notas' });
  }
};
export const getStudentSummary = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    if (user.rol !== 'alumno') return res.status(403).json({ message: 'Solo alumnos pueden ver este resumen' });

    // Find course of the student
    const [uRows] = await pool.query<RowDataPacket[]>('SELECT curso_id FROM usuarios WHERE id = ?', [user.id]);
    const cursoId = uRows[0]?.curso_id;
    if (!cursoId) return res.json({ asignaturas: [] });

    // Fetch asignaturas for the course
    const [asignaturas] = await pool.query<RowDataPacket[]>(
      `SELECT a.id, a.nombre, a.codigo, a.color, u.nombre_completo AS profesor_nombre
       FROM curso_asignaturas ca
       JOIN asignaturas a ON ca.asignatura_id = a.id
       JOIN usuarios u ON ca.profesor_id = u.id
       WHERE ca.curso_id = ?
       ORDER BY a.nombre ASC`,
      [cursoId]
    );

    // Fetch calificaciones for the student
    const [calificaciones] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM calificaciones WHERE usuario_id = ?',
      [user.id]
    );

    // Compute averages
    const asignaturasSummary = asignaturas.map(asig => {
      const calif = calificaciones.find((c: any) => c.asignatura_id === asig.id) || {};
      const s1Notas = [
        calif.s1_n1, calif.s1_n2, calif.s1_n3, calif.s1_n4, calif.s1_n5, calif.s1_n6
      ].map(n => n ? parseFloat(String(n)) : null).filter((n): n is number => n !== null && !isNaN(n));

      const s2Notas = [
        calif.s2_n1, calif.s2_n2, calif.s2_n3, calif.s2_n4, calif.s2_n5, calif.s2_n6
      ].map(n => n ? parseFloat(String(n)) : null).filter((n): n is number => n !== null && !isNaN(n));

      let s1Avg = null;
      if (s1Notas.length > 0) {
        s1Avg = Number((s1Notas.reduce((a, b) => a + b, 0) / s1Notas.length).toFixed(1));
      }

      let s2Avg = null;
      if (s2Notas.length > 0) {
        s2Avg = Number((s2Notas.reduce((a, b) => a + b, 0) / s2Notas.length).toFixed(1));
      }

      let promedio = null;
      if (s1Avg !== null && s2Avg !== null) {
        promedio = Number(((s1Avg + s2Avg) / 2).toFixed(1));
      } else if (s1Avg !== null) {
        promedio = s1Avg;
      } else if (s2Avg !== null) {
        promedio = s2Avg;
      }

      return {
        ...asig,
        promedio,
        calificaciones: calif
      };
    });

    return res.json({ asignaturas: asignaturasSummary });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al obtener resumen del estudiante' });
  }
};

