-- Migración: Agregar campos adicionales a la tabla empresas
-- Campos: nombreComercial y actividadesEconomicas
-- Ejecutar en Supabase SQL Editor

-- ============================================
-- 1. AGREGAR COLUMNAS A LA TABLA EMPRESAS
-- ============================================

-- Agregar nombreComercial
ALTER TABLE empresas 
ADD COLUMN IF NOT EXISTS nombre_comercial TEXT;

-- Agregar actividadesEconomicas (texto largo para almacenar todas las actividades)
ALTER TABLE empresas 
ADD COLUMN IF NOT EXISTS actividades_economicas TEXT;

-- Comentarios
COMMENT ON COLUMN empresas.nombre_comercial IS 'Nombre comercial de la empresa (obtenido de SUNAT)';
COMMENT ON COLUMN empresas.actividades_economicas IS 'Actividades económicas de la empresa (Principal y Secundarias, obtenidas de SUNAT)';

-- ============================================
-- 2. ACTUALIZAR FUNCIÓN RPC crear_empresa_completa
-- ============================================

-- Primero eliminar la función existente si existe
DROP FUNCTION IF EXISTS crear_empresa_completa(UUID, TEXT, TEXT, TEXT, TEXT, TEXT);

-- Crear función actualizada con los nuevos parámetros
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
    p_nombre,
    p_ruc,
    p_direccion,
    p_email,
    p_telefono,
    p_nombre_comercial,
    p_actividades_economicas,
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


