-- ============================================
-- SERVYSALUD360 - EXPANSIÓN MODULAR SST
-- MANTIENE TABLAS EXISTENTES INTACTAS
-- Agrega módulos de SST según normativa peruana
-- Ley 29783 - Ley de Seguridad y Salud en el Trabajo
-- ============================================

-- IMPORTANTE: Este script NO modifica tablas existentes
-- Solo AGREGA nuevas tablas y funcionalidades

-- Habilitar extensiones (si no están)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para búsqueda fuzzy

-- ============================================
-- COMPATIBILIDAD: Actualizar tabla empresas (si existe)
-- ============================================

-- Solo agregar columnas nuevas si la tabla existe
DO $$
BEGIN
  -- Verificar si la tabla empresas existe
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'empresas') THEN
    
    -- Agregar columnas nuevas solo si no existen
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'empresas' AND column_name = 'ciiu') THEN
      ALTER TABLE empresas ADD COLUMN ciiu VARCHAR(10);
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'empresas' AND column_name = 'sector_economico') THEN
      ALTER TABLE empresas ADD COLUMN sector_economico VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'empresas' AND column_name = 'actividad_economica') THEN
      ALTER TABLE empresas ADD COLUMN actividad_economica TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'empresas' AND column_name = 'nivel_riesgo') THEN
      ALTER TABLE empresas ADD COLUMN nivel_riesgo VARCHAR(20) 
        CHECK (nivel_riesgo IN ('Bajo', 'Medio', 'Alto', 'Muy Alto'));
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'empresas' AND column_name = 'numero_trabajadores') THEN
      ALTER TABLE empresas ADD COLUMN numero_trabajadores INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'empresas' AND column_name = 'tiene_sctr') THEN
      ALTER TABLE empresas ADD COLUMN tiene_sctr BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'empresas' AND column_name = 'aseguradora_sctr') THEN
      ALTER TABLE empresas ADD COLUMN aseguradora_sctr VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'empresas' AND column_name = 'tiene_sgsst') THEN
      ALTER TABLE empresas ADD COLUMN tiene_sgsst BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'empresas' AND column_name = 'fecha_implementacion_sgsst') THEN
      ALTER TABLE empresas ADD COLUMN fecha_implementacion_sgsst DATE;
    END IF;
    
    RAISE NOTICE 'Tabla empresas actualizada con nuevas columnas';
  ELSE
    RAISE NOTICE 'Tabla empresas no existe, se creará después';
  END IF;
END $$;

-- ============================================
-- COMPATIBILIDAD: Actualizar tabla registros_trabajadores
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'registros_trabajadores') THEN
    
    -- Agregar columnas de compatibilidad
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'registros_trabajadores' AND column_name = 'migrado_a_trabajadores') THEN
      ALTER TABLE registros_trabajadores ADD COLUMN migrado_a_trabajadores BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'registros_trabajadores' AND column_name = 'trabajador_nuevo_id') THEN
      ALTER TABLE registros_trabajadores ADD COLUMN trabajador_nuevo_id UUID;
    END IF;
    
    RAISE NOTICE 'Tabla registros_trabajadores actualizada para compatibilidad';
  END IF;
END $$;

-- ============================================
-- NUEVAS TABLAS: SEDES/CENTROS DE TRABAJO
-- ============================================

CREATE TABLE IF NOT EXISTS sedes_empresa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  
  nombre_sede VARCHAR(255) NOT NULL,
  tipo_sede VARCHAR(50) DEFAULT 'Principal',
  codigo_sede VARCHAR(20),
  
  direccion TEXT,
  distrito VARCHAR(100),
  provincia VARCHAR(100),
  departamento VARCHAR(100),
  ubigeo VARCHAR(6),
  
  responsable_sede VARCHAR(255),
  telefono VARCHAR(20),
  email VARCHAR(255),
  
  numero_trabajadores INTEGER DEFAULT 0,
  
  estado BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sedes_empresa ON sedes_empresa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_sedes_codigo ON sedes_empresa(codigo_sede);

COMMENT ON TABLE sedes_empresa IS 'Sedes o centros de trabajo de las empresas';

-- ============================================
-- NUEVAS TABLAS: TRABAJADORES EXTENDIDA
-- ============================================

