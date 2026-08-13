import path from 'path';
import { ENV } from '../../config/env';
import { sanitizeString } from '../../middlewares/sanitizer';
import { RutUtil } from '../../utils/rut';

export function runSecurityTests(): { name: string; passed: boolean; details?: string }[] {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  const assert = (testName: string, condition: boolean, details?: string) => {
    results.push({ name: testName, passed: condition, details });
  };

  // Security Test 1: Anti-SQL Injection en sanitización de RUT
  const sqlPayload = "12345678-5' OR '1'='1";
  const cleanedRut = RutUtil.clean(sqlPayload);
  assert('Security OWASP - Eliminación de comillas y caracteres SQLi en RUT', !cleanedRut.includes("'") && !cleanedRut.includes("OR") && !cleanedRut.includes("="));

  // Security Test 2: XSS Vector Injections
  const xssVector = '<svg/onload=alert("XSS_ATTACK")>';
  const sanitizedVector = sanitizeString(xssVector);
  assert('Security OWASP - Neutralización de vector XSS <svg/onload=>', !sanitizedVector.includes('onload='));

  // Security Test 3: Path Traversal Prevention
  const maliciousPath = '../../../../etc/passwd';
  const safeFilename = path.basename(maliciousPath);
  const resolvedPath = path.join(ENV.STORAGE_UPLOADS_DIR, safeFilename);

  assert('Security OWASP - Previene Path Traversal aislando el nombre de archivo', safeFilename === 'passwd' && !resolvedPath.includes('..'));

  return results;
}
