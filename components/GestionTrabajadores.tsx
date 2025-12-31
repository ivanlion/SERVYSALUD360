/**
 * GestionTrabajadores - Componente para gestionar trabajadores
 * 
 * Permite listar, crear, editar y gestionar trabajadores de la empresa
 * 
 * @component
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Trabajador, FormularioTrabajador, TipoDocumento, EstadoLaboral, getNombreCompleto } from '../types';
import { z } from 'zod';
import { 
  Plus, 
  Search, 
  Edit2, 
  Eye, 
  FileText, 
  Calendar, 
  Loader2, 
  X, 
  ChevronLeft, 
  ChevronRight,
  UserCheck,
  Filter
} from 'lucide-react';
import { logger } from '../utils/logger';

// Schema de validación con Zod
const trabajadorSchema = z.object({
  tipo_documento: z.enum(['DNI', 'CE', 'Pasaporte']),
  numero_documento: z.string().min(1, 'El número de documento es requerido'),
  apellido_paterno: z.string().min(1, 'El apellido paterno es requerido'),
  apellido_materno: z.string().min(1, 'El apellido materno es requerido'),
  nombres: z.string().min(1, 'Los nombres son requeridos'),
  fecha_nacimiento: z.string().optional(),
  sexo: z.enum(['Masculino', 'Femenino']).optional(),
  puesto_trabajo: z.string().min(1, 'El puesto de trabajo es requerido'),
  area_trabajo: z.string().optional(),
  fecha_ingreso: z.string().optional(),
});

type TrabajadorFormData = z.infer<typeof trabajadorSchema>;

// Hook para debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export default function GestionTrabajadores() {
  const { empresaActiva } = useCompany();
  const { showSuccess, showError } = useNotifications();
  
  // Estados
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<EstadoLaboral | 'Todos'>('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrabajador, setEditingTrabajador] = useState<Trabajador | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  const PAGE_SIZE = 20;
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Formulario
  const [formData, setFormData] = useState<TrabajadorFormData>({
    tipo_documento: 'DNI',
    numero_documento: '',
    apellido_paterno: '',
    apellido_materno: '',
    nombres: '',
    fecha_nacimiento: '',
    sexo: undefined,
    puesto_trabajo: '',
    area_trabajo: '',
    fecha_ingreso: '',
  });

  // Cargar trabajadores
  const loadTrabajadores = useCallback(async () => {
    if (!empresaActiva?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      logger.debug('[GestionTrabajadores] Cargando trabajadores...', { empresaId: empresaActiva.id });

      // Construir query base
      let query = supabase
        .from('trabajadores')
        .select('*', { count: 'exact' })
        .eq('empresa_id', empresaActiva.id);

      // Aplicar filtro de estado
      if (estadoFilter !== 'Todos') {
        query = query.eq('estado_laboral', estadoFilter);
      }

      // Aplicar búsqueda
      if (debouncedSearchTerm.trim()) {
        const search = debouncedSearchTerm.trim().toLowerCase();
        query = query.or(`numero_documento.ilike.%${search}%,apellido_paterno.ilike.%${search}%,apellido_materno.ilike.%${search}%,nombres.ilike.%${search}%`);
      }

      // Aplicar paginación
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to).order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        logger.error('[GestionTrabajadores] Error al cargar trabajadores', error);
        showError('Error al cargar trabajadores: ' + error.message);
        return;
      }

      // Convertir fechas de string a Date
      const trabajadoresWithDates = (data || []).map(t => ({
        ...t,
        fecha_nacimiento: t.fecha_nacimiento ? new Date(t.fecha_nacimiento) : undefined,
        fecha_ingreso: t.fecha_ingreso ? new Date(t.fecha_ingreso) : undefined,
        created_at: new Date(t.created_at),
        updated_at: new Date(t.updated_at),
      }));

      setTrabajadores(trabajadoresWithDates);
      setTotalCount(count || 0);
    } catch (error: any) {
      logger.error('[GestionTrabajadores] Error inesperado', error);
      showError('Error inesperado al cargar trabajadores');
    } finally {
      setIsLoading(false);
    }
  }, [empresaActiva?.id, estadoFilter, debouncedSearchTerm, currentPage, showError]);

  // Cargar trabajadores cuando cambian los filtros
  useEffect(() => {
    loadTrabajadores();
  }, [loadTrabajadores]);

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, estadoFilter]);

  // Abrir modal para nuevo trabajador
  const handleNewTrabajador = () => {
    setEditingTrabajador(null);
    setFormData({
      tipo_documento: 'DNI',
      numero_documento: '',
      apellido_paterno: '',
      apellido_materno: '',
      nombres: '',
      fecha_nacimiento: '',
      sexo: undefined,
      puesto_trabajo: '',
      area_trabajo: '',
      fecha_ingreso: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Abrir modal para editar trabajador
  const handleEdit = (trabajador: Trabajador) => {
    setEditingTrabajador(trabajador);
    setFormData({
      tipo_documento: trabajador.tipo_documento,
      numero_documento: trabajador.numero_documento,
      apellido_paterno: trabajador.apellido_paterno,
      apellido_materno: trabajador.apellido_materno,
      nombres: trabajador.nombres,
      fecha_nacimiento: trabajador.fecha_nacimiento 
        ? trabajador.fecha_nacimiento.toISOString().split('T')[0] 
        : '',
      sexo: trabajador.sexo,
      puesto_trabajo: trabajador.puesto_trabajo,
      area_trabajo: trabajador.area_trabajo || '',
      fecha_ingreso: trabajador.fecha_ingreso 
        ? trabajador.fecha_ingreso.toISOString().split('T')[0] 
        : '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Guardar trabajador
  const handleSave = async () => {
    try {
      // Validar formulario
      const validation = trabajadorSchema.safeParse(formData);
      if (!validation.success) {
        const errors: Record<string, string> = {};
        validation.error.errors.forEach(err => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setFormErrors(errors);
        showError('Por favor, complete todos los campos requeridos');
        return;
      }

      setIsSaving(true);
      setFormErrors({});

      if (!empresaActiva?.id) {
        showError('No hay empresa activa seleccionada');
        return;
      }

      const dataToSave = {
        ...validation.data,
        empresa_id: empresaActiva.id,
        estado_laboral: 'Activo' as EstadoLaboral,
        fecha_nacimiento: formData.fecha_nacimiento || null,
        fecha_ingreso: formData.fecha_ingreso || null,
      };

      if (editingTrabajador) {
        // Actualizar
        const { error } = await supabase
          .from('trabajadores')
          .update(dataToSave)
          .eq('id', editingTrabajador.id);

        if (error) {
          logger.error('[GestionTrabajadores] Error al actualizar trabajador', error);
          showError('Error al actualizar trabajador: ' + error.message);
          return;
        }

        showSuccess('Trabajador actualizado correctamente');
      } else {
        // Crear
        const { error } = await supabase
          .from('trabajadores')
          .insert(dataToSave);

        if (error) {
          logger.error('[GestionTrabajadores] Error al crear trabajador', error);
          
          // Manejar error de duplicado
          if (error.code === '23505') {
            showError('Ya existe un trabajador con este número de documento');
          } else {
            showError('Error al crear trabajador: ' + error.message);
          }
          return;
        }

        showSuccess('Trabajador creado correctamente');
      }

      setIsModalOpen(false);
      loadTrabajadores();
    } catch (error: any) {
      logger.error('[GestionTrabajadores] Error inesperado al guardar', error);
      showError('Error inesperado al guardar trabajador');
    } finally {
      setIsSaving(false);
    }
  };

  // Calcular total de páginas
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Formatear fecha para mostrar
  const formatDate = (date?: Date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  if (!empresaActiva) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Por favor, seleccione una empresa para gestionar trabajadores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Gestión de Trabajadores
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {totalCount} trabajador{totalCount !== 1 ? 'es' : ''} registrado{totalCount !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={handleNewTrabajador}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          <span>Nuevo Trabajador</span>
        </button>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por DNI o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filtro de estado */}
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-400" />
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value as EstadoLaboral | 'Todos')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="Todos">Todos los estados</option>
              <option value="Activo">Activo</option>
              <option value="Cesado">Cesado</option>
              <option value="Suspendido">Suspendido</option>
              <option value="Licencia">Licencia</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de trabajadores */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : trabajadores.length === 0 ? (
          <div className="text-center py-12">
            <UserCheck className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 dark:text-gray-400">
              No se encontraron trabajadores
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      DNI
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Nombre Completo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Puesto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Área
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {trabajadores.map((trabajador) => (
                    <tr key={trabajador.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {trabajador.numero_documento}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {getNombreCompleto(trabajador)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {trabajador.puesto_trabajo}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {trabajador.area_trabajo || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          trabajador.estado_laboral === 'Activo'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : trabajador.estado_laboral === 'Cesado'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : trabajador.estado_laboral === 'Suspendido'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                          {trabajador.estado_laboral}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(trabajador)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Ver detalles"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                            title="Ver exámenes médicos"
                          >
                            <FileText size={18} />
                          </button>
                          <button
                            className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                            title="Ver ausentismo"
                          >
                            <Calendar size={18} />
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
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Mostrando {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, totalCount)} de {totalCount}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de formulario */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingTrabajador ? 'Editar Trabajador' : 'Nuevo Trabajador'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Tipo de documento y número */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo de Documento *
                  </label>
                  <select
                    value={formData.tipo_documento}
                    onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value as TipoDocumento })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="DNI">DNI</option>
                    <option value="CE">CE</option>
                    <option value="Pasaporte">Pasaporte</option>
                  </select>
                  {formErrors.tipo_documento && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.tipo_documento}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Número de Documento *
                  </label>
                  <input
                    type="text"
                    value={formData.numero_documento}
                    onChange={(e) => setFormData({ ...formData, numero_documento: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  {formErrors.numero_documento && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.numero_documento}</p>
                  )}
                </div>
              </div>

              {/* Apellidos y nombres */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Apellido Paterno *
                  </label>
                  <input
                    type="text"
                    value={formData.apellido_paterno}
                    onChange={(e) => setFormData({ ...formData, apellido_paterno: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  {formErrors.apellido_paterno && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.apellido_paterno}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Apellido Materno *
                  </label>
                  <input
                    type="text"
                    value={formData.apellido_materno}
                    onChange={(e) => setFormData({ ...formData, apellido_materno: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  {formErrors.apellido_materno && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.apellido_materno}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombres *
                  </label>
                  <input
                    type="text"
                    value={formData.nombres}
                    onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  {formErrors.nombres && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.nombres}</p>
                  )}
                </div>
              </div>

              {/* Fecha de nacimiento y sexo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fecha de Nacimiento
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_nacimiento}
                    onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sexo
                  </label>
                  <select
                    value={formData.sexo || ''}
                    onChange={(e) => setFormData({ ...formData, sexo: e.target.value as 'Masculino' | 'Femenino' | undefined || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                  </select>
                </div>
              </div>

              {/* Puesto y área */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Puesto de Trabajo *
                  </label>
                  <input
                    type="text"
                    value={formData.puesto_trabajo}
                    onChange={(e) => setFormData({ ...formData, puesto_trabajo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  {formErrors.puesto_trabajo && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.puesto_trabajo}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Área de Trabajo
                  </label>
                  <input
                    type="text"
                    value={formData.area_trabajo}
                    onChange={(e) => setFormData({ ...formData, area_trabajo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Fecha de ingreso */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha de Ingreso
                </label>
                <input
                  type="date"
                  value={formData.fecha_ingreso}
                  onChange={(e) => setFormData({ ...formData, fecha_ingreso: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSaving && <Loader2 className="animate-spin" size={16} />}
                <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

