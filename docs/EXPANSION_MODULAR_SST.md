# 📋 EXPANSIÓN MODULAR SST - SERVYSALUD360

## 🎯 Objetivo

Este conjunto de scripts SQL expande la base de datos de SERVYSALUD360 con módulos completos de **Seguridad y Salud en el Trabajo (SST)** según la normativa peruana (Ley 29783 y su reglamento), **sin modificar las tablas existentes**.

## 📦 Archivos del Proyecto

- **`SQL_EXPANSION_MODULAR_SST.sql`** (PARTE 1) - Módulos base SST
- **`SQL_EXPANSION_MODULAR_SST_PARTE2.sql`** (PARTE 2) - Módulos normativos avanzados

## ⚠️ Orden de Ejecución

**IMPORTANTE:** Ejecutar primero la PARTE 1, luego la PARTE 2.

1. Ejecutar `SQL_EXPANSION_MODULAR_SST.sql` (PARTE 1)
2. Ejecutar `SQL_EXPANSION_MODULAR_SST_PARTE2.sql` (PARTE 2)

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

---

## 📦 PARTE 2 - MÓDULOS NORMATIVOS AVANZADOS

### 16. **planes_anuales_sst**
Plan Anual de Seguridad y Salud en el Trabajo (PASST) - Art. 33 DS 005-2012-TR.

**Características:**
- Un plan por año por empresa (constraint UNIQUE)
- Objetivos generales y específicos
- Metas SST con valores objetivos
- Presupuesto detallado por categoría
- Cronograma de actividades
- Seguimiento de cumplimiento

**Campos principales:**
- `anio`, `codigo_plan`, `version`
- `objetivo_general`, `objetivos_especificos` (array)
- `metas_sst` (JSONB) - Metas con responsables
- `presupuesto_total`, `presupuesto_detalle` (JSONB)
- `cronograma_actividades` (JSONB)
- `porcentaje_cumplimiento`
- `estado`: En elaboración, Aprobado, En ejecución, Cerrado

### 17. **actividades_plan_sst**
Actividades específicas del Plan Anual de SST.

**Características:**
- Categorización por líneas base del SGSST
- Programación mensual/trimestral
- Seguimiento de avance y ejecución
- Presupuesto por actividad

**Campos principales:**
- `plan_id`, `codigo_actividad`, `nombre_actividad`
- `linea_base` - Líneas base del SGSST
- `mes_programado`, `trimestre`, `frecuencia`
- `fecha_inicio_programada`, `fecha_fin_programada`
- `fecha_inicio_real`, `fecha_fin_real`
- `porcentaje_avance`
- `presupuesto`, `presupuesto_ejecutado`
- `evidencias_url`, `fotos_url`

### 18. **ausentismo_laboral**
Sistema de registro de ausentismo laboral - RM 050-2013-TR.

**Tipos de ausentismo:**
- Descanso médico, Licencias, Permisos, Vacaciones
- Accidente de trabajo, Enfermedad ocupacional
- Maternidad, Paternidad, Lactancia materna
- Subsidio por enfermedad, Inasistencia injustificada

**Campos principales:**
- `tipo_ausentismo`, `subtipo`
- `fecha_inicio`, `fecha_fin`, `fecha_retorno_real`
- `dias_ausencia`, `dias_habiles_ausencia`
- `diagnostico_cie10`, `diagnostico_descripcion`
- `tiene_certificado_medico`, `certificado_medico_url`
- `relacionado_con_trabajo`, `es_accidente_trabajo`, `es_enfermedad_ocupacional`
- `cubierto_por_sctr`, `genera_subsidio`
- `costo_directo`, `costo_indirecto`, `costo_total` (calculado)

### 19. **programa_capacitacion_sst**
Programa Anual de Capacitación en SST - Art. 27 Ley 29783.

**Campos principales:**
- `anio`, `codigo_programa`, `version`
- `objetivo_general`, `alcance`
- `poblacion_objetivo` - Número de trabajadores
- `presupuesto_total`, `presupuesto_ejecutado`
- `documento_programa_url`, `documento_aprobacion_url`
- `estado`: Borrador, Vigente, Cerrado, Cancelado

### 20. **capacitaciones_sst**
Capacitaciones programadas y ejecutadas (versión refinada).

