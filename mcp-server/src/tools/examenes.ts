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
      const { limit = 100, trabajador_id, empresa_id } = args;
      
      let query = supabase
        .from('examenes_medicos')
        .select('*')
        .limit(limit);
      
      if (trabajador_id) {
        query = query.eq('trabajador_id', trabajador_id);
      }
      
      // Filtrar por empresa si se proporciona (multi-tenancy)
      if (empresa_id) {
        query = query.eq('empresa_id', empresa_id);
      }
      
      const { data, error } = await query.order('fecha_examen', { ascending: false });
      
      if (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error al listar exámenes: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }

    case 'examenes_analizar': {
      const { pdf_base64, use_thinking = false } = args;
      
      if (!pdf_base64) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: Se requiere el parámetro "pdf_base64"',
            },
          ],
          isError: true,
        };
      }

      try {
        // ============================================
        // PASO 1: VALIDACIÓN DEL PDF
        // ============================================
        console.log(`[Examenes] Validando PDF...`);
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

        console.log(`[Examenes] PDF válido: ${validation.type} (${validation.sizeInMB.toFixed(2)}MB, ${validation.pageCount || '?'} páginas)`);

        // ============================================
        // PASO 2: PRE-PROCESAMIENTO (si es necesario)
        // ============================================
        let processedPdfBase64 = pdf_base64;
        
        if (needsPreprocessing(validation)) {
          console.log(`[Examenes] PDF escaneado detectado. Aplicando pre-procesamiento...`);
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
            console.log(`[Examenes] Pre-procesamiento completado`);
          } catch (preprocessError: any) {
            console.warn(`[Examenes] Error en pre-procesamiento, continuando con PDF original: ${preprocessError.message}`);
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
        console.log(`[Examenes] Iniciando análisis con Gemini (${validation.type} PDF, ${validation.sizeInMB.toFixed(2)}MB)`);
        
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
          console.log(`[Examenes] Análisis con Gemini completado exitosamente`);
        } catch (geminiError: any) {
          // Si Gemini falla y el PDF es escaneado, intentar OCR como fallback
          if (validation.isScanned || validation.type === 'scanned') {
            console.log(`[Examenes] Gemini falló. Intentando OCR como fallback...`);
            try {
              analysisResult = await analyzeScannedPDFWithOCR(
                processedPdfBase64,
                analysisPrompt
              );
              usedOCR = true;
              console.log(`[Examenes] Análisis con OCR completado exitosamente`);
            } catch (ocrError: any) {
              // Si OCR también falla, lanzar error combinado
              console.error(`[Examenes] Tanto Gemini como OCR fallaron`);
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
            
            console.error(`[Examenes] Error en análisis de Gemini:`, errorDetails);
            
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
          console.error(`[Examenes] Error al parsear respuesta de Gemini:`, parseError);
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
        
        console.error(`[Examenes] Error inesperado:`, errorDetails);
        
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
      return {
        content: [
          {
            type: 'text',
            text: `Herramienta de exámenes desconocida: ${toolName}`,
          },
        ],
        isError: true,
      };
  }
}

