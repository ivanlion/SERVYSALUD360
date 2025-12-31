/**
 * Schemas de validación Zod para herramientas de analytics
 * 
 * @module mcp-server/src/tools/schemas/analytics
 */

import { z } from 'zod';

/**
 * Schema para analytics_predecir_salud_visual
 */
export const analyticsPredecirSaludVisualSchema = z.object({
  trabajador_id: z.string().uuid('trabajador_id debe ser un UUID válido').optional(),
  dni: z.string().min(1, 'DNI es requerido si no se proporciona trabajador_id').max(20).optional(),
}).refine(
  (data) => data.trabajador_id || data.dni,
  { message: 'Se requiere trabajador_id o dni' }
);

/**
 * Schema para analytics_tendencias_empresa
 */
export const analyticsTendenciasEmpresaSchema = z.object({
  empresa: z.string().min(1, 'Empresa es requerida').max(255),
  meses_atras: z.number().int().min(1).max(60).optional().default(12),
});

/**
 * Schema para analytics_riesgos_emergentes
 */
export const analyticsRiesgosEmergentesSchema = z.object({
  meses_atras: z.number().int().min(1).max(60).optional().default(6),
});

/**
 * Schema para analytics_recomendaciones_empresa
 */
export const analyticsRecomendacionesEmpresaSchema = z.object({
  empresa: z.string().min(1, 'Empresa es requerida').max(255),
  meses_atras: z.number().int().min(1).max(60).optional().default(12),
});

/**
 * Schema para analytics_recomendaciones_trabajador
 */
export const analyticsRecomendacionesTrabajadorSchema = z.object({
  trabajador_id: z.string().uuid('trabajador_id debe ser un UUID válido').optional(),
  dni: z.string().min(1, 'DNI es requerido si no se proporciona trabajador_id').max(20).optional(),
}).refine(
  (data) => data.trabajador_id || data.dni,
  { message: 'Se requiere trabajador_id o dni' }
);

