/**
 * Servicio de alertas de riesgos emergentes
 * 
 * Identifica y alerta sobre riesgos emergentes en salud ocupacional
 * 
 * @module mcp-server/src/services/risk-alerts
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Alerta de riesgo emergente
 */
export interface RiskAlert {
  id: string;
  tipo: 'CRÍTICO' | 'ALTO' | 'MEDIO' | 'BAJO';
  categoria: 'VISUAL' | 'AUDITIVO' | 'MUSCULOESQUELÉTICO' | 'CARDIOVASCULAR' | 'GENERAL';
  titulo: string;
  descripcion: string;
  trabajadores_afectados: number;
  trabajadores: Array<{ dni: string; nombre: string; empresa: string }>;
  tendencia: 'EMERGENTE' | 'CRECIENTE' | 'ESTABLE' | 'DECRECIENTE';
  recomendaciones: string[];
  fecha_deteccion: string;
}

/**
 * Detecta riesgos emergentes en los datos de exámenes médicos
 * 
 * @param supabase - Cliente de Supabase
 * @param meses_atras - Período de análisis (default: 6)
 * @returns Array de alertas de riesgo
 */
export async function detectEmergingRisks(
  supabase: SupabaseClient,
  meses_atras: number = 6
): Promise<RiskAlert[]> {
  const fechaDesde = new Date();
  fechaDesde.setMonth(fechaDesde.getMonth() - meses_atras);

  // Obtener todos los exámenes del período
  const { data: examenes, error } = await supabase
    .from('examenes_medicos')
    .select('*')
    .gte('fecha_emo', fechaDesde.toISOString().split('T')[0])
    .order('fecha_emo', { ascending: false });

  if (error || !examenes || examenes.length === 0) {
    return [];
  }

  const alertas: RiskAlert[] = [];

  // 1. Detectar deterioro visual acelerado
  const alertaVisual = await detectVisualDeterioration(supabase, examenes);
  if (alertaVisual) alertas.push(alertaVisual);

  // 2. Detectar problemas auditivos emergentes
  const alertaAuditiva = await detectAuditoryIssues(supabase, examenes);
  if (alertaAuditiva) alertas.push(alertaAuditiva);

  // 3. Detectar problemas musculoesqueléticos
  const alertaMusculo = await detectMusculoskeletalIssues(supabase, examenes);
  if (alertaMusculo) alertas.push(alertaMusculo);

  // 4. Detectar problemas cardiovasculares
  const alertaCardio = await detectCardiovascularIssues(supabase, examenes);
  if (alertaCardio) alertas.push(alertaCardio);

  // 5. Detectar patrones por empresa
  const alertasEmpresa = await detectCompanyPatterns(supabase, examenes);
  alertas.push(...alertasEmpresa);

  return alertas.sort((a, b) => {
    const priority: { [key: string]: number } = { 'CRÍTICO': 4, 'ALTO': 3, 'MEDIO': 2, 'BAJO': 1 };
    const priorityA = priority[a?.tipo || 'BAJO'] || 1;
    const priorityB = priority[b?.tipo || 'BAJO'] || 1;
    return priorityB - priorityA;
  });
}

