/**
 * WorkModifiedDashboard - Dashboard de Trabajo Modificado
 * 
 * Muestra el listado de casos con tabla, KPIs, búsqueda y funcionalidades de gestión
 * Diseño moderno y consistente con el módulo de Administración
 * 
 * @component
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CaseData, INITIAL_CASE, EventType } from '../types';
import { supabase } from '../lib/supabase';
import { Edit2, Search, Building2, Users, Calendar, Clock, Activity, AlertCircle, Loader2, Trash2, Plus } from 'lucide-react';

// Hook personalizado para debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface WorkModifiedDashboardProps {
  onEdit: (data: CaseData) => void;
  onCreate: () => void;
}

// Interfaz para los datos que vienen de Supabase
interface SupabaseRecord {
  id?: number | string;
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

// Extender CaseData para incluir el ID de Supabase
interface CaseDataWithSupabaseId extends CaseData {
  supabaseId?: number | string;
}

export default function WorkModifiedDashboard({ onEdit, onCreate }: WorkModifiedDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [cases, setCases] = useState<CaseDataWithSupabaseId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Debounce del término de búsqueda (300ms de delay)
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  /**
   * Mapea los datos de Supabase al formato CaseData de la aplicación
   */
  const mapSupabaseToCaseData = (record: SupabaseRecord, index: number): CaseDataWithSupabaseId => {
    return {
      ...INITIAL_CASE,
      id: `PO-0006-${String(index + 1).padStart(3, '0')}`,
      supabaseId: record.id,
      status: 'ACTIVO',
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
      tipoEvento: EventType.ACCIDENTE_TRABAJO,
      assessment: { ...INITIAL_CASE.assessment },
      assessment2: { ...INITIAL_CASE.assessment },
      tareasRealizar: '',
      areaLugar: '',
      tareasPrincipales: '',
      comentariosSupervisor: '',
      reevaluaciones: []
    };
  };

  /**
   * Carga los datos de casos desde Supabase
   */
  useEffect(() => {
    const loadCases = async () => {
      setIsLoading(true);
      setError(null);

        try {
        // Optimización: Solo seleccionar campos necesarios para la tabla
        const { data, error: supabaseError } = await supabase
          .from('registros_trabajadores')
          .select('id, fecha_registro, apellidos_nombre, dni_ce_pas, telefono_trabajador, sexo, jornada_laboral, puesto_trabajo, empresa, gerencia, supervisor_responsable, telf_contacto_supervisor')
          .order('fecha_registro', { ascending: false });

        if (supabaseError) {
          throw supabaseError;
        }

        if (data) {
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

  // Filter Logic: Search by Name, DNI, or Company (memoizado para mejor rendimiento)
  const filteredCases = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return cases;
    }
    const term = debouncedSearchTerm.toLowerCase();
    return cases.filter(c => {
      const searchString = `${c.trabajadorNombre} ${c.dni} ${c.empresa}`.toLowerCase();
      return searchString.includes(term);
    });
  }, [cases, debouncedSearchTerm]);

  // Helper to extract numeric days
  const parseDays = (str?: string) => {
    if (!str) return 0;
    return parseInt(str.replace(/\D/g, '')) || 0;
  };

  // Helper to get day breakdown per case
  const getCaseDaysInfo = (c: CaseData) => {
    const initial = parseDays(c.assessment?.indicacionDuracion);
    const added = (c.reevaluaciones || []).reduce((sum, r) => sum + (r.diasAdicionales || 0), 0);
    const total = initial + added;
    return { initial, added, total };
  };

  // Stats Calculation based on FILTERED data (memoizado)
  const stats = useMemo(() => {
    const total = filteredCases.length;
    const active = filteredCases.filter(c => c.status === 'ACTIVO').length;
    const closed = filteredCases.filter(c => c.status === 'CERRADO').length;
    const accumulatedDays = filteredCases.reduce((acc, c) => {
      return acc + getCaseDaysInfo(c).total;
    }, 0);
    return { total, active, closed, accumulatedDays };
  }, [filteredCases]);

  const { total: totalCases, active: activeCases, closed: closedCases, accumulatedDays: globalAccumulatedDays } = stats;

  // Helper to format date from YYYY-MM-DD to DD/MM/YYYY
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return dateString;
  };

  // Helper to calculate end date based on TOTAL days
  const calculateEndDate = (startDateStr: string, totalDays: number) => {
    if (!startDateStr || totalDays === 0) return '-';

    const parts = startDateStr.split('-');
    if (parts.length !== 3) return '-';

    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);

    const date = new Date(year, month, day);
    date.setDate(date.getDate() + totalDays);

    const endYear = date.getFullYear();
    const endMonth = String(date.getMonth() + 1).padStart(2, '0');
    const endDay = String(date.getDate()).padStart(2, '0');

    return `${endYear}-${endMonth}-${endDay}`;
  };

  /**
   * Maneja la eliminación de un caso con confirmación (memoizado)
   */
  const handleDelete = useCallback(async (caseData: CaseDataWithSupabaseId) => {
    const confirmMessage = `¿Estás seguro de que deseas eliminar el registro de ${caseData.trabajadorNombre} (DNI: ${caseData.dni})?\n\nEsta acción no se puede deshacer.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    if (!caseData.supabaseId || caseData.supabaseId === null || caseData.supabaseId === undefined) {
      const errorMsg = 'Error: No se puede eliminar este registro. Falta el ID de la base de datos.';
      console.error('❌', errorMsg, caseData);
      alert(errorMsg);
      return;
    }

    setDeletingId(caseData.id);

    try {
      const { data, error: deleteError } = await supabase
        .from('registros_trabajadores')
        .delete()
        .eq('id', caseData.supabaseId)
        .select();

      if (deleteError) {
        throw deleteError;
      }

      setCases(prevCases => prevCases.filter(c => c.id !== caseData.id));
      alert(`Registro de ${caseData.trabajadorNombre} eliminado exitosamente.`);

    } catch (err: any) {
      console.error('❌ Error al eliminar registro:', err);
      alert(`Error al eliminar el registro: ${err.message || 'Error desconocido'}`);
    } finally {
      setDeletingId(null);
    }
  }, []);

  // Mostrar estado de carga
  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Gestión de Trabajo Modificado</h1>
          <p className="text-gray-500">Monitoreo y seguimiento de restricciones laborales.</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-indigo-600" size={48} />
            <p className="text-lg font-semibold text-slate-600">Cargando datos...</p>
            <p className="text-sm text-gray-500">Obteniendo registros de Supabase</p>
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Gestión de Trabajo Modificado</h1>
          <p className="text-gray-500">Monitoreo y seguimiento de restricciones laborales.</p>
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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Encabezado - Mismo estilo que Administración */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Gestión de Trabajo Modificado
          </h1>
          <p className="text-gray-500">
            Monitoreo y seguimiento de restricciones laborales.
          </p>
        </div>
        {/* Botón Nuevo Caso */}
        <button
          onClick={onCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={18} />
          <span>Nuevo Caso</span>
        </button>
      </div>

      {/* KPIs - Tarjetas sutiles en fila superior */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <Users className="text-blue-600" size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Casos</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalCases}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center gap-4">
          <div className="bg-green-50 p-3 rounded-lg">
            <Activity className="text-green-600" size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Casos Activos</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{activeCases}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <Users className="text-gray-600" size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Casos Cerrados</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{closedCases}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center gap-4">
          <div className="bg-orange-50 p-3 rounded-lg">
            <Clock className="text-orange-600" size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Días Acumulados</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{globalAccumulatedDays}</p>
          </div>
        </div>
      </div>

      {/* Contenedor Principal Unificado - Mismo estilo que Administración */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Barra de Herramientas (Toolbar) - Dentro del contenedor */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            {/* Buscador estilo píldora */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-full bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all"
                placeholder="Buscar por Trabajador, DNI o Empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Limpiar búsqueda"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Tabla de Datos - Mismo estilo que Administración */}
        {filteredCases.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              {searchTerm ? (
                <>
                  <p className="text-gray-500 mb-2">No se encontraron casos que coincidan con la búsqueda.</p>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Limpiar filtros
                  </button>
                </>
              ) : (
                <p className="text-gray-500">No hay registros en la base de datos.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Cabecera de Tabla - Mismo estilo que Administración */}
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    TRABAJADOR
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DIAGNÓSTICO / EVENTO
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    INICIO TM
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DÍAS
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    TÉRMINO
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ESTADO
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ACCIONES
                  </th>
                </tr>
              </thead>

              {/* Cuerpo de Tabla - Mismo estilo que Administración */}
              <tbody className="divide-y divide-gray-100">
                {filteredCases.map((c) => {
                  const { initial, added, total } = getCaseDaysInfo(c);
                  const endDateISO = calculateEndDate(c.assessment?.indicacionInicio || '', total);
                  const endDateFormatted = formatDate(endDateISO);
                  const startDateFormatted = formatDate(c.assessment?.indicacionInicio || '');

                  const primaryDiagnosis = c.assessment?.diagnosticos?.[0]?.descripcion || 'Sin diagnóstico';
                  const primaryCie10 = c.assessment?.diagnosticos?.[0]?.cie10 || '';

                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      {/* Columna Trabajador */}
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">
                            {c.trabajadorNombre || '-'}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">DNI: {c.dni || '-'}</div>
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                            <Building2 size={12} />
                            <span>{c.empresa || 'Empresa no registrada'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Columna Diagnóstico / Evento */}
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm text-gray-900 font-medium">
                            {primaryDiagnosis}
                            {primaryCie10 && (
                              <span className="text-gray-500 text-xs ml-1">({primaryCie10})</span>
                            )}
                          </div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 mt-1">
                            {c.tipoEvento}
                          </span>
                        </div>
                      </td>

                      {/* Columna Inicio TM */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {startDateFormatted !== '-' ? (
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-gray-400" />
                              {startDateFormatted}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>

                      {/* Columna Días */}
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex flex-col items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                          <span className="text-lg font-bold text-gray-900">
                            {total}
                          </span>
                          <span className="text-xs text-gray-500 mt-0.5">
                            Inicial: {initial}
                            {added > 0 && (
                              <span className="text-orange-600 ml-1">(+{added})</span>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Columna Término */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {endDateFormatted !== '-' ? (
                            <div>
                              <span className="font-medium">{endDateFormatted}</span>
                              {added > 0 && (
                                <span className="text-xs text-orange-600 ml-2 italic">Extendida</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>

                      {/* Columna Estado - Badge estilo píldora */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          c.status === 'ACTIVO'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {c.status}
                        </span>
                      </td>

                      {/* Columna Acciones */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => onEdit(c)}
                            className="text-indigo-600 hover:text-indigo-800 p-1 rounded-md hover:bg-indigo-50 transition-colors"
                            title="Editar caso"
                            disabled={deletingId === c.id}
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
                            disabled={deletingId === c.id}
                            className={`p-1 rounded-md transition-colors ${
                              deletingId === c.id
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-red-600 hover:text-red-800 hover:bg-red-50'
                            }`}
                            title="Eliminar caso"
                          >
                            {deletingId === c.id ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : (
                              <Trash2 size={18} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
