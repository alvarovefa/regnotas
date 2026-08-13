const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3307,
    user: process.env.DB_USER || 'compulab_user',
    password: process.env.DB_PASSWORD || 'compulab_password',
    database: process.env.DB_NAME || 'compulab_db',
  });

  console.log('Connected to MySQL for migration...');

  await connection.query(`
    CREATE TABLE IF NOT EXISTS grupos_trabajo (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      curso_id INT NOT NULL,
      creado_por INT NOT NULL,
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
      FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE CASCADE
    );
  `);
  console.log('Table grupos_trabajo created/verified.');

  await connection.query(`
    CREATE TABLE IF NOT EXISTS grupo_integrantes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      grupo_id INT NOT NULL,
      usuario_id INT NOT NULL,
      fecha_union TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (grupo_id) REFERENCES grupos_trabajo(id) ON DELETE CASCADE,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      UNIQUE KEY uq_grupo_usuario (grupo_id, usuario_id)
    );
  `);
  console.log('Table grupo_integrantes created/verified.');

  try {
    await connection.query(`
      ALTER TABLE entregas ADD COLUMN grupo_id INT NULL;
    `);
    console.log('Column grupo_id added to entregas.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column grupo_id already exists in entregas.');
    } else {
      console.error('Error adding grupo_id column:', err.message);
    }
  }

  try {
    await connection.query(`
      ALTER TABLE entregas ADD CONSTRAINT fk_entregas_grupo FOREIGN KEY (grupo_id) REFERENCES grupos_trabajo(id) ON DELETE SET NULL;
    `);
    console.log('FK fk_entregas_grupo added to entregas.');
  } catch (err) {
    console.log('FK constraint notice:', err.message);
  }

  await connection.end();
  console.log('Migration finished successfully!');
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
