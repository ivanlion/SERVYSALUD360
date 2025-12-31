/**
 * PlanAnualSST - Componente para gestionar el Plan Anual de SST
 * 
 * Permite crear, editar y gestionar el Plan Anual de Seguridad y Salud en el Trabajo
 * con sus actividades asociadas
 * 
 * @component
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { useNotifications } from '../contexts/NotificationContext';
import { PlanAnualSST, ActividadPlanSST, EstadoPlan, EstadoActividad } from '../types';
import { z } from 'zod';
import { 
  Plus, 
  Edit2, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  X, 
  Loader2,
  ClipboardList,
  DollarSign,
  TrendingUp,
  Filter,
  Calendar,
  User
} from 'lucide-react';
import { logger } from '../utils/logger';

// Schema de validación para el plan
const planSchema = z.object({
  anio: z.number().min(2020).max(2100),
  objetivo_general: z.string().optional(),
  presupuesto_total: z.number().min(0).optional(),
  estado: z.enum(['En elaboración', 'Aprobado', 'En ejecución', 'Cerrado']),
});

// Schema de validación para actividad
const actividadSchema = z.object({
  nombre_actividad: z.string().min(1, 'El nombre de la actividad es requerido'),
  mes_programado: z.number().min(1).max(12).optional(),
  responsable: z.string().min(1, 'El responsable es requerido'),
});

type PlanFormData = z.infer<typeof planSchema>;
type ActividadFormData = z.infer<typeof actividadSchema>;

export default function PlanAnualSSTComponent() {
  const { empresaActiva } = useCompany();
  const { showSuccess, showError } = useNotifications();
  
  // Estados
  const [planActual, setPlanActual] = useState<PlanAnualSST | null>(null);
  const [actividades, setActividades] = useState<ActividadPlanSST[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isActividadModalOpen, setIsActividadModalOpen] = useState(false);
  const [editingActividad, setEditingActividad] = useState<ActividadPlanSST | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [estadoFilter, setEstadoFilter] = useState<EstadoActividad | 'Todos'>('Todos');
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());
  
  // Formulario de plan
  const [planFormData, setPlanFormData] = useState<PlanFormData>({
    anio: new Date().getFullYear(),
    objetivo_general: '',
    presupuesto_total: undefined,
    estado: 'En elaboración',
  });

  // Formulario de actividad
  const [actividadFormData, setActividadFormData] = useState<ActividadFormData>({
    nombre_actividad: '',
    mes_programado: undefined,
    responsable: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Cargar plan del año actual
  const loadPlan = useCallback(async () => {
    if (!empresaActiva?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      logger.debug('[PlanAnualSST] Cargando plan...', { empresaId: empresaActiva.id, anio: anioSeleccionado });

      // Cargar plan
      const { data: planData, error: planError } = await supabase
        .from('planes_anuales_sst')
        .select('*')
        .eq('empresa_id', empresaActiva.id)
        .eq('anio', anioSeleccionado)
        .maybeSingle();

      if (planError) {
        logger.error('[PlanAnualSST] Error al cargar plan', planError);
        showError('Error al cargar plan: ' + planError.message);
        return;
      }

      if (planData) {
        setPlanActual({
          ...planData,
          created_at: new Date(planData.created_at),
          updated_at: new Date(planData.updated_at),
        });

        // Cargar actividades del plan
        const { data: actividadesData, error: actividadesError } = await supabase
          .from('actividades_plan_sst')
          .select('*')
          .eq('plan_id', planData.id)
          .order('mes_programado', { ascending: true, nullsFirst: false });

        if (actividadesError) {
          logger.error('[PlanAnualSST] Error al cargar actividades', actividadesError);
          showError('Error al cargar actividades: ' + actividadesError.message);
          return;
        }

        const actividadesWithDates = (actividadesData || []).map(a => ({
          ...a,
          created_at: new Date(a.created_at),
        }));

        setActividades(actividadesWithDates);
      } else {
        setPlanActual(null);
        setActividades([]);
      }
    } catch (error: any) {
      logger.error('[PlanAnualSST] Error inesperado', error);
      showError('Error inesperado al cargar plan');
    } finally {
      setIsLoading(false);
    }
  }, [empresaActiva?.id, anioSeleccionado, showError]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  // Guardar plan
  const handleSavePlan = async () => {
    try {
      const validation = planSchema.safeParse(planFormData);
      if (!validation.success) {
        const errors: Record<string, string> = {};
        validation.error.issues.forEach(err => {
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
      };

      if (planActual) {
        // Actualizar
        const { error } = await supabase
          .from('planes_anuales_sst')
          .update(dataToSave)
          .eq('id', planActual.id);

        if (error) {
          logger.error('[PlanAnualSST] Error al actualizar plan', error);
          showError('Error al actualizar plan: ' + error.message);
          return;
        }

        showSuccess('Plan actualizado correctamente');
      } else {
        // Crear
        const { error } = await supabase
          .from('planes_anuales_sst')
          .insert(dataToSave);

        if (error) {
          logger.error('[PlanAnualSST] Error al crear plan', error);
          
          if (error.code === '23505') {
            showError('Ya existe un plan para este año');
          } else {
            showError('Error al crear plan: ' + error.message);
          }
          return;
        }

        showSuccess('Plan creado correctamente');
      }

      setIsPlanModalOpen(false);
      loadPlan();
    } catch (error: any) {
      logger.error('[PlanAnualSST] Error inesperado al guardar plan', error);
      showError('Error inesperado al guardar plan');
    } finally {
      setIsSaving(false);
    }
  };

  // Abrir modal para nuevo plan
  const handleNewPlan = () => {
    setPlanFormData({
      anio: anioSeleccionado,
      objetivo_general: '',
      presupuesto_total: undefined,
      estado: 'En elaboración',
    });
    setFormErrors({});
    setIsPlanModalOpen(true);
  };

  // Abrir modal para editar plan
  const handleEditPlan = () => {
    if (!planActual) return;
    setPlanFormData({
      anio: planActual.anio,
      objetivo_general: planActual.objetivo_general || '',
      presupuesto_total: planActual.presupuesto_total || undefined,
      estado: planActual.estado,
    });
    setFormErrors({});
    setIsPlanModalOpen(true);
  };

  // Abrir modal para nueva actividad
  const handleNewActividad = () => {
    if (!planActual) {
      showError('Debe crear un plan primero');
      return;
    }
    setEditingActividad(null);
    setActividadFormData({
      nombre_actividad: '',
      mes_programado: undefined,
      responsable: '',
    });
    setFormErrors({});
    setIsActividadModalOpen(true);
  };

  // Abrir modal para editar actividad
  const handleEditActividad = (actividad: ActividadPlanSST) => {
    setEditingActividad(actividad);
    setActividadFormData({
      nombre_actividad: actividad.nombre_actividad,
      mes_programado: actividad.mes_programado || undefined,
      responsable: actividad.responsable || '',
    });
    setFormErrors({});
    setIsActividadModalOpen(true);
  };

  // Guardar actividad
  const handleSaveActividad = async () => {
    try {
      if (!planActual) {
        showError('No hay plan activo');
        return;
      }

      const validation = actividadSchema.safeParse(actividadFormData);
      if (!validation.success) {
        const errors: Record<string, string> = {};
        validation.error.issues.forEach(err => {
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

      const dataToSave = {
        ...validation.data,
        plan_id: planActual.id,
        estado: 'Pendiente' as EstadoActividad,
      };

      if (editingActividad) {
        // Actualizar
        const { error } = await supabase
          .from('actividades_plan_sst')
          .update(dataToSave)
          .eq('id', editingActividad.id);

        if (error) {
          logger.error('[PlanAnualSST] Error al actualizar actividad', error);
          showError('Error al actualizar actividad: ' + error.message);
          return;
        }

        showSuccess('Actividad actualizada correctamente');
      } else {
        // Crear
        const { error } = await supabase
          .from('actividades_plan_sst')
          .insert(dataToSave);

        if (error) {
          logger.error('[PlanAnualSST] Error al crear actividad', error);
          showError('Error al crear actividad: ' + error.message);
          return;
        }

        showSuccess('Actividad creada correctamente');
      }

      setIsActividadModalOpen(false);
      loadPlan();
    } catch (error: any) {
      logger.error('[PlanAnualSST] Error inesperado al guardar actividad', error);
      showError('Error inesperado al guardar actividad');
    } finally {
      setIsSaving(false);
    }
  };

  // Marcar actividad como completada
  const handleCompletarActividad = async (actividad: ActividadPlanSST) => {
    try {
      const { error } = await supabase
        .from('actividades_plan_sst')
        .update({ estado: 'Completada' })
        .eq('id', actividad.id);

      if (error) {
        logger.error('[PlanAnualSST] Error al completar actividad', error);
        showError('Error al completar actividad: ' + error.message);
        return;
      }

      showSuccess('Actividad marcada como completada');
      loadPlan();
    } catch (error: any) {
      logger.error('[PlanAnualSST] Error inesperado', error);
      showError('Error inesperado');
    }
  };

  // Calcular indicadores
  const indicadores = useMemo(() => {
    const total = actividades.length;
    const completadas = actividades.filter(a => a.estado === 'Completada').length;
    const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0;
    
    // Agrupar por mes para el gráfico
    const actividadesPorMes = Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1;
      const actividadesMes = actividades.filter(a => a.mes_programado === mes);
      const completadasMes = actividadesMes.filter(a => a.estado === 'Completada').length;
      return {
        mes,
        nombre: new Date(2024, i, 1).toLocaleDateString('es-PE', { month: 'short' }),
        programadas: actividadesMes.length,
        completadas: completadasMes,
        porcentaje: actividadesMes.length > 0 ? Math.round((completadasMes / actividadesMes.length) * 100) : 0,
      };
    });

    return {
      total,
      completadas,
      pendientes: actividades.filter(a => a.estado === 'Pendiente').length,
      enProceso: actividades.filter(a => a.estado === 'En proceso').length,
      porcentaje,
      actividadesPorMes,
    };
  }, [actividades]);

  // Filtrar actividades
  const actividadesFiltradas = useMemo(() => {
    if (estadoFilter === 'Todos') {
      return actividades;
    }
    return actividades.filter(a => a.estado === estadoFilter);
  }, [actividades, estadoFilter]);

  // Nombres de meses
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  if (!empresaActiva) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Por favor, seleccione una empresa para gestionar el Plan Anual de SST.</p>
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
            Plan Anual de SST
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Gestión del Plan Anual de Seguridad y Salud en el Trabajo
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={anioSeleccionado}
            onChange={(e) => setAnioSeleccionado(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(anio => (
              <option key={anio} value={anio}>{anio}</option>
            ))}
          </select>
          {!planActual && (
            <button
              onClick={handleNewPlan}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              <span>Crear Plan</span>
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : planActual ? (
        <>
          {/* Card de resumen del plan */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Plan {planActual.anio}
                </h2>
                {planActual.objetivo_general && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {planActual.objetivo_general}
                  </p>
                )}
              </div>
              <button
                onClick={handleEditPlan}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Edit2 size={18} />
                <span>Editar Plan</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="text-blue-600 dark:text-blue-400" size={20} />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Presupuesto</span>
                </div>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {planActual.presupuesto_total 
                    ? `S/ ${planActual.presupuesto_total.toLocaleString('es-PE')}`
                    : 'No definido'}
                </p>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-100 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="text-green-600 dark:text-green-400" size={20} />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">Cumplimiento</span>
                </div>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {indicadores.porcentaje}%
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  {indicadores.completadas} de {indicadores.total} actividades
                </p>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-100 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardList className="text-purple-600 dark:text-purple-400" size={20} />
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Estado</span>
                </div>
                <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                  {planActual.estado}
                </p>
              </div>
            </div>
          </div>

          {/* Indicadores */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Actividades</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{indicadores.total}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Completadas</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{indicadores.completadas}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">En Proceso</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{indicadores.enProceso}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pendientes</p>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{indicadores.pendientes}</p>
            </div>
          </div>

          {/* Gráfico de cumplimiento mensual */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Cumplimiento Mensual
            </h3>
            <div className="space-y-3">
              {indicadores.actividadesPorMes.map((mes) => (
                <div key={mes.mes} className="flex items-center gap-4">
                  <div className="w-12 text-sm font-medium text-gray-600 dark:text-gray-400">
                    {mes.nombre}
                  </div>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        mes.porcentaje === 100
                          ? 'bg-green-500'
                          : mes.porcentaje >= 50
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${mes.porcentaje}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-900 dark:text-white">
                      {mes.completadas}/{mes.programadas} ({mes.porcentaje}%)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gestión de actividades */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Actividades del Plan
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter size={18} className="text-gray-400" />
                  <select
                    value={estadoFilter}
                    onChange={(e) => setEstadoFilter(e.target.value as EstadoActividad | 'Todos')}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                  >
                    <option value="Todos">Todos los estados</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="En proceso">En proceso</option>
                    <option value="Completada">Completada</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>
                </div>
                <button
                  onClick={handleNewActividad}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus size={18} />
                  <span>Nueva Actividad</span>
                </button>
              </div>
            </div>

            {actividadesFiltradas.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600 dark:text-gray-400">
                  No hay actividades {estadoFilter !== 'Todos' ? `con estado "${estadoFilter}"` : ''}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Actividad
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Mes
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Responsable
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
                    {actividadesFiltradas.map((actividad) => (
                      <tr key={actividad.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {actividad.nombre_actividad}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {actividad.mes_programado 
                            ? meses[actividad.mes_programado - 1]
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {actividad.responsable || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            actividad.estado === 'Completada'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : actividad.estado === 'En proceso'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : actividad.estado === 'Cancelada'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                            {actividad.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {actividad.estado !== 'Completada' && (
                              <button
                                onClick={() => handleCompletarActividad(actividad)}
                                className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                title="Marcar como completada"
                              >
                                <CheckCircle2 size={18} />
                              </button>
                            )}
                            <button
                              onClick={() => handleEditActividad(actividad)}
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <ClipboardList className="mx-auto text-gray-400 mb-4" size={64} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No hay plan para el año {anioSeleccionado}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Cree un nuevo plan anual de SST para comenzar
          </p>
          <button
            onClick={handleNewPlan}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
          >
            <Plus size={20} />
            <span>Crear Plan {anioSeleccionado}</span>
          </button>
        </div>
      )}

      {/* Modal de Plan */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {planActual ? 'Editar Plan' : 'Nuevo Plan Anual SST'}
              </h2>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Año *
                </label>
                <input
                  type="number"
                  value={planFormData.anio}
                  onChange={(e) => setPlanFormData({ ...planFormData, anio: parseInt(e.target.value) })}
                  min="2020"
                  max="2100"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                {formErrors.anio && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.anio}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Objetivo General
                </label>
                <textarea
                  value={planFormData.objetivo_general}
                  onChange={(e) => setPlanFormData({ ...planFormData, objetivo_general: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Describa el objetivo general del plan..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Presupuesto Total (S/)
                </label>
                <input
                  type="number"
                  value={planFormData.presupuesto_total || ''}
                  onChange={(e) => setPlanFormData({ ...planFormData, presupuesto_total: e.target.value ? parseFloat(e.target.value) : undefined })}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Estado *
                </label>
                <select
                  value={planFormData.estado}
                  onChange={(e) => setPlanFormData({ ...planFormData, estado: e.target.value as EstadoPlan })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="En elaboración">En elaboración</option>
                  <option value="Aprobado">Aprobado</option>
                  <option value="En ejecución">En ejecución</option>
                  <option value="Cerrado">Cerrado</option>
                </select>
                {formErrors.estado && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.estado}</p>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePlan}
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

      {/* Modal de Actividad */}
      {isActividadModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingActividad ? 'Editar Actividad' : 'Nueva Actividad'}
              </h2>
              <button
                onClick={() => setIsActividadModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre de la Actividad *
                </label>
                <input
                  type="text"
                  value={actividadFormData.nombre_actividad}
                  onChange={(e) => setActividadFormData({ ...actividadFormData, nombre_actividad: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                {formErrors.nombre_actividad && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.nombre_actividad}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mes Programado
                </label>
                <select
                  value={actividadFormData.mes_programado || ''}
                  onChange={(e) => setActividadFormData({ ...actividadFormData, mes_programado: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Seleccionar mes...</option>
                  {meses.map((mes, index) => (
                    <option key={index + 1} value={index + 1}>
                      {mes}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Responsable *
                </label>
                <input
                  type="text"
                  value={actividadFormData.responsable}
                  onChange={(e) => setActividadFormData({ ...actividadFormData, responsable: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                {formErrors.responsable && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.responsable}</p>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsActividadModalOpen(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveActividad}
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

