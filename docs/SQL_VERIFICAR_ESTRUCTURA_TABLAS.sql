/**
 * Script para verificar la estructura de las tablas antes de crear índices
 * 
 * Ejecutar este script primero para ver qué columnas existen realmente
 * en cada tabla antes de ejecutar SQL_INDICES_OPTIMIZACION_RENDIMIENTO.sql
 * 
 * @module docs/SQL_VERIFICAR_ESTRUCTURA_TABLAS
 */

-- ============================================
-- VERIFICAR ESTRUCTURA DE TABLAS
-- ============================================

-- Ver columnas de registros_trabajadores
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'registros_trabajadores'
ORDER BY ordinal_position;

-- Ver columnas de casos (si existe)
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'casos'
ORDER BY ordinal_position;

-- Ver columnas de examenes_medicos (si existe)
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'examenes_medicos'
ORDER BY ordinal_position;

-- Ver columnas de empresas
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'empresas'
ORDER BY ordinal_position;

-- Ver columnas de profiles
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- ============================================
-- VERIFICAR SI LAS TABLAS EXISTEN
-- ============================================

SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'registros_trabajadores',
    'casos',
    'examenes_medicos',
    'empresas',
    'profiles'
  )
ORDER BY table_name;

-- ============================================
-- VER ÍNDICES EXISTENTES
-- ============================================

SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'registros_trabajadores',
    'casos',
    'examenes_medicos',
    'empresas',
    'profiles'
  )
ORDER BY tablename, indexname;



