import { RutUtil } from '../../utils/rut';

export function runRutUnitTests(): { name: string; passed: boolean; details?: string }[] {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  const assert = (testName: string, condition: boolean, details?: string) => {
    results.push({ name: testName, passed: condition, details });
  };

  // Test 1: Clean RUT
  assert('RutUtil.clean - elimina puntos, guiones y espacios', RutUtil.clean(' 12.345.678-k ') === '12345678K');

  // Test 2: Valid RUTs
  assert('RutUtil.isValid - RUT válido con K (1.000.005-K)', RutUtil.isValid('1.000.005-K'));
  assert('RutUtil.isValid - RUT válido numérico (12.345.678-5)', RutUtil.isValid('12345678-5'));

  // Test 3: Invalid RUTs
  assert('RutUtil.isValid - Rechaza DV incorrecto (12345678-9)', !RutUtil.isValid('12345678-9'));
  assert('RutUtil.isValid - Rechaza formato corto (123)', !RutUtil.isValid('123'));
  assert('RutUtil.isValid - Rechaza letras en el cuerpo (ABCD5678-K)', !RutUtil.isValid('ABCD5678-K'));

  // Test 4: Format RUT
  assert('RutUtil.format - formatea correctamente', RutUtil.format('12345678k') === '12345678-K');

  return results;
}