CREATE TABLE IF NOT EXISTS trabajadores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  sede_id UUID REFERENCES sedes_empresa(id),
  
  -- Datos personales
  tipo_documento VARCHAR(20) DEFAULT 'DNI' CHECK (tipo_documento IN ('DNI', 'CE', 'Pasaporte')),
  numero_documento VARCHAR(20) NOT NULL,
  apellido_paterno VARCHAR(100) NOT NULL,
  apellido_materno VARCHAR(100) NOT NULL,
  nombres VARCHAR(100) NOT NULL,
  
  fecha_nacimiento DATE,
  edad INTEGER,
  sexo VARCHAR(10) CHECK (sexo IN ('Masculino', 'Femenino')),
  estado_civil VARCHAR(20),
  grado_instruccion VARCHAR(50),
  profesion VARCHAR(100),
  
  -- Contacto
  telefono_personal VARCHAR(20),
  telefono_emergencia VARCHAR(20),
  contacto_emergencia VARCHAR(255),
  email_personal VARCHAR(255),
  email_corporativo VARCHAR(255),
  
  direccion TEXT,
  distrito VARCHAR(100),
  provincia VARCHAR(100),
  departamento VARCHAR(100),
  
  -- Datos laborales
  codigo_trabajador VARCHAR(50),
  puesto_trabajo VARCHAR(255) NOT NULL,
  area_trabajo VARCHAR(255),
  gerencia VARCHAR(255),
  cargo VARCHAR(255),
  
  tipo_contrato VARCHAR(50),
  modalidad_contrato VARCHAR(100),
  fecha_ingreso DATE,
  fecha_cese DATE,
  motivo_cese TEXT,
  
  -- Jornada
  jornada_laboral VARCHAR(50),
  turno_trabajo VARCHAR(50),
  horas_diarias INTEGER,
  horas_semanales INTEGER,
  dias_laborales_semana INTEGER,
  
  -- Remuneración
  remuneracion_mensual DECIMAL(10,2),
  tipo_remuneracion VARCHAR(50),
  
  -- Supervisión
  supervisor_inmediato VARCHAR(255),
  supervisor_id UUID REFERENCES trabajadores(id),
  
  -- SCTR
  esta_en_sctr BOOLEAN DEFAULT FALSE,
  fecha_afiliacion_sctr DATE,
  
  -- Estado
  estado_laboral VARCHAR(20) DEFAULT 'Activo' 
    CHECK (estado_laboral IN ('Activo', 'Cesado', 'Suspendido', 'Licencia')),
  
  -- COMPATIBILIDAD CON TABLA ANTIGUA
  registro_trabajo_modificado_id UUID,
  migrado_desde_registro BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint único por empresa
  UNIQUE(empresa_id, numero_documento)
);

CREATE INDEX IF NOT EXISTS idx_trabajadores_empresa ON trabajadores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_trabajadores_documento ON trabajadores(numero_documento);
CREATE INDEX IF NOT EXISTS idx_trabajadores_estado ON trabajadores(estado_laboral);
CREATE INDEX IF NOT EXISTS idx_trabajadores_puesto ON trabajadores(puesto_trabajo);
CREATE INDEX IF NOT EXISTS idx_trabajadores_registro_antiguo ON trabajadores(registro_trabajo_modificado_id);

COMMENT ON TABLE trabajadores IS 'Tabla extendida de trabajadores con datos completos - Compatible con registros_trabajadores';
COMMENT ON COLUMN trabajadores.registro_trabajo_modificado_id IS 'Enlace con tabla antigua registros_trabajadores para compatibilidad';

-- ============================================
-- CATÁLOGOS: PELIGROS Y RIESGOS
-- ============================================

CREATE TABLE IF NOT EXISTS catalogo_peligros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(20) UNIQUE NOT NULL,
  tipo_peligro VARCHAR(50) NOT NULL CHECK (tipo_peligro IN (
    'Físico', 'Químico', 'Biológico', 'Ergonómico', 
    'Psicosocial', 'Mecánico', 'Eléctrico', 'Locativo'
  )),
  nombre_peligro VARCHAR(255) NOT NULL,
  descripcion TEXT,
  normativa_aplicable TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_peligros_tipo ON catalogo_peligros(tipo_peligro);
CREATE INDEX IF NOT EXISTS idx_peligros_codigo ON catalogo_peligros(codigo);

CREATE TABLE IF NOT EXISTS catalogo_riesgos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  peligro_id UUID REFERENCES catalogo_peligros(id),
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nombre_riesgo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  consecuencias_posibles TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_riesgos_peligro ON catalogo_riesgos(peligro_id);

-- Insertar peligros comunes
INSERT INTO catalogo_peligros (codigo, tipo_peligro, nombre_peligro, descripcion) VALUES
('PF-001', 'Físico', 'Ruido ocupacional', 'Exposición a niveles de ruido superiores a 85 dB'),
('PF-002', 'Físico', 'Vibración', 'Vibración segmentaria o de cuerpo entero'),
('PF-003', 'Físico', 'Temperaturas extremas', 'Exposición a calor o frío extremo'),
('PF-004', 'Físico', 'Radiación no ionizante', 'Exposición a radiación UV, IR, láser'),
('PF-005', 'Físico', 'Iluminación deficiente', 'Niveles inadecuados de iluminación'),

('PQ-001', 'Químico', 'Polvos inorgánicos', 'Sílice, asbesto, metales'),
('PQ-002', 'Químico', 'Gases y vapores', 'Monóxido de carbono, solventes orgánicos'),
('PQ-003', 'Químico', 'Material particulado', 'PM2.5, PM10'),
('PQ-004', 'Químico', 'Humos metálicos', 'Plomo, mercurio, cadmio'),

