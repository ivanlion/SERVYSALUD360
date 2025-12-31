/**
 * Schemas de validación Zod para herramientas de storage
 * 
 * @module mcp-server/src/tools/schemas/storage
 */

import { z } from 'zod';

/**
 * Schema para storage_listar
 */
export const storageListarSchema = z.object({
  bucket: z.string().min(1, 'Bucket es requerido').max(100, 'Nombre de bucket demasiado largo'),
  path: z.string().max(500, 'Path demasiado largo').optional().default(''),
});

/**
 * Schema para storage_descargar
 */
export const storageDescargarSchema = z.object({
  bucket: z.string().min(1, 'Bucket es requerido').max(100, 'Nombre de bucket demasiado largo'),
  path: z.string().min(1, 'Path es requerido').max(500, 'Path demasiado largo'),
});

