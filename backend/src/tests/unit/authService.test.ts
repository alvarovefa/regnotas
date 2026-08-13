import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ENV } from '../../config/env';
import { JWTPayload } from '../../types';

export async function runAuthUnitTests(): Promise<{ name: string; passed: boolean; details?: string }[]> {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  const assert = (testName: string, condition: boolean, details?: string) => {
    results.push({ name: testName, passed: condition, details });
  };

  // Test 1: Password hashing and comparison
  const rawPassword = 'MiPasswordSeguro123';
  const hashed = await bcrypt.hash(rawPassword, 10);
  const isValidMatch = await bcrypt.compare(rawPassword, hashed);
  const isInvalidMatch = await bcrypt.compare('PasswordIncorrecto', hashed);

  assert('Bcrypt - Verifica contraseña correcta', isValidMatch);
  assert('Bcrypt - Rechaza contraseña incorrecta', !isInvalidMatch);

  // Test 2: JWT Signing and Verification
  const payload: JWTPayload = {
    id: 100,
    rut: '12345678-5',
    rol: 'profesor',
    nombre: 'Profesor Prueba'
  };

  const token = jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '1h' });
  const decoded = jwt.verify(token, ENV.JWT_SECRET) as JWTPayload;

  assert('JWT - Firma token correctamente', typeof token === 'string' && token.length > 20);
  assert('JWT - Decodifica payload manteniendo integridad de campos', decoded.id === 100 && decoded.rol === 'profesor');

  return results;
}
