-- ============================================
-- SERVYSALUD360 - PARTE 2
-- MÓDULOS NORMATIVOS SEGÚN LEY 29783
-- ============================================

-- IMPORTANTE: Ejecutar PARTE 1 primero (SQL_EXPANSION_MODULAR_SST.sql)
-- Este script agrega módulos adicionales y refina algunos de la PARTE 1

-- Habilitar extensiones (si no están)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- MÓDULO: PLAN ANUAL DE SST (PASST)
-- Según DS 005-2012-TR, Art. 33
-- ============================================

CREATE TABLE IF NOT EXISTS planes_anuales_sst (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  
  -- Identificación
  anio INTEGER NOT NULL,
  codigo_plan VARCHAR(50),
  version VARCHAR(20) DEFAULT '1.0',
  
  -- Elaboración y aprobación
  fecha_elaboracion DATE,
  fecha_aprobacion DATE,
  aprobado_por VARCHAR(255),
  cargo_aprobador VARCHAR(100),
  
  -- Objetivos
  objetivo_general TEXT,
  objetivos_especificos TEXT[],
  
  -- Metas SST
  metas_sst JSONB DEFAULT '[]'::jsonb,
  -- Ejemplo: [{"meta": "Reducir índice de accidentabilidad", "valor_objetivo": "< 5", "responsable": "Jefe SST"}]
  
  -- Presupuesto
  presupuesto_total DECIMAL(12,2),
  presupuesto_detalle JSONB DEFAULT '{}'::jsonb,
  -- Ejemplo: {"capacitacion": 5000, "epp": 10000, "examenes": 15000}
  
  -- Cronograma general (JSONB para flexibilidad)
  cronograma_actividades JSONB DEFAULT '[]'::jsonb,
  
  -- Responsables
  responsable_elaboracion VARCHAR(255),
  responsable_sst VARCHAR(255),
  cmp_responsable_sst VARCHAR(20), -- Si es médico ocupacional
  
  -- Recursos
  recursos_humanos TEXT,
  recursos_materiales TEXT,
  recursos_tecnicos TEXT,
  
  -- Documentos
  documento_plan_url TEXT,
  documento_aprobacion_url TEXT,
  acta_aprobacion_url TEXT,
  
  -- Seguimiento
  estado VARCHAR(20) DEFAULT 'En elaboración' CHECK (estado IN (
    'En elaboración', 'Aprobado', 'En ejecución', 'Cerrado'
  )),
  porcentaje_cumplimiento DECIMAL(5,2) DEFAULT 0,
  
  -- Fechas de seguimiento
  fecha_inicio_ejecucion DATE,
  fecha_cierre DATE,
  
  observaciones TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint: Un plan por año por empresa
  UNIQUE(empresa_id, anio)
);

CREATE INDEX IF NOT EXISTS idx_planes_empresa ON planes_anuales_sst(empresa_id);
CREATE INDEX IF NOT EXISTS idx_planes_anio ON planes_anuales_sst(anio);
CREATE INDEX IF NOT EXISTS idx_planes_estado ON planes_anuales_sst(estado);

COMMENT ON TABLE planes_anuales_sst IS 'Plan Anual de Seguridad y Salud en el Trabajo - Art. 33 DS 005-2012-TR';

