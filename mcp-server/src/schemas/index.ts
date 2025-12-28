/**
 * Esquemas Zod para validación de datos
 * 
 * @module mcp-server/src/schemas
 */

import { z } from 'zod';

/**
 * Esquema para validar IDs de casos
 */
export const casoIdSchema = z.string().uuid();

/**
 * Esquema para validar DNI
 */
export const dniSchema = z.string().min(8).max(12);

/**
 * Esquema para validar filtros de búsqueda
 */
export const searchQuerySchema = z.string().min(1);

/**
 * Esquema para validar límites de paginación
 */
export const limitSchema = z.number().int().positive().max(1000).default(100);

/**
 * Esquema para validar estados de casos
 */
export const casoStatusSchema = z.enum(['ACTIVO', 'CERRADO']);

/**
 * Esquema para validar nombres de buckets de storage
 */
export const bucketNameSchema = z.string().min(1);

/**
 * Esquema para validar rutas de archivos
 */
export const filePathSchema = z.string().min(1);

