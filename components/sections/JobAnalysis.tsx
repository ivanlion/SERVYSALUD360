'use client';

import React from 'react';
import { CaseData } from '../../types';

interface JobAnalysisProps {
  data: CaseData;
  onChange: (updates: Partial<CaseData>) => void;
  readOnly?: boolean;
}

export default function JobAnalysis({ data, onChange, readOnly = false }: JobAnalysisProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    onChange({ [e.target.name]: e.target.value });
  };

  const getInputClass = (value: string) => {
    const base = "w-full rounded-lg border shadow-sm p-3 transition-all outline-none ";
    if (readOnly) return base + "border-blue-200 bg-blue-50/50 text-slate-500";
    
    // Filled State -> Emerald
    if (value && value.length > 0) {
        return base + "border-emerald-400 focus:ring-2 focus:ring-emerald-500/50 bg-emerald-50/20 text-slate-800 shadow-emerald-50";
    }
    // Empty State -> Blue
    return base + "border-blue-200 focus:ring-2 focus:ring-blue-500/50 bg-white placeholder-blue-300 text-slate-800 hover:border-blue-400";
  };

  return (
    <div className={`space-y-4 sm:space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-right-8 duration-500 ${readOnly ? 'opacity-80 pointer-events-none' : ''}`}>
      
      {/* Section B */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-4 sm:p-6 hover:shadow-md transition-shadow duration-300">
        <h3 className="text-lg sm:text-xl font-bold text-blue-900 border-b border-blue-100 pb-2 sm:pb-3 mb-4 sm:mb-6 drop-shadow-sm">
          Sección B: Evaluación del Puesto de Trabajo e IPERC
          <span className="block text-xs sm:text-sm font-medium text-blue-600 mt-1">A completar por Médico Ocupacional y Supervisor</span>
        </h3>
        
        <div className="space-y-4 sm:space-y-6">
           <div>
             <label className="block text-sm font-semibold text-slate-700 mb-2">Descripción de las tareas a realizar</label>
             <textarea
                name="tareasRealizar"
                value={data.tareasRealizar}
                onChange={handleChange}
                disabled={readOnly}
                rows={3}
                className={getInputClass(data.tareasRealizar)}
                placeholder="Describa las tareas específicas permitidas..."
             />
           </div>

           <div>
             <label className="block text-sm font-semibold text-slate-700 mb-2">Área y lugar de labor</label>
             <input
                type="text"
                name="areaLugar"
                value={data.areaLugar}
                onChange={handleChange}
                disabled={readOnly}
                className={getInputClass(data.areaLugar)}
             />
           </div>

           <div>
             <label className="block text-sm font-semibold text-slate-700 mb-2">Descripción de principales tareas</label>
             <textarea
                name="tareasPrincipales"
                value={data.tareasPrincipales}
                onChange={handleChange}
                disabled={readOnly}
                rows={3}
                className={getInputClass(data.tareasPrincipales)}
             />
           </div>
        </div>
      </div>

      {/* Section C */}
      <div className="bg-gradient-to-br from-blue-50/30 to-white p-4 sm:p-6 rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-all">
        <h3 className="text-lg sm:text-xl font-bold text-blue-900 border-b border-blue-100 pb-2 sm:pb-3 mb-4 sm:mb-6 drop-shadow-sm">
          Sección C: Compromiso de Trabajo Modificado
          <span className="block text-xs sm:text-sm font-medium text-blue-600 mt-1">Supervisor del trabajador</span>
        </h3>

        <div>
             <label className="block text-sm font-semibold text-slate-700 mb-2">Comentarios del Supervisor</label>
             <textarea
                name="comentariosSupervisor"
                value={data.comentariosSupervisor}
                onChange={handleChange}
                disabled={readOnly}
                rows={4}
                className={getInputClass(data.comentariosSupervisor)}
                placeholder="Comentarios adicionales, aprobación o condiciones..."
             />
        </div>
      </div>

    </div>
  );
}
