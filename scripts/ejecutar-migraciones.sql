-- ============================================
-- SCRIPT COMPLETO DE MIGRACIONES
-- SERVYSALUD360 - Multi-Tenancy
-- ============================================
-- 
-- INSTRUCCIONES:
-- 1. Copia TODO este contenido
-- 2. Pégalo en Supabase SQL Editor
-- 3. Ejecuta todo de una vez (o por secciones)
-- 
-- ============================================

-- ============================================
-- PASO 1: CREAR TABLAS DE EMPRESAS
-- ============================================

-- Tabla empresas
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

CREATE INDEX IF NOT EXISTS idx_empresas_nombre ON empresas(nombre);
CREATE INDEX IF NOT EXISTS idx_empresas_ruc ON empresas(ruc);
CREATE INDEX IF NOT EXISTS idx_empresas_activa ON empresas(activa);

-- Tabla user_empresas
CREATE TABLE IF NOT EXISTS user_empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_user_empresas_user_id ON user_empresas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_empresas_empresa_id ON user_empresas(empresa_id);

-- Función para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_empresas_updated_at ON empresas;
CREATE TRIGGER update_empresas_updated_at
  BEFORE UPDATE ON empresas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS básico para empresas
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_empresas ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Users can insert companies" ON empresas;
CREATE POLICY "Users can insert companies"
  ON empresas FOR INSERT
  WITH CHECK (true);

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

DROP POLICY IF EXISTS "Users can view their user_empresas" ON user_empresas;
CREATE POLICY "Users can view their user_empresas"
  ON user_empresas FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their user_empresas" ON user_empresas;
CREATE POLICY "Users can insert their user_empresas"
  ON user_empresas FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their user_empresas" ON user_empresas;
CREATE POLICY "Users can delete their user_empresas"
  ON user_empresas FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- PASO 2: AGREGAR empresa_id A TABLAS
-- ============================================

-- Agregar empresa_id a casos
ALTER TABLE casos 
ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_casos_empresa_id ON casos(empresa_id);

-- Agregar empresa_id a registros_trabajadores
ALTER TABLE registros_trabajadores 
ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_registros_trabajadores_empresa_id ON registros_trabajadores(empresa_id);

-- Agregar empresa_id a examenes_medicos (si existe)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'examenes_medicos') THEN
    ALTER TABLE examenes_medicos 
    ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_examenes_medicos_empresa_id ON examenes_medicos(empresa_id);
  END IF;
END $$;

-- ============================================
-- PASO 3: CONFIGURAR RLS PARA MULTI-TENANCY
-- ============================================

-- RLS para casos
ALTER TABLE casos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view cases from their companies" ON casos;
CREATE POLICY "Users can view cases from their companies"
  ON casos FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
    OR empresa_id IS NULL
  );

DROP POLICY IF EXISTS "Users can insert cases in their companies" ON casos;
CREATE POLICY "Users can insert cases in their companies"
  ON casos FOR INSERT
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
    OR empresa_id IS NULL
  );

DROP POLICY IF EXISTS "Users can update cases from their companies" ON casos;
CREATE POLICY "Users can update cases from their companies"
  ON casos FOR UPDATE
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete cases from their companies" ON casos;
CREATE POLICY "Users can delete cases from their companies"
  ON casos FOR DELETE
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- RLS para registros_trabajadores
ALTER TABLE registros_trabajadores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view workers from their companies" ON registros_trabajadores;
CREATE POLICY "Users can view workers from their companies"
  ON registros_trabajadores FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
    OR empresa_id IS NULL
  );

DROP POLICY IF EXISTS "Users can insert workers in their companies" ON registros_trabajadores;
CREATE POLICY "Users can insert workers in their companies"
  ON registros_trabajadores FOR INSERT
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
    OR empresa_id IS NULL
  );

DROP POLICY IF EXISTS "Users can update workers from their companies" ON registros_trabajadores;
CREATE POLICY "Users can update workers from their companies"
  ON registros_trabajadores FOR UPDATE
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete workers from their companies" ON registros_trabajadores;
CREATE POLICY "Users can delete workers from their companies"
  ON registros_trabajadores FOR DELETE
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- RLS para examenes_medicos (si existe)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'examenes_medicos') THEN
    ALTER TABLE examenes_medicos ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view exams from their companies" ON examenes_medicos;
    CREATE POLICY "Users can view exams from their companies"
      ON examenes_medicos FOR SELECT
      USING (
        empresa_id IN (
          SELECT empresa_id 
          FROM user_empresas 
          WHERE user_id = auth.uid()
        )
        OR empresa_id IS NULL
      );
    
    DROP POLICY IF EXISTS "Users can insert exams in their companies" ON examenes_medicos;
    CREATE POLICY "Users can insert exams in their companies"
      ON examenes_medicos FOR INSERT
      WITH CHECK (
        empresa_id IN (
          SELECT empresa_id 
          FROM user_empresas 
          WHERE user_id = auth.uid()
        )
        OR empresa_id IS NULL
      );
    
    DROP POLICY IF EXISTS "Users can update exams from their companies" ON examenes_medicos;
    CREATE POLICY "Users can update exams from their companies"
      ON examenes_medicos FOR UPDATE
      USING (
        empresa_id IN (
          SELECT empresa_id 
          FROM user_empresas 
          WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        empresa_id IN (
          SELECT empresa_id 
          FROM user_empresas 
          WHERE user_id = auth.uid()
        )
      );
    
    DROP POLICY IF EXISTS "Users can delete exams from their companies" ON examenes_medicos;
    CREATE POLICY "Users can delete exams from their companies"
      ON examenes_medicos FOR DELETE
      USING (
        empresa_id IN (
          SELECT empresa_id 
          FROM user_empresas 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================
-- FIN DE MIGRACIONES
-- ============================================
-- 
-- Verificación:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('empresas', 'user_empresas');
-- 
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'casos' AND column_name = 'empresa_id';
-- 
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'registros_trabajadores' AND column_name = 'empresa_id';

