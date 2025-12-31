'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PhysicalAssessment as IAssessment, AssessmentItem, JobDemandLevel, CapacityLevel } from '../../types';
import { AlertTriangle, ShieldAlert, Activity, Plus, Trash2, Calculator, ChevronDown, ChevronRight, Briefcase, Info, User } from 'lucide-react';

interface PhysicalAssessmentProps {
  assessment: IAssessment;
  onChange: (data: IAssessment) => void;
  readOnly?: boolean;
  hideFunctionalCapacity?: boolean;
  showCapacitiesMatrix?: boolean;
  showRequirementsMatrix?: boolean; // Nuevo prop para mostrar matriz de requerimientos
  jobTitle?: string;
  hoursPerDay?: string;
  gender?: string;
}

const FREQUENCY_OPTS = ['N', 'O', 'F', 'C'];
const SAFETY_OPTS = ['APTO', 'NO APTO', 'NO APLICA'];

// --- Matrix Configurations ---

const JOB_DEMAND_LEVELS: { id: JobDemandLevel, label: string, value: number }[] = [
    { id: 'BAJO', label: 'BAJO', value: 0 },
    { id: 'MEDIO', label: 'MEDIO', value: 1 },
    { id: 'ALTO', label: 'ALTO', value: 2 },
    { id: 'MUY_ALTO', label: 'MUY ALTO', value: 3 }
];

const JOB_CAPACITIES_LEVELS: { id: CapacityLevel, label: string, short: string, value: number }[] = [
    { id: 'SIN_DIFICULTAD', label: 'SIN DIFICULTAD', short: 'S/D', value: 0 },
    { id: 'DIFICULTAD_NO_SIGNIFICATIVA', label: 'CON DIFICULTAD NO SIGNIFICATIVA', short: 'DNS', value: 1 },
    { id: 'DIFICULTAD_LEVE', label: 'CON DIFICULTAD LEVE', short: 'LEV', value: 2 },
    { id: 'DIFICULTAD_MODERADA', label: 'CON DIFICULTAD MODERADA', short: 'MOD', value: 3 },
    { id: 'DIFICULTAD_SEVERA', label: 'CON DIFICULTAD SEVERA', short: 'SEV', value: 4 },
    { id: 'SIN_CAPACIDAD', label: 'SIN CAPACIDAD', short: 'S/C', value: 5 }
];

// Definitions for Legend and Table Column (Generic)
const REQUIREMENT_DEFINITIONS: Record<string, string> = {
    'BAJO': 'Ausencia o exigencia mínima de la característica.',
    'MEDIO': 'Exigencia ocasional o de intensidad moderada.',
    'ALTO': 'Exigencia frecuente o de intensidad considerable.',
    'MUY_ALTO': 'Exigencia constante, crítica o de máxima intensidad.'
};

// Matrix Score Table (Row = Capacity Index, Col = Demand Index)
const SCORE_MATRIX = [
    [0, 0, 0, 0], // Sin Dificultad
    [1, 1, 2, 2], // Dificultad No Significativa
    [2, 2, 3, 3], // Dificultad Leve
    [3, 3, 4, 4], // Dificultad Moderada
    [4, 4, 5, 5], // Dificultad Severa
    [5, 5, 5, 5]  // Sin Capacidad
];

// Interpretation Data based on Score (0-5)
const SCORE_INTERPRETATION: Record<number, { definition: string; percentage: string }> = {
    0: { 
        definition: "Sin limitaciones en el puesto de trabajo original", 
        percentage: "0%" 
    },
    1: { 
        definition: "Limitaciones leves para la actividad laboral en el puesto de trabajo original", 
        percentage: "5%" 
    },
    2: { 
        definition: "Limitaciones moderadas para la actividad laboral en el puesto de trabajo original", 
        percentage: "10%" 
    },
    3: { 
        definition: "Con limitaciones severas para la actividad laboral del puesto de trabajo original", 
        percentage: "15%" 
    },
    4: { 
        definition: "Con limitaciones severas para la actividad laboral del puesto de trabajo original y limitaciones leves para actividades laborales de otro puesto de trabajo", 
        percentage: "20%" 
    },
    5: { 
        definition: "Sin posibilidad de realizar actividades laborales", 
        percentage: "25%" 
    }
};

interface MatrixRow {
    id: string;
    label: string;
    dimension: string;
    variable: string;
}

