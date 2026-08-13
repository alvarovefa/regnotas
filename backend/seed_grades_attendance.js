const mysql = require('mysql2/promise');

const getRandomGrade = () => {
  // 85% probabilidad de nota azul (4.0 - 7.0), 15% probabilidad de nota roja (1.5 - 3.9)
  const isGood = Math.random() > 0.15;
  let val;
  if (isGood) {
    val = 4.0 + Math.random() * 3.0; // 4.0 a 7.0
  } else {
    val = 1.5 + Math.random() * 2.4; // 1.5 a 3.9
  }
  return Number(val.toFixed(1));
};

async function seedData() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3307,
    user: 'compulab_user',
    password: 'compulab_password',
    database: 'compulab_db'
  });

  console.log('Iniciando poblamiento masivo de notas y asistencia...');

  // 1. Obtener todos los alumnos
  const [alumnos] = await connection.query(
    'SELECT id, curso_id FROM usuarios WHERE rol = "alumno"'
  );

  console.log(`Total de alumnos a procesar: ${alumnos.length}`);

  // 2. Insertar/Actualizar Calificaciones S1 y S2 para todos los alumnos
  console.log('Poblando calificaciones S1 y S2...');

  let gradesCount = 0;
  for (const alumno of alumnos) {
    const s1_n1 = getRandomGrade();
    const s1_n2 = getRandomGrade();
    const s1_n3 = getRandomGrade();
    const s1_n4 = getRandomGrade();
    const s1_n5 = getRandomGrade();
    const s1_n6 = getRandomGrade();

    const s2_n1 = getRandomGrade();
    const s2_n2 = getRandomGrade();
    const s2_n3 = getRandomGrade();
    const s2_n4 = getRandomGrade();
    const s2_n5 = getRandomGrade();
    const s2_n6 = getRandomGrade();

    const avgS1 = (s1_n1 + s1_n2 + s1_n3 + s1_n4 + s1_n5 + s1_n6) / 6;
    const avgS2 = (s2_n1 + s2_n2 + s2_n3 + s2_n4 + s2_n5 + s2_n6) / 6;
    const overallAvg = (avgS1 + avgS2) / 2;

    const nota_recuperativa = overallAvg < 4.0 ? Number((4.0 + Math.random() * 1.5).toFixed(1)) : null;

    await connection.query(
      `INSERT INTO calificaciones 
        (usuario_id, s1_n1, s1_n2, s1_n3, s1_n4, s1_n5, s1_n6, s2_n1, s2_n2, s2_n3, s2_n4, s2_n5, s2_n6, nota_recuperativa)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        s1_n1=VALUES(s1_n1), s1_n2=VALUES(s1_n2), s1_n3=VALUES(s1_n3), s1_n4=VALUES(s1_n4), s1_n5=VALUES(s1_n5), s1_n6=VALUES(s1_n6),
        s2_n1=VALUES(s2_n1), s2_n2=VALUES(s2_n2), s2_n3=VALUES(s2_n3), s2_n4=VALUES(s2_n4), s2_n5=VALUES(s2_n5), s2_n6=VALUES(s2_n6),
        nota_recuperativa=VALUES(nota_recuperativa)`,
      [
        alumno.id,
        s1_n1, s1_n2, s1_n3, s1_n4, s1_n5, s1_n6,
        s2_n1, s2_n2, s2_n3, s2_n4, s2_n5, s2_n6,
        nota_recuperativa
      ]
    );
    gradesCount++;
  }
  console.log(`Calificaciones registradas exitosamente para ${gradesCount} alumnos.`);

  // 3. Generar Asistencia para S1 y S2
  console.log('Poblando registros de asistencia S1 y S2...');

  // Fechas S1 (Marzo a Julio 2026 - 15 días hábiles representativos)
  const fechasS1 = [
    '2026-03-09', '2026-03-16', '2026-03-23', '2026-03-30',
    '2026-04-06', '2026-04-13', '2026-04-20', '2026-04-27',
    '2026-05-11', '2026-05-18', '2026-05-25',
    '2026-06-08', '2026-06-15', '2026-06-22', '2026-07-06'
  ];

  // Fechas S2 (Agosto a Noviembre 2026 - 15 días hábiles representativos)
  const fechasS2 = [
    '2026-08-03', '2026-08-10', '2026-08-17', '2026-08-24', '2026-08-31',
    '2026-09-07', '2026-09-14', '2026-09-28',
    '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26',
    '2026-11-09', '2026-11-16', '2026-11-23'
  ];

  const todasLasFechas = [...fechasS1, ...fechasS2];

  let attendanceCount = 0;
  for (const alumno of alumnos) {
    if (!alumno.curso_id) continue;

    for (const fecha of todasLasFechas) {
      const rand = Math.random();
      let estado = 'presente';
      let hora_llegada = null;
      let tiene_pase = 0;

      if (rand < 0.08) {
        estado = 'ausente';
      } else if (rand < 0.15) {
        estado = 'atrasado';
        tiene_pase = 1;
        const mins = 15 + Math.floor(Math.random() * 30);
        hora_llegada = `08:${mins < 10 ? '0' + mins : mins}`;
      }

      await connection.query(
        `INSERT INTO asistencia 
          (usuario_id, curso_id, fecha, estado, hora_llegada, tiene_pase, registrado_por)
         VALUES (?, ?, ?, ?, ?, ?, 5)
         ON DUPLICATE KEY UPDATE 
          estado = VALUES(estado), hora_llegada = VALUES(hora_llegada), tiene_pase = VALUES(tiene_pase)`,
        [alumno.id, alumno.curso_id, fecha, estado, hora_llegada, tiene_pase]
      );
      attendanceCount++;
    }
  }

  console.log(`Registros de asistencia insertados: ${attendanceCount}`);
  console.log('POBLAMIENTO COMPLETO FINALIZADO CON ÉXITO');
  process.exit(0);
}

seedData().catch(err => {
  console.error('Error durante el poblamiento:', err);
  process.exit(1);
});
