'use client';

import React from 'react';
import { CaseData, EventType } from '../../types';

interface GeneralInfoProps {
  data: CaseData;
  onChange: (updates: Partial<CaseData>) => void;
  readOnly?: boolean;
}

export default function GeneralInfo({ data, onChange, readOnly = false }: GeneralInfoProps) {
  
  // Handler for standard inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onChange({ [name]: value });
  };

  // Handler for Numeric Only (Phones)
  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const cleanValue = value.replace(/\D/g, '');
    onChange({ [name]: cleanValue });
  };

  // Handler for Alphanumeric (DNI/CE/PAS)
  const handleAlphanumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const cleanValue = value.replace(/[^a-zA-Z0-9]/g, '');
    onChange({ [name]: cleanValue });
  };

  // Handler for Text Only
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const cleanValue = value.replace(/[^a-zA-ZñÑáéíóúÁÉÍÓÚüÜ\s]/g, '');
    onChange({ [name]: cleanValue });
  };

  // Dynamic Class Generator for Visual Feedback
  const getInputClass = (value: string, type: 'text' | 'phone' | 'dni' = 'text') => {
    const base = "w-full rounded-lg border p-2.5 transition-all outline-none shadow-sm ";
    
    let isValid = false;
    let isIncomplete = false;

    // Validation Rules
    if (type === 'phone') {
        if (value.length === 9) isValid = true;
        else if (value.length > 0) isIncomplete = true;
    } else if (type === 'dni') {
        if (value.length >= 8) isValid = true;
        else if (value.length > 0) isIncomplete = true;
    } else {
        // Standard text
        if (value.length > 0) isValid = true;
    }

    if (readOnly) {
        return base + "bg-blue-50/50 text-slate-500 border-blue-200";
    }

    if (isValid) {
        // Complete/Valid State -> Prominent Emerald/Green Theme (Stronger Visuals)
        return base + "border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-100 text-emerald-900 font-bold shadow-md shadow-emerald-100";
    } else if (isIncomplete) {
        // Incomplete/Warning State -> Amber Theme
        return base + "border-amber-400 focus:ring-2 focus:ring-amber-500/50 bg-amber-50/30 text-slate-800 shadow-amber-100";
    } else {
        // Empty/Default State -> Blue Theme
        return base + "border-blue-200 focus:ring-2 focus:ring-blue-500/50 bg-white placeholder-blue-300 text-slate-800 hover:border-blue-400";
    }
  };

  return (
    <div className={`space-y-8 animate-in fade-in duration-500 ${readOnly ? 'opacity-80 pointer-events-none' : ''}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Basic Info */}
        <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow duration-300">
          <h3 className="text-lg font-bold text-blue-900 border-b border-blue-100 pb-3 mb-4 drop-shadow-sm">
            Información del Trabajador
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Fecha de Registro</label>
              <input 
                type="date" 
                name="fecha"
                value={data.fecha}
                onChange={handleChange}
                disabled={readOnly}
                className={getInputClass(data.fecha)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Apellidos y Nombre</label>
              <input 
                type="text" 
                name="trabajadorNombre"
                value={data.trabajadorNombre}
                onChange={handleTextChange}
                disabled={readOnly}
                placeholder="Ej. Perez Juan"
                className={getInputClass(data.trabajadorNombre)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">DNI / CE / PAS</label>
                <input 
                  type="text" 
                  name="dni"
                  value={data.dni}
                  onChange={handleAlphanumericChange}
                  maxLength={12}
                  disabled={readOnly}
                  className={getInputClass(data.dni, 'dni')}
                />
                 {data.dni.length > 0 && data.dni.length < 8 && !readOnly && (
                    <span className="text-[10px] text-amber-600 font-medium">Mínimo 8 caracteres</span>
                 )}
              </div>
               <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Telf. del Trabajador</label>
                <input 
                  type="text" 
                  name="telfContacto"
                  value={data.telfContacto}
                  onChange={handleNumericChange}
                  maxLength={9}
                  disabled={readOnly}
                  placeholder="999999999"
                  className={getInputClass(data.telfContacto, 'phone')}
                />
                 {data.telfContacto.length > 0 && data.telfContacto.length < 9 && !readOnly && (
                    <span className="text-[10px] text-amber-600 font-medium">Faltan {9 - data.telfContacto.length} dígitos</span>
                 )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Sexo</label>
                <select 
                  name="sexo"
                  value={data.sexo}
                  onChange={handleChange}
                  disabled={readOnly}
                  className={getInputClass(data.sexo)}
                >
                  <option value="">Seleccionar</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Jornada Laboral En Horas</label>
                <input 
                  type="number" 
                  name="jornadaLaboral"
                  value={data.jornadaLaboral}
                  onChange={handleNumericChange}
                  disabled={readOnly}
                  placeholder="Ej. 48"
                  className={getInputClass(data.jornadaLaboral)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Puesto de Trabajo</label>
              <input 
                type="text" 
                name="puesto"
                value={data.puesto}
                onChange={handleTextChange}
                disabled={readOnly}
                className={getInputClass(data.puesto)}
              />
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow duration-300">
          <h3 className="text-lg font-bold text-blue-900 border-b border-blue-100 pb-3 mb-4 drop-shadow-sm">
            Información Corporativa
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Empresa</label>
              <input 
                type="text" 
                name="empresa"
                value={data.empresa}
                onChange={handleChange}
                disabled={readOnly}
                className={getInputClass(data.empresa)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Gerencia</label>
              <input 
                type="text" 
                name="gerencia"
                value={data.gerencia}
                onChange={handleTextChange}
                disabled={readOnly}
                className={getInputClass(data.gerencia)}
              />
            </div>

             <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Supervisor Responsable</label>
              <input 
                type="text" 
                name="supervisor"
                value={data.supervisor}
                onChange={handleTextChange}
                disabled={readOnly}
                className={getInputClass(data.supervisor)}
              />
            </div>

             <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Telf. Contacto Supervisor</label>
              <input 
                type="text" 
                name="supervisorTelf"
                value={data.supervisorTelf}
                onChange={handleNumericChange}
                maxLength={9}
                disabled={readOnly}
                className={getInputClass(data.supervisorTelf, 'phone')}
              />
               {data.supervisorTelf.length > 0 && data.supervisorTelf.length < 9 && !readOnly && (
                    <span className="text-[10px] text-amber-600 font-medium">Faltan {9 - data.supervisorTelf.length} dígitos</span>
                 )}
            </div>
          </div>
        </div>
      </div>

      {/* Event Type */}
      <div className="pt-4 bg-white p-5 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow duration-300">
        <h3 className="text-lg font-bold text-blue-900 border-b border-blue-100 pb-4 mb-4 drop-shadow-sm">Tipo de Evento</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.values(EventType).map((type) => (
            <label key={type} className={`
              relative flex cursor-pointer rounded-xl border p-4 shadow-sm focus:outline-none transition-all duration-200
              ${readOnly ? 'cursor-not-allowed opacity-70' : 'hover:shadow-md hover:scale-[1.02]'}
              ${data.tipoEvento === type ? 'border-emerald-500 ring-2 ring-emerald-500 bg-emerald-50' : 'border-blue-200 bg-white hover:bg-blue-50/50'}
            `}>
              <input 
                type="radio" 
                name="tipoEvento" 
                value={type} 
                checked={data.tipoEvento === type}
                onChange={handleChange}
                disabled={readOnly}
                className="sr-only" 
              />
              <span className="flex flex-1">
                <span className="flex flex-col">
                  <span className={`block text-sm font-bold ${data.tipoEvento === type ? 'text-emerald-900' : 'text-slate-700'}`}>
                    {type}
                  </span>
                </span>
              </span>
              <span className={`
                ${data.tipoEvento === type ? 'bg-emerald-600 border-transparent' : 'bg-white border-blue-300'}
                h-5 w-5 rounded-full border flex items-center justify-center transition-colors
              `}>
                <span className={`w-2.5 h-2.5 rounded-full bg-white transition-opacity ${data.tipoEvento === type ? 'opacity-100' : 'opacity-0'}`} />
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
