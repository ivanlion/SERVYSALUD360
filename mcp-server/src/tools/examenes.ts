/**
 * Herramientas MCP para gestión de exámenes médicos
 * 
 * @module mcp-server/src/tools/examenes
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { analyzeDocument } from '../services/gemini';
import { EMO_ANALYSIS_PROMPT } from '../../../lib/prompts/emo-analysis';
import { validatePDF, needsPreprocessing } from '../services/pdf-validator';
import { processImage } from '../services/image-processor';
import { analyzeScannedPDFWithOCR } from '../services/ocr-fallback';
import { examenesListarSchema, examenesAnalizarSchema } from './schemas/examenes';
import { generateCacheKey, getFromCache, setInCache } from '../utils/cache';
import { createMCPError, createValidationError, createSupabaseError } from '../utils/errors';
import { mcpLogger } from '../utils/logger';

/**
 * Define las herramientas relacionadas con exámenes médicos
 */
export const examenesTools: Tool[] = [
  {
    name: 'examenes_listar',
    description: 'Lista todos los exámenes médicos registrados',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Número máximo de exámenes a retornar',
        },
        trabajador_id: {
          type: 'string',
          description: 'ID del trabajador para filtrar exámenes',
        },
        empresa_id: {
          type: 'string',
          description: 'ID de la empresa para filtrar exámenes (opcional, para multi-tenancy)',
        },
      },
    },
  },
  {
    name: 'examenes_analizar',
    description: 'Analiza un examen médico PDF usando Gemini AI y extrae información estructurada (aptitud, restricciones, hallazgos, espirometría, audiometría)',
    inputSchema: {
      type: 'object',
      properties: {
        pdf_base64: {
          type: 'string',
          description: 'Contenido del PDF en formato base64',
        },
        use_thinking: {
          type: 'boolean',
          description: 'Usar modo thinking de Gemini para análisis más profundo (opcional, default: false)',
        },
      },
      required: ['pdf_base64'],
    },
  },
];

/**
 * Maneja la ejecución de herramientas de exámenes
 */
