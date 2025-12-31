/**
 * UploadEMO - Componente para subir/arrastrar EMO y extraer datos
 * 
 * Permite subir un EMO PDF, analizarlo con IA y guardar los datos en los módulos correspondientes
 * 
 * Validación robusta de archivos implementada:
 * - Tamaño máximo: 10MB por archivo
 * - Tipos permitidos: PDF, PNG, JPEG
 * - Máximo 10 archivos simultáneos
 * - Validación de nombres de archivo
 * 
 * @component
 */

'use client';

import React, { useState, useRef } from 'react';
import { z } from 'zod';
import { Upload, FileText, X, Loader2, CheckCircle2, AlertCircle, Save, CloudUpload, FileCheck } from 'lucide-react';
import { useCompany } from '../contexts/CompanyContext';
import { useNotifications } from '../contexts/NotificationContext';
import { logger } from '../utils/logger';
import { supabase } from '../lib/supabase';
import { analyzePDFDirect } from '../lib/services/gemini-client';
import { EMO_ANALYSIS_PROMPT } from '../lib/prompts/emo-analysis';
import { validateSupabaseData, TrabajadorSchema, ExamenMedicoSchema } from '../lib/validations/supabase-schemas';

// ============================================================================
// UTILIDADES DE FECHA
// ============================================================================

/**
 * Normaliza una fecha de diferentes formatos a YYYY-MM-DD (formato ISO para PostgreSQL)
 * 
 * Soporta:
 * - DD-MM-YYYY (ej: "23-12-2025")
 * - DD/MM/YYYY (ej: "23/12/2025")
 * - YYYY-MM-DD (ej: "2025-12-23") - ya está en formato correcto
 * - YYYY/MM/DD (ej: "2025/12/23")
 * 
 * @param dateString - Fecha en cualquier formato
 * @returns Fecha en formato YYYY-MM-DD o null si no es válida
 */
