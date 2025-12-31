'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { logger } from '../../utils/logger';

/**
 * Server Action para actualizar permisos de un usuario
 * 
 * Actualiza solo la llave específica del JSONB permissions sin borrar las otras
 * 
 * @param userId - ID del usuario (UUID)
 * @param module - Nombre del módulo (trabajo_modificado, vigilancia_medica, seguimiento_trabajadores, seguridad_higiene)
 * @param isGranted - Si el permiso está otorgado o no
 * @returns Objeto con success y message
 */
export async function togglePermission(
  userId: string,
  module: string,
  isGranted: boolean
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Validar variables de entorno
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return {
        success: false,
        message: 'Error de configuración: Variables de entorno no configuradas',
      };
    }

    // Validar parámetros
    if (!userId || !module) {
      return {
        success: false,
        message: 'Parámetros inválidos',
      };
    }

    // Crear cliente de Supabase con Service Role Key (admin)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Mapeo de nombres de módulos del frontend a las llaves JSONB
    const moduleMapping: Record<string, string> = {
      'trabajoModificado': 'trabajo_modificado',
      'vigilanciaMedica': 'vigilancia_medica',
      'seguimientoTrabajadores': 'seguimiento_trabajadores',
      'seguridadHigiene': 'seguridad_higiene',
    };

    const dbModuleKey = moduleMapping[module] || module;

    // Obtener el perfil actual para preservar otros permisos
    const { data: currentProfile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('permissions')
      .eq('id', userId)
      .single();

    if (fetchError) {
      logger.error(fetchError instanceof Error ? fetchError : new Error('Error al obtener perfil'), {
        context: 'togglePermission',
        error: fetchError.message,
        userId
      });
      return {
        success: false,
        message: 'Error al obtener el perfil del usuario',
      };
    }

    // Construir el objeto de permisos actualizado
    const currentPermissions = currentProfile?.permissions || {};
    const updatedPermissions = {
      ...currentPermissions,
      [dbModuleKey]: isGranted,
    };

    // Actualizar solo la llave específica del JSONB usando sintaxis SQL
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        permissions: updatedPermissions,
      })
      .eq('id', userId);

    if (updateError) {
      logger.error(updateError instanceof Error ? updateError : new Error('Error al actualizar permisos'), {
        context: 'togglePermission',
        error: updateError.message,
        userId,
        module
      });
      return {
        success: false,
        message: updateError.message || 'Error al actualizar los permisos',
      };
    }

    // Revalidar la ruta para refrescar la tabla
    revalidatePath('/dashboard/admin');

    return {
      success: true,
      message: `Permiso ${isGranted ? 'otorgado' : 'revocado'} exitosamente`,
    };
  } catch (error: any) {
    logger.error(error instanceof Error ? error : new Error('Error inesperado al actualizar permisos'), {
      context: 'togglePermission',
      error: error.message
    });
    return {
      success: false,
      message: error.message || 'Error inesperado al actualizar los permisos',
    };
  }
}