const JOB_MATRIX_STRUCTURE: MatrixRow[] = [
  // Carga Mental - Procesamiento de la información
  { id: 'memoriaVisual', label: 'Memoria visual', dimension: 'Carga Mental', variable: 'Procesamiento de la información' },
  { id: 'semejanzasDiferencias', label: 'Semejanzas y diferencias', dimension: 'Carga Mental', variable: 'Procesamiento de la información' },
  { id: 'orientacionEspacial', label: 'Orientación espacial', dimension: 'Carga Mental', variable: 'Procesamiento de la información' },
  { id: 'conocimientoNumerico', label: 'Conocimiento numérico', dimension: 'Carga Mental', variable: 'Procesamiento de la información' },
  { id: 'aprendizajeTareas', label: 'Aprendizaje de tareas', dimension: 'Carga Mental', variable: 'Procesamiento de la información' },
  { id: 'lenguajeExpresivo', label: 'Lenguaje expresivo', dimension: 'Carga Mental', variable: 'Procesamiento de la información' },
  { id: 'conocimientoEscritura', label: 'Conocimiento de la escritura', dimension: 'Carga Mental', variable: 'Procesamiento de la información' },
  { id: 'lenguajeComprensivo', label: 'Lenguaje comprensivo', dimension: 'Carga Mental', variable: 'Procesamiento de la información' },
  { id: 'conocimientoLectura', label: 'Conocimiento de la lectura', dimension: 'Carga Mental', variable: 'Procesamiento de la información' },
  
  // Carga Mental - Actitudes en el trabajo
  { id: 'responsabilidadAutonomia', label: 'Responsabilidad/ autonomía laboral y realización de la tarea', dimension: 'Carga Mental', variable: 'Actitudes en el trabajo' },
  { id: 'repetitividad', label: 'Repetitividad', dimension: 'Carga Mental', variable: 'Actitudes en el trabajo' },
  { id: 'atencion', label: 'Atención', dimension: 'Carga Mental', variable: 'Actitudes en el trabajo' },
  { id: 'ritmo', label: 'Ritmo', dimension: 'Carga Mental', variable: 'Actitudes en el trabajo' },
  { id: 'organizacion', label: 'Organización', dimension: 'Carga Mental', variable: 'Actitudes en el trabajo' },
  { id: 'relacionesTrabajo', label: 'Relaciones de trabajo', dimension: 'Carga Mental', variable: 'Actitudes en el trabajo' },
  { id: 'seguridadMental', label: 'Seguridad', dimension: 'Carga Mental', variable: 'Actitudes en el trabajo' },

  // Carga Física - Aptitudes físicas
  { id: 'manipulacionManualCarga', label: 'Manipulación Manual de carga', dimension: 'Carga Física', variable: 'Aptitudes físicas' },
  { id: 'coordinacionManipulativa', label: 'Coordinación manipulativa', dimension: 'Carga Física', variable: 'Aptitudes físicas' },
  { id: 'cargaPosturalRepetitivo', label: 'Carga postural/Trabajo repetitivo', dimension: 'Carga Física', variable: 'Aptitudes físicas' },
  { id: 'trabajoPrecision', label: 'Trabajo de precisión', dimension: 'Carga Física', variable: 'Aptitudes físicas' },
  { id: 'sedestacionMantenida', label: 'Sedestación Mantenida', dimension: 'Carga Física', variable: 'Aptitudes físicas' },
  { id: 'bipedestacionMantenida', label: 'Bipedestación', dimension: 'Carga Física', variable: 'Aptitudes físicas' },
  { id: 'marchaTerrenoIrregular', label: 'Marcha por terreno irregular', dimension: 'Carga Física', variable: 'Aptitudes físicas' },
  { id: 'campoVisual', label: 'Campo visual', dimension: 'Carga Física', variable: 'Aptitudes físicas' },
  { id: 'agudezaVisual', label: 'Agudez visual', dimension: 'Carga Física', variable: 'Aptitudes físicas' },
  { id: 'requerimientoAuditivo', label: 'Requerimiento Auditivo', dimension: 'Carga Física', variable: 'Aptitudes físicas' },
  { id: 'requerimientoFonatorio', label: 'Requerimiento fonatorio', dimension: 'Carga Física', variable: 'Aptitudes físicas' },
  { id: 'requerimientoOlfatoGusto', label: 'Requerimiento de olfato y/o gusto', dimension: 'Carga Física', variable: 'Aptitudes físicas' },
  { id: 'sensibilidadSuperficialProfunda', label: 'Sensibilidad: superficial y/o profunda', dimension: 'Carga Física', variable: 'Aptitudes físicas' },

  // Carga Emocional
  { id: 'controlEmocional', label: 'Control emocional', dimension: 'Carga Emocional', variable: 'Carga Emocional' },
  { id: 'relacionesPsicosociales', label: 'Relaciones Psicosociales', dimension: 'Carga Emocional', variable: 'Carga Emocional' },

  // Otros Riesgos
  { id: 'ambienteTermico', label: 'Ambiente térmico', dimension: 'Otros Riesgos', variable: 'Factores ambientales' },
  { id: 'ambienteSonoro', label: 'Ambiente sonoro', dimension: 'Otros Riesgos', variable: 'Factores ambientales' },
  { id: 'condicionesLuminicas', label: 'Condiciones lumínicas', dimension: 'Otros Riesgos', variable: 'Factores ambientales' },
  { id: 'higieneOcupacional', label: 'Higiene ocupacional', dimension: 'Otros Riesgos', variable: 'Factores ambientales' },
];

