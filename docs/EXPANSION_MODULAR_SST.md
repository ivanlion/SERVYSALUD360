# 📋 EXPANSIÓN MODULAR SST - SERVYSALUD360

## 🎯 Objetivo

Este script SQL expande la base de datos de SERVYSALUD360 con módulos completos de **Seguridad y Salud en el Trabajo (SST)** según la normativa peruana (Ley 29783 y su reglamento), **sin modificar las tablas existentes**.

## ✅ Características Principales

- ✅ **NO modifica tablas existentes** - Solo agrega columnas nuevas si no existen
- ✅ **Compatible con estructura actual** - Mantiene compatibilidad con `registros_trabajadores`
- ✅ **Multi-tenancy** - Todas las tablas respetan el sistema de empresas
- ✅ **RLS configurado** - Row Level Security en todas las nuevas tablas
- ✅ **Índices optimizados** - Para mejor rendimiento
- ✅ **Triggers automáticos** - Para `updated_at`

## 📊 Nuevas Tablas Creadas

### 1. **sedes_empresa**
Sedes o centros de trabajo de las empresas.

**Campos principales:**
- `nombre_sede`, `tipo_sede`, `codigo_sede`
- `direccion`, `distrito`, `provincia`, `departamento`, `ubigeo`
- `responsable_sede`, `telefono`, `email`
- `numero_trabajadores`

### 2. **trabajadores**
Tabla extendida de trabajadores con datos completos.

**Características:**
- ✅ Compatible con `registros_trabajadores` (campos de migración)
- ✅ Datos personales completos
- ✅ Datos laborales (contrato, jornada, remuneración)
- ✅ Supervisión jerárquica
- ✅ SCTR
- ✅ Estado laboral

**Campos principales:**
- Datos personales: `tipo_documento`, `numero_documento`, `apellidos`, `nombres`, `fecha_nacimiento`, `sexo`
- Contacto: `telefono_personal`, `telefono_emergencia`, `email`
- Laborales: `puesto_trabajo`, `area_trabajo`, `tipo_contrato`, `fecha_ingreso`
- Jornada: `jornada_laboral`, `turno_trabajo`, `horas_diarias`
- **Compatibilidad:** `registro_trabajo_modificado_id`, `migrado_desde_registro`

### 3. **catalogo_peligros**
Catálogo de peligros según normativa.

**Tipos de peligros:**
- Físico, Químico, Biológico, Ergonómico
- Psicosocial, Mecánico, Eléctrico, Locativo

**Incluye:** 20+ peligros comunes pre-cargados

### 4. **catalogo_riesgos**
Catálogo de riesgos asociados a peligros.

### 5. **matriz_iper**
Matriz de Identificación de Peligros y Evaluación de Riesgos.

**Características:**
- Evaluación de riesgo inicial (probabilidad × severidad)
- Clasificación automática: Trivial, Tolerable, Moderado, Importante, Intolerable
- Riesgo residual (con controles)
- Medidas de control (jerarquía de controles)
- EPP requerido

**Campos principales:**
- `proceso`, `actividad`, `tarea`, `puesto_trabajo`
- `peligro_id`, `riesgo_id`
- `probabilidad`, `severidad`, `nivel_riesgo` (calculado)
- `probabilidad_residual`, `severidad_residual`, `nivel_riesgo_residual`
- `medidas_eliminacion`, `medidas_sustitucion`, `medidas_ingenieria`, `medidas_administrativas`
- `epp_requerido` (array)

### 6. **inspecciones_seguridad**
Registro de inspecciones de seguridad.

**Tipos:** Programada, No Programada, Especial, Inicial, Periódica

**Campos principales:**
- `tipo_inspeccion`, `area_inspeccionada`, `responsable_inspeccion`
- `fecha_inspeccion`, `hora_inicio`, `hora_fin`
- `hallazgos` (JSONB) - Array de hallazgos con severidad
- `acciones_correctivas` (JSONB)
- `estado`: Pendiente, En Proceso, Completada, Cerrada

### 7. **incidentes_accidentes**
Registro de incidentes y accidentes de trabajo.

**Tipos de eventos:**
- Accidente de Trabajo, Accidente de Trayecto
- Enfermedad Ocupacional, Incidente, Cuasi Accidente
- Accidente Fatal, Accidente Grave, Accidente Leve

**Campos principales:**
- `tipo_evento`, `fecha_evento`, `hora_evento`
- `trabajador_principal_id`, `trabajadores_afectados` (JSONB)
- `descripcion_hechos`, `causas_inmediatas`, `causas_basicas`
- `severidad`, `dias_perdidos`, `dias_cargados`
- `investigado`, `fecha_investigacion`, `conclusiones`
- `medidas_correctivas` (JSONB)
- `reportado_autoridad`, `numero_reporte_autoridad`

