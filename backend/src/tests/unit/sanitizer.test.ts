import { sanitizeString } from '../../middlewares/sanitizer';

export function runSanitizerUnitTests(): { name: string; passed: boolean; details?: string }[] {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  const assert = (testName: string, condition: boolean, details?: string) => {
    results.push({ name: testName, passed: condition, details });
  };

  // Test 1: Script tag removal
  const xssPayload = '<script>alert("XSS")</script>Hola';
  assert('sanitizeString - Neutraliza etiquetas <script>', sanitizeString(xssPayload) === 'Hola');

  // Test 2: Javascript URI removal
  const jsPayload = 'javascript:alert(1)';
  assert('sanitizeString - Neutraliza javascript: URI', !sanitizeString(jsPayload).includes('javascript:'));

  // Test 3: Event handler removal
  const eventPayload = 'img src=x onload=alert(1)';
  assert('sanitizeString - Neutraliza eventos inline (onload=)', !sanitizeString(eventPayload).includes('onload='));

  // Test 4: Normal string preservation
  const normalText = 'Juan Pérez 12.345.678-9';
  assert('sanitizeString - Preserva texto legítimo intacto', sanitizeString(normalText) === normalText);

  return results;
}
