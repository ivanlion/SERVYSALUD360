/**
 * Herramientas MCP para gestión de exámenes médicos
 * 
 * @module mcp-server/src/tools/examenes
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SupabaseClient } from '@supabase/supabase-js';
// Importar servicio de Gemini para análisis de documentos (disponible para uso futuro)
// La función analyzeDocument está disponible para ser usada en futuras herramientas
import { analyzeDocument } from '../services/gemini';

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
      const { limit = 100, trabajador_id } = args;
      
      let query = supabase
        .from('examenes_medicos')
        .select('*')
        .limit(limit);
      
      if (trabajador_id) {
        query = query.eq('trabajador_id', trabajador_id);
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
        // Usar thinking mode para análisis más cuidadoso (opcional, por defecto false)
        const useThinkingMode = use_thinking === true;
        
        // Prompt especializado para extraer información médica estructurada (formato Antamina/MASS)
        const analysisPrompt = `ROL: Eres un Auditor Médico de Salud Ocupacional experto en Vigilancia Médica y minería de datos clínicos.

OBJETIVO: Extraer TODA la información clínica, técnica y antecedentes de los PDF (formato Antamina/MASS) para llenar una Matriz de Vigilancia Médica Integral en Excel.

⚠️⚠️⚠️ INSTRUCCIÓN CRÍTICA PARA RESTRICCIONES (LEE ESTO PRIMERO) ⚠️⚠️⚠️

Para los campos Restr_Lentes, Restr_Altura_1.8m y Restr_Elec en el CSV:

1. Anclaje de Columnas (Pág 1): Localiza los encabezados 'No' y 'Si'. Establece sus coordenadas horizontales como límites fijos: 'No' = Izquierda, 'Si' = Derecha.

2. Inspección de Marca: Para cada ítem de la tabla:
   - Lentes correctores (Restr_Lentes): Identifica que la 'X' está físicamente bajo la columna de la derecha ('Si'). Si está bajo 'Si', reporta 'SI'. Si está bajo 'No', reporta 'NO'.
   - Restricción para trabajos en altura física mayor a 1,8 metros (Restr_Altura_1.8m): Identifica que la marca está bajo la columna de la izquierda ('No'). Si está bajo 'No', reporta 'NO'. Si está bajo 'Si', reporta 'SI'.
   - Restricción para trabajar con fibra óptica o cables eléctricos (Restr_Elec): Identifica que la marca está bajo la columna de la izquierda ('No'). Si está bajo 'No', reporta 'NO'. Si está bajo 'Si', reporta 'SI'.

3. Prioridad de Imagen: Ignora el texto de "Recomendaciones" para determinar la restricción. La posición de la 'X' en la tabla es la única verdad para este campo.

4. Salida Estricta: Si una marca está entre ambas columnas o es ilegible, devuelve 'ND' (indeterminado).

REGLAS CRÍTICAS DE EXTRACCIÓN:

Extracción de Datos por Coordenadas (Pág 1): Para las restricciones, localiza la fila correspondiente en la tabla y verifica la posición física de la 'X'.

Reglas de validación estricta:
- Mapeo Vertical: Determina si el centro del carácter 'X' cae dentro de los límites visuales de la columna 'SÍ' o de la columna 'NO'.
- Cero Inferencia: Si la 'X' está ausente, desplazada o marcada en ambas, devuelve "ND" (no disponible).
- Prohibición: No utilices el sentido de la frase o el contexto de otras filas para deducir la posición. Solo reporta lo que es físicamente visible en esa coordenada.

Datos Numéricos: Extrae el valor exacto (ej: "158"). Si no hay dato o no se realizó, pon "ND".

Tipo de Examen: Identifica si es Pre-ocupacional, Anual o Retiro.

Exhaustividad: Busca en todas las páginas (Anexos 16, Especialidades, Laboratorio, etc.).

FORMATO DE SALIDA (ESTRICTO):

PARTE 1: RESUMEN CLÍNICO (Lectura Humana)

Genera un resumen punteo (bullet points) agrupado por:

Datos Generales y Aptitud.

Hallazgos Críticos (Patologías encontradas).

Resumen de Interconsultas pendientes.

PARTE 2: BLOQUE DE CÓDIGO CSV (Para Excel)

Genera un bloque de código CSV separado por punto y coma (;).

Usa EXACTAMENTE estos encabezados en la primera línea (Una sola línea larga):

Fecha_EMO;Centro_Medico;Tipo_Examen;DNI;Nombre;Edad;Sexo;Puesto;Empresa;Aptitud_Final;Vencimiento;Restr_Lentes;Restr_Altura_1.8m;Restr_Elec;Recomendaciones_Grales;Ant_Personales;Habitos_Nocivos;Ant_Familiares;PA_Sistolica;PA_Diastolica;FC;SatO2;Peso;Talla;IMC;Cintura;Cadera;Aptitud_Espalda_Score;Hallazgos_Musculo;Aptitud_Gran_Altura;Aptitud_Altura_Estructural;EKG_Ritmo;Vis_Lejos_OD_SC;Vis_Lejos_OI_SC;Vis_Lejos_OD_CC;Vis_Lejos_OI_CC;Vision_Colores;Vision_Profundidad;Dx_Oftalmo;Dx_Audio;Espiro_Conclusion;FVC_Valor;FEV1_Valor;Rx_Torax_OIT;Aptitud_Psico;Odonto_Estado;Hb;Hto;Leucocitos;Plaquetas;Glucosa;Col_Total;HDL;LDL;Trigliceridos;Ex_Orina;Toxicologico;Grupo_Sangre

Instrucciones para llenar los campos del CSV:

Ant_Personales: Resume patologías marcadas en Anexo 16 (ej. "Gastritis, Miopía"). Si todo NO, pon "Niega".

Habitos_Nocivos: Resume consumo (ej. "Alcohol social, Tabaco niega").

Aptitud_Espalda_Score: Valor numérico de la Ficha Musculoesquelética (ej. "4/4" o "Excelente").

Aptitud_Gran_Altura: Resultado del Anexo 16A (>2500msnm).

Aptitud_Altura_Estructural: Resultado del examen (>1.8m) y test vestibular.

Dx_Oftalmo: Diagnóstico final (ej. "Emetropía", "Ametropía", "Presbicia").

Dx_Audio: Diagnóstico final (ej. "Normoacusia", "Trauma Acústico").

Odonto_Estado: Resumen (ej. "Sano", "Caries: 2", "Gingivitis").

Toxicologico: Resultado global (Negativo/Positivo).

Restr_Lentes, Restr_Altura_1.8m, Restr_Elec: Aplica las instrucciones críticas de arriba para cada una de estas restricciones. Verifica la posición física de la 'X' en la fila correspondiente de la tabla de restricciones en la Pág 1.

Usa punto y coma (;) como separador.`;

        // Analizar el documento con Gemini (usar thinking mode si está habilitado)
        const analysisResult = await analyzeDocument(
          analysisPrompt,
          pdf_base64,
          useThinkingMode
        );

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
            csv_parseado: csvData
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
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'Error al parsear la respuesta de Gemini',
                  raw_response: analysisResult,
                  parse_error: parseError instanceof Error ? parseError.message : String(parseError)
                }, null, 2),
              },
            ],
            isError: true,
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Error al analizar el examen médico',
                message: error instanceof Error ? error.message : String(error)
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

