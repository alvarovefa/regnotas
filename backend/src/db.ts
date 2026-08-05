import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3307,
  user: process.env.DB_USER || 'compulab_user',
  password: process.env.DB_PASSWORD || 'compulab_password',
  database: process.env.DB_NAME || 'compulab_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.getConnection()
  .then((conn) => {
    console.log('✅ Conexión a la base de datos MySQL establecida correctamente.');
    conn.release();
  })
  .catch((err) => {
    console.error('❌ Error al conectar con la base de datos MySQL:', err.message);
  });