async function detectVisualDeterioration(
  _supabase: SupabaseClient,
  examenes: any[]
): Promise<RiskAlert | null> {
  // Agrupar por trabajador
  const porTrabajador: { [key: string]: any[] } = {};
  examenes.forEach(e => {
    const key = e.trabajador_id || e.dni;
    if (!porTrabajador[key]) porTrabajador[key] = [];
    porTrabajador[key].push(e);
  });

  const trabajadoresAfectados: Array<{ dni: string; nombre: string; empresa: string }> = [];

  Object.keys(porTrabajador).forEach(key => {
    const examenesTrabajador = porTrabajador[key];
    if (!examenesTrabajador) return;
    
    const examenesOrdenados = examenesTrabajador.sort((a, b) => 
      new Date(a?.fecha_emo || 0).getTime() - new Date(b?.fecha_emo || 0).getTime()
    );

    if (examenesOrdenados.length < 2) return;

    const ultimo = examenesOrdenados[examenesOrdenados.length - 1];
    const anterior = examenesOrdenados[examenesOrdenados.length - 2];
    if (!ultimo || !anterior) return;

    const visionODUltimo = parseFloat(ultimo?.vis_lejos_od_cc || ultimo?.vis_lejos_od_sc || '0');
    const visionOIUltimo = parseFloat(ultimo?.vis_lejos_oi_cc || ultimo?.vis_lejos_oi_sc || '0');
    const visionODAnterior = parseFloat(anterior?.vis_lejos_od_cc || anterior?.vis_lejos_od_sc || '0');
    const visionOIAnterior = parseFloat(anterior?.vis_lejos_oi_cc || anterior?.vis_lejos_oi_sc || '0');

    const deterioroOD = visionODAnterior > 0 ? ((visionODAnterior - visionODUltimo) / visionODAnterior) * 100 : 0;
    const deterioroOI = visionOIAnterior > 0 ? ((visionOIAnterior - visionOIUltimo) / visionOIAnterior) * 100 : 0;

    // Deterioro > 15% es significativo
    if (deterioroOD > 15 || deterioroOI > 15) {
      trabajadoresAfectados.push({
        dni: ultimo?.dni || key,
        nombre: ultimo?.nombre || '',
        empresa: ultimo?.empresa || ''
      });
    }
  });

  if (trabajadoresAfectados.length === 0) return null;

  const tipo = trabajadoresAfectados.length > 10 ? 'CRÍTICO' : 
               trabajadoresAfectados.length > 5 ? 'ALTO' : 'MEDIO';

  return {
    id: `visual-${Date.now()}`,
    tipo,
    categoria: 'VISUAL',
    titulo: 'Deterioro acelerado de salud visual detectado',
    descripcion: `${trabajadoresAfectados.length} trabajador(es) muestran deterioro visual acelerado (>15%) en los últimos exámenes`,
    trabajadores_afectados: trabajadoresAfectados.length,
    trabajadores: trabajadoresAfectados.slice(0, 10), // Limitar a 10 para no sobrecargar
    tendencia: trabajadoresAfectados.length > 5 ? 'CRECIENTE' : 'EMERGENTE',
    recomendaciones: [
      'Revisar condiciones de iluminación en puestos de trabajo',
      'Implementar pausas activas visuales',
      'Evaluar necesidad de controles oftalmológicos más frecuentes',
      'Revisar uso de equipos de protección visual'
    ],
    fecha_deteccion: new Date().toISOString().split('T')[0] || new Date().toISOString()
  };
}

async function detectAuditoryIssues(
  _supabase: SupabaseClient,
  examenes: any[]
): Promise<RiskAlert | null> {
  const problemasAuditivos = examenes.filter(e => {
    const dxAudio = (e.dx_audio || '').toUpperCase();
    return dxAudio.includes('HIPOACUSIA') || 
           dxAudio.includes('TRAUMA') || 
           dxAudio.includes('PÉRDIDA') ||
           dxAudio.includes('PERDIDA');
  });

  if (problemasAuditivos.length === 0) return null;

  const porEmpresa: { [key: string]: number } = {};
  problemasAuditivos.forEach(e => {
    const empresa = e.empresa || 'Desconocida';
    porEmpresa[empresa] = (porEmpresa[empresa] || 0) + 1;
  });

  const empresaMasAfectada = Object.keys(porEmpresa).reduce((a, b) => {
    const countA = porEmpresa[a] || 0;
    const countB = porEmpresa[b] || 0;
    return countA > countB ? a : b;
  });

  const trabajadoresAfectados = problemasAuditivos
    .filter(e => e.empresa === empresaMasAfectada)
    .slice(0, 10)
    .map(e => ({
      dni: e.dni || '',
      nombre: e.nombre || '',
      empresa: e.empresa || ''
    }));

  const tipo = problemasAuditivos.length > 10 ? 'ALTO' : 'MEDIO';

  return {
    id: `auditory-${Date.now()}`,
    tipo,
    categoria: 'AUDITIVO',
    titulo: 'Problemas auditivos detectados',
    descripcion: `${problemasAuditivos.length} trabajador(es) con problemas auditivos. Empresa más afectada: ${empresaMasAfectada}`,
    trabajadores_afectados: problemasAuditivos.length,
    trabajadores: trabajadoresAfectados,
    tendencia: 'EMERGENTE',
    recomendaciones: [
      'Revisar niveles de ruido en puestos de trabajo',
      'Verificar uso correcto de protección auditiva',
      'Implementar programa de conservación auditiva',
      'Evaluar necesidad de controles audiométricos más frecuentes'
    ],
    fecha_deteccion: new Date().toISOString().split('T')[0] || new Date().toISOString()
  };
}

