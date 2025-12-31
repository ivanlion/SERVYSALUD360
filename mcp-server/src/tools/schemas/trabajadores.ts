/**
 * Schemas de validación Zod para herramientas de trabajadores
 * 
 * @module mcp-server/src/tools/schemas/trabajadores
 */

import { z } from 'zod';

/**
 * Schema para trabajadores_listar
 */
export const trabajadoresListarSchema = z.object({
  limit: z.number().int().min(1).max(1000).optional().default(100),
  offset: z.number().int().min(0).optional().default(0),
  empresa_id: z.string().uuid('empresa_id debe ser un UUID válido').optional(),
});

/**
 * Schema para trabajadores_obtener
 */
export const trabajadoresObtenerSchema = z.object({
  dni: z.string().min(1, 'DNI es requerido').max(20, 'DNI demasiado largo'),
});