const CustomRadio = ({ checked, onChange, disabled, title }: { checked: boolean; onChange: () => void; disabled: boolean; title?: string }) => (
    <div 
      onClick={(e) => {
        if (!disabled) {
           e.stopPropagation();
           onChange();
        }
      }}
      title={title}
      className={`
        w-4 h-4 rounded-full border border-blue-300 flex items-center justify-center cursor-pointer transition-all mx-auto
        ${checked 
          ? 'border-blue-600 bg-white ring-1 ring-blue-600' 
          : 'bg-white hover:border-blue-500'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {checked && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
    </div>
);

export default function PhysicalAssessmentComponent({ assessment, onChange, readOnly = false, hideFunctionalCapacity = false, showCapacitiesMatrix = false, showRequirementsMatrix = false, jobTitle, hoursPerDay, gender }: PhysicalAssessmentProps) {
  
  // States for collapse/expand logic
  const [expandedDimensions, setExpandedDimensions] = useState<Record<string, boolean>>({
      "Carga Mental": true,
      "Carga Física": true,
      "Carga Emocional": true,
      "Otros Riesgos": true
  });
  
  const [expandedReqVars, setExpandedReqVars] = useState<Record<string, boolean>>({});
  const [expandedCapVars, setExpandedCapVars] = useState<Record<string, boolean>>({});

  // Helper function for specific interpretation
  const getRequirementInterpretation = (dimension: string, rowId: string, level: string, hoursStr?: string) => {
    // Determine if special interpretation logic applies
    const isSpecialCase = 
        dimension === 'Carga Mental' || 
        dimension === 'Carga Emocional' || 
        rowId === 'cargaPosturalRepetitivo' ||
        rowId === 'manipulacionManualCarga' ||
        rowId === 'coordinacionManipulativa' ||
        rowId === 'trabajoPrecision' ||
        rowId === 'sedestacionMantenida' ||
        rowId === 'bipedestacionMantenida' ||
        rowId === 'marchaTerrenoIrregular';

    if (!isSpecialCase) {
      return REQUIREMENT_DEFINITIONS[level] || '-';
    }

    // Common calculation for special cases
    const totalHours = parseFloat(hoursStr || '0');
    // Format helper
    const fmt = (n: number) => n.toFixed(1).replace('.0', '');

    // 1. SEDESTACIÓN MANTENIDA y BIPEDESTACIÓN
    if (rowId === 'sedestacionMantenida' || rowId === 'bipedestacionMantenida') {
        const h20 = fmt(totalHours * 0.2);
        const h40 = fmt(totalHours * 0.4);
        const h60 = fmt(totalHours * 0.6);

        switch (level) {
            case 'BAJO':
                return `La postura estática (sentado o de pie sin caminar) se mantiene menos del 20% de la jornada (menos de ${h20} horas).`;
            case 'MEDIO':
                return `La postura se mantiene entre el 20% y 40% de la jornada (entre ${h20} y ${h40} horas).`;
            case 'ALTO':
                return `La postura se mantiene entre el 40% y 60% de la jornada (entre ${h40} y ${h60} horas).`;
            case 'MUY_ALTO':
                return `El trabajador permanece en la misma postura (sentado o de pie quieto) más del 60% de su turno (más de ${h60} horas).`;
            default:
                return '-';
        }
    }

    // 2. MARCHA POR TERRENO IRREGULAR
    if (rowId === 'marchaTerrenoIrregular') {
        const h20 = fmt(totalHours * 0.2);
        const h40 = fmt(totalHours * 0.4);
        const h60 = fmt(totalHours * 0.6);

        switch (level) {
            case 'BAJO':
                return `Caminata en terreno llano (oficinas, pasillos) con pequeños desniveles, menos del 20% del tiempo (menos de ${h20} horas).`;
            case 'MEDIO':
                return `Caminata en terreno llano con desniveles medianos (ej. rampas, veredas comunes) entre el 20% y 40% del tiempo (entre ${h20} y ${h40} horas).`;
            case 'ALTO':
                return `Caminata en terreno llano con desniveles medianos de forma frecuente entre 40% a 60% del tiempo, (entre ${h40} y ${h60} horas).`;
            case 'MUY_ALTO':
                return `Se da en dos situaciones de alta exigencia biomecánica: Caminar en terreno irregular con desniveles medianos por más del 60% del tiempo (más de ${h60} horas). Caminar en terreno irregular con grandes desniveles o escalones (ej. trabajo en campo abierto, minería, construcción civil), donde el riesgo es crítico por la naturaleza del terreno.`;
            default:
                return '-';
        }
    }

    // 3. COORDINACIÓN MANIPULATIVA y TRABAJO DE PRECISIÓN
    if (rowId === 'coordinacionManipulativa' || rowId === 'trabajoPrecision') {
        const h40 = fmt(totalHours * 0.4);
        
        switch (level) {
            case 'BAJO':
                return 'Tareas de precisión sencilla (baja exigencia), indistintamente del tiempo de exposición.';
            case 'MEDIO':
                return `Tareas de precisión media realizadas durante menos del 40% de la jornada.(menos de ${h40} horas).`;
            case 'ALTO':
                return `Tareas de precisión media realizadas de forma frecuente, más del 40% de la jornada (más de ${h40} horas).`;
            case 'MUY_ALTO':
                return 'Tareas de precisión elevada (muy fina), indistintamente del tiempo de exposición.';
            default:
                return '-';
        }
    }

    // 4. MANIPULACIÓN MANUAL DE CARGA
    if (rowId === 'manipulacionManualCarga') {
        const h20 = fmt(totalHours * 0.2);
        const h40 = fmt(totalHours * 0.4);
        const isFem = gender === 'Femenino';
        
        // Weight definitions based on gender
        const wMed = isFem ? 'Mujeres: 3-9kg' : 'Varones: 3-15kg';
        const wHigh = isFem ? 'Mujeres: 10-15kg' : 'Varones: 16-25kg';
        const wVeryHigh = isFem ? 'Mujeres >15kg' : 'Varones >25kg';

        switch (level) {
            case 'BAJO':
                return 'Manipulación de cargas ligeras (< 3 kg), riesgo biomecánico insignificante.';
            case 'MEDIO':
                return `Manipulación intermitente (< 40% jornada) (menos de ${h40} horas) de cargas moderadas (${wMed}).`;
            case 'ALTO':
                return `Exposición intensiva a cargas moderadas (> 40% jornada) (menos de ${h40} horas) O exposición esporádica (< 20% jornada) (menos de ${h20} horas) a cargas pesadas (${wHigh}).`;
            case 'MUY_ALTO':
                return `Manipulación frecuente (> 20% jornada) (más de ${h20} horas) de cargas pesadas O levantamiento de pesos que exceden los límites recomendados (${wVeryHigh}).`;
            default:
                return '-';
        }
    }

    // 5. CARGA MENTAL, EMOCIONAL y CARGA POSTURAL
    switch (level) {
        case 'BAJO':
            const h1 = fmt(totalHours * 0.2);
            return `La exigencia es esporádica, ocupando menos del 20% de la jornada laboral (menos de ${h1} horas).`;
        case 'MEDIO':
            const h2a = fmt(totalHours * 0.2);
            const h2b = fmt(totalHours * 0.4);
            return `La exigencia es recurrente, ocupando entre el 20% y 40% de la jornada laboral (entre de ${h2a} y ${h2b} horas).`;
        case 'ALTO':
            const h3a = fmt(totalHours * 0.4);
            const h3b = fmt(totalHours * 0.6);
            return `La exigencia es frecuente, ocupando más del 40% y menos del 60% de la jornada laboral (entre de ${h3a} y ${h3b} horas).`;
        case 'MUY_ALTO':
            const h4 = fmt(totalHours * 0.6);
            return `La exigencia es predominante o continua, ocupando más del 60% de la jornada laboral (más de ${h4} horas).`;
        default:
            return '-';
    }
  };

  // OPTIMIZACIÓN: Memoizar cálculo costoso de scores para evitar recálculos innecesarios
  const { maxScore, contributingVariables } = useMemo(() => {
    let maxScore = 0;
    const contributingVariables: string[] = [];

    JOB_MATRIX_STRUCTURE.forEach(row => {
        // Get Demand Level (0-3)
        const demandKey = row.id as keyof IAssessment;
        const demandVal = assessment[demandKey] as JobDemandLevel;
        const demandLevel = JOB_DEMAND_LEVELS.find(l => l.id === demandVal);
        const demandIndex = demandLevel ? demandLevel.value : -1;

        // Get Capacity Level (0-5)
        const capacityKey = `cap_${row.id}` as keyof IAssessment;
        const capacityVal = assessment[capacityKey] as CapacityLevel;
        const capacityLevel = JOB_CAPACITIES_LEVELS.find(l => l.id === capacityVal);
        const capacityIndex = capacityLevel ? capacityLevel.value : -1;

        if (demandIndex !== -1 && capacityIndex !== -1) {
            const score = SCORE_MATRIX[capacityIndex][demandIndex];
            
            if (score > maxScore) {
                maxScore = score;
                contributingVariables.length = 0; 
                contributingVariables.push(row.label);
            } else if (score === maxScore && score > 0) {
                contributingVariables.push(row.label);
            }
        }
    });

    return { maxScore, contributingVariables };
  }, [assessment]); // Solo recalcular cuando assessment cambie

  const scoreData = useMemo(() => 
    SCORE_INTERPRETATION[maxScore] || { definition: '-', percentage: '0%' },
    [maxScore]
  );

  // Helper to handle radio changes for standard tables
  const handleAssessmentChange = (key: keyof IAssessment, field: keyof AssessmentItem, value: string) => {
    const currentItem = assessment[key] as AssessmentItem;
    onChange({
      ...assessment,
      [key]: { ...currentItem, [field]: value }
    });
  };
  
  const handleMatrixChange = (key: keyof IAssessment, value: string) => {
    onChange({ ...assessment, [key]: value });
  };

  const toggleDimension = (dim: string, type: 'REQUIREMENTS' | 'CAPACITIES') => {
      if (type === 'REQUIREMENTS') {
          setExpandedDimensions(prev => ({ ...prev, [dim]: !prev[dim] }));
      } else {
          setExpandedDimensions(prev => ({ ...prev, [dim]: !prev[dim] }));
      }
  };

  const toggleVariable = (variableKey: string, type: 'REQUIREMENTS' | 'CAPACITIES') => {
      if (type === 'REQUIREMENTS') {
          setExpandedReqVars(prev => ({ ...prev, [variableKey]: !prev[variableKey] }));
      } else {
          setExpandedCapVars(prev => ({ ...prev, [variableKey]: !prev[variableKey] }));
      }
  };

  const renderMatrixTable = (
        items: typeof JOB_MATRIX_STRUCTURE, 
        type: 'REQUIREMENTS' | 'CAPACITIES',
        headerLabel: string,
        expandedDimState: Record<string, boolean>,
        expandedVarState: Record<string, boolean>
    ) => {
      // Group by Dimension
      const grouped: Record<string, typeof JOB_MATRIX_STRUCTURE> = {};
      items.forEach(item => {
          if (!grouped[item.dimension]) grouped[item.dimension] = [];
          grouped[item.dimension].push(item);
      });

      const isRequirements = type === 'REQUIREMENTS';
      const levels = isRequirements ? JOB_DEMAND_LEVELS : JOB_CAPACITIES_LEVELS;

      return (
          <div className="bg-white rounded-lg shadow-sm border border-blue-200 overflow-hidden">
             <table className="w-full border-collapse">
                 <thead>
                     <tr className="bg-blue-50/50 text-blue-900 text-xs uppercase tracking-wider">
                         <th rowSpan={2} className="border border-blue-200 px-4 py-3 font-bold w-[15%] align-middle text-center bg-blue-50/50">Dimensiones</th>
                         <th rowSpan={2} className="border border-blue-200 px-4 py-3 font-bold w-[20%] align-middle text-center bg-blue-50/50">Variable</th>
                         <th rowSpan={2} className="border border-blue-200 px-4 py-3 font-bold w-[25%] align-middle text-center bg-blue-50/50">Característica</th>
                         <th colSpan={levels.length + (isRequirements ? 1 : 0)} className="border border-blue-200 py-2 text-center bg-blue-100/50 font-bold">
                             {headerLabel}
                         </th>
                     </tr>
                     <tr className="bg-blue-50/50 text-blue-900 text-[10px] uppercase tracking-wider">
                        {levels.map((l) => (
                            <th key={l.id} className="border border-blue-200 py-2 px-1 text-center align-middle font-semibold bg-blue-50/50 w-[8%]">
                                {isRequirements ? l.label : ('short' in l ? l.short : l.label)}
                            </th>
                        ))}
                        {isRequirements && (
                            <th className="border border-blue-200 py-2 px-1 text-center align-middle font-semibold bg-blue-50/50 w-[15%]">
                                Interpretación
                            </th>
                        )}
                     </tr>
                 </thead>
                 {Object.entries(grouped).map(([dimension, dimRows]) => {
                     const isDimExpanded = expandedDimState[dimension];
                     
                     // Group by variable within dimension
                     const varGroups: Record<string, typeof dimRows> = {};
                     dimRows.forEach(r => {
                         if(!varGroups[r.variable]) varGroups[r.variable] = [];
                         varGroups[r.variable].push(r);
                     });
                     
                     // Calculate total row span for dimension based on expanded state of variables
                     let dimRowSpan = 0;
                     if (!isDimExpanded) {
                         dimRowSpan = 1;
                     } else {
                         Object.entries(varGroups).forEach(([vKey, vRows]) => {
                             const isVarExpanded = expandedVarState[vKey] ?? true; 
                             dimRowSpan += isVarExpanded ? vRows.length : 1;
                         });
                     }

                     return (
                        <tbody key={dimension} className="border-b border-blue-200 last:border-b-0">
                             {!isDimExpanded ? (
                                 // Collapsed Dimension Row
                                 <tr 
                                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                                    onClick={() => toggleDimension(dimension, type)}
                                 >
                                     <td className="border border-blue-200 px-4 py-3 text-xs font-bold text-slate-700 bg-white align-middle text-center">
                                         <div className="flex items-center justify-center gap-1">
                                             <ChevronRight size={14} className="text-slate-400"/>
                                             {dimension}
                                         </div>
                                     </td>
                                     <td colSpan={2 + levels.length + (isRequirements ? 1 : 0)} className="px-4 py-3 text-xs text-slate-400 italic bg-slate-50/30 text-center">
                                         (Dimension contraída - Click para desplegar)
                                     </td>
                                 </tr>
                             ) : (
                                 // Expanded Dimension - Render Variables
                                 Object.entries(varGroups).map(([variable, varRows], vIdx) => {
                                     const isVarExpanded = expandedVarState[variable] ?? true; // Default to expanded
                                     
                                     return (
                                         <React.Fragment key={variable}>
                                             {isVarExpanded ? (
                                                 // Expanded Variable - Render All Characteristics
                                                 varRows.map((row, rIdx) => {
                                                     const key = isRequirements ? row.id : `cap_${row.id}`;
                                                     const currentValue = assessment[key as keyof IAssessment] as string;
                                                     
                                                     return (
                                                        <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                                                            {/* Dimension Cell - Only on first row of first variable */}
                                                            {vIdx === 0 && rIdx === 0 && (
                                                                <td 
                                                                    rowSpan={dimRowSpan} 
                                                                    className="border border-blue-200 px-4 py-3 text-xs font-bold text-slate-700 bg-white align-top text-center cursor-pointer hover:bg-slate-50"
                                                                    onClick={() => toggleDimension(dimension, type)}
                                                                >
                                                                    <div className="flex flex-col items-center gap-1 sticky top-0">
                                                                        <span>{dimension}</span>
                                                                        <ChevronDown size={12} className="text-blue-400"/>
                                                                    </div>
                                                                </td>
                                                            )}

                                                            {/* Variable Cell - Only on first row of variable */}
                                                            {rIdx === 0 && (
                                                                <td 
                                                                    rowSpan={varRows.length} 
                                                                    className="border border-blue-200 px-3 py-2 text-xs font-semibold text-slate-600 bg-white align-middle text-center cursor-pointer hover:bg-slate-50"
                                                                    onClick={() => toggleVariable(variable, type)}
                                                                >
                                                                    <div className="flex flex-col items-center gap-1">
                                                                        {variable}
                                                                        <ChevronDown size={10} className="text-slate-300"/>
                                                                    </div>
                                                                </td>
                                                            )}

                                                            {/* Characteristic Cell */}
                                                            <td className="border border-blue-200 px-3 py-2 text-xs text-slate-600 bg-white/50 align-middle">
                                                                {row.label}
                                                            </td>

                                                            {/* Levels */}
                                                            {levels.map((level) => (
                                                                <td key={level.id} className="border border-blue-200 px-1 py-2 text-center align-middle">
                                                                    <CustomRadio 
                                                                        checked={currentValue === level.id}
                                                                        onChange={() => !readOnly && handleMatrixChange(key as keyof IAssessment, level.id)}
                                                                        disabled={readOnly}
                                                                        title={level.label}
                                                                    />
                                                                </td>
                                                            ))}

                                                            {/* Interpretation Column */}
                                                            {isRequirements && (
                                                                <td className="border border-blue-200 px-2 py-2 text-[10px] text-slate-500 bg-slate-50/30 text-center italic leading-tight align-middle">
                                                                    {getRequirementInterpretation(dimension, row.id, currentValue, hoursPerDay)}
                                                                </td>
                                                            )}
                                                        </tr>
                                                     );
                                                 })
                                             ) : (
                                                 // Collapsed Variable Row
                                                 <tr className="hover:bg-slate-50/30 transition-colors">
                                                     {/* Dimension Cell - If this is the first variable and it's collapsed, it still needs to span */}
                                                     {vIdx === 0 && (
                                                        <td 
                                                            rowSpan={dimRowSpan} 
                                                            className="border border-blue-200 px-4 py-3 text-xs font-bold text-slate-700 bg-white align-top text-center cursor-pointer hover:bg-slate-50"
                                                            onClick={() => toggleDimension(dimension, type)}
                                                        >
                                                            <div className="flex flex-col items-center gap-1">
                                                                <span>{dimension}</span>
                                                                <ChevronDown size={12} className="text-blue-400"/>
                                                            </div>
                                                        </td>
                                                     )}
                                                     
                                                     {/* Variable Cell (Collapsed) */}
                                                     <td 
                                                        className="border border-blue-200 px-3 py-2 text-xs font-semibold text-slate-600 bg-white align-middle text-center cursor-pointer hover:bg-slate-50"
                                                        onClick={() => toggleVariable(variable, type)}
                                                     >
                                                        <div className="flex items-center justify-center gap-2">
                                                            <ChevronRight size={10} className="text-slate-400"/>
                                                            {variable}
                                                        </div>
                                                     </td>

                                                     <td colSpan={1 + levels.length + (isRequirements ? 1 : 0)} className="border border-blue-200 px-3 py-2 text-[10px] text-slate-400 italic text-center">
                                                         ...
                                                     </td>
                                                 </tr>
                                             )}
                                         </React.Fragment>
                                     );
                                 })
                             )}
                        </tbody>
                     );
                 })}
             </table>
          </div>
      );
  };

  const renderLegacyTable = (
      title: string, 
      items: { key: string, label: string }[], 
      isSafety = false,
      isLateralidad = false
    ) => (
    <div className="bg-white rounded-lg border border-blue-200 overflow-hidden shadow-sm">
        <div className="bg-slate-50 px-4 py-3 border-b border-blue-100 flex items-center justify-between">
            <h5 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                {title}
            </h5>
            {isLateralidad && (
                <div className="flex items-center gap-2 text-xs font-normal bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">
                    <span className="text-slate-500 font-semibold">Lateralidad Afectada:</span>
                    <select 
                    value={assessment.lateralidad || ''}
                    onChange={(e) => onChange({...assessment, lateralidad: e.target.value as any})}
                    disabled={readOnly}
                    className="bg-transparent text-blue-700 font-bold focus:outline-none cursor-pointer"
                    >
                        <option value="Ninguno">Ninguno</option>
                        <option value="Derecha">Derecha</option>
                        <option value="Izquierda">Izquierda</option>
                        <option value="Bilateral">Bilateral</option>
                    </select>
                </div>
            )}
        </div>
        <table className="w-full text-sm border-collapse">
            <thead>
                <tr className="bg-blue-50/50 text-blue-900 text-xs uppercase tracking-wider border-b border-blue-100">
                    <th className="px-4 py-3 text-left w-[40%] font-semibold">Característica</th>
                    <th className="px-4 py-3 text-center w-[25%] font-semibold">Nivel / Frecuencia</th>
                    <th className="px-4 py-3 text-left w-[35%] font-semibold">Observaciones / Detalle</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
                {items.map((item, idx) => {
                     const bgRow = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30';
                     const currentVal = (assessment[item.key as keyof IAssessment] as AssessmentItem).value;
                     const currentDetail = (assessment[item.key as keyof IAssessment] as AssessmentItem).detail;

                     return (
                        <tr key={item.key} className={`${bgRow} hover:bg-blue-50 transition-colors`}>
                            <td className="px-4 py-3 text-slate-700 font-medium align-middle">
                                {item.label}
                            </td>
                            <td className="px-4 py-3 align-middle">
                                <div className="flex items-center justify-center gap-2 flex-wrap">
                                    {isSafety 
                                        ? SAFETY_OPTS.map((opt) => {
                                            const isSelected = currentVal === opt;
                                            let btnClass = "px-3 py-1 rounded-full text-[10px] font-bold border transition-all shadow-sm ";
                                            
                                            if (isSelected) {
                                                if (opt === 'APTO') btnClass += "bg-emerald-500 border-emerald-600 text-white shadow-emerald-200";
                                                else if (opt === 'NO APTO') btnClass += "bg-red-500 border-red-600 text-white shadow-red-200";
                                                else btnClass += "bg-blue-600 border-blue-700 text-white shadow-blue-200";
                                            } else {
                                                btnClass += "bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600";
                                            }

                                            return (
                                                <button
                                                    key={opt}
                                                    onClick={() => !readOnly && handleAssessmentChange(item.key as keyof IAssessment, 'value', opt)}
                                                    disabled={readOnly}
                                                    className={btnClass}
                                                >
                                                    {opt}
                                                </button>
                                            );
                                        })
                                        : FREQUENCY_OPTS.map((opt) => {
                                            const isSelected = currentVal === opt;
                                            return (
                                                <button
                                                    key={opt}
                                                    onClick={() => !readOnly && handleAssessmentChange(item.key as keyof IAssessment, 'value', opt)}
                                                    disabled={readOnly}
                                                    className={`
                                                        w-8 h-8 rounded-full text-xs font-bold transition-all border
                                                        flex items-center justify-center
                                                        ${isSelected 
                                                            ? 'bg-blue-600 border-blue-700 text-white shadow-md ring-2 ring-blue-100' 
                                                            : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:shadow-sm'}
                                                    `}
                                                >
                                                    {opt}
                                                </button>
                                            )
                                        })
                                    }
                                </div>
                            </td>
                            <td className="px-4 py-3 align-middle">
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        placeholder={isSafety ? "Detalle" : "Observación"}
                                        value={currentDetail}
                                        onChange={(e) => !readOnly && handleAssessmentChange(item.key as keyof IAssessment, 'detail', e.target.value)}
                                        disabled={readOnly}
                                        className="w-full text-xs px-3 py-2 bg-slate-50 border border-transparent rounded-lg focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder-slate-400 text-slate-700"
                                    />
                                </div>
                            </td>
                        </tr>
                     );
                })}
            </tbody>
        </table>
    </div>
  );

  return (
    <div className={`space-y-8 animate-in fade-in slide-in-from-right-8 duration-500 ${readOnly ? 'opacity-90 pointer-events-none' : ''}`}>
      
      {/* 1. MATRIZ DE REQUERIMIENTOS DEL PUESTO */}
      {showRequirementsMatrix && (
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-blue-100 pb-4">
             <div>
                <h4 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                  <Briefcase size={20} />
                  1. Evaluación de Requerimientos del Puesto
                </h4>
                <p className="text-sm text-slate-500 mt-1">
                   Identificación de las dimensiones, variables y características según el puesto.
                </p>
             </div>
          </div>

          {/* Legend Above Table 1 */}
          <div className="mb-6 bg-blue-50/50 rounded-xl border border-blue-100 p-4">
              <h5 className="text-xs font-bold text-blue-800 mb-3 uppercase tracking-wide">
                  Leyenda de Requerimientos del Puesto:
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {JOB_DEMAND_LEVELS.map((level) => (
                      <div key={level.id} className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm flex flex-col gap-1">
                          <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                              {level.label}
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight">
                              {REQUIREMENT_DEFINITIONS[level.id]}
                          </p>
                      </div>
                  ))}
              </div>
          </div>

          {/* Matrix Table with new column */}
          {renderMatrixTable(JOB_MATRIX_STRUCTURE, 'REQUIREMENTS', 'REQUERIMIENTOS', expandedDimensions, expandedReqVars)}
        </div>
      )}

      {/* 2. MATRIZ DE CAPACIDADES DEL TRABAJADOR */}
      {showCapacitiesMatrix && (
          <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-blue-100 pb-4">
                <div>
                    <h4 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                        <Activity size={20} />
                        2. Valoración de Capacidades del Trabajador
                    </h4>
                    <p className="text-sm text-slate-500 mt-1">
                        Evaluación de las capacidades funcionales actuales del trabajador.
                    </p>
                </div>
            </div>

            {/* Legend Above Table 2 (Justified Left) */}
            <div className="mb-6 bg-blue-50/50 rounded-xl border border-blue-100 p-4">
                <h5 className="text-xs font-bold text-blue-800 mb-3 uppercase tracking-wide">Leyenda de Capacidades:</h5>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {JOB_CAPACITIES_LEVELS.map(l => (
                        <div key={l.id} className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm flex flex-col gap-1 text-left items-start">
                            <div className="text-xs font-bold text-blue-600 border-b border-blue-50 pb-1 w-full mb-1">
                                {l.short}
                            </div>
                            <p className="text-[10px] text-slate-500 leading-tight text-left">
                                {l.label}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
               {/* Matrix Table */}
               <div className="flex-1 w-full">
                   {renderMatrixTable(JOB_MATRIX_STRUCTURE, 'CAPACITIES', 'CAPACIDADES', expandedDimensions, expandedCapVars)}
               </div>
            </div>
          </div>
      )}

      {/* 3. EVALUACIÓN DEL ROL LABORAL (Comparison) */}
      {showCapacitiesMatrix && (
          <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6">
             <div className="border-b border-blue-100 pb-4 mb-6">
                 <h4 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                    <Calculator size={20} />
                    3. Comparación y Decisión
                 </h4>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                 <div className="md:col-span-1 flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-slate-200">
                     <span className="text-sm font-semibold text-slate-500 mb-2 uppercase tracking-wide">Puntaje del Rol Laboral</span>
                     <div className={`text-6xl font-black ${
                         maxScore === 0 ? 'text-emerald-500' : 
                         maxScore <= 2 ? 'text-amber-500' : 
                         'text-red-600'
                     }`}>
                         {maxScore}
                     </div>
                     <span className="text-xs text-slate-400 mt-2 font-medium">(Máximo encontrado)</span>
                 </div>

                 <div className="md:col-span-2 space-y-4">
                     <div>
                         <h5 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <AlertTriangle size={16} className="text-amber-500" />
                            Variables críticas identificadas:
                         </h5>
                         {contributingVariables.length > 0 ? (
                             <div className="flex flex-wrap gap-2">
                                 {contributingVariables.map((v, i) => (
                                     <span key={i} className="px-2.5 py-1 rounded-md bg-red-50 text-red-700 text-xs font-semibold border border-red-100">
                                         {v}
                                     </span>
                                 ))}
                             </div>
                         ) : (
                             <p className="text-sm text-slate-500 italic">Ninguna (Sin restricciones significativas)</p>
                         )}
                     </div>

                     <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                         <div className="flex items-start gap-3">
                             <Info size={18} className="text-blue-500 mt-0.5" />
                             <div>
                                 <h5 className="text-xs font-bold text-blue-800 uppercase mb-1">
                                    Interpretación del Resultado
                                 </h5>
                                 <p className="text-sm text-blue-900 font-medium leading-snug">
                                     {scoreData.definition}
                                 </p>
                                 <div className="mt-2 inline-flex items-center px-2 py-1 bg-white border border-blue-200 rounded text-xs font-bold text-slate-600 shadow-sm">
                                     Porcentaje de Restricción Estimado: <span className="ml-1 text-blue-600">{scoreData.percentage}</span>
                                 </div>
                             </div>
                         </div>
                     </div>
                 </div>
             </div>
          </div>
      )}

      {/* Legacy Functional Assessment (conditionally hidden for step 2.1) */}
      {!hideFunctionalCapacity && (
          <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6 mt-8">
            <h4 className="text-lg font-bold text-blue-900 border-b border-blue-100 pb-3 mb-6 drop-shadow-sm flex items-center gap-2">
              <Activity size={20} />
              4. Evaluación de Capacidad Funcional (Físico - Músculo Esquelético)
            </h4>

            {/* Legacy Legend */}
            <div className="flex flex-wrap gap-4 mb-6 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
              <span className="font-bold text-blue-900">Leyenda:</span>
              {FREQUENCY_OPTS.map(opt => (
                <span key={opt} className="flex items-center gap-1.5 bg-white px-2 py-1 rounded shadow-sm border border-slate-100">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">{opt}</span>
                  <span className="text-slate-600 font-medium">
                    {opt === 'N' ? 'Nunca' : opt === 'O' ? 'Ocasional' : opt === 'F' ? 'Frecuente' : 'Constante'}
                  </span>
                </span>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* I. LOCOMOCIÓN */}
              {renderLegacyTable(
                  "I. Locomoción y Postura",
                  [
                      { key: 'deambulacion', label: 'Deambulación' },
                      { key: 'terrenoIrregular', label: 'Terreno irregular' },
                      { key: 'escalerasFijas', label: 'Escaleras fijas' },
                      { key: 'escalasVerticales', label: 'Escalas verticales' },
                      { key: 'bipedestacion', label: 'Bipedestación' },
                      { key: 'sedestacion', label: 'Sedestación' },
                      { key: 'arrodillarse', label: 'Arrodillarse' }
                  ]
              )}

              {/* II. CARGAS */}
              {renderLegacyTable(
                  "II. Manipulación de Cargas",
                  [
                      { key: 'levantamientoSuelo', label: 'Levantamiento desde suelo' },
                      { key: 'levantamientoCintura', label: 'Levantamiento desde cintura' },
                      { key: 'transporteCarga', label: 'Transporte de carga' },
                      { key: 'empujeTraccion', label: 'Empuje y tracción' }
                  ]
              )}

              {/* III. MIEMBROS SUPERIORES */}
              {renderLegacyTable(
                  "III. Miembros Superiores",
                  [
                      { key: 'hombro', label: 'Hombro (encima de cabeza)' },
                      { key: 'alcanceFrontal', label: 'Alcance frontal' },
                      { key: 'agarreFuerza', label: 'Agarre de fuerza' },
                      { key: 'motricidadFina', label: 'Motricidad fina' }
                  ],
                  false,
                  true // isLateralidad
              )}

              {/* IV. SEGURIDAD */}
              {renderLegacyTable(
                  "IV. Seguridad, Alerta y Entorno",
                  [
                      { key: 'vehiculosLivianos', label: 'Cond. Vehículos Livianos' },
                      { key: 'maquinariaPesada', label: 'Oper. Maquinaria Pesada' },
                      { key: 'trabajosAltura', label: 'Trabajos en Altura (>1.8m)' },
                      { key: 'vibracion', label: 'Exposición a Vibración' },
                      { key: 'turnoNocturno', label: 'Turno Nocturno' }
                  ],
                  true // isSafety
              )}
            </div>
          
            {/* Pharmacological Alert */}
            <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
               <div className="flex items-center gap-3">
                   <ShieldAlert className="text-amber-500" size={24} />
                   <div>
                       <h5 className="text-sm font-bold text-amber-900">Alerta Farmacológica</h5>
                       <p className="text-xs text-amber-700">¿El tratamiento actual genera somnolencia o afecta la alerta?</p>
                   </div>
               </div>
               <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-amber-100 shadow-sm">
                      <input 
                        type="radio" 
                        name="alertaFarmacologica" 
                        value="SIN_EFECTO"
                        checked={assessment.alertaFarmacologica === 'SIN_EFECTO'}
                        onChange={() => onChange({...assessment, alertaFarmacologica: 'SIN_EFECTO'})}
                        disabled={readOnly}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-medium text-slate-700">Sin Efecto</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-amber-100 shadow-sm">
                      <input 
                        type="radio" 
                        name="alertaFarmacologica" 
                        value="CON_EFECTO"
                        checked={assessment.alertaFarmacologica === 'CON_EFECTO'}
                        onChange={() => onChange({...assessment, alertaFarmacologica: 'CON_EFECTO'})}
                        disabled={readOnly}
                        className="w-4 h-4 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-sm font-bold text-red-700">Con Efecto (Riesgo)</span>
                  </label>
               </div>
            </div>

          </div>
      )}
      
      {/* Conclusion & Signature Block */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6">
        <h4 className="text-lg font-bold text-blue-900 border-b border-blue-100 pb-3 mb-6 drop-shadow-sm">Conclusiones Médicas</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Diagnóstico Médico (CIE-10)</label>
                  {assessment.diagnosticos.map((diag, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                       <input 
                          type="text" 
                          placeholder="Descripción del diagnóstico"
                          value={diag.descripcion}
                          onChange={(e) => {
                             const newDiags = [...assessment.diagnosticos];
                             newDiags[index].descripcion = e.target.value;
                             onChange({...assessment, diagnosticos: newDiags});
                          }}
                          disabled={readOnly}
                          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                       />
                       <input 
                          type="text" 
                          placeholder="CIE-10"
                          value={diag.cie10}
                          onChange={(e) => {
                             const newDiags = [...assessment.diagnosticos];
                             newDiags[index].cie10 = e.target.value;
                             onChange({...assessment, diagnosticos: newDiags});
                          }}
                          disabled={readOnly}
                          className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                       />
                       {!readOnly && assessment.diagnosticos.length > 1 && (
                           <button 
                             onClick={() => {
                                 const newDiags = assessment.diagnosticos.filter((_, i) => i !== index);
                                 onChange({...assessment, diagnosticos: newDiags});
                             }}
                             className="text-slate-400 hover:text-red-500"
                           >
                               <Trash2 size={18} />
                           </button>
                       )}
                    </div>
                  ))}
                  {!readOnly && (
                      <button 
                        onClick={() => onChange({...assessment, diagnosticos: [...assessment.diagnosticos, { descripcion: '', cie10: '' }]})}
                        className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"
                      >
                          <Plus size={14} /> Agregar Diagnóstico
                      </button>
                  )}
                </div>
            </div>

            <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Fecha de Inicio</label>
                        <input 
                            type="date"
                            value={assessment.indicacionInicio}
                            onChange={(e) => onChange({...assessment, indicacionInicio: e.target.value})}
                            disabled={readOnly}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Duración (Días)</label>
                        <input 
                            type="number"
                            placeholder="Ej. 7"
                            value={assessment.indicacionDuracion}
                            onChange={(e) => onChange({...assessment, indicacionDuracion: e.target.value})}
                            disabled={readOnly}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                        />
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Médico Responsable</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text"
                            placeholder="Nombre del Médico Ocupacional"
                            value={assessment.medicoNombre}
                            onChange={(e) => onChange({...assessment, medicoNombre: e.target.value})}
                            disabled={readOnly}
                            className="w-full pl-10 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none font-medium"
                        />
                    </div>
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
}
