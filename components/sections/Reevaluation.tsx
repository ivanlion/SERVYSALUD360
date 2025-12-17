'use client';

import React, { useEffect } from 'react';
import { CaseData, Reevaluation as IReevaluation, createNewReevaluation } from '../../types';
import { Plus, Trash2, Calendar, Clock, Stethoscope, User, Lock, CheckCircle } from 'lucide-react';

interface ReevaluationProps {
  data: CaseData;
  onChange: (updates: Partial<CaseData>) => void;
  readOnly?: boolean;
}

interface ReevaluationCardProps {
  index: number;
  data: IReevaluation;
  onUpdate: (id: string, field: keyof IReevaluation, value: any) => void;
  onRemove: (id: string) => void;
  readOnly?: boolean;
}

const ReevaluationCard: React.FC<ReevaluationCardProps> = ({ 
  index, 
  data, 
  onUpdate,
  onRemove,
  readOnly,
}) => {
  
  const radioClass = "appearance-none w-5 h-5 rounded-full border-2 border-blue-200 checked:bg-blue-600 checked:border-blue-600 focus:ring-2 focus:ring-blue-200 bg-white cursor-pointer shadow-sm transition-all";
  
  const getInputClass = (value: string | number) => {
    const base = "w-full rounded-lg border text-sm shadow-sm p-2.5 transition-all outline-none ";
    if (readOnly) return base + "border-blue-200 bg-blue-50/50 text-slate-500";

    const strVal = String(value);
    if (strVal && strVal !== '0' && strVal.length > 0) {
         return base + "border-emerald-400 focus:ring-2 focus:ring-emerald-500/50 bg-emerald-50/20 text-slate-800 shadow-emerald-50";
    }
    return base + "border-blue-200 focus:ring-2 focus:ring-blue-500/50 bg-white placeholder-blue-300 text-slate-700 hover:border-blue-400";
  };

  // Determine styles based on type (Standard vs Specialty)
  const isSpecialty = data.esEspecialidad;
  const cardBorderClass = isSpecialty ? "border-purple-200" : "border-blue-200";
  const headerBgClass = isSpecialty ? "bg-purple-50 border-purple-100" : "bg-white border-blue-100";
  const headerTextClass = isSpecialty ? "text-purple-900" : "text-blue-900";
  const badgeClass = isSpecialty 
    ? "bg-purple-100 text-purple-700 border-purple-200" 
    : "bg-blue-100 text-blue-700 border-blue-200";

  return (
    <div className={`bg-white border ${cardBorderClass} rounded-xl shadow-sm p-6 mb-8 hover:shadow-md transition-all duration-300 relative animate-in fade-in slide-in-from-bottom-4`}>
      {/* Header with numbering and delete button */}
      <div className={`flex justify-between items-center border-b ${isSpecialty ? 'border-purple-100' : 'border-blue-100'} pb-3 mb-6 rounded-t-lg -mx-6 -mt-6 p-6 ${headerBgClass}`}>
         <h4 className={`text-lg font-bold ${headerTextClass} drop-shadow-sm flex items-center gap-2`}>
            <span className={`${badgeClass} w-8 h-8 rounded-full flex items-center justify-center text-sm border`}>
                #{index + 1}
            </span>
            {isSpecialty ? 'Reevaluación por Especialidad' : 'Reevaluación de Seguimiento'}
            {isSpecialty && <Stethoscope size={20} className="text-purple-600 ml-2" />}
         </h4>
         {!readOnly && (
             <button 
                onClick={() => onRemove(data.id)}
                className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg bg-white/50"
                title="Eliminar esta reevaluación"
             >
                <Trash2 size={18} />
             </button>
         )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
             <Calendar size={14} className={isSpecialty ? "text-purple-500" : "text-blue-500"} />
             Fecha Reevaluación (Automática)
          </label>
          <input
            type="date"
            value={data.fecha}
            readOnly={true}
            className={`${getInputClass(data.fecha)} bg-slate-100 cursor-not-allowed font-medium`}
          />
          <span className={`text-[10px] ${isSpecialty ? 'text-purple-500' : 'text-blue-500'} mt-1 block`}>
             * Se calcula basada en la evaluación anterior + días.
          </span>
        </div>
        
        {isSpecialty ? (
            <div className="animate-in fade-in">
               <label className="block text-sm font-semibold text-purple-800 mb-2 flex items-center gap-2">
                 <User size={16} className="text-purple-600" />
                 Médico Especialista
               </label>
               <input
                type="text"
                value={data.nombreEspecialista || ''}
                onChange={(e) => onUpdate(data.id, 'nombreEspecialista', e.target.value)}
                disabled={readOnly}
                placeholder="Nombre del especialista que realiza la reevaluación..."
                className={getInputClass(data.nombreEspecialista || '')}
              />
            </div>
        ) : (
            <div className={`flex items-center gap-6 pt-6 p-4 rounded-lg border transition-colors ${data.tipo ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50/30 border-blue-100'}`}>
              <label className={`inline-flex items-center ${readOnly ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:scale-105'} transition-transform`}>
                <input 
                  type="radio" 
                  checked={data.tipo === 'CONTINUACION'} 
                  onChange={() => onUpdate(data.id, 'tipo', 'CONTINUACION')}
                  disabled={readOnly}
                  className={radioClass}
                />
                <span className="ml-2 text-sm font-medium text-slate-700">Continuación</span>
              </label>
               <label className={`inline-flex items-center ${readOnly ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:scale-105'} transition-transform`}>
                <input 
                  type="radio" 
                  checked={data.tipo === 'ALTA'} 
                  onChange={() => onUpdate(data.id, 'tipo', 'ALTA')}
                  disabled={readOnly}
                  className={radioClass}
                />
                <span className="ml-2 text-sm font-medium text-slate-700">Alta</span>
              </label>
            </div>
        )}
      </div>

      {!isSpecialty && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Nº Días Adicionales (Extensión)</label>
              <input
                type="number"
                value={data.diasAdicionales}
                onChange={(e) => onUpdate(data.id, 'diasAdicionales', parseInt(e.target.value) || 0)}
                disabled={readOnly || data.tipo === 'ALTA'}
                className={getInputClass(data.diasAdicionales)}
              />
              {data.tipo === 'ALTA' && (
                  <span className="text-[10px] text-emerald-600 font-bold mt-1 block">
                    * Al dar de Alta, no se suman días adicionales.
                  </span>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Clock size={14} className="text-orange-500" />
                Total Días Acumulados
              </label>
              <input
                type="number"
                value={data.totalDias}
                className="w-full rounded-lg border border-blue-200 bg-blue-50/50 p-2.5 text-sm cursor-not-allowed text-slate-600 font-bold"
                readOnly
              />
            </div>
          </div>
      )}

      <div className="mb-0">
        <label className="block text-sm font-semibold text-slate-700 mb-2">Comentarios Médicos</label>
        <textarea
          value={data.comentarios}
          onChange={(e) => onUpdate(data.id, 'comentarios', e.target.value)}
          disabled={readOnly}
          rows={3}
          className={`${getInputClass(data.comentarios)}`}
          placeholder="Evolución del paciente..."
        />
      </div>
    </div>
  );
}

export default function Reevaluation({ data, onChange, readOnly = false }: ReevaluationProps) {
  
  const parseDays = (str: string): number => {
    if (!str) return 0;
    const nums = str.replace(/\D/g, '');
    return parseInt(nums) || 0;
  };

  const calculateDate = (startStr: string, daysToAdd: number): string => {
    if (!startStr) return '';
    const parts = startStr.split('-');
    if (parts.length !== 3) return '';
    // Use 12:00 to avoid timezone rollovers
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
    date.setDate(date.getDate() + daysToAdd);
    
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Main Effect: Recalculate Dates and Totals
  useEffect(() => {
    const baseStart = data.assessment.indicacionInicio;
    const baseDuration = parseDays(data.assessment.indicacionDuracion);

    if (!baseStart) return;

    let hasChanges = false;
    const updatedReevaluaciones = data.reevaluaciones.map((reeval, index) => {
        let expectedDate = '';
        if (index === 0) {
            expectedDate = calculateDate(baseStart, baseDuration);
        } else {
            const prevReeval = data.reevaluaciones[index - 1];
            if (prevReeval.fecha) {
                 // Important: If previous was ALTA, usually daysAdicionales is 0 or irrelevant, 
                 // but normally we shouldn't even have a next reeval if previous was ALTA.
                 expectedDate = calculateDate(prevReeval.fecha, prevReeval.diasAdicionales || 0);
            }
        }

        let accumulatedTotal = baseDuration;
        for (let i = 0; i <= index; i++) {
             // If type is ALTA, we typically assume 0 additional days for THAT entry, 
             // but if user entered something, we sum it. However, the UI disables input on ALTA.
             accumulatedTotal += (data.reevaluaciones[i].diasAdicionales || 0);
        }

        if (reeval.fecha !== expectedDate || reeval.totalDias !== accumulatedTotal) {
            hasChanges = true;
            return { ...reeval, fecha: expectedDate, totalDias: accumulatedTotal };
        }
        
        return reeval;
    });

    if (hasChanges) {
        onChange({ reevaluaciones: updatedReevaluaciones });
    }

  }, [
      data.assessment.indicacionInicio, 
      data.assessment.indicacionDuracion, 
      JSON.stringify(data.reevaluaciones.map(r => ({ d: r.diasAdicionales, f: r.fecha }))) 
  ]);

  // Check if ALTA has been triggered in any reevaluation
  const isDischarged = data.reevaluaciones.some(r => r.tipo === 'ALTA');

  const handleAddReevaluation = (isSpecialty = false) => {
     if (isDischarged) return; // Prevent adding if discharged
     const newReeval = createNewReevaluation(isSpecialty);
     onChange({ reevaluaciones: [...data.reevaluaciones, newReeval] });
  };

  const handleRemoveReevaluation = (id: string) => {
      const filtered = data.reevaluaciones.filter(r => r.id !== id);
      onChange({ reevaluaciones: filtered });
  };

  const handleUpdateReevaluation = (id: string, field: keyof IReevaluation, value: any) => {
      // If setting to ALTA, force diasAdicionales to 0
      let extraUpdates = {};
      if (field === 'tipo' && value === 'ALTA') {
          extraUpdates = { diasAdicionales: 0 };
      }

      const updated = data.reevaluaciones.map(r => 
          r.id === id ? { ...r, [field]: value, ...extraUpdates } : r
      );
      onChange({ reevaluaciones: updated });
  };

  return (
    <div className={`space-y-8 animate-in fade-in slide-in-from-right-8 duration-500 ${readOnly ? 'opacity-80 pointer-events-none' : ''}`}>
      <div>
        <h3 className="text-xl font-bold text-blue-900 mb-2 drop-shadow-sm">Sección D & E: Seguimiento y Evolución</h3>
        <p className="text-sm text-slate-500 mb-6">
            Gestione las múltiples reevaluaciones del paciente. Las fechas se encadenan automáticamente.
        </p>

        {data.reevaluaciones.length === 0 && (
            <div className="bg-blue-50 border border-blue-200 border-dashed rounded-xl p-8 text-center mb-6">
                <p className="text-slate-500 mb-4">No se han registrado reevaluaciones para este caso.</p>
                {!readOnly && (
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button 
                          onClick={() => handleAddReevaluation(false)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-md hover:-translate-y-0.5"
                      >
                          <Plus size={18} />
                          Agregar Reevaluación por Medico Ocupacional
                      </button>
                      <button 
                          onClick={() => handleAddReevaluation(true)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-purple-600 border border-purple-200 rounded-lg font-bold hover:bg-purple-50 transition-all shadow-sm hover:shadow-md"
                      >
                          <Stethoscope size={18} />
                          Agregar Reevaluación por Medico Especialista
                      </button>
                    </div>
                )}
            </div>
        )}
        
        {data.reevaluaciones.map((reeval, idx) => (
            <ReevaluationCard 
                key={reeval.id}
                index={idx}
                data={reeval}
                onUpdate={handleUpdateReevaluation}
                onRemove={handleRemoveReevaluation}
                readOnly={readOnly}
            />
        ))}

        {/* Buttons / Actions Block */}
        {data.reevaluaciones.length > 0 && !readOnly && (
            <div className="flex flex-col items-center justify-center mb-8">
                 {isDischarged ? (
                     <div className="w-full max-w-2xl bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-center gap-3 animate-in fade-in zoom-in-95">
                        <CheckCircle className="text-emerald-600" size={24} />
                        <div>
                            <p className="text-emerald-800 font-bold">Alta Médica Registrada</p>
                            <p className="text-xs text-emerald-600">No es posible agregar más reevaluaciones cuando la condición final es ALTA.</p>
                        </div>
                     </div>
                 ) : (
                     <div className="flex flex-col sm:flex-row gap-4">
                        <button 
                            onClick={() => handleAddReevaluation(false)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-blue-600 border border-blue-200 rounded-lg font-bold hover:bg-blue-50 transition-all shadow-sm hover:shadow-md"
                        >
                            <Plus size={18} />
                            Agregar Reevaluación por Medico Ocupacional
                        </button>
                        <button 
                            onClick={() => handleAddReevaluation(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-purple-600 border border-purple-200 rounded-lg font-bold hover:bg-purple-50 transition-all shadow-sm hover:shadow-md"
                        >
                            <Stethoscope size={18} />
                            Agregar Reevaluación por Medico Especialista
                        </button>
                    </div>
                 )}
            </div>
        )}

      </div>

       <div className="flex items-center gap-4 p-6 bg-white rounded-xl border-l-4 border-l-blue-600 shadow-md hover:shadow-lg transition-all border border-blue-200">
         <div className="flex-1">
           <h4 className="text-lg font-bold text-blue-900">Estado General del Caso</h4>
           <p className="text-sm text-slate-500 mt-1">Cambiar a 'Cerrado' solo si se ha dado el Alta Definitiva.</p>
         </div>
         <div className="relative">
            <select 
              value={data.status}
              onChange={(e) => onChange({ status: e.target.value as any })}
              disabled={readOnly}
              className={`
                appearance-none pl-4 pr-10 py-3 rounded-lg border text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors
                ${readOnly ? 'cursor-not-allowed opacity-70 bg-blue-50' : 'cursor-pointer'}
                ${data.status === 'ACTIVO' ? 'bg-blue-50 border-blue-200 text-blue-700 focus:ring-blue-500' : 'bg-slate-50 border-slate-200 text-slate-700 focus:ring-slate-500'}
              `}
            >
              <option value="ACTIVO">ACTIVO</option>
              <option value="CERRADO">CERRADO</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
              <Lock size={14} />
            </div>
         </div>
       </div>
    </div>
  );
}
