const mysql = require('mysql2/promise');

async function seed() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    port: 3307,
    user: 'compulab_user',
    password: 'compulab_password',
    database: 'compulab_db'
  });

  try {
    // Get all students
    const [students] = await pool.query("SELECT id, curso_id FROM usuarios WHERE rol = 'alumno'");
    
    // Get all course_asignaturas
    const [cursoAsignaturas] = await pool.query("SELECT curso_id, asignatura_id FROM curso_asignaturas");

    let count = 0;

    for (const student of students) {
      const { id: usuario_id, curso_id } = student;
      if (!curso_id) continue;

      const asigs = cursoAsignaturas.filter(ca => ca.curso_id === curso_id);
      
      for (const asig of asigs) {
        const { asignatura_id } = asig;

        // generate random grades between 1.0 and 7.0
        const randGrade = () => (Math.random() * 6 + 1).toFixed(1);

        const grades = {
          s1_n1: randGrade(),
          s1_n2: randGrade(),
          s1_n3: randGrade(),
          s1_n4: randGrade(),
          s1_n5: randGrade(),
          s1_n6: randGrade(),
          s2_n1: randGrade(),
          s2_n2: randGrade(),
          s2_n3: randGrade(),
          s2_n4: randGrade(),
          s2_n5: randGrade(),
          s2_n6: randGrade(),
        };

        // Insert or replace
        await pool.query(
          `INSERT INTO calificaciones 
           (usuario_id, asignatura_id, s1_n1, s1_n2, s1_n3, s1_n4, s1_n5, s1_n6, s2_n1, s2_n2, s2_n3, s2_n4, s2_n5, s2_n6)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
           s1_n1=VALUES(s1_n1), s1_n2=VALUES(s1_n2), s1_n3=VALUES(s1_n3), s1_n4=VALUES(s1_n4), s1_n5=VALUES(s1_n5), s1_n6=VALUES(s1_n6),
           s2_n1=VALUES(s2_n1), s2_n2=VALUES(s2_n2), s2_n3=VALUES(s2_n3), s2_n4=VALUES(s2_n4), s2_n5=VALUES(s2_n5), s2_n6=VALUES(s2_n6)`,
          [
            usuario_id, asignatura_id,
            grades.s1_n1, grades.s1_n2, grades.s1_n3, grades.s1_n4, grades.s1_n5, grades.s1_n6,
            grades.s2_n1, grades.s2_n2, grades.s2_n3, grades.s2_n4, grades.s2_n5, grades.s2_n6
          ]
        );
        count++;
      }
    }

    console.log(`Successfully seeded ${count} grades records (user-subject pairs).`);
  } catch (error) {
    console.error('Error seeding grades:', error);
  } finally {
    await pool.end();
  }
}

seed();
