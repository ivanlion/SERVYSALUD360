/**
 * IndicadoresSST - Dashboard de métricas e indicadores de SST
 * 
 * Muestra indicadores principales, gráficos y tablas de resumen
 * con cálculos automáticos según normativa peruana
 * 
 * @component
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { IndicadorSST } from '../types';
import { utils, writeFile } from 'xlsx';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Download, 
  FileText, 
  TrendingUp, 
  AlertTriangle,
  AlertCircle,
  Calendar,
  Users,
  Activity,
  Loader2,
  RefreshCw,
  BarChart3,
  CheckCircle2
} from 'lucide-react';
import { logger } from '../utils/logger';

// Colores para gráficos
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

interface IndicadoresData {
  indiceFrecuencia: number;
  indiceGravedad: number;
  indiceAccidentabilidad: number;
  tasaAusentismo: number;
  coberturaCapacitacion: number;
  horasHombreTrabajadas: number;
  accidentesIncapacitantes: number;
  diasPerdidos: number;
  totalAusencias: number;
  trabajadoresActivos: number;
  capacitacionesEjecutadas: number;
  capacitacionesProgramadas: number;
  trabajadoresCapacitados: number;
  tasaEnfermedadesOcupacionales?: number;
  indiceCumplimiento?: number;
}

interface TopArea {
  area: string;
  accidentes: number;
}

interface TopPuesto {
  puesto: string;
  ausentismo: number;
}

interface TrabajadorRestriccion {
  trabajador: string;
  dni: string;
  restriccion: string;
  dias: number;
}

export default function IndicadoresSSTComponent() {
  const { empresaActiva } = useCompany();
  const { showSuccess, showError } = useNotifications();
  const queryClient = useQueryClient();
  
  // Estados
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth() + 1);
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);
  const [indicadoresCalculados, setIndicadoresCalculados] = useState<IndicadoresData | null>(null);
  const [indicadoresAnterior, setIndicadoresAnterior] = useState<IndicadoresData | null>(null);
  
  // Datos para gráficos
  const [evolucionAccidentabilidad, setEvolucionAccidentabilidad] = useState<any[]>([]);
  const [accidentesPorTipo, setAccidentesPorTipo] = useState<any[]>([]);
  const [distribucionAusentismo, setDistribucionAusentismo] = useState<any[]>([]);
  const [capacitacionesComparacion, setCapacitacionesComparacion] = useState<any[]>([]);
  
  // Tablas de resumen
  const [topAreas, setTopAreas] = useState<TopArea[]>([]);
  const [topPuestos, setTopPuestos] = useState<TopPuesto[]>([]);
  const [trabajadoresRestricciones, setTrabajadoresRestricciones] = useState<TrabajadorRestriccion[]>([]);

  // Cargar datos del período seleccionado
  const periodo = `${anioSeleccionado}-${String(mesSeleccionado).padStart(2, '0')}`;

  const { data: indicadorExistente, isLoading: isLoadingIndicador } = useQuery({
    queryKey: ['indicadores-sst', empresaActiva?.id, periodo],
    queryFn: async () => {
      if (!empresaActiva?.id) return null;
      
      const { data, error } = await supabase
        .from('indicadores_sst')
        .select('*')
        .eq('empresa_id', empresaActiva.id)
        .eq('periodo', periodo)
        .maybeSingle();

      if (error) {
        logger.error('[IndicadoresSST] Error al cargar indicador', error);
        return null;
      }

      return data;
    },
    enabled: !!empresaActiva?.id,
  });

  // Calcular indicadores
  const calcularIndicadores = useCallback(async () => {
    if (!empresaActiva?.id) return;

    try {
      setIsGenerating(true);
      logger.debug('[IndicadoresSST] Calculando indicadores...', { periodo, empresaId: empresaActiva.id });

      // 1. Obtener trabajadores activos
      const { data: trabajadoresData } = await supabase
        .from('trabajadores')
        .select('id, area_trabajo, puesto_trabajo')
        .eq('empresa_id', empresaActiva.id)
        .eq('estado_laboral', 'Activo');

      const trabajadoresActivos = trabajadoresData?.length || 0;
      
      // Calcular horas hombre trabajadas (asumiendo 8 horas/día, 22 días hábiles/mes)
      const horasHombreTrabajadas = trabajadoresActivos * 8 * 22;

      // 2. Obtener accidentes del período
      const fechaInicio = new Date(anioSeleccionado, mesSeleccionado - 1, 1);
      const fechaFin = new Date(anioSeleccionado, mesSeleccionado, 0);

      const { data: accidentesData } = await supabase
        .from('accidentes_incidentes')
        .select('*')
        .eq('empresa_id', empresaActiva.id)
        .gte('fecha_ocurrencia', fechaInicio.toISOString().split('T')[0])
        .lte('fecha_ocurrencia', fechaFin.toISOString().split('T')[0]);

      const accidentesIncapacitantes = (accidentesData || []).filter(a => 
        a.tipo_evento === 'Accidente incapacitante' || a.es_incapacitante
      ).length;

      const diasPerdidos = (accidentesData || []).reduce((sum, a) => 
        sum + (a.dias_perdidos || 0), 0
      );

      // 3. Obtener ausentismo del período
      const { data: ausentismoData } = await supabase
        .from('ausentismo_laboral')
        .select('*, trabajadores(puesto_trabajo, area_trabajo)')
        .eq('empresa_id', empresaActiva.id)
        .gte('fecha_inicio', fechaInicio.toISOString().split('T')[0])
        .lte('fecha_inicio', fechaFin.toISOString().split('T')[0]);

      const totalAusencias = (ausentismoData || []).length;
      const diasAusentismo = (ausentismoData || []).reduce((sum, a) => 
        sum + (a.dias_ausencia || 0), 0
      );

      // 4. Obtener capacitaciones del período
      const { data: capacitacionesData } = await supabase
        .from('capacitaciones_sst')
        .select('*, asistencia_capacitaciones(trabajador_id)')
        .eq('empresa_id', empresaActiva.id)
        .gte('fecha_programada', fechaInicio.toISOString().split('T')[0])
        .lte('fecha_programada', fechaFin.toISOString().split('T')[0]);

      const capacitacionesProgramadas = (capacitacionesData || []).length;
      const capacitacionesEjecutadas = (capacitacionesData || []).filter(c => 
        c.estado === 'Ejecutada'
      ).length;

      const trabajadoresCapacitados = new Set(
        (capacitacionesData || [])
          .flatMap(c => c.asistencia_capacitaciones || [])
          .map(a => a.trabajador_id)
      ).size;

      // 5. Calcular indicadores
      const indiceFrecuencia = horasHombreTrabajadas > 0
        ? (accidentesIncapacitantes * 1000000) / horasHombreTrabajadas
        : 0;

      const indiceGravedad = horasHombreTrabajadas > 0
        ? (diasPerdidos * 1000000) / horasHombreTrabajadas
        : 0;

      const indiceAccidentabilidad = (indiceFrecuencia * indiceGravedad) / 1000;

      const tasaAusentismo = trabajadoresActivos > 0
        ? (diasAusentismo / (trabajadoresActivos * 22)) * 100
        : 0;

      const coberturaCapacitacion = trabajadoresActivos > 0
        ? (trabajadoresCapacitados / trabajadoresActivos) * 100
        : 0;

      // Calcular tasa de enfermedades ocupacionales
      const enfermedadesOcupacionales = (ausentismoData || []).filter(a => 
        a.tipo_ausentismo === 'Enfermedad ocupacional'
      ).length;
      const tasaEnfermedadesOcupacionales = trabajadoresActivos > 0
        ? (enfermedadesOcupacionales / trabajadoresActivos) * 1000
        : 0;

      // Calcular índice de cumplimiento (capacitaciones ejecutadas vs programadas)
      const indiceCumplimiento = capacitacionesProgramadas > 0
        ? (capacitacionesEjecutadas / capacitacionesProgramadas) * 100
        : 0;

      const indicadores: IndicadoresData = {
        indiceFrecuencia: Number(indiceFrecuencia.toFixed(2)),
        indiceGravedad: Number(indiceGravedad.toFixed(2)),
        indiceAccidentabilidad: Number(indiceAccidentabilidad.toFixed(2)),
        tasaAusentismo: Number(tasaAusentismo.toFixed(2)),
        coberturaCapacitacion: Number(coberturaCapacitacion.toFixed(2)),
        horasHombreTrabajadas,
        accidentesIncapacitantes,
        diasPerdidos,
        totalAusencias,
        trabajadoresActivos,
        capacitacionesEjecutadas,
        capacitacionesProgramadas,
        trabajadoresCapacitados,
        tasaEnfermedadesOcupacionales: Number(tasaEnfermedadesOcupacionales.toFixed(2)),
        indiceCumplimiento: Number(indiceCumplimiento.toFixed(2)),
      };

      setIndicadoresCalculados(indicadores);

      // Guardar en base de datos
      const { error: saveError } = await supabase
        .from('indicadores_sst')
        .upsert({
          empresa_id: empresaActiva.id,
          periodo,
          anio: anioSeleccionado,
          mes: mesSeleccionado,
          total_trabajadores: trabajadoresActivos,
          horas_hombre_trabajadas: horasHombreTrabajadas,
          numero_accidentes_trabajo: (accidentesData || []).length,
          numero_accidentes_incapacitantes: accidentesIncapacitantes,
          dias_perdidos_total: diasPerdidos,
          indice_frecuencia: indicadores.indiceFrecuencia,
          indice_gravedad: indicadores.indiceGravedad,
          indice_accidentabilidad: indicadores.indiceAccidentabilidad,
          tasa_ausentismo: indicadores.tasaAusentismo,
          cobertura_examenes: 0, // Se puede calcular después
          tasa_enfermedades_ocupacionales: indicadores.tasaEnfermedadesOcupacionales,
          indice_cumplimiento: indicadores.indiceCumplimiento,
        }, {
          onConflict: 'empresa_id,periodo'
        });

      if (saveError) {
        logger.error('[IndicadoresSST] Error al guardar indicadores', saveError);
        showError('Error al guardar indicadores');
      } else {
        showSuccess('Indicadores calculados y guardados correctamente');
        queryClient.invalidateQueries({ queryKey: ['indicadores-sst'] });
      }

      // Cargar datos para gráficos y tablas
      await cargarDatosGraficos();
      await cargarTablasResumen();

    } catch (error: any) {
      logger.error('[IndicadoresSST] Error inesperado', error);
      showError('Error al calcular indicadores');
    } finally {
      setIsGenerating(false);
    }
  }, [empresaActiva?.id, periodo, anioSeleccionado, mesSeleccionado, showSuccess, showError, queryClient]);

  // Cargar datos para gráficos
  const cargarDatosGraficos = useCallback(async () => {
    if (!empresaActiva?.id) return;

    try {
      // Evolución de accidentabilidad (últimos 12 meses)
      const mesesEvolucion = [];
      for (let i = 11; i >= 0; i--) {
        const fecha = new Date();
        fecha.setMonth(fecha.getMonth() - i);
        const anio = fecha.getFullYear();
        const mes = fecha.getMonth() + 1;
        const periodoEvol = `${anio}-${String(mes).padStart(2, '0')}`;

        const { data: indicadorEvol } = await supabase
          .from('indicadores_sst')
          .select('indice_accidentabilidad')
          .eq('empresa_id', empresaActiva.id)
          .eq('periodo', periodoEvol)
          .maybeSingle();

        mesesEvolucion.push({
          mes: fecha.toLocaleDateString('es-PE', { month: 'short', year: 'numeric' }),
          accidentabilidad: indicadorEvol?.indice_accidentabilidad || 0,
        });
      }
      setEvolucionAccidentabilidad(mesesEvolucion);

      // Accidentes por tipo (mes actual)
      const fechaInicio = new Date(anioSeleccionado, mesSeleccionado - 1, 1);
      const fechaFin = new Date(anioSeleccionado, mesSeleccionado, 0);

      const { data: accidentesTipo } = await supabase
        .from('accidentes_incidentes')
        .select('tipo_evento')
        .eq('empresa_id', empresaActiva.id)
        .gte('fecha_ocurrencia', fechaInicio.toISOString().split('T')[0])
        .lte('fecha_ocurrencia', fechaFin.toISOString().split('T')[0]);

      const tipoCount: Record<string, number> = {};
      (accidentesTipo || []).forEach(a => {
        tipoCount[a.tipo_evento] = (tipoCount[a.tipo_evento] || 0) + 1;
      });

      setAccidentesPorTipo(
        Object.entries(tipoCount).map(([tipo, cantidad]) => ({ tipo, cantidad }))
      );

      // Distribución de ausentismo
      const { data: ausentismoDist } = await supabase
        .from('ausentismo_laboral')
        .select('tipo_ausentismo')
        .eq('empresa_id', empresaActiva.id)
        .gte('fecha_inicio', fechaInicio.toISOString().split('T')[0])
        .lte('fecha_inicio', fechaFin.toISOString().split('T')[0]);

      const ausentismoCount: Record<string, number> = {};
      (ausentismoDist || []).forEach(a => {
        ausentismoCount[a.tipo_ausentismo] = (ausentismoCount[a.tipo_ausentismo] || 0) + 1;
      });

      setDistribucionAusentismo(
        Object.entries(ausentismoCount).map(([tipo, cantidad]) => ({ name: tipo, value: cantidad }))
      );

      // Capacitaciones ejecutadas vs programadas (últimos 6 meses)
      const mesesCapacitacion = [];
      for (let i = 5; i >= 0; i--) {
        const fecha = new Date();
        fecha.setMonth(fecha.getMonth() - i);
        const anio = fecha.getFullYear();
        const mes = fecha.getMonth() + 1;
        const fechaInicioCap = new Date(anio, mes - 1, 1);
        const fechaFinCap = new Date(anio, mes, 0);

        const { data: capData } = await supabase
          .from('capacitaciones_sst')
          .select('estado')
          .eq('empresa_id', empresaActiva.id)
          .gte('fecha_programada', fechaInicioCap.toISOString().split('T')[0])
          .lte('fecha_programada', fechaFinCap.toISOString().split('T')[0]);

        const programadas = (capData || []).length;
        const ejecutadas = (capData || []).filter(c => c.estado === 'Ejecutada').length;

        mesesCapacitacion.push({
          mes: fecha.toLocaleDateString('es-PE', { month: 'short' }),
          programadas,
          ejecutadas,
        });
      }
      setCapacitacionesComparacion(mesesCapacitacion);

    } catch (error: any) {
      logger.error('[IndicadoresSST] Error al cargar gráficos', error);
    }
  }, [empresaActiva?.id, anioSeleccionado, mesSeleccionado]);

  // Cargar tablas de resumen
  const cargarTablasResumen = useCallback(async () => {
    if (!empresaActiva?.id) return;

    try {
      const fechaInicio = new Date(anioSeleccionado, mesSeleccionado - 1, 1);
      const fechaFin = new Date(anioSeleccionado, mesSeleccionado, 0);

      // Top 5 áreas con más accidentes
      const { data: accidentesArea } = await supabase
        .from('accidentes_incidentes')
        .select('area_ocurrencia')
        .eq('empresa_id', empresaActiva.id)
        .gte('fecha_ocurrencia', fechaInicio.toISOString().split('T')[0])
        .lte('fecha_ocurrencia', fechaFin.toISOString().split('T')[0]);

      const areaCount: Record<string, number> = {};
      (accidentesArea || []).forEach(a => {
        const area = a.area_ocurrencia || 'Sin área';
        areaCount[area] = (areaCount[area] || 0) + 1;
      });

      setTopAreas(
        Object.entries(areaCount)
          .map(([area, accidentes]) => ({ area, accidentes }))
          .sort((a, b) => b.accidentes - a.accidentes)
          .slice(0, 5)
      );

      // Top 5 puestos con más ausentismo
      const { data: ausentismoPuesto } = await supabase
        .from('ausentismo_laboral')
        .select('trabajadores(puesto_trabajo)')
        .eq('empresa_id', empresaActiva.id)
        .gte('fecha_inicio', fechaInicio.toISOString().split('T')[0])
        .lte('fecha_inicio', fechaFin.toISOString().split('T')[0]);

      const puestoCount: Record<string, number> = {};
      (ausentismoPuesto || []).forEach(a => {
        const trabajador = Array.isArray(a.trabajadores) ? a.trabajadores[0] : a.trabajadores;
        const puesto = trabajador?.puesto_trabajo || 'Sin puesto';
        puestoCount[puesto] = (puestoCount[puesto] || 0) + 1;
      });

      setTopPuestos(
        Object.entries(puestoCount)
          .map(([puesto, ausentismo]) => ({ puesto, ausentismo }))
          .sort((a, b) => b.ausentismo - a.ausentismo)
          .slice(0, 5)
      );

      // Trabajadores con restricciones activas
      const { data: casosActivos } = await supabase
        .from('casos_trabajo_modificado')
        .select(`
          *,
          registros_trabajadores(dni_ce_pas, apellidos_nombre, puesto_trabajo)
        `)
        .eq('empresa_id', empresaActiva.id)
        .eq('estado', 'ACTIVO');

      const restricciones = (casosActivos || []).map(c => ({
        trabajador: c.registros_trabajadores?.apellidos_nombre || 'N/A',
        dni: c.registros_trabajadores?.dni_ce_pas || 'N/A',
        restriccion: c.assessment?.restricciones || 'Sin restricción',
        dias: parseInt(c.assessment?.indicacionDuracion?.replace(/\D/g, '') || '0'),
      }));

      setTrabajadoresRestricciones(restricciones.slice(0, 10));

    } catch (error: any) {
      logger.error('[IndicadoresSST] Error al cargar tablas', error);
    }
  }, [empresaActiva?.id, anioSeleccionado, mesSeleccionado]);

  // Cargar datos al cambiar período o al montar
  useEffect(() => {
    if (indicadorExistente) {
      setIndicadoresCalculados({
        indiceFrecuencia: indicadorExistente.indice_frecuencia || 0,
        indiceGravedad: indicadorExistente.indice_gravedad || 0,
        indiceAccidentabilidad: indicadorExistente.indice_accidentabilidad || 0,
        tasaAusentismo: indicadorExistente.tasa_ausentismo || 0,
        coberturaCapacitacion: indicadorExistente.cobertura_examenes || 0,
        horasHombreTrabajadas: indicadorExistente.horas_hombre_trabajadas || 0,
        accidentesIncapacitantes: indicadorExistente.numero_accidentes_incapacitantes || 0,
        diasPerdidos: indicadorExistente.dias_perdidos_total || 0,
        totalAusencias: 0,
        trabajadoresActivos: indicadorExistente.total_trabajadores || 0,
        capacitacionesEjecutadas: 0,
        capacitacionesProgramadas: 0,
        trabajadoresCapacitados: 0,
      });
      cargarDatosGraficos();
      cargarTablasResumen();
    }
  }, [indicadorExistente, cargarDatosGraficos, cargarTablasResumen]);

  // Exportar a Excel
  const handleExportExcel = useCallback(() => {
    if (!indicadoresCalculados) {
      showError('No hay indicadores para exportar');
      return;
    }

    try {
      const data = [
        ['INDICADORES SST', periodo],
        [''],
        ['Indicador', 'Valor'],
        ['Índice de Frecuencia (IF)', indicadoresCalculados.indiceFrecuencia],
        ['Índice de Gravedad (IG)', indicadoresCalculados.indiceGravedad],
        ['Índice de Accidentabilidad (IA)', indicadoresCalculados.indiceAccidentabilidad],
        ['Tasa de Ausentismo (%)', indicadoresCalculados.tasaAusentismo],
        ['Cobertura de Capacitación (%)', indicadoresCalculados.coberturaCapacitacion],
        ['Tasa Enfermedades Ocupacionales', indicadoresCalculados.tasaEnfermedadesOcupacionales || 0],
        ['Índice de Cumplimiento (%)', indicadoresCalculados.indiceCumplimiento || 0],
        [''],
        ['Top 5 Áreas con Más Accidentes'],
        ['Área', 'Accidentes'],
        ...topAreas.map(a => [a.area, a.accidentes]),
        [''],
        ['Top 5 Puestos con Más Ausentismo'],
        ['Puesto', 'Ausentismo'],
        ...topPuestos.map(p => [p.puesto, p.ausentismo]),
      ];

      const ws = utils.aoa_to_sheet(data);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Indicadores SST');
      writeFile(wb, `Indicadores_SST_${periodo}.xlsx`);
      showSuccess('Reporte exportado a Excel');
    } catch (error: any) {
      logger.error('[IndicadoresSST] Error al exportar Excel', error);
      showError('Error al exportar a Excel');
    }
  }, [indicadoresCalculados, periodo, topAreas, topPuestos, showSuccess, showError]);

  // Exportar a PDF (placeholder - requiere implementación completa)
  const handleExportPDF = useCallback(() => {
    showError('Exportación a PDF próximamente disponible');
  }, [showError]);

  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  if (!empresaActiva) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Por favor, seleccione una empresa para ver indicadores.</p>
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
            Indicadores SST
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Dashboard de métricas e indicadores de Seguridad y Salud en el Trabajo
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            disabled={!indicadoresCalculados}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            <span>Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            disabled={!indicadoresCalculados}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText size={18} />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Selector de Período */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="text-gray-400" size={20} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Período:</span>
          </div>
          <select
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            {meses.map((mes, index) => (
              <option key={index + 1} value={index + 1}>{mes}</option>
            ))}
          </select>
          <input
            type="number"
            value={anioSeleccionado}
            onChange={(e) => setAnioSeleccionado(parseInt(e.target.value))}
            min="2020"
            max="2100"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white w-24"
          />
          <button
            onClick={calcularIndicadores}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Calculando...</span>
              </>
            ) : (
              <>
                <RefreshCw size={18} />
                <span>Generar Indicadores</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Indicadores Principales */}
      {indicadoresCalculados && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={24} />
              <span className="text-sm font-medium opacity-90">Índice de Frecuencia</span>
            </div>
            <p className="text-3xl font-bold">{indicadoresCalculados.indiceFrecuencia}</p>
            <p className="text-xs opacity-75 mt-1">IF = (Acc. Incap. × 1M) / Horas</p>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={24} />
              <span className="text-sm font-medium opacity-90">Índice de Gravedad</span>
            </div>
            <p className="text-3xl font-bold">{indicadoresCalculados.indiceGravedad}</p>
            <p className="text-xs opacity-75 mt-1">IG = (Días perdidos × 1M) / Horas</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={24} />
              <span className="text-sm font-medium opacity-90">Índice Accidentabilidad</span>
            </div>
            <p className="text-3xl font-bold">{indicadoresCalculados.indiceAccidentabilidad}</p>
            <p className="text-xs opacity-75 mt-1">IA = (IF × IG) / 1000</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Users size={24} />
              <span className="text-sm font-medium opacity-90">Tasa Ausentismo</span>
            </div>
            <p className="text-3xl font-bold">{indicadoresCalculados.tasaAusentismo}%</p>
            <p className="text-xs opacity-75 mt-1">Días ausencia / Días laborables</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={24} />
              <span className="text-sm font-medium opacity-90">Cobertura Capacitación</span>
            </div>
            <p className="text-3xl font-bold">{indicadoresCalculados.coberturaCapacitacion}%</p>
            <p className="text-xs opacity-75 mt-1">Trabajadores capacitados</p>
          </div>

          {indicadoresCalculados.tasaEnfermedadesOcupacionales !== undefined && (
            <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg p-6 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={24} />
                <span className="text-sm font-medium opacity-90">Tasa Enfermedades Ocup.</span>
              </div>
              <p className="text-3xl font-bold">{indicadoresCalculados.tasaEnfermedadesOcupacionales}</p>
              <p className="text-xs opacity-75 mt-1">Por cada 1000 trabajadores</p>
            </div>
          )}

          {indicadoresCalculados.indiceCumplimiento !== undefined && (
            <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg p-6 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={24} />
                <span className="text-sm font-medium opacity-90">Índice Cumplimiento</span>
              </div>
              <p className="text-3xl font-bold">{indicadoresCalculados.indiceCumplimiento}%</p>
              <p className="text-xs opacity-75 mt-1">Capacitaciones ejecutadas</p>
            </div>
          )}
        </div>
      )}

      {/* Comparativa con Período Anterior */}
      {indicadoresCalculados && indicadoresAnterior && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Comparativa con Período Anterior
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'IF', actual: indicadoresCalculados.indiceFrecuencia, anterior: indicadoresAnterior.indiceFrecuencia },
              { label: 'IG', actual: indicadoresCalculados.indiceGravedad, anterior: indicadoresAnterior.indiceGravedad },
              { label: 'IA', actual: indicadoresCalculados.indiceAccidentabilidad, anterior: indicadoresAnterior.indiceAccidentabilidad },
              { label: 'Ausentismo', actual: indicadoresCalculados.tasaAusentismo, anterior: indicadoresAnterior.tasaAusentismo },
              { label: 'Capacitación', actual: indicadoresCalculados.coberturaCapacitacion, anterior: indicadoresAnterior.coberturaCapacitacion },
            ].map((item) => {
              const variacion = item.anterior > 0 
                ? ((item.actual - item.anterior) / item.anterior) * 100 
                : 0;
              const esMejora = variacion < 0;
              
              return (
                <div key={item.label} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    {item.label}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {item.actual.toFixed(2)}
                    </span>
                    <span className={`text-sm font-semibold ${
                      esMejora ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {variacion > 0 ? '+' : ''}{variacion.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Anterior: {item.anterior.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gráficos */}
      {indicadoresCalculados && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Evolución de Accidentabilidad */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Evolución de Accidentabilidad (12 meses)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={evolucionAccidentabilidad}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="accidentabilidad" stroke="#8B5CF6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Accidentes por Tipo */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Accidentes por Tipo (Mes Actual)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={accidentesPorTipo}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tipo" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Distribución de Ausentismo */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Distribución de Ausentismo
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distribucionAusentismo}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {distribucionAusentismo.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Capacitaciones Ejecutadas vs Programadas */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Capacitaciones (6 meses)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={capacitacionesComparacion}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="programadas" fill="#3B82F6" name="Programadas" />
                <Bar dataKey="ejecutadas" fill="#10B981" name="Ejecutadas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tablas de Resumen */}
      {indicadoresCalculados && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top 5 Áreas con Más Accidentes */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Top 5 Áreas con Más Accidentes
            </h3>
            {topAreas.length > 0 ? (
              <div className="space-y-2">
                {topAreas.map((area, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{index + 1}</span>
                      <span className="text-sm text-gray-900 dark:text-white">{area.area}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{area.accidentes}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No hay datos</p>
            )}
          </div>

          {/* Top 5 Puestos con Más Ausentismo */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Top 5 Puestos con Más Ausentismo
            </h3>
            {topPuestos.length > 0 ? (
              <div className="space-y-2">
                {topPuestos.map((puesto, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{index + 1}</span>
                      <span className="text-sm text-gray-900 dark:text-white">{puesto.puesto}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{puesto.ausentismo}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No hay datos</p>
            )}
          </div>

          {/* Trabajadores con Restricciones Activas */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Trabajadores con Restricciones Activas
            </h3>
            {trabajadoresRestricciones.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {trabajadoresRestricciones.map((trabajador, index) => (
                  <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{trabajador.trabajador}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">DNI: {trabajador.dni}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{trabajador.restriccion}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{trabajador.dias} días</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No hay restricciones activas</p>
            )}
          </div>
        </div>
      )}

      {!indicadoresCalculados && !isLoadingIndicador && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <BarChart3 className="mx-auto text-gray-400 mb-4" size={64} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No hay indicadores para el período seleccionado
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Seleccione un período y haga clic en "Generar Indicadores"
          </p>
        </div>
      )}
    </div>
  );
}

