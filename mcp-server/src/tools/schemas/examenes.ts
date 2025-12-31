/**
 * Schemas de validación Zod para herramientas de exámenes
 * 
 * @module mcp-server/src/tools/schemas/examenes
 */

import { z } from 'zod';

/**
 * Schema para examenes_listar
 */
export const examenesListarSchema = z.object({
  limit: z.number().int().min(1).max(1000).optional().default(100),
  offset: z.number().int().min(0).optional().default(0),
  trabajador_id: z.string().uuid('trabajador_id debe ser un UUID válido').optional(),
  empresa_id: z.string().uuid('empresa_id debe ser un UUID válido').optional(),
});

/**
 * Schema para examenes_analizar
 */
export const examenesAnalizarSchema = z.object({
  pdf_base64: z.string().min(1, 'pdf_base64 es requerido'),
  use_thinking: z.boolean().optional().default(false),
});

