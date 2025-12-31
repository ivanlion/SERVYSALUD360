/**
 * GestionCapacitaciones - Componente para gestionar el programa de capacitaciones SST
 * 
 * Permite crear programas anuales, programar capacitaciones, registrar asistencia
 * y visualizar estadísticas con calendario mensual
 * 
 * @component
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { useNotifications } from '../contexts/NotificationContext';
import { 
  ProgramaCapacitacionSST, 
  CapacitacionSST, 
  AsistenciaCapacitacion,
  Trabajador,
  getNombreCompleto
} from '../types';
import { z } from 'zod';
import { 
  Plus, 
  Edit2, 
  Eye, 
  X, 
  Loader2,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  GraduationCap,
  TrendingUp,
  Filter,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square
} from 'lucide-react';
import { logger } from '../utils/logger';

// Schema de validación para programa
const programaSchema = z.object({
  anio: z.number().min(2020).max(2100),
  objetivo_general: z.string().optional(),
  estado: z.enum(['Vigente', 'Cerrado']),
});

// Schema de validación para capacitación
const capacitacionSchema = z.object({
  nombre_curso: z.string().min(1, 'El nombre del curso es requerido'),
  tipo_capacitacion: z.string().optional(),
  fecha_programada: z.string().min(1, 'La fecha programada es requerida'),
  duracion_horas: z.number().min(0).optional(),
  lugar: z.string().optional(),
  expositor: z.string().optional(),
  materiales: z.string().optional(),
});

type ProgramaFormData = z.infer<typeof programaSchema>;
type CapacitacionFormData = z.infer<typeof capacitacionSchema>;

// Tipo extendido con datos del programa
interface CapacitacionConPrograma extends CapacitacionSST {
  programa?: ProgramaCapacitacionSST;
  asistencias?: AsistenciaCapacitacion[];
  trabajadores?: Trabajador[];
}

export default function GestionCapacitacionesComponent() {
  const { empresaActiva } = useCompany();
  const { showSuccess, showError } = useNotifications();
  
  // Estados principales
  const [programaActual, setProgramaActual] = useState<ProgramaCapacitacionSST | null>(null);
  const [capacitaciones, setCapacitaciones] = useState<CapacitacionConPrograma[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Modales
  const [isProgramaModalOpen, setIsProgramaModalOpen] = useState(false);
  const [isCapacitacionModalOpen, setIsCapacitacionModalOpen] = useState(false);
  const [isAsistenciaModalOpen, setIsAsistenciaModalOpen] = useState(false);
  const [isDetalleModalOpen, setIsDetalleModalOpen] = useState(false);
  
  // Edición
  const [editingCapacitacion, setEditingCapacitacion] = useState<CapacitacionConPrograma | null>(null);
  const [capacitacionParaAsistencia, setCapacitacionParaAsistencia] = useState<CapacitacionConPrograma | null>(null);
  
  // Formularios
  const [programaFormData, setProgramaFormData] = useState<ProgramaFormData>({
    anio: new Date().getFullYear(),
    objetivo_general: '',
    estado: 'Vigente',
  });
  
  const [capacitacionFormData, setCapacitacionFormData] = useState<CapacitacionFormData>({
    nombre_curso: '',
    tipo_capacitacion: '',
    fecha_programada: '',
    duracion_horas: undefined,
    lugar: '',
    expositor: '',
    materiales: '',
  });
  
  // Asistencia
  const [asistencias, setAsistencias] = useState<Record<string, { asistio: boolean; aprobo: boolean; nota?: number }>>({});
  
  // Filtros
  const [estadoFilter, setEstadoFilter] = useState<'Programada' | 'Ejecutada' | 'Cancelada' | 'Todos'>('Todos');
  const [mesFilter, setMesFilter] = useState<number | 'Todos'>('Todos');
  
  // Calendario
  const [mesCalendario, setMesCalendario] = useState(new Date().getMonth());
  const [anioCalendario, setAnioCalendario] = useState(new Date().getFullYear());
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Cargar trabajadores
  const loadTrabajadores = useCallback(async () => {
    if (!empresaActiva?.id) return;

    try {
      const { data, error } = await supabase
        .from('trabajadores')
        .select('*')
        .eq('empresa_id', empresaActiva.id)
        .eq('estado_laboral', 'Activo')
        .order('apellido_paterno', { ascending: true });

      if (error) {
        logger.error('[GestionCapacitaciones] Error al cargar trabajadores', error);
        return;
      }

      const trabajadoresWithDates = (data || []).map(t => ({
        ...t,
        fecha_nacimiento: t.fecha_nacimiento ? new Date(t.fecha_nacimiento) : undefined,
        fecha_ingreso: t.fecha_ingreso ? new Date(t.fecha_ingreso) : undefined,
        created_at: new Date(t.created_at),
        updated_at: new Date(t.updated_at),
      }));

      setTrabajadores(trabajadoresWithDates);
    } catch (error: any) {
      logger.error('[GestionCapacitaciones] Error inesperado al cargar trabajadores', error);
    }
  }, [empresaActiva?.id]);

  // Cargar programa y capacitaciones
  const loadData = useCallback(async () => {
    if (!empresaActiva?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const anioActual = new Date().getFullYear();

      // Cargar programa
      const { data: programaData, error: programaError } = await supabase
        .from('programa_capacitacion_sst')
        .select('*')
        .eq('empresa_id', empresaActiva.id)
        .eq('anio', anioActual)
        .maybeSingle();

      if (programaError) {
        logger.error('[GestionCapacitaciones] Error al cargar programa', programaError);
        showError('Error al cargar programa: ' + programaError.message);
        return;
      }

      if (programaData) {
        setProgramaActual({
          ...programaData,
          created_at: new Date(programaData.created_at),
        });

        // Cargar capacitaciones
        const { data: capacitacionesData, error: capacitacionesError } = await supabase
          .from('capacitaciones_sst')
          .select('*')
          .eq('programa_id', programaData.id)
          .order('fecha_programada', { ascending: true, nullsFirst: false });

        if (capacitacionesError) {
          logger.error('[GestionCapacitaciones] Error al cargar capacitaciones', capacitacionesError);
          showError('Error al cargar capacitaciones: ' + capacitacionesError.message);
          return;
        }

        // Cargar asistencias para cada capacitación
        const capacitacionesWithAsistencias = await Promise.all(
          (capacitacionesData || []).map(async (cap) => {
            const { data: asistenciasData } = await supabase
              .from('asistencia_capacitaciones')
              .select('*')
              .eq('capacitacion_id', cap.id);

            return {
              ...cap,
              fecha_programada: cap.fecha_programada ? new Date(cap.fecha_programada) : undefined,
              created_at: new Date(cap.created_at),
              asistencias: (asistenciasData || []).map(a => ({
                ...a,
                created_at: new Date(a.created_at),
              })),
            };
          })
        );

        setCapacitaciones(capacitacionesWithAsistencias);
      } else {
        setProgramaActual(null);
        setCapacitaciones([]);
      }
    } catch (error: any) {
      logger.error('[GestionCapacitaciones] Error inesperado', error);
      showError('Error inesperado al cargar datos');
    } finally {
      setIsLoading(false);
    }
  }, [empresaActiva?.id, showError]);

  useEffect(() => {
    loadTrabajadores();
  }, [loadTrabajadores]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Guardar programa
  const handleSavePrograma = async () => {
    try {
      const validation = programaSchema.safeParse(programaFormData);
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

      if (programaActual) {
        // Actualizar
        const { error } = await supabase
          .from('programa_capacitacion_sst')
          .update(dataToSave)
          .eq('id', programaActual.id);

        if (error) {
          logger.error('[GestionCapacitaciones] Error al actualizar programa', error);
          showError('Error al actualizar programa: ' + error.message);
          return;
        }

        showSuccess('Programa actualizado correctamente');
      } else {
        // Crear
        const { error } = await supabase
          .from('programa_capacitacion_sst')
          .insert(dataToSave);

        if (error) {
          logger.error('[GestionCapacitaciones] Error al crear programa', error);
          if (error.code === '23505') {
            showError('Ya existe un programa para este año');
          } else {
            showError('Error al crear programa: ' + error.message);
          }
          return;
        }

        showSuccess('Programa creado correctamente');
      }

      setIsProgramaModalOpen(false);
      loadData();
    } catch (error: any) {
      logger.error('[GestionCapacitaciones] Error inesperado al guardar programa', error);
      showError('Error inesperado al guardar programa');
    } finally {
      setIsSaving(false);
    }
  };

  // Guardar capacitación
  const handleSaveCapacitacion = async () => {
    try {
      if (!programaActual) {
        showError('Debe crear un programa primero');
        return;
      }

      const validation = capacitacionSchema.safeParse(capacitacionFormData);
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
        programa_id: programaActual.id,
        empresa_id: empresaActiva!.id,
        estado: 'Programada' as const,
      };

      if (editingCapacitacion) {
        // Actualizar
        const { error } = await supabase
          .from('capacitaciones_sst')
          .update(dataToSave)
          .eq('id', editingCapacitacion.id);

        if (error) {
          logger.error('[GestionCapacitaciones] Error al actualizar capacitación', error);
          showError('Error al actualizar capacitación: ' + error.message);
          return;
        }

        showSuccess('Capacitación actualizada correctamente');
      } else {
        // Crear
        const { error } = await supabase
          .from('capacitaciones_sst')
          .insert(dataToSave);

        if (error) {
          logger.error('[GestionCapacitaciones] Error al crear capacitación', error);
          showError('Error al crear capacitación: ' + error.message);
          return;
        }

        showSuccess('Capacitación creada correctamente');
      }

      setIsCapacitacionModalOpen(false);
      loadData();
    } catch (error: any) {
      logger.error('[GestionCapacitaciones] Error inesperado al guardar capacitación', error);
      showError('Error inesperado al guardar capacitación');
    } finally {
      setIsSaving(false);
    }
  };

  // Marcar como ejecutada
  const handleMarcarEjecutada = async (capacitacion: CapacitacionConPrograma) => {
    try {
      const { error } = await supabase
        .from('capacitaciones_sst')
        .update({ estado: 'Ejecutada' })
        .eq('id', capacitacion.id);

      if (error) {
        logger.error('[GestionCapacitaciones] Error al marcar como ejecutada', error);
        showError('Error: ' + error.message);
        return;
      }

      showSuccess('Capacitación marcada como ejecutada');
      loadData();
    } catch (error: any) {
      logger.error('[GestionCapacitaciones] Error inesperado', error);
      showError('Error inesperado');
    }
  };

  // Cancelar capacitación
  const handleCancelar = async (capacitacion: CapacitacionConPrograma) => {
    try {
      const { error } = await supabase
        .from('capacitaciones_sst')
        .update({ estado: 'Cancelada' })
        .eq('id', capacitacion.id);

      if (error) {
        logger.error('[GestionCapacitaciones] Error al cancelar', error);
        showError('Error: ' + error.message);
        return;
      }

      showSuccess('Capacitación cancelada');
      loadData();
    } catch (error: any) {
      logger.error('[GestionCapacitaciones] Error inesperado', error);
      showError('Error inesperado');
    }
  };

  // Abrir modal de asistencia
  const handleRegistrarAsistencia = (capacitacion: CapacitacionConPrograma) => {
    setCapacitacionParaAsistencia(capacitacion);
    
    // Cargar asistencias existentes
    const asistenciasExistentes: Record<string, { asistio: boolean; aprobo: boolean; nota?: number }> = {};
    (capacitacion.asistencias || []).forEach(a => {
      asistenciasExistentes[a.trabajador_id] = {
        asistio: a.asistio,
        aprobo: a.aprobo,
        nota: (a as any).nota_obtenida || undefined,
      };
    });
    
    // Inicializar todos los trabajadores
    trabajadores.forEach(t => {
      if (!asistenciasExistentes[t.id]) {
        asistenciasExistentes[t.id] = { asistio: false, aprobo: false, nota: undefined };
      }
    });
    
    setAsistencias(asistenciasExistentes);
    setIsAsistenciaModalOpen(true);
  };

  // Guardar asistencia
  const handleSaveAsistencia = async () => {
    try {
      if (!capacitacionParaAsistencia) return;

      setIsSaving(true);

      // Eliminar asistencias existentes
      const { error: deleteError } = await supabase
        .from('asistencia_capacitaciones')
        .delete()
        .eq('capacitacion_id', capacitacionParaAsistencia.id);

      if (deleteError) {
        logger.error('[GestionCapacitaciones] Error al eliminar asistencias', deleteError);
        showError('Error al actualizar asistencia');
        return;
      }

      // Insertar nuevas asistencias
      const asistenciasToInsert = Object.entries(asistencias)
        .filter(([_, data]) => data.asistio || data.aprobo)
        .map(([trabajadorId, data]) => ({
          capacitacion_id: capacitacionParaAsistencia.id,
          trabajador_id: trabajadorId,
          asistio: data.asistio,
          aprobo: data.aprobo,
          nota_obtenida: data.nota,
        }));

      if (asistenciasToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('asistencia_capacitaciones')
          .insert(asistenciasToInsert);

        if (insertError) {
          logger.error('[GestionCapacitaciones] Error al guardar asistencias', insertError);
          showError('Error al guardar asistencia: ' + insertError.message);
          return;
        }
      }

      showSuccess('Asistencia registrada correctamente');
      setIsAsistenciaModalOpen(false);
      loadData();
    } catch (error: any) {
      logger.error('[GestionCapacitaciones] Error inesperado al guardar asistencia', error);
      showError('Error inesperado');
    } finally {
      setIsSaving(false);
    }
  };

  // Calcular estadísticas
  const estadisticas = useMemo(() => {
    const total = capacitaciones.length;
    const ejecutadas = capacitaciones.filter(c => c.estado === 'Ejecutada').length;
    
    // Calcular total de asistencias
    const totalAsistencias = capacitaciones.reduce((sum, c) => {
      return sum + (c.asistencias?.filter(a => a.asistio).length || 0);
    }, 0);
    
    // Calcular total de participantes registrados (asistencias totales)
    const totalParticipantes = capacitaciones.reduce((sum, c) => {
      return sum + (c.asistencias?.length || 0);
    }, 0);
    
    const promedioAsistencia = totalParticipantes > 0 
      ? Math.round((totalAsistencias / totalParticipantes) * 100)
      : 0;
    
    // Trabajadores únicos capacitados
    const trabajadoresCapacitados = new Set<string>();
    capacitaciones.forEach(c => {
      c.asistencias?.forEach(a => {
        if (a.asistio) {
          trabajadoresCapacitados.add(a.trabajador_id);
        }
      });
    });

    return {
      total,
      ejecutadas,
      promedioAsistencia,
      trabajadoresCapacitados: trabajadoresCapacitados.size,
    };
  }, [capacitaciones]);

  // Filtrar capacitaciones
  const capacitacionesFiltradas = useMemo(() => {
    let filtered = capacitaciones;

    if (estadoFilter !== 'Todos') {
      filtered = filtered.filter(c => c.estado === estadoFilter);
    }

    if (mesFilter !== 'Todos') {
      filtered = filtered.filter(c => {
        if (!c.fecha_programada) return false;
        return c.fecha_programada.getMonth() === mesFilter;
      });
    }

    return filtered;
  }, [capacitaciones, estadoFilter, mesFilter]);

  // Capacitaciones del mes para calendario
  const capacitacionesCalendario = useMemo(() => {
    return capacitaciones.filter(c => {
      if (!c.fecha_programada) return false;
      return c.fecha_programada.getMonth() === mesCalendario &&
             c.fecha_programada.getFullYear() === anioCalendario;
    });
  }, [capacitaciones, mesCalendario, anioCalendario]);

  // Generar días del mes para calendario
  const diasDelMes = useMemo(() => {
    const primerDia = new Date(anioCalendario, mesCalendario, 1);
    const ultimoDia = new Date(anioCalendario, mesCalendario + 1, 0);
    const diasEnMes = ultimoDia.getDate();
    const diaInicioSemana = primerDia.getDay();

    const dias: Array<{ dia: number; capacitaciones: CapacitacionConPrograma[] }> = [];
    
    // Días vacíos al inicio
    for (let i = 0; i < diaInicioSemana; i++) {
      dias.push({ dia: 0, capacitaciones: [] });
    }

    // Días del mes
    for (let dia = 1; dia <= diasEnMes; dia++) {
      const fecha = new Date(anioCalendario, mesCalendario, dia);
      const capacitacionesDelDia = capacitacionesCalendario.filter(c => {
        if (!c.fecha_programada) return false;
        return c.fecha_programada.getDate() === dia;
      });
      dias.push({ dia, capacitaciones: capacitacionesDelDia });
    }

    return dias;
  }, [anioCalendario, mesCalendario, capacitacionesCalendario]);

  // Nombres de meses
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  // Formatear fecha
  const formatDate = (date?: Date) => {
    if (!date) return '-';
    return date.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Obtener color por estado
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Programada':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Ejecutada':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Cancelada':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  if (!empresaActiva) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Por favor, seleccione una empresa para gestionar capacitaciones.</p>
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
            Gestión de Capacitaciones SST
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Programa anual de capacitaciones en Seguridad y Salud en el Trabajo
          </p>
        </div>
        {programaActual && (
          <button
            onClick={() => {
              setEditingCapacitacion(null);
              setCapacitacionFormData({
                nombre_curso: '',
                tipo_capacitacion: '',
                fecha_programada: '',
                duracion_horas: undefined,
                lugar: '',
                expositor: '',
                materiales: '',
              });
              setFormErrors({});
              setIsCapacitacionModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            <span>Nueva Capacitación</span>
          </button>
        )}
      </div>

      {/* Programa Anual */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {programaActual ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="text-blue-600 dark:text-blue-400" size={24} />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Programa {programaActual.anio}
                </h2>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  programaActual.estado === 'Vigente'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                }`}>
                  {programaActual.estado}
                </span>
              </div>
              {programaActual.objetivo_general && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {programaActual.objetivo_general}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setProgramaFormData({
                  anio: programaActual.anio,
                  objetivo_general: programaActual.objetivo_general || '',
                  estado: programaActual.estado,
                });
                setFormErrors({});
                setIsProgramaModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Edit2 size={18} />
              <span>Editar Programa</span>
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <GraduationCap className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No hay programa para el año {new Date().getFullYear()}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Cree un nuevo programa anual de capacitaciones
            </p>
            <button
              onClick={() => {
                setProgramaFormData({
                  anio: new Date().getFullYear(),
                  objetivo_general: '',
                  estado: 'Vigente',
                });
                setFormErrors({});
                setIsProgramaModalOpen(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
            >
              <Plus size={20} />
              <span>Crear Programa</span>
            </button>
          </div>
        )}
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="text-blue-600 dark:text-blue-400" size={20} />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Año</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{estadisticas.total}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="text-green-600 dark:text-green-400" size={20} />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Ejecutadas</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{estadisticas.ejecutadas}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-purple-600 dark:text-purple-400" size={20} />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Promedio Asistencia</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{estadisticas.promedioAsistencia}%</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="text-orange-600 dark:text-orange-400" size={20} />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Trabajadores Capacitados</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{estadisticas.trabajadoresCapacitados}</p>
        </div>
      </div>

      {/* Calendario Mensual */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Calendario de Capacitaciones
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (mesCalendario === 0) {
                  setMesCalendario(11);
                  setAnioCalendario(anioCalendario - 1);
                } else {
                  setMesCalendario(mesCalendario - 1);
                }
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-lg font-semibold text-gray-900 dark:text-white min-w-[200px] text-center">
              {meses[mesCalendario]} {anioCalendario}
            </span>
            <button
              onClick={() => {
                if (mesCalendario === 11) {
                  setMesCalendario(0);
                  setAnioCalendario(anioCalendario + 1);
                } else {
                  setMesCalendario(mesCalendario + 1);
                }
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(dia => (
            <div key={dia} className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400 py-2">
              {dia}
            </div>
          ))}
          {diasDelMes.map((diaData, index) => (
            <div
              key={index}
              className={`min-h-[80px] border border-gray-200 dark:border-gray-700 rounded-lg p-2 ${
                diaData.dia === 0 ? 'bg-gray-50 dark:bg-gray-900' : 'bg-white dark:bg-gray-800'
              }`}
            >
              {diaData.dia > 0 && (
                <>
                  <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {diaData.dia}
                  </div>
                  <div className="space-y-1">
                    {diaData.capacitaciones.map(cap => (
                      <div
                        key={cap.id}
                        onClick={() => {
                          setEditingCapacitacion(cap);
                          setIsDetalleModalOpen(true);
                        }}
                        className={`text-xs p-1 rounded cursor-pointer truncate ${
                          cap.estado === 'Programada'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : cap.estado === 'Ejecutada'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}
                        title={cap.nombre_curso}
                      >
                        {cap.nombre_curso}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="Todos">Todos los estados</option>
              <option value="Programada">Programada</option>
              <option value="Ejecutada">Ejecutada</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>
          <select
            value={mesFilter}
            onChange={(e) => setMesFilter(e.target.value === 'Todos' ? 'Todos' : parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
          >
            <option value="Todos">Todos los meses</option>
            {meses.map((mes, index) => (
              <option key={index} value={index}>{mes}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Capacitaciones */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : capacitacionesFiltradas.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 dark:text-gray-400">
              No se encontraron capacitaciones
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Asistentes
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {capacitacionesFiltradas.map((capacitacion) => {
                  const asistentes = capacitacion.asistencias?.filter(a => a.asistio).length || 0;
                  const totalAsistentes = capacitacion.asistencias?.length || 0;
                  
                  return (
                    <tr key={capacitacion.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {capacitacion.nombre_curso}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {capacitacion.tipo_capacitacion || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(capacitacion.fecha_programada)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(capacitacion.estado)}`}>
                          {capacitacion.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {asistentes} / {totalAsistentes}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingCapacitacion(capacitacion);
                              setCapacitacionFormData({
                                nombre_curso: capacitacion.nombre_curso,
                                tipo_capacitacion: capacitacion.tipo_capacitacion || '',
                                fecha_programada: capacitacion.fecha_programada 
                                  ? capacitacion.fecha_programada.toISOString().split('T')[0]
                                  : '',
                                duracion_horas: (capacitacion as any).duracion_horas || undefined,
                                lugar: (capacitacion as any).lugar || '',
                                expositor: (capacitacion as any).expositor || '',
                                materiales: (capacitacion as any).materiales || '',
                              });
                              setFormErrors({});
                              setIsCapacitacionModalOpen(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingCapacitacion(capacitacion);
                              setIsDetalleModalOpen(true);
                            }}
                            className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Ver detalle"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleRegistrarAsistencia(capacitacion)}
                            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title="Registrar asistencia"
                          >
                            <Users size={18} />
                          </button>
                          {capacitacion.estado === 'Programada' && (
                            <>
                              <button
                                onClick={() => handleMarcarEjecutada(capacitacion)}
                                className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                                title="Marcar como ejecutada"
                              >
                                <CheckCircle2 size={18} />
                              </button>
                              <button
                                onClick={() => handleCancelar(capacitacion)}
                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Cancelar"
                              >
                                <XCircle size={18} />
                              </button>
                            </>
                          )}
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

      {/* Modal de Programa */}
      {isProgramaModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {programaActual ? 'Editar Programa' : 'Nuevo Programa Anual'}
              </h2>
              <button
                onClick={() => setIsProgramaModalOpen(false)}
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
                  value={programaFormData.anio}
                  onChange={(e) => setProgramaFormData({ ...programaFormData, anio: parseInt(e.target.value) })}
                  min="2020"
                  max="2100"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Objetivo General
                </label>
                <textarea
                  value={programaFormData.objetivo_general}
                  onChange={(e) => setProgramaFormData({ ...programaFormData, objetivo_general: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Describa el objetivo general del programa..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Estado *
                </label>
                <select
                  value={programaFormData.estado}
                  onChange={(e) => setProgramaFormData({ ...programaFormData, estado: e.target.value as 'Vigente' | 'Cerrado' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="Vigente">Vigente</option>
                  <option value="Cerrado">Cerrado</option>
                </select>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsProgramaModalOpen(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePrograma}
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

      {/* Modal de Capacitación */}
      {isCapacitacionModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingCapacitacion ? 'Editar Capacitación' : 'Nueva Capacitación'}
              </h2>
              <button
                onClick={() => setIsCapacitacionModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre del Curso *
                </label>
                <input
                  type="text"
                  value={capacitacionFormData.nombre_curso}
                  onChange={(e) => setCapacitacionFormData({ ...capacitacionFormData, nombre_curso: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                {formErrors.nombre_curso && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.nombre_curso}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo de Capacitación
                </label>
                <input
                  type="text"
                  value={capacitacionFormData.tipo_capacitacion}
                  onChange={(e) => setCapacitacionFormData({ ...capacitacionFormData, tipo_capacitacion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Ej: Inducción general, Capacitación especializada..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha Programada *
                </label>
                <input
                  type="date"
                  value={capacitacionFormData.fecha_programada}
                  onChange={(e) => setCapacitacionFormData({ ...capacitacionFormData, fecha_programada: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                {formErrors.fecha_programada && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.fecha_programada}</p>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsCapacitacionModalOpen(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCapacitacion}
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

      {/* Modal de Asistencia */}
      {isAsistenciaModalOpen && capacitacionParaAsistencia && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Registrar Asistencia
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {capacitacionParaAsistencia.nombre_curso}
                </p>
              </div>
              <button
                onClick={() => setIsAsistenciaModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Marque los trabajadores que asistieron y aprobaron la capacitación
                </p>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {trabajadores.map((trabajador) => {
                  const asistencia = asistencias[trabajador.id] || { asistio: false, aprobo: false, nota: undefined };
                  
                  return (
                    <div
                      key={trabajador.id}
                      className="flex items-center gap-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {getNombreCompleto(trabajador)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          DNI: {trabajador.numero_documento}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={asistencia.asistio}
                            onChange={(e) => {
                              setAsistencias({
                                ...asistencias,
                                [trabajador.id]: {
                                  ...asistencia,
                                  asistio: e.target.checked,
                                },
                              });
                            }}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Asistió</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={asistencia.aprobo}
                            onChange={(e) => {
                              setAsistencias({
                                ...asistencias,
                                [trabajador.id]: {
                                  ...asistencia,
                                  aprobo: e.target.checked,
                                },
                              });
                            }}
                            disabled={!asistencia.asistio}
                            className="w-4 h-4 text-green-600 rounded focus:ring-green-500 disabled:opacity-50"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Aprobó</span>
                        </label>
                        {asistencia.asistio && (
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-700 dark:text-gray-300">Nota:</label>
                            <input
                              type="number"
                              min="0"
                              max="20"
                              step="0.1"
                              value={asistencia.nota || ''}
                              onChange={(e) => {
                                setAsistencias({
                                  ...asistencias,
                                  [trabajador.id]: {
                                    ...asistencia,
                                    nota: e.target.value ? parseFloat(e.target.value) : undefined,
                                  },
                                });
                              }}
                              className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                              placeholder="0-20"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Asistentes</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {Object.values(asistencias).filter(a => a.asistio).length} de {trabajadores.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Aprobados</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {Object.values(asistencias).filter(a => a.aprobo).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Promedio</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {(() => {
                        const notas = Object.values(asistencias)
                          .filter(a => a.asistio && a.nota !== undefined)
                          .map(a => a.nota!);
                        return notas.length > 0 
                          ? (notas.reduce((sum, n) => sum + n, 0) / notas.length).toFixed(1)
                          : '-';
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsAsistenciaModalOpen(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAsistencia}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSaving && <Loader2 className="animate-spin" size={16} />}
                <span>{isSaving ? 'Guardando...' : 'Guardar Asistencia'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalle */}
      {isDetalleModalOpen && editingCapacitacion && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Detalle de Capacitación
              </h2>
              <button
                onClick={() => setIsDetalleModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre del Curso
                </label>
                <p className="text-gray-900 dark:text-white">{editingCapacitacion.nombre_curso}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo
                </label>
                <p className="text-gray-900 dark:text-white">{editingCapacitacion.tipo_capacitacion || '-'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha Programada
                </label>
                <p className="text-gray-900 dark:text-white">{formatDate(editingCapacitacion.fecha_programada)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Estado
                </label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(editingCapacitacion.estado)}`}>
                  {editingCapacitacion.estado}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Asistentes
                </label>
                <p className="text-gray-900 dark:text-white">
                  {editingCapacitacion.asistencias?.filter(a => a.asistio).length || 0} de {editingCapacitacion.asistencias?.length || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

