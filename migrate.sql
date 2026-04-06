-- ============================================================
-- MIGRACIÓN: tabla `usuarios` para la Academia
-- Ejecutar una sola vez en la base de datos de Railway.
-- Compatible con la base que usa la landing PHP.
-- ============================================================

CREATE TABLE IF NOT EXISTS `usuarios` (
  `id`             BIGINT        NOT NULL,
  `email`          VARCHAR(255)  NOT NULL,
  `password`       VARCHAR(255)  NOT NULL DEFAULT '',
  `nombre`         VARCHAR(255)  NOT NULL DEFAULT '',
  `apellido`       VARCHAR(255)  NOT NULL DEFAULT '',
  -- Slugs de cursos separados por "|"
  -- Ej: "excel|excel_intermedio|excel_avanzado"
  `cursos`         TEXT          NOT NULL DEFAULT '',
  `activo`         TINYINT(1)   NOT NULL DEFAULT 1,
  `vencimiento`    DATE              NULL DEFAULT NULL,
  -- Progreso por curso: JSON { "12286845": ["videoId1", "videoId2"], ... }
  `progreso`       JSON              NULL,
  `fecha_creacion` DATE          NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Índice de búsqueda por email (mejora el login)
-- ============================================================
CREATE INDEX IF NOT EXISTS `idx_usuarios_email`
  ON `usuarios` (`email`);

-- ============================================================
-- VALORES DE REFERENCIA: slugs de cursos válidos
-- ============================================================
-- excel            → Vimeo folder 12286845  (Excel Nivel Inicial)
-- excel_intermedio → Vimeo folder 12286854  (Excel Nivel Intermedio)
-- excel_avanzado   → Vimeo folder 12052707  (Excel Nivel Avanzado)
-- excel_promo      → Vimeo folder 12305404  (Pack Excel Completo)
