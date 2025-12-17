'use client';

import React, { useState, useEffect } from 'react';
import { CaseData, INITIAL_CASE, PhysicalAssessment } from '../types';
import GeneralInfo from './sections/GeneralInfo';
import PhysicalAssessmentComponent from './sections/PhysicalAssessment';
import JobAnalysis from './sections/JobAnalysis';
import Reevaluation from './sections/Reevaluation';
import Notification from './Notification';
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

export default function CaseForm({ initialData, onSave, onCancel }: CaseFormProps) {
  const [formData, setFormData] = useState<CaseData>(initialData || INITIAL_CASE);
  const [currentStep, setCurrentStep] = useState(1);
  const [stepStatuses, setStepStatuses] = useState<Record<number, StepStatus>>({});
  // Track which sections are locked (saved/read-only)
  const [lockedSteps, setLockedSteps] = useState<Record<number, boolean>>({});
  // Estados para notificaciones y carga
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const updateFormData = (updates: Partial<CaseData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  // Helper validation for Assessment sections
  const validateAssessment = (assessment: PhysicalAssessment) => {
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
  };

  // Strict Validation Logic
  const calculateStatuses = () => {
    const statuses: Record<number, StepStatus> = {};

    // 1. General Info Validation
    const s1Fields = [
      formData.trabajadorNombre,
      formData.dni,
      formData.sexo,
      formData.jornadaLaboral,
      formData.empresa,
      formData.supervisor,
      formData.puesto,
      formData.telfContacto,
      formData.fecha,
      formData.gerencia,
      formData.supervisorTelf,
      formData.tipoEvento
    ];
    const s1Filled = s1Fields.filter(f => !!f).length;
    
    // Strict checks for Green status
    const isDniValid = formData.dni && formData.dni.length >= 8;
    const isPhoneWorkerValid = formData.telfContacto && formData.telfContacto.length === 9;
    
    if (s1Filled === s1Fields.length && isDniValid && isPhoneWorkerValid) {
      statuses[1] = 'complete';
    } else if (s1Filled > 0) {
      statuses[1] = 'partial';
    } else {
      statuses[1] = 'empty';
    }

    // 2. Physical Assessment (Section A) Validation
    statuses[2] = validateAssessment(formData.assessment);

    // 3. Physical Assessment Copy (Section A - 2.1) Validation
    statuses[3] = validateAssessment(formData.assessment2);

    // 4. Job Analysis (Section B & C) Validation (Was Step 3)
    const s3Fields = [
      formData.tareasRealizar,
      formData.areaLugar,
      formData.tareasPrincipales,
      formData.comentariosSupervisor
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
    if (formData.reevaluaciones.length === 0) {
        statuses[5] = 'empty';
    } else {
        const allComplete = formData.reevaluaciones.every(r => {
            if (r.esEspecialidad) {
                return !!r.fecha && !!r.nombreEspecialista;
            }
            return !!r.fecha && !!r.tipo && (r.diasAdicionales >= 0);
        });
        statuses[5] = allComplete ? 'complete' : 'partial';
    }

    setStepStatuses(statuses);
  };

  useEffect(() => {
    calculateStatuses();
  }, [formData]);

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
       if (!formData.fecha) missing.push("Fecha de Registro");
       if (!formData.trabajadorNombre) missing.push("Nombre del Trabajador");
       if (!formData.dni) missing.push("DNI / CE / PAS");
       if (!formData.sexo) missing.push("Sexo");
       if (!formData.jornadaLaboral) missing.push("Jornada Laboral");
       if (!formData.telfContacto) missing.push("Telf. Trabajador");
       if (!formData.puesto) missing.push("Puesto de Trabajo");
       if (!formData.empresa) missing.push("Empresa");
       if (!formData.gerencia) missing.push("Gerencia");
       if (!formData.supervisor) missing.push("Supervisor");
       if (!formData.supervisorTelf) missing.push("Telf. Supervisor");
       if (!formData.tipoEvento) missing.push("Tipo de Evento");
    }

    if (currentStep === 2) {
      missing.push(...getMissingFieldsForAssessment(formData.assessment));
    }

    if (currentStep === 3) {
      missing.push(...getMissingFieldsForAssessment(formData.assessment2));
    }

    if (currentStep === 4) {
      if (!formData.tareasRealizar) missing.push("Tareas a realizar");
      if (!formData.areaLugar) missing.push("Área y lugar");
      if (!formData.tareasPrincipales) missing.push("Tareas principales");
      if (!formData.comentariosSupervisor) missing.push("Comentarios del Supervisor");
    }

    if (currentStep === 5) {
       formData.reevaluaciones.forEach((r, idx) => {
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
      alert(
        "Sección guardada con observaciones pendientes:\n\n" + 
        missingFields.map(field => `• ${field}`).join('\n') + 
        "\n\nPuede continuar y completar estos datos más adelante."
      );
    }
    
    setLockedSteps(prev => ({ ...prev, [currentStep]: true }));
  };

  const validateAndSave = async () => {
    const warnings: string[] = [];

    if (!formData.trabajadorNombre) warnings.push("Falta Nombre del Trabajador");
    if (!formData.dni) warnings.push("Falta DNI / Documento");
    
    if (warnings.length > 0) {
       alert(
         "El caso se guardará con la siguiente información pendiente:\n\n" + 
         warnings.map(w => `• ${w}`).join('\n')
       );
    }
    
    setIsSaving(true);
    
    try {
      // Preparar los datos para Supabase
      // Mapear los campos del formulario a los nombres exactos de las columnas de la tabla
      const dataToInsert = {
        fecha_registro: formData.fecha,
        apellidos_nombre: formData.trabajadorNombre,
        dni_ce_pas: formData.dni,
        telefono_trabajador: formData.telfContacto,
        sexo: formData.sexo,
        jornada_laboral: formData.jornadaLaboral,
        puesto_trabajo: formData.puesto,
        empresa: formData.empresa,
        gerencia: formData.gerencia,
        supervisor_responsable: formData.supervisor,
        telf_contacto_supervisor: formData.supervisorTelf,
      };

      // Insertar en Supabase
      const { data, error } = await supabase
        .from('registros_trabajadores')
        .insert(dataToInsert)
        .select();

      if (error) {
        throw error;
      }

      // Verificar que se insertaron los datos correctamente
      if (data && data.length > 0) {
        // Mostrar notificación de éxito
        setNotification({
          message: `Registro guardado exitosamente en Supabase`,
          type: 'success'
        });
        
        // Llamar al callback onSave después de un breve delay para que se vea la notificación
        setTimeout(() => {
          onSave(formData);
        }, 1000);
      } else {
        throw new Error('No se recibieron datos de Supabase');
      }
    } catch (error: any) {
      console.error('Error al guardar en Supabase:', error);
      setNotification({
        message: `Error al guardar: ${error.message || 'Error desconocido'}`,
        type: 'error'
      });
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
        return <GeneralInfo data={formData} onChange={updateFormData} readOnly={isCurrentLocked} />;
      case 2:
        return (
          <PhysicalAssessmentComponent 
            assessment={formData.assessment} 
            onChange={(newAssessment) => updateFormData({ assessment: newAssessment })} 
            readOnly={isCurrentLocked}
            jobTitle={formData.puesto}
            hoursPerDay={formData.jornadaLaboral}
            gender={formData.sexo}
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
                assessment={formData.assessment2} 
                onChange={(newAssessment) => updateFormData({ assessment2: newAssessment })} 
                readOnly={isCurrentLocked}
                hideFunctionalCapacity={true}
                showCapacitiesMatrix={true}
                jobTitle={formData.puesto}
                hoursPerDay={formData.jornadaLaboral}
                gender={formData.sexo}
              />
           </div>
        );
      case 4:
        return <JobAnalysis data={formData} onChange={updateFormData} readOnly={isCurrentLocked} />;
      case 5:
        return <Reevaluation data={formData} onChange={updateFormData} readOnly={isCurrentLocked} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Notificación */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      {/* Header */}
      <div className="bg-white rounded-t-xl shadow-lg border-b border-blue-100 p-6 flex justify-between items-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-slate-400"></div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 drop-shadow-sm flex items-center gap-2">
            {initialData ? <Edit3 size={24} className="text-blue-600" /> : <Save size={24} className="text-blue-600" />}
            {initialData ? `Editando Caso: ${initialData.id}` : 'Nuevo Registro de Trabajo Modificado'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">Complete todos los campos obligatorios para finalizar.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:shadow-md transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={validateAndSave}
            disabled={isSaving}
            className={`
              px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5
              ${isSaving 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
              }
            `}
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save size={16} />
                Guardar Todo
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white border-b border-blue-100 px-6 py-6 shadow-sm overflow-x-auto">
        <div className="flex flex-col sm:flex-row gap-4 justify-between min-w-max sm:min-w-0">
          {STEPS.map((step) => {
            const status = stepStatuses[step.id] || 'empty';
            const isActive = currentStep === step.id;
            const isLocked = lockedSteps[step.id];
            
            return (
              <div 
                key={step.id}
                className={`
                  flex-1 flex items-center gap-3 p-3 rounded-xl border cursor-pointer select-none relative min-w-[180px]
                  ${getStepColorClass(status, isActive)}
                `}
                onClick={() => setCurrentStep(step.id)}
              >
                {isLocked && (
                  <div className="absolute top-2 right-2 text-slate-400">
                    <Lock size={12} />
                  </div>
                )}
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center bg-white shadow-sm flex-shrink-0
                `}>
                  {getStepIcon(status)}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                    {step.label}
                  </span>
                  <span className="text-sm font-bold leading-tight truncate" title={step.title}>
                    {step.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white shadow-xl min-h-[500px] p-8 transition-all relative">
         {isCurrentLocked && (
            <div className="absolute top-4 right-4 z-10 bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-500 flex items-center gap-1 border border-slate-200">
              <Lock size={12} /> Sección Bloqueada
            </div>
         )}
        {renderStepContent()}
      </div>

      {/* Footer Navigation & Actions */}
      <div className="bg-slate-50 rounded-b-xl border-t border-slate-200 p-4 flex justify-between shadow-inner items-center">
        <button 
          onClick={prevStep}
          disabled={currentStep === 1}
          className="px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white hover:shadow-md rounded-lg flex items-center gap-2 transition-all"
        >
          <ChevronLeft size={16} /> Anterior
        </button>

        {/* Lock/Unlock Section */}
        <div className="flex gap-4">
          {isCurrentLocked ? (
            <button
              onClick={handleSectionLock}
              className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-2 transition-all"
              title="Habilitar edición"
            >
              <Edit3 size={16} /> Editar Sección
            </button>
          ) : (
             <button
              onClick={handleSectionLock}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center gap-2 transition-all shadow-sm"
              title="Guardar y bloquear esta sección"
            >
              <Lock size={16} /> Guardar esta sección
            </button>
          )}
        </div>

        <button 
          onClick={currentStep === STEPS.length ? validateAndSave : nextStep}
          disabled={isSaving && currentStep === STEPS.length}
          className={`
            px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 transition-all hover:-translate-y-0.5
            ${isSaving && currentStep === STEPS.length
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'
            }
          `}
        >
          {currentStep === STEPS.length ? (
            isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Guardando...
              </>
            ) : (
              'Finalizar'
            )
          ) : (
            <>
              Siguiente
              <ChevronRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
