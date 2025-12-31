/**
 * AusentismoLaboral - Componente para gestionar el ausentismo laboral
 * 
 * Permite registrar, consultar y gestionar el ausentismo de trabajadores
 * con estadísticas, gráficos y filtros avanzados
 * 
 * @component
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { useNotifications } from '../contexts/NotificationContext';
import { AusentismoLaboral, TipoAusentismo, Trabajador, getNombreCompleto } from '../types';
import { z } from 'zod';
import { 
  Plus, 
  Edit2, 
  Eye, 
  FileText, 
  X, 
  Loader2,
  Calendar,
  User,
  TrendingUp,
  AlertCircle,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { logger } from '../utils/logger';

// Schema de validación
const ausentismoSchema = z.object({
  trabajador_id: z.string().min(1, 'Debe seleccionar un trabajador'),
  tipo_ausentismo: z.enum([
    'Descanso médico',
    'Licencia con goce de haber',
    'Licencia sin goce de haber',
    'Permiso',
    'Vacaciones',
    'Accidente de trabajo',
    'Enfermedad ocupacional',
    'Maternidad',
    'Paternidad',
    'Otros'
  ]),
  fecha_inicio: z.string().min(1, 'La fecha de inicio es requerida'),
  fecha_fin: z.string().optional(),
  motivo: z.string().optional(),
});

type AusentismoFormData = z.infer<typeof ausentismoSchema>;

// Tipo extendido con datos del trabajador
interface AusentismoConTrabajador extends AusentismoLaboral {
  trabajador?: Trabajador;
}

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

export default function AusentismoLaboralComponent() {
  const { empresaActiva } = useCompany();
  const { showSuccess, showError } = useNotifications();
  
  // Estados
  const [ausentismos, setAusentismos] = useState<AusentismoConTrabajador[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAusentismo, setEditingAusentismo] = useState<AusentismoConTrabajador | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Filtros
  const [tipoFilter, setTipoFilter] = useState<TipoAusentismo | 'Todos'>('Todos');
  const [estadoFilter, setEstadoFilter] = useState<'Activo' | 'Finalizado' | 'Todos'>('Todos');
  const [fechaInicioFilter, setFechaInicioFilter] = useState('');
  const [fechaFinFilter, setFechaFinFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Autocomplete trabajador
  const [trabajadorSearch, setTrabajadorSearch] = useState('');
  const [showTrabajadorDropdown, setShowTrabajadorDropdown] = useState(false);
  const [selectedTrabajadorId, setSelectedTrabajadorId] = useState('');

  // Formulario
  const [formData, setFormData] = useState<AusentismoFormData>({
    trabajador_id: '',
    tipo_ausentismo: 'Descanso médico',
    fecha_inicio: '',
    fecha_fin: '',
    motivo: '',
  });

  // Cargar trabajadores para autocomplete
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
        logger.error('[AusentismoLaboral] Error al cargar trabajadores', error);
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
      logger.error('[AusentismoLaboral] Error inesperado al cargar trabajadores', error);
    }
  }, [empresaActiva?.id]);

  // Cargar ausentismos
  const loadAusentismos = useCallback(async () => {
    if (!empresaActiva?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      logger.debug('[AusentismoLaboral] Cargando ausentismos...', { empresaId: empresaActiva.id });

      // Construir query base
      let query = supabase
        .from('ausentismo_laboral')
        .select(`
          *,
          trabajadores (
            id,
            numero_documento,
            apellido_paterno,
            apellido_materno,
            nombres
          )
        `)
        .eq('empresa_id', empresaActiva.id);

      // Aplicar filtros
      if (tipoFilter !== 'Todos') {
        query = query.eq('tipo_ausentismo', tipoFilter);
      }

      if (estadoFilter !== 'Todos') {
        query = query.eq('estado', estadoFilter);
      }

      if (fechaInicioFilter) {
        query = query.gte('fecha_inicio', fechaInicioFilter);
      }

      if (fechaFinFilter) {
        query = query.lte('fecha_inicio', fechaFinFilter);
      }

      // Aplicar búsqueda
      if (debouncedSearchTerm.trim()) {
        // La búsqueda se hará en el cliente después de cargar los datos
      }

      query = query.order('fecha_inicio', { ascending: false });

      const { data, error } = await query;

      if (error) {
        logger.error('[AusentismoLaboral] Error al cargar ausentismos', error);
        showError('Error al cargar ausentismos: ' + error.message);
        return;
      }

      // Procesar datos con trabajadores
      const ausentismosWithTrabajadores = (data || []).map((a: any) => {
        const trabajador = a.trabajadores ? {
          ...a.trabajadores,
          fecha_nacimiento: a.trabajadores.fecha_nacimiento ? new Date(a.trabajadores.fecha_nacimiento) : undefined,
          fecha_ingreso: a.trabajadores.fecha_ingreso ? new Date(a.trabajadores.fecha_ingreso) : undefined,
          created_at: new Date(a.trabajadores.created_at),
          updated_at: new Date(a.trabajadores.updated_at),
        } : undefined;

        return {
          ...a,
          fecha_inicio: new Date(a.fecha_inicio),
          fecha_fin: a.fecha_fin ? new Date(a.fecha_fin) : undefined,
          created_at: new Date(a.created_at),
          trabajador,
        };
      });

      setAusentismos(ausentismosWithTrabajadores);
    } catch (error: any) {
      logger.error('[AusentismoLaboral] Error inesperado', error);
      showError('Error inesperado al cargar ausentismos');
    } finally {
      setIsLoading(false);
    }
  }, [empresaActiva?.id, tipoFilter, estadoFilter, fechaInicioFilter, fechaFinFilter, debouncedSearchTerm, showError]);

  useEffect(() => {
    loadTrabajadores();
  }, [loadTrabajadores]);

  useEffect(() => {
    loadAusentismos();
  }, [loadAusentismos]);

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, tipoFilter, estadoFilter, fechaInicioFilter, fechaFinFilter]);

  // Filtrar por búsqueda
  const ausentismosFiltrados = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return ausentismos;
    }

    const term = debouncedSearchTerm.toLowerCase();
    return ausentismos.filter(a => {
      if (!a.trabajador) return false;
      const nombreCompleto = getNombreCompleto(a.trabajador).toLowerCase();
      const dni = a.trabajador.numero_documento.toLowerCase();
      return nombreCompleto.includes(term) || dni.includes(term);
    });
  }, [ausentismos, debouncedSearchTerm]);

  // Paginación
  const totalPages = Math.ceil(ausentismosFiltrados.length / PAGE_SIZE);
  const ausentismosPaginados = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return ausentismosFiltrados.slice(start, end);
  }, [ausentismosFiltrados, currentPage]);

  // Calcular días entre fechas
  const calcularDias = (fechaInicio: string, fechaFin?: string): number => {
    if (!fechaInicio) return 0;
    const inicio = new Date(fechaInicio);
    const fin = fechaFin ? new Date(fechaFin) : new Date();
    const diffTime = Math.abs(fin.getTime() - inicio.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Incluir día de inicio
  };

  // Abrir modal para nuevo ausentismo
  const handleNewAusentismo = () => {
    setEditingAusentismo(null);
    setFormData({
      trabajador_id: '',
      tipo_ausentismo: 'Descanso médico',
      fecha_inicio: '',
      fecha_fin: '',
      motivo: '',
    });
    setTrabajadorSearch('');
    setSelectedTrabajadorId('');
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Abrir modal para editar ausentismo
  const handleEdit = (ausentismo: AusentismoConTrabajador) => {
    setEditingAusentismo(ausentismo);
    setFormData({
      trabajador_id: ausentismo.trabajador_id,
      tipo_ausentismo: ausentismo.tipo_ausentismo,
      fecha_inicio: ausentismo.fecha_inicio.toISOString().split('T')[0],
      fecha_fin: ausentismo.fecha_fin ? ausentismo.fecha_fin.toISOString().split('T')[0] : '',
      motivo: ausentismo.motivo || '',
    });
    
    if (ausentismo.trabajador) {
      setTrabajadorSearch(getNombreCompleto(ausentismo.trabajador));
      setSelectedTrabajadorId(ausentismo.trabajador_id);
    }
    
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Guardar ausentismo
  const handleSave = async () => {
    try {
      // Validar formulario
      const validation = ausentismoSchema.safeParse(formData);
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

      // Calcular días automáticamente
      const diasCalculados = calcularDias(validation.data.fecha_inicio, validation.data.fecha_fin);

      const dataToSave = {
        ...validation.data,
        empresa_id: empresaActiva.id,
        dias_ausencia: diasCalculados,
        estado: 'Activo' as const,
      };

      if (editingAusentismo) {
        // Actualizar
        const { error } = await supabase
          .from('ausentismo_laboral')
          .update(dataToSave)
          .eq('id', editingAusentismo.id);

        if (error) {
          logger.error('[AusentismoLaboral] Error al actualizar ausentismo', error);
          showError('Error al actualizar ausentismo: ' + error.message);
          return;
        }

        showSuccess('Ausentismo actualizado correctamente');
      } else {
        // Crear
        const { error } = await supabase
          .from('ausentismo_laboral')
          .insert(dataToSave);

        if (error) {
          logger.error('[AusentismoLaboral] Error al crear ausentismo', error);
          showError('Error al crear ausentismo: ' + error.message);
          return;
        }

        showSuccess('Ausentismo registrado correctamente');
      }

      setIsModalOpen(false);
      loadAusentismos();
    } catch (error: any) {
      logger.error('[AusentismoLaboral] Error inesperado al guardar', error);
      showError('Error inesperado al guardar ausentismo');
    } finally {
      setIsSaving(false);
    }
  };

  // Finalizar ausentismo
  const handleFinalizar = async (ausentismo: AusentismoConTrabajador) => {
    try {
      const fechaFin = ausentismo.fecha_fin 
        ? ausentismo.fecha_fin.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      const diasCalculados = calcularDias(
        ausentismo.fecha_inicio.toISOString().split('T')[0],
        fechaFin
      );

      const { error } = await supabase
        .from('ausentismo_laboral')
        .update({
          estado: 'Finalizado',
          fecha_fin: fechaFin,
          dias_ausencia: diasCalculados,
        })
        .eq('id', ausentismo.id);

      if (error) {
        logger.error('[AusentismoLaboral] Error al finalizar ausentismo', error);
        showError('Error al finalizar ausentismo: ' + error.message);
        return;
      }

      showSuccess('Ausentismo finalizado correctamente');
      loadAusentismos();
    } catch (error: any) {
      logger.error('[AusentismoLaboral] Error inesperado', error);
      showError('Error inesperado');
    }
  };

  // Calcular estadísticas
  const estadisticas = useMemo(() => {
    const mesActual = new Date().getMonth();
    const anioActual = new Date().getFullYear();

    const ausentismosMes = ausentismos.filter(a => {
      const fecha = a.fecha_inicio;
      return fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual;
    });

    const ausentismosActivos = ausentismos.filter(a => a.estado === 'Activo');
    const diasPerdidos = ausentismos.reduce((sum, a) => sum + (a.dias_ausencia || 0), 0);

    // Tipo más frecuente
    const tiposCount: Record<string, number> = {};
    ausentismos.forEach(a => {
      tiposCount[a.tipo_ausentismo] = (tiposCount[a.tipo_ausentismo] || 0) + 1;
    });
    const tipoMasFrecuente = Object.entries(tiposCount).reduce((a, b) => 
      tiposCount[a[0]] > tiposCount[b[0]] ? a : b, 
      ['', 0]
    )[0] || 'N/A';

    // Agrupar por tipo para gráfico
    const ausentismoPorTipo = Object.entries(tiposCount).map(([tipo, cantidad]) => ({
      tipo,
      cantidad,
    })).sort((a, b) => b.cantidad - a.cantidad);

    // Tendencia mensual (últimos 6 meses)
    const meses = Array.from({ length: 6 }, (_, i) => {
      const fecha = new Date();
      fecha.setMonth(fecha.getMonth() - (5 - i));
      return {
        mes: fecha.getMonth(),
        anio: fecha.getFullYear(),
        nombre: fecha.toLocaleDateString('es-PE', { month: 'short', year: 'numeric' }),
        cantidad: 0,
      };
    });

    ausentismos.forEach(a => {
      const mes = a.fecha_inicio.getMonth();
      const anio = a.fecha_inicio.getFullYear();
      const mesData = meses.find(m => m.mes === mes && m.anio === anio);
      if (mesData) {
        mesData.cantidad++;
      }
    });

    return {
      totalMes: ausentismosMes.length,
      trabajadoresAusentes: ausentismosActivos.length,
      diasPerdidos,
      tipoMasFrecuente,
      ausentismoPorTipo,
      tendenciaMensual: meses,
    };
  }, [ausentismos]);

  // Filtrar trabajadores para autocomplete
  const trabajadoresFiltrados = useMemo(() => {
    if (!trabajadorSearch.trim()) {
      return trabajadores.slice(0, 10);
    }
    const term = trabajadorSearch.toLowerCase();
    return trabajadores
      .filter(t => {
        const nombre = getNombreCompleto(t).toLowerCase();
        const dni = t.numero_documento.toLowerCase();
        return nombre.includes(term) || dni.includes(term);
      })
      .slice(0, 10);
  }, [trabajadores, trabajadorSearch]);

  // Seleccionar trabajador del autocomplete
  const handleSelectTrabajador = (trabajador: Trabajador) => {
    setSelectedTrabajadorId(trabajador.id);
    setFormData({ ...formData, trabajador_id: trabajador.id });
    setTrabajadorSearch(getNombreCompleto(trabajador));
    setShowTrabajadorDropdown(false);
  };

  // Formatear fecha
  const formatDate = (date?: Date) => {
    if (!date) return '-';
    return date.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  if (!empresaActiva) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Por favor, seleccione una empresa para gestionar el ausentismo.</p>
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
            Ausentismo Laboral
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Gestión y seguimiento del ausentismo de trabajadores
          </p>
        </div>
        <button
          onClick={handleNewAusentismo}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          <span>Registrar Ausentismo</span>
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="text-blue-600 dark:text-blue-400" size={20} />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Ausencias del Mes</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{estadisticas.totalMes}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="text-orange-600 dark:text-orange-400" size={20} />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Trabajadores Ausentes</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{estadisticas.trabajadoresAusentes}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-red-600 dark:text-red-400" size={20} />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Días Perdidos</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{estadisticas.diasPerdidos}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="text-purple-600 dark:text-purple-400" size={20} />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Tipo Más Frecuente</span>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white truncate">{estadisticas.tipoMasFrecuente}</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico por tipo */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Ausentismo por Tipo
          </h3>
          <div className="space-y-3">
            {estadisticas.ausentismoPorTipo.map((item) => {
              const maxCantidad = Math.max(...estadisticas.ausentismoPorTipo.map(i => i.cantidad), 1);
              const porcentaje = (item.cantidad / maxCantidad) * 100;
              
              return (
                <div key={item.tipo} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{item.tipo}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{item.cantidad}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                    <div
                      className="bg-blue-600 h-4 rounded-full transition-all"
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {estadisticas.ausentismoPorTipo.length === 0 && (
              <p className="text-center text-gray-500 py-4">No hay datos para mostrar</p>
            )}
          </div>
        </div>

        {/* Tendencia mensual */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Tendencia Mensual (Últimos 6 meses)
          </h3>
          <div className="space-y-3">
            {estadisticas.tendenciaMensual.map((mes) => {
              const maxCantidad = Math.max(...estadisticas.tendenciaMensual.map(m => m.cantidad), 1);
              const porcentaje = maxCantidad > 0 ? (mes.cantidad / maxCantidad) * 100 : 0;
              
              return (
                <div key={`${mes.anio}-${mes.mes}`} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{mes.nombre}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{mes.cantidad}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                    <div
                      className="bg-green-600 h-4 rounded-full transition-all"
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Búsqueda */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por trabajador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filtro tipo */}
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value as TipoAusentismo | 'Todos')}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="Todos">Todos los tipos</option>
              <option value="Descanso médico">Descanso médico</option>
              <option value="Licencia con goce de haber">Licencia con goce de haber</option>
              <option value="Licencia sin goce de haber">Licencia sin goce de haber</option>
              <option value="Permiso">Permiso</option>
              <option value="Vacaciones">Vacaciones</option>
              <option value="Accidente de trabajo">Accidente de trabajo</option>
              <option value="Enfermedad ocupacional">Enfermedad ocupacional</option>
              <option value="Maternidad">Maternidad</option>
              <option value="Paternidad">Paternidad</option>
              <option value="Otros">Otros</option>
            </select>
          </div>

          {/* Filtro estado */}
          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value as 'Activo' | 'Finalizado' | 'Todos')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
          >
            <option value="Todos">Todos los estados</option>
            <option value="Activo">Activo</option>
            <option value="Finalizado">Finalizado</option>
          </select>

          {/* Filtro fecha inicio */}
          <input
            type="date"
            value={fechaInicioFilter}
            onChange={(e) => setFechaInicioFilter(e.target.value)}
            placeholder="Desde"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
          />
        </div>

        {/* Filtro fecha fin */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Hasta:</span>
          <input
            type="date"
            value={fechaFinFilter}
            onChange={(e) => setFechaFinFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
          />
          {(fechaInicioFilter || fechaFinFilter) && (
            <button
              onClick={() => {
                setFechaInicioFilter('');
                setFechaFinFilter('');
              }}
              className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Limpiar fechas
            </button>
          )}
        </div>
      </div>

      {/* Tabla de ausentismo */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : ausentismosPaginados.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 dark:text-gray-400">
              No se encontraron registros de ausentismo
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Trabajador
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Fecha Inicio
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Fecha Fin
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Días
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
                  {ausentismosPaginados.map((ausentismo) => (
                    <tr key={ausentismo.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {ausentismo.trabajador 
                          ? getNombreCompleto(ausentismo.trabajador)
                          : 'Trabajador no encontrado'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {ausentismo.tipo_ausentismo}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(ausentismo.fecha_inicio)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(ausentismo.fecha_fin)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {ausentismo.dias_ausencia || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          ausentismo.estado === 'Activo'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {ausentismo.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(ausentismo)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Ver detalle"
                          >
                            <Eye size={18} />
                          </button>
                          {ausentismo.estado === 'Activo' && (
                            <button
                              onClick={() => handleFinalizar(ausentismo)}
                              className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                              title="Finalizar ausentismo"
                            >
                              <CheckCircle2 size={18} />
                            </button>
                          )}
                          <button
                            className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                            title="Ver certificado médico"
                          >
                            <FileText size={18} />
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
                  Mostrando {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, ausentismosFiltrados.length)} de {ausentismosFiltrados.length}
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
                {editingAusentismo ? 'Editar Ausentismo' : 'Registrar Ausentismo'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Seleccionar trabajador (autocomplete) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Trabajador *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={trabajadorSearch}
                    onChange={(e) => {
                      setTrabajadorSearch(e.target.value);
                      setShowTrabajadorDropdown(true);
                    }}
                    onFocus={() => setShowTrabajadorDropdown(true)}
                    placeholder="Buscar trabajador por nombre o DNI..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  {showTrabajadorDropdown && trabajadoresFiltrados.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {trabajadoresFiltrados.map((trabajador) => (
                        <button
                          key={trabajador.id}
                          onClick={() => handleSelectTrabajador(trabajador)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="font-medium text-gray-900 dark:text-white">
                            {getNombreCompleto(trabajador)}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            DNI: {trabajador.numero_documento}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {formErrors.trabajador_id && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.trabajador_id}</p>
                )}
              </div>

              {/* Tipo de ausentismo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo de Ausentismo *
                </label>
                <select
                  value={formData.tipo_ausentismo}
                  onChange={(e) => setFormData({ ...formData, tipo_ausentismo: e.target.value as TipoAusentismo })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="Descanso médico">Descanso médico</option>
                  <option value="Licencia con goce de haber">Licencia con goce de haber</option>
                  <option value="Licencia sin goce de haber">Licencia sin goce de haber</option>
                  <option value="Permiso">Permiso</option>
                  <option value="Vacaciones">Vacaciones</option>
                  <option value="Accidente de trabajo">Accidente de trabajo</option>
                  <option value="Enfermedad ocupacional">Enfermedad ocupacional</option>
                  <option value="Maternidad">Maternidad</option>
                  <option value="Paternidad">Paternidad</option>
                  <option value="Otros">Otros</option>
                </select>
                {formErrors.tipo_ausentismo && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.tipo_ausentismo}</p>
                )}
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fecha Inicio *
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_inicio}
                    onChange={(e) => {
                      setFormData({ ...formData, fecha_inicio: e.target.value });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  {formErrors.fecha_inicio && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.fecha_inicio}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_fin}
                    onChange={(e) => {
                      setFormData({ ...formData, fecha_fin: e.target.value });
                    }}
                    min={formData.fecha_inicio}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  {formData.fecha_inicio && formData.fecha_fin && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {calcularDias(formData.fecha_inicio, formData.fecha_fin)} días
                    </p>
                  )}
                </div>
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Motivo
                </label>
                <textarea
                  value={formData.motivo}
                  onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Describa el motivo del ausentismo..."
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