### 8. **capacitaciones**
Registro de capacitaciones en SST.

**Tipos:** Inducción, Capacitación Inicial, Periódica, Específica, Reforzamiento, Actualización

**Campos principales:**
- `nombre_capacitacion`, `tipo_capacitacion`, `tema`
- `fecha_inicio`, `fecha_fin`, `duracion_horas`
- `instructor`, `instructor_externo`
- `trabajadores_participantes` (JSONB)
- `tiene_evaluacion`, `calificacion_minima`
- `resultados` (JSONB) - Calificaciones por trabajador
- `emite_certificado`, `certificados_emitidos`

### 9. **trabajadores_capacitaciones**
Relación trabajadores-capacitaciones con resultados.

**Campos principales:**
- `asistio`, `horas_asistidas`
- `calificacion`, `aprobado`
- `certificado_emitido`, `fecha_emision_certificado`, `url_certificado`
- `fecha_vencimiento_certificado`

### 10. **catalogo_epp**
Catálogo de Equipos de Protección Personal.

**Categorías:**
- Protección Cabeza, Ojos, Auditiva, Respiratoria
- Protección Manos, Pies, Corporal, Altura

**Incluye:** 8+ EPP comunes pre-cargados

### 11. **epp_asignados**
EPP asignados a trabajadores.

**Campos principales:**
- `fecha_asignacion`, `fecha_vencimiento`
- `cantidad`, `estado` (Activo, Vencido, Dañado, Perdido, Reemplazado)
- `entregado_por`, `recibido_por`
- `fecha_devolucion`, `motivo_devolucion`

### 12. **planes_emergencia**
Planes de emergencia y evacuación.

**Tipos:** Incendio, Sismo, Inundación, Derrame Químico, Fuga de Gas, Evacuación, Primeros Auxilios, General

**Campos principales:**
- `nombre_plan`, `tipo_emergencia`, `version`
- `objetivo`, `alcance`, `procedimientos`
- `brigadas` (JSONB)
- `equipos_emergencia`, `rutas_evacuacion`, `puntos_reunion`
- `contactos_emergencia` (JSONB)
- `fecha_elaboracion`, `fecha_aprobacion`, `fecha_revision`
- `archivo_plan`, `anexos`

### 13. **simulacros**
Registro de simulacros de emergencia.

**Tipos:** Evacuación, Incendio, Sismo, Derrame, General

**Campos principales:**
- `tipo_simulacro`, `fecha_simulacro`, `hora_inicio`, `hora_fin`
- `total_participantes`, `trabajadores_participantes` (JSONB)
- `tiempo_evacuacion_minutos`
- `cumplio_objetivos`, `tiempo_objetivo_minutos`
- `hallazgos` (JSONB), `mejoras_sugeridas`
- `reporte_simulacro`, `evidencias`

### 14. **comite_sst**
Comités de Seguridad y Salud en el Trabajo.

**Tipos:** Comité de SST, Comité Paritario, Supervisor de SST

**Campos principales:**
- `nombre_comite`, `tipo_comite`
- `periodo_inicio`, `periodo_fin`, `activo`
- `miembros` (JSONB) - Array con cargo y tipo (empleador/trabajador)
- `presidente_id`, `secretario_id`
- `frecuencia_reuniones`, `proxima_reunion`

### 15. **actas_comite_sst**
Actas de reunión del Comité de SST.

**Campos principales:**
- `numero_acta`, `fecha_reunion`, `hora_inicio`, `hora_fin`
- `miembros_presentes` (JSONB), `miembros_ausentes` (JSONB)
- `quorum`
- `puntos_agenda` (JSONB)
- `acuerdos` (JSONB) - Con responsables y fechas límite
- `temas_tratados`, `observaciones_reunion`
- `archivo_acta`, `anexos`

## 🔄 Tablas Actualizadas (Solo Columnas Nuevas)

### **empresas**
Columnas agregadas (solo si no existen):
- `ciiu` - Código CIIU
- `sector_economico` - Sector económico
- `actividad_economica` - Actividad económica
- `nivel_riesgo` - Nivel de riesgo (Bajo, Medio, Alto, Muy Alto)
- `numero_trabajadores` - Número de trabajadores
- `tiene_sctr` - Tiene SCTR
- `aseguradora_sctr` - Aseguradora SCTR
- `tiene_sgsst` - Tiene Sistema de Gestión SST
- `fecha_implementacion_sgsst` - Fecha de implementación

