# Optimizaciones Recomendadas para Consultas Supabase

## 📊 Índices Recomendados

Ejecutar estos SQL en Supabase SQL Editor para mejorar el rendimiento:

```sql
-- ============================================
-- ÍNDICES PARA MEJORAR RENDIMIENTO
-- ============================================

-- Índice para filtrar casos por empresa
CREATE INDEX IF NOT EXISTS idx_casos_empresa_id ON casos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_casos_status ON casos(status);
CREATE INDEX IF NOT EXISTS idx_casos_fecha ON casos(created_at DESC);

-- Índice para filtrar registros por empresa
CREATE INDEX IF NOT EXISTS idx_registros_empresa_id ON registros_trabajadores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_registros_fecha ON registros_trabajadores(fecha_registro DESC);
CREATE INDEX IF NOT EXISTS idx_registros_dni ON registros_trabajadores(dni_ce_pas);

-- Índice para filtrar exámenes por empresa
CREATE INDEX IF NOT EXISTS idx_examenes_empresa_id ON examenes_medicos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_examenes_fecha ON examenes_medicos(fecha_examen DESC);

-- Índice para user_empresas (ya debería existir, pero verificar)
CREATE INDEX IF NOT EXISTS idx_user_empresas_user_id ON user_empresas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_empresas_empresa_id ON user_empresas(empresa_id);

-- Índice compuesto para búsquedas comunes
CREATE INDEX IF NOT EXISTS idx_registros_empresa_fecha ON registros_trabajadores(empresa_id, fecha_registro DESC);
CREATE INDEX IF NOT EXISTS idx_casos_empresa_status ON casos(empresa_id, status);
```

## 🔍 Consultas Optimizadas

### 1. Consultas con Límites y Paginación

```typescript
// ❌ MAL: Carga todos los registros
const { data } = await supabase
  .from('registros_trabajadores')
  .select('*')
  .order('fecha_registro', { ascending: false });

// ✅ BIEN: Con límite y paginación
const PAGE_SIZE = 50;
const { data, error, count } = await supabase
  .from('registros_trabajadores')
  .select('*', { count: 'exact' })
  .eq('empresa_id', empresaActiva.id)
  .order('fecha_registro', { ascending: false })
  .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
```

### 2. Consultas Paralelas

```typescript
// ❌ MAL: Secuencial (lento)
const casosResult = await supabase.from('casos').select('*');
const trabajadoresResult = await supabase.from('registros_trabajadores').select('*');

// ✅ BIEN: Paralelo (rápido)
const [casosResult, trabajadoresResult] = await Promise.all([
  supabase.from('casos').select('*').eq('empresa_id', empresaActiva.id),
  supabase.from('registros_trabajadores').select('*').eq('empresa_id', empresaActiva.id)
]);
```

### 3. Seleccionar Solo Campos Necesarios

```typescript
// ❌ MAL: Selecciona todos los campos
const { data } = await supabase
  .from('registros_trabajadores')
  .select('*');

// ✅ BIEN: Solo campos necesarios
const { data } = await supabase
  .from('registros_trabajadores')
  .select('id, fecha_registro, apellidos_nombre, dni_ce_pas, empresa_id')
  .eq('empresa_id', empresaActiva.id);
```

## 📈 Estadísticas Optimizadas

```typescript
// Consulta optimizada para estadísticas
const getStats = async (empresaId: string) => {
  const [casosCount, trabajadoresCount, casosActivos] = await Promise.all([
    // Contar casos totales
    supabase
      .from('casos')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId),
    
    // Contar trabajadores
    supabase
      .from('registros_trabajadores')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId),
    
    // Contar casos activos
    supabase
      .from('casos')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
      .eq('status', 'ACTIVO')
  ]);

  return {
    casosTotal: casosCount.count || 0,
    trabajadores: trabajadoresCount.count || 0,
    casosActivos: casosActivos.count || 0
  };
};
```