**Tipos:** Inducción general, Inducción específica del puesto, Capacitación especializada, Simulacro, Entrenamiento práctico, Charla de 5 minutos, Sensibilización

**Campos principales:**
- `programa_id`, `codigo_curso`, `nombre_curso`
- `tipo_capacitacion`, `categoria`
- `temas` (array), `duracion_horas`
- `modalidad`: Presencial, Virtual, Semipresencial, E-learning
- `fecha_ejecucion`, `lugar`, `plataforma_virtual`
- `expositor`, `institucion_expositor`
- `tiene_evaluacion`, `nota_minima_aprobacion`
- `numero_asistentes_real`, `numero_aprobados`, `porcentaje_aprobacion`
- `lista_asistencia_url`, `certificados_generados_url`
- `nivel_satisfaccion` (escala 1-5)

### 21. **asistencia_capacitaciones**
Asistencia detallada de trabajadores a capacitaciones.

**Campos principales:**
- `asistio`, `hora_ingreso`, `hora_salida`, `minutos_asistencia`
- `fue_evaluado`, `nota_obtenida`, `aprobo`
- `certificado_emitido`, `numero_certificado`, `certificado_url`
- `completo_encuesta`, `calificacion_capacitacion`, `calificacion_expositor`

### 22. **miembros_comite_sst**
Miembros del Comité de SST con sus cargos y representación.

**Campos principales:**
- `comite_id`, `trabajador_id`
- `representacion`: Empleador, Trabajadores
- `cargo_comite`: Presidente, Secretario, Miembro titular, Miembro suplente
- `fecha_inicio`, `fecha_fin`
- `horas_capacitacion_sst`, `capacitacion_especializada`
- `certificados_capacitacion` (array)

### 23. **reuniones_comite_sst**
Reuniones del Comité de SST con seguimiento de acuerdos.

**Tipos:** Ordinaria, Extraordinaria

**Campos principales:**
- `comite_id`, `numero_reunion`, `tipo_reunion`
- `fecha_realizacion`, `hora_inicio`, `hora_fin`, `lugar`
- `agenda` (array), `temas_tratados`
- `acuerdos` (array), `tareas_asignadas` (JSONB)
- `asistentes` (array), `quorum_alcanzado`
- `acta_reunion_url`, `evidencias_url`
- `porcentaje_cumplimiento_acuerdos`

### 24. **accidentes_incidentes**
Registro de accidentes e incidentes de trabajo (versión refinada) - DS 005-2012-TR.

**Tipos:** Accidente de trabajo, Accidente leve, Accidente incapacitante, Accidente mortal, Incidente peligroso, Incidente

**Campos principales:**
- `tipo_evento`, `subtipo`
- `fecha_ocurrencia`, `hora_ocurrencia`, `lugar_ocurrencia`
- `descripcion_evento`, `descripcion_lesion`
- `parte_cuerpo_afectada`, `naturaleza_lesion`
- `dias_descanso_medico`, `es_incapacitante`, `tipo_incapacidad`
- `agente_causante`, `condicion_insegura`, `acto_inseguro`
- `testigos` (array)
- `recibio_atencion_medica`, `diagnostico_inicial`, `codigo_cie10`
- `investigacion_realizada`, `causas_inmediatas`, `causas_basicas`, `causa_raiz`
- `medidas_correctivas_inmediatas`, `medidas_correctivas_planificadas` (JSONB)
- `requiere_notificacion_mintra`, `notificado_mintra`, `codigo_notificacion_mintra`
- `informe_investigacion_url`, `fotos_url`, `videos_url`

### 25. **inspecciones_sst**
Inspecciones de seguridad y salud en el trabajo (versión refinada).

**Tipos:** Planeada, No planeada, Rutina, Especializada, Pre-uso, Gubernamental

**Campos principales:**
- `codigo_inspeccion`, `tipo_inspeccion`
- `area_inspeccionada`, `equipos_inspeccionados` (array)
- `fecha_programada`, `fecha_realizacion`
- `inspector_principal`, `inspectores` (array)
- `hallazgos` (JSONB) - Con criticidad
- `total_hallazgos`, `criticos`, `mayores`, `menores`
- `acciones_correctivas` (JSONB)
- `check_list_url`, `fotos_url`, `informe_inspeccion_url`

