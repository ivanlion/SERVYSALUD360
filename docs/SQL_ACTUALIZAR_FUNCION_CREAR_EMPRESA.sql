-- Actualizar función crear_empresa_completa para incluir los nuevos campos
-- Ejecutar en Supabase SQL Editor

-- ============================================
-- 1. AGREGAR COLUMNAS SI NO EXISTEN
-- ============================================

-- Agregar nombre_comercial si no existe
ALTER TABLE empresas 
ADD COLUMN IF NOT EXISTS nombre_comercial TEXT;

-- Agregar actividades_economicas si no existe
ALTER TABLE empresas 
ADD COLUMN IF NOT EXISTS actividades_economicas TEXT;

-- ============================================
-- 2. ELIMINAR TODAS LAS VERSIONES DE LA FUNCIÓN SI EXISTEN
-- ============================================

-- Eliminar todas las funciones con el nombre crear_empresa_completa
-- PostgreSQL permite múltiples funciones con el mismo nombre pero diferentes parámetros
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT 
            p.proname AS function_name,
            pg_get_function_identity_arguments(p.oid) AS arguments,
            p.oid
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
          AND p.proname = 'crear_empresa_completa'
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s)', 'public', r.function_name, r.arguments);
        RAISE NOTICE 'Eliminada función: %(%)', r.function_name, r.arguments;
    END LOOP;
END $$;

-- ============================================
-- 3. CREAR/ACTUALIZAR FUNCIÓN CON TODOS LOS PARÁMETROS
-- ============================================

CREATE OR REPLACE FUNCTION crear_empresa_completa(
  p_nombre TEXT,
  p_ruc TEXT DEFAULT NULL,
  p_direccion TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_telefono TEXT DEFAULT NULL,
  p_nombre_comercial TEXT DEFAULT NULL,
  p_actividades_economicas TEXT DEFAULT NULL
)
RETURNS empresas AS $$
DECLARE
  v_empresa_id UUID;
  v_user_id UUID;
  v_empresa empresas;
BEGIN
  -- Obtener el ID del usuario autenticado
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Validar que el nombre sea requerido
  IF p_nombre IS NULL OR TRIM(p_nombre) = '' THEN
    RAISE EXCEPTION 'El nombre de la empresa es requerido';
  END IF;

  -- Insertar la empresa
  INSERT INTO empresas (
    nombre,
    ruc,
    direccion,
    email,
    telefono,
    nombre_comercial,
    actividades_economicas,
    activa
  ) VALUES (
    TRIM(p_nombre),
    NULLIF(TRIM(p_ruc), ''),
    NULLIF(TRIM(p_direccion), ''),
    NULLIF(TRIM(p_email), ''),
    NULLIF(TRIM(p_telefono), ''),
    NULLIF(TRIM(p_nombre_comercial), ''),
    NULLIF(TRIM(p_actividades_economicas), ''),
    true
  )
  RETURNING id INTO v_empresa_id;

  -- Asociar la empresa al usuario
  INSERT INTO user_empresas (user_id, empresa_id)
  VALUES (v_user_id, v_empresa_id)
  ON CONFLICT (user_id, empresa_id) DO NOTHING;

  -- Retornar la empresa creada
  SELECT * INTO v_empresa FROM empresas WHERE id = v_empresa_id;
  RETURN v_empresa;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario de la función
COMMENT ON FUNCTION crear_empresa_completa IS 'Crea una empresa y la asocia al usuario autenticado. Incluye nombre_comercial y actividades_economicas.';

-- ============================================
-- 4. VERIFICACIÓN
-- ============================================

-- Verificar que la función existe (con argumentos específicos)
SELECT 
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'crear_empresa_completa'
  AND pg_get_function_identity_arguments(p.oid) = 'p_nombre text, p_ruc text, p_direccion text, p_email text, p_telefono text, p_nombre_comercial text, p_actividades_economicas text';

