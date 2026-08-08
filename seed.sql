SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Cursos de prueba
INSERT INTO cursos (id, nombre, nivel) VALUES
(1, '1° Medio A', 'Enseñanza Media'),
(2, '2° Medio B', 'Enseñanza Media'),
(3, 'Taller de Programación', 'Optativo')
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), nivel=VALUES(nivel);

-- Usuarios de prueba (Contraseña para todos: 123456)
-- Hash de 123456: $2b$10$tdnLMfYx28M1vYbL6TpubuAi2lucFpfDkNL6QwH5zufKfkYVPxXRG
INSERT INTO usuarios (id, rut, nombre_completo, email, curso_id, rol, password_hash, estado) VALUES
(1, '11111111-1', 'Roberto Gómez (Profesor)', 'profesor@compulab.cl', NULL, 'profesor', '$2b$10$tdnLMfYx28M1vYbL6TpubuAi2lucFpfDkNL6QwH5zufKfkYVPxXRG', 'activo'),
(2, '22222222-2', 'Juan Pérez Soto', 'juan.perez@estudiante.cl', 1, 'alumno', '$2b$10$tdnLMfYx28M1vYbL6TpubuAi2lucFpfDkNL6QwH5zufKfkYVPxXRG', 'activo'),
(3, '33333333-3', 'María González López', 'maria.gonzalez@estudiante.cl', 1, 'alumno', '$2b$10$tdnLMfYx28M1vYbL6TpubuAi2lucFpfDkNL6QwH5zufKfkYVPxXRG', 'activo'),
(4, '44444444-4', 'Carlos Silva Rojas', 'carlos.silva@estudiante.cl', 2, 'alumno', '$2b$10$tdnLMfYx28M1vYbL6TpubuAi2lucFpfDkNL6QwH5zufKfkYVPxXRG', 'activo'),
(5, '99999999-9', 'Álvaro Vergara', 'alvaro.vergara@compulab.cl', NULL, 'administrador', '$2b$10$UVXcNkgxWfHH/h.uHOoR2uZIk24cthC4PCdn6ZxN/rHkPW7EP9MKa', 'activo')
ON DUPLICATE KEY UPDATE nombre_completo=VALUES(nombre_completo), password_hash=VALUES(password_hash), rol=VALUES(rol);

-- Calificaciones de ejemplo
INSERT INTO calificaciones (usuario_id, s1_n1, s1_n2, s1_n3, s1_n4, s2_n1, s2_n2) VALUES
(2, 6.5, 7.0, 5.8, 6.2, 6.0, 6.8),
(3, 7.0, 6.8, 6.5, 7.0, 6.9, 7.0),
(4, 5.5, 6.0, 6.2, 5.9, 5.8, 6.1)
ON DUPLICATE KEY UPDATE s1_n1=VALUES(s1_n1);

-- Entregas de ejemplo
INSERT INTO entregas (id, usuario_id, nombre_original, nombre_almacenado, ruta_archivo, tamano_bytes, extension, tipo_entrega) VALUES
(1, 2, 'Tarea1_Algoritmos_JuanPerez.pdf', 'sample_tarea1.pdf', 'storage/uploads/sample_tarea1.pdf', 102400, 'pdf', 'tarea'),
(2, 3, 'Evaluacion_Computacion_MariaGonzalez.docx', 'sample_eval1.docx', 'storage/uploads/sample_eval1.docx', 204800, 'docx', 'evaluacion')
ON DUPLICATE KEY UPDATE nombre_original=VALUES(nombre_original);