async function detectMusculoskeletalIssues(
  _supabase: SupabaseClient,
  examenes: any[]
): Promise<RiskAlert | null> {
  const problemasMusculo = examenes.filter(e => {
    const hallazgos = (e.hallazgos_musculo || '').toUpperCase();
    const aptitudEspalda = (e.aptitud_espalda_score || '').toUpperCase();
    return hallazgos.includes('DOLOR') || 
           hallazgos.includes('LUMBALGIA') ||
           aptitudEspalda.includes('LIMITADO') ||
           aptitudEspalda.includes('RESTRINGIDO');
  });

  if (problemasMusculo.length < 5) return null;

  const trabajadoresAfectados = problemasMusculo.slice(0, 10).map(e => ({
    dni: e.dni || '',
    nombre: e.nombre || '',
    empresa: e.empresa || ''
  }));

  return {
    id: `musculo-${Date.now()}`,
    tipo: problemasMusculo.length > 15 ? 'ALTO' : 'MEDIO',
    categoria: 'MUSCULOESQUELÉTICO',
    titulo: 'Problemas musculoesqueléticos detectados',
    descripcion: `${problemasMusculo.length} trabajador(es) con problemas musculoesqueléticos reportados`,
    trabajadores_afectados: problemasMusculo.length,
    trabajadores: trabajadoresAfectados,
    tendencia: 'CRECIENTE',
    recomendaciones: [
      'Revisar ergonomía de puestos de trabajo',
      'Implementar programa de ejercicios preventivos',
      'Evaluar cargas físicas de trabajo',
      'Capacitar en técnicas de levantamiento seguro'
    ],
    fecha_deteccion: new Date().toISOString().split('T')[0] || new Date().toISOString()
  };
}

async function detectCardiovascularIssues(
  _supabase: SupabaseClient,
  examenes: any[]
): Promise<RiskAlert | null> {
  const problemasCardio = examenes.filter(e => {
    const paSistolica = parseFloat(e.pa_sistolica || '0');
    const paDiastolica = parseFloat(e.pa_diastolica || '0');
    const fc = parseFloat(e.fc || '0');
    
    return paSistolica > 140 || 
           paDiastolica > 90 ||
           (fc > 100 && fc < 60); // Taquicardia o bradicardia
  });

  if (problemasCardio.length < 5) return null;

  const trabajadoresAfectados = problemasCardio.slice(0, 10).map(e => ({
    dni: e.dni || '',
    nombre: e.nombre || '',
    empresa: e.empresa || ''
  }));

  return {
    id: `cardio-${Date.now()}`,
    tipo: problemasCardio.length > 20 ? 'ALTO' : 'MEDIO',
    categoria: 'CARDIOVASCULAR',
    titulo: 'Indicadores cardiovasculares anormales',
    descripcion: `${problemasCardio.length} trabajador(es) con presión arterial o frecuencia cardíaca fuera de rangos normales`,
    trabajadores_afectados: problemasCardio.length,
    trabajadores: trabajadoresAfectados,
    tendencia: 'EMERGENTE',
    recomendaciones: [
      'Promover estilos de vida saludables',
      'Implementar programa de actividad física',
      'Evaluar factores de estrés laboral',
      'Recomendar controles médicos regulares'
    ],
    fecha_deteccion: new Date().toISOString().split('T')[0] || new Date().toISOString()
  };
}

async function detectCompanyPatterns(
  _supabase: SupabaseClient,
  examenes: any[]
): Promise<RiskAlert[]> {
  const alertas: RiskAlert[] = [];
  const porEmpresa: { [key: string]: any[] } = {};

  examenes.forEach(e => {
    const empresa = e.empresa || 'Desconocida';
    if (!porEmpresa[empresa]) porEmpresa[empresa] = [];
    porEmpresa[empresa].push(e);
  });

  Object.keys(porEmpresa).forEach(empresa => {
    const examenesEmpresa = porEmpresa[empresa];
    if (!examenesEmpresa || examenesEmpresa.length === 0) return;
    
    const tasaNoAptos = (examenesEmpresa.filter(e => e.aptitud_final === 'NO APTO').length / examenesEmpresa.length) * 100;

    if (tasaNoAptos > 15) {
      const trabajadoresNoAptos = examenesEmpresa
        .filter(e => e.aptitud_final === 'NO APTO')
        .slice(0, 10)
        .map(e => ({
          dni: e.dni || '',
          nombre: e.nombre || '',
          empresa: e.empresa || empresa
        }));

      alertas.push({
        id: `empresa-${empresa}-${Date.now()}`,
        tipo: tasaNoAptos > 25 ? 'CRÍTICO' : 'ALTO',
        categoria: 'GENERAL',
        titulo: `Alta tasa de no aptitud en ${empresa}`,
        descripcion: `${tasaNoAptos.toFixed(1)}% de trabajadores no aptos en ${empresa}`,
        trabajadores_afectados: trabajadoresNoAptos.length,
        trabajadores: trabajadoresNoAptos,
        tendencia: 'CRECIENTE',
        recomendaciones: [
          'Revisar condiciones de trabajo generales',
          'Evaluar factores de riesgo específicos de la empresa',
          'Implementar programa de prevención integral',
          'Considerar evaluación ergonómica de puestos'
        ],
        fecha_deteccion: new Date().toISOString().split('T')[0] || new Date().toISOString()
      });
    }
  });

  return alertas;
}