-- Líneas de acción del PASST (Actividades específicas)
CREATE TABLE IF NOT EXISTS actividades_plan_sst (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID REFERENCES planes_anuales_sst(id) ON DELETE CASCADE,
  
  -- Identificación
  codigo_actividad VARCHAR(20),
  nombre_actividad VARCHAR(255) NOT NULL,
  descripcion TEXT,
  objetivo TEXT,
  
  -- Categorización según líneas base del SGSST
  linea_base VARCHAR(100) CHECK (linea_base IN (
    'Compromiso e involucramiento',
    'Política de SST',
    'Planeamiento y aplicación',
    'Implementación y operación',
    'Evaluación normativa',
    'Verificación',
    'Control de información y documentos',
    'Revisión por la dirección'
  )),
  tipo_actividad VARCHAR(100),
  
  -- Programación
  mes_programado INTEGER CHECK (mes_programado BETWEEN 1 AND 12),
  trimestre INTEGER CHECK (trimestre BETWEEN 1 AND 4),
  fecha_inicio_programada DATE,
  fecha_fin_programada DATE,
  frecuencia VARCHAR(50), -- Única, Mensual, Trimestral, etc.
  
  -- Ejecución
  fecha_inicio_real DATE,
  fecha_fin_real DATE,
  estado VARCHAR(20) DEFAULT 'Pendiente' CHECK (estado IN (
    'Pendiente', 'En proceso', 'Completada', 'Cancelada', 'Reprogramada'
  )),
  
  -- Responsables
  responsable VARCHAR(255) NOT NULL,
  area_responsable VARCHAR(100),
  participantes TEXT[],
  
  -- Recursos
  presupuesto DECIMAL(10,2),
  presupuesto_ejecutado DECIMAL(10,2),
  recursos_necesarios TEXT,
  
  -- Seguimiento
  porcentaje_avance DECIMAL(5,2) DEFAULT 0,
  dificultades_encontradas TEXT,
  acciones_correctivas TEXT,
  
  -- Evidencias
  evidencias_url TEXT[],
  fotos_url TEXT[],
  
  observaciones TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_actividades_plan ON actividades_plan_sst(plan_id);
CREATE INDEX IF NOT EXISTS idx_actividades_mes ON actividades_plan_sst(mes_programado);
CREATE INDEX IF NOT EXISTS idx_actividades_estado ON actividades_plan_sst(estado);
CREATE INDEX IF NOT EXISTS idx_actividades_linea ON actividades_plan_sst(linea_base);

COMMENT ON TABLE actividades_plan_sst IS 'Actividades específicas del Plan Anual de SST';

-- ============================================
-- MÓDULO: SISTEMA DE AUSENTISMO LABORAL
-- Registro obligatorio según RM 050-2013-TR
-- ============================================

CREATE TABLE IF NOT EXISTS ausentismo_laboral (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trabajador_id UUID REFERENCES trabajadores(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id),
  
  -- Tipo de ausentismo (según normativa)
  tipo_ausentismo VARCHAR(50) NOT NULL CHECK (tipo_ausentismo IN (
    'Descanso médico',
    'Licencia con goce de haber',
    'Licencia sin goce de haber',
    'Permiso',
    'Suspensión perfecta',
    'Vacaciones',
    'Accidente de trabajo',
    'Enfermedad ocupacional',
    'Maternidad',
    'Paternidad',
    'Lactancia materna',
    'Fallecimiento familiar',
    'Subsidio por enfermedad',
    'Inasistencia injustificada',
    'Otros'
  )),
  
  subtipo VARCHAR(100),
  
  -- Periodo de ausentismo
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  fecha_retorno_programada DATE,
  fecha_retorno_real DATE,
  dias_ausencia INTEGER,
  dias_habiles_ausencia INTEGER,
  
  -- Detalle y motivo
  motivo TEXT,
  diagnostico_cie10 VARCHAR(10),
  diagnostico_descripcion TEXT,
  
  -- Documentación
  tiene_certificado_medico BOOLEAN DEFAULT FALSE,
  numero_certificado VARCHAR(50),
  establecimiento_salud VARCHAR(255),
  medico_tratante VARCHAR(255),
  cmp_medico VARCHAR(20),
  
  documento_sustento_url TEXT,
  certificado_medico_url TEXT,
  
  -- Clasificación laboral
  relacionado_con_trabajo BOOLEAN DEFAULT FALSE,
  es_accidente_trabajo BOOLEAN DEFAULT FALSE,
  es_enfermedad_ocupacional BOOLEAN DEFAULT FALSE,
  
  -- SCTR y seguros
  cubierto_por_sctr BOOLEAN DEFAULT FALSE,
  aseguradora VARCHAR(255),
  numero_siniestro VARCHAR(50),
  monto_cobertura DECIMAL(10,2),
  
  -- Subsidio
  genera_subsidio BOOLEAN DEFAULT FALSE,
  dias_subsidio INTEGER,
  monto_subsidio DECIMAL(10,2),
  entidad_paga_subsidio VARCHAR(100), -- ESSALUD, EPS, etc.
  
  -- Seguimiento
  requiere_seguimiento BOOLEAN DEFAULT FALSE,
  seguimiento_realizado BOOLEAN DEFAULT FALSE,
  fecha_seguimiento DATE,
  observaciones_seguimiento TEXT,
  
  estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN (
    'Activo', 'Finalizado', 'Extendido', 'Cancelado'
  )),
  
  -- Impacto económico
  costo_directo DECIMAL(10,2), -- Costo de reemplazo
  costo_indirecto DECIMAL(10,2), -- Pérdida de productividad
  costo_total DECIMAL(10,2) GENERATED ALWAYS AS (
    COALESCE(costo_directo, 0) + COALESCE(costo_indirecto, 0)
  ) STORED,
  
  impacto_productividad TEXT,
  
  observaciones TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ausentismo_trabajador ON ausentismo_laboral(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_ausentismo_empresa ON ausentismo_laboral(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ausentismo_tipo ON ausentismo_laboral(tipo_ausentismo);
CREATE INDEX IF NOT EXISTS idx_ausentismo_fecha_inicio ON ausentismo_laboral(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_ausentismo_estado ON ausentismo_laboral(estado);
CREATE INDEX IF NOT EXISTS idx_ausentismo_relacionado_trabajo ON ausentismo_laboral(relacionado_con_trabajo);

COMMENT ON TABLE ausentismo_laboral IS 'Registro de ausentismo laboral - Obligatorio según RM 050-2013-TR';

-- ============================================
-- MÓDULO: CAPACITACIONES EN SST (REFINADO)
-- Según Ley 29783, Art. 27-35
-- ============================================

CREATE TABLE IF NOT EXISTS programa_capacitacion_sst (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  
  -- Identificación
  anio INTEGER NOT NULL,
  codigo_programa VARCHAR(50),
  version VARCHAR(20) DEFAULT '1.0',
  
  -- Elaboración
  fecha_elaboracion DATE,
  fecha_aprobacion DATE,
  aprobado_por VARCHAR(255),
  
  -- Alcance
  objetivo_general TEXT,
  alcance TEXT,
  poblacion_objetivo INTEGER, -- Número de trabajadores
  
  -- Presupuesto
  presupuesto_total DECIMAL(10,2),
  presupuesto_ejecutado DECIMAL(10,2),
  
  -- Responsables
  responsable_programa VARCHAR(255),
  area_responsable VARCHAR(100),
  
  -- Documentos
  documento_programa_url TEXT,
  documento_aprobacion_url TEXT,
  
  -- Estado
  estado VARCHAR(20) DEFAULT 'Vigente' CHECK (estado IN (
    'Borrador', 'Vigente', 'Cerrado', 'Cancelado'
  )),
  
  observaciones TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(empresa_id, anio)
);

CREATE INDEX IF NOT EXISTS idx_programa_cap_empresa ON programa_capacitacion_sst(empresa_id);
CREATE INDEX IF NOT EXISTS idx_programa_cap_anio ON programa_capacitacion_sst(anio);

COMMENT ON TABLE programa_capacitacion_sst IS 'Programa Anual de Capacitación en SST - Art. 27 Ley 29783';

-- Capacitaciones programadas y ejecutadas (refinado)
CREATE TABLE IF NOT EXISTS capacitaciones_sst (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  programa_id UUID REFERENCES programa_capacitacion_sst(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id),
  
  -- Identificación
  codigo_curso VARCHAR(20),
  nombre_curso VARCHAR(255) NOT NULL,
  
  -- Tipo de capacitación
  tipo_capacitacion VARCHAR(100) CHECK (tipo_capacitacion IN (
    'Inducción general',
    'Inducción específica del puesto',
    'Capacitación especializada',
    'Simulacro de emergencia',
    'Entrenamiento práctico',
    'Charla de 5 minutos',
    'Sensibilización',
    'Otros'
  )),
  
  categoria VARCHAR(100), -- SST, Primeros Auxilios, Ergonomía, etc.
  
  -- Contenido
  temas TEXT[],
  objetivo TEXT,
  contenido_detallado TEXT,
  duracion_horas DECIMAL(5,2),
  
  -- Modalidad
  modalidad VARCHAR(50) CHECK (modalidad IN (
    'Presencial', 'Virtual', 'Semipresencial', 'E-learning'
  )),
  
  -- Dirigido a
  dirigido_a TEXT[], -- Puestos, áreas
  publico_objetivo TEXT,
  numero_participantes_programado INTEGER,
  
  -- Programación
  mes_programado INTEGER CHECK (mes_programado BETWEEN 1 AND 12),
  fecha_programada DATE,
  
  -- Ejecución
  fecha_ejecucion DATE,
  hora_inicio TIME,
  hora_fin TIME,
  lugar VARCHAR(255),
  plataforma_virtual VARCHAR(100), -- Si es virtual
  
  -- Instructor/Expositor
  expositor VARCHAR(255),
  institucion_expositor VARCHAR(255),
  calificacion_expositor TEXT,
  
  -- Evaluación
  tiene_evaluacion BOOLEAN DEFAULT FALSE,
  tipo_evaluacion VARCHAR(50), -- Escrita, Práctica, Oral
  nota_minima_aprobacion DECIMAL(4,2) DEFAULT 14.00,
  
  -- Recursos
  costo_total DECIMAL(10,2),
  costo_por_participante DECIMAL(10,2),
  material_entregado TEXT[],
  material_entregado_url TEXT[],
  
  -- Resultados
  estado VARCHAR(20) DEFAULT 'Programada' CHECK (estado IN (
    'Programada', 'Ejecutada', 'Cancelada', 'Reprogramada'
  )),
  numero_asistentes_real INTEGER,
  numero_aprobados INTEGER,
  numero_desaprobados INTEGER,
  porcentaje_asistencia DECIMAL(5,2),
  porcentaje_aprobacion DECIMAL(5,2),
  
  -- Evidencias
  lista_asistencia_url TEXT,
  fotos_url TEXT[],
  videos_url TEXT[],
  certificados_generados_url TEXT,
  evaluaciones_url TEXT,
  informe_capacitacion_url TEXT,
  
  -- Satisfacción
  encuesta_satisfaccion_url TEXT,
  nivel_satisfaccion DECIMAL(3,2), -- Escala 1-5
  
  observaciones TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capacitaciones_programa ON capacitaciones_sst(programa_id);
CREATE INDEX IF NOT EXISTS idx_capacitaciones_empresa ON capacitaciones_sst(empresa_id);
CREATE INDEX IF NOT EXISTS idx_capacitaciones_tipo ON capacitaciones_sst(tipo_capacitacion);
CREATE INDEX IF NOT EXISTS idx_capacitaciones_fecha ON capacitaciones_sst(fecha_ejecucion);
CREATE INDEX IF NOT EXISTS idx_capacitaciones_estado ON capacitaciones_sst(estado);

COMMENT ON TABLE capacitaciones_sst IS 'Capacitaciones en SST - Versión refinada con más detalles';

-- Asistencia individual a capacitaciones
CREATE TABLE IF NOT EXISTS asistencia_capacitaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  capacitacion_id UUID REFERENCES capacitaciones_sst(id) ON DELETE CASCADE,
  trabajador_id UUID REFERENCES trabajadores(id) ON DELETE CASCADE,
  
  -- Registro de asistencia
  asistio BOOLEAN DEFAULT FALSE,
  hora_ingreso TIME,
  hora_salida TIME,
  minutos_asistencia INTEGER,
  asistencia_completa BOOLEAN DEFAULT FALSE,
  
  -- Evaluación
  fue_evaluado BOOLEAN DEFAULT FALSE,
  nota_obtenida DECIMAL(4,2),
  aprobo BOOLEAN DEFAULT FALSE,
  
  -- Certificación
  requiere_certificado BOOLEAN DEFAULT FALSE,
  certificado_emitido BOOLEAN DEFAULT FALSE,
  numero_certificado VARCHAR(50),
  fecha_emision_certificado DATE,
  certificado_url TEXT,
  
  -- Encuesta de satisfacción
  completo_encuesta BOOLEAN DEFAULT FALSE,
  calificacion_capacitacion INTEGER CHECK (calificacion_capacitacion BETWEEN 1 AND 5),
  calificacion_expositor INTEGER CHECK (calificacion_expositor BETWEEN 1 AND 5),
  comentarios TEXT,
  
  observaciones TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(capacitacion_id, trabajador_id)
);

CREATE INDEX IF NOT EXISTS idx_asistencia_capacitacion ON asistencia_capacitaciones(capacitacion_id);
CREATE INDEX IF NOT EXISTS idx_asistencia_trabajador ON asistencia_capacitaciones(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_asistencia_asistio ON asistencia_capacitaciones(asistio);
CREATE INDEX IF NOT EXISTS idx_asistencia_aprobo ON asistencia_capacitaciones(aprobo);

COMMENT ON TABLE asistencia_capacitaciones IS 'Asistencia detallada de trabajadores a capacitaciones';

-- ============================================
-- MÓDULO: COMITÉ DE SEGURIDAD Y SALUD EN EL TRABAJO (REFINADO)
-- Según Ley 29783, Art. 29-41
-- ============================================

-- Nota: La tabla comite_sst ya existe en PARTE 1, pero agregamos tablas relacionadas

-- Miembros del comité (si no existe)
CREATE TABLE IF NOT EXISTS miembros_comite_sst (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comite_id UUID REFERENCES comite_sst(id) ON DELETE CASCADE,
  trabajador_id UUID REFERENCES trabajadores(id),
  
  -- Representación
  representacion VARCHAR(50) CHECK (representacion IN (
    'Empleador', 'Trabajadores'
  )),
  
  -- Cargo en el comité
  cargo_comite VARCHAR(100) CHECK (cargo_comite IN (
    'Presidente',
    'Secretario',
    'Miembro titular',
    'Miembro suplente'
  )),
  
  -- Periodo
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  
  -- Capacitación
  horas_capacitacion_sst INTEGER DEFAULT 0,
  capacitacion_especializada BOOLEAN DEFAULT FALSE,
  certificados_capacitacion TEXT[],
  
  estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN (
    'Activo', 'Cesado', 'Renunciado'
  )),
  
  observaciones TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_miembros_comite ON miembros_comite_sst(comite_id);
CREATE INDEX IF NOT EXISTS idx_miembros_trabajador ON miembros_comite_sst(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_miembros_cargo ON miembros_comite_sst(cargo_comite);

COMMENT ON TABLE miembros_comite_sst IS 'Miembros del Comité de SST con sus cargos y representación';

-- Reuniones del comité (refinado - si actas_comite_sst existe, esta es más detallada)
CREATE TABLE IF NOT EXISTS reuniones_comite_sst (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comite_id UUID REFERENCES comite_sst(id) ON DELETE CASCADE,
  
  -- Identificación
  numero_reunion VARCHAR(20),
  tipo_reunion VARCHAR(50) CHECK (tipo_reunion IN (
    'Ordinaria', 'Extraordinaria'
  )),
  
  -- Programación
  fecha_programada DATE,
  fecha_realizacion DATE NOT NULL,
  hora_inicio TIME,
  hora_fin TIME,
  lugar VARCHAR(255),
  
  -- Agenda y desarrollo
  agenda TEXT[],
  temas_tratados TEXT,
  acuerdos TEXT[],
  tareas_asignadas JSONB DEFAULT '[]'::jsonb,
  -- Ejemplo: [{"tarea": "Inspección área X", "responsable": "Juan Pérez", "plazo": "2024-02-15"}]
  
  -- Asistencia
  asistentes TEXT[],
  numero_asistentes INTEGER,
  quorum_alcanzado BOOLEAN DEFAULT TRUE,
  
  -- Documentación
  acta_reunion_url TEXT,
  evidencias_url TEXT[],
  
  -- Seguimiento
  tiene_seguimiento BOOLEAN DEFAULT FALSE,
  fecha_seguimiento DATE,
  porcentaje_cumplimiento_acuerdos DECIMAL(5,2),
  
  observaciones TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reuniones_comite ON reuniones_comite_sst(comite_id);
CREATE INDEX IF NOT EXISTS idx_reuniones_fecha ON reuniones_comite_sst(fecha_realizacion);
CREATE INDEX IF NOT EXISTS idx_reuniones_tipo ON reuniones_comite_sst(tipo_reunion);

COMMENT ON TABLE reuniones_comite_sst IS 'Reuniones del Comité de SST con seguimiento de acuerdos';

-- ============================================
-- MÓDULO: ACCIDENTES E INCIDENTES DE TRABAJO (REFINADO)
-- Según DS 005-2012-TR
-- ============================================

-- Nota: La tabla incidentes_accidentes ya existe en PARTE 1
-- Esta es una versión refinada con más campos normativos

CREATE TABLE IF NOT EXISTS accidentes_incidentes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID REFERENCES empresas(id),
  trabajador_id UUID REFERENCES trabajadores(id),
  
  -- Clasificación
  tipo_evento VARCHAR(50) NOT NULL CHECK (tipo_evento IN (
    'Accidente de trabajo',
    'Accidente leve',
    'Accidente incapacitante',
    'Accidente mortal',
    'Incidente peligroso',
    'Incidente'
  )),
  
  subtipo VARCHAR(100),
  
  -- Ocurrencia
  fecha_ocurrencia DATE NOT NULL,
  hora_ocurrencia TIME NOT NULL,
  lugar_ocurrencia VARCHAR(255),
  area_ocurrencia VARCHAR(100),
  puesto_trabajo_momento VARCHAR(255),
  
  -- Descripción del evento
  descripcion_evento TEXT NOT NULL,
  descripcion_lesion TEXT,
  parte_cuerpo_afectada VARCHAR(100),
  naturaleza_lesion VARCHAR(100),
  
  -- Clasificación de gravedad
  dias_descanso_medico INTEGER DEFAULT 0,
  es_incapacitante BOOLEAN DEFAULT FALSE,
  tipo_incapacidad VARCHAR(50) CHECK (tipo_incapacidad IN (
    'Temporal', 'Parcial permanente', 'Total permanente', 'Mortal', NULL
  )),
  
  -- Agente causante
  agente_causante VARCHAR(255),
  tipo_agente VARCHAR(100),
  
  -- Condiciones
  condicion_insegura TEXT,
  acto_inseguro TEXT,
  factor_personal TEXT,
  factor_trabajo TEXT,
  
  -- Testigos
  testigos TEXT[],
  
  -- Atención médica
  recibio_atencion_medica BOOLEAN DEFAULT FALSE,
  establecimiento_salud VARCHAR(255),
  diagnostico_inicial TEXT,
  diagnostico_final TEXT,
  codigo_cie10 VARCHAR(10),
  
  -- Investigación (obligatoria)
  investigacion_realizada BOOLEAN DEFAULT FALSE,
  fecha_inicio_investigacion DATE,
  responsable_investigacion VARCHAR(255),
  miembros_investigacion TEXT[],
  
  -- Causas identificadas
  causas_inmediatas TEXT[],
  causas_basicas TEXT[],
  causa_raiz TEXT,
  
  -- Medidas correctivas
  medidas_correctivas_inmediatas TEXT[],
  medidas_correctivas_planificadas JSONB DEFAULT '[]'::jsonb,
  
  -- Notificación (obligatoria según gravedad)
  requiere_notificacion_mintra BOOLEAN DEFAULT FALSE,
  notificado_mintra BOOLEAN DEFAULT FALSE,
  fecha_notificacion_mintra DATE,
  codigo_notificacion_mintra VARCHAR(50),
  
  notificado_sctr BOOLEAN DEFAULT FALSE,
  fecha_notificacion_sctr DATE,
  
  -- Documentos
  informe_investigacion_url TEXT,
  fotos_url TEXT[],
  videos_url TEXT[],
  certificados_medicos_url TEXT[],
  notificacion_mintra_url TEXT,
  
  -- Seguimiento
  estado VARCHAR(20) DEFAULT 'En investigación' CHECK (estado IN (
    'Reportado',
    'En investigación',
    'Investigación completada',
    'Cerrado'
  )),
  
  -- Costos
  costo_directo DECIMAL(10,2),
  costo_indirecto DECIMAL(10,2),
  dias_perdidos INTEGER DEFAULT 0,
  
  observaciones TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accidentes_empresa ON accidentes_incidentes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_accidentes_trabajador ON accidentes_incidentes(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_accidentes_tipo ON accidentes_incidentes(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_accidentes_fecha ON accidentes_incidentes(fecha_ocurrencia);
CREATE INDEX IF NOT EXISTS idx_accidentes_estado ON accidentes_incidentes(estado);

COMMENT ON TABLE accidentes_incidentes IS 'Registro de accidentes e incidentes de trabajo - Obligatorio DS 005-2012-TR';

-- ============================================
-- MÓDULO: INSPECCIONES INTERNAS (REFINADO)
-- ============================================

-- Nota: La tabla inspecciones_seguridad ya existe en PARTE 1
-- Esta es una versión refinada con más campos

CREATE TABLE IF NOT EXISTS inspecciones_sst (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID REFERENCES empresas(id),
  sede_id UUID REFERENCES sedes_empresa(id),
  
  -- Identificación
  codigo_inspeccion VARCHAR(50),
  tipo_inspeccion VARCHAR(100) CHECK (tipo_inspeccion IN (
    'Planeada',
    'No planeada',
    'Rutina',
    'Especializada',
    'Pre-uso',
    'Gubernamental'
  )),
  
  area_inspeccionada VARCHAR(255),
  equipos_inspeccionados TEXT[],
  
  -- Programación
  fecha_programada DATE,
  fecha_realizacion DATE NOT NULL,
  hora_inicio TIME,
  hora_fin TIME,
  
  -- Inspectores
  inspector_principal VARCHAR(255),
  inspectores TEXT[],
  
  -- Hallazgos
  hallazgos JSONB DEFAULT '[]'::jsonb,
  -- Ejemplo: [{"tipo": "Condición insegura", "descripcion": "...", "criticidad": "Alta"}]
  
  total_hallazgos INTEGER DEFAULT 0,
  criticos INTEGER DEFAULT 0,
  mayores INTEGER DEFAULT 0,
  menores INTEGER DEFAULT 0,
  
  -- Acciones correctivas
  acciones_correctivas JSONB DEFAULT '[]'::jsonb,
  
  -- Documentos
  check_list_url TEXT,
  fotos_url TEXT[],
  informe_inspeccion_url TEXT,
  
  -- Estado
  estado VARCHAR(20) DEFAULT 'Completada' CHECK (estado IN (
    'Programada', 'En proceso', 'Completada', 'Cancelada'
  )),
  
  observaciones TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspecciones_empresa ON inspecciones_sst(empresa_id);
CREATE INDEX IF NOT EXISTS idx_inspecciones_fecha ON inspecciones_sst(fecha_realizacion);
CREATE INDEX IF NOT EXISTS idx_inspecciones_tipo ON inspecciones_sst(tipo_inspeccion);

COMMENT ON TABLE inspecciones_sst IS 'Inspecciones de seguridad y salud en el trabajo - Versión refinada';

-- ============================================
-- MÓDULO: INDICADORES DE SST
-- ============================================

CREATE TABLE IF NOT EXISTS indicadores_sst (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID REFERENCES empresas(id),
  
  -- Periodo
  anio INTEGER NOT NULL,
  mes INTEGER CHECK (mes BETWEEN 1 AND 12),
  periodo VARCHAR(7) NOT NULL, -- YYYY-MM
  
  -- Indicadores de gestión
  total_trabajadores INTEGER,
  horas_hombre_trabajadas INTEGER,
  
  -- Accidentabilidad
  numero_accidentes_trabajo INTEGER DEFAULT 0,
  numero_accidentes_leves INTEGER DEFAULT 0,
  numero_accidentes_incapacitantes INTEGER DEFAULT 0,
  numero_accidentes_mortales INTEGER DEFAULT 0,
  numero_incidentes INTEGER DEFAULT 0,
  numero_incidentes_peligrosos INTEGER DEFAULT 0,
  
  -- Días perdidos
  dias_perdidos_total INTEGER DEFAULT 0,
  dias_perdidos_accidentes INTEGER DEFAULT 0,
  dias_perdidos_enfermedades INTEGER DEFAULT 0,
  
  -- Índices de seguridad
  indice_frecuencia DECIMAL(10,2),
  -- IF = (N° accidentes incapacitantes × 1,000,000) / Horas hombre trabajadas
  
  indice_gravedad DECIMAL(10,2),
  -- IG = (Días perdidos × 1,000,000) / Horas hombre trabajadas
  
  indice_accidentabilidad DECIMAL(10,2),
  -- IA = (IF × IG) / 1000
  
  -- Enfermedades ocupacionales
  casos_enfermedad_ocupacional INTEGER DEFAULT 0,
  
  -- Ausentismo
  total_ausencias INTEGER DEFAULT 0,
  tasa_ausentismo DECIMAL(5,2),
  
  -- Capacitación
  trabajadores_capacitados INTEGER DEFAULT 0,
  horas_capacitacion_total DECIMAL(8,2),
  porcentaje_trabajadores_capacitados DECIMAL(5,2),
  
  -- Exámenes médicos
  examenes_programados INTEGER DEFAULT 0,
  examenes_realizados INTEGER DEFAULT 0,
  cobertura_examenes DECIMAL(5,2),
  
  -- Inspecciones
  inspecciones_programadas INTEGER DEFAULT 0,
  inspecciones_realizadas INTEGER DEFAULT 0,
  
  -- Cumplimiento PASST
  actividades_passt_programadas INTEGER DEFAULT 0,
  actividades_passt_ejecutadas INTEGER DEFAULT 0,
  cumplimiento_passt DECIMAL(5,2),
  
  -- Observaciones
  observaciones TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(empresa_id, periodo)
);

CREATE INDEX IF NOT EXISTS idx_indicadores_empresa ON indicadores_sst(empresa_id);
CREATE INDEX IF NOT EXISTS idx_indicadores_periodo ON indicadores_sst(periodo);
CREATE INDEX IF NOT EXISTS idx_indicadores_anio ON indicadores_sst(anio);

COMMENT ON TABLE indicadores_sst IS 'Indicadores de Seguridad y Salud en el Trabajo por periodo';

-- ============================================
-- TRIGGERS PARA ACTUALIZACIÓN AUTOMÁTICA
-- ============================================

-- Trigger para updated_at (si no existe)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a tablas nuevas
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND column_name = 'updated_at'
    AND table_name IN (
      'planes_anuales_sst',
      'actividades_plan_sst',
      'ausentismo_laboral',
      'programa_capacitacion_sst',
      'capacitaciones_sst',
      'reuniones_comite_sst',
      'accidentes_incidentes',
      'inspecciones_sst'
    )
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON %I', t, t);
    EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON %I 
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
  END LOOP;
END $$;

-- ============================================
-- VISTAS DE COMPATIBILIDAD Y REPORTES
-- ============================================

-- Vista unificada de trabajadores (antigua y nueva tabla)
CREATE OR REPLACE VIEW vista_trabajadores_unificada AS
SELECT 
  -- Priorizar datos de tabla nueva
  COALESCE(t.id, gen_random_uuid()) as id,
  COALESCE(t.empresa_id, rt.empresa_id) as empresa_id,
  COALESCE(t.numero_documento, rt.dni_ce_pas) as numero_documento,
  COALESCE(t.apellido_paterno || ' ' || t.apellido_materno || ' ' || t.nombres, rt.apellidos_nombre) as nombre_completo,
  COALESCE(t.puesto_trabajo, rt.puesto_trabajo) as puesto_trabajo,
  COALESCE(t.telefono_personal, rt.telefono_trabajador) as telefono,
  COALESCE(t.sexo, rt.sexo) as sexo,
  COALESCE(t.estado_laboral, 'Activo') as estado_laboral,
  COALESCE(t.jornada_laboral, rt.jornada_laboral) as jornada_laboral,
  COALESCE(t.gerencia, rt.gerencia) as gerencia,
  COALESCE(t.supervisor_inmediato, rt.supervisor_responsable) as supervisor,
  -- Indicar origen
  CASE 
    WHEN t.id IS NOT NULL THEN 'nueva'
    ELSE 'antigua'
  END as origen_datos,
  rt.id as registro_antiguo_id,
  t.created_at
FROM trabajadores t
FULL OUTER JOIN registros_trabajadores rt 
  ON t.registro_trabajo_modificado_id = rt.id
WHERE COALESCE(t.estado_laboral, 'Activo') = 'Activo';

COMMENT ON VIEW vista_trabajadores_unificada IS 'Vista que unifica datos de registros_trabajadores y trabajadores';

-- Vista de indicadores consolidados
CREATE OR REPLACE VIEW vista_indicadores_consolidados AS
SELECT 
  i.*,
  e.nombre as empresa_nombre,
  e.ruc,
  e.nivel_riesgo,
  -- Calcular tasas
  CASE 
    WHEN i.horas_hombre_trabajadas > 0 
    THEN (i.numero_accidentes_incapacitantes::DECIMAL * 1000000) / i.horas_hombre_trabajadas 
    ELSE 0 
  END as if_calculado,
  CASE 
    WHEN i.horas_hombre_trabajadas > 0 
    THEN (i.dias_perdidos_total::DECIMAL * 1000000) / i.horas_hombre_trabajadas 
    ELSE 0 
  END as ig_calculado
FROM indicadores_sst i
LEFT JOIN empresas e ON i.empresa_id = e.id;

COMMENT ON VIEW vista_indicadores_consolidados IS 'Vista consolidada de indicadores SST con cálculos automáticos';

-- ============================================
-- FUNCIONES AUXILIARES
-- ============================================

-- Función para calcular edad
CREATE OR REPLACE FUNCTION calcular_edad(fecha_nac DATE)
RETURNS INTEGER AS $$
BEGIN
  RETURN EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_nac));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calcular_edad IS 'Calcula la edad a partir de la fecha de nacimiento';

-- Función para obtener trabajadores con exámenes vencidos
CREATE OR REPLACE FUNCTION trabajadores_examenes_vencidos(empresa_uuid UUID)
RETURNS TABLE(
  trabajador_id UUID,
  nombre_completo TEXT,
  ultimo_examen DATE,
  dias_vencido INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.apellido_paterno || ' ' || t.apellido_materno || ' ' || t.nombres,
    MAX(em.fecha_examen),
    CURRENT_DATE - MAX(em.fecha_examen)
  FROM trabajadores t
  LEFT JOIN examenes_medicos em ON t.id = em.trabajador_id
  WHERE t.empresa_id = empresa_uuid
    AND t.estado_laboral = 'Activo'
  GROUP BY t.id, t.apellido_paterno, t.apellido_materno, t.nombres
  HAVING MAX(em.fecha_examen) < CURRENT_DATE - INTERVAL '1 year'
     OR MAX(em.fecha_examen) IS NULL
  ORDER BY MAX(em.fecha_examen) NULLS FIRST;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION trabajadores_examenes_vencidos IS 'Retorna trabajadores con exámenes médicos vencidos o sin exámenes';

-- Función para calcular índice de frecuencia
CREATE OR REPLACE FUNCTION calcular_indice_frecuencia(
  num_accidentes INTEGER,
  horas_hombre INTEGER
)
RETURNS DECIMAL(10,2) AS $$
BEGIN
  IF horas_hombre > 0 THEN
    RETURN (num_accidentes::DECIMAL * 1000000) / horas_hombre;
  END IF;
  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calcular_indice_frecuencia IS 'Calcula el Índice de Frecuencia (IF) de accidentes';

-- Función para calcular índice de gravedad
CREATE OR REPLACE FUNCTION calcular_indice_gravedad(
  dias_perdidos INTEGER,
  horas_hombre INTEGER
)
RETURNS DECIMAL(10,2) AS $$
BEGIN
  IF horas_hombre > 0 THEN
    RETURN (dias_perdidos::DECIMAL * 1000000) / horas_hombre;
  END IF;
  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calcular_indice_gravedad IS 'Calcula el Índice de Gravedad (IG) de accidentes';

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las nuevas tablas
ALTER TABLE planes_anuales_sst ENABLE ROW LEVEL SECURITY;
ALTER TABLE actividades_plan_sst ENABLE ROW LEVEL SECURITY;
ALTER TABLE ausentismo_laboral ENABLE ROW LEVEL SECURITY;
ALTER TABLE programa_capacitacion_sst ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacitaciones_sst ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencia_capacitaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE miembros_comite_sst ENABLE ROW LEVEL SECURITY;
ALTER TABLE reuniones_comite_sst ENABLE ROW LEVEL SECURITY;
ALTER TABLE accidentes_incidentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspecciones_sst ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicadores_sst ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Usuarios solo ven datos de sus empresas

-- Planes Anuales SST
CREATE POLICY "Users can view their company PASST"
  ON planes_anuales_sst FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their company PASST"
  ON planes_anuales_sst FOR ALL
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Actividades Plan SST
CREATE POLICY "Users can view their company activities"
  ON actividades_plan_sst FOR SELECT
  USING (
    plan_id IN (
      SELECT id 
      FROM planes_anuales_sst 
      WHERE empresa_id IN (
        SELECT empresa_id 
        FROM user_empresas 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage their company activities"
  ON actividades_plan_sst FOR ALL
  USING (
    plan_id IN (
      SELECT id 
      FROM planes_anuales_sst 
      WHERE empresa_id IN (
        SELECT empresa_id 
        FROM user_empresas 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Ausentismo Laboral
CREATE POLICY "Users can view their company absenteeism"
  ON ausentismo_laboral FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their company absenteeism"
  ON ausentismo_laboral FOR ALL
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Programa Capacitación SST
CREATE POLICY "Users can view their company training programs"
  ON programa_capacitacion_sst FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their company training programs"
  ON programa_capacitacion_sst FOR ALL
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Capacitaciones SST
CREATE POLICY "Users can view their company trainings"
  ON capacitaciones_sst FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their company trainings"
  ON capacitaciones_sst FOR ALL
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Asistencia Capacitaciones
CREATE POLICY "Users can view their company training attendance"
  ON asistencia_capacitaciones FOR SELECT
  USING (
    capacitacion_id IN (
      SELECT id 
      FROM capacitaciones_sst 
      WHERE empresa_id IN (
        SELECT empresa_id 
        FROM user_empresas 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage their company training attendance"
  ON asistencia_capacitaciones FOR ALL
  USING (
    capacitacion_id IN (
      SELECT id 
      FROM capacitaciones_sst 
      WHERE empresa_id IN (
        SELECT empresa_id 
        FROM user_empresas 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Miembros Comité SST
CREATE POLICY "Users can view their company committee members"
  ON miembros_comite_sst FOR SELECT
  USING (
    comite_id IN (
      SELECT id 
      FROM comite_sst 
      WHERE empresa_id IN (
        SELECT empresa_id 
        FROM user_empresas 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage their company committee members"
  ON miembros_comite_sst FOR ALL
  USING (
    comite_id IN (
      SELECT id 
      FROM comite_sst 
      WHERE empresa_id IN (
        SELECT empresa_id 
        FROM user_empresas 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Reuniones Comité SST
CREATE POLICY "Users can view their company committee meetings"
  ON reuniones_comite_sst FOR SELECT
  USING (
    comite_id IN (
      SELECT id 
      FROM comite_sst 
      WHERE empresa_id IN (
        SELECT empresa_id 
        FROM user_empresas 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage their company committee meetings"
  ON reuniones_comite_sst FOR ALL
  USING (
    comite_id IN (
      SELECT id 
      FROM comite_sst 
      WHERE empresa_id IN (
        SELECT empresa_id 
        FROM user_empresas 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Accidentes e Incidentes
CREATE POLICY "Users can view their company accidents"
  ON accidentes_incidentes FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their company accidents"
  ON accidentes_incidentes FOR ALL
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Inspecciones SST
CREATE POLICY "Users can view their company inspections"
  ON inspecciones_sst FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their company inspections"
  ON inspecciones_sst FOR ALL
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Indicadores SST
CREATE POLICY "Users can view their company indicators"
  ON indicadores_sst FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their company indicators"
  ON indicadores_sst FOR ALL
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
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
    );
  
  RAISE NOTICE 'Migración PARTE 2 completada. Tablas nuevas creadas: %', table_count;
  
  -- Listar todas las tablas públicas
  RAISE NOTICE 'Listado de todas las tablas en schema public:';
  FOR table_name IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename
  LOOP
    RAISE NOTICE '  - %', table_name;
  END LOOP;
END $$;

SELECT 'PARTE 2 - Expansión completada exitosamente' as status;

