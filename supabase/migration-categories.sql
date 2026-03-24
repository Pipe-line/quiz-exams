-- =============================================
-- MIGRACIÓN: Añadir categorías a exam_blocks
-- =============================================
-- 
-- Ejecuta este script SOLO si ya tienes la base de datos creada.
-- Si estás creando desde cero, usa schema.sql directamente.
-- =============================================

-- Añadir columna category
ALTER TABLE exam_blocks ADD COLUMN IF NOT EXISTS category TEXT;

-- Crear índice para mejorar el rendimiento de filtros
CREATE INDEX IF NOT EXISTS idx_exam_blocks_category ON exam_blocks(category);

-- (Opcional) Asignar categoría por defecto a bloques existentes
-- UPDATE exam_blocks SET category = 'Sin categoría' WHERE category IS NULL;
