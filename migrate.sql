-- ============================================================
-- MIGRACION: tabla academia_usuarios para la Academia
-- Ejecutar UNA SOLA VEZ en la base de datos de Railway.
-- ============================================================

CREATE TABLE IF NOT EXISTS `academia_usuarios` (
  `id`             BIGINT        NOT NULL,
  `email`          VARCHAR(255)  NOT NULL,
  `password`       VARCHAR(255)  NOT NULL DEFAULT '',
  `nombre`         VARCHAR(255)  NOT NULL DEFAULT '',
  `apellido`       VARCHAR(255)  NOT NULL DEFAULT '',
  `cursos`         TEXT          NOT NULL DEFAULT '',
  `activo`         TINYINT(1)   NOT NULL DEFAULT 1,
  `vencimiento`    DATE              NULL DEFAULT NULL,
  `progreso`       JSON              NULL,
  `fecha_creacion` DATE          NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;