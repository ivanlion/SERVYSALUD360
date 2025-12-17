'use client';

import React, { useState, useEffect } from 'react';
import { CaseData, INITIAL_CASE, EventType } from '../types';
import { supabase } from '../lib/supabase';
import { Edit2, Search, Building2, Users, Calendar, Clock, Activity, AlertCircle, Loader2 } from 'lucide-react';

interface DashboardProps {
  onEdit: (data: CaseData) => void;
  onCreate: () => void;
}

// Interfaz para los datos que vienen de Supabase
interface SupabaseRecord {
  fecha_registro: string;
  apellidos_nombre: string;
  dni_ce_pas: string;
  telefono_trabajador: string;
  sexo: string;
  jornada_laboral: string;
  puesto_trabajo: string;
  empresa: string;
  gerencia: string;
  supervisor_responsable: string;
  telf_contacto_supervisor: string;
}

export default function Dashboard({ onEdit, onCreate }: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [cases, setCases] = useState<CaseData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función para mapear datos de Supabase a CaseData
  const mapSupabaseToCaseData = (record: SupabaseRecord, index: number): CaseData => {
    return {
      ...INITIAL_CASE,
      id: `PO-0006-${String(index + 1).padStart(3, '0')}`, // Generar ID temporal
      status: 'ACTIVO', // Valor por defecto ya que no está en la tabla
      createdAt: record.fecha_registro || new Date().toISOString(),
      fecha: record.fecha_registro || '',
      trabajadorNombre: record.apellidos_nombre || '',
      dni: record.dni_ce_pas || '',
      sexo: (record.sexo as 'Masculino' | 'Femenino' | '') || '',
      jornadaLaboral: record.jornada_laboral || '',
      puesto: record.puesto_trabajo || '',
      telfContacto: record.telefono_trabajador || '',
      empresa: record.empresa || '',
      gerencia: record.gerencia || '',
      supervisor: record.supervisor_responsable || '',
      supervisorTelf: record.telf_contacto_supervisor || '',
      tipoEvento: EventType.ACCIDENTE_TRABAJO, // Valor por defecto
      assessment: { ...INITIAL_CASE.assessment },
      assessment2: { ...INITIAL_CASE.assessment },
      tareasRealizar: '',
      areaLugar: '',
      tareasPrincipales: '',
      comentariosSupervisor: '',
      reevaluaciones: []
    };
  };

  // Cargar datos de Supabase
  useEffect(() => {
    const loadCases = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const { data, error: supabaseError } = await supabase
          .from('registros_trabajadores')
          .select('*')
          .order('fecha_registro', { ascending: false });

        if (supabaseError) {
          throw supabaseError;
        }

        if (data) {
          // Mapear los datos de Supabase a CaseData
          const mappedCases = data.map((record: any, index: number) => 
            mapSupabaseToCaseData(record as SupabaseRecord, index)
          );
          setCases(mappedCases);
        }
      } catch (err: any) {
        console.error('Error al cargar datos de Supabase:', err);
        setError(err.message || 'Error al cargar los datos');
      } finally {
        setIsLoading(false);
      }
    };

    loadCases();
  }, []);

  // Filter Logic: Search by Name, DNI, or Company
  const filteredCases = cases.filter(c => {
    const term = searchTerm.toLowerCase();
    const searchString = `${c.trabajadorNombre} ${c.dni} ${c.empresa}`.toLowerCase();
    return searchString.includes(term);
  });
  
  // Helper to extract numeric days
  const parseDays = (str?: string) => {
    if (!str) return 0;
    return parseInt(str.replace(/\D/g, '')) || 0;
  };

  // Helper to get day breakdown per case
  // Como no tenemos datos de assessment en Supabase, retornamos valores por defecto
  const getCaseDaysInfo = (c: CaseData) => {
    const initial = parseDays(c.assessment?.indicacionDuracion);
    // Sum all additional days from the reevaluaciones array
    const added = (c.reevaluaciones || []).reduce((sum, r) => sum + (r.diasAdicionales || 0), 0);
    const total = initial + added;
    return { initial, added, total };
  };

  // Stats Calculation based on FILTERED data
  const totalCases = filteredCases.length;
  const activeCases = filteredCases.filter(c => c.status === 'ACTIVO').length;
  const closedCases = filteredCases.filter(c => c.status === 'CERRADO').length;
  
  // Calculate Global Accumulated Days (sum of all totals in view)
  const globalAccumulatedDays = filteredCases.reduce((acc, c) => {
    return acc + getCaseDaysInfo(c).total;
  }, 0);

  // Helper to format date from YYYY-MM-DD to DD/MM/YYYY
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const parts = dateString.split('-');
    // Ensure we have Year, Month, Day
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return dateString;
  };

  // Helper to calculate end date based on TOTAL days
  const calculateEndDate = (startDateStr: string, totalDays: number) => {
    if (!startDateStr || totalDays === 0) return '-';
    
    // Parse manually to avoid timezone issues with standard Date constructor
    const parts = startDateStr.split('-');
    if (parts.length !== 3) return '-';
    
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
    const day = parseInt(parts[2]);

    const date = new Date(year, month, day);
    date.setDate(date.getDate() + totalDays);

    const endYear = date.getFullYear();
    const endMonth = String(date.getMonth() + 1).padStart(2, '0');
    const endDay = String(date.getDate()).padStart(2, '0');

    return `${endYear}-${endMonth}-${endDay}`;
  };

  // Mostrar estado de carga
  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Gestión de Trabajo Modificado</h2>
          <p className="text-slate-500 text-sm mt-1">Monitoreo y seguimiento de restricciones laborales.</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-blue-600" size={48} />
            <p className="text-lg font-semibold text-slate-600">Cargando datos...</p>
            <p className="text-sm text-slate-500">Obteniendo registros de Supabase</p>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar error si hay
  if (error) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Gestión de Trabajo Modificado</h2>
          <p className="text-slate-500 text-sm mt-1">Monitoreo y seguimiento de restricciones laborales.</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-600" size={24} />
            <div>
              <h3 className="font-bold text-red-800">Error al cargar datos</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 animate-in fade-in duration-500">
      
      {/* Title Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Gestión de Trabajo Modificado</h2>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">Monitoreo y seguimiento de restricciones laborales.</p>
      </div>

      {/* Search & Filter Section */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-blue-200">
        <label className="block text-xs sm:text-sm font-medium text-blue-900 mb-2">Búsqueda</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 sm:h-5 sm:w-5 text-blue-300" />
          </div>
          <input
            type="text"
            className="block w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-blue-200 rounded-lg leading-5 bg-blue-50/20 text-gray-900 placeholder-blue-300 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="Buscar por Trabajador, DNI o Empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {searchTerm && (
           <p className="text-xs text-slate-500 mt-2">
             Mostrando resultados para: <span className="font-medium text-slate-700">"{searchTerm}"</span>
           </p>
        )}
      </div>

      {/* Dynamic KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-blue-200 flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-medium text-slate-500 truncate">Total Casos</p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{totalCases}</p>
          </div>
          <div className="bg-indigo-50 p-2 sm:p-3 rounded-full text-indigo-600 flex-shrink-0 ml-2">
            <Users size={20} className="sm:w-6 sm:h-6" />
          </div>
        </div>
        
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-blue-200 flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-medium text-slate-500 truncate">Casos Activos</p>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-1">{activeCases}</p>
          </div>
           <div className="bg-blue-50 p-2 sm:p-3 rounded-full text-blue-600 flex-shrink-0 ml-2">
            <Activity size={20} className="sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-blue-200 flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-medium text-slate-500 truncate">Casos Cerrados</p>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1">{closedCases}</p>
          </div>
           <div className="bg-emerald-50 p-2 sm:p-3 rounded-full text-emerald-600 flex-shrink-0 ml-2">
            <Users size={20} className="sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* New KPI Card for Total Accumulated Days */}
        <div className="bg-gradient-to-br from-orange-50 to-white p-4 sm:p-6 rounded-xl shadow-sm border border-orange-200 flex items-center justify-between hover:shadow-md transition-shadow col-span-2 lg:col-span-1">
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-bold text-orange-800/70 uppercase tracking-wide truncate">Días Acumulados</p>
            <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-orange-600 mt-1">{globalAccumulatedDays}</p>
            <p className="text-[9px] sm:text-[10px] text-orange-400 font-medium hidden sm:block">Suma de todos los casos visibles</p>
          </div>
           <div className="bg-orange-100 p-2 sm:p-3 rounded-full text-orange-600 flex-shrink-0 ml-2">
            <Clock size={20} className="sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-blue-100">
          <h3 className="text-base sm:text-lg font-semibold text-blue-900">Listado de Pacientes</h3>
        </div>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-blue-50">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-blue-800 uppercase tracking-wider">Trabajador</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-blue-800 uppercase tracking-wider hidden md:table-cell">Diagnóstico / Evento</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-blue-800 uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">Inicio TM</th>
                    <th className="px-3 sm:px-6 py-3 text-center text-xs sm:text-sm font-medium text-blue-800 uppercase tracking-wider whitespace-nowrap">Días</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-blue-800 uppercase tracking-wider whitespace-nowrap hidden xl:table-cell">Término</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-blue-800 uppercase tracking-wider hidden sm:table-cell">Estado</th>
                    <th className="px-3 sm:px-6 py-3 text-right text-xs sm:text-sm font-medium text-blue-800 uppercase tracking-wider">Acción</th>
                  </tr>
                </thead>
            <tbody className="divide-y divide-blue-50">
              {filteredCases.map((c) => {
                const { initial, added, total } = getCaseDaysInfo(c);
                const endDateISO = calculateEndDate(c.assessment?.indicacionInicio || '', total);
                const endDateFormatted = formatDate(endDateISO);
                const startDateFormatted = formatDate(c.assessment?.indicacionInicio || '');
                
                const primaryDiagnosis = c.assessment?.diagnosticos?.[0]?.descripcion || 'Sin diagnóstico';
                const primaryCie10 = c.assessment?.diagnosticos?.[0]?.cie10 || '';

                return (
                <tr key={c.id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-slate-600">
                    <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">{c.trabajadorNombre}</div>
                    <div className="text-xs text-slate-500">DNI: {c.dni}</div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                        <Building2 size={10} />
                        <span className="truncate">{c.empresa || 'Empresa no reg.'}</span>
                    </div>
                    {/* Mostrar diagnóstico en móvil */}
                    <div className="md:hidden mt-2 pt-2 border-t border-blue-100">
                      <div className="font-medium text-slate-900 text-xs truncate" title={primaryDiagnosis}>
                        {primaryDiagnosis}
                      </div>
                      <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                        {c.tipoEvento}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-slate-600 max-w-xs hidden md:table-cell">
                    <div className="font-medium text-slate-900 truncate" title={primaryDiagnosis}>
                      {primaryDiagnosis} {primaryCie10 && <span className="text-slate-500 text-xs">({primaryCie10})</span>}
                    </div>
                    <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                      {c.tipoEvento}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-slate-600 whitespace-nowrap hidden lg:table-cell">
                     {c.fecha ? (
                        <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-blue-400" />
                            {formatDate(c.fecha)}
                        </div>
                     ) : (
                         <span className="text-slate-300">-</span>
                     )}
                  </td>
                  
                  {/* Modified Days Column */}
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-center align-middle">
                     <div className="inline-flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-lg px-2 sm:px-4 py-1 sm:py-1.5 min-w-[70px] sm:min-w-[100px]">
                        <span className="text-lg sm:text-xl font-bold text-slate-800 leading-none">
                            {total} <span className="text-[9px] sm:text-[10px] font-normal text-slate-400 uppercase">Días</span>
                        </span>
                        <div className="w-full border-t border-slate-200 my-0.5 sm:my-1"></div>
                        <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 leading-tight">
                            Inicial: <span className="text-slate-700">{initial}</span>
                            {added > 0 && (
                                <span className="text-orange-600 ml-1">
                                    (+{added})
                                </span>
                            )}
                        </span>
                     </div>
                  </td>

                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-slate-600 whitespace-nowrap hidden xl:table-cell">
                     {endDateFormatted !== '-' ? (
                         <div className="flex flex-col">
                            <span className="text-slate-900 font-medium text-xs sm:text-sm">{endDateFormatted}</span>
                            {added > 0 && <span className="text-[10px] text-orange-500 italic">Extendida</span>}
                         </div>
                     ) : (
                         <span className="text-slate-300">-</span>
                     )}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm hidden sm:table-cell">
                    <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      c.status === 'ACTIVO' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                    <button 
                      onClick={() => onEdit(c)}
                      className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                      title="Editar caso"
                    >
                      <Edit2 size={18} className="sm:w-5 sm:h-5" />
                    </button>
                  </td>
                </tr>
              )})}
              {filteredCases.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                        {searchTerm ? (
                          <>
                            <p className="text-slate-500">No se encontraron casos que coincidan con la búsqueda.</p>
                            <button onClick={() => setSearchTerm('')} className="mt-2 text-blue-600 text-sm font-medium hover:underline">
                              Limpiar filtros
                            </button>
                          </>
                        ) : (
                          <p className="text-slate-500">No hay registros en la base de datos.</p>
                        )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
