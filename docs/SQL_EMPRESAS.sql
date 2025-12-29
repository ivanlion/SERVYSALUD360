-- Creación de tablas para sistema de empresas (Multi-tenancy)
-- Ejecutar en Supabase SQL Editor ANTES de las otras migraciones

-- ============================================
-- 1. TABLA EMPRESAS
-- ============================================

CREATE TABLE IF NOT EXISTS empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  ruc TEXT,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_empresas_nombre ON empresas(nombre);
CREATE INDEX IF NOT EXISTS idx_empresas_ruc ON empresas(ruc);
CREATE INDEX IF NOT EXISTS idx_empresas_activa ON empresas(activa);

-- Comentarios
COMMENT ON TABLE empresas IS 'Tabla de empresas para sistema multi-tenancy';
COMMENT ON COLUMN empresas.nombre IS 'Nombre de la empresa';
COMMENT ON COLUMN empresas.ruc IS 'RUC de la empresa';
COMMENT ON COLUMN empresas.activa IS 'Indica si la empresa está activa';

-- ============================================
-- 2. TABLA USER_EMPRESAS (Relación muchos a muchos)
-- ============================================

CREATE TABLE IF NOT EXISTS user_empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, empresa_id)
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_user_empresas_user_id ON user_empresas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_empresas_empresa_id ON user_empresas(empresa_id);

-- Comentarios
COMMENT ON TABLE user_empresas IS 'Relación muchos a muchos entre usuarios y empresas';
COMMENT ON COLUMN user_empresas.user_id IS 'ID del usuario (auth.users)';
COMMENT ON COLUMN user_empresas.empresa_id IS 'ID de la empresa';

-- ============================================
-- 3. FUNCIÓN PARA ACTUALIZAR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS update_empresas_updated_at ON empresas;
CREATE TRIGGER update_empresas_updated_at
  BEFORE UPDATE ON empresas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. POLÍTICAS RLS BÁSICAS (Se pueden mejorar después)
-- ============================================

-- Habilitar RLS
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_empresas ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver sus propias empresas
DROP POLICY IF EXISTS "Users can view their companies" ON empresas;
CREATE POLICY "Users can view their companies"
  ON empresas FOR SELECT
  USING (
    id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Política: Los usuarios pueden insertar empresas (se asociarán después)
DROP POLICY IF EXISTS "Users can insert companies" ON empresas;
CREATE POLICY "Users can insert companies"
  ON empresas FOR INSERT
  WITH CHECK (true); -- Permitir a todos crear empresas (se puede restringir después)

-- Política: Los usuarios pueden actualizar sus empresas
DROP POLICY IF EXISTS "Users can update their companies" ON empresas;
CREATE POLICY "Users can update their companies"
  ON empresas FOR UPDATE
  USING (
    id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Política: Los usuarios pueden ver sus relaciones user_empresas
DROP POLICY IF EXISTS "Users can view their user_empresas" ON user_empresas;
CREATE POLICY "Users can view their user_empresas"
  ON user_empresas FOR SELECT
  USING (user_id = auth.uid());

-- Política: Los usuarios pueden insertar sus propias relaciones
DROP POLICY IF EXISTS "Users can insert their user_empresas" ON user_empresas;
CREATE POLICY "Users can insert their user_empresas"
  ON user_empresas FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Política: Los usuarios pueden eliminar sus propias relaciones
DROP POLICY IF EXISTS "Users can delete their user_empresas" ON user_empresas;
CREATE POLICY "Users can delete their user_empresas"
  ON user_empresas FOR DELETE
  USING (user_id = auth.uid());
