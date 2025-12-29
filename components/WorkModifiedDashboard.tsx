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
import * as XLSX from 'xlsx';
import { CaseData } from '../types';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useWorkModifiedCases } from '../hooks/useWorkModifiedCases';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '../utils/logger';
import { Edit2, Search, Building2, Users, Calendar, Clock, Activity, AlertCircle, Loader2, Trash2, Plus, ChevronLeft, ChevronRight, Download } from 'lucide-react';

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
  
  const { empresaActiva } = useCompany();
  const { showSuccess, showError } = useNotifications();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Estado de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 100;
  
  // Usar React Query para cachear casos
  const { data: casesData, isLoading, error: queryError } = useWorkModifiedCases(currentPage, PAGE_SIZE);
  const cases = casesData?.cases || [];
  const totalCount = casesData?.totalCount || 0;
  const error = queryError ? (queryError.message || 'Error al cargar los datos') : null;
  
  // Debounce del término de búsqueda (300ms de delay)
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Invalidar caché cuando se elimina un caso
  const invalidateCasesCache = useCallback(() => {
    queryClient.invalidateQueries({ 
      queryKey: ['work-modified-cases', empresaActiva?.id || 'all'] 
    });
  }, [queryClient, empresaActiva?.id]);

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
   * Exporta los casos filtrados a Excel con dos hojas:
   * 1. Casos de Trabajo Modificado
   * 2. Estadísticas
   */
  const exportToExcel = useCallback(() => {
    try {
      // Validar que hay datos para exportar
      if (filteredCases.length === 0) {
        showError('No hay casos para exportar. Asegúrate de tener datos visibles.');
        return;
      }

      logger.debug('[WorkModifiedDashboard] Iniciando exportación a Excel...', {
        totalCases: filteredCases.length
      });

      // Preparar datos de casos para Excel
      const casosData = filteredCases.map(caso => {
        const { initial, added, total } = getCaseDaysInfo(caso);
        const endDateISO = calculateEndDate(caso.assessment?.indicacionInicio || '', total);
        const endDateFormatted = endDateISO !== '-' ? formatDate(endDateISO) : '';
        const startDateFormatted = formatDate(caso.assessment?.indicacionInicio || '');
        
        const primaryDiagnosis = caso.assessment?.diagnosticos?.[0]?.descripcion || 'Sin diagnóstico';
        const primaryCie10 = caso.assessment?.diagnosticos?.[0]?.cie10 || '';
        const diagnosticoCompleto = primaryCie10 
          ? `${primaryDiagnosis} (${primaryCie10})`
          : primaryDiagnosis;

        // Determinar tipo de modificación basado en restricciones
        // Las restricciones pueden venir de diferentes fuentes, usar tipoEvento como base
        const tipoModificacion = caso.tipoEvento || 'No especificado';

        // Observaciones combinadas
        const observaciones = [
          caso.comentariosSupervisor,
          caso.assessment?.medicoNombre ? `Médico: ${caso.assessment.medicoNombre}` : '',
          caso.assessment?.alertaFarmacologica ? `Alerta: ${caso.assessment.alertaFarmacologica}` : '',
        ].filter(Boolean).join('; ');

        return {
          'Fecha de Registro': formatDate(caso.fecha) || '-',
          'DNI': caso.dni || '-',
          'Trabajador': caso.trabajadorNombre || '-',
          'Empresa': caso.empresa || '-',
          'Puesto de Trabajo': caso.puesto || '-',
          'Diagnóstico': diagnosticoCompleto,
          'Tipo de Modificación': tipoModificacion,
          'Fecha de Inicio': startDateFormatted || '-',
          'Fecha de Fin': endDateFormatted || '-',
          'Días Iniciales': initial,
          'Días Adicionales': added,
          'Total Días': total,
          'Estado': caso.status || '-',
          'Observaciones': observaciones || '-',
        };
      });

      // Preparar datos de estadísticas
      const statsData = [
        { 'Métrica': 'Total de Casos', 'Valor': totalCases },
        { 'Métrica': 'Casos Activos', 'Valor': activeCases },
        { 'Métrica': 'Casos Finalizados', 'Valor': closedCases },
        { 'Métrica': 'Tasa de Finalización (%)', 'Valor': totalCases > 0 ? ((closedCases / totalCases) * 100).toFixed(2) : '0.00' },
        { 'Métrica': 'Días Acumulados', 'Valor': globalAccumulatedDays },
        { 'Métrica': 'Promedio de Días por Caso', 'Valor': totalCases > 0 ? (globalAccumulatedDays / totalCases).toFixed(2) : '0.00' },
      ];

      // Agregar distribución por empresa
      const empresasMap = new Map<string, number>();
      filteredCases.forEach(caso => {
        const empresa = caso.empresa || 'Sin empresa';
        empresasMap.set(empresa, (empresasMap.get(empresa) || 0) + 1);
      });
      
      statsData.push({ 'Métrica': '', 'Valor': '' }); // Separador
      statsData.push({ 'Métrica': 'Distribución por Empresa', 'Valor': '' });
      Array.from(empresasMap.entries()).forEach(([empresa, count]) => {
        statsData.push({ 'Métrica': empresa, 'Valor': count });
      });

      // Agregar distribución por tipo de evento
      const tiposMap = new Map<string, number>();
      filteredCases.forEach(caso => {
        const tipo = caso.tipoEvento || 'Sin tipo';
        tiposMap.set(tipo, (tiposMap.get(tipo) || 0) + 1);
      });
      
      statsData.push({ 'Métrica': '', 'Valor': '' }); // Separador
      statsData.push({ 'Métrica': 'Distribución por Tipo de Evento', 'Valor': '' });
      Array.from(tiposMap.entries()).forEach(([tipo, count]) => {
        statsData.push({ 'Métrica': tipo, 'Valor': count });
      });

      // Crear workbook
      const wb = XLSX.utils.book_new();
      
      // Agregar hoja de casos
      const wsCasos = XLSX.utils.json_to_sheet(casosData);
      XLSX.utils.book_append_sheet(wb, wsCasos, 'Casos de Trabajo Modificado');
      
      // Agregar hoja de estadísticas
      const wsStats = XLSX.utils.json_to_sheet(statsData);
      XLSX.utils.book_append_sheet(wb, wsStats, 'Estadísticas');
      
      // Ajustar ancho de columnas para hoja de casos
      const maxWidth = 30;
      const columnWidths = Object.keys(casosData[0] || {}).map(() => ({ wch: maxWidth }));
      wsCasos['!cols'] = columnWidths;
      
      // Ajustar ancho de columnas para hoja de estadísticas
      wsStats['!cols'] = [{ wch: 35 }, { wch: 20 }];
      
      // Generar nombre de archivo con marca de tiempo
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `casos_trabajo_modificado_${timestamp}.xlsx`;
      
      // Generar archivo
      XLSX.writeFile(wb, fileName);
      
      // Mostrar notificación de éxito
      showSuccess(`Archivo Excel generado exitosamente: ${fileName}`);
      
      logger.debug('[WorkModifiedDashboard] Exportación completada exitosamente', {
        fileName,
        totalCases: filteredCases.length
      });
    } catch (err: any) {
      logger.error(err instanceof Error ? err : new Error('Error al exportar a Excel'), {
        context: 'exportToExcel',
        error: err.message
      });
      showError(`Error al exportar a Excel: ${err.message || 'Error desconocido'}`);
    }
  }, [filteredCases, totalCases, activeCases, closedCases, globalAccumulatedDays, showSuccess, showError]);

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

      showSuccess(`Registro de ${caseData.trabajadorNombre} eliminado exitosamente.`);
      
      // Invalidar caché para recargar datos
      invalidateCasesCache();

    } catch (err: any) {
      console.error('❌ Error al eliminar registro:', err);
      showError(`Error al eliminar el registro: ${err.message || 'Error desconocido'}`);
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
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Gestión de Trabajo Modificado
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
            Monitoreo y seguimiento de restricciones laborales.
          </p>
        </div>
        {/* Botones de Acción */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Botón Exportar a Excel */}
          <button
            onClick={exportToExcel}
            disabled={filteredCases.length === 0}
            className={`
              flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-colors shadow-sm min-h-[44px] sm:min-h-0
              ${filteredCases.length === 0
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-green-600 dark:bg-green-500 text-white hover:bg-green-700 dark:hover:bg-green-600'
              }
            `}
            title={filteredCases.length === 0 ? 'No hay casos para exportar' : 'Exportar casos visibles a Excel'}
          >
            <Download size={18} />
            <span className="hidden sm:inline">Exportar a Excel</span>
            <span className="sm:hidden">Exportar</span>
          </button>
          {/* Botón Nuevo Caso */}
          <button
            onClick={onCreate}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-full text-sm font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors shadow-sm min-h-[44px] sm:min-h-0"
          >
            <Plus size={18} />
            <span>Nuevo Caso</span>
          </button>
        </div>
      </div>

      {/* KPIs - Tarjetas sutiles en fila superior */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-6 flex items-center gap-3 sm:gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-2 sm:p-3 rounded-lg shrink-0">
            <Users className="text-blue-600 dark:text-blue-400 w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Total Casos</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalCases}</p>
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
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          {/* Barra de Herramientas (Toolbar) - Dentro del contenedor */}
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Buscador estilo píldora */}
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-2.5 text-base sm:text-sm border border-gray-300 rounded-full bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all"
                  placeholder="Buscar por Trabajador, DNI o Empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center px-2"
                  aria-label="Limpiar búsqueda"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

        {/* Tabla de Datos - Desktop / Cards en Móvil */}
        {filteredCases.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center px-4">
              {searchTerm ? (
                <>
                  <p className="text-sm sm:text-base text-gray-500 mb-2">No se encontraron casos que coincidan con la búsqueda.</p>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium min-h-[44px] px-4 py-2"
                  >
                    Limpiar filtros
                  </button>
                </>
              ) : (
                <p className="text-sm sm:text-base text-gray-500">No hay registros en la base de datos.</p>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Vista de Cards en Móvil */}
            <div className="md:hidden space-y-4 px-2">
              {filteredCases.map((c) => {
                const { initial, added, total } = getCaseDaysInfo(c);
                const endDateISO = calculateEndDate(c.assessment?.indicacionInicio || '', total);
                const endDateFormatted = formatDate(endDateISO);
                const startDateFormatted = formatDate(c.assessment?.indicacionInicio || '');
                const primaryDiagnosis = c.assessment?.diagnosticos?.[0]?.descripcion || 'Sin diagnóstico';
                const primaryCie10 = c.assessment?.diagnosticos?.[0]?.cie10 || '';

                return (
                  <div key={c.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-base truncate">{c.trabajadorNombre || '-'}</p>
                        <p className="text-sm text-gray-500 mt-1">DNI: {c.dni || '-'}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                          <Building2 size={12} />
                          <span className="truncate">{c.empresa || 'Empresa no registrada'}</span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ml-2 ${
                        c.status === 'ACTIVO'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500">Diagnóstico</p>
                        <p className="text-sm text-gray-900">{primaryDiagnosis}</p>
                        {primaryCie10 && (
                          <p className="text-xs text-gray-500">({primaryCie10})</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-500">Inicio</p>
                          <p className="text-sm text-gray-900">{startDateFormatted !== '-' ? startDateFormatted : '-'}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-medium text-gray-500">Días</p>
                          <p className="text-lg font-bold text-gray-900">{total}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-gray-500">Término</p>
                          <p className="text-sm text-gray-900">{endDateFormatted !== '-' ? endDateFormatted : '-'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => onEdit(c)}
                        className="flex-1 px-3 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors min-h-[44px] flex items-center justify-center gap-1.5"
                        disabled={deletingId === c.id}
                      >
                        <Edit2 size={16} />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        disabled={deletingId === c.id}
                        className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center justify-center gap-1.5 ${
                          deletingId === c.id
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-red-600 text-white hover:bg-red-700'
                        }`}
                      >
                        {deletingId === c.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Vista de Tabla en Desktop */}
            <div className="hidden md:block overflow-x-auto">
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
          </>
        )}

        {/* Paginación */}
        {!isLoading && filteredCases.length > 0 && totalCount > PAGE_SIZE && (
          <div className="mt-6 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-b-lg">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={currentPage * PAGE_SIZE >= totalCount}
                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{(currentPage - 1) * PAGE_SIZE + 1}</span> a{' '}
                  <span className="font-medium">{Math.min(currentPage * PAGE_SIZE, totalCount)}</span> de{' '}
                  <span className="font-medium">{totalCount}</span> resultados
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Anterior</span>
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  
                  {/* Números de página */}
                  {Array.from({ length: Math.min(5, Math.ceil(totalCount / PAGE_SIZE)) }, (_, i) => {
                    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
                    let pageNum: number;
                    
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                          currentPage === pageNum
                            ? 'z-10 bg-indigo-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={currentPage * PAGE_SIZE >= totalCount}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Siguiente</span>
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
