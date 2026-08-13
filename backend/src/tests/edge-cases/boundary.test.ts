import { RutUtil } from '../../utils/rut';
import { sanitizeString } from '../../middlewares/sanitizer';

export function runEdgeCaseTests(): { name: string; passed: boolean; details?: string }[] {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  const assert = (testName: string, condition: boolean, details?: string) => {
    results.push({ name: testName, passed: condition, details });
  };

  // Edge Case 1: Null/undefined/empty string in RutUtil
  assert('Edge Case - RutUtil maneja null y undefined', RutUtil.clean(null as any) === '' && RutUtil.clean(undefined as any) === '');

  // Edge Case 2: Extreme long string in Sanitizer
  const longString = 'A'.repeat(100000);
  assert('Edge Case - Sanitizer procesa cadenas extensas sin crash ni desbordamiento', sanitizeString(longString).length === 100000);

  // Edge Case 3: Special Unicode characters in name sanitization
  const unicodeString = 'María José Ñuñoa-González 🚀';
  assert('Edge Case - Sanitizer preserva tildes, eñes y emojis legítimos', sanitizeString(unicodeString) === unicodeString);

  // Edge Case 4: Array with nested nulls
  assert('Edge Case - Sanitizer maneja valores nulos sin lanzar excepción', sanitizeString(null as any) === null);

  return results;
}
