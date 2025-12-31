/**
 * CaseForm - Formulario multi-paso para registro de trabajo modificado
 * 
 * Componente principal que gestiona el registro y edición de casos
 * con validación por pasos y guardado en Supabase
 * 
 * @component
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CaseData, INITIAL_CASE, PhysicalAssessment } from '../types';
import GeneralInfo from './sections/GeneralInfo';
import PhysicalAssessmentComponent from './sections/PhysicalAssessment';
import JobAnalysis from './sections/JobAnalysis';
import Reevaluation from './sections/Reevaluation';
import { useNotifications } from '../contexts/NotificationContext';
import { logger } from '../utils/logger';
import { supabase } from '../lib/supabase';
import { Check, ChevronRight, ChevronLeft, Save, AlertCircle, Circle, Lock, Edit3, Loader2 } from 'lucide-react';

interface CaseFormProps {
  initialData?: CaseData;
  onSave: (data: CaseData) => void;
  onCancel: () => void;
}

const STEPS = [
  { id: 1, label: 'Paso 1', title: 'Datos Generales' },
  { id: 2, label: 'Paso 2', title: 'Sec. A: Capacidad Funcional' },
  { id: 3, label: 'Paso 2.1', title: 'Sec. A: Capacidad Funcional (2.1)' },
  { id: 4, label: 'Paso 3', title: 'Sec. B & C: Puesto y Compromiso' },
  { id: 5, label: 'Paso 4', title: 'Sec. D & E: Seguimiento' }
];

type StepStatus = 'empty' | 'partial' | 'complete';

// Schema de validación Zod para el formulario
const assessmentItemSchema = z.object({
  value: z.string(),
  detail: z.string(),
});

const diagnosisItemSchema = z.object({
  descripcion: z.string().min(1, 'La descripción del diagnóstico es requerida'),
  cie10: z.string().optional(),
});

const physicalAssessmentSchema = z.object({
  // Matriz de requerimientos (opcionales para validación básica)
  memoriaVisual: z.string().optional(),
  semejanzasDiferencias: z.string().optional(),
  orientacionEspacial: z.string().optional(),
  conocimientoNumerico: z.string().optional(),
  aprendizajeTareas: z.string().optional(),
  lenguajeExpresivo: z.string().optional(),
  conocimientoEscritura: z.string().optional(),
  lenguajeComprensivo: z.string().optional(),
  conocimientoLectura: z.string().optional(),
  responsabilidadAutonomia: z.string().optional(),
  repetitividad: z.string().optional(),
  atencion: z.string().optional(),
  ritmo: z.string().optional(),
  organizacion: z.string().optional(),
  relacionesTrabajo: z.string().optional(),
  seguridadMental: z.string().optional(),
  manipulacionManualCarga: z.string().optional(),
  coordinacionManipulativa: z.string().optional(),
  cargaPosturalRepetitivo: z.string().optional(),
  trabajoPrecision: z.string().optional(),
  sedestacionMantenida: z.string().optional(),
  bipedestacionMantenida: z.string().optional(),
  marchaTerrenoIrregular: z.string().optional(),
  campoVisual: z.string().optional(),
  agudezaVisual: z.string().optional(),
  requerimientoAuditivo: z.string().optional(),
  requerimientoFonatorio: z.string().optional(),
  requerimientoOlfatoGusto: z.string().optional(),
  sensibilidadSuperficialProfunda: z.string().optional(),
  controlEmocional: z.string().optional(),
  relacionesPsicosociales: z.string().optional(),
  ambienteTermico: z.string().optional(),
  ambienteSonoro: z.string().optional(),
  condicionesLuminicas: z.string().optional(),
  higieneOcupacional: z.string().optional(),
  // Campos requeridos
  alertaFarmacologica: z.enum(['SIN_EFECTO', 'CON_EFECTO', '']).refine(
    (val) => val !== '',
    { message: 'Debe seleccionar una alerta farmacológica' }
  ),
  lateralidad: z.enum(['Derecha', 'Izquierda', 'Bilateral', 'Ninguno', '']).refine(
    (val) => val !== '',
    { message: 'Debe seleccionar una lateralidad' }
  ),
  diagnosticos: z.array(diagnosisItemSchema).min(1, 'Debe agregar al menos un diagnóstico'),
  indicacionInicio: z.string().min(1, 'La fecha de inicio es requerida'),
  indicacionDuracion: z.string().min(1, 'La duración es requerida'),
  medicoNombre: z.string().min(1, 'El nombre del médico es requerido'),
  // Assessment items (opcionales para validación básica)
  deambulacion: assessmentItemSchema.optional(),
  terrenoIrregular: assessmentItemSchema.optional(),
  escalerasFijas: assessmentItemSchema.optional(),
  escalasVerticales: assessmentItemSchema.optional(),
  bipedestacion: assessmentItemSchema.optional(),
  sedestacion: assessmentItemSchema.optional(),
  arrodillarse: assessmentItemSchema.optional(),
  levantamientoSuelo: assessmentItemSchema.optional(),
  levantamientoCintura: assessmentItemSchema.optional(),
  transporteCarga: assessmentItemSchema.optional(),
  empujeTraccion: assessmentItemSchema.optional(),
  hombro: assessmentItemSchema.optional(),
  alcanceFrontal: assessmentItemSchema.optional(),
  agarreFuerza: assessmentItemSchema.optional(),
  motricidadFina: assessmentItemSchema.optional(),
  vehiculosLivianos: assessmentItemSchema.optional(),
  maquinariaPesada: assessmentItemSchema.optional(),
  trabajosAltura: assessmentItemSchema.optional(),
  vibracion: assessmentItemSchema.optional(),
  turnoNocturno: assessmentItemSchema.optional(),
}).passthrough(); // Permite campos adicionales que no están en el schema

const reevaluationSchema = z.object({
  id: z.string(),
  fecha: z.string().min(1, 'La fecha es requerida'),
  tipo: z.enum(['CONTINUACION', 'ALTA']).optional(),
  diasAdicionales: z.number().min(0, 'Los días adicionales deben ser mayor o igual a 0'),
  totalDias: z.number().optional(),
  comentarios: z.string().optional(),
  esEspecialidad: z.boolean(),
  nombreEspecialista: z.string().optional(),
}).refine(
  (data) => {
    if (data.esEspecialidad) {
      return !!data.nombreEspecialista && data.nombreEspecialista.trim().length > 0;
    }
    return !!data.tipo;
  },
  {
    message: 'Debe completar el tipo o nombre del especialista según corresponda',
    path: ['tipo'],
  }
);

const caseFormSchema = z.object({
  // Paso 1: Datos Generales
  fecha: z.string().min(1, 'La fecha de registro es requerida'),
  trabajadorNombre: z.string().min(1, 'El nombre del trabajador es requerido'),
  dni: z.string()
    .min(8, 'El DNI debe tener al menos 8 caracteres')
    .max(12, 'El DNI no puede tener más de 12 caracteres')
    .regex(/^[0-9]+$/, 'El DNI solo debe contener números'),
  sexo: z.enum(['Masculino', 'Femenino', '']).refine(
    (val) => val !== '',
    { message: 'Debe seleccionar el sexo' }
  ),
  jornadaLaboral: z.string().min(1, 'La jornada laboral es requerida'),
  puesto: z.string().min(1, 'El puesto de trabajo es requerido'),
  telfContacto: z.string()
    .min(9, 'El teléfono debe tener al menos 9 dígitos')
    .max(12, 'El teléfono no puede tener más de 12 caracteres')
    .regex(/^[0-9+\-\s()]+$/, 'El teléfono contiene caracteres inválidos'),
  empresa: z.string().min(1, 'La empresa es requerida'),
  gerencia: z.string().min(1, 'La gerencia es requerida'),
  supervisor: z.string().min(1, 'El supervisor es requerido'),
  supervisorTelf: z.string()
    .min(9, 'El teléfono del supervisor debe tener al menos 9 dígitos')
    .max(12, 'El teléfono del supervisor no puede tener más de 12 caracteres')
    .regex(/^[0-9+\-\s()]+$/, 'El teléfono del supervisor contiene caracteres inválidos'),
  tipoEvento: z.string().min(1, 'El tipo de evento es requerido'),
  
  // Paso 2 y 3: Assessment
  assessment: physicalAssessmentSchema,
  assessment2: physicalAssessmentSchema,
  
  // Paso 4: Análisis del Trabajo
  tareasRealizar: z.string().min(1, 'Las tareas a realizar son requeridas'),
  areaLugar: z.string().min(1, 'El área y lugar son requeridos'),
  tareasPrincipales: z.string().min(1, 'Las tareas principales son requeridas'),
  comentariosSupervisor: z.string().min(1, 'Los comentarios del supervisor son requeridos'),
  
  // Paso 5: Reevaluaciones
  reevaluaciones: z.array(reevaluationSchema).optional(),
  
  // Campos adicionales del sistema
  id: z.string().optional(),
  status: z.enum(['ACTIVO', 'CERRADO']).optional(),
  createdAt: z.string().optional(),
}).passthrough();

type CaseFormData = z.infer<typeof caseFormSchema>;

// OPTIMIZACIÓN: Memoizar componente para evitar re-renders innecesarios
const CaseForm = memo(function CaseForm({ initialData, onSave, onCancel }: CaseFormProps) {
  const { showSuccess, showError, showWarning } = useNotifications();
  const [currentStep, setCurrentStep] = useState(1);
  const [stepStatuses, setStepStatuses] = useState<Record<number, StepStatus>>({});
  const [lockedSteps, setLockedSteps] = useState<Record<number, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Inicializar React Hook Form con Zod resolver
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
    getValues,
  } = useForm<CaseFormData>({
    resolver: zodResolver(caseFormSchema),
    defaultValues: (initialData || INITIAL_CASE) as any,
    mode: 'onChange', // Validar mientras el usuario escribe
  });

  // Observar cambios en el formulario para actualizar estados de pasos
  const formData = watch();

  // Convertir formData a CaseData para compatibilidad con componentes existentes
  const caseData: CaseData = useMemo(() => {
    return {
      ...formData,
      id: formData.id || '',
      status: (formData.status || 'ACTIVO') as 'ACTIVO' | 'CERRADO',
      createdAt: formData.createdAt || new Date().toISOString(),
    } as unknown as CaseData;
  }, [formData]);

  const updateFormData = (updates: Partial<CaseData>) => {
    Object.entries(updates).forEach(([key, value]) => {
      setValue(key as keyof CaseFormData, value as any);
    });
  };

  const nextStep = async () => {
    // Validar el paso actual antes de avanzar
    const isValid = await validateCurrentStep();
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };

  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  // Validar el paso actual
  const validateCurrentStep = async (): Promise<boolean> => {
    let fieldsToValidate: (keyof CaseFormData)[] = [];

    switch (currentStep) {
      case 1:
        fieldsToValidate = [
          'fecha',
          'trabajadorNombre',
          'dni',
          'sexo',
          'jornadaLaboral',
          'puesto',
          'telfContacto',
          'empresa',
          'gerencia',
          'supervisor',
          'supervisorTelf',
          'tipoEvento',
        ];
        break;
      case 2:
        fieldsToValidate = [
          'assessment.alertaFarmacologica',
          'assessment.lateralidad',
          'assessment.diagnosticos',
          'assessment.indicacionInicio',
          'assessment.indicacionDuracion',
          'assessment.medicoNombre',
        ] as any;
        break;
      case 3:
        fieldsToValidate = [
          'assessment2.alertaFarmacologica',
          'assessment2.lateralidad',
          'assessment2.diagnosticos',
          'assessment2.indicacionInicio',
          'assessment2.indicacionDuracion',
          'assessment2.medicoNombre',
        ] as any;
        break;
      case 4:
        fieldsToValidate = [
          'tareasRealizar',
          'areaLugar',
          'tareasPrincipales',
          'comentariosSupervisor',
        ];
        break;
      case 5:
        // Las reevaluaciones son opcionales, pero si existen deben estar completas
        break;
    }

    const result = await trigger(fieldsToValidate as any);
    
    if (!result && fieldsToValidate.length > 0) {
      const firstError = Object.keys(errors).find(key => 
        fieldsToValidate.some(field => key.startsWith(field as string))
      );
      if (firstError) {
        const errorMessage = getNestedError(errors, firstError);
        showError(errorMessage || 'Por favor, complete todos los campos requeridos');
      } else {
        showError('Por favor, complete todos los campos requeridos del paso actual');
      }
    }

    return result;
  };

  // Helper para obtener mensajes de error anidados
  const getNestedError = (errorObj: any, path: string): string | undefined => {
    const parts = path.split('.');
    let current: any = errorObj;
    
    for (const part of parts) {
      if (current && typeof current === 'object') {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current?.message;
  };

  // Helper validation for Assessment sections (memoizado para evitar recálculos innecesarios)
  const validateAssessment = useCallback((assessment: PhysicalAssessment): StepStatus => {
    let assessmentItemsFilled = 0;
    let assessmentItemsTotal = 0;
    
    const assessmentKeys = Object.keys(assessment) as Array<keyof PhysicalAssessment>;
    
    assessmentKeys.forEach(key => {
      const val = assessment[key];
      // Check if it's an AssessmentItem (object with value)
      if (typeof val === 'object' && val !== null && 'value' in val) {
        assessmentItemsTotal++;
        if (val.value !== '') {
           assessmentItemsFilled++;
        }
      }
    });

    // Additional fields required
    const hasAlerta = !!assessment.alertaFarmacologica;
    const hasLateralidad = !!assessment.lateralidad;
    const hasDiagnosis = assessment.diagnosticos.some(d => d.descripcion.trim() !== '');
    const hasMedico = !!assessment.medicoNombre;
    const hasInicio = !!assessment.indicacionInicio;
    const hasDuracion = !!assessment.indicacionDuracion;

    const extraFieldsTotal = 6;
    const extraFieldsFilled = [hasAlerta, hasLateralidad, hasDiagnosis, hasMedico, hasInicio, hasDuracion].filter(Boolean).length;

    const totalRequired = assessmentItemsTotal + extraFieldsTotal;
    const totalFilled = assessmentItemsFilled + extraFieldsFilled;

    if (totalFilled === totalRequired && assessmentItemsTotal > 0) {
      return 'complete';
    } else if (totalFilled > 0) {
      return 'partial';
    }
    return 'empty';
  }, []);

  // Strict Validation Logic
  const calculateStatuses = () => {
    const statuses: Record<number, StepStatus> = {};

    // 1. General Info Validation
    const s1Fields = [
      caseData.trabajadorNombre,
      caseData.dni,
      caseData.sexo,
      caseData.jornadaLaboral,
      caseData.empresa,
      caseData.supervisor,
      caseData.puesto,
      caseData.telfContacto,
      caseData.fecha,
      caseData.gerencia,
      caseData.supervisorTelf,
      caseData.tipoEvento
    ];
    const s1Filled = s1Fields.filter(f => !!f).length;
    
    // Strict checks for Green status
    const isDniValid = caseData.dni && caseData.dni.length >= 8;
    const isPhoneWorkerValid = caseData.telfContacto && caseData.telfContacto.length === 9;
    
    if (s1Filled === s1Fields.length && isDniValid && isPhoneWorkerValid) {
      statuses[1] = 'complete';
    } else if (s1Filled > 0) {
      statuses[1] = 'partial';
    } else {
      statuses[1] = 'empty';
    }

    // 2. Physical Assessment (Section A) Validation
    statuses[2] = validateAssessment(caseData.assessment);

    // 3. Physical Assessment Copy (Section A - 2.1) Validation
    statuses[3] = validateAssessment(caseData.assessment2);

    // 4. Job Analysis (Section B & C) Validation (Was Step 3)
    const s3Fields = [
      caseData.tareasRealizar,
      caseData.areaLugar,
      caseData.tareasPrincipales,
      caseData.comentariosSupervisor
    ];
    const s3Filled = s3Fields.filter(f => !!f).length;

    if (s3Filled === s3Fields.length) {
      statuses[4] = 'complete';
    } else if (s3Filled > 0) {
      statuses[4] = 'partial';
    } else {
      statuses[4] = 'empty';
    }

    // 5. Reevaluation Validation (Was Step 4)
    if (caseData.reevaluaciones.length === 0) {
        statuses[5] = 'empty';
    } else {
        const allComplete = caseData.reevaluaciones.every(r => {
            if (r.esEspecialidad) {
                return !!r.fecha && !!r.nombreEspecialista;
            }
            return !!r.fecha && !!r.tipo && (r.diasAdicionales >= 0);
        });
        statuses[5] = allComplete ? 'complete' : 'partial';
    }

    setStepStatuses(statuses);
  };

  // Memoizar el cálculo de estados para evitar re-renders innecesarios
  const stepStatusesMemoized = useMemo(() => {
    const statuses: Record<number, StepStatus> = {};

    // 1. General Info Validation
    const s1Fields = [
      caseData.trabajadorNombre,
      caseData.dni,
      caseData.sexo,
      caseData.jornadaLaboral,
      caseData.empresa,
      caseData.supervisor,
      caseData.puesto,
      caseData.telfContacto,
      caseData.fecha,
      caseData.gerencia,
      caseData.supervisorTelf,
      caseData.tipoEvento
    ];
    const s1Filled = s1Fields.filter(f => !!f).length;
    
    // Strict checks for Green status
    const isDniValid = caseData.dni && caseData.dni.length >= 8;
    const isPhoneWorkerValid = caseData.telfContacto && caseData.telfContacto.length === 9;
    
    if (s1Filled === s1Fields.length && isDniValid && isPhoneWorkerValid) {
      statuses[1] = 'complete';
    } else if (s1Filled > 0) {
      statuses[1] = 'partial';
    } else {
      statuses[1] = 'empty';
    }

    // 2. Physical Assessment (Section A) Validation
    statuses[2] = validateAssessment(caseData.assessment);

    // 3. Physical Assessment Copy (Section A - 2.1) Validation
    statuses[3] = validateAssessment(caseData.assessment2);

    // 4. Job Analysis (Section B & C) Validation (Was Step 3)
    const s3Fields = [
      caseData.tareasRealizar,
      caseData.areaLugar,
      caseData.tareasPrincipales,
      caseData.comentariosSupervisor
    ];
    const s3Filled = s3Fields.filter(f => !!f).length;

    if (s3Filled === s3Fields.length) {
      statuses[4] = 'complete';
    } else if (s3Filled > 0) {
      statuses[4] = 'partial';
    } else {
      statuses[4] = 'empty';
    }

    // 5. Reevaluation Validation (Was Step 4)
    if (caseData.reevaluaciones.length === 0) {
        statuses[5] = 'empty';
    } else {
        const allComplete = caseData.reevaluaciones.every(r => {
            if (r.esEspecialidad) {
                return !!r.fecha && !!r.nombreEspecialista;
            }
            return !!r.fecha && !!r.tipo && (r.diasAdicionales >= 0);
        });
        statuses[5] = allComplete ? 'complete' : 'partial';
    }

    return statuses;
  }, [
    caseData.trabajadorNombre,
    caseData.dni,
    caseData.sexo,
    caseData.jornadaLaboral,
    caseData.empresa,
    caseData.supervisor,
    caseData.puesto,
    caseData.telfContacto,
    caseData.fecha,
    caseData.gerencia,
    caseData.supervisorTelf,
    caseData.tipoEvento,
    caseData.assessment,
    caseData.assessment2,
    caseData.tareasRealizar,
    caseData.areaLugar,
    caseData.tareasPrincipales,
    caseData.comentariosSupervisor,
    caseData.reevaluaciones
  ]);

  // Sincronizar el estado con el valor memoizado
  useEffect(() => {
    setStepStatuses(stepStatusesMemoized);
  }, [stepStatusesMemoized]);

  const getMissingFieldsForAssessment = (assessment: PhysicalAssessment) => {
      const missing: string[] = [];
      let missingItems = 0;
      const assessmentKeys = Object.keys(assessment) as Array<keyof PhysicalAssessment>;
      assessmentKeys.forEach(key => {
        const val = assessment[key];
        if (typeof val === 'object' && val !== null && 'value' in val) {
          if (val.value === '') missingItems++;
        }
      });
      if (missingItems > 0) missing.push(`${missingItems} ítems de evaluación física`);

      if (!assessment.lateralidad) missing.push("Lateralidad Afectada");
      if (!assessment.alertaFarmacologica) missing.push("Alerta Farmacológica");
      
      const hasDiagnosis = assessment.diagnosticos.some(d => d.descripcion.trim() !== '');
      if (!hasDiagnosis) missing.push("Diagnóstico Médico");

      if (!assessment.indicacionInicio) missing.push("Indicación Inicio");
      if (!assessment.indicacionDuracion) missing.push("Duración");
      if (!assessment.medicoNombre) missing.push("Médico");
      
      return missing;
  };

  const getMissingFieldsForCurrentStep = () => {
    const missing: string[] = [];

    if (currentStep === 1) {
       if (!caseData.fecha) missing.push("Fecha de Registro");
       if (!caseData.trabajadorNombre) missing.push("Nombre del Trabajador");
       if (!caseData.dni) missing.push("DNI / CE / PAS");
       if (!caseData.sexo) missing.push("Sexo");
       if (!caseData.jornadaLaboral) missing.push("Jornada Laboral");
       if (!caseData.telfContacto) missing.push("Telf. Trabajador");
       if (!caseData.puesto) missing.push("Puesto de Trabajo");
       if (!caseData.empresa) missing.push("Empresa");
       if (!caseData.gerencia) missing.push("Gerencia");
       if (!caseData.supervisor) missing.push("Supervisor");
       if (!caseData.supervisorTelf) missing.push("Telf. Supervisor");
       if (!caseData.tipoEvento) missing.push("Tipo de Evento");
    }

    if (currentStep === 2) {
      missing.push(...getMissingFieldsForAssessment(caseData.assessment));
    }

    if (currentStep === 3) {
      missing.push(...getMissingFieldsForAssessment(caseData.assessment2));
    }

    if (currentStep === 4) {
      if (!caseData.tareasRealizar) missing.push("Tareas a realizar");
      if (!caseData.areaLugar) missing.push("Área y lugar");
      if (!caseData.tareasPrincipales) missing.push("Tareas principales");
      if (!caseData.comentariosSupervisor) missing.push("Comentarios del Supervisor");
    }

    if (currentStep === 5) {
       caseData.reevaluaciones.forEach((r, idx) => {
           if (!r.fecha) missing.push(`Fecha (Reevaluación #${idx + 1})`);
           if (r.esEspecialidad) {
                if (!r.nombreEspecialista) missing.push(`Nombre Especialista (Reevaluación #${idx + 1})`);
           } else {
                if (!r.tipo) missing.push(`Tipo (Reevaluación #${idx + 1})`);
           }
       });
    }

    return missing;
  };

  const handleSectionLock = () => {
    if (lockedSteps[currentStep]) {
      setLockedSteps(prev => ({ ...prev, [currentStep]: false }));
      return;
    }

    const missingFields = getMissingFieldsForCurrentStep();

    if (missingFields.length > 0) {
      showWarning(
        "Sección guardada con observaciones pendientes:\n\n" + 
        missingFields.map(field => `• ${field}`).join('\n') + 
        "\n\nPuede continuar y completar estos datos más adelante."
      );
    }
    
    setLockedSteps(prev => ({ ...prev, [currentStep]: true }));
  };

  /**
   * Valida y guarda el formulario completo en Supabase
   * Muestra notificaciones de éxito o error
   */
  const onSubmit = async (data: CaseFormData): Promise<void> => {
    const warnings: string[] = [];

    if (!data.trabajadorNombre) warnings.push("Falta Nombre del Trabajador");
    if (!data.dni) warnings.push("Falta DNI / Documento");
    
    if (warnings.length > 0) {
       showWarning(
         "El caso se guardará con la siguiente información pendiente:\n\n" + 
         warnings.map(w => `• ${w}`).join('\n')
       );
    }
    
    setIsSaving(true);
    
    try {
      // Preparar los datos para Supabase
      // Mapear los campos del formulario a los nombres exactos de las columnas de la tabla
      const dataToInsert = {
        fecha_registro: data.fecha,
        apellidos_nombre: data.trabajadorNombre,
        dni_ce_pas: data.dni,
        telefono_trabajador: data.telfContacto,
        sexo: data.sexo,
        jornada_laboral: data.jornadaLaboral,
        puesto_trabajo: data.puesto,
        empresa: data.empresa,
        gerencia: data.gerencia,
        supervisor_responsable: data.supervisor,
        telf_contacto_supervisor: data.supervisorTelf,
      };

      // Insertar en Supabase
      const { data: insertedData, error } = await supabase
        .from('registros_trabajadores')
        .insert(dataToInsert)
        .select();

      if (error) {
        // ✅ Manejo específico por tipo de error de Supabase
        if (error.code === '23505') {
          // Violación de constraint único (duplicado)
          showError('Ya existe un registro con estos datos. Por favor, verifica el DNI o nombre del trabajador.');
          logger.error(new Error('Error de duplicado en registros_trabajadores'), {
            context: 'CaseForm.onSubmit',
            errorCode: error.code,
            errorMessage: error.message,
            data: { dni: data.dni, trabajadorNombre: data.trabajadorNombre }
          });
          return;
        } else if (error.code === '23503') {
          // Violación de foreign key
          showError('Error de referencia: Verifica que la empresa y otros datos relacionados existan en el sistema.');
          logger.error(new Error('Error de foreign key en registros_trabajadores'), {
            context: 'CaseForm.onSubmit',
            errorCode: error.code,
            errorMessage: error.message,
            hint: error.hint
          });
          return;
        } else if (error.code === '42501' || error.message?.includes('RLS') || error.message?.includes('permission')) {
          // Error de RLS (Row Level Security)
          showError('No tiene permisos para crear este registro. Por favor, contacta al administrador.');
          logger.error(new Error('Error de permisos RLS en registros_trabajadores'), {
            context: 'CaseForm.onSubmit',
            errorCode: error.code,
            errorMessage: error.message
          });
          return;
        } else if (error.code === '23514') {
          // Violación de constraint check
          showError('Los datos ingresados no cumplen con las validaciones requeridas. Por favor, revisa los campos.');
          logger.error(new Error('Error de validación en registros_trabajadores'), {
            context: 'CaseForm.onSubmit',
            errorCode: error.code,
            errorMessage: error.message,
            hint: error.hint
          });
          return;
        } else {
          // Otro tipo de error, lanzarlo para manejo general
          throw error;
        }
      }

      // Verificar que se insertaron los datos correctamente
      if (insertedData && insertedData.length > 0) {
        // Mostrar notificación de éxito
        showSuccess('Registro guardado exitosamente en Supabase');
        
        // Llamar al callback onSave después de un breve delay para que se vea la notificación
        setTimeout(() => {
          onSave(caseData);
        }, 1000);
      } else {
        throw new Error('No se recibieron datos de Supabase');
      }
    } catch (error: any) {
      logger.error(error instanceof Error ? error : new Error('Error al guardar en Supabase'), {
        context: 'CaseForm'
      });
      showError(`Error al guardar: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getStepColorClass = (status: StepStatus, isActive: boolean) => {
    const base = "transition-all duration-300 transform ";
    const activeRing = isActive ? " ring-2 ring-offset-2 ring-blue-600 scale-105" : " hover:scale-105 hover:shadow-lg";

    if (status === 'complete') {
      return `${base} bg-emerald-100 border-emerald-400 text-emerald-800 ${activeRing}`;
    } else if (status === 'partial') {
      return `${base} bg-amber-100 border-amber-400 text-amber-800 ${activeRing}`;
    } else {
      return `${base} bg-blue-50 border-blue-200 text-blue-800 ${activeRing}`;
    }
  };

  const getStepIcon = (status: StepStatus) => {
    if (status === 'complete') return <Check size={20} className="text-emerald-600 font-bold" />;
    if (status === 'partial') return <Circle size={16} className="text-amber-600 fill-current opacity-50" />;
    return <Circle size={18} className="text-blue-300" />;
  };

  const isCurrentLocked = !!lockedSteps[currentStep];

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <GeneralInfo data={caseData} onChange={updateFormData} readOnly={isCurrentLocked} />;
      case 2:
        return (
          <PhysicalAssessmentComponent 
            assessment={caseData.assessment} 
            onChange={(newAssessment) => updateFormData({ assessment: newAssessment })} 
            readOnly={isCurrentLocked}
            jobTitle={caseData.puesto}
            hoursPerDay={caseData.jornadaLaboral}
            gender={caseData.sexo}
          />
        );
      case 3: // Duplicate Step 2.1
        return (
           <div className="relative">
              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 mb-6 rounded-r-lg shadow-sm">
                  <h3 className="font-bold text-purple-900">Sección Duplicada: Paso 2.1</h3>
                  <p className="text-sm text-purple-700">Esta es una sección adicional de Capacidad Funcional, copia del paso anterior.</p>
              </div>
              <PhysicalAssessmentComponent 
                assessment={caseData.assessment2} 
                onChange={(newAssessment) => updateFormData({ assessment2: newAssessment })} 
                readOnly={isCurrentLocked}
                hideFunctionalCapacity={true}
                showCapacitiesMatrix={true}
                showRequirementsMatrix={true}
                jobTitle={caseData.puesto}
                hoursPerDay={caseData.jornadaLaboral}
                gender={caseData.sexo}
              />
           </div>
        );
      case 4:
        return <JobAnalysis data={caseData} onChange={updateFormData} readOnly={isCurrentLocked} />;
      case 5:
        return <Reevaluation data={caseData} onChange={updateFormData} readOnly={isCurrentLocked} />;
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-0">
      {/* Header */}
      <div className="bg-white rounded-t-xl shadow-lg border-b border-blue-100 p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-slate-400"></div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-800 drop-shadow-sm flex items-center gap-2">
            {initialData ? <Edit3 size={20} className="sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" /> : <Save size={20} className="sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />}
            <span className="truncate">
              {initialData ? (
                <>
                  <span className="hidden sm:inline">Editando Caso: </span>
                  {initialData.id}
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Nuevo Registro de </span>
                  Trabajo Modificado
                </>
              )}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Complete todos los campos obligatorios para finalizar.</p>
          {/* Mostrar errores de validación del paso actual */}
          {Object.keys(errors).length > 0 && currentStep === 1 && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              {errors.fecha?.message && <div>• {errors.fecha.message}</div>}
              {errors.trabajadorNombre?.message && <div>• {errors.trabajadorNombre.message}</div>}
              {errors.dni?.message && <div>• {errors.dni.message}</div>}
              {errors.sexo?.message && <div>• {errors.sexo.message}</div>}
              {errors.jornadaLaboral?.message && <div>• {errors.jornadaLaboral.message}</div>}
              {errors.puesto?.message && <div>• {errors.puesto.message}</div>}
              {errors.telfContacto?.message && <div>• {errors.telfContacto.message}</div>}
              {errors.empresa?.message && <div>• {errors.empresa.message}</div>}
              {errors.gerencia?.message && <div>• {errors.gerencia.message}</div>}
              {errors.supervisor?.message && <div>• {errors.supervisor.message}</div>}
              {errors.supervisorTelf?.message && <div>• {errors.supervisorTelf.message}</div>}
              {errors.tipoEvento?.message && <div>• {errors.tipoEvento.message}</div>}
            </div>
          )}
        </div>
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          <button 
            type="button"
            onClick={onCancel}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:shadow-md transition-all"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            disabled={isSaving}
            className={`
              flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white rounded-lg flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5
              ${isSaving 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
              }
            `}
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="sm:w-4 sm:h-4 animate-spin" />
                <span className="hidden sm:inline">Guardando...</span>
                <span className="sm:hidden">Guardando</span>
              </>
            ) : (
              <>
                <Save size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Guardar Todo</span>
                <span className="sm:hidden">Guardar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white border-b border-blue-100 px-3 sm:px-6 py-4 sm:py-6 shadow-sm overflow-x-auto">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between min-w-max sm:min-w-0">
          {STEPS.map((step) => {
            const status = stepStatuses[step.id] || 'empty';
            const isActive = currentStep === step.id;
            const isLocked = lockedSteps[step.id];
            
            return (
              <div 
                key={step.id}
                className={`
                  flex-1 flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-xl border cursor-pointer select-none relative min-w-[140px] sm:min-w-[180px]
                  ${getStepColorClass(status, isActive)}
                `}
                onClick={() => setCurrentStep(step.id)}
              >
                {isLocked && (
                  <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 text-slate-400">
                    <Lock size={10} className="sm:w-3 sm:h-3" />
                  </div>
                )}
                <div className={`
                  w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-white shadow-sm flex-shrink-0
                `}>
                  {getStepIcon(status)}
                </div>
                <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider opacity-70">
                    {step.label}
                  </span>
                  <span className="text-xs sm:text-sm font-bold leading-tight truncate" title={step.title}>
                    {step.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white shadow-xl min-h-[400px] sm:min-h-[500px] p-4 sm:p-6 lg:p-8 transition-all relative">
         {isCurrentLocked && (
            <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10 bg-slate-100 px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold text-slate-500 flex items-center gap-1 border border-slate-200">
              <Lock size={10} className="sm:w-3 sm:h-3" /> <span className="hidden sm:inline">Sección Bloqueada</span><span className="sm:hidden">Bloqueada</span>
            </div>
         )}
        {renderStepContent()}
      </div>

      {/* Footer Navigation & Actions */}
      <div className="bg-slate-50 rounded-b-xl border-t border-slate-200 p-3 sm:p-4 flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 shadow-inner items-stretch sm:items-center">
        <button 
          type="button"
          onClick={prevStep}
          disabled={currentStep === 1}
          className="px-3 sm:px-4 py-2.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white hover:shadow-md rounded-lg flex items-center justify-center gap-2 transition-all min-h-[44px] sm:min-h-0"
        >
          <ChevronLeft size={14} className="sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Anterior</span>
        </button>

        {/* Lock/Unlock Section */}
        <div className="flex gap-2 sm:gap-4 order-3 sm:order-2">
          {isCurrentLocked ? (
            <button
              type="button"
              onClick={handleSectionLock}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-2 transition-all"
              title="Habilitar edición"
            >
              <Edit3 size={14} className="sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Editar Sección</span><span className="sm:hidden">Editar</span>
            </button>
          ) : (
             <button
              type="button"
              onClick={handleSectionLock}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center justify-center gap-2 transition-all shadow-sm"
              title="Guardar y bloquear esta sección"
            >
              <Lock size={14} className="sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Guardar esta sección</span><span className="sm:hidden">Guardar</span>
            </button>
          )}
        </div>

        <button 
          type={currentStep === STEPS.length ? 'submit' : 'button'}
          onClick={currentStep === STEPS.length ? undefined : nextStep}
          disabled={isSaving && currentStep === STEPS.length}
          className={`
            order-2 sm:order-3 px-3 sm:px-4 py-2.5 sm:py-2 text-xs sm:text-sm font-medium text-white rounded-lg flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 min-h-[44px] sm:min-h-0
            ${isSaving && currentStep === STEPS.length
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'
            }
          `}
        >
          {currentStep === STEPS.length ? (
            isSaving ? (
              <>
                <Loader2 size={14} className="sm:w-4 sm:h-4 animate-spin" />
                <span className="hidden sm:inline">Guardando...</span>
                <span className="sm:hidden">Guardando</span>
              </>
            ) : (
              'Finalizar'
            )
          ) : (
            <>
              Siguiente
              <ChevronRight size={14} className="sm:w-4 sm:h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
});

// Exportar componente memoizado
export default CaseForm;
