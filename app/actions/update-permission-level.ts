'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

export type PermissionLevel = 'none' | 'read' | 'write';

/**
 * Server Action para actualizar el nivel de permiso de un usuario
 * 
 * Actualiza el nivel de acceso (none, read, write) para un módulo específico
 * en el JSONB permissions sin borrar las otras llaves
 * 
 * @param userId - ID del usuario (UUID)
 * @param module - Nombre del módulo (trabajo_modificado, vigilancia_medica, seguimiento_trabajadores, seguridad_higiene)
 * @param level - Nivel de permiso ('none' | 'read' | 'write')
 * @returns Objeto con success y message
 */
export async function updatePermissionLevel(
  userId: string,
  module: string,
  level: PermissionLevel
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

    // Validar nivel de permiso
    if (!['none', 'read', 'write'].includes(level)) {
      return {
        success: false,
        message: 'Nivel de permiso inválido. Debe ser: none, read o write',
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
      console.error('Error al obtener perfil:', fetchError);
      return {
        success: false,
        message: 'Error al obtener el perfil del usuario',
      };
    }

    // Construir el objeto de permisos actualizado
    const currentPermissions = currentProfile?.permissions || {};
    const updatedPermissions = {
      ...currentPermissions,
      [dbModuleKey]: level, // Guardar como string: 'none', 'read' o 'write'
    };

    // Actualizar solo la llave específica del JSONB
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        permissions: updatedPermissions,
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error al actualizar permisos:', updateError);
      return {
        success: false,
        message: updateError.message || 'Error al actualizar los permisos',
      };
    }

    // Revalidar la ruta para refrescar la tabla
    revalidatePath('/dashboard/admin');

    // Mensaje descriptivo según el nivel
    const levelMessages: Record<PermissionLevel, string> = {
      'none': 'Sin acceso',
      'read': 'Solo lectura',
      'write': 'Escritura total',
    };

    return {
      success: true,
      message: `Permiso actualizado a "${levelMessages[level]}" exitosamente`,
    };
  } catch (error: any) {
    console.error('Error inesperado al actualizar permisos:', error);
    return {
      success: false,
      message: error.message || 'Error inesperado al actualizar los permisos',
    };
  }
}



