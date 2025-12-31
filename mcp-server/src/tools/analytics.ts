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
import { 
  analyticsPredecirSaludVisualSchema, 
  analyticsTendenciasEmpresaSchema, 
  analyticsRiesgosEmergentesSchema,
  analyticsRecomendacionesEmpresaSchema,
  analyticsRecomendacionesTrabajadorSchema 
} from './schemas/analytics';
import { createMCPError, createValidationError, createSupabaseError } from '../utils/errors';
import { mcpLogger } from '../utils/logger';

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
      // ✅ MEJORA: Validación con Zod
      let validatedArgs;
      try {
        validatedArgs = analyticsPredecirSaludVisualSchema.parse(args);
      } catch (validationError: any) {
        mcpLogger.warn('Error de validación en analytics_predecir_salud_visual', { args, error: validationError });
        return createValidationError(validationError.errors || [validationError]);
      }

      const { trabajador_id, dni } = validatedArgs;
      
      // Nota: No usamos caché para análisis porque los resultados pueden cambiar

      mcpLogger.debug('Ejecutando analytics_predecir_salud_visual', { trabajador_id, dni });

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
          mcpLogger.warn('No hay suficientes exámenes para predicción', { 
            trabajador_id: trabajador.id, 
            examenesCount: examenes?.length || 0 
          });
          return createMCPError(
            'Se requieren al menos 2 exámenes para hacer predicción',
            'INSUFFICIENT_DATA',
            {
              trabajador: {
                id: trabajador.id,
                nombre: trabajador.nombre,
                dni: trabajador.dni
              },
              examenes_count: examenes?.length || 0
            }
          );
        }

        const prediccion = await predictVisualHealthDeterioration(
          supabase,
          trabajador.id,
          examenes
        );

        mcpLogger.debug('Predicción de salud visual completada', { trabajador_id: trabajador.id });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(prediccion, null, 2),
            },
          ],
        };
      } catch (error: any) {
        mcpLogger.error(error instanceof Error ? error : new Error('Error al predecir salud visual'), { 
          trabajador_id, 
          dni 
        });
        
        // Si el error ya es un MCPError, retornarlo directamente
        if (error.isError) {
          return error;
        }
        
        return createMCPError(
          `Error al predecir salud visual: ${error?.message || String(error)}`,
          'PREDICTION_ERROR',
          { error: error?.message || String(error) }
        );
      }
    }

    case 'analytics_tendencias_empresa': {
      // ✅ MEJORA: Validación con Zod
      let validatedArgs;
      try {
        validatedArgs = analyticsTendenciasEmpresaSchema.parse(args);
      } catch (validationError: any) {
        mcpLogger.warn('Error de validación en analytics_tendencias_empresa', { args, error: validationError });
        return createValidationError(validationError.errors || [validationError]);
      }

      const { empresa, meses_atras = 12 } = validatedArgs;
      
      mcpLogger.debug('Ejecutando analytics_tendencias_empresa', { empresa, meses_atras });

      try {
        const tendencias = await analyzeCompanyTrends(supabase, empresa, meses_atras);
        
        mcpLogger.debug('Análisis de tendencias completado', { empresa, meses_atras });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(tendencias, null, 2),
            },
          ],
        };
      } catch (error: any) {
        mcpLogger.error(error instanceof Error ? error : new Error('Error al analizar tendencias'), { empresa, meses_atras });
        return createMCPError(
          `Error al analizar tendencias: ${error?.message || String(error)}`,
          'TRENDS_ANALYSIS_ERROR',
          { error: error?.message || String(error) }
        );
      }
    }

    case 'analytics_riesgos_emergentes': {
      // ✅ MEJORA: Validación con Zod
      let validatedArgs;
      try {
        validatedArgs = analyticsRiesgosEmergentesSchema.parse(args);
      } catch (validationError: any) {
        mcpLogger.warn('Error de validación en analytics_riesgos_emergentes', { args, error: validationError });
        return createValidationError(validationError.errors || [validationError]);
      }

      const { meses_atras = 6 } = validatedArgs;
      
      mcpLogger.debug('Ejecutando analytics_riesgos_emergentes', { meses_atras });

      try {
        const alertas = await detectEmergingRisks(supabase, meses_atras);
        
        mcpLogger.debug('Detección de riesgos completada', { 
          totalAlertas: alertas.length,
          meses_atras 
        });

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
        mcpLogger.error(error instanceof Error ? error : new Error('Error al detectar riesgos emergentes'), { meses_atras });
        return createMCPError(
          `Error al detectar riesgos emergentes: ${error?.message || String(error)}`,
          'RISK_DETECTION_ERROR',
          { error: error?.message || String(error) }
        );
      }
    }

    case 'analytics_recomendaciones_empresa': {
      // ✅ MEJORA: Validación con Zod
      let validatedArgs;
      try {
        validatedArgs = analyticsRecomendacionesEmpresaSchema.parse(args);
      } catch (validationError: any) {
        mcpLogger.warn('Error de validación en analytics_recomendaciones_empresa', { args, error: validationError });
        return createValidationError(validationError.errors || [validationError]);
      }

      const { empresa, meses_atras = 12 } = validatedArgs;
      
      mcpLogger.debug('Ejecutando analytics_recomendaciones_empresa', { empresa, meses_atras });

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
        
        mcpLogger.debug('Recomendaciones generadas exitosamente', { 
          empresa, 
          totalRecomendaciones: recomendaciones.length 
        });

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
        mcpLogger.error(error instanceof Error ? error : new Error('Error al generar recomendaciones'), { empresa, meses_atras });
        return createMCPError(
          `Error al generar recomendaciones: ${error?.message || String(error)}`,
          'RECOMMENDATIONS_ERROR',
          { error: error?.message || String(error) }
        );
      }
    }

    case 'analytics_recomendaciones_trabajador': {
      // ✅ MEJORA: Validación con Zod
      let validatedArgs;
      try {
        validatedArgs = analyticsRecomendacionesTrabajadorSchema.parse(args);
      } catch (validationError: any) {
        mcpLogger.warn('Error de validación en analytics_recomendaciones_trabajador', { args, error: validationError });
        return createValidationError(validationError.errors || [validationError]);
      }

      const { trabajador_id, dni } = validatedArgs;
      
      mcpLogger.debug('Ejecutando analytics_recomendaciones_trabajador', { trabajador_id, dni });

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
            mcpLogger.error(new Error('Trabajador no encontrado'), { trabajador_id });
            throw createSupabaseError(error || new Error('Trabajador no encontrado'), 'Trabajador no encontrado');
          }
          trabajador = data;
        } else {
          const { data, error } = await supabase
            .from('trabajadores')
            .select('*')
            .eq('dni', dni)
            .single();
          
          if (error || !data) {
            mcpLogger.error(new Error('Trabajador no encontrado'), { dni });
            throw createSupabaseError(error || new Error('Trabajador no encontrado'), 'Trabajador no encontrado');
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
        
        mcpLogger.debug('Recomendaciones generadas exitosamente', { 
          trabajador_id: trabajador.id, 
          totalRecomendaciones: recomendaciones.length 
        });

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
        mcpLogger.error(error instanceof Error ? error : new Error('Error al generar recomendaciones'), { 
          trabajador_id, 
          dni 
        });
        
        // Si el error ya es un MCPError, retornarlo directamente
        if (error.isError) {
          return error;
        }
        
        return createMCPError(
          `Error al generar recomendaciones: ${error?.message || String(error)}`,
          'RECOMMENDATIONS_ERROR',
          { error: error?.message || String(error) }
        );
      }
    }

    default:
      mcpLogger.warn('Herramienta de análisis desconocida', { toolName });
      return createMCPError(
        `Herramienta de análisis desconocida: ${toolName}`,
        'UNKNOWN_TOOL',
        { 
          toolName, 
          availableTools: [
            'analytics_predecir_salud_visual',
            'analytics_tendencias_empresa',
            'analytics_riesgos_emergentes',
            'analytics_recomendaciones_empresa',
            'analytics_recomendaciones_trabajador'
          ] 
        }
      );
  }
}

