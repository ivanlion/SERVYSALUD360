/**
 * Servicio de análisis de tendencias por empresa
 * 
 * Identifica patrones y tendencias en la salud ocupacional por empresa
 * 
 * @module mcp-server/src/services/trend-analyzer
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Tendencias identificadas por empresa
 */
export interface CompanyTrends {
  empresa: string;
  total_trabajadores: number;
  total_examenes: number;
  periodo_analisis: {
    desde: string;
    hasta: string;
  };
  tendencias: {
    salud_visual: TrendData;
    restricciones: TrendData;
    aptitud: TrendData;
    patologias_comunes: TrendData;
  };
  indicadores: {
    tasa_aptos: number;
    tasa_restricciones: number;
    tasa_no_aptos: number;
    promedio_edad: number;
  };
  alertas: string[];
}

export interface TrendData {
  tendencia: 'MEJORANDO' | 'ESTABLE' | 'EMPEORANDO';
  cambio_porcentual: number;
  valores_historicos: Array<{ periodo: string; valor: number }>;
  descripcion: string;
}

/**
 * Analiza tendencias de salud ocupacional por empresa
 * 
 * @param supabase - Cliente de Supabase
 * @param empresa - Nombre de la empresa
 * @param meses_atras - Número de meses hacia atrás para analizar (default: 12)
 * @returns Tendencias identificadas
 */
export async function analyzeCompanyTrends(
  supabase: SupabaseClient,
  empresa: string,
  meses_atras: number = 12
): Promise<CompanyTrends> {
  const fechaDesde = new Date();
  fechaDesde.setMonth(fechaDesde.getMonth() - meses_atras);

  // Obtener todos los exámenes de la empresa en el período
  const { data: examenes, error } = await supabase
    .from('examenes_medicos')
    .select('*')
    .eq('empresa', empresa)
    .gte('fecha_emo', fechaDesde.toISOString().split('T')[0])
    .order('fecha_emo', { ascending: true });

  if (error || !examenes || examenes.length === 0) {
    throw new Error(`No se encontraron exámenes para la empresa ${empresa} en el período especificado`);
  }

  // Obtener trabajadores únicos
  const trabajadoresUnicos = new Set(examenes.map(e => e.trabajador_id || e.dni));
  const total_trabajadores = trabajadoresUnicos.size;

  // Dividir en períodos (trimestres)
  const periodos: { [key: string]: any[] } = {};
  examenes.forEach(examen => {
    const fecha = new Date(examen.fecha_emo);
    const trimestre = `${fecha.getFullYear()}-Q${Math.floor(fecha.getMonth() / 3) + 1}`;
    if (!periodos[trimestre]) {
      periodos[trimestre] = [];
    }
    periodos[trimestre].push(examen);
  });

  // Analizar tendencia de salud visual
  const saludVisualTrend = analyzeVisualHealthTrend(periodos);

  // Analizar tendencia de restricciones
  const restriccionesTrend = analyzeRestrictionsTrend(periodos);

  // Analizar tendencia de aptitud
  const aptitudTrend = analyzeAptitudeTrend(periodos);

  // Analizar patologías comunes
  const patologiasTrend = analyzeCommonPathologies(periodos);

  // Calcular indicadores actuales
  const ultimoPeriodo = Object.keys(periodos).sort().pop();
  const examenesUltimoPeriodo = ultimoPeriodo ? (periodos[ultimoPeriodo] || []) : [];

  const indicadores = {
    tasa_aptos: calculateRate(examenesUltimoPeriodo, e => e.aptitud_final === 'APTO'),
    tasa_restricciones: calculateRate(examenesUltimoPeriodo, e => 
      e.restr_lentes === 'SI' || e.restr_altura_1_8m === 'SI' || e.restr_elec === 'SI'
    ),
    tasa_no_aptos: calculateRate(examenesUltimoPeriodo, e => e.aptitud_final === 'NO APTO'),
    promedio_edad: calculateAverageAge(examenesUltimoPeriodo)
  };

  // Generar alertas
  const alertas = generateAlerts(saludVisualTrend, restriccionesTrend, aptitudTrend, indicadores);

  return {
    empresa,
    total_trabajadores,
    total_examenes: examenes.length,
    periodo_analisis: {
      desde: fechaDesde.toISOString().split('T')[0] || '',
      hasta: new Date().toISOString().split('T')[0] || ''
    },
    tendencias: {
      salud_visual: saludVisualTrend,
      restricciones: restriccionesTrend,
      aptitud: aptitudTrend,
      patologias_comunes: patologiasTrend
    },
    indicadores,
    alertas
  };
}

function analyzeVisualHealthTrend(periodos: { [key: string]: any[] }): TrendData {
  const valores: Array<{ periodo: string; valor: number }> = [];
  
  Object.keys(periodos).sort().forEach(periodo => {
    const examenes = periodos[periodo];
    if (!examenes || examenes.length === 0) return;
    
    const promedioVision = examenes.reduce((sum, e) => {
      const visionOD = parseFloat(e.vis_lejos_od_cc || e.vis_lejos_od_sc || '0');
      const visionOI = parseFloat(e.vis_lejos_oi_cc || e.vis_lejos_oi_sc || '0');
      return sum + (visionOD + visionOI) / 2;
    }, 0) / examenes.length;
    
    valores.push({ periodo, valor: promedioVision });
  });

  const cambio = calculateChange(valores);
  
  return {
    tendencia: cambio > 5 ? 'EMPEORANDO' : cambio < -5 ? 'MEJORANDO' : 'ESTABLE',
    cambio_porcentual: cambio,
    valores_historicos: valores,
    descripcion: `Salud visual ${cambio > 0 ? 'deteriorándose' : cambio < 0 ? 'mejorando' : 'estable'} (${cambio > 0 ? '+' : ''}${cambio.toFixed(1)}%)`
  };
}

