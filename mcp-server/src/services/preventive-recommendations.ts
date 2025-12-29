/**
 * Servicio de generación de recomendaciones preventivas
 * 
 * Usa Gemini AI para generar recomendaciones preventivas personalizadas
 * basadas en análisis de datos
 * 
 * @module mcp-server/src/services/preventive-recommendations
 */

import { analyzeDocument } from './gemini';

/**
 * Recomendación preventiva generada
 */
export interface PreventiveRecommendation {
  categoria: string;
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
  titulo: string;
  descripcion: string;
  acciones: string[];
  trabajadores_afectados?: number;
  impacto_esperado: string;
  plazo_implementacion: string;
  recursos_necesarios?: string[];
}

/**
 * Genera recomendaciones preventivas basadas en análisis de datos
 * 
 * @param contexto - Contexto del análisis (tendencias, alertas, etc.)
 * @param tipo - Tipo de recomendación: 'EMPRESA' | 'TRABAJADOR' | 'GENERAL'
 * @returns Array de recomendaciones preventivas
 */
export async function generatePreventiveRecommendations(
  contexto: any,
  _tipo: 'EMPRESA' | 'TRABAJADOR' | 'GENERAL' = 'GENERAL'
): Promise<PreventiveRecommendation[]> {
  const prompt = `Eres un experto en Salud Ocupacional y Prevención de Riesgos Laborales.

Analiza el siguiente contexto de salud ocupacional y genera recomendaciones preventivas específicas, accionables y priorizadas.

CONTEXTO:
${JSON.stringify(contexto, null, 2)}

INSTRUCCIONES:
1. Genera recomendaciones específicas y accionables (no genéricas)
2. Prioriza según impacto y urgencia
3. Incluye acciones concretas a implementar
4. Estima impacto esperado
5. Sugiere plazos de implementación realistas
6. Identifica recursos necesarios cuando sea relevante

FORMATO DE RESPUESTA (JSON estricto):
{
  "recomendaciones": [
    {
      "categoria": "Salud Visual | Ergonomía | Protección Auditiva | etc.",
      "prioridad": "ALTA | MEDIA | BAJA",
      "titulo": "Título descriptivo de la recomendación",
      "descripcion": "Descripción detallada del problema y por qué es importante",
      "acciones": [
        "Acción 1 específica y medible",
        "Acción 2 específica y medible",
        "Acción 3 específica y medible"
      ],
      "impacto_esperado": "Descripción del impacto esperado en salud y productividad",
      "plazo_implementacion": "Corto plazo (1-3 meses) | Mediano plazo (3-6 meses) | Largo plazo (6-12 meses)",
      "recursos_necesarios": ["Recurso 1", "Recurso 2"] // Opcional
    }
  ]
}

IMPORTANTE:
- Responde SOLO con el JSON válido, sin texto adicional
- Máximo 10 recomendaciones
- Enfócate en acciones preventivas, no solo correctivas
- Considera viabilidad y costo-beneficio`;

  try {
    const response = await analyzeDocument(prompt, undefined, false, 2);
    
    // Parsear respuesta JSON
    let parsedResponse;
    try {
      // Limpiar respuesta si tiene markdown
      const cleanedResponse = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      parsedResponse = JSON.parse(cleanedResponse);
    } catch (parseError) {
      // Si falla el parseo, intentar extraer JSON del texto
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No se pudo parsear la respuesta de Gemini');
      }
    }

    return parsedResponse.recomendaciones || [];

  } catch (error: any) {
    console.error('[PreventiveRecommendations] Error generando recomendaciones:', error);
    
    // Retornar recomendaciones genéricas como fallback
    return generateFallbackRecommendations(contexto);
  }
}

function generateFallbackRecommendations(contexto: any): PreventiveRecommendation[] {
  const recomendaciones: PreventiveRecommendation[] = [];

  // Recomendaciones basadas en alertas detectadas
  if (contexto.alertas && contexto.alertas.length > 0) {
    recomendaciones.push({
      categoria: 'General',
      prioridad: 'ALTA',
      titulo: 'Revisar y abordar alertas detectadas',
      descripcion: 'Se han detectado alertas que requieren atención inmediata',
      acciones: [
        'Revisar cada alerta identificada',
        'Priorizar acciones según severidad',
        'Establecer plan de acción con responsables',
        'Implementar seguimiento mensual'
      ],
      impacto_esperado: 'Reducción de riesgos y mejora en indicadores de salud',
      plazo_implementacion: 'Corto plazo (1-3 meses)'
    });
  }

  // Recomendaciones basadas en tendencias
  if (contexto.tendencias) {
    if (contexto.tendencias.salud_visual?.tendencia === 'EMPEORANDO') {
      recomendaciones.push({
        categoria: 'Salud Visual',
        prioridad: 'ALTA',
        titulo: 'Programa de prevención de deterioro visual',
        descripcion: 'Se detectó tendencia de deterioro en salud visual',
        acciones: [
          'Implementar pausas activas visuales cada 2 horas',
          'Revisar iluminación en puestos de trabajo',
          'Capacitar en higiene visual',
          'Establecer controles oftalmológicos más frecuentes'
        ],
        impacto_esperado: 'Estabilización y mejora de indicadores visuales',
        plazo_implementacion: 'Corto plazo (1-3 meses)'
      });
    }
  }

  return recomendaciones;
}

/**
 * Genera recomendaciones específicas para una empresa
 */
export async function generateCompanyRecommendations(
  tendencias: any,
  alertas: any[],
  indicadores: any
): Promise<PreventiveRecommendation[]> {
  const contexto = {
    tipo: 'EMPRESA',
    tendencias,
    alertas,
    indicadores,
    fecha_analisis: new Date().toISOString()
  };

  return await generatePreventiveRecommendations(contexto, 'EMPRESA');
}

/**
 * Genera recomendaciones específicas para un trabajador
 */
export async function generateWorkerRecommendations(
  trabajador: any,
  historial: any[],
  prediccion: any
): Promise<PreventiveRecommendation[]> {
  const contexto = {
    tipo: 'TRABAJADOR',
    trabajador: {
      nombre: trabajador.nombre,
      dni: trabajador.dni,
      empresa: trabajador.empresa,
      puesto: trabajador.puesto
    },
    historial: historial.slice(-5), // Últimos 5 exámenes
    prediccion,
    fecha_analisis: new Date().toISOString()
  };

  return await generatePreventiveRecommendations(contexto, 'TRABAJADOR');
}

