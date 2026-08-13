import { runRutUnitTests } from './unit/rut.test';
import { runSanitizerUnitTests } from './unit/sanitizer.test';
import { runAuthUnitTests } from './unit/authService.test';
import { runIntegrationTests } from './integration/api.test';
import { runEdgeCaseTests } from './edge-cases/boundary.test';
import { runSecurityTests } from './security/security.test';

async function executeAllTests() {
  console.log('\n======================================================');
  console.log('🧪 EJECUTANDO SUITE DE PRUEBAS DE ARQUITECTURA Y QA');
  console.log('======================================================\n');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  const suites: { category: string; tests: { name: string; passed: boolean; details?: string }[] }[] = [];

  // 1. Unit Tests
  const rutTests = runRutUnitTests();
  const sanitizerTests = runSanitizerUnitTests();
  const authUnitTests = await runAuthUnitTests();
  suites.push({ category: 'CAPA 1: PRUEBAS UNITARIAS (Unit Tests)', tests: [...rutTests, ...sanitizerTests, ...authUnitTests] });

  // 2. Integration Tests
  const integrationTests = await runIntegrationTests();
  suites.push({ category: 'CAPA 2: PRUEBAS DE INTEGRACIÓN (Integration Tests)', tests: integrationTests });

  // 3. Edge Case Tests
  const edgeTests = runEdgeCaseTests();
  suites.push({ category: 'CAPA 3: PRUEBAS DE ESTRÉS Y BORDE (Edge Case Testing)', tests: edgeTests });

  // 4. Security Tests
  const secTests = runSecurityTests();
  suites.push({ category: 'CAPA 4: PRUEBAS DE SEGURIDAD Y OWASP (Security & QA)', tests: secTests });

  // Imprimir reporte por suite
  for (const suite of suites) {
    console.log(`\n📌 ${suite.category}`);
    console.log('------------------------------------------------------');
    for (const t of suite.tests) {
      totalTests++;
      if (t.passed) {
        passedTests++;
        console.log(`  ✅ PASSED: ${t.name}`);
      } else {
        failedTests++;
        console.log(`  ❌ FAILED: ${t.name}${t.details ? ` (${t.details})` : ''}`);
      }
    }
  }

  console.log('\n======================================================');
  console.log('📊 RESUMEN FINAL DE COBERTURA Y PRUEBAS QA');
  console.log('======================================================');
  console.log(`  Total Pruebas Ejecutadas: ${totalTests}`);
  console.log(`  Pruebas Exitosas:         ${passedTests}`);
  console.log(`  Pruebas Fallidas:         ${failedTests}`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

executeAllTests().catch((err) => {
  console.error('Error al ejecutar suite de pruebas:', err);
  process.exit(1);
});
