/**
 * Componente para analizar EMOs con IA
 * 
 * Permite analizar todos los EMOs del bucket emos-pdf usando Gemini AI
 * 
 * @component
 */

'use client';

import React, { useState } from 'react';
import { Bot, Loader2, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { useCompany } from '../contexts/CompanyContext';
import { logger } from '../utils/logger';
import { analyzePDFDirect } from '../lib/services/gemini-client';
import { EMO_ANALYSIS_PROMPT } from '../lib/prompts/emo-analysis';
import ResultadosAnalisis from './ResultadosAnalisis';

interface AnalisisResult {
  archivo: string;
  aptitud: string;
  restricciones: {
    lentes: string;
    altura: string;
    electricidad: string;
  };
  restriccionesCount: number;
  hallazgos: string[];
  espirometria?: {
    conclusion?: string;
    fvc?: string;
    fev1?: string;
  };
  audiometria?: {
    diagnostico?: string;
  };
  signosVitales?: {
    pa_sistolica?: string;
    pa_diastolica?: string;
    fc?: string;
    satO2?: string;
    peso?: string;
    talla?: string;
    imc?: string;
  };
  agudezaVisual?: {
    od_sc?: string;
    oi_sc?: string;
    od_cc?: string;
    oi_cc?: string;
    colores?: string;
    profundidad?: string;
  };
  antecedentes?: {
    personales?: string;
    familiares?: string;
    habitos_nocivos?: string;
  };
  datosCompletos: any;
  error?: string;
  confianza?: number;
}

export default function AnalizarEMOs() {
  const { empresaActiva } = useCompany();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [resultados, setResultados] = useState<AnalisisResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const analizarTodosEMOs = async () => {
    setIsAnalyzing(true);
    setError(null);
    setResultados([]);
    setProgress({ current: 0, total: 0 });

    try {
      // Paso 1: Listar archivos desde Supabase Storage (arquitectura híbrida: UI usa MCP para storage)
      const listResponse = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'storage_listar',
            arguments: { bucket: 'emos-pdf' }
          }
        })
      });

      const listData = await listResponse.json();
      if (listData.error) {
        throw new Error(listData.error.message || 'Error al listar archivos');
      }

      const files = JSON.parse(listData.result.content[0].text);
      if (!files || files.length === 0) {
        setError('No se encontraron archivos en el bucket emos-pdf. Por favor, sube algunos archivos PDF primero.');
        setIsAnalyzing(false);
        return;
      }

      // Si hay empresa activa, necesitamos listar archivos dentro de su carpeta
      // Los archivos se suben con path: {empresa_id}/{nombre_archivo}
      let filesToProcess: any[] = [];
      
      if (empresaActiva?.id) {
        // Listar archivos dentro de la carpeta de la empresa activa
        const empresaListResponse = await fetch('/api/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1.5,
            method: 'tools/call',
            params: {
              name: 'storage_listar',
              arguments: { bucket: 'emos-pdf', path: empresaActiva.id }
            }
          })
        });
        
        const empresaListData = await empresaListResponse.json();
        if (!empresaListData.error && empresaListData.result?.content?.[0]?.text) {
          const empresaFiles = JSON.parse(empresaListData.result.content[0].text);
          // Agregar el prefijo de la empresa al nombre del archivo para construir el path completo
          filesToProcess = empresaFiles
            .filter((f: any) => f.id !== null) // Ignorar carpetas (directorios)
            .map((f: any) => ({
              ...f,
              fullPath: `${empresaActiva.id}/${f.name}`
            }));
        }
      } else {
        // Si no hay empresa activa, procesar todos los archivos listados
        // (solo archivos, no carpetas)
        filesToProcess = files
          .filter((f: any) => f.id !== null) // Ignorar carpetas
          .map((f: any) => ({
            ...f,
            fullPath: f.name // Usar el nombre tal cual si es archivo en raíz
          }));
      }

      if (filesToProcess.length === 0) {
        const mensaje = empresaActiva?.id 
          ? `No se encontraron archivos PDF para analizar en la empresa "${empresaActiva.nombre}". Por favor, sube algunos archivos PDF primero.`
          : 'No se encontraron archivos PDF para analizar. Por favor, sube algunos archivos PDF primero.';
        setError(mensaje);
        setIsAnalyzing(false);
        return;
      }

      setProgress({ current: 0, total: filesToProcess.length });

      const resultadosTemp: AnalisisResult[] = [];

      // Paso 2: Analizar cada archivo
      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
        setProgress({ current: i + 1, total: filesToProcess.length });

        try {
          // Usar el path completo que incluye el prefijo de la empresa
          const filePath = file.fullPath || file.name;
          
          // Descargar archivo
          const downloadResponse = await fetch('/api/mcp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 2,
              method: 'tools/call',
              params: {
                name: 'storage_descargar',
                arguments: { bucket: 'emos-pdf', path: filePath }
              }
            })
          });

          const downloadData = await downloadResponse.json();
          
          // Verificar errores en la respuesta del MCP
          if (downloadData.error) {
            const errorMsg = downloadData.error.message || 'Error desconocido';
            // Si el error contiene información de URL, extraer solo el mensaje relevante
            if (errorMsg.includes('{"url"')) {
              throw new Error(`No se pudo descargar el archivo "${file.name}". El archivo puede no existir o no tener permisos de acceso.`);
            }
            throw new Error(`Error al descargar "${file.name}": ${errorMsg}`);
          }

          // Verificar que el resultado tenga contenido válido
          if (!downloadData.result || !downloadData.result.content || !downloadData.result.content[0]) {
            throw new Error(`Respuesta inválida del servidor MCP para "${file.name}". El archivo puede no existir en el storage.`);
          }

          const pdfBase64 = downloadData.result.content[0].text;

          // Validar que el contenido sea Base64 válido (no un mensaje de error)
          if (!pdfBase64 || typeof pdfBase64 !== 'string') {
            throw new Error(`No se recibieron datos Base64 válidos para ${file.name}`);
          }

          // Verificar que no sea un mensaje de error disfrazado
          if (pdfBase64.startsWith('Error al descargar') || 
              pdfBase64.startsWith('Error:') || 
              pdfBase64.includes('{"url"') ||
              pdfBase64.length < 100) { // Base64 de PDFs suele ser mucho más largo
            throw new Error(`Error al descargar ${file.name}: El servidor devolvió un mensaje de error en lugar de datos Base64`);
          }

          // Validar formato Base64 básico (solo caracteres válidos)
          const base64Regex = /^[A-Za-z0-9+/=]+$/;
          if (!base64Regex.test(pdfBase64)) {
            throw new Error(`Datos Base64 inválidos para ${file.name}: Contiene caracteres no válidos`);
          }

          // Analizar directamente con Gemini (mismo método que el script directo funcional)
          let analysisText: string;
          try {
            analysisText = await analyzePDFDirect(pdfBase64, EMO_ANALYSIS_PROMPT, 3);
            
            if (!analysisText || !analysisText.trim()) {
              throw new Error('Respuesta vacía del análisis de Gemini');
            }
          } catch (geminiError: any) {
            console.error(`[AnalizarEMOs] Error al analizar ${file.name} con Gemini:`, {
              error: geminiError,
              message: geminiError?.message
            });
            throw new Error(`Error al analizar ${file.name}: ${geminiError?.message || 'Error desconocido de Gemini'}`);
          }

          // Parsear JSON usando la misma lógica exacta del script directo funcional
          let parsed: any;
          try {
            // Intentar parsear como JSON primero (línea 117 del script funcional)
            const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              parsed = JSON.parse(jsonMatch[0]);
            } else {
              // Si no es JSON, parsear el formato CSV del prompt (fallback del script funcional)
              const csvSection = analysisText.split('PARTE 2:')[1] || analysisText;
              const csvLines = csvSection.split('\n').filter(line => line.trim());
              
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
                
                parsed = {
                  csv_parseado: {},
                  resumen_clinico: analysisText.split('PARTE 2:')[0]?.trim() || analysisText
                };

                if (headers.length > 0 && values.length > 0) {
                  headers.forEach((header, index) => {
                    if (header && parsed.csv_parseado) {
                      parsed.csv_parseado[header] = values[index] || '';
                    }
                  });
                }
              } else {
                throw new Error('No se pudo encontrar el CSV en la respuesta');
              }
            }
          } catch (parseError: any) {
            logger.error(parseError instanceof Error ? parseError : new Error(`Error al parsear JSON para ${file.name}`), {
              context: 'AnalizarEMOs',
              fileName: file.name,
              analysisTextPreview: analysisText.substring(0, 500)
            });
            throw new Error(`Error al analizar ${file.name}: Respuesta no es un JSON válido. ${parseError.message}`);
          }

          // Extraer datos del CSV parseado (misma lógica del script funcional)
          const csvData = parsed.csv_parseado || {};
          const aptitud = csvData.Aptitud_Final || 'N/A';
          const restrLentes = csvData.Restr_Lentes || 'NO';
          const restrAltura = csvData.Restr_Altura_1_8m || csvData['Restr_Altura_1.8m'] || 'NO';
          const restrElec = csvData.Restr_Elec || 'NO';

          // Contar restricciones (acepta "SI", "Si", "si" como en script funcional)
          let restriccionesCount = 0;
          if (restrLentes === "SI" || restrLentes === "Si" || restrLentes === "si") restriccionesCount++;
          if (restrAltura === "SI" || restrAltura === "Si" || restrAltura === "si") restriccionesCount++;
          if (restrElec === "SI" || restrElec === "Si" || restrElec === "si") restriccionesCount++;

          const restricciones = {
            lentes: restrLentes.toUpperCase(),
            altura: restrAltura.toUpperCase(),
            electricidad: restrElec.toUpperCase()
          };

          // Extraer hallazgos del resumen clínico (misma lógica del script funcional)
          const hallazgos: string[] = [];
          if (parsed.resumen_clinico) {
            const resumen = parsed.resumen_clinico.toLowerCase();
            if (resumen.includes('bradicardia')) hallazgos.push('Bradicardia');
            if (resumen.includes('taquicardia')) hallazgos.push('Taquicardia');
            if (resumen.includes('hipertensión') || resumen.includes('hipertension')) hallazgos.push('Hipertensión');
            if (resumen.includes('diabetes')) hallazgos.push('Diabetes');
            if (resumen.includes('obesidad')) hallazgos.push('Obesidad');
            if (resumen.includes('anemia')) hallazgos.push('Anemia');
          }

          const resultado: AnalisisResult = {
            archivo: file.name || file.fullPath || 'archivo.pdf',
            aptitud: aptitud.toUpperCase(),
            restricciones,
            restriccionesCount,
            hallazgos,
            espirometria: {
              conclusion: csvData.Espiro_Conclusion || undefined,
              fvc: csvData.FVC_Valor || undefined,
              fev1: csvData.FEV1_Valor || undefined
            },
            audiometria: {
              diagnostico: csvData.Dx_Audio || undefined
            },
            signosVitales: {
              pa_sistolica: csvData.PA_Sistolica || undefined,
              pa_diastolica: csvData.PA_Diastolica || undefined,
              fc: csvData.FC || undefined,
              satO2: csvData.SatO2 || undefined,
              peso: csvData.Peso || undefined,
              talla: csvData.Talla || undefined,
              imc: csvData.IMC || undefined
            },
            agudezaVisual: {
              od_sc: csvData.Vis_Lejos_OD_SC || undefined,
              oi_sc: csvData.Vis_Lejos_OI_SC || undefined,
              od_cc: csvData.Vis_Lejos_OD_CC || undefined,
              oi_cc: csvData.Vis_Lejos_OI_CC || undefined,
              colores: csvData.Vision_Colores || undefined,
              profundidad: csvData.Vision_Profundidad || undefined
            },
            antecedentes: {
              personales: csvData.Ant_Personales || undefined,
              familiares: csvData.Ant_Familiares || undefined,
              habitos_nocivos: csvData.Habitos_Nocivos || undefined
            },
            datosCompletos: parsed,
            confianza: parsed.metadata ? 0.85 : undefined
          };

          resultadosTemp.push(resultado);
          setResultados([...resultadosTemp]);

        } catch (fileError: any) {
          const fileName = file.name || file.fullPath || 'archivo desconocido';
          console.error(`Error procesando ${fileName}:`, fileError);
          resultadosTemp.push({
            archivo: fileName,
            aptitud: 'ERROR',
            restricciones: { lentes: 'ND', altura: 'ND', electricidad: 'ND' },
            restriccionesCount: 0,
            hallazgos: [],
            datosCompletos: {},
            error: fileError.message || 'Error desconocido'
          });
          setResultados([...resultadosTemp]);
        }
      }

    } catch (err: any) {
      setError(err.message || 'Error al analizar EMOs');
      logger.error(err instanceof Error ? err : new Error('Error en analizarTodosEMOs'), {
        context: 'AnalizarEMOs'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Bot className="text-indigo-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Análisis de EMOs con IA</h2>
              <p className="text-sm text-gray-500">Analiza todos los exámenes médicos ocupacionales usando Gemini AI</p>
            </div>
          </div>
        </div>

        <button
          onClick={analizarTodosEMOs}
          disabled={isAnalyzing}
          className={`
            w-full py-3 px-6 rounded-lg font-semibold transition-all
            ${isAnalyzing
              ? 'bg-gray-400 cursor-not-allowed text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg'
            }
          `}
        >
          {isAnalyzing ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="animate-spin" size={20} />
              <span>Analizando... ({progress.current}/{progress.total})</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Bot size={20} />
              <span>🤖 Analizar EMOs con IA</span>
            </div>
          )}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <XCircle size={20} />
              <span className="font-semibold">Error</span>
            </div>
            <p className="mt-2 text-red-700">{error}</p>
          </div>
        )}

        {progress.total > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Progreso</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {resultados.length > 0 && (
        <ResultadosAnalisis data={resultados} />
      )}
    </div>
  );
}

