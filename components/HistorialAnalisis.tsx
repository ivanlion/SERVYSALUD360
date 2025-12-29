/**
 * HistorialAnalisis - Componente para visualizar y comparar análisis de EMOs
 * 
 * Permite:
 * - Ver historial de análisis previos
 * - Buscar por DNI
 * - Filtrar por rango de fechas
 * - Comparar dos análisis lado a lado
 * - Descargar análisis anteriores
 * 
 * @component
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { useNotifications } from '../contexts/NotificationContext';
import { logger } from '../utils/logger';
import { 
  Search, 
  Calendar, 
  Download, 
  FileText, 
  Users, 
  Building2, 
  GitCompare, 
  X, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckSquare,
  Square
} from 'lucide-react';

interface AnalisisHistorial {
  id: string;
  empresa_id: string;
  trabajador_dni: string;
  trabajador_nombre: string;
  archivo_nombre: string;
  archivo_url: string | null;
  fecha_analisis: string;
  resultado_analisis: {
    csv_parseado?: any;
    resumen_clinico?: string;
    metadata?: any;
  };
  usuario_id: string | null;
  created_at: string;
  empresas?: {
    nombre: string;
  };
}

interface HistorialAnalisisProps {
  empresaId?: string;
}

const PAGE_SIZE = 20;

export default function HistorialAnalisis({ empresaId }: HistorialAnalisisProps) {
  const { empresaActiva } = useCompany();
  const { showSuccess, showError, showWarning } = useNotifications();
  const [searchDNI, setSearchDNI] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedAnalysis, setSelectedAnalysis] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareData, setCompareData] = useState<AnalisisHistorial[]>([]);

  // Determinar empresa a usar (prop o activa)
  const targetEmpresaId = empresaId || empresaActiva?.id;

  // Función para cargar historial
  const loadHistorial = useCallback(async (page: number = 1) => {
    try {
      let query = supabase
        .from('analisis_emo_historial')
        .select(`
          *,
          empresas (
            nombre
          )
        `, { count: 'exact' })
        .order('fecha_analisis', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      // Filtrar por empresa
      if (targetEmpresaId) {
        query = query.eq('empresa_id', targetEmpresaId);
      }

      // Filtrar por DNI
      if (searchDNI.trim()) {
        query = query.ilike('trabajador_dni', `%${searchDNI.trim()}%`);
      }

      // Filtrar por rango de fechas
      if (startDate) {
        query = query.gte('fecha_analisis', `${startDate}T00:00:00`);
      }
      if (endDate) {
        query = query.lte('fecha_analisis', `${endDate}T23:59:59`);
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return {
        data: (data || []) as AnalisisHistorial[],
        totalCount: count || 0
      };
    } catch (err: any) {
      logger.error(err instanceof Error ? err : new Error('Error al cargar historial'), {
        context: 'loadHistorial'
      });
      throw err;
    }
  }, [targetEmpresaId, searchDNI, startDate, endDate]);

  // React Query para cachear y gestionar el historial
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['analisis-emo-historial', targetEmpresaId, searchDNI, startDate, endDate, currentPage],
    queryFn: () => loadHistorial(currentPage),
    enabled: !!targetEmpresaId, // Solo cargar si hay empresa
    staleTime: 30000, // 30 segundos
  });

  const historial = data?.data || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Manejar selección para comparar
  const handleSelectForCompare = useCallback((id: string, checked: boolean) => {
    setSelectedAnalysis(prev => {
      if (checked) {
        // Máximo 2 seleccionados
        if (prev.length >= 2) {
          showWarning('Solo puedes comparar 2 análisis a la vez');
          return prev;
        }
        return [...prev, id];
      } else {
        return prev.filter(selectedId => selectedId !== id);
      }
    });
  }, [showWarning]);

  // Comparar análisis seleccionados
  const handleCompare = useCallback(() => {
    if (selectedAnalysis.length !== 2) {
      showWarning('Debes seleccionar exactamente 2 análisis para comparar');
      return;
    }

    const analysis1 = historial.find(h => h.id === selectedAnalysis[0]);
    const analysis2 = historial.find(h => h.id === selectedAnalysis[1]);

    if (!analysis1 || !analysis2) {
      showError('No se encontraron los análisis seleccionados');
      return;
    }

    setCompareData([analysis1, analysis2]);
    setShowCompareModal(true);
  }, [selectedAnalysis, historial, showWarning, showError]);

  // Ver análisis individual
  const handleViewAnalysis = useCallback((item: AnalisisHistorial) => {
    setCompareData([item]);
    setShowCompareModal(true);
  }, []);

  // Descargar archivo
  const handleDownload = useCallback(async (item: AnalisisHistorial) => {
    try {
      if (!item.archivo_url) {
        showWarning('No hay archivo disponible para descargar');
        return;
      }

      // Si es una URL pública, abrir en nueva pestaña
      if (item.archivo_url.startsWith('http')) {
        window.open(item.archivo_url, '_blank');
        showSuccess('Archivo abierto en nueva pestaña');
      } else {
        // Intentar descargar desde Storage
        const { data: downloadData, error: downloadError } = await supabase.storage
          .from('emos-pdf')
          .download(item.archivo_url);

        if (downloadError) {
          throw downloadError;
        }

        // Crear URL temporal y descargar
        const url = window.URL.createObjectURL(downloadData);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.archivo_nombre;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        showSuccess('Archivo descargado exitosamente');
      }
    } catch (err: any) {
      logger.error(err instanceof Error ? err : new Error('Error al descargar archivo'), {
        context: 'handleDownload'
      });
      showError(`Error al descargar archivo: ${err.message || 'Error desconocido'}`);
    }
  }, [showSuccess, showError, showWarning]);

  // Limpiar filtros
  const handleClearFilters = useCallback(() => {
    setSearchDNI('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
    setSelectedAnalysis([]);
  }, []);

  // Formatear fecha
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-PE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // Mostrar estado de carga
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-indigo-600" size={48} />
          <p className="text-lg font-semibold text-slate-600">Cargando historial...</p>
        </div>
      </div>
    );
  }

  // Mostrar error
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <X className="text-red-600" size={24} />
          <div>
            <h3 className="font-bold text-red-800">Error al cargar historial</h3>
            <p className="text-sm text-red-700 mt-1">
              {error instanceof Error ? error.message : 'Error desconocido'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Historial de Análisis de EMOs
          </h1>
          <p className="text-sm sm:text-base text-gray-500">
            Visualiza y compara análisis previos de exámenes médicos ocupacionales
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Búsqueda por DNI */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
              <input
                type="text"
                placeholder="Buscar por DNI..."
                value={searchDNI}
                onChange={(e) => {
                  setSearchDNI(e.target.value);
                  setCurrentPage(1);
                }}
                className="block w-full pl-10 pr-4 py-2.5 sm:py-2.5 text-base sm:text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all min-h-[44px] sm:min-h-0"
              />
          </div>

          {/* Fecha inicio */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="block w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all"
            />
          </div>

          {/* Fecha fin */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="block w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all"
            />
          </div>

          {/* Botones */}
          <div className="flex gap-2">
            <button
              onClick={() => refetch()}
              className="flex-1 px-4 py-2.5 sm:py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors min-h-[44px] sm:min-h-0"
            >
              Buscar
            </button>
            {(searchDNI || startDate || endDate) && (
              <button
                onClick={handleClearFilters}
                className="px-4 py-2.5 sm:py-2.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors min-h-[44px] sm:min-h-0"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Botón comparar (si hay 2 seleccionados) */}
      {selectedAnalysis.length === 2 && (
        <div className="flex justify-end">
          <button
            onClick={handleCompare}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <GitCompare size={18} />
            <span>Comparar Análisis Seleccionados</span>
          </button>
        </div>
      )}

      {/* Tabla de historial */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {historial.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <FileText className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-500 mb-2">No se encontraron análisis en el historial</p>
              {(searchDNI || startDate || endDate) && (
                <button
                  onClick={handleClearFilters}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      {/* Checkbox header */}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DNI
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trabajador
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Archivo
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Empresa
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {historial.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      {/* Checkbox para comparar */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleSelectForCompare(item.id, !selectedAnalysis.includes(item.id))}
                          className="text-indigo-600 hover:text-indigo-800"
                        >
                          {selectedAnalysis.includes(item.id) ? (
                            <CheckSquare size={20} />
                          ) : (
                            <Square size={20} className="text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatDate(item.fecha_analisis)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {item.trabajador_dni || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.trabajador_nombre || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-gray-400" />
                          <span className="truncate max-w-xs" title={item.archivo_nombre}>
                            {item.archivo_nombre}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.empresas?.nombre || '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewAnalysis(item)}
                            className="text-indigo-600 hover:text-indigo-800 p-1 rounded-md hover:bg-indigo-50 transition-colors"
                            title="Ver análisis"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleDownload(item)}
                            className="text-green-600 hover:text-green-800 p-1 rounded-md hover:bg-green-50 transition-colors"
                            title="Descargar archivo"
                          >
                            <Download size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
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
                    disabled={currentPage >= totalPages}
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
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300">
                        Página {currentPage} de {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        disabled={currentPage >= totalPages}
                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de comparación */}
      {showCompareModal && (
        <CompareModal
          data={compareData}
          onClose={() => {
            setShowCompareModal(false);
            setCompareData([]);
          }}
        />
      )}
    </div>
  );
}

// Componente Modal de Comparación
interface CompareModalProps {
  data: AnalisisHistorial[];
  onClose: () => void;
}

function CompareModal({ data, onClose }: CompareModalProps) {
  const isComparison = data.length === 2;
  const [activeTab, setActiveTab] = useState<'resumen' | 'detalles'>('resumen');

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-PE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getAptitud = (csv: any) => {
    return csv?.Aptitud_Final || 'ND';
  };

  const getRestricciones = (csv: any) => {
    const restricciones = [];
    if (csv?.Restr_Lentes === 'SI' || csv?.Restr_Lentes === 'Si' || csv?.Restr_Lentes === 'si') {
      restricciones.push('Lentes');
    }
    if (csv?.Restr_Altura_1_8m === 'SI' || csv?.Restr_Altura_1_8m === 'Si' || csv?.Restr_Altura_1_8m === 'si') {
      restricciones.push('Altura > 1.8m');
    }
    if (csv?.Restr_Elec === 'SI' || csv?.Restr_Elec === 'Si' || csv?.Restr_Elec === 'si') {
      restricciones.push('Eléctrica');
    }
    return restricciones.length > 0 ? restricciones.join(', ') : 'Ninguna';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {isComparison ? 'Comparación de Análisis' : 'Detalles del Análisis'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('resumen')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'resumen'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Resumen
          </button>
          <button
            onClick={() => setActiveTab('detalles')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'detalles'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Detalles Completos
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'resumen' ? (
            <div className={`grid ${isComparison ? 'grid-cols-2' : 'grid-cols-1'} gap-6`}>
              {data.map((item, index) => {
                const csv = item.resultado_analisis?.csv_parseado || {};
                return (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      {isComparison ? `Análisis ${index + 1}` : 'Información del Análisis'}
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Fecha:</span>
                        <p className="text-sm text-gray-900">{formatDate(item.fecha_analisis)}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Trabajador:</span>
                        <p className="text-sm text-gray-900">{item.trabajador_nombre || '-'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">DNI:</span>
                        <p className="text-sm text-gray-900">{item.trabajador_dni || '-'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Aptitud:</span>
                        <p className={`text-sm font-semibold ${
                          getAptitud(csv) === 'APTO' ? 'text-green-600' : 
                          getAptitud(csv) === 'NO APTO' ? 'text-red-600' : 
                          'text-yellow-600'
                        }`}>
                          {getAptitud(csv)}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Restricciones:</span>
                        <p className="text-sm text-gray-900">{getRestricciones(csv)}</p>
                      </div>
                      {csv.PA_Sistolica && csv.PA_Diastolica && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Presión Arterial:</span>
                          <p className="text-sm text-gray-900">{csv.PA_Sistolica}/{csv.PA_Diastolica} mmHg</p>
                        </div>
                      )}
                      {csv.IMC && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">IMC:</span>
                          <p className="text-sm text-gray-900">{csv.IMC}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {data.map((item, index) => {
                const csv = item.resultado_analisis?.csv_parseado || {};
                return (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      {isComparison ? `Análisis ${index + 1} - Detalles` : 'Detalles Completos'}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(csv).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-xs font-medium text-gray-500">{key}:</span>
                          <p className="text-sm text-gray-900">{String(value || '-')}</p>
                        </div>
                      ))}
                    </div>
                    {item.resultado_analisis?.resumen_clinico && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <span className="text-sm font-medium text-gray-500">Resumen Clínico:</span>
                        <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                          {item.resultado_analisis.resumen_clinico}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}