export async function handleExamenesTool(
  toolName: string,
  args: Record<string, any>,
  supabase: SupabaseClient
): Promise<any> {
  switch (toolName) {
    case 'examenes_listar': {
      // ✅ MEJORA: Validación con Zod
      let validatedArgs;
      try {
        validatedArgs = examenesListarSchema.parse(args);
      } catch (validationError: any) {
        mcpLogger.warn('Error de validación en examenes_listar', { args, error: validationError });
        return createValidationError(validationError.errors || [validationError]);
      }
      
      const { limit = 100, offset = 0, trabajador_id, empresa_id } = validatedArgs;
      
      // ✅ MEJORA: Verificar caché
      const cacheKey = generateCacheKey(toolName, validatedArgs);
      const cached = getFromCache(cacheKey);
      if (cached) {
        mcpLogger.debug('Resultado obtenido del caché', { toolName, cacheKey });
        return cached;
      }
      
      mcpLogger.debug('Ejecutando examenes_listar', { limit, offset, trabajador_id, empresa_id });
      
      // ✅ MEJORA: Paginación completa con range
      let query = supabase
        .from('examenes_medicos')
        .select('id, trabajador_id, empresa_id, fecha_examen, tipo_examen, resultado, observaciones, archivo_url, created_at, updated_at', { count: 'exact' })
        .range(offset, offset + limit - 1);
      
      if (trabajador_id) {
        query = query.eq('trabajador_id', trabajador_id);
      }
      
      // Filtrar por empresa si se proporciona (multi-tenancy)
      if (empresa_id) {
        query = query.eq('empresa_id', empresa_id);
      }
      
      const { data, error, count } = await query.order('fecha_examen', { ascending: false });
      
      if (error) {
        mcpLogger.error(new Error(`Error al listar exámenes: ${error.message}`), { 
          toolName, 
          error: error.message,
          code: error.code 
        });
        return createSupabaseError(error, 'Error al listar exámenes');
      }
      
      // ✅ MEJORA: Incluir información de paginación
      const result = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              data,
              pagination: {
                total: count || 0,
                limit,
                offset,
                hasMore: count ? offset + limit < count : false,
              },
            }, null, 2),
          },
        ],
      };
      
      // ✅ MEJORA: Guardar en caché
      setInCache(cacheKey, result);
      mcpLogger.debug('Resultado guardado en caché', { toolName, cacheKey, dataCount: data?.length || 0 });
      
      return result;
    }

    case 'examenes_analizar': {
      // ✅ MEJORA: Validación con Zod
      let validatedArgs;
      try {
        validatedArgs = examenesAnalizarSchema.parse(args);
      } catch (validationError: any) {
        mcpLogger.warn('Error de validación en examenes_analizar', { error: validationError });
        return createValidationError(validationError.errors || [validationError]);
      }
      
      const { pdf_base64, use_thinking = false } = validatedArgs;
      
      // Nota: No usamos caché para análisis porque cada PDF es único

      try {
        // ============================================
        // PASO 1: VALIDACIÓN DEL PDF
        // ============================================
        mcpLogger.debug('Validando PDF para análisis');
        const validation = await validatePDF(pdf_base64);
        
        if (!validation.isValid) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'PDF inválido',
                  error_details: {
                    message: validation.error || 'El archivo PDF no es válido',
                    size_mb: validation.sizeInMB.toFixed(2),
                    type: validation.type
                  },
                  suggestions: [
                    'Verifique que el archivo sea un PDF válido',
                    validation.sizeInMB > 20 ? 'El archivo es demasiado grande. Considere comprimirlo.' : null,
                    'Intente descargar el archivo nuevamente'
                  ].filter(Boolean)
                }, null, 2),
              },
            ],
            isError: true,
          };
        }

        mcpLogger.debug('PDF válido', { 
          type: validation.type, 
          sizeMB: validation.sizeInMB.toFixed(2),
          pageCount: validation.pageCount 
        });

        // ============================================
        // PASO 2: PRE-PROCESAMIENTO (si es necesario)
        // ============================================
        let processedPdfBase64 = pdf_base64;
        
        if (needsPreprocessing(validation)) {
          mcpLogger.debug('PDF escaneado detectado, aplicando pre-procesamiento');
          try {
            // Procesar imagen para mejorar calidad
            processedPdfBase64 = await processImage(pdf_base64, {
              enhanceContrast: true,
              enhanceBrightness: true,
              denoise: true,
              resize: validation.sizeInMB > 5 ? {
                maxWidth: 2000,
                maxHeight: 2000,
                quality: 85
              } : undefined
            });
            mcpLogger.debug('Pre-procesamiento completado');
          } catch (preprocessError: any) {
            mcpLogger.warn('Error en pre-procesamiento, continuando con PDF original', { error: preprocessError.message });
            // Continuar con el PDF original si el pre-procesamiento falla
          }
        }

        // Usar thinking mode para análisis más cuidadoso (opcional, por defecto false)
        const useThinkingMode = use_thinking === true;
        
        // Usar prompt centralizado desde lib/prompts/emo-analysis.ts
        const analysisPrompt = EMO_ANALYSIS_PROMPT;


        // ============================================
        // PASO 3: ANÁLISIS CON GEMINI (con retry y fallback a OCR)
        // ============================================
        mcpLogger.debug('Iniciando análisis con Gemini', { 
          pdfType: validation.type, 
          sizeMB: validation.sizeInMB.toFixed(2),
          useThinking: use_thinking 
        });
        
        let analysisResult: string;
        let usedOCR = false;
        
        try {
          // Intentar análisis con Gemini (3 intentos con backoff exponencial)
          analysisResult = await analyzeDocument(
            analysisPrompt,
            processedPdfBase64,
            useThinkingMode,
            3 // maxRetries
          );
          mcpLogger.debug('Análisis con Gemini completado exitosamente');
        } catch (geminiError: any) {
          mcpLogger.warn('Error en análisis con Gemini', { error: geminiError.message });
          // Si Gemini falla y el PDF es escaneado, intentar OCR como fallback
          if (validation.isScanned || validation.type === 'scanned') {
            mcpLogger.debug('Gemini falló, intentando OCR como fallback');
            try {
              analysisResult = await analyzeScannedPDFWithOCR(
                processedPdfBase64,
                analysisPrompt
              );
              usedOCR = true;
              mcpLogger.debug('Análisis con OCR completado exitosamente');
            } catch (ocrError: any) {
              // Si OCR también falla, lanzar error combinado
              mcpLogger.error(new Error('Tanto Gemini como OCR fallaron'), { 
                geminiError: geminiError.message,
                ocrError: ocrError.message 
              });
              const errorDetails = {
                error_type: 'ANALYSIS_FAILED',
                message: `Análisis falló: Gemini (${geminiError?.message || 'unknown'}) y OCR (${ocrError?.message || 'unknown'})`,
                gemini_error: geminiError?.message || 'Unknown',
                ocr_error: ocrError?.message || 'Unknown',
                pdf_size_mb: validation.sizeInMB.toFixed(2),
                pdf_type: validation.type,
                timestamp: new Date().toISOString()
              };
              
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      error: 'Error al analizar el examen médico: tanto Gemini como OCR fallaron',
                      error_details: errorDetails,
                      suggestions: [
                        'Verifique que el PDF no esté corrupto',
                        'Intente comprimir el PDF si es muy grande',
                        'Verifique la conexión a la API de Gemini',
                        'El PDF puede requerir procesamiento manual'
                      ]
                    }, null, 2),
                  },
                ],
                isError: true,
              };
            }
          } else {
            // Si no es escaneado, solo lanzar error de Gemini
            const errorDetails = {
              error_type: 'GEMINI_API_ERROR',
              message: geminiError?.message || 'Error desconocido de Gemini API',
              code: geminiError?.lastError?.code || geminiError?.code || 'UNKNOWN',
              status: geminiError?.lastError?.status || geminiError?.status || 'UNKNOWN',
              attempts: geminiError?.attempts || [],
              isRetryable: geminiError?.isRetryable || false,
              pdf_size_mb: validation.sizeInMB.toFixed(2),
              timestamp: new Date().toISOString()
            };
            
            mcpLogger.error(new Error('Error en análisis de Gemini'), errorDetails);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    error: 'Error al analizar el examen médico con Gemini AI',
                    error_details: errorDetails,
                    suggestions: [
                      geminiError?.isRetryable ? 'El error es recuperable. Se recomienda reintentar.' : 'El error no es recuperable. Verifique el archivo PDF.',
                      validation.sizeInMB > 10 ? 'El archivo es muy grande. Considere comprimirlo.' : null,
                      'Verifique que el PDF no esté corrupto.',
                      'Verifique la conexión a la API de Gemini.'
                    ].filter(Boolean)
                  }, null, 2),
                },
              ],
              isError: true,
            };
          }
        }

        // El nuevo formato devuelve texto con resumen clínico y CSV
        // Devolvemos la respuesta completa para que el usuario la procese
        try {
          // La respuesta tiene dos partes: RESUMEN CLÍNICO y CSV
          // Devolvemos la respuesta completa como texto estructurado
          const responseData = {
            resumen_clinico: analysisResult.split('PARTE 2:')[0]?.trim() || analysisResult,
            csv: analysisResult.includes('PARTE 2:') ? analysisResult.split('PARTE 2:')[1]?.trim() : null,
            respuesta_completa: analysisResult
          };
          
          // Parsear el CSV si está presente para facilitar su uso
          let csvData: Record<string, string> | null = null;
          if (responseData.csv) {
            const csvLines = responseData.csv.split('\n').filter(line => line.trim());
            // Buscar la línea que contiene los encabezados (puede tener prefijos como "BLOQUE DE CÓDIGO CSV")
            let headerLineIndex = -1;
            for (let i = 0; i < csvLines.length; i++) {
              if (csvLines[i]?.includes('Fecha_EMO') && csvLines[i]?.includes('Centro_Medico')) {
                headerLineIndex = i;
                break;
              }
            }
            
            if (headerLineIndex >= 0 && csvLines.length > headerLineIndex + 1) {
              const headers = csvLines[headerLineIndex]?.split(';').map(h => h.trim()).filter(h => h) || [];
              const values = csvLines[headerLineIndex + 1]?.split(';').map(v => v.trim()) || [];
              if (headers.length > 0 && values.length > 0) {
                csvData = {};
                headers.forEach((header, index) => {
                  if (csvData && header) {
                    csvData[header] = values[index] || '';
                  }
                });
              }
            }
          }
          
          const parsedData = {
            ...responseData,
            csv_parseado: csvData,
            metadata: {
              pdf_type: validation.type,
              pdf_size_mb: validation.sizeInMB.toFixed(2),
              page_count: validation.pageCount,
              is_scanned: validation.isScanned,
              used_ocr: usedOCR,
              preprocessing_applied: needsPreprocessing(validation)
            }
          };

          // Devolver la respuesta en el nuevo formato
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(parsedData, null, 2),
              },
            ],
          };
        } catch (parseError) {
          mcpLogger.error(parseError instanceof Error ? parseError : new Error('Error al parsear respuesta'), { 
            rawResponseLength: analysisResult?.length 
          });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'Error al parsear la respuesta de Gemini',
                  error_type: 'PARSE_ERROR',
                  raw_response_preview: analysisResult?.substring(0, 500) || 'N/A',
                  raw_response_length: analysisResult?.length || 0,
                  parse_error: parseError instanceof Error ? parseError.message : String(parseError),
                  timestamp: new Date().toISOString()
                }, null, 2),
              },
            ],
            isError: true,
          };
        }
      } catch (error) {
        // Error general no capturado anteriormente
        const errorDetails = {
          error_type: 'UNEXPECTED_ERROR',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        };
        
        mcpLogger.error(error instanceof Error ? error : new Error('Error inesperado'), errorDetails);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Error inesperado al analizar el examen médico',
                error_details: errorDetails
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    }

    default:
      mcpLogger.warn('Herramienta de exámenes desconocida', { toolName });
      return createMCPError(
        `Herramienta de exámenes desconocida: ${toolName}`,
        'UNKNOWN_TOOL',
        { toolName, availableTools: ['examenes_listar', 'examenes_analizar'] }
      );
  }
}