### 26. **indicadores_sst**
Indicadores de Seguridad y Salud en el Trabajo por periodo.

**Características:**
- Indicadores mensuales y anuales
- Cálculo automático de índices (IF, IG, IA)
- Seguimiento de cumplimiento PASST

**Campos principales:**
- `anio`, `mes`, `periodo` (YYYY-MM)
- `total_trabajadores`, `horas_hombre_trabajadas`
- `numero_accidentes_trabajo`, `numero_accidentes_incapacitantes`, `numero_accidentes_mortales`
- `dias_perdidos_total`, `dias_perdidos_accidentes`
- `indice_frecuencia`, `indice_gravedad`, `indice_accidentabilidad`
- `casos_enfermedad_ocupacional`
- `total_ausencias`, `tasa_ausentismo`
- `trabajadores_capacitados`, `horas_capacitacion_total`
- `examenes_programados`, `examenes_realizados`, `cobertura_examenes`
- `inspecciones_programadas`, `inspecciones_realizadas`
- `actividades_passt_programadas`, `actividades_passt_ejecutadas`, `cumplimiento_passt`

---

## 🔧 Vistas y Funciones (PARTE 2)

### Vistas

1. **vista_trabajadores_unificada**
   - Unifica datos de `registros_trabajadores` y `trabajadores`
   - Prioriza datos de tabla nueva
   - Indica origen de datos

2. **vista_indicadores_consolidados**
   - Consolidación de indicadores SST
   - Cálculos automáticos de IF e IG
   - Incluye datos de empresa

### Funciones Auxiliares

1. **calcular_edad(fecha_nac DATE)**
   - Calcula edad a partir de fecha de nacimiento

2. **trabajadores_examenes_vencidos(empresa_uuid UUID)**
   - Retorna trabajadores con exámenes vencidos o sin exámenes

3. **calcular_indice_frecuencia(num_accidentes, horas_hombre)**
   - Calcula Índice de Frecuencia (IF)

4. **calcular_indice_gravedad(dias_perdidos, horas_hombre)**
   - Calcula Índice de Gravedad (IG)

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

### 2. **Ejecutar PARTE 1 en Supabase SQL Editor**
1. Abre Supabase Dashboard
2. Ve a **SQL Editor**
3. Copia y pega el contenido de `SQL_EXPANSION_MODULAR_SST.sql`
4. Ejecuta el script
5. Verifica que no haya errores

### 3. **Ejecutar PARTE 2 en Supabase SQL Editor**
1. En el mismo **SQL Editor**
2. Copia y pega el contenido de `SQL_EXPANSION_MODULAR_SST_PARTE2.sql`
3. Ejecuta el script
4. Verifica que no haya errores

### 4. **Verificar Creación**
```sql
-- Verificar que las tablas se crearon (PARTE 1)
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

-- Verificar que las tablas se crearon (PARTE 2)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'planes_anuales_sst',
    'actividades_plan_sst',
    'ausentismo_laboral',
    'programa_capacitacion_sst',
    'capacitaciones_sst',
    'asistencia_capacitaciones',
    'miembros_comite_sst',
    'reuniones_comite_sst',
    'accidentes_incidentes',
    'inspecciones_sst',
    'indicadores_sst'
  )
ORDER BY table_name;

-- Verificar vistas
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name IN (
    'vista_trabajadores_unificada',
    'vista_indicadores_consolidados'
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

### PARTE 1
- **Tablas nuevas:** 15
- **Tablas actualizadas:** 2 (solo columnas nuevas)
- **Catálogos pre-cargados:** 3 (peligros, riesgos, EPP)
- **Total de registros iniciales:** 30+ (peligros y EPP comunes)
- **Líneas de SQL:** ~1,304

### PARTE 2
- **Tablas nuevas:** 11
- **Vistas creadas:** 2
- **Funciones auxiliares:** 4
- **Líneas de SQL:** ~1,332

### TOTAL
- **Tablas nuevas:** 26
- **Vistas:** 2
- **Funciones:** 4
- **Total líneas SQL:** ~2,636

---

**Fecha de creación:** 30 de Enero 2025  
**Versión:** 1.0  
**Compatibilidad:** SERVYSALUD360 v0.1.0+

