CREATE TABLE cursos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    nivel VARCHAR(50),
    profesor_jefe_id INT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rut VARCHAR(20) UNIQUE NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    curso_id INT,
    rol ENUM('alumno', 'profesor', 'directivo', 'administrador') DEFAULT 'alumno',
    password_hash VARCHAR(255),
    token_activacion VARCHAR(255),
    token_expiracion DATETIME,
    estado ENUM('pendiente', 'activo') DEFAULT 'pendiente',
    foto_perfil VARCHAR(500) NULL,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE SET NULL
);

ALTER TABLE cursos ADD CONSTRAINT fk_curso_profesor_jefe FOREIGN KEY (profesor_jefe_id) REFERENCES usuarios(id) ON DELETE SET NULL;

CREATE INDEX idx_rut ON usuarios(rut);
CREATE INDEX idx_email ON usuarios(email);

CREATE TABLE entregas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nombre_original VARCHAR(255) NOT NULL,
    nombre_almacenado VARCHAR(255) NOT NULL,
    ruta_archivo VARCHAR(500) NOT NULL,
    tamano_bytes BIGINT NOT NULL,
    extension VARCHAR(10) NOT NULL,
    tipo_entrega ENUM('tarea', 'evaluacion') NOT NULL DEFAULT 'tarea',
    fecha_hora_subida TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX idx_usuario_id ON entregas(usuario_id);

CREATE TABLE calificaciones (
    usuario_id INT PRIMARY KEY,
    s1_n1 DECIMAL(3,1),
    s1_n2 DECIMAL(3,1),
    s1_n3 DECIMAL(3,1),
    s1_n4 DECIMAL(3,1),
    s1_n5 DECIMAL(3,1),
    s1_n6 DECIMAL(3,1),
    s2_n1 DECIMAL(3,1),
    s2_n2 DECIMAL(3,1),
    s2_n3 DECIMAL(3,1),
    s2_n4 DECIMAL(3,1),
    s2_n5 DECIMAL(3,1),
    s2_n6 DECIMAL(3,1),
    nota_recuperativa DECIMAL(3,1),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE asignaturas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    color VARCHAR(20) DEFAULT '#6366f1',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE curso_asignaturas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    curso_id INT NOT NULL,
    asignatura_id INT NOT NULL,
    profesor_id INT NOT NULL,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    FOREIGN KEY (asignatura_id) REFERENCES asignaturas(id) ON DELETE CASCADE,
    FOREIGN KEY (profesor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE KEY uq_curso_asignatura_profesor (curso_id, asignatura_id, profesor_id)
);

CREATE TABLE horarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    curso_id INT NOT NULL,
    asignatura_id INT NOT NULL,
    profesor_id INT NOT NULL,
    dia_semana ENUM('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes') NOT NULL,
    bloque_hora VARCHAR(50) NOT NULL,
    sala VARCHAR(50) DEFAULT 'Sala de Clases',
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    FOREIGN KEY (asignatura_id) REFERENCES asignaturas(id) ON DELETE CASCADE,
    FOREIGN KEY (profesor_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE asistencia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    curso_id INT NOT NULL,
    asignatura_id INT NULL,
    fecha DATE NOT NULL,
    estado ENUM('presente', 'ausente', 'atrasado') DEFAULT 'presente',
    hora_llegada VARCHAR(10) NULL,
    tiene_pase BOOLEAN DEFAULT FALSE,
    observacion VARCHAR(255),
    registrado_por INT NOT NULL,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    FOREIGN KEY (registrado_por) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE KEY uq_alumno_curso_fecha (usuario_id, curso_id, fecha)
);

CREATE TABLE pases_atraso (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asistencia_id INT NOT NULL,
    usuario_id INT NOT NULL,
    emisor_id INT NOT NULL,
    motivo VARCHAR(255) DEFAULT 'Ingreso con pase de atraso',
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asistencia_id) REFERENCES asistencia(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (emisor_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE grupos_trabajo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    curso_id INT NOT NULL,
    creado_por INT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE grupo_integrantes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grupo_id INT NOT NULL,
    usuario_id INT NOT NULL,
    fecha_union TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grupo_id) REFERENCES grupos_trabajo(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE KEY uq_grupo_usuario (grupo_id, usuario_id)
);

ALTER TABLE entregas ADD COLUMN grupo_id INT NULL;
ALTER TABLE entregas ADD CONSTRAINT fk_entregas_grupo FOREIGN KEY (grupo_id) REFERENCES grupos_trabajo(id) ON DELETE SET NULL;


CREATE TABLE IF NOT EXISTS recursos_compartidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profesor_id INT NOT NULL,
    curso_id INT NULL,
    asignatura_id INT NOT NULL,
    alumno_id INT NULL,
    nombre_original VARCHAR(255) NOT NULL,
    nombre_almacenado VARCHAR(255) NOT NULL,
    ruta_archivo VARCHAR(500) NOT NULL,
    tamano_bytes BIGINT NOT NULL,
    extension VARCHAR(10) NOT NULL,
    fecha_hora_subida TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (profesor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    FOREIGN KEY (asignatura_id) REFERENCES asignaturas(id) ON DELETE CASCADE,
    FOREIGN KEY (alumno_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
  