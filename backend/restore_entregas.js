const mysql = require('mysql2/promise');

async function restore() {
  const c = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3307,
    user: 'compulab_user',
    password: 'compulab_password',
    database: 'compulab_db'
  });

  try {
    const [alumnos] = await c.query('SELECT id, curso_id FROM usuarios WHERE curso_id IN (9, 10, 11, 13) AND rol = "alumno"');
    
    let count = 0;
    for (const al of alumnos) {
      // Create a dummy tarea and evaluacion for each student
      await c.query(`
        INSERT INTO entregas (usuario_id, asignatura_id, nombre_original, nombre_almacenado, ruta_archivo, tamano_bytes, extension, tipo_entrega)
        VALUES (?, 12, 'Tarea_Restaurada.docx', 'dummy.docx', 'uploads/dummy.docx', 1024, '.docx', 'tarea')
      `, [al.id]);

      await c.query(`
        INSERT INTO entregas (usuario_id, asignatura_id, nombre_original, nombre_almacenado, ruta_archivo, tamano_bytes, extension, tipo_entrega)
        VALUES (?, 12, 'Evaluacion_Restaurada.pdf', 'dummy.pdf', 'uploads/dummy.pdf', 2048, '.pdf', 'evaluacion')
      `, [al.id]);
      count += 2;
    }
    
    console.log(`Restauradas ${count} entregas para los alumnos de 3 Medio.`);
  } finally {
    await c.end();
  }
}

restore().catch(console.error);
