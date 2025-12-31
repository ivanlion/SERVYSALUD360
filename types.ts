
export enum EventType {
  ACCIDENTE_TRABAJO = 'Accidente de Trabajo',
  ENFERMEDAD_OCUPACIONAL = 'Enfermedad Ocupacional',
  ACCIDENTE_COMUN = 'Accidente Común',
  ENFERMEDAD_COMUN = 'Enfermedad Común',
  OTROS = 'Otros'
}

export interface AssessmentItem {
  value: string; // 'N', 'O', 'F', 'C' for most; 'APTO'/'NO APTO' for IV
  detail: string; // Observations, Weight, etc.
}

export interface DiagnosisItem {
  descripcion: string;
  cie10: string;
}

export type JobDemandLevel = 'BAJO' | 'MEDIO' | 'ALTO' | 'MUY_ALTO' | '';

export type CapacityLevel = 
  | 'SIN_DIFICULTAD' 
  | 'DIFICULTAD_NO_SIGNIFICATIVA' 
  | 'DIFICULTAD_LEVE' 
  | 'DIFICULTAD_MODERADA' 
  | 'DIFICULTAD_SEVERA' 
  | 'SIN_CAPACIDAD' 
  | '';

export interface PhysicalAssessment {
  // --- SECCIÓN: MATRIZ DE REQUERIMIENTOS DEL PUESTO ---
  memoriaVisual: JobDemandLevel;
  semejanzasDiferencias: JobDemandLevel;
  orientacionEspacial: JobDemandLevel;
  conocimientoNumerico: JobDemandLevel;
  aprendizajeTareas: JobDemandLevel;
  lenguajeExpresivo: JobDemandLevel;
  conocimientoEscritura: JobDemandLevel;
  lenguajeComprensivo: JobDemandLevel;
  conocimientoLectura: JobDemandLevel;

  responsabilidadAutonomia: JobDemandLevel;
  repetitividad: JobDemandLevel;
  atencion: JobDemandLevel;
  ritmo: JobDemandLevel;
  organizacion: JobDemandLevel;
  relacionesTrabajo: JobDemandLevel;
  seguridadMental: JobDemandLevel;

  manipulacionManualCarga: JobDemandLevel;
  coordinacionManipulativa: JobDemandLevel;
  cargaPosturalRepetitivo: JobDemandLevel;
  trabajoPrecision: JobDemandLevel;
  sedestacionMantenida: JobDemandLevel;
  bipedestacionMantenida: JobDemandLevel;
  marchaTerrenoIrregular: JobDemandLevel;
  campoVisual: JobDemandLevel;
  agudezaVisual: JobDemandLevel;
  requerimientoAuditivo: JobDemandLevel;
  requerimientoFonatorio: JobDemandLevel;
  requerimientoOlfatoGusto: JobDemandLevel;
  sensibilidadSuperficialProfunda: JobDemandLevel;

  controlEmocional: JobDemandLevel;
  relacionesPsicosociales: JobDemandLevel;

  ambienteTermico: JobDemandLevel;
  ambienteSonoro: JobDemandLevel;
  condicionesLuminicas: JobDemandLevel;
  higieneOcupacional: JobDemandLevel;

  // --- NUEVA SECCIÓN: MATRIZ DE CAPACIDADES DEL PUESTO (cap_ prefix) ---
  cap_memoriaVisual: CapacityLevel;
  cap_semejanzasDiferencias: CapacityLevel;
  cap_orientacionEspacial: CapacityLevel;
  cap_conocimientoNumerico: CapacityLevel;
  cap_aprendizajeTareas: CapacityLevel;
  cap_lenguajeExpresivo: CapacityLevel;
  cap_conocimientoEscritura: CapacityLevel;
  cap_lenguajeComprensivo: CapacityLevel;
  cap_conocimientoLectura: CapacityLevel;