('PB-001', 'Biológico', 'Agentes biológicos', 'Bacterias, virus, hongos'),
('PB-002', 'Biológico', 'Vectores', 'Mosquitos, roedores, insectos'),

('PE-001', 'Ergonómico', 'Posturas forzadas', 'Posiciones incómodas prolongadas'),
('PE-002', 'Ergonómico', 'Movimientos repetitivos', 'Actividades repetitivas de miembros superiores'),
('PE-003', 'Ergonómico', 'Manipulación manual de cargas', 'Levantamiento, transporte de cargas'),
('PE-004', 'Ergonómico', 'Trabajo en pantallas PVD', 'Pantallas de visualización de datos prolongado'),

('PP-001', 'Psicosocial', 'Carga mental', 'Demandas cognitivas elevadas'),
('PP-002', 'Psicosocial', 'Trabajo bajo presión', 'Plazos ajustados, alta responsabilidad'),
('PP-003', 'Psicosocial', 'Acoso laboral', 'Hostigamiento, mobbing'),

('PM-001', 'Mecánico', 'Caídas al mismo nivel', 'Tropiezos, resbalones'),
('PM-002', 'Mecánico', 'Caídas a distinto nivel', 'Trabajo en altura'),
('PM-003', 'Mecánico', 'Atrapamiento', 'Maquinaria, partes móviles'),

('PL-001', 'Locativo', 'Superficies irregulares', 'Pisos dañados, escaleras defectuosas'),
('PL-002', 'Locativo', 'Espacio confinado', 'Espacios cerrados con ventilación limitada')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================
-- MATRIZ IPER
-- ============================================

