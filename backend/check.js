const mysql = require('mysql2/promise');

async function clean() {
  const c = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3307,
    user: 'compulab_user',
    password: 'compulab_password',
    database: 'compulab_db'
  });

  try {
    const [res] = await c.query("DELETE FROM entregas WHERE nombre_original IN ('Tarea_Restaurada.docx', 'Evaluacion_Restaurada.pdf')");
    console.log('Filas eliminadas:', res.affectedRows);
  } finally {
    await c.end();
  }
}

clean().catch(console.error);
