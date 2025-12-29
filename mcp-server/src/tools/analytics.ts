/**
 * Herramientas MCP para análisis predictivo y de tendencias
 * 
 * @module mcp-server/src/tools/analytics
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { predictVisualHealthDeterioration, analyzeWorkersVisualHealth } from '../services/health-predictor';
import { analyzeCompanyTrends } from '../services/trend-analyzer';
import { detectEmergingRisks } from '../services/risk-alerts';
import { generateCompanyRecommendations, generateWorkerRecommendations } from '../services/preventive-recommendations';

/**
 * Define las herramientas de análisis
 */
export const analyticsTools: Tool[] = [
  {
    name: 'analytics_predecir_salud_visual',
    description: 'Predice deterioro de salud visual para un trabajador basado en su historial de exámenes',
    inputSchema: {
      type: 'object',
      properties: {
        trabajador_id: {
          type: 'string',
          description: 'ID del trabajador',
        },
        dni: {
          type: 'string',
          description: 'DNI del trabajador (alternativa a trabajador_id)',
        },
      },
    },
  },
  {
    name: 'analytics_tendencias_empresa',
    description: 'Analiza tendencias de salud ocupacional por empresa',
    inputSchema: {
      type: 'object',
      properties: {
        empresa: {
          type: 'string',
          description: 'Nombre de la empresa',
        },
        meses_atras: {
          type: 'number',
          description: 'Número de meses hacia atrás para analizar (default: 12)',
        },
      },
      required: ['empresa'],
    },
  },
  {
    name: 'analytics_riesgos_emergentes',
    description: 'Detecta y alerta sobre riesgos emergentes en salud ocupacional',
    inputSchema: {
      type: 'object',
      properties: {
        meses_atras: {
          type: 'number',
          description: 'Período de análisis en meses (default: 6)',
        },
      },
    },
  },
  {
    name: 'analytics_recomendaciones_empresa',
    description: 'Genera recomendaciones preventivas para una empresa basadas en análisis de datos',
    inputSchema: {
      type: 'object',
      properties: {
        empresa: {
          type: 'string',
          description: 'Nombre de la empresa',
        },
        meses_atras: {
          type: 'number',
          description: 'Período de análisis en meses (default: 12)',
        },
      },
      required: ['empresa'],
    },
  },
  {
    name: 'analytics_recomendaciones_trabajador',
    description: 'Genera recomendaciones preventivas personalizadas para un trabajador',
    inputSchema: {
      type: 'object',
      properties: {
        trabajador_id: {
          type: 'string',
          description: 'ID del trabajador',
        },
        dni: {
          type: 'string',
          description: 'DNI del trabajador (alternativa a trabajador_id)',
        },
      },
    },
  },
];

/**
 * Maneja la ejecución de herramientas de análisis
 */
