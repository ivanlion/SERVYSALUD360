/**
 * Schemas de validación Zod para herramientas de empresas
 * 
 * @module mcp-server/src/tools/schemas/empresas
 */

import { z } from 'zod';

/**
 * Schema para empresas_listar
 */
export const empresasListarSchema = z.object({
  user_id: z.string().uuid('user_id debe ser un UUID válido').optional(),
});

/**
 * Schema para empresas_obtener
 */
export const empresasObtenerSchema = z.object({
  empresa_id: z.string().uuid('empresa_id debe ser un UUID válido'),
});

/**
 * Schema para empresas_buscar
 */
export const empresasBuscarSchema = z.object({
  query: z.string().min(1, 'Query no puede estar vacío').max(255, 'Query demasiado largo'),
  user_id: z.string().uuid('user_id debe ser un UUID válido').optional(),
});

/**
 * Schema para empresas_crear
 */
export const empresasCrearSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido').max(255, 'Nombre demasiado largo'),
  ruc: z.string().max(20, 'RUC demasiado largo').optional(),
  direccion: z.string().max(500, 'Dirección demasiado larga').optional(),
  telefono: z.string().max(20, 'Teléfono demasiado largo').optional(),
  email: z.string().email('Email inválido').max(255, 'Email demasiado largo').optional(),
  user_id: z.string().uuid('user_id debe ser un UUID válido').optional(),
});

