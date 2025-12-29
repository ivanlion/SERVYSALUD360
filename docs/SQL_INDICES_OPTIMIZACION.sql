-- ============================================
-- ÍNDICES PARA MEJORAR RENDIMIENTO
-- SERVYSALUD360 - Optimización de Consultas
-- ============================================
-- 
-- Este script crea índices para mejorar el rendimiento de las consultas
-- más frecuentes en la aplicación.
--
-- IMPORTANTE: Ejecutar este script en Supabase SQL Editor
-- NOTA: Solo crea índices en tablas que existen
-- ============================================

-- Índice para filtrar casos por empresa (multi-tenancy)
CREATE INDEX IF NOT EXISTS idx_casos_empresa_id ON casos(empresa_id);

-- Índice para filtrar casos por estado
CREATE INDEX IF NOT EXISTS idx_casos_status ON casos(status);

-- Índice para ordenar casos por fecha de creación
CREATE INDEX IF NOT EXISTS idx_casos_fecha ON casos(created_at DESC);

-- Índice compuesto para consultas comunes de casos (empresa + estado)
CREATE INDEX IF NOT EXISTS idx_casos_empresa_status ON casos(empresa_id, status);

-- Índice para filtrar registros de trabajadores por empresa (multi-tenancy)
CREATE INDEX IF NOT EXISTS idx_registros_empresa_id ON registros_trabajadores(empresa_id);

-- Índice para ordenar registros por fecha de registro (usado frecuentemente)
CREATE INDEX IF NOT EXISTS idx_registros_fecha ON registros_trabajadores(fecha_registro DESC);

-- Índice para búsquedas por DNI
CREATE INDEX IF NOT EXISTS idx_registros_dni ON registros_trabajadores(dni_ce_pas);

-- Índice compuesto para consultas comunes de registros (empresa + fecha)
CREATE INDEX IF NOT EXISTS idx_registros_empresa_fecha ON registros_trabajadores(empresa_id, fecha_registro DESC);

-- Índice para filtrar exámenes médicos por empresa (multi-tenancy)
-- NOTA: Solo se crea si la tabla existe
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'examenes_medicos') THEN
        CREATE INDEX IF NOT EXISTS idx_examenes_empresa_id ON examenes_medicos(empresa_id);
        CREATE INDEX IF NOT EXISTS idx_examenes_fecha ON examenes_medicos(fecha_examen DESC);
    END IF;
END $$;

-- Índice para user_empresas - relación usuario-empresa (multi-tenancy)
CREATE INDEX IF NOT EXISTS idx_user_empresas_user_id ON user_empresas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_empresas_empresa_id ON user_empresas(empresa_id);

-- Índice compuesto para consultas de user_empresas
CREATE INDEX IF NOT EXISTS idx_user_empresas_user_empresa ON user_empresas(user_id, empresa_id);

-- Índice para empresas - ordenar por nombre (usado frecuentemente)
CREATE INDEX IF NOT EXISTS idx_empresas_nombre ON empresas(nombre);

-- ============================================
-- VERIFICACIÓN DE ÍNDICES CREADOS
-- ============================================
-- Ejecutar esta consulta para verificar que los índices se crearon correctamente:
-- (Esta consulta solo lista índices de tablas que existen)
--
-- SELECT 
--   tablename, 
--   indexname, 
--   indexdef 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
--   AND tablename IN (
--     SELECT table_name 
--     FROM information_schema.tables 
--     WHERE table_schema = 'public' 
--       AND table_name IN ('casos', 'registros_trabajadores', 'empresas', 'examenes_medicos', 'user_empresas')
--   )
-- ORDER BY tablename, indexname;
-- ============================================