const normalizeDateToISO = (dateString: string | undefined | null): string | null => {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  const trimmed = dateString.trim();
  if (!trimmed) {
    return null;
  }

  // Si ya está en formato YYYY-MM-DD, retornar directamente
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Intentar parsear diferentes formatos
  let day: string, month: string, year: string;

  // Formato DD-MM-YYYY o DD/MM/YYYY
  const matchDDMMYYYY = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (matchDDMMYYYY) {
    [, day, month, year] = matchDDMMYYYY;
    // Validar que los valores sean razonables
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  // Formato YYYY/MM/DD
  const matchYYYYMMDD = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (matchYYYYMMDD) {
    [, year, month, day] = matchYYYYMMDD;
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  // Si no coincide con ningún formato, intentar parsear con Date
  try {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  } catch {
    // Ignorar errores de parsing
  }

  // Si no se pudo parsear, retornar null
  logger.warn('[UploadEMO] No se pudo normalizar la fecha:', dateString);
  return null;
};

/**
 * Obtiene una fecha normalizada o usa la fecha actual como fallback
 * 
 * @param dateString - Fecha en cualquier formato
 * @returns Fecha en formato YYYY-MM-DD
 */
const getNormalizedDateOrToday = (dateString: string | undefined | null): string => {
  const normalized = normalizeDateToISO(dateString);
  if (normalized) {
    return normalized;
  }
  // Fallback a fecha actual en formato ISO
  return new Date().toISOString().split('T')[0];
};

// ============================================================================
// SCHEMAS DE VALIDACIÓN ZOD
// ============================================================================

/**
 * Schema de validación para un archivo individual
 */
const FileValidationSchema = z.object({
  name: z.string()
    .min(1, 'El nombre del archivo es requerido')
    .refine(
      (name) => {
        // Validar que el nombre no contenga caracteres peligrosos
        const dangerousChars = /[<>:"|?*\x00-\x1f]/;
        return !dangerousChars.test(name);
      },
      { message: 'El nombre del archivo contiene caracteres no permitidos' }
    ),
  size: z.number()
    .max(10 * 1024 * 1024, 'El archivo no debe superar 10MB'),
  type: z.enum(
    ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
  ).refine(
    (val) => ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'].includes(val),
    { message: 'Tipo de archivo no permitido. Solo se permiten PDF, PNG o JPG' }
  ),
});

/**
 * Schema de validación para lista de archivos
 */
const FileListSchema = z.array(FileValidationSchema)
  .max(10, 'No se pueden subir más de 10 archivos a la vez')
  .min(1, 'Debe seleccionar al menos un archivo');

/**
 * Tipo para archivo validado
 */
interface ValidatedFile {
  file: File;
  isValid: boolean;
  errors: string[];
}

// ============================================================================
// INTERFACES
// ============================================================================

interface ExtractedData {
  resumen_clinico?: string;
  csv_parseado?: {
    Fecha_EMO?: string;
    DNI?: string;
    Nombre?: string;
    Aptitud_Final?: string;
    Restr_Lentes?: string;
    Restr_Altura_1_8m?: string;
    Restr_Elec?: string;
    PA_Sistolica?: string;
    PA_Diastolica?: string;
    FC?: string;
    IMC?: string;
    FVC_Valor?: string;
    FEV1_Valor?: string;
    Dx_Audio?: string;
    Dx_Oftalmo?: string;
    [key: string]: any;
  };
  metadata?: {
    pdf_type?: string;
    pdf_size_mb?: string;
    used_ocr?: boolean;
  };
}

// ============================================================================
// FUNCIONES DE VALIDACIÓN
// ============================================================================

/**
 * Valida un archivo individual
 */
const validateSingleFile = (file: File): { valid: boolean; errors: string[] } => {
  try {
    // Normalizar tipo MIME (algunos navegadores reportan 'image/jpg' como 'image/jpeg')
    const normalizedType = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
    
    // Validar extensión vs tipo MIME
    const extension = file.name.split('.').pop()?.toLowerCase();
    const validExtensions: Record<string, string[]> = {
      'application/pdf': ['pdf'],
      'image/png': ['png'],
      'image/jpeg': ['jpg', 'jpeg'],
    };
    
    const expectedExtensions = validExtensions[normalizedType] || [];
    if (extension && !expectedExtensions.includes(extension)) {
      return {
        valid: false,
        errors: [`La extensión del archivo (.${extension}) no coincide con el tipo MIME (${normalizedType})`]
      };
    }

    FileValidationSchema.parse({
      name: file.name,
      size: file.size,
      type: normalizedType
    });
    
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.issues.map((e: z.ZodIssue) => e.message)
      };
    }
    return { valid: false, errors: ['Error de validación desconocido'] };
  }
};

/**
 * Valida múltiples archivos
 */
const validateFiles = (files: File[]): { valid: boolean; errors: string[]; validatedFiles: ValidatedFile[] } => {
  const validatedFiles: ValidatedFile[] = files.map(file => {
    const validation = validateSingleFile(file);
    return {
      file,
      isValid: validation.valid,
      errors: validation.errors
    };
  });

  // Validar límite de archivos
  try {
    FileListSchema.parse(files.map(f => ({
      name: f.name,
      size: f.size,
      type: f.type === 'image/jpg' ? 'image/jpeg' : f.type
    })));
  } catch (error) {
    if (error instanceof z.ZodError) {
      const limitError = error.issues.find((e: z.ZodIssue) => e.path.length === 0);
      if (limitError) {
        return {
          valid: false,
          errors: [limitError.message],
          validatedFiles
        };
      }
    }
  }

  const allValid = validatedFiles.every(vf => vf.isValid);
  const allErrors = validatedFiles
    .filter(vf => !vf.isValid)
    .flatMap(vf => vf.errors.map(err => `${vf.file.name}: ${err}`));

  return {
    valid: allValid,
    errors: allErrors,
    validatedFiles
  };
};

/**
 * Sanitiza el nombre de un archivo para almacenamiento seguro
 */
const sanitizeFileName = (fileName: string): string => {
  // Remover caracteres peligrosos y espacios
  return fileName
    .replace(/[<>:"|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function UploadEMO() {
  const { empresaActiva } = useCompany();
  const { showError, showWarning, showSuccess } = useNotifications();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [fileValidationErrors, setFileValidationErrors] = useState<Map<string, string[]>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convertir archivo a base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Manejar drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Validar archivos antes de procesarlos
    const validation = validateFiles(files);
    
    if (!validation.valid) {
      const errorMessages = validation.errors.join('; ');
      showError(`Error de validación: ${errorMessages}`);
      setError(errorMessages);
      
      // Mostrar errores por archivo
      const errorsMap = new Map<string, string[]>();
      validation.validatedFiles.forEach(vf => {
        if (!vf.isValid && vf.errors.length > 0) {
          errorsMap.set(vf.file.name, vf.errors);
        }
      });
      setFileValidationErrors(errorsMap);
      return;
    }

    // Filtrar solo archivos válidos
    const validFiles = validation.validatedFiles
      .filter(vf => vf.isValid)
      .map(vf => vf.file);

    // Verificar límite de archivos (incluyendo los ya cargados)
    const totalFiles = uploadedFiles.length + validFiles.length;
    if (totalFiles > 10) {
      const excess = totalFiles - 10;
      showWarning(`Solo se pueden subir 10 archivos a la vez. Se ignorarán ${excess} archivo(s).`);
      validFiles.splice(10 - uploadedFiles.length);
    }

    setUploadedFiles(prev => [...prev, ...validFiles]);
    setError(null);
    setFileValidationErrors(new Map());

    // Si solo hay un archivo, procesarlo automáticamente
    if (validFiles.length === 1) {
      await handleFileSelect(validFiles[0]);
    } else if (validFiles.length > 1) {
      showSuccess(`${validFiles.length} archivos validados correctamente. Selecciona uno para analizar.`);
    }
  };

  // Manejar selección de archivo
  const handleFileSelect = async (file?: File) => {
    const selectedFile = file || fileInputRef.current?.files?.[0];
    if (!selectedFile) return;

    // Validar archivo antes de procesarlo
    const validation = validateSingleFile(selectedFile);
    
    if (!validation.valid) {
      const errorMessage = validation.errors.join('; ');
      showError(`Error de validación: ${errorMessage}`);
      setError(errorMessage);
      
      const errorsMap = new Map<string, string[]>();
      errorsMap.set(selectedFile.name, validation.errors);
      setFileValidationErrors(errorsMap);
      return;
    }

    // Verificar límite de archivos
    if (uploadedFiles.length >= 10 && !uploadedFiles.includes(selectedFile)) {
      showError('No se pueden subir más de 10 archivos a la vez');
      return;
    }

    // Agregar a la lista si no está ya
    if (!uploadedFiles.includes(selectedFile)) {
      setUploadedFiles(prev => [...prev, selectedFile]);
    }

    setError(null);
    setFileValidationErrors(new Map());
    setExtractedData(null);
    setSaveStatus('idle');
    setUploadedFilePath(null);

    // Subir y analizar automáticamente
    await uploadAndAnalyzeEMO(selectedFile);
  };

  // Subir archivo a Supabase Storage y analizar
  const uploadAndAnalyzeEMO = async (file: File) => {
    // Validar archivo antes de procesarlo
    const validation = validateSingleFile(file);
    if (!validation.valid) {
      const errorMessage = validation.errors.join('; ');
      showError(`Error de validación antes de procesar: ${errorMessage}`);
      setError(errorMessage);
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Paso 1: Subir archivo a Supabase Storage (opcional, solo si hay empresa)
      let uploadedPath: string | null = null;
      
      // Paso 1: Iniciar subida en background (no bloquea el análisis)
      if (empresaActiva) {
        setIsUploading(true);
        setUploadProgress(10);
        
        // Calcular timeout basado en tamaño del archivo (1 minuto por MB, mínimo 30s, máximo 5 minutos)
        const fileSizeMB = file.size / (1024 * 1024);
        const timeoutMs = Math.min(Math.max(fileSizeMB * 60000, 30000), 300000); // 30s - 5min
        
        // Iniciar subida en background (no esperamos, continúa en segundo plano)
        (async () => {
          try {
            // Sanitizar nombre de archivo antes de guardar
            const sanitizedName = sanitizeFileName(file.name);
            const fileName = `EMO_${Date.now()}_${sanitizedName}`;
            const filePath = `${empresaActiva.id}/${fileName}`;

            setUploadProgress(30);
            
            const uploadTask = supabase.storage
              .from('emos-pdf')
              .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
              });

            const timeoutTask = new Promise((_, reject) => 
              setTimeout(() => reject(new Error(`Timeout: La subida tardó más de ${Math.round(timeoutMs/1000)} segundos`)), timeoutMs)
            );

            const { data: uploadData, error: uploadError } = await Promise.race([
              uploadTask,
              timeoutTask
            ]) as any;

            if (uploadError) {
              logger.warn('Error al subir archivo (continuando con análisis):', uploadError.message);
              // No mostrar error si el análisis ya se completó exitosamente
              // El error se registra en consola pero no se muestra al usuario si el análisis funcionó
            } else {
              setUploadedFilePath(filePath);
              setUploadProgress(100);
              logger.debug('✅ Archivo subido exitosamente:', filePath);
            }
          } catch (uploadErr: any) {
            logger.warn('Error en subida (continuando con análisis):', uploadErr.message);
            // No mostrar error si el análisis ya se completó exitosamente
            // El error se registra en consola pero no se muestra al usuario si el análisis funcionó
          } finally {
            setIsUploading(false);
          }
        })();
      }
      
      // Paso 2: Iniciar análisis inmediatamente (no esperamos la subida)
      setIsAnalyzing(true);

      // Paso 2: Convertir a base64 para análisis
      const pdfBase64 = await fileToBase64(file);

      // Paso 3: Analizar con Gemini (mismo método que script directo funcional)
      const analysisText = await analyzePDFDirect(pdfBase64, EMO_ANALYSIS_PROMPT, 3);

      // Paso 4: Parsear JSON usando la misma lógica exacta del script directo funcional
      let parsed: ExtractedData;
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
        logger.error(parseError instanceof Error ? parseError : new Error('Error al parsear JSON'), {
          context: 'uploadAndAnalyzeEMO',
          error: parseError.message
        });
        throw new Error(`Error al parsear respuesta de IA: ${parseError.message}`);
      }

      setExtractedData(parsed);
      
      // Guardar en historial después del análisis exitoso
      // Nota: uploadedFilePath puede ser null si la subida aún está en progreso
      // Se guardará con el nombre del archivo como fallback
      await saveToHistory(parsed, file, uploadedFilePath);
    } catch (err: any) {
      logger.error(err instanceof Error ? err : new Error('Error al subir/analizar EMO'), {
        context: 'uploadAndAnalyzeEMO'
      });
      const errorMessage = err.message || 'Error al procesar el EMO';
      setError(errorMessage);
      showError(errorMessage);
      setIsUploading(false);
      setIsAnalyzing(false);
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  // Guardar análisis en historial
  const saveToHistory = async (analysis: ExtractedData, file: File, fileUrl: string | null) => {
    if (!empresaActiva || !analysis) {
      logger.debug('[UploadEMO] No se guarda en historial: falta empresa o análisis');
      return;
    }

    try {
      // Obtener usuario autenticado
      let user: any = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          user = session.user;
        } else {
          const authPromise = supabase.auth.getUser();
          const authTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 2000)
          );
          const result = await Promise.race([authPromise, authTimeout]) as any;
          if (result?.data?.user) {
            user = result.data.user;
          }
        }
      } catch (authErr: any) {
        logger.warn('[UploadEMO] No se pudo obtener usuario para historial:', authErr.message);
      }

      // Extraer datos del trabajador del análisis
      const csv = analysis.csv_parseado || {};
      const trabajadorDNI = csv.DNI || '';
      const trabajadorNombre = csv.Nombre || '';

      // Obtener URL pública del archivo si está en Storage
      let publicUrl: string | null = null;
      if (fileUrl) {
        try {
          const { data } = supabase.storage
            .from('emos-pdf')
            .getPublicUrl(fileUrl);
          publicUrl = data.publicUrl;
        } catch (urlErr: any) {
          logger.warn('[UploadEMO] No se pudo obtener URL pública:', urlErr.message);
        }
      }

      // Guardar en historial
      const { error: historyError } = await supabase
        .from('analisis_emo_historial')
        .insert({
          empresa_id: empresaActiva.id,
          trabajador_dni: trabajadorDNI,
          trabajador_nombre: trabajadorNombre,
          archivo_nombre: file.name,
          archivo_url: publicUrl || fileUrl || file.name,
          resultado_analisis: analysis,
          usuario_id: user?.id || null
        });

      if (historyError) {
        // No lanzar error, solo loguear (no es crítico)
        logger.warn('[UploadEMO] Error al guardar en historial:', historyError.message);
      } else {
        logger.debug('[UploadEMO] Análisis guardado en historial exitosamente', {
          trabajador: trabajadorDNI,
          archivo: file.name
        });
      }
    } catch (err: any) {
      // No lanzar error, solo loguear (no es crítico para el flujo principal)
      logger.warn('[UploadEMO] Error al guardar en historial:', err.message);
    }
  };

  // Guardar datos extraídos en los módulos correspondientes
  const saveExtractedData = async () => {
    if (!extractedData?.csv_parseado || !empresaActiva) {
      const errorMsg = 'No hay datos para guardar o no hay empresa seleccionada';
      setError(errorMsg);
      showError(errorMsg);
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveStatus('idle');

    try {
      logger.debug('[UploadEMO] Iniciando guardado de datos...');
      const csv = extractedData.csv_parseado;
      
      // Verificar autenticación (usar getSession que es más rápido)
      logger.debug('[UploadEMO] Verificando autenticación...');
      let user: any = null;
      
      try {
        // Intentar primero con getSession (más rápido y confiable)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (session?.user) {
          user = session.user;
          logger.debug('[UploadEMO] Usuario obtenido de sesión:', user.id);
        } else {
          logger.warn('[UploadEMO] No hay sesión activa, intentando getUser con timeout...');
          // Fallback a getUser con timeout corto (3 segundos)
          try {
            const authPromise = supabase.auth.getUser();
            const authTimeout = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 3000)
            );
            const result = await Promise.race([authPromise, authTimeout]) as any;
            if (result?.data?.user) {
              user = result.data.user;
              logger.debug('[UploadEMO] Usuario obtenido de getUser:', user.id);
            }
          } catch (getUserErr: any) {
            logger.warn('[UploadEMO] No se pudo obtener usuario:', getUserErr.message);
            // Continuar de todas formas, RLS validará los permisos
          }
        }
      } catch (authErr: any) {
        logger.warn('[UploadEMO] Error en verificación de autenticación:', authErr.message);
        // Continuar de todas formas, RLS validará los permisos en Supabase
      }

      // No bloquear si no hay usuario, RLS validará en Supabase
      if (user) {
        logger.debug('[UploadEMO] Usuario autenticado:', user.id);
      } else {
        logger.warn('[UploadEMO] Continuando sin usuario (RLS validará permisos en Supabase)');
      }

      // 1. Buscar o crear trabajador
      let trabajadorId: string | null = null;

      if (csv.DNI) {
        logger.debug('[UploadEMO] Buscando trabajador con DNI:', csv.DNI);
        
        // Buscar trabajador existente (usar maybeSingle para evitar error si no existe)
        const { data: trabajadorExistente, error: errorBusqueda } = await supabase
          .from('registros_trabajadores')
          .select('id')
          .eq('dni_ce_pas', csv.DNI)
          .eq('empresa_id', empresaActiva.id)
          .maybeSingle();

        if (errorBusqueda) {
          logger.error(new Error('Error al buscar trabajador'), {
            context: 'saveExtractedData',
            error: errorBusqueda.message,
            dni: csv.DNI
          });
          throw new Error(`Error al buscar trabajador: ${errorBusqueda.message}`);
        }

        if (trabajadorExistente) {
          // Validar datos del trabajador existente
          try {
            validateSupabaseData(TrabajadorSchema, trabajadorExistente, 'trabajador existente');
            trabajadorId = trabajadorExistente.id;
            logger.debug('[UploadEMO] Trabajador existente encontrado:', trabajadorId);
          } catch (validationError: any) {
            logger.error(validationError instanceof Error ? validationError : new Error('Error de validación trabajador existente'), {
              context: 'saveExtractedData',
              dni: csv.DNI
            });
            // Continuar de todas formas
            trabajadorId = trabajadorExistente.id;
          }
        } else {
          logger.debug('[UploadEMO] Creando nuevo trabajador...');
          
          // OPTIMIZACIÓN: Validar datos antes de insertar
          if (!csv.DNI || csv.DNI.trim() === '') {
            throw new Error('El DNI es requerido para crear un trabajador');
          }
          
          if (!empresaActiva?.id) {
            throw new Error('No hay empresa seleccionada. Selecciona una empresa antes de guardar.');
          }

          // Preparar datos del trabajador
          const trabajadorData = {
            dni_ce_pas: csv.DNI.trim(),
            apellidos_nombre: (csv.Nombre || '').trim() || 'Sin nombre',
            empresa: empresaActiva.nombre || '',
            empresa_id: empresaActiva.id,
            fecha_registro: getNormalizedDateOrToday(csv.Fecha_EMO),
          };

          logger.debug('[UploadEMO] Datos del trabajador a insertar:', trabajadorData);

          // Crear nuevo trabajador
          const { data: nuevoTrabajador, error: errorTrabajador } = await supabase
            .from('registros_trabajadores')
            .insert([trabajadorData])
            .select()
            .single();

          if (errorTrabajador) {
            // OPTIMIZACIÓN: Mejor manejo de errores con más contexto
            const errorMessage = errorTrabajador.message || 'Error desconocido';
            const errorDetails = errorTrabajador.details || '';
            const errorHint = errorTrabajador.hint || '';
            const errorCode = errorTrabajador.code || '';

            logger.error(new Error(`Error al crear trabajador: ${errorMessage}`), {
              context: 'saveExtractedData',
              error: errorMessage,
              errorDetails,
              errorHint,
              errorCode,
              dni: csv.DNI,
              empresaId: empresaActiva.id,
              trabajadorData
            });

            // Mensaje de error más descriptivo para el usuario
            let userFriendlyMessage = `Error al crear trabajador`;
            
            if (errorCode === '23505') { // Violación de unique constraint
              userFriendlyMessage = `El trabajador con DNI ${csv.DNI} ya existe en esta empresa.`;
            } else if (errorCode === '23503') { // Violación de foreign key
              userFriendlyMessage = `Error de referencia: La empresa seleccionada no es válida.`;
            } else if (errorMessage.includes('RLS') || errorMessage.includes('row-level security')) {
              userFriendlyMessage = `Error de permisos: No tienes permiso para crear trabajadores. Contacta al administrador.`;
            } else if (errorMessage.includes('does not exist')) {
              userFriendlyMessage = `Error: La tabla de trabajadores no existe. Contacta al administrador.`;
            } else {
              userFriendlyMessage = `Error al crear trabajador: ${errorMessage}${errorDetails ? ` (${errorDetails})` : ''}`;
            }

            throw new Error(userFriendlyMessage);
          }

          if (!nuevoTrabajador) {
            throw new Error('No se pudo crear el trabajador: respuesta vacía');
          }

          // Validar datos del trabajador creado
          try {
            validateSupabaseData(TrabajadorSchema, nuevoTrabajador, 'trabajador creado');
            trabajadorId = nuevoTrabajador.id;
            logger.debug('[UploadEMO] Trabajador creado exitosamente:', trabajadorId);
          } catch (validationError: any) {
            logger.error(validationError instanceof Error ? validationError : new Error('Error de validación trabajador creado'), {
              context: 'saveExtractedData',
              dni: csv.DNI
            });
            // Continuar de todas formas pero loguear el error
            trabajadorId = nuevoTrabajador.id;
          }
        }
      }

      // 2. Guardar examen médico (si existe tabla examenes_medicos)
      if (trabajadorId) {
        try {
          logger.debug('[UploadEMO] Guardando examen médico...');
          const examenData: any = {
            trabajador_id: trabajadorId,
            empresa_id: empresaActiva.id,
            fecha_examen: getNormalizedDateOrToday(csv.Fecha_EMO),
            tipo_examen: csv.Tipo_Examen || 'Anual',
            aptitud: csv.Aptitud_Final || 'ND',
            restriccion_lentes: csv.Restr_Lentes === 'SI' || csv.Restr_Lentes === 'Si' || csv.Restr_Lentes === 'si',
            restriccion_altura: csv.Restr_Altura_1_8m === 'SI' || csv.Restr_Altura_1_8m === 'Si' || csv.Restr_Altura_1_8m === 'si',
            restriccion_electricidad: csv.Restr_Elec === 'SI' || csv.Restr_Elec === 'Si' || csv.Restr_Elec === 'si',
            datos_extractos: csv, // Guardar todos los datos CSV como JSON
            archivo_pdf: uploadedFiles[0]?.name || null,
          };

          // Agregar datos médicos si existen
          if (csv.PA_Sistolica) examenData.pa_sistolica = csv.PA_Sistolica;
          if (csv.PA_Diastolica) examenData.pa_diastolica = csv.PA_Diastolica;
          if (csv.FC) examenData.fc = csv.FC;
          if (csv.IMC) examenData.imc = csv.IMC;
          if (csv.FVC_Valor) examenData.fvc = csv.FVC_Valor;
          if (csv.FEV1_Valor) examenData.fev1 = csv.FEV1_Valor;
          if (csv.Dx_Audio) examenData.diagnostico_audio = csv.Dx_Audio;
          if (csv.Dx_Oftalmo) examenData.diagnostico_oftalmo = csv.Dx_Oftalmo;

          const { data: examenGuardado, error: errorExamen } = await supabase
            .from('examenes_medicos')
            .insert([examenData])
            .select();

          if (errorExamen) {
            if (errorExamen.message.includes('does not exist')) {
              logger.warn('[UploadEMO] Tabla examenes_medicos no existe, omitiendo...');
            } else {
              logger.warn('[UploadEMO] Error al guardar examen médico:', errorExamen.message);
              // No lanzar error, continuar con el flujo
            }
          } else {
            logger.debug('[UploadEMO] Examen médico guardado exitosamente');
          }
        } catch (examenError: any) {
          logger.warn('[UploadEMO] Error al guardar examen médico:', examenError.message);
          // Continuar aunque falle, no es crítico
        }
      }

      // 3. Si hay restricciones, crear caso de trabajo modificado (opcional)
      const tieneRestricciones = 
        csv.Restr_Lentes === 'SI' || csv.Restr_Lentes === 'Si' || csv.Restr_Lentes === 'si' ||
        csv.Restr_Altura_1_8m === 'SI' || csv.Restr_Altura_1_8m === 'Si' || csv.Restr_Altura_1_8m === 'si' ||
        csv.Restr_Elec === 'SI' || csv.Restr_Elec === 'Si' || csv.Restr_Elec === 'si';

      if (tieneRestricciones && trabajadorId) {
        try {
          logger.debug('[UploadEMO] Creando caso por restricciones detectadas...');
          const casoData: any = {
            fecha: getNormalizedDateOrToday(csv.Fecha_EMO),
            trabajadorNombre: csv.Nombre || '',
            dni: csv.DNI || '',
            empresa: empresaActiva.nombre,
            empresa_id: empresaActiva.id,
            status: 'ACTIVO',
            tipoEvento: 'OTROS',
            // Agregar restricciones en comentarios
            comentariosSupervisor: `Restricciones detectadas: ${
              (csv.Restr_Lentes === 'SI' || csv.Restr_Lentes === 'Si' || csv.Restr_Lentes === 'si') ? 'Lentes correctores; ' : ''
            }${
              (csv.Restr_Altura_1_8m === 'SI' || csv.Restr_Altura_1_8m === 'Si' || csv.Restr_Altura_1_8m === 'si') ? 'Altura > 1.8m; ' : ''
            }${
              (csv.Restr_Elec === 'SI' || csv.Restr_Elec === 'Si' || csv.Restr_Elec === 'si') ? 'Fibra óptica/Eléctrica; ' : ''
            }`.trim(),
          };

          const { data: casoCreado, error: errorCaso } = await supabase
            .from('casos')
            .insert([casoData])
            .select();

          if (errorCaso) {
            if (errorCaso.message.includes('does not exist')) {
              logger.warn('[UploadEMO] Tabla casos no existe, omitiendo...');
            } else {
              logger.warn('[UploadEMO] Error al crear caso:', errorCaso.message);
              // No lanzar error, continuar con el flujo
            }
          } else {
            logger.debug('[UploadEMO] Caso creado exitosamente');
          }
        } catch (casoError: any) {
          logger.warn('[UploadEMO] Error al crear caso:', casoError.message);
          // Continuar aunque falle
        }
      }

      setSaveStatus('success');
      showSuccess('Datos guardados exitosamente en los módulos correspondientes');
      
      // El historial ya se guardó después del análisis, no es necesario guardarlo de nuevo aquí
      
      // Limpiar después de 3 segundos
      setTimeout(() => {
        setUploadedFiles([]);
        setExtractedData(null);
        setSaveStatus('idle');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 3000);

    } catch (err: any) {
      // OPTIMIZACIÓN: Mejor logging de errores con más contexto
      const errorMessage = err.message || 'Error al guardar los datos';
      const errorDetails = err.details || err.error?.details || '';
      const errorCode = err.code || err.error?.code || '';
      
      logger.error(err instanceof Error ? err : new Error(errorMessage), {
        context: 'saveExtractedData',
        errorMessage,
        errorDetails,
        errorCode,
        dni: extractedData?.csv_parseado?.DNI,
        empresaId: empresaActiva?.id,
        empresaNombre: empresaActiva?.nombre,
        stack: err.stack
      });
      
      // Mostrar mensaje de error más descriptivo al usuario
      setError(errorMessage);
      showError(errorMessage);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveFile = (fileToRemove?: File) => {
    if (fileToRemove) {
      setUploadedFiles(prev => prev.filter(f => f !== fileToRemove));
    } else {
      setUploadedFiles([]);
    }
    setExtractedData(null);
    setError(null);
    setFileValidationErrors(new Map());
    setSaveStatus('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Obtener el archivo actualmente siendo procesado
  const currentFile = uploadedFiles[0] || null;

  return (
    <div className="space-y-6">
      {/* Zona de Upload */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-4">
          <div className="p-2 bg-indigo-50 rounded-lg shrink-0">
            <Upload className="text-indigo-600 w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Subir EMO para Análisis</h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Arrastra archivos PDF, PNG o JPG o haz clic para seleccionar. Máximo 10 archivos, 10MB cada uno.
            </p>
            {/* Contador de archivos */}
            {uploadedFiles.length > 0 && (
              <p className="text-xs text-indigo-600 mt-1 font-medium">
                {uploadedFiles.length}/10 archivos seleccionados
              </p>
            )}
          </div>
        </div>

        {!empresaActiva && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertCircle size={20} />
              <span className="font-semibold">Advertencia</span>
            </div>
            <p className="mt-2 text-yellow-700 text-sm">
              No hay empresa seleccionada. Selecciona una empresa en el header para guardar los datos.
            </p>
          </div>
        )}

        {/* Errores de validación de archivos */}
        {fileValidationErrors.size > 0 && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800 mb-2">
              <AlertCircle size={20} />
              <span className="font-semibold">Archivos rechazados</span>
            </div>
            <ul className="text-sm text-red-700 space-y-1">
              {Array.from(fileValidationErrors.entries()).map(([fileName, errors]) => (
                <li key={fileName}>
                  <span className="font-medium">{fileName}:</span> {errors.join(', ')}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Zona de Drag & Drop */}
        {uploadedFiles.length === 0 && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-6 sm:p-12 text-center cursor-pointer transition-all
              min-h-[200px] sm:min-h-[300px] flex flex-col items-center justify-center
              ${isDragging
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
              }
            `}
          >
            <Upload size={40} className={`sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 ${isDragging ? 'text-indigo-600' : 'text-gray-400'}`} />
            <p className="text-base sm:text-lg font-semibold text-gray-700 mb-2">
              Arrastra archivos aquí o haz clic para seleccionar
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mb-1">
              Formatos permitidos: PDF, PNG, JPG
            </p>
            <p className="text-xs text-gray-400">
              Tamaño máximo: 10MB por archivo • Máximo 10 archivos
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/jpg"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length > 0) {
                  const validation = validateFiles(files);
                  if (!validation.valid) {
                    const errorMessages = validation.errors.join('; ');
                    showError(`Error de validación: ${errorMessages}`);
                    setError(errorMessages);
                    
                    const errorsMap = new Map<string, string[]>();
                    validation.validatedFiles.forEach(vf => {
                      if (!vf.isValid && vf.errors.length > 0) {
                        errorsMap.set(vf.file.name, vf.errors);
                      }
                    });
                    setFileValidationErrors(errorsMap);
                    return;
                  }
                  
                  const validFiles = validation.validatedFiles
                    .filter(vf => vf.isValid)
                    .map(vf => vf.file);
                  
                  if (validFiles.length + uploadedFiles.length > 10) {
                    showWarning('Solo se pueden subir 10 archivos a la vez. Se ignorarán los archivos excedentes.');
                    validFiles.splice(10 - uploadedFiles.length);
                  }
                  
                  setUploadedFiles(prev => [...prev, ...validFiles]);
                  setError(null);
                  setFileValidationErrors(new Map());
                  
                  if (validFiles.length === 1) {
                    handleFileSelect(validFiles[0]);
                  } else if (validFiles.length > 1) {
                    showSuccess(`${validFiles.length} archivos validados correctamente. Selecciona uno para analizar.`);
                  }
                }
              }}
              className="hidden"
            />
          </div>
        )}

        {/* Lista de archivos cargados */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-4">
            {/* Lista de archivos */}
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => {
                const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
                const fileType = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
                const isValidType = ['application/pdf', 'image/png', 'image/jpeg'].includes(fileType);
                const isValidSize = file.size <= 10 * 1024 * 1024;
                const isProcessing = index === 0 && (isAnalyzing || isUploading);
                
                return (
                  <div
                    key={`${file.name}-${index}`}
                    className={`
                      flex items-center justify-between p-4 rounded-lg border transition-all
                      ${isProcessing
                        ? 'bg-blue-50 border-blue-200'
                        : isValidType && isValidSize
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-red-50 border-red-200'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {isValidType && isValidSize ? (
                        <FileCheck size={24} className="text-green-600 flex-shrink-0" />
                      ) : (
                        <AlertCircle size={24} className="text-red-600 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{file.name}</p>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span>{fileSizeMB} MB</span>
                          <span className="text-xs">•</span>
                          <span className="capitalize">
                            {fileType === 'application/pdf' ? 'PDF' : 
                             fileType === 'image/png' ? 'PNG' : 
                             fileType === 'image/jpeg' ? 'JPEG' : fileType}
                          </span>
                          {!isValidType && (
                            <span className="text-red-600 text-xs">⚠️ Tipo no permitido</span>
                          )}
                          {!isValidSize && (
                            <span className="text-red-600 text-xs">⚠️ Tamaño excedido</span>
                          )}
                        </div>
                      </div>
                      {isProcessing && (
                        <Loader2 className="animate-spin text-indigo-600 flex-shrink-0" size={20} />
                      )}
                      <button
                        onClick={() => handleRemoveFile(file)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                        disabled={isProcessing}
                        title="Eliminar archivo"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Botón para limpiar todos */}
            {uploadedFiles.length > 1 && (
              <button
                onClick={() => handleRemoveFile()}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
                disabled={isAnalyzing || isSaving}
              >
                Limpiar todos los archivos
              </button>
            )}

            {/* Estado de subida */}
            {isUploading && currentFile && (
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                  <CloudUpload className="animate-pulse text-indigo-600" size={20} />
                  <div className="flex-1">
                    <span className="text-sm text-gray-700">
                      {empresaActiva 
                        ? 'Subiendo archivo a Supabase Storage...' 
                        : 'Preparando archivo para análisis...'}
                    </span>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    {uploadProgress < 100 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Esto puede tardar unos segundos para archivos grandes...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Estado de análisis */}
            {isAnalyzing && !isUploading && currentFile && (
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                <Loader2 className="animate-spin text-indigo-600" size={20} />
                <span className="text-sm text-gray-700">
                  Analizando {currentFile.name} con IA (esto puede tardar 15-30 segundos)...
                </span>
              </div>
            )}

            {/* Datos extraídos */}
            {extractedData && !isAnalyzing && currentFile && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800 mb-2">
                    <CheckCircle2 size={20} />
                    <span className="font-semibold">Análisis completado</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Los datos han sido extraídos exitosamente. Revisa la información y guárdala.
                  </p>
                  {uploadedFilePath && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Archivo guardado en: {uploadedFilePath}
                    </p>
                  )}
                </div>

                {/* Resumen de datos extraídos */}
                {extractedData.csv_parseado && (
                  <div className="p-4 bg-white border border-gray-200 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Datos Extraídos</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      {extractedData.csv_parseado.DNI && (
                        <div>
                          <span className="text-gray-500">DNI:</span>{' '}
                          <span className="font-medium">{extractedData.csv_parseado.DNI}</span>
                        </div>
                      )}
                      {extractedData.csv_parseado.Nombre && (
                        <div>
                          <span className="text-gray-500">Nombre:</span>{' '}
                          <span className="font-medium">{extractedData.csv_parseado.Nombre}</span>
                        </div>
                      )}
                      {extractedData.csv_parseado.Aptitud_Final && (
                        <div>
                          <span className="text-gray-500">Aptitud:</span>{' '}
                          <span className={`font-medium ${
                            extractedData.csv_parseado.Aptitud_Final.includes('APTO') 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {extractedData.csv_parseado.Aptitud_Final}
                          </span>
                        </div>
                      )}
                      {extractedData.csv_parseado.Restr_Lentes === 'SI' && (
                        <div className="text-yellow-600 font-medium">⚠️ Restricción: Lentes</div>
                      )}
                      {extractedData.csv_parseado.Restr_Altura_1_8m === 'SI' && (
                        <div className="text-yellow-600 font-medium">⚠️ Restricción: Altura</div>
                      )}
                      {extractedData.csv_parseado.Restr_Elec === 'SI' && (
                        <div className="text-yellow-600 font-medium">⚠️ Restricción: Eléctrica</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Botón de guardar */}
                <button
                  onClick={saveExtractedData}
                  disabled={isSaving || !empresaActiva}
                  className={`
                    w-full py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2
                    ${isSaving || !empresaActiva
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg'
                    }
                  `}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      <span>Guardando...</span>
                    </>
                  ) : saveStatus === 'success' ? (
                    <>
                      <CheckCircle2 size={20} />
                      <span>¡Guardado exitosamente!</span>
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      <span>Guardar Datos en Módulos</span>
                    </>
                  )}
                </button>

                {saveStatus === 'success' && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✓ Datos guardados en: Trabajadores, Exámenes Médicos
                      {extractedData.csv_parseado?.Restr_Lentes === 'SI' || 
                       extractedData.csv_parseado?.Restr_Altura_1_8m === 'SI' || 
                       extractedData.csv_parseado?.Restr_Elec === 'SI'
                        ? ', Casos (con restricciones detectadas)'
                        : ''}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800 mb-2">
              <AlertCircle size={20} />
              <span className="font-semibold">Error</span>
            </div>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
