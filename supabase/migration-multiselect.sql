-- =============================================
-- MIGRACIÓN: Soporte para respuestas múltiples
-- =============================================
-- 
-- Este script NO es necesario si estás creando la base de datos desde cero.
-- Solo úsalo si ya tienes una base de datos creada y quieres añadir soporte
-- para respuestas múltiples.
--
-- NOTA: La estructura de datos NO cambia (sigue siendo TEXT), pero ahora
-- soporta valores separados por comas como "A,B,D"
-- 
-- No hay cambios en el schema necesarios, solo actualiza tus datos si lo necesitas.
-- =============================================

-- Si tienes preguntas antiguas que quieres migrar a formato nuevo,
-- no necesitas hacer nada. El código maneja ambos formatos:
-- - Respuesta única: "B"
-- - Respuestas múltiples: "B,D"

-- Solo asegúrate de que las nuevas preguntas importadas usen el formato correcto.
