-- Row Level Security (RLS) Policies para Multi-Tenancy
-- Ejecutar en Supabase SQL Editor después de agregar empresa_id

-- ============================================
-- 1. POLÍTICAS PARA CASOS
-- ============================================

-- Habilitar RLS si no está habilitado
ALTER TABLE casos ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver casos de sus empresas
DROP POLICY IF EXISTS "Users can view cases from their companies" ON casos;
CREATE POLICY "Users can view cases from their companies"
  ON casos FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
    OR empresa_id IS NULL -- Permitir casos sin empresa (legacy)
  );

-- Política: Los usuarios solo pueden insertar casos en sus empresas
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

-- Política: Los usuarios solo pueden actualizar casos de sus empresas
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

-- Política: Los usuarios solo pueden eliminar casos de sus empresas
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

-- ============================================
-- 2. POLÍTICAS PARA REGISTROS_TRABAJADORES
-- ============================================

-- Habilitar RLS si no está habilitado
ALTER TABLE registros_trabajadores ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver trabajadores de sus empresas
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

-- Política: Los usuarios solo pueden insertar trabajadores en sus empresas
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

-- Política: Los usuarios solo pueden actualizar trabajadores de sus empresas
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

-- Política: Los usuarios solo pueden eliminar trabajadores de sus empresas
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

-- ============================================
-- 3. POLÍTICAS PARA EXAMENES_MEDICOS
-- ============================================

-- Solo si la tabla existe
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'examenes_medicos') THEN
    -- Habilitar RLS
    ALTER TABLE examenes_medicos ENABLE ROW LEVEL SECURITY;
    
    -- Política: Los usuarios solo pueden ver exámenes de sus empresas
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
    
    -- Política: Los usuarios solo pueden insertar exámenes en sus empresas
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
    
    -- Política: Los usuarios solo pueden actualizar exámenes de sus empresas
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
    
    -- Política: Los usuarios solo pueden eliminar exámenes de sus empresas
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