### **registros_trabajadores**
Columnas de compatibilidad:
- `migrado_a_trabajadores` - Flag de migración
- `trabajador_nuevo_id` - ID en nueva tabla trabajadores

## 🔒 Seguridad (RLS)

Todas las nuevas tablas tienen **Row Level Security (RLS)** habilitado con políticas que:
- ✅ Usuarios solo ven datos de sus empresas (multi-tenancy)
- ✅ Usuarios pueden gestionar datos de sus empresas
- ✅ Catálogos (peligros, riesgos, EPP) son de lectura pública
- ✅ Relaciones respetan el mismo patrón

## 📈 Índices Optimizados

Cada tabla tiene índices estratégicos para:
- Búsquedas por empresa
- Búsquedas por fecha (orden descendente)
- Búsquedas por estado
- Búsquedas por trabajador
- Búsquedas por tipo/clasificación

## ⚙️ Triggers Automáticos

Todas las tablas tienen triggers para actualizar `updated_at` automáticamente.

## 📝 Cómo Ejecutar

### 1. **Backup de Base de Datos**
```sql
-- Hacer backup antes de ejecutar
```

### 2. **Ejecutar en Supabase SQL Editor**
1. Abre Supabase Dashboard
2. Ve a **SQL Editor**
3. Copia y pega el contenido de `SQL_EXPANSION_MODULAR_SST.sql`
4. Ejecuta el script

### 3. **Verificar Creación**
```sql
-- Verificar que las tablas se crearon
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'sedes_empresa',
    'trabajadores',
    'catalogo_peligros',
    'matriz_iper',
    'inspecciones_seguridad',
    'incidentes_accidentes',
    'capacitaciones',
    'epp_asignados',
    'planes_emergencia',
    'simulacros',
    'comite_sst',
    'actas_comite_sst'
  )
ORDER BY table_name;
```

## 🔗 Relaciones entre Tablas

```
empresas
  ├── sedes_empresa (1:N)
  │     └── trabajadores (1:N)
  │           ├── trabajadores_capacitaciones (1:N)
  │           └── epp_asignados (1:N)
  ├── matriz_iper (1:N)
  ├── inspecciones_seguridad (1:N)
  ├── incidentes_accidentes (1:N)
  ├── capacitaciones (1:N)
  ├── planes_emergencia (1:N)
  ├── simulacros (1:N)
  └── comite_sst (1:N)
        └── actas_comite_sst (1:N)

catalogo_peligros
  └── catalogo_riesgos (1:N)
        └── matriz_iper (N:1)

catalogo_epp
  └── epp_asignados (1:N)
```

## 📋 Normativa Peruana Cubierta

Este script implementa los requisitos de:

- ✅ **Ley 29783** - Ley de Seguridad y Salud en el Trabajo
- ✅ **DS 005-2012-TR** - Reglamento de la Ley 29783
- ✅ **Matriz IPER** - Identificación de Peligros y Evaluación de Riesgos
- ✅ **Inspecciones de Seguridad** - Inspecciones programadas y no programadas
- ✅ **Registro de Incidentes y Accidentes** - Según formato oficial
- ✅ **Capacitaciones** - Registro y certificación
- ✅ **EPP** - Equipos de Protección Personal
- ✅ **Plan de Emergencia** - Planes y simulacros
- ✅ **Comité de SST** - Comités y actas de reunión

## ⚠️ Importante

1. **NO modifica tablas existentes** - Solo agrega columnas si no existen
2. **Compatible con estructura actual** - No rompe funcionalidad existente
3. **Multi-tenancy** - Todas las tablas respetan el sistema de empresas
4. **RLS configurado** - Seguridad desde el inicio
5. **Backup recomendado** - Hacer backup antes de ejecutar

## 🚀 Próximos Pasos

Después de ejecutar el script:

1. **Verificar tablas creadas** - Usar script de verificación
2. **Migrar datos** (opcional) - Migrar de `registros_trabajadores` a `trabajadores`
3. **Crear componentes React** - Para gestionar las nuevas funcionalidades
4. **Agregar herramientas MCP** - Para acceder a datos SST desde MCP
5. **Documentar APIs** - Documentar endpoints para nuevas tablas

## 📊 Estadísticas

- **Tablas nuevas:** 15
- **Tablas actualizadas:** 2 (solo columnas nuevas)
- **Catálogos pre-cargados:** 3 (peligros, riesgos, EPP)
- **Total de registros iniciales:** 30+ (peligros y EPP comunes)
- **Líneas de SQL:** ~1,300

---

**Fecha de creación:** 30 de Enero 2025  
**Versión:** 1.0  
**Compatibilidad:** SERVYSALUD360 v0.1.0+

