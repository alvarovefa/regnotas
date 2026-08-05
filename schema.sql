CREATE TABLE cursos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    nivel VARCHAR(50),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rut VARCHAR(20) UNIQUE NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    curso_id INT,
    rol ENUM('alumno', 'profesor') DEFAULT 'alumno',
    password_hash VARCHAR(255),
    token_activacion VARCHAR(255),
    token_expiracion DATETIME,
    estado ENUM('pendiente', 'activo') DEFAULT 'pendiente',
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE SET NULL
);

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