function analyzeRestrictionsTrend(periodos: { [key: string]: any[] }): TrendData {
  const valores: Array<{ periodo: string; valor: number }> = [];
  
  Object.keys(periodos).sort().forEach(periodo => {
    const examenes = periodos[periodo];
    if (!examenes || examenes.length === 0) return;
    
    const tasaRestricciones = calculateRate(examenes, e => 
      e.restr_lentes === 'SI' || e.restr_altura_1_8m === 'SI' || e.restr_elec === 'SI'
    );
    valores.push({ periodo, valor: tasaRestricciones });
  });

  const cambio = calculateChange(valores);
  
  return {
    tendencia: cambio > 10 ? 'EMPEORANDO' : cambio < -10 ? 'MEJORANDO' : 'ESTABLE',
    cambio_porcentual: cambio,
    valores_historicos: valores,
    descripcion: `Restricciones ${cambio > 0 ? 'aumentando' : cambio < 0 ? 'disminuyendo' : 'estables'} (${cambio > 0 ? '+' : ''}${cambio.toFixed(1)}%)`
  };
}

function analyzeAptitudeTrend(periodos: { [key: string]: any[] }): TrendData {
  const valores: Array<{ periodo: string; valor: number }> = [];
  
  Object.keys(periodos).sort().forEach(periodo => {
    const examenes = periodos[periodo];
    if (!examenes || examenes.length === 0) return;
    
    const tasaAptos = calculateRate(examenes, e => e.aptitud_final === 'APTO');
    valores.push({ periodo, valor: tasaAptos });
  });

  const cambio = calculateChange(valores);
  
  return {
    tendencia: cambio < -5 ? 'EMPEORANDO' : cambio > 5 ? 'MEJORANDO' : 'ESTABLE',
    cambio_porcentual: cambio,
    valores_historicos: valores,
    descripcion: `Aptitud ${cambio > 0 ? 'mejorando' : cambio < 0 ? 'deteriorándose' : 'estable'} (${cambio > 0 ? '+' : ''}${cambio.toFixed(1)}%)`
  };
}

function analyzeCommonPathologies(periodos: { [key: string]: any[] }): TrendData {
  const valores: Array<{ periodo: string; valor: number }> = [];
  
  Object.keys(periodos).sort().forEach(periodo => {
    const examenes = periodos[periodo];
    if (!examenes || examenes.length === 0) return;
    
    // Contar patologías mencionadas en antecedentes personales
    const patologiasCount = examenes.filter(e => 
      e.ant_personales && 
      e.ant_personales !== 'Niega' && 
      e.ant_personales.trim() !== ''
    ).length;
    
    const tasa = (patologiasCount / examenes.length) * 100;
    valores.push({ periodo, valor: tasa });
  });

  const cambio = calculateChange(valores);
  
  return {
    tendencia: cambio > 10 ? 'EMPEORANDO' : cambio < -10 ? 'MEJORANDO' : 'ESTABLE',
    cambio_porcentual: cambio,
    valores_historicos: valores,
    descripcion: `Patologías ${cambio > 0 ? 'aumentando' : cambio < 0 ? 'disminuyendo' : 'estables'} (${cambio > 0 ? '+' : ''}${cambio.toFixed(1)}%)`
  };
}

function calculateRate(examenes: any[], condition: (e: any) => boolean): number {
  if (examenes.length === 0) return 0;
  return (examenes.filter(condition).length / examenes.length) * 100;
}

function calculateAverageAge(examenes: any[]): number {
  if (examenes.length === 0) return 0;
  const edades = examenes
    .map(e => parseInt(e.edad || '0'))
    .filter(e => e > 0);
  return edades.length > 0 
    ? edades.reduce((sum, edad) => sum + edad, 0) / edades.length 
    : 0;
}

function calculateChange(valores: Array<{ periodo: string; valor: number }>): number {
  if (valores.length < 2) return 0;
  const primero = valores[0]?.valor;
  const ultimo = valores[valores.length - 1]?.valor;
  if (!primero || primero === 0 || !ultimo) return 0;
  return ((ultimo - primero) / primero) * 100;
}

function generateAlerts(
  saludVisual: TrendData,
  restricciones: TrendData,
  aptitud: TrendData,
  indicadores: any
): string[] {
  const alertas: string[] = [];

  if (saludVisual.tendencia === 'EMPEORANDO' && saludVisual.cambio_porcentual > 10) {
    alertas.push('⚠️ Deterioro significativo de salud visual detectado');
  }

  if (restricciones.tendencia === 'EMPEORANDO' && restricciones.cambio_porcentual > 15) {
    alertas.push('⚠️ Aumento significativo de restricciones médicas');
  }

  if (aptitud.tendencia === 'EMPEORANDO' && aptitud.cambio_porcentual < -10) {
    alertas.push('⚠️ Disminución en tasa de aptitud laboral');
  }

  if (indicadores.tasa_no_aptos > 10) {
    alertas.push('🚨 Alta tasa de trabajadores no aptos (>10%)');
  }

  if (indicadores.tasa_restricciones > 50) {
    alertas.push('⚠️ Más del 50% de trabajadores tienen restricciones');
  }

  if (indicadores.promedio_edad > 50) {
    alertas.push('ℹ️ Población laboral envejecida (promedio >50 años)');
  }

  return alertas;
}

