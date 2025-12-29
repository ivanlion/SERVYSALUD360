/**
 * Servicio de predicción de deterioro de salud
 * 
 * Analiza datos históricos de exámenes médicos para predecir
 * deterioro de salud visual y otros indicadores
 * 
 * @module mcp-server/src/services/health-predictor
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Resultado de predicción de salud visual
 */
export interface VisualHealthPrediction {
  trabajador_id: string;
  dni: string;
  nombre: string;
  empresa: string;
  riesgo: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRÍTICO';
  probabilidad_deterioro: number; // 0-100
  factores_riesgo: string[];
  tendencia: 'MEJORANDO' | 'ESTABLE' | 'EMPEORANDO';
  recomendaciones: string[];
  proximo_control_sugerido: string; // fecha
}

/**
 * Analiza el historial de exámenes de un trabajador para predecir deterioro visual
 * 
 * @param supabase - Cliente de Supabase
 * @param trabajador_id - ID del trabajador
 * @param examenes - Array de exámenes históricos
 * @returns Predicción de salud visual
 */
export async function predictVisualHealthDeterioration(
  _supabase: SupabaseClient,
  trabajador_id: string,
  examenes: any[]
): Promise<VisualHealthPrediction> {
  if (!examenes || examenes.length < 2) {
    throw new Error('Se requieren al menos 2 exámenes para hacer predicción');
  }

  // Ordenar exámenes por fecha (más antiguo primero)
  const examenesOrdenados = examenes
    .filter(e => e.fecha_emo)
    .sort((a, b) => new Date(a.fecha_emo).getTime() - new Date(b.fecha_emo).getTime());

  if (examenesOrdenados.length < 2) {
    throw new Error('Se requieren exámenes con fechas válidas');
  }

  const ultimoExamen = examenesOrdenados[examenesOrdenados.length - 1];
  const penultimoExamen = examenesOrdenados[examenesOrdenados.length - 2];

  // Extraer datos de visión del último examen
  const visionOD = parseFloat(ultimoExamen.vis_lejos_od_cc || ultimoExamen.vis_lejos_od_sc || '0');
  const visionOI = parseFloat(ultimoExamen.vis_lejos_oi_cc || ultimoExamen.vis_lejos_oi_sc || '0');
  const visionAnteriorOD = parseFloat(penultimoExamen.vis_lejos_od_cc || penultimoExamen.vis_lejos_od_sc || '0');
  const visionAnteriorOI = parseFloat(penultimoExamen.vis_lejos_oi_cc || penultimoExamen.vis_lejos_oi_sc || '0');

  // Calcular deterioro
  const deterioroOD = visionAnteriorOD > 0 ? ((visionAnteriorOD - visionOD) / visionAnteriorOD) * 100 : 0;
  const deterioroOI = visionAnteriorOI > 0 ? ((visionAnteriorOI - visionOI) / visionAnteriorOI) * 100 : 0;
  const deterioroPromedio = (deterioroOD + deterioroOI) / 2;

  // Determinar tendencia
  let tendencia: 'MEJORANDO' | 'ESTABLE' | 'EMPEORANDO' = 'ESTABLE';
  if (deterioroPromedio > 5) {
    tendencia = 'EMPEORANDO';
  } else if (deterioroPromedio < -5) {
    tendencia = 'MEJORANDO';
  }

  // Calcular probabilidad de deterioro futuro
  let probabilidad_deterioro = 0;
  let riesgo: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRÍTICO' = 'BAJO';
  const factores_riesgo: string[] = [];

  // Factores de riesgo
  if (visionOD < 0.5 || visionOI < 0.5) {
    factores_riesgo.push('Agudeza visual baja');
    probabilidad_deterioro += 20;
  }

  if (ultimoExamen.restr_lentes === 'SI') {
    factores_riesgo.push('Uso de lentes correctores');
    probabilidad_deterioro += 10;
  }

  if (deterioroPromedio > 10) {
    factores_riesgo.push('Deterioro rápido detectado');
    probabilidad_deterioro += 30;
  } else if (deterioroPromedio > 5) {
    factores_riesgo.push('Deterioro moderado');
    probabilidad_deterioro += 15;
  }

  // Edad como factor
  const edad = parseInt(ultimoExamen.edad || '0');
  if (edad > 50) {
    factores_riesgo.push('Edad avanzada');
    probabilidad_deterioro += 10;
  }

  // Trabajo con pantallas o exposición visual intensa
  const puesto = (ultimoExamen.puesto || '').toUpperCase();
  if (puesto.includes('OPERADOR') || puesto.includes('CONDUCTOR') || puesto.includes('TECNICO')) {
    factores_riesgo.push('Exposición visual intensa en trabajo');
    probabilidad_deterioro += 15;
  }

  // Determinar nivel de riesgo
  if (probabilidad_deterioro >= 60) {
    riesgo = 'CRÍTICO';
  } else if (probabilidad_deterioro >= 40) {
    riesgo = 'ALTO';
  } else if (probabilidad_deterioro >= 20) {
    riesgo = 'MEDIO';
  } else {
    riesgo = 'BAJO';
  }

  // Generar recomendaciones
  const recomendaciones: string[] = [];
  if (riesgo === 'CRÍTICO' || riesgo === 'ALTO') {
    recomendaciones.push('Control oftalmológico inmediato (dentro de 3 meses)');
    recomendaciones.push('Evaluación de condiciones de trabajo');
  } else if (riesgo === 'MEDIO') {
    recomendaciones.push('Control oftalmológico en 6 meses');
  } else {
    recomendaciones.push('Control oftalmológico anual');
  }

  if (factores_riesgo.includes('Deterioro rápido detectado')) {
    recomendaciones.push('Evaluación de causas del deterioro acelerado');
  }

  if (factores_riesgo.includes('Exposición visual intensa en trabajo')) {
    recomendaciones.push('Implementar pausas activas visuales');
    recomendaciones.push('Revisar iluminación del puesto de trabajo');
  }

  // Calcular próximo control sugerido
  const ultimaFecha = new Date(ultimoExamen.fecha_emo);
  const proximoControl = new Date(ultimaFecha);
  
  if (riesgo === 'CRÍTICO') {
    proximoControl.setMonth(proximoControl.getMonth() + 3);
  } else if (riesgo === 'ALTO') {
    proximoControl.setMonth(proximoControl.getMonth() + 6);
  } else {
    proximoControl.setMonth(proximoControl.getMonth() + 12);
  }

  return {
    trabajador_id,
    dni: ultimoExamen.dni || '',
    nombre: ultimoExamen.nombre || '',
    empresa: ultimoExamen.empresa || '',
    riesgo,
    probabilidad_deterioro: Math.min(100, Math.max(0, probabilidad_deterioro)),
    factores_riesgo,
    tendencia,
    recomendaciones,
    proximo_control_sugerido: proximoControl.toISOString().split('T')[0] || new Date().toISOString().split('T')[0] || ''
  };
}

/**
 * Analiza múltiples trabajadores para identificar patrones de riesgo
 */
export async function analyzeWorkersVisualHealth(
  supabase: SupabaseClient,
  trabajadores: any[]
): Promise<VisualHealthPrediction[]> {
  const predictions: VisualHealthPrediction[] = [];

  for (const trabajador of trabajadores) {
    try {
      // Obtener historial de exámenes del trabajador
      const { data: examenes, error } = await supabase
        .from('examenes_medicos')
        .select('*')
        .eq('trabajador_id', trabajador.id)
        .order('fecha_emo', { ascending: true });

      if (error || !examenes || examenes.length < 2) {
        continue; // Saltar si no hay suficientes exámenes
      }

      const prediction = await predictVisualHealthDeterioration(
        supabase,
        trabajador.id,
        examenes
      );

      predictions.push(prediction);
    } catch (error) {
      console.error(`Error analizando trabajador ${trabajador.id}:`, error);
      continue;
    }
  }

  return predictions;
}