  cap_responsabilidadAutonomia: CapacityLevel;
  cap_repetitividad: CapacityLevel;
  cap_atencion: CapacityLevel;
  cap_ritmo: CapacityLevel;
  cap_organizacion: CapacityLevel;
  cap_relacionesTrabajo: CapacityLevel;
  cap_seguridadMental: CapacityLevel;

  cap_manipulacionManualCarga: CapacityLevel;
  cap_coordinacionManipulativa: CapacityLevel;
  cap_cargaPosturalRepetitivo: CapacityLevel;
  cap_trabajoPrecision: CapacityLevel;
  cap_sedestacionMantenida: CapacityLevel;
  cap_bipedestacionMantenida: CapacityLevel;
  cap_marchaTerrenoIrregular: CapacityLevel;
  cap_campoVisual: CapacityLevel;
  cap_agudezaVisual: CapacityLevel;
  cap_requerimientoAuditivo: CapacityLevel;
  cap_requerimientoFonatorio: CapacityLevel;
  cap_requerimientoOlfatoGusto: CapacityLevel;
  cap_sensibilidadSuperficialProfunda: CapacityLevel;

  cap_controlEmocional: CapacityLevel;
  cap_relacionesPsicosociales: CapacityLevel;

  cap_ambienteTermico: CapacityLevel;
  cap_ambienteSonoro: CapacityLevel;
  cap_condicionesLuminicas: CapacityLevel;
  cap_higieneOcupacional: CapacityLevel;

  // I. LOCOMOCIÓN Y POSTURA
  deambulacion: AssessmentItem;
  terrenoIrregular: AssessmentItem;
  escalerasFijas: AssessmentItem;
  escalasVerticales: AssessmentItem;
  bipedestacion: AssessmentItem;
  sedestacion: AssessmentItem;
  arrodillarse: AssessmentItem;

  // II. MANIPULACIÓN DE CARGAS
  levantamientoSuelo: AssessmentItem;
  levantamientoCintura: AssessmentItem;
  transporteCarga: AssessmentItem;
  empujeTraccion: AssessmentItem;

  // III. MIEMBROS SUPERIORES
  hombro: AssessmentItem;
  alcanceFrontal: AssessmentItem;
  agarreFuerza: AssessmentItem;
  motricidadFina: AssessmentItem;

  // IV. SEGURIDAD, ALERTA Y ENTORNO
  vehiculosLivianos: AssessmentItem;
  maquinariaPesada: AssessmentItem;
  trabajosAltura: AssessmentItem;
  vibracion: AssessmentItem;
  turnoNocturno: AssessmentItem;

  // Pharmacological Alert
  alertaFarmacologica: 'SIN_EFECTO' | 'CON_EFECTO' | '';
  
  // Global Laterality for Section III
  lateralidad: 'Derecha' | 'Izquierda' | 'Bilateral' | 'Ninguno' | '';

  // Common fields
  diagnosticos: DiagnosisItem[]; 
  indicacionInicio: string;
  indicacionDuracion: string;
  medicoNombre: string;
}

export interface Reevaluation {
  id: string; // Unique ID for React keys
  fecha: string;
  tipo: 'CONTINUACION' | 'ALTA' | '';
  diasAdicionales: number;
  totalDias: number;
  comentarios: string;
  // New fields for Specialty
  esEspecialidad: boolean;
  nombreEspecialista?: string;
}

export interface CaseData {
  id: string;
  status: 'ACTIVO' | 'CERRADO';
  createdAt: string;
  
  // Header
  fecha: string;
  trabajadorNombre: string;
  dni: string;
  sexo: 'Masculino' | 'Femenino' | ''; // Nuevo campo
  jornadaLaboral: string; // Nuevo campo
  puesto: string;
  telfContacto: string;
  empresa: string;
  gerencia: string;
  supervisor: string;
  supervisorTelf: string;
  tipoEvento: EventType;

  // Section A
  assessment: PhysicalAssessment;
  
