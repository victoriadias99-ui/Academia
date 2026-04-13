-- ============================================================
-- MIGRACION: tabla academia_usuarios para la Academia
-- Ejecutar UNA SOLA VEZ en la base de datos de Railway.
-- ============================================================

-- Tabla para almacenar precios y datos extra de cursos (por encima de Vimeo)
CREATE TABLE IF NOT EXISTS `academia_cursos` (
  `id`              BIGINT        NOT NULL COMMENT 'Vimeo folder ID',
  `stripe_price_id` VARCHAR(255)  NOT NULL DEFAULT '',
  `precio_ars`      DECIMAL(12,2) NOT NULL DEFAULT 0,
  `precio_usd`      DECIMAL(10,2) NOT NULL DEFAULT 0,
  `precios_paises`  JSON              NULL COMMENT 'JSON: { "AR": { "precio": 14000, "stripe_price_id": "price_xxx" }, ... }',
  `activo`          TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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