CREATE TABLE IF NOT EXISTS matriz_iper (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID REFERENCES empresas(id),
  sede_id UUID REFERENCES sedes_empresa(id),
  
  -- Identificación
  proceso VARCHAR(255),
  actividad VARCHAR(255),
  tarea TEXT,
  puesto_trabajo VARCHAR(255),
  
  -- Peligro y riesgo
  peligro_id UUID REFERENCES catalogo_peligros(id),
  riesgo_id UUID REFERENCES catalogo_riesgos(id),
  
  -- Evaluación del riesgo inicial
  probabilidad INTEGER CHECK (probabilidad BETWEEN 1 AND 4),
  severidad INTEGER CHECK (severidad BETWEEN 1 AND 4),
  nivel_riesgo INTEGER GENERATED ALWAYS AS (probabilidad * severidad) STORED,
  clasificacion_riesgo VARCHAR(20) GENERATED ALWAYS AS (
    CASE 
      WHEN (probabilidad * severidad) <= 4 THEN 'Trivial'
      WHEN (probabilidad * severidad) <= 8 THEN 'Tolerable'
      WHEN (probabilidad * severidad) <= 12 THEN 'Moderado'
      WHEN (probabilidad * severidad) <= 16 THEN 'Importante'
      ELSE 'Intolerable'
    END
  ) STORED,
  
  -- Controles existentes
  controles_actuales TEXT,
  epp_actual TEXT[],
  
  -- Evaluación con controles (riesgo residual)
  probabilidad_residual INTEGER CHECK (probabilidad_residual BETWEEN 1 AND 4),
  severidad_residual INTEGER CHECK (severidad_residual BETWEEN 1 AND 4),
  nivel_riesgo_residual INTEGER GENERATED ALWAYS AS (
    probabilidad_residual * severidad_residual
  ) STORED,
  
  -- Medidas de control (jerarquía de controles)
  medidas_eliminacion TEXT,
  medidas_sustitucion TEXT,
  medidas_ingenieria TEXT,
  medidas_administrativas TEXT,
  epp_requerido TEXT[],
  
  -- Seguimiento
  responsable VARCHAR(255),
  fecha_evaluacion DATE NOT NULL,
  fecha_revision DATE,
  estado VARCHAR(20) DEFAULT 'Vigente',
  
  observaciones TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_iper_empresa ON matriz_iper(empresa_id);
CREATE INDEX IF NOT EXISTS idx_iper_puesto ON matriz_iper(puesto_trabajo);
CREATE INDEX IF NOT EXISTS idx_iper_clasificacion ON matriz_iper(clasificacion_riesgo);

COMMENT ON TABLE matriz_iper IS 'Matriz de Identificación de Peligros y Evaluación de Riesgos (IPER)';

-- ============================================
-- INSPECCIONES DE SEGURIDAD
-- ============================================

CREATE TABLE IF NOT EXISTS inspecciones_seguridad (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  sede_id UUID REFERENCES sedes_empresa(id),
  
  -- Identificación
  numero_inspeccion VARCHAR(50) UNIQUE,
  tipo_inspeccion VARCHAR(50) CHECK (tipo_inspeccion IN (
    'Programada', 'No Programada', 'Especial', 'Inicial', 'Periódica'
  )),
  area_inspeccionada VARCHAR(255),
  responsable_inspeccion VARCHAR(255),
  inspector_id UUID REFERENCES auth.users(id),
  
  -- Fechas
  fecha_inspeccion DATE NOT NULL,
  hora_inicio TIME,
  hora_fin TIME,
  
  -- Hallazgos
  hallazgos JSONB, -- Array de objetos: {tipo, descripcion, ubicacion, severidad, estado}
  total_hallazgos INTEGER DEFAULT 0,
  hallazgos_criticos INTEGER DEFAULT 0,
  hallazgos_importantes INTEGER DEFAULT 0,
  hallazgos_menores INTEGER DEFAULT 0,
  
  -- Acciones correctivas
  acciones_correctivas JSONB, -- Array de objetos: {descripcion, responsable, fecha_limite, estado}
  fecha_limite_correccion DATE,
  
  -- Estado
  estado VARCHAR(20) DEFAULT 'Pendiente' CHECK (estado IN (
    'Pendiente', 'En Proceso', 'Completada', 'Cerrada'
  )),
  
  -- Observaciones
  observaciones TEXT,
  recomendaciones TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspecciones_empresa ON inspecciones_seguridad(empresa_id);
CREATE INDEX IF NOT EXISTS idx_inspecciones_fecha ON inspecciones_seguridad(fecha_inspeccion DESC);
CREATE INDEX IF NOT EXISTS idx_inspecciones_estado ON inspecciones_seguridad(estado);

COMMENT ON TABLE inspecciones_seguridad IS 'Registro de inspecciones de seguridad y salud en el trabajo';

-- ============================================
-- INCIDENTES Y ACCIDENTES
-- ============================================

CREATE TABLE IF NOT EXISTS incidentes_accidentes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  sede_id UUID REFERENCES sedes_empresa(id),
  
  -- Identificación
  numero_incidente VARCHAR(50) UNIQUE,
  tipo_evento VARCHAR(50) NOT NULL CHECK (tipo_evento IN (
    'Accidente de Trabajo', 'Accidente de Trayecto', 
    'Enfermedad Ocupacional', 'Incidente', 'Cuasi Accidente',
    'Accidente Fatal', 'Accidente Grave', 'Accidente Leve'
  )),
  
  -- Fecha y hora
  fecha_evento DATE NOT NULL,
  hora_evento TIME,
  
  -- Ubicación
  area_lugar VARCHAR(255),
  ubicacion_especifica TEXT,
  
  -- Trabajador(es) afectado(s)
  trabajador_principal_id UUID REFERENCES trabajadores(id),
  trabajadores_afectados JSONB, -- Array de IDs de trabajadores
  
  -- Descripción
  descripcion_hechos TEXT NOT NULL,
  causas_inmediatas TEXT,
  causas_basicas TEXT,
  consecuencias TEXT,
  
  -- Clasificación
  severidad VARCHAR(20) CHECK (severidad IN (
    'Leve', 'Moderado', 'Grave', 'Fatal'
  )),
  dias_perdidos INTEGER DEFAULT 0,
  dias_cargados INTEGER DEFAULT 0,
  
  -- Investigación
  investigado BOOLEAN DEFAULT FALSE,
  fecha_investigacion DATE,
  investigador_id UUID REFERENCES auth.users(id),
  conclusiones TEXT,
  
  -- Medidas correctivas
  medidas_correctivas JSONB, -- Array de objetos: {descripcion, responsable, fecha_limite, estado}
  medidas_preventivas TEXT,
  
  -- Reportes
  reportado_autoridad BOOLEAN DEFAULT FALSE,
  fecha_reporte_autoridad DATE,
  numero_reporte_autoridad VARCHAR(100),
  
  -- Estado
  estado VARCHAR(20) DEFAULT 'Reportado' CHECK (estado IN (
    'Reportado', 'En Investigación', 'Investigado', 'Cerrado'
  )),
  
  -- Archivos
  archivos_adjuntos TEXT[], -- URLs de archivos en storage
  
  observaciones TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidentes_empresa ON incidentes_accidentes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_incidentes_tipo ON incidentes_accidentes(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_incidentes_fecha ON incidentes_accidentes(fecha_evento DESC);
CREATE INDEX IF NOT EXISTS idx_incidentes_trabajador ON incidentes_accidentes(trabajador_principal_id);
CREATE INDEX IF NOT EXISTS idx_incidentes_estado ON incidentes_accidentes(estado);

COMMENT ON TABLE incidentes_accidentes IS 'Registro de incidentes y accidentes de trabajo según normativa peruana';

-- ============================================
-- CAPACITACIONES
-- ============================================

CREATE TABLE IF NOT EXISTS capacitaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  sede_id UUID REFERENCES sedes_empresa(id),
  
  -- Identificación
  codigo_capacitacion VARCHAR(50),
  nombre_capacitacion VARCHAR(255) NOT NULL,
  tipo_capacitacion VARCHAR(50) CHECK (tipo_capacitacion IN (
    'Inducción', 'Capacitación Inicial', 'Capacitación Periódica',
    'Capacitación Específica', 'Reforzamiento', 'Actualización'
  )),
  tema VARCHAR(255),
  area_tematica VARCHAR(100),
  
  -- Fechas
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  duracion_horas DECIMAL(5,2),
  
  -- Instructor
  instructor VARCHAR(255),
  instructor_externo BOOLEAN DEFAULT FALSE,
  institucion VARCHAR(255),
  
  -- Participantes
  trabajadores_participantes JSONB, -- Array de IDs de trabajadores
  total_participantes INTEGER DEFAULT 0,
  
  -- Evaluación
  tiene_evaluacion BOOLEAN DEFAULT FALSE,
  tipo_evaluacion VARCHAR(50),
  calificacion_minima DECIMAL(5,2),
  
  -- Resultados
  resultados JSONB, -- Array de objetos: {trabajador_id, calificacion, aprobado}
  total_aprobados INTEGER DEFAULT 0,
  total_desaprobados INTEGER DEFAULT 0,
  
  -- Certificación
  emite_certificado BOOLEAN DEFAULT FALSE,
  certificados_emitidos INTEGER DEFAULT 0,
  
  -- Archivos
  material_didactico TEXT[], -- URLs de archivos
  certificados TEXT[], -- URLs de certificados
  
  -- Estado
  estado VARCHAR(20) DEFAULT 'Programada' CHECK (estado IN (
    'Programada', 'En Curso', 'Completada', 'Cancelada'
  )),
  
  observaciones TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capacitaciones_empresa ON capacitaciones(empresa_id);
CREATE INDEX IF NOT EXISTS idx_capacitaciones_fecha ON capacitaciones(fecha_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_capacitaciones_tipo ON capacitaciones(tipo_capacitacion);
CREATE INDEX IF NOT EXISTS idx_capacitaciones_estado ON capacitaciones(estado);

COMMENT ON TABLE capacitaciones IS 'Registro de capacitaciones en seguridad y salud en el trabajo';

-- ============================================
-- REGISTRO DE CAPACITACIONES POR TRABAJADOR
-- ============================================

CREATE TABLE IF NOT EXISTS trabajadores_capacitaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trabajador_id UUID REFERENCES trabajadores(id) ON DELETE CASCADE,
  capacitacion_id UUID REFERENCES capacitaciones(id) ON DELETE CASCADE,
  
  -- Asistencia
  asistio BOOLEAN DEFAULT FALSE,
  horas_asistidas DECIMAL(5,2),
  
  -- Evaluación
  calificacion DECIMAL(5,2),
  aprobado BOOLEAN,
  observaciones_evaluacion TEXT,
  
  -- Certificación
  certificado_emitido BOOLEAN DEFAULT FALSE,
  fecha_emision_certificado DATE,
  url_certificado TEXT,
  fecha_vencimiento_certificado DATE,
  
  -- Estado
  estado VARCHAR(20) DEFAULT 'Inscrito' CHECK (estado IN (
    'Inscrito', 'Asistió', 'Aprobado', 'Desaprobado', 'Certificado'
  )),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(trabajador_id, capacitacion_id)
);

CREATE INDEX IF NOT EXISTS idx_trab_cap_trabajador ON trabajadores_capacitaciones(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_trab_cap_capacitacion ON trabajadores_capacitaciones(capacitacion_id);
CREATE INDEX IF NOT EXISTS idx_trab_cap_aprobado ON trabajadores_capacitaciones(aprobado);

COMMENT ON TABLE trabajadores_capacitaciones IS 'Relación trabajadores-capacitaciones con resultados';

-- ============================================
-- EQUIPOS DE PROTECCIÓN PERSONAL (EPP)
-- ============================================

CREATE TABLE IF NOT EXISTS catalogo_epp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nombre_epp VARCHAR(255) NOT NULL,
  categoria VARCHAR(50) CHECK (categoria IN (
    'Protección Cabeza', 'Protección Ojos', 'Protección Auditiva',
    'Protección Respiratoria', 'Protección Manos', 'Protección Pies',
    'Protección Corporal', 'Protección Altura', 'Otros'
  )),
  descripcion TEXT,
  normativa_aplicable TEXT,
  vida_util_meses INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_epp_categoria ON catalogo_epp(categoria);
CREATE INDEX IF NOT EXISTS idx_epp_codigo ON catalogo_epp(codigo);

-- Insertar EPP comunes
INSERT INTO catalogo_epp (codigo, nombre_epp, categoria, descripcion) VALUES
('EPP-001', 'Casco de Seguridad', 'Protección Cabeza', 'Casco clase A, B o C según normativa'),
('EPP-002', 'Lentes de Seguridad', 'Protección Ojos', 'Lentes con protección UV y anti-impacto'),
('EPP-003', 'Protectores Auditivos', 'Protección Auditiva', 'Tapones o orejeras'),
('EPP-004', 'Respirador', 'Protección Respiratoria', 'Mascarilla N95, P100 o respirador completo'),
('EPP-005', 'Guantes de Seguridad', 'Protección Manos', 'Según tipo de riesgo'),
('EPP-006', 'Calzado de Seguridad', 'Protección Pies', 'Calzado con puntera de acero'),
('EPP-007', 'Chaleco Reflectante', 'Protección Corporal', 'Chaleco de alta visibilidad'),
('EPP-008', 'Arnés de Seguridad', 'Protección Altura', 'Arnés para trabajo en altura')
ON CONFLICT (codigo) DO NOTHING;

CREATE TABLE IF NOT EXISTS epp_asignados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trabajador_id UUID REFERENCES trabajadores(id) ON DELETE CASCADE,
  epp_id UUID REFERENCES catalogo_epp(id),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  
  -- Asignación
  fecha_asignacion DATE NOT NULL,
  fecha_vencimiento DATE,
  cantidad INTEGER DEFAULT 1,
  
  -- Estado
  estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN (
    'Activo', 'Vencido', 'Dañado', 'Perdido', 'Reemplazado'
  )),
  
  -- Entrega
  entregado_por VARCHAR(255),
  recibido_por VARCHAR(255),
  
  -- Devolución
  fecha_devolucion DATE,
  motivo_devolucion TEXT,
  
  -- Observaciones
  observaciones TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_epp_asignados_trabajador ON epp_asignados(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_epp_asignados_epp ON epp_asignados(epp_id);
CREATE INDEX IF NOT EXISTS idx_epp_asignados_estado ON epp_asignados(estado);
CREATE INDEX IF NOT EXISTS idx_epp_asignados_vencimiento ON epp_asignados(fecha_vencimiento);

COMMENT ON TABLE epp_asignados IS 'Registro de EPP asignados a trabajadores';

-- ============================================
-- PLAN DE EMERGENCIA
-- ============================================

CREATE TABLE IF NOT EXISTS planes_emergencia (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  sede_id UUID REFERENCES sedes_empresa(id),
  
  -- Identificación
  nombre_plan VARCHAR(255) NOT NULL,
  tipo_emergencia VARCHAR(50) CHECK (tipo_emergencia IN (
    'Incendio', 'Sismo', 'Inundación', 'Derrame Químico',
    'Fuga de Gas', 'Evacuación', 'Primeros Auxilios', 'General'
  )),
  version VARCHAR(20),
  
  -- Contenido
  objetivo TEXT,
  alcance TEXT,
  procedimientos TEXT,
  recursos_necesarios TEXT[],
  
  -- Brigadas
  brigadas JSONB, -- Array de objetos: {nombre, tipo, miembros, responsable}
  
  -- Equipos y recursos
  equipos_emergencia TEXT[],
  rutas_evacuacion TEXT,
  puntos_reunion TEXT[],
  
  -- Contactos de emergencia
  contactos_emergencia JSONB, -- Array de objetos: {tipo, nombre, telefono}
  
  -- Fechas
  fecha_elaboracion DATE,
  fecha_aprobacion DATE,
  fecha_revision DATE,
  fecha_proxima_revision DATE,
  
  -- Estado
  estado VARCHAR(20) DEFAULT 'Borrador' CHECK (estado IN (
    'Borrador', 'En Revisión', 'Aprobado', 'Vigente', 'Obsoleto'
  )),
  
  -- Archivos
  archivo_plan TEXT, -- URL del documento
  anexos TEXT[], -- URLs de anexos
  
  observaciones TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planes_empresa ON planes_emergencia(empresa_id);
CREATE INDEX IF NOT EXISTS idx_planes_tipo ON planes_emergencia(tipo_emergencia);
CREATE INDEX IF NOT EXISTS idx_planes_estado ON planes_emergencia(estado);

COMMENT ON TABLE planes_emergencia IS 'Planes de emergencia y evacuación';

-- ============================================
-- SIMULACROS
-- ============================================

CREATE TABLE IF NOT EXISTS simulacros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  sede_id UUID REFERENCES sedes_empresa(id),
  plan_emergencia_id UUID REFERENCES planes_emergencia(id),
  
  -- Identificación
  numero_simulacro VARCHAR(50),
  tipo_simulacro VARCHAR(50) CHECK (tipo_simulacro IN (
    'Evacuación', 'Incendio', 'Sismo', 'Derrame', 'General'
  )),
  
  -- Fechas
  fecha_simulacro DATE NOT NULL,
  hora_inicio TIME,
  hora_fin TIME,
  duracion_minutos INTEGER,
  
  -- Participantes
  total_participantes INTEGER DEFAULT 0,
  trabajadores_participantes JSONB, -- Array de IDs
  
  -- Resultados
  tiempo_evacuacion_minutos INTEGER,
  puntos_reunion_utilizados TEXT[],
  observaciones_simulacro TEXT,
  
  -- Evaluación
  cumplio_objetivos BOOLEAN,
  tiempo_objetivo_minutos INTEGER,
  desviaciones TEXT,
  
  -- Hallazgos
  hallazgos JSONB, -- Array de objetos: {tipo, descripcion, severidad}
  mejoras_sugeridas TEXT,
  
  -- Estado
  estado VARCHAR(20) DEFAULT 'Programado' CHECK (estado IN (
    'Programado', 'En Ejecución', 'Completado', 'Cancelado'
  )),
  
  -- Archivos
  reporte_simulacro TEXT, -- URL del reporte
  evidencias TEXT[], -- URLs de fotos/videos
  
  observaciones TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simulacros_empresa ON simulacros(empresa_id);
CREATE INDEX IF NOT EXISTS idx_simulacros_fecha ON simulacros(fecha_simulacro DESC);
CREATE INDEX IF NOT EXISTS idx_simulacros_tipo ON simulacros(tipo_simulacro);

COMMENT ON TABLE simulacros IS 'Registro de simulacros de emergencia realizados';

-- ============================================
-- COMITÉ DE SST
-- ============================================

CREATE TABLE IF NOT EXISTS comite_sst (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  sede_id UUID REFERENCES sedes_empresa(id),
  
  -- Identificación
  nombre_comite VARCHAR(255) NOT NULL,
  tipo_comite VARCHAR(50) CHECK (tipo_comite IN (
    'Comité de SST', 'Comité Paritario', 'Supervisor de SST'
  )),
  
  -- Período
  periodo_inicio DATE NOT NULL,
  periodo_fin DATE,
  activo BOOLEAN DEFAULT TRUE,
  
  -- Miembros
  miembros JSONB NOT NULL, -- Array de objetos: {trabajador_id, cargo, tipo (empleador/trabajador)}
  presidente_id UUID REFERENCES trabajadores(id),
  secretario_id UUID REFERENCES trabajadores(id),
  
  -- Reuniones
  frecuencia_reuniones VARCHAR(50),
  proxima_reunion DATE,
  
  -- Estado
  estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN (
    'Activo', 'Inactivo', 'Disuelto'
  )),
  
  observaciones TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comite_empresa ON comite_sst(empresa_id);
CREATE INDEX IF NOT EXISTS idx_comite_activo ON comite_sst(activo);

COMMENT ON TABLE comite_sst IS 'Comités de Seguridad y Salud en el Trabajo';

-- ============================================
-- ACTAS DE REUNIÓN COMITÉ SST
-- ============================================

CREATE TABLE IF NOT EXISTS actas_comite_sst (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comite_id UUID REFERENCES comite_sst(id) ON DELETE CASCADE,
  
  -- Identificación
  numero_acta VARCHAR(50),
  fecha_reunion DATE NOT NULL,
  hora_inicio TIME,
  hora_fin TIME,
  
  -- Asistencia
  miembros_presentes JSONB, -- Array de IDs de trabajadores
  miembros_ausentes JSONB,
  total_presentes INTEGER DEFAULT 0,
  quorum BOOLEAN,
  
  -- Agenda
  puntos_agenda JSONB, -- Array de objetos: {numero, tema, responsable, tiempo}
  
  -- Acuerdos
  acuerdos JSONB, -- Array de objetos: {numero, descripcion, responsable, fecha_limite, estado}
  total_acuerdos INTEGER DEFAULT 0,
  
  -- Temas tratados
  temas_tratados TEXT,
  observaciones_reunion TEXT,
  
  -- Archivos
  archivo_acta TEXT, -- URL del documento
  anexos TEXT[],
  
  -- Estado
  estado VARCHAR(20) DEFAULT 'Borrador' CHECK (estado IN (
    'Borrador', 'Aprobada', 'Publicada'
  )),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_actas_comite ON actas_comite_sst(comite_id);
CREATE INDEX IF NOT EXISTS idx_actas_fecha ON actas_comite_sst(fecha_reunion DESC);

COMMENT ON TABLE actas_comite_sst IS 'Actas de reunión del Comité de SST';

-- ============================================
-- TRIGGERS PARA updated_at
-- ============================================

-- Función para actualizar updated_at (si no existe)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para todas las nuevas tablas
CREATE TRIGGER update_sedes_updated_at
  BEFORE UPDATE ON sedes_empresa
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trabajadores_updated_at
  BEFORE UPDATE ON trabajadores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_iper_updated_at
  BEFORE UPDATE ON matriz_iper
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspecciones_updated_at
  BEFORE UPDATE ON inspecciones_seguridad
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidentes_updated_at
  BEFORE UPDATE ON incidentes_accidentes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_capacitaciones_updated_at
  BEFORE UPDATE ON capacitaciones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trab_cap_updated_at
  BEFORE UPDATE ON trabajadores_capacitaciones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_epp_asignados_updated_at
  BEFORE UPDATE ON epp_asignados
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_planes_updated_at
  BEFORE UPDATE ON planes_emergencia
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_simulacros_updated_at
  BEFORE UPDATE ON simulacros
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comite_updated_at
  BEFORE UPDATE ON comite_sst
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_actas_updated_at
  BEFORE UPDATE ON actas_comite_sst
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las nuevas tablas
ALTER TABLE sedes_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE trabajadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_peligros ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_riesgos ENABLE ROW LEVEL SECURITY;
ALTER TABLE matriz_iper ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspecciones_seguridad ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidentes_accidentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacitaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE trabajadores_capacitaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_epp ENABLE ROW LEVEL SECURITY;
ALTER TABLE epp_asignados ENABLE ROW LEVEL SECURITY;
ALTER TABLE planes_emergencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulacros ENABLE ROW LEVEL SECURITY;
ALTER TABLE comite_sst ENABLE ROW LEVEL SECURITY;
ALTER TABLE actas_comite_sst ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Usuarios solo ven datos de sus empresas
-- (Patrón similar al usado en empresas y user_empresas)

-- Sedes
CREATE POLICY "Users can view their company sedes"
  ON sedes_empresa FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their company sedes"
  ON sedes_empresa FOR ALL
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Trabajadores
CREATE POLICY "Users can view their company workers"
  ON trabajadores FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their company workers"
  ON trabajadores FOR ALL
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Catálogos (lectura pública, escritura restringida)
CREATE POLICY "Anyone can view catalogo_peligros"
  ON catalogo_peligros FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view catalogo_riesgos"
  ON catalogo_riesgos FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view catalogo_epp"
  ON catalogo_epp FOR SELECT
  USING (true);

-- Matriz IPER
CREATE POLICY "Users can view their company IPER"
  ON matriz_iper FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their company IPER"
  ON matriz_iper FOR ALL
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Inspecciones
CREATE POLICY "Users can view their company inspections"
  ON inspecciones_seguridad FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their company inspections"
  ON inspecciones_seguridad FOR ALL
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Incidentes y Accidentes
CREATE POLICY "Users can view their company incidents"
  ON incidentes_accidentes FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their company incidents"
  ON incidentes_accidentes FOR ALL
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Capacitaciones
CREATE POLICY "Users can view their company trainings"
  ON capacitaciones FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their company trainings"
  ON capacitaciones FOR ALL
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Trabajadores-Capacitaciones
CREATE POLICY "Users can view their company worker trainings"
  ON trabajadores_capacitaciones FOR SELECT
  USING (
    trabajador_id IN (
      SELECT id 
      FROM trabajadores 
      WHERE empresa_id IN (
        SELECT empresa_id 
        FROM user_empresas 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage their company worker trainings"
  ON trabajadores_capacitaciones FOR ALL
  USING (
    trabajador_id IN (
      SELECT id 
      FROM trabajadores 
      WHERE empresa_id IN (
        SELECT empresa_id 
        FROM user_empresas 
        WHERE user_id = auth.uid()
      )
    )
  );

-- EPP Asignados
CREATE POLICY "Users can view their company EPP"
  ON epp_asignados FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their company EPP"
  ON epp_asignados FOR ALL
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Planes de Emergencia
CREATE POLICY "Users can view their company emergency plans"
  ON planes_emergencia FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their company emergency plans"
  ON planes_emergencia FOR ALL
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Simulacros
CREATE POLICY "Users can view their company drills"
  ON simulacros FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their company drills"
  ON simulacros FOR ALL
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Comité SST
CREATE POLICY "Users can view their company committees"
  ON comite_sst FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their company committees"
  ON comite_sst FOR ALL
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Actas Comité
CREATE POLICY "Users can view their company meeting minutes"
  ON actas_comite_sst FOR SELECT
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

CREATE POLICY "Users can manage their company meeting minutes"
  ON actas_comite_sst FOR ALL
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

-- ============================================
-- COMENTARIOS FINALES
-- ============================================

COMMENT ON SCHEMA public IS 'SERVYSALUD360 - Sistema de Gestión de Salud Ocupacional con módulos SST expandidos';

-- ============================================
-- RESUMEN DE TABLAS CREADAS
-- ============================================

-- Nuevas tablas principales:
-- 1. sedes_empresa - Sedes/centros de trabajo
-- 2. trabajadores - Tabla extendida de trabajadores
-- 3. catalogo_peligros - Catálogo de peligros
-- 4. catalogo_riesgos - Catálogo de riesgos
-- 5. matriz_iper - Matriz IPER
-- 6. inspecciones_seguridad - Inspecciones de seguridad
-- 7. incidentes_accidentes - Incidentes y accidentes
-- 8. capacitaciones - Capacitaciones
-- 9. trabajadores_capacitaciones - Relación trabajadores-capacitaciones
-- 10. catalogo_epp - Catálogo de EPP
-- 11. epp_asignados - EPP asignados a trabajadores
-- 12. planes_emergencia - Planes de emergencia
-- 13. simulacros - Simulacros de emergencia
-- 14. comite_sst - Comités de SST
-- 15. actas_comite_sst - Actas de reunión

-- Tablas existentes actualizadas (solo columnas nuevas):
-- - empresas (columnas SST agregadas)
-- - registros_trabajadores (columnas de compatibilidad)

-- Total: 15 nuevas tablas + 2 tablas actualizadas
-- Todas con RLS habilitado y políticas configuradas
-- Todas con triggers para updated_at
-- Todas con índices optimizados