  // Section A (Copy - Step 2.1)
  assessment2: PhysicalAssessment;

  // Section B & C
  tareasRealizar: string;
  areaLugar: string;
  tareasPrincipales: string;
  comentariosSupervisor: string;
  
  // Section D & E (Dynamic)
  reevaluaciones: Reevaluation[];
}

// Default items for pre-filling
const DEFAULT_FREQUENCY_ITEM: AssessmentItem = { value: 'C', detail: '' }; 
const DEFAULT_SAFETY_ITEM: AssessmentItem = { value: 'NO APLICA', detail: '' }; 

export const INITIAL_ASSESSMENT: PhysicalAssessment = {
  // Job Demands Matrix defaults
  memoriaVisual: '',
  semejanzasDiferencias: '',
  orientacionEspacial: '',
  conocimientoNumerico: '',
  aprendizajeTareas: '',
  lenguajeExpresivo: '',
  conocimientoEscritura: '',
  lenguajeComprensivo: '',
  conocimientoLectura: '',
  responsabilidadAutonomia: '',
  repetitividad: '',
  atencion: '',
  ritmo: '',
  organizacion: '',
  relacionesTrabajo: '',
  seguridadMental: '',
  manipulacionManualCarga: '',
  coordinacionManipulativa: '',
  cargaPosturalRepetitivo: '',
  trabajoPrecision: '',
  sedestacionMantenida: '',
  bipedestacionMantenida: '',
  marchaTerrenoIrregular: '',
  campoVisual: '',
  agudezaVisual: '',
  requerimientoAuditivo: '',
  requerimientoFonatorio: '',
  requerimientoOlfatoGusto: '',
  sensibilidadSuperficialProfunda: '',
  controlEmocional: '',
  relacionesPsicosociales: '',
  ambienteTermico: '',
  ambienteSonoro: '',
  condicionesLuminicas: '',
  higieneOcupacional: '',

  // Job Capacities Matrix defaults (New) - Set to SIN_DIFICULTAD by default
  cap_memoriaVisual: 'SIN_DIFICULTAD',
  cap_semejanzasDiferencias: 'SIN_DIFICULTAD',
  cap_orientacionEspacial: 'SIN_DIFICULTAD',
  cap_conocimientoNumerico: 'SIN_DIFICULTAD',
  cap_aprendizajeTareas: 'SIN_DIFICULTAD',
  cap_lenguajeExpresivo: 'SIN_DIFICULTAD',
  cap_conocimientoEscritura: 'SIN_DIFICULTAD',
  cap_lenguajeComprensivo: 'SIN_DIFICULTAD',
  cap_conocimientoLectura: 'SIN_DIFICULTAD',
  cap_responsabilidadAutonomia: 'SIN_DIFICULTAD',
  cap_repetitividad: 'SIN_DIFICULTAD',
  cap_atencion: 'SIN_DIFICULTAD',
  cap_ritmo: 'SIN_DIFICULTAD',
  cap_organizacion: 'SIN_DIFICULTAD',
  cap_relacionesTrabajo: 'SIN_DIFICULTAD',
  cap_seguridadMental: 'SIN_DIFICULTAD',
  cap_manipulacionManualCarga: 'SIN_DIFICULTAD',
  cap_coordinacionManipulativa: 'SIN_DIFICULTAD',
  cap_cargaPosturalRepetitivo: 'SIN_DIFICULTAD',
  cap_trabajoPrecision: 'SIN_DIFICULTAD',
  cap_sedestacionMantenida: 'SIN_DIFICULTAD',
  cap_bipedestacionMantenida: 'SIN_DIFICULTAD',
  cap_marchaTerrenoIrregular: 'SIN_DIFICULTAD',
  cap_campoVisual: 'SIN_DIFICULTAD',
  cap_agudezaVisual: 'SIN_DIFICULTAD',
  cap_requerimientoAuditivo: 'SIN_DIFICULTAD',
  cap_requerimientoFonatorio: 'SIN_DIFICULTAD',
  cap_requerimientoOlfatoGusto: 'SIN_DIFICULTAD',
  cap_sensibilidadSuperficialProfunda: 'SIN_DIFICULTAD',
  cap_controlEmocional: 'SIN_DIFICULTAD',
  cap_relacionesPsicosociales: 'SIN_DIFICULTAD',
  cap_ambienteTermico: 'SIN_DIFICULTAD',
  cap_ambienteSonoro: 'SIN_DIFICULTAD',
  cap_condicionesLuminicas: 'SIN_DIFICULTAD',
  cap_higieneOcupacional: 'SIN_DIFICULTAD',

  // Table I - Default C
  deambulacion: { ...DEFAULT_FREQUENCY_ITEM },
  terrenoIrregular: { ...DEFAULT_FREQUENCY_ITEM },
  escalerasFijas: { ...DEFAULT_FREQUENCY_ITEM },
  escalasVerticales: { ...DEFAULT_FREQUENCY_ITEM },
  bipedestacion: { ...DEFAULT_FREQUENCY_ITEM },
  sedestacion: { ...DEFAULT_FREQUENCY_ITEM },
  arrodillarse: { ...DEFAULT_FREQUENCY_ITEM },
  
  // Table II - Default C
  levantamientoSuelo: { ...DEFAULT_FREQUENCY_ITEM },
  levantamientoCintura: { ...DEFAULT_FREQUENCY_ITEM },
  transporteCarga: { ...DEFAULT_FREQUENCY_ITEM },
  empujeTraccion: { ...DEFAULT_FREQUENCY_ITEM },
  
  // Table III - Default C
  hombro: { ...DEFAULT_FREQUENCY_ITEM },
  alcanceFrontal: { ...DEFAULT_FREQUENCY_ITEM },
  agarreFuerza: { ...DEFAULT_FREQUENCY_ITEM },
  motricidadFina: { ...DEFAULT_FREQUENCY_ITEM },
  
  // Table IV - Default NO APLICA
  vehiculosLivianos: { ...DEFAULT_SAFETY_ITEM },
  maquinariaPesada: { ...DEFAULT_SAFETY_ITEM },
  trabajosAltura: { ...DEFAULT_SAFETY_ITEM },
  vibracion: { ...DEFAULT_SAFETY_ITEM },
  turnoNocturno: { ...DEFAULT_SAFETY_ITEM },

  alertaFarmacologica: 'SIN_EFECTO',
  lateralidad: 'Ninguno',

  diagnosticos: [{ descripcion: '', cie10: '' }], 
  indicacionInicio: new Date().toISOString().split('T')[0], 
  indicacionDuracion: '',
  medicoNombre: ''
};

