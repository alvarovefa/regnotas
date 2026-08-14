const mysql = require('mysql2/promise');
const fs = require('fs');

async function update() {
  const sql = `
CREATE TABLE IF NOT EXISTS recursos_compartidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profesor_id INT NOT NULL,
    curso_id INT NULL,
    asignatura_id INT NOT NULL,
    alumno_id INT NULL,
    nombre_original VARCHAR(255) NOT NULL,
    nombre_almacenado VARCHAR(255) NOT NULL,
    ruta_archivo VARCHAR(500) NOT NULL,
    tamano_bytes BIGINT NOT NULL,
    extension VARCHAR(10) NOT NULL,
    fecha_hora_subida TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (profesor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    FOREIGN KEY (asignatura_id) REFERENCES asignaturas(id) ON DELETE CASCADE,
    FOREIGN KEY (alumno_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
  `;
  fs.appendFileSync('../schema.sql', sql);

  const c = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3307,
    user: 'compulab_user',
    password: 'compulab_password',
    database: 'compulab_db'
  });

  try {
    await c.query(sql);
    console.log('Tabla recursos_compartidos creada.');
  } finally {
    await c.end();
  }
}

update().catch(console.error);
