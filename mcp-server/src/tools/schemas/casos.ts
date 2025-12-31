/**
 * Schemas de validación Zod para herramientas de casos
 * 
 * @module mcp-server/src/tools/schemas/casos
 */

import { z } from 'zod';

/**
 * Schema para casos_listar
 */
export const casosListarSchema = z.object({
  limit: z.number().int().min(1).max(1000).optional().default(100),
  status: z.enum(['ACTIVO', 'CERRADO']).optional(),
  empresa_id: z.string().uuid('empresa_id debe ser un UUID válido').optional(),
});

/**
 * Schema para casos_obtener
 */
export const casosObtenerSchema = z.object({
  id: z.string().min(1, 'ID es requerido'),
});

/**
 * Schema para casos_buscar
 */
export const casosBuscarSchema = z.object({
  query: z.string().min(1, 'Query no puede estar vacío').max(255, 'Query demasiado largo'),
});