export const createNewReevaluation = (isSpecialty = false): Reevaluation => ({
  id: Date.now().toString(),
  fecha: '',
  tipo: '' as any,
  diasAdicionales: 0,
  totalDias: 0,
  comentarios: '',
  esEspecialidad: isSpecialty,
  nombreEspecialista: ''
});

// Helper to deep clone assessment
const cloneAssessment = (src: PhysicalAssessment): PhysicalAssessment => {
    return {
        ...src,
        diagnosticos: src.diagnosticos.map(d => ({ ...d })),
        deambulacion: { ...src.deambulacion },
        terrenoIrregular: { ...src.terrenoIrregular },
        escalerasFijas: { ...src.escalerasFijas },
        escalasVerticales: { ...src.escalasVerticales },
        bipedestacion: { ...src.bipedestacion },
        sedestacion: { ...src.sedestacion },
        arrodillarse: { ...src.arrodillarse },
        levantamientoSuelo: { ...src.levantamientoSuelo },
        levantamientoCintura: { ...src.levantamientoCintura },
        transporteCarga: { ...src.transporteCarga },
        empujeTraccion: { ...src.empujeTraccion },
        hombro: { ...src.hombro },
        alcanceFrontal: { ...src.alcanceFrontal },
        agarreFuerza: { ...src.agarreFuerza },
        motricidadFina: { ...src.motricidadFina },
        vehiculosLivianos: { ...src.vehiculosLivianos },
        maquinariaPesada: { ...src.maquinariaPesada },
        trabajosAltura: { ...src.trabajosAltura },
        vibracion: { ...src.vibracion },
        turnoNocturno: { ...src.turnoNocturno },
    };
};

