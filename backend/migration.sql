CREATE TEMPORARY TABLE temp_user_asig AS
SELECT u.id AS usuario_id, MIN(ca.asignatura_id) AS min_asig
FROM usuarios u
JOIN curso_asignaturas ca ON u.curso_id = ca.curso_id
GROUP BY u.id;

-- Calificaciones
ALTER TABLE calificaciones ADD COLUMN asignatura_id INT NULL;

UPDATE calificaciones c
JOIN temp_user_asig t ON c.usuario_id = t.usuario_id
SET c.asignatura_id = t.min_asig;

DELETE FROM calificaciones WHERE asignatura_id IS NULL;

ALTER TABLE calificaciones MODIFY COLUMN asignatura_id INT NOT NULL;
ALTER TABLE calificaciones DROP PRIMARY KEY, ADD PRIMARY KEY (usuario_id, asignatura_id);
ALTER TABLE calificaciones ADD CONSTRAINT fk_calif_asignatura FOREIGN KEY (asignatura_id) REFERENCES asignaturas(id) ON DELETE CASCADE;

-- Entregas
ALTER TABLE entregas ADD COLUMN asignatura_id INT NULL;

UPDATE entregas e
JOIN temp_user_asig t ON e.usuario_id = t.usuario_id
SET e.asignatura_id = t.min_asig;

DELETE FROM entregas WHERE asignatura_id IS NULL;

ALTER TABLE entregas MODIFY COLUMN asignatura_id INT NOT NULL;
ALTER TABLE entregas ADD CONSTRAINT fk_entrega_asignatura FOREIGN KEY (asignatura_id) REFERENCES asignaturas(id) ON DELETE CASCADE;

DROP TEMPORARY TABLE temp_user_asig;