export async function handleAnalyticsTool(
  toolName: string,
  args: Record<string, any>,
  supabase: SupabaseClient
): Promise<any> {
  switch (toolName) {
    case 'analytics_predecir_salud_visual': {
      const { trabajador_id, dni } = args;

      if (!trabajador_id && !dni) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Se requiere trabajador_id o dni',
              }, null, 2),
            },
          ],
          isError: true,
        };
      }

      try {
        // Obtener trabajador
        let trabajador;
        if (trabajador_id) {
          const { data, error } = await supabase
            .from('trabajadores')
            .select('*')
            .eq('id', trabajador_id)
            .single();
          
          if (error || !data) {
            throw new Error('Trabajador no encontrado');
          }
          trabajador = data;
        } else {
          const { data, error } = await supabase
            .from('trabajadores')
            .select('*')
            .eq('dni', dni)
            .single();
          
          if (error || !data) {
            throw new Error('Trabajador no encontrado');
          }
          trabajador = data;
        }

        // Obtener historial de exámenes
        const { data: examenes, error: examenesError } = await supabase
          .from('examenes_medicos')
          .select('*')
          .eq('trabajador_id', trabajador.id)
          .order('fecha_emo', { ascending: true });

        if (examenesError || !examenes || examenes.length < 2) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'Se requieren al menos 2 exámenes para hacer predicción',
                  trabajador: {
                    id: trabajador.id,
                    nombre: trabajador.nombre,
                    dni: trabajador.dni
                  }
                }, null, 2),
              },
            ],
            isError: true,
          };
        }

        const prediccion = await predictVisualHealthDeterioration(
          supabase,
          trabajador.id,
          examenes
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(prediccion, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Error al predecir salud visual',
                message: error?.message || String(error),
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    }

    case 'analytics_tendencias_empresa': {
      const { empresa, meses_atras = 12 } = args;

      if (!empresa) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Se requiere el nombre de la empresa',
              }, null, 2),
            },
          ],
          isError: true,
        };
      }

      try {
        const tendencias = await analyzeCompanyTrends(supabase, empresa, meses_atras);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(tendencias, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Error al analizar tendencias',
                message: error?.message || String(error),
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    }

    case 'analytics_riesgos_emergentes': {
      const { meses_atras = 6 } = args;

      try {
        const alertas = await detectEmergingRisks(supabase, meses_atras);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                total_alertas: alertas.length,
                alertas_criticas: alertas.filter(a => a.tipo === 'CRÍTICO').length,
                alertas_altas: alertas.filter(a => a.tipo === 'ALTO').length,
                alertas
              }, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Error al detectar riesgos emergentes',
                message: error?.message || String(error),
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    }

    case 'analytics_recomendaciones_empresa': {
      const { empresa, meses_atras = 12 } = args;

      if (!empresa) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Se requiere el nombre de la empresa',
              }, null, 2),
            },
          ],
          isError: true,
        };
      }

      try {
        // Obtener tendencias y alertas
        const tendencias = await analyzeCompanyTrends(supabase, empresa, meses_atras);
        const alertas = await detectEmergingRisks(supabase, meses_atras);
        const alertasEmpresa = alertas.filter(a => 
          a.trabajadores.some(t => t.empresa === empresa)
        );

        // Generar recomendaciones
        const recomendaciones = await generateCompanyRecommendations(
          tendencias.tendencias,
          alertasEmpresa,
          tendencias.indicadores
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                empresa,
                periodo_analisis: tendencias.periodo_analisis,
                total_recomendaciones: recomendaciones.length,
                recomendaciones_altas: recomendaciones.filter(r => r.prioridad === 'ALTA').length,
                recomendaciones
              }, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Error al generar recomendaciones',
                message: error?.message || String(error),
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    }

    case 'analytics_recomendaciones_trabajador': {
      const { trabajador_id, dni } = args;

      if (!trabajador_id && !dni) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Se requiere trabajador_id o dni',
              }, null, 2),
            },
          ],
          isError: true,
        };
      }

      try {
        // Obtener trabajador y su historial
        let trabajador;
        if (trabajador_id) {
          const { data, error } = await supabase
            .from('trabajadores')
            .select('*')
            .eq('id', trabajador_id)
            .single();
          
          if (error || !data) {
            throw new Error('Trabajador no encontrado');
          }
          trabajador = data;
        } else {
          const { data, error } = await supabase
            .from('trabajadores')
            .select('*')
            .eq('dni', dni)
            .single();
          
          if (error || !data) {
            throw new Error('Trabajador no encontrado');
          }
          trabajador = data;
        }

        // Obtener historial
        const { data: examenes } = await supabase
          .from('examenes_medicos')
          .select('*')
          .eq('trabajador_id', trabajador.id)
          .order('fecha_emo', { ascending: false });

        // Obtener predicción
        let prediccion = null;
        if (examenes && examenes.length >= 2) {
          try {
            prediccion = await predictVisualHealthDeterioration(
              supabase,
              trabajador.id,
              examenes
            );
          } catch (e) {
            // Continuar sin predicción si falla
          }
        }

        // Generar recomendaciones
        const recomendaciones = await generateWorkerRecommendations(
          trabajador,
          examenes || [],
          prediccion
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                trabajador: {
                  id: trabajador.id,
                  nombre: trabajador.nombre,
                  dni: trabajador.dni,
                  empresa: trabajador.empresa
                },
                prediccion,
                total_recomendaciones: recomendaciones.length,
                recomendaciones
              }, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Error al generar recomendaciones',
                message: error?.message || String(error),
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    }

    default:
      return {
        content: [
          {
            type: 'text',
            text: `Herramienta de análisis desconocida: ${toolName}`,
          },
        ],
        isError: true,
      };
  }
}