export const INITIAL_CASE: CaseData = {
  id: '',
  status: 'ACTIVO',
  createdAt: new Date().toISOString(),
  fecha: new Date().toISOString().split('T')[0],
  trabajadorNombre: '',
  dni: '',
  sexo: '',
  jornadaLaboral: '',
  puesto: '',
  telfContacto: '',
  empresa: '',
  gerencia: '',
  supervisor: '',
  supervisorTelf: '',
  tipoEvento: EventType.ACCIDENTE_TRABAJO,
  assessment: cloneAssessment(INITIAL_ASSESSMENT),
  assessment2: cloneAssessment(INITIAL_ASSESSMENT), 
  tareasRealizar: '',
  areaLugar: '',
  tareasPrincipales: '',
  comentariosSupervisor: '',
  reevaluaciones: []
};

// ============================================
// NUEVOS TIPOS - SISTEMA INTEGRAL DE SST
// ============================================

// Tipos base
export type NivelRiesgo = 'Bajo' | 'Medio' | 'Alto' | 'Muy Alto';
export type TipoDocumento = 'DNI' | 'CE' | 'Pasaporte';
export type EstadoLaboral = 'Activo' | 'Cesado' | 'Suspendido' | 'Licencia';
export type EstadoPlan = 'En elaboración' | 'Aprobado' | 'En ejecución' | 'Cerrado';
export type EstadoActividad = 'Pendiente' | 'En proceso' | 'Completada' | 'Cancelada';

// Sedes
export interface SedeEmpresa {
  id: string;
  empresa_id: string;
  nombre_sede: string;
  tipo_sede?: string;
  direccion?: string;
  distrito?: string;
  responsable_sede?: string;
  telefono?: string;
  estado: boolean;
  created_at: Date;
  updated_at: Date;
}

// Trabajadores
export interface Trabajador {
  id: string;
  empresa_id: string;
  sede_id?: string;
  
  tipo_documento: TipoDocumento;
  numero_documento: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombres: string;
  
  fecha_nacimiento?: Date;
  sexo?: 'Masculino' | 'Femenino';
  telefono_personal?: string;
  email_personal?: string;
  
  puesto_trabajo: string;
  area_trabajo?: string;
  fecha_ingreso?: Date;
  
  estado_laboral: EstadoLaboral;
  registro_trabajo_modificado_id?: string;
  
  created_at: Date;
  updated_at: Date;
}

// Helper para nombre completo
export const getNombreCompleto = (trabajador: Trabajador): string => {
  return `${trabajador.apellido_paterno} ${trabajador.apellido_materno} ${trabajador.nombres}`;
};

// Plan Anual SST
export interface PlanAnualSST {
  id: string;
  empresa_id: string;
  anio: number;
  objetivo_general?: string;
  presupuesto_total?: number;
  estado: EstadoPlan;
  created_at: Date;
  updated_at: Date;
}

export interface ActividadPlanSST {
  id: string;
  plan_id: string;
  nombre_actividad: string;
  mes_programado?: number;
  responsable?: string;
  estado: EstadoActividad;
  created_at: Date;
}

// Ausentismo
export type TipoAusentismo = 
  | 'Descanso médico'
  | 'Licencia con goce de haber'
  | 'Licencia sin goce de haber'
  | 'Permiso'
  | 'Vacaciones'
  | 'Accidente de trabajo'
  | 'Enfermedad ocupacional'
  | 'Maternidad'
  | 'Paternidad'
  | 'Otros';

