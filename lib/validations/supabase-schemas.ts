/**
 * Schemas de validación Zod para respuestas de Supabase
 * 
 * Proporciona validación en runtime para asegurar que las respuestas de Supabase
 * tengan la estructura esperada
 * 
 * @module lib/validations/supabase-schemas
 */

import { z } from 'zod';
import { logger } from '@/utils/logger';

/**
 * Schema para validar empresa desde Supabase
 */
export const EmpresaSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(1),
  ruc: z.string().nullable().optional(),
  direccion: z.string().nullable().optional(),
  telefono: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  nombre_comercial: z.string().nullable().optional(),
  actividades_economicas: z.string().nullable().optional(),
  activa: z.boolean(),
  // Hacer created_at y updated_at más flexibles (pueden ser string, Date, o null)
  created_at: z.union([
    z.string().datetime(),
    z.string(), // Aceptar cualquier string (Supabase puede devolver formatos diferentes)
    z.date(),
    z.null(),
  ]).optional(),
  updated_at: z.union([
    z.string().datetime(),
    z.string(), // Aceptar cualquier string
    z.date(),
    z.null(),
  ]).optional(),
});

/**
 * Schema para validar trabajador desde Supabase
 */
export const TrabajadorSchema = z.object({
  id: z.union([z.string(), z.number()]),
  fecha_registro: z.string().optional(),
  apellidos_nombre: z.string().optional(),
  dni_ce_pas: z.string().optional(),
  telefono_trabajador: z.string().nullable().optional(),
  sexo: z.string().nullable().optional(),
  jornada_laboral: z.string().nullable().optional(),
  puesto_trabajo: z.string().nullable().optional(),
  empresa: z.string().nullable().optional(),
  gerencia: z.string().nullable().optional(),
  supervisor_responsable: z.string().nullable().optional(),
  telf_contacto_supervisor: z.string().nullable().optional(),
  empresa_id: z.string().uuid().nullable().optional(),
});

/**
 * Schema para validar caso desde Supabase
 */
export const CasoSchema = z.object({
  id: z.union([z.string(), z.number()]),
  status: z.enum(['ACTIVO', 'CERRADO']).optional(),
  created_at: z.string().datetime().optional(),
  empresa_id: z.string().uuid().nullable().optional(),
});

/**
 * Schema para validar examen médico desde Supabase
 */
export const ExamenMedicoSchema = z.object({
  id: z.union([z.string(), z.number()]),
  trabajador_id: z.union([z.string(), z.number()]).optional(),
  empresa_id: z.string().uuid().nullable().optional(),
  fecha_examen: z.string().optional(),
  tipo_examen: z.string().nullable().optional(),
  aptitud: z.string().nullable().optional(),
  restriccion_lentes: z.boolean().nullable().optional(),
  restriccion_altura: z.boolean().nullable().optional(),
  restriccion_electricidad: z.boolean().nullable().optional(),
  datos_extractos: z.any().optional(),
  archivo_pdf: z.string().nullable().optional(),
});

/**
 * Schema para validar user_empresas desde Supabase
 */
export const UserEmpresaSchema = z.object({
  user_id: z.string().uuid(),
  empresa_id: z.string().uuid(),
  rol: z.string().nullable().optional(),
  created_at: z.string().datetime().optional(),
});

/**
 * Schema para validar perfil de usuario desde Supabase
 */
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().optional(),
  full_name: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  permissions: z.any().optional(),
  created_at: z.string().datetime().optional(),
});

/**
 * Helper para validar datos de Supabase con manejo de errores
 */
export function validateSupabaseData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Acceder a errors usando la propiedad directamente
      const errorMessages = (error as any).errors.map((e: any) => {
        const path = Array.isArray(e.path) ? e.path.join('.') : 'unknown';
        const message = e.message || 'Error desconocido';
        return `${path}: ${message}`;
      });
      
      const errorMessage = context
        ? `Error de validación en ${context}: ${errorMessages.join(', ')}`
        : `Error de validación: ${errorMessages.join(', ')}`;
      
      logger.error(new Error(errorMessage), {
        schema: context || 'unknown',
        errors: errorMessages,
        data
      });
      
      throw new Error(errorMessage);
    }
    throw error;
  }
}

/**
 * Helper para validar arrays de datos de Supabase
 */
export function validateSupabaseArray<T>(
  schema: z.ZodSchema<T>,
  data: unknown[] | null | undefined,
  context?: string
): T[] {
  // Validar que data sea un array válido
  if (!data || !Array.isArray(data)) {
    if (context) {
      throw new Error(`Error de validación en ${context}: se esperaba un array pero se recibió ${data === null ? 'null' : data === undefined ? 'undefined' : typeof data}`);
    }
    throw new Error(`Error de validación: se esperaba un array pero se recibió ${data === null ? 'null' : data === undefined ? 'undefined' : typeof data}`);
  }
  
  return data.map((item, index) =>
    validateSupabaseData(schema, item, context ? `${context}[${index}]` : `item[${index}]`)
  );
}

