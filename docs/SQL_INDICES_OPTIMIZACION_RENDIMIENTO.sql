/**
 * Índices de Optimización para Rendimiento
 * 
 * Este script crea índices en las tablas de Supabase para mejorar
 * el rendimiento de las consultas más frecuentes identificadas en la auditoría.
 * 
 * IMPORTANTE: Ejecutar estos índices en el SQL Editor de Supabase
 * 
 * @module docs/SQL_INDICES_OPTIMIZACION_RENDIMIENTO
 */

-- ============================================
-- ÍNDICES PARA registros_trabajadores
-- ============================================

-- Índice compuesto para consultas filtradas por empresa y fecha (más común)
CREATE INDEX IF NOT EXISTS idx_registros_empresa_fecha 
  ON registros_trabajadores(empresa_id, fecha_registro DESC);

-- Índice para búsquedas por DNI (usado en trabajadores_obtener)
CREATE INDEX IF NOT EXISTS idx_registros_dni 
  ON registros_trabajadores(dni_ce_pas);

-- Índice para búsquedas por nombre (usado en búsquedas)
-- NOTA: El índice GIN requiere la extensión pg_trgm o usar btree para búsquedas simples
-- Si la extensión no está disponible, usar btree en su lugar
CREATE INDEX IF NOT EXISTS idx_registros_nombre 
  ON registros_trabajadores USING gin(to_tsvector('spanish', apellidos_nombre));

-- Alternativa si GIN no está disponible (descomentar si hay error):
-- CREATE INDEX IF NOT EXISTS idx_registros_nombre_btree 
--   ON registros_trabajadores(apellidos_nombre);

-- ============================================
-- ÍNDICES PARA casos
-- ============================================
-- NOTA: Muchos de estos índices ya existen. El IF NOT EXISTS evitará errores.
-- La tabla 'casos' usa 'trabajador_nombre' (no 'trabajador_id').

-- Índice compuesto para consultas filtradas por empresa y status
-- (Ya existe: idx_casos_empresa_status)
CREATE INDEX IF NOT EXISTS idx_casos_empresa_status 
  ON casos(empresa_id, status);

-- Índice para consultas ordenadas por fecha
-- (Ya existe: idx_casos_fecha)
CREATE INDEX IF NOT EXISTS idx_casos_fecha 
  ON casos(fecha DESC);

-- Índice compuesto para empresa y fecha (más común)
-- (Crear si no existe, útil para consultas combinadas)
CREATE INDEX IF NOT EXISTS idx_casos_empresa_fecha 
  ON casos(empresa_id, fecha DESC);

-- Índice para búsquedas por trabajador (usando trabajador_nombre, no trabajador_id)
-- (Ya existe: idx_casos_trabajador en trabajador_nombre)
-- No crear índice en trabajador_id porque esa columna no existe

-- ============================================
-- ÍNDICES PARA examenes_medicos
-- ============================================
-- NOTA: La tabla 'examenes_medicos' NO EXISTE en esta base de datos.
-- Estos índices están comentados porque la tabla no existe.
-- Si se crea la tabla en el futuro, descomentar estos índices.

-- Verificar si la tabla existe:
-- SELECT EXISTS (
--   SELECT FROM information_schema.tables 
--   WHERE table_schema = 'public' 
--   AND table_name = 'examenes_medicos'
-- );

-- Índice compuesto para consultas filtradas por trabajador y fecha
-- (COMENTADO: tabla no existe)
-- CREATE INDEX IF NOT EXISTS idx_examenes_trabajador_fecha 
--   ON examenes_medicos(trabajador_id, fecha_examen DESC);

-- Índice para consultas filtradas por empresa
-- (COMENTADO: tabla no existe)
-- CREATE INDEX IF NOT EXISTS idx_examenes_empresa 
--   ON examenes_medicos(empresa_id);