export interface AusentismoLaboral {
  id: string;
  trabajador_id: string;
  empresa_id: string;
  tipo_ausentismo: TipoAusentismo;
  fecha_inicio: Date;
  fecha_fin?: Date;
  dias_ausencia?: number;
  motivo?: string;
  estado: 'Activo' | 'Finalizado';
  created_at: Date;
}

// Capacitaciones
export interface ProgramaCapacitacionSST {
  id: string;
  empresa_id: string;
  anio: number;
  objetivo_general?: string;
  estado: 'Vigente' | 'Cerrado';
  created_at: Date;
}

export interface CapacitacionSST {
  id: string;
  programa_id: string;
  empresa_id: string;
  nombre_curso: string;
  tipo_capacitacion?: string;
  fecha_programada?: Date;
  estado: 'Programada' | 'Ejecutada' | 'Cancelada';
  created_at: Date;
}

export interface AsistenciaCapacitacion {
  id: string;
  capacitacion_id: string;
  trabajador_id: string;
  asistio: boolean;
  aprobo: boolean;
  created_at: Date;
}

// Comité SST
export interface ComiteSST {
  id: string;
  empresa_id: string;
  nombre_comite: string;
  periodo_inicio: Date;
  periodo_fin: Date;
  estado: 'Activo' | 'Finalizado';
  created_at: Date;
}

export interface MiembroComiteSST {
  id: string;
  comite_id: string;
  trabajador_id: string;
  cargo_comite?: string;
  fecha_inicio: Date;
  estado: 'Activo' | 'Cesado';
  created_at: Date;
}

// Accidentes e Incidentes
export type TipoEvento = 
  | 'Accidente de trabajo'
  | 'Accidente leve'
  | 'Accidente incapacitante'
  | 'Accidente mortal'
  | 'Incidente peligroso'
  | 'Incidente';

export interface AccidenteIncidente {
  id: string;
  empresa_id: string;
  trabajador_id: string;
  tipo_evento: TipoEvento;
  fecha_ocurrencia: Date;
  descripcion_evento: string;
  estado: 'Reportado' | 'En investigación' | 'Cerrado';
  created_at: Date;
}

// Inspecciones
export interface InspeccionSST {
  id: string;
  empresa_id: string;
  tipo_inspeccion?: string;
  fecha_realizacion: Date;
  inspector_principal?: string;
  estado: 'Programada' | 'Completada';
  created_at: Date;
}

// Indicadores
export interface IndicadorSST {
  id: string;
  empresa_id: string;
  periodo: string; // YYYY-MM
  total_trabajadores?: number;
  numero_accidentes_trabajo: number;
  dias_perdidos_total: number;
  created_at: Date;
}

// Catálogo de Peligros
export interface CatalogoPeligro {
  id: string;
  codigo: string;
  tipo_peligro: string;
  nombre_peligro: string;
  descripcion?: string;
  created_at: Date;
}

// Tipos para formularios
export interface FormularioTrabajador {
  tipo_documento: TipoDocumento;
  numero_documento: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombres: string;
  fecha_nacimiento?: string;
  sexo?: 'Masculino' | 'Femenino';
  puesto_trabajo: string;
  area_trabajo?: string;
  fecha_ingreso?: string;
}

export interface FormularioAusentismo {
  trabajador_id: string;
  tipo_ausentismo: TipoAusentismo;
  fecha_inicio: string;
  fecha_fin?: string;
  motivo?: string;
}

export interface FormularioCapacitacion {
  nombre_curso: string;
  tipo_capacitacion?: string;
  fecha_programada: string;
}

export interface FormularioAccidente {
  trabajador_id: string;
  tipo_evento: TipoEvento;
  fecha_ocurrencia: string;
  descripcion_evento: string;
}


