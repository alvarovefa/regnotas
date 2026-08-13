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
      const notas = [
        calif.s1_n1, calif.s1_n2, calif.s1_n3, calif.s1_n4, calif.s1_n5, calif.s1_n6,
        calif.s2_n1, calif.s2_n2, calif.s2_n3, calif.s2_n4, calif.s2_n5, calif.s2_n6
      ].map(n => n ? parseFloat(String(n)) : null).filter((n): n is number => n !== null && !isNaN(n));

      let promedio = null;
      if (notas.length > 0) {
        const sum = notas.reduce((acc, curr) => acc + curr, 0);
        promedio = Number((sum / notas.length).toFixed(1));
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
