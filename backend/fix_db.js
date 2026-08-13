const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixDb() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3307,
    user: process.env.DB_USER || 'compulab_user',
    password: process.env.DB_PASSWORD || 'compulab_password',
    database: process.env.DB_NAME || 'compulab_db',
  });

  console.log('Connected to MySQL to verify schema...');

  try {
    await connection.query(`ALTER TABLE usuarios ADD COLUMN foto_perfil VARCHAR(500) NULL;`);
    console.log('Column foto_perfil added to usuarios table.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column foto_perfil already exists in usuarios table.');
    } else {
      console.error('Error adding foto_perfil column:', err.message);
    }
  }

  await connection.end();
  console.log('DB fix done.');
}

fixDb().catch(console.error);