-- Índice para consultas ordenadas por fecha
-- (COMENTADO: tabla no existe)
-- CREATE INDEX IF NOT EXISTS idx_examenes_fecha 
--   ON examenes_medicos(fecha_examen DESC);

-- ============================================
-- ÍNDICES PARA empresas
-- ============================================

-- Índice para búsquedas por RUC (usado frecuentemente)
CREATE INDEX IF NOT EXISTS idx_empresas_ruc 
  ON empresas(ruc);

-- Índice para búsquedas por nombre (usado en búsquedas)
-- NOTA: El índice GIN requiere la extensión pg_trgm
-- (Ya existe: idx_empresas_nombre como btree)
CREATE INDEX IF NOT EXISTS idx_empresas_nombre 
  ON empresas USING gin(to_tsvector('spanish', nombre));

-- Si GIN no está disponible, el índice btree existente es suficiente para búsquedas básicas

-- Índice para empresas activas
CREATE INDEX IF NOT EXISTS idx_empresas_activa 
  ON empresas(activa) WHERE activa = true;

-- ============================================
-- ÍNDICES PARA profiles (usuarios)
-- ============================================

-- Índice para búsquedas por email
CREATE INDEX IF NOT EXISTS idx_profiles_email 
  ON profiles(email);

-- Índice para consultas filtradas por rol
CREATE INDEX IF NOT EXISTS idx_profiles_rol 
  ON profiles(role);

-- ============================================
-- ÍNDICES PARA user_empresas (relación usuario-empresa)
-- ============================================

-- Índice compuesto para consultas filtradas por usuario (más común)
CREATE INDEX IF NOT EXISTS idx_user_empresas_user_id 
  ON user_empresas(user_id);

-- Índice compuesto para consultas filtradas por empresa
CREATE INDEX IF NOT EXISTS idx_user_empresas_empresa_id 
  ON user_empresas(empresa_id);

-- Índice compuesto para consultas que filtran por ambos (útil para validaciones)
CREATE INDEX IF NOT EXISTS idx_user_empresas_user_empresa 
  ON user_empresas(user_id, empresa_id);

-- ============================================
-- ÍNDICES PARA analisis_emo_historial
-- ============================================

-- Índice compuesto para consultas filtradas por empresa y fecha (más común)
CREATE INDEX IF NOT EXISTS idx_analisis_empresa_fecha 
  ON analisis_emo_historial(empresa_id, fecha_analisis DESC);

-- Índice para búsquedas por DNI (usado frecuentemente)
CREATE INDEX IF NOT EXISTS idx_analisis_dni 
  ON analisis_emo_historial(trabajador_dni);

-- Índice para consultas ordenadas por fecha
CREATE INDEX IF NOT EXISTS idx_analisis_fecha 
  ON analisis_emo_historial(fecha_analisis DESC);

-- ============================================
-- VERIFICACIÓN DE ÍNDICES
-- ============================================

-- Consulta para verificar que los índices se crearon correctamente
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename IN ('registros_trabajadores', 'casos', 'empresas', 'profiles')
--   -- NOTA: 'examenes_medicos' no existe en esta base de datos
-- ORDER BY tablename, indexname;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================

-- 1. Los índices mejoran el rendimiento de SELECT pero pueden ralentizar INSERT/UPDATE
-- 2. Monitorear el uso de espacio en disco después de crear los índices
-- 3. Los índices GIN (para búsquedas de texto) requieren más espacio pero son muy rápidos
-- 4. Revisar periódicamente con EXPLAIN ANALYZE para verificar que se usan los índices
-- 5. Considerar eliminar índices no utilizados después de un período de monitoreo

-- ============================================
-- CONSULTAS DE ANÁLISIS
-- ============================================

-- Ver tamaño de índices
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY pg_relation_size(indexrelid) DESC;

-- Ver índices no utilizados (requiere pg_stat_statements)
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan as index_scans
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
--   AND idx_scan = 0
-- ORDER BY pg_relation_size(indexrelid) DESC;

