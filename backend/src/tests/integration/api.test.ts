import { pool } from '../../db';
import { RowDataPacket } from 'mysql2';

export async function runIntegrationTests(): Promise<{ name: string; passed: boolean; details?: string }[]> {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  const assert = (testName: string, condition: boolean, details?: string) => {
    results.push({ name: testName, passed: condition, details });
  };

  // Test 1: Conexión activa a base de datos MySQL
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT 1 AS alive');
    assert('Database Integration - Conexión MySQL responde SELECT 1', rows.length > 0 && rows[0].alive === 1);
  } catch (err: any) {
    assert('Database Integration - Conexión MySQL responde SELECT 1', false, err.message);
  }

  // Test 2: Verificación de estructura de tablas principales
  try {
    const [tables] = await pool.query<RowDataPacket[]>('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);

    assert('Database Integration - Existe tabla usuarios', tableNames.includes('usuarios'));
    assert('Database Integration - Existe tabla entregas', tableNames.includes('entregas'));
    assert('Database Integration - Existe tabla grupos_trabajo', tableNames.includes('grupos_trabajo'));
    assert('Database Integration - Existe tabla grupo_integrantes', tableNames.includes('grupo_integrantes'));
  } catch (err: any) {
    assert('Database Integration - Estructura de tablas', false, err.message);
  }

  return results;
}
