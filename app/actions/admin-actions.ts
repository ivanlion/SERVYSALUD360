'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient, createAdminClient } from '../../lib/supabase-server';
import { isSuperAdmin, isAdminUser } from '../../utils/auth-helpers';
import { logger } from '../../utils/logger';

/**
 * Verifica si el usuario actual es administrador usando el patrón de Doble Cliente
 * 
 * Paso 1: Cliente de Verificación - Lee la sesión desde cookies
 * Paso 2: Cliente de Ejecución - Consulta profiles con Service Role Key
 * 
 * @returns Objeto con isAdmin y userId
 */
async function verifyAdmin() {
  try {
    // ============================================
    // PASO 1: Cliente de Verificación (Para saber quién soy)
    // ============================================
    logger.debug('Paso 1: Creando cliente de verificación', {
      context: 'verifyAdmin'
    });
    
    const supabaseAuth = await createServerClient();
    
    // Obtener el usuario actual desde las cookies
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      logger.error(userError instanceof Error ? userError : new Error('Usuario no autenticado'), {
        context: 'verifyAdmin',
        error: userError?.message || 'No se encontró usuario'
      });
      return {
        isAdmin: false,
        userId: null,
        error: 'Usuario no autenticado. Por favor, inicia sesión nuevamente.',
      };
    }

    logger.debug('Usuario encontrado', {
      context: 'verifyAdmin',
      userId: user.id,
      email: user.email
    });

    // ============================================
    // PASO 2: Cliente de Ejecución (Para consultar profiles)
    // ============================================
    logger.debug('Paso 2: Creando cliente de ejecución', {
      context: 'verifyAdmin'
    });
    
    const supabaseAdmin = createAdminClient();

    // Verificar el rol del usuario en la tabla profiles
    const { data: currentUserProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('rol, role')
      .eq('id', user.id)
      .single();

    // Log de depuración completo
    logger.debug('Admin Check - Perfil encontrado', {
      context: 'verifyAdmin',
      profileError: profileError?.message,
      profileErrorCode: profileError?.code,
      userId: user.id,
    });

    if (profileError) {
      logger.warn('Error al obtener perfil', {
        context: 'verifyAdmin',
        error: profileError.message,
        userId: user.id
      });
      
      // Si no hay perfil, verificar en user_metadata
      const role = user.user_metadata?.rol || user.user_metadata?.role || '';
      logger.debug('Rol desde user_metadata', {
        context: 'verifyAdmin',
        role,
        userId: user.id
      });
      
      // Verificar múltiples variantes del rol de administrador (case-insensitive)
      const roleLower = role?.toLowerCase() || '';
      const isAdmin = roleLower === 'admin' || 
                     role === 'Administrador' || 
                     role === 'Admin' ||
                     roleLower === 'administrador';
      
      logger.debug('Verificación de admin', {
        context: 'verifyAdmin',
        isAdmin,
        role,
        roleLower,
        userId: user.id
      });
      
      return {
        isAdmin,
        userId: user.id,
        error: null,
      };
    }

    // Obtener el rol del perfil
    const role = currentUserProfile?.rol || currentUserProfile?.role || '';
    logger.debug('Rol desde profiles', {
      context: 'verifyAdmin',
      role,
      userId: user.id
    });
    
    // Verificar múltiples variantes del rol de administrador (case-insensitive)
    const roleLower = role?.toLowerCase() || '';
    const isAdmin = roleLower === 'admin' || 
                   role === 'Administrador' || 
                   role === 'Admin' ||
                   roleLower === 'administrador';
    
    logger.debug('Verificación de admin', {
      context: 'verifyAdmin',
      isAdmin,
      role,
      roleLower,
      userId: user.id
    });

    return {
      isAdmin,
      userId: user.id,
      error: null,
    };
  } catch (error: any) {
    logger.error(error instanceof Error ? error : new Error('Error al verificar admin'), {
      context: 'verifyAdmin',
      error: error.message,
      stack: error.stack
    });
    return {
      isAdmin: false,
      userId: null,
      error: error.message || 'Error al verificar permisos',
    };
  }
}

/**
 * Server Action para actualizar un usuario
 * Implementa el patrón de Doble Cliente:
 * - Cliente 1: Verifica quién soy (desde cookies)
 * - Cliente 2: Ejecuta los cambios (con Service Role Key)
 * 
 * @param formData - FormData con userId, nombre, rol
 * @returns Objeto con success y message
 */
export async function updateUser(formData: FormData) {
  try {
    // ============================================
    // PASO 1: Cliente de Verificación (Para saber quién soy)
    // ============================================
    logger.debug('Paso 1: Verificando permisos', {
      context: 'updateUser'
    });
    
    const supabaseAuth = await createServerClient();
    
    // Obtener el usuario actual desde las cookies
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      // Verificar si es el error específico "Auth session missing"
      if (userError?.message?.includes('Auth session missing') || userError?.message?.includes('session missing')) {
        logger.error(userError instanceof Error ? userError : new Error('Auth session missing'), {
          context: 'updateUser',
          error: 'Las cookies no están disponibles. Asegúrate de que el middleware esté ejecutándose correctamente'
        });
      } else {
        logger.error(userError instanceof Error ? userError : new Error('Usuario no autenticado'), {
          context: 'updateUser',
          error: userError?.message
        });
      }
      return {
        success: false,
        message: 'Usuario no autenticado. Por favor, inicia sesión nuevamente.',
      };
    }

    logger.debug('Usuario identificado', {
      context: 'updateUser',
      userId: user.id,
      email: user.email
    });

    // Verificar que el usuario actual sea administrador (incluye Super Admin)
    const supabaseAdmin = createAdminClient();
    
    const { data: currentUserProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('rol, role')
      .eq('id', user.id)
      .single();

    // Verificar rol desde profiles o user_metadata
    const role = currentUserProfile?.rol || currentUserProfile?.role || 
                 user.user_metadata?.rol || user.user_metadata?.role || '';
    
    // Usar helpers que reconocen Super Admin
    const userIsAdmin = isAdminUser(user.email, role);
    const userIsSuperAdmin = isSuperAdmin(user.email);

    logger.debug('Verificación de admin', {
      context: 'updateUser',
      email: user.email,
      role,
      userIsSuperAdmin,
      userIsAdmin
    });

    if (!userIsAdmin) {
      return {
        success: false,
        message: 'No tienes permisos para realizar esta acción. Solo los administradores pueden editar usuarios.',
      };
    }

    // ============================================
    // PASO 2: Cliente de Ejecución (Para hacer el trabajo sucio)
    // ============================================
    logger.debug('Paso 2: Ejecutando actualización', {
      context: 'updateUser'
    });

    // Extraer datos del formulario
    const userId = formData.get('userId') as string;
    const nombre = formData.get('nombre') as string;
    const rol = formData.get('rol') as string;

    // Validar campos requeridos
    if (!userId || !nombre || !rol) {
      return {
        success: false,
        message: 'Todos los campos son requeridos',
      };
    }

    // Actualizar el perfil en la tabla profiles (solo full_name, el rol se guarda en user_metadata)
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: nombre,
      })
      .eq('id', userId);

    if (updateError) {
      logger.error(updateError instanceof Error ? updateError : new Error('Error al actualizar usuario'), {
        context: 'updateUser',
        error: updateError.message,
        userId
      });
      return {
        success: false,
        message: updateError.message || 'Error al actualizar el usuario',
      };
    }

    // Actualizar también user_metadata en Auth
    const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        user_metadata: {
          full_name: nombre,
          rol: rol,
          role: rol,
        },
      }
    );

    if (metadataError) {
      logger.warn('No se pudo actualizar user_metadata', {
        context: 'updateUser',
        error: metadataError.message,
        userId
      });
      // No fallar si solo falla metadata, el perfil ya se actualizó
    }

    // Revalidar la ruta para refrescar la tabla
    revalidatePath('/dashboard/admin');

    logger.debug('Usuario actualizado exitosamente', {
      context: 'updateUser',
      nombre,
      userId
    });

    return {
      success: true,
      message: `Usuario ${nombre} actualizado exitosamente`,
    };
  } catch (error: any) {
    logger.error(error instanceof Error ? error : new Error('Error inesperado al actualizar usuario'), {
      context: 'updateUser',
      error: error.message
    });
    return {
      success: false,
      message: error.message || 'Error inesperado al actualizar el usuario',
    };
  }
}

/**
 * Server Action para eliminar un usuario
 * Implementa el patrón de Doble Cliente:
 * - Cliente 1: Verifica quién soy (desde cookies)
 * - Cliente 2: Ejecuta los cambios (con Service Role Key)
 * 
 * @param userId - ID del usuario a eliminar
 * @returns Objeto con success y message
 */
export async function deleteUser(userId: string) {
  try {
    // ============================================
    // PASO 1: Cliente de Verificación (Para saber quién soy)
    // ============================================
    logger.debug('Paso 1: Verificando permisos', {
      context: 'deleteUser'
    });
    
    const supabaseAuth = await createServerClient();
    
    // Obtener el usuario actual desde las cookies
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      // Verificar si es el error específico "Auth session missing"
      if (userError?.message?.includes('Auth session missing') || userError?.message?.includes('session missing')) {
        logger.error(userError instanceof Error ? userError : new Error('Auth session missing'), {
          context: 'deleteUser',
          error: 'Las cookies no están disponibles. Asegúrate de que el middleware esté ejecutándose correctamente'
        });
      } else {
        logger.error(userError instanceof Error ? userError : new Error('Usuario no autenticado'), {
          context: 'deleteUser',
          error: userError?.message
        });
      }
      return {
        success: false,
        message: 'Usuario no autenticado. Por favor, inicia sesión nuevamente.',
      };
    }

    logger.debug('Usuario identificado', {
      context: 'deleteUser',
      userId: user.id,
      email: user.email
    });

    // Prevenir auto-eliminación
    if (user.id === userId) {
      return {
        success: false,
        message: 'No puedes eliminar tu propia cuenta. Contacta a otro administrador.',
      };
    }

    // Verificar que el usuario actual sea administrador (incluye Super Admin)
    const supabaseAdmin = createAdminClient();
    
    const { data: currentUserProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('rol, role')
      .eq('id', user.id)
      .single();

    // Verificar rol desde profiles o user_metadata
    const role = currentUserProfile?.rol || currentUserProfile?.role || 
                 user.user_metadata?.rol || user.user_metadata?.role || '';
    
    // Usar helpers que reconocen Super Admin
    const userIsAdmin = isAdminUser(user.email, role);
    const userIsSuperAdmin = isSuperAdmin(user.email);

    logger.debug('Verificación de admin', {
      context: 'deleteUser',
      email: user.email,
      role,
      userIsSuperAdmin,
      userIsAdmin
    });

    if (!userIsAdmin) {
      return {
        success: false,
        message: 'No tienes permisos para realizar esta acción. Solo los administradores pueden eliminar usuarios.',
      };
    }

    if (!userId) {
      return {
        success: false,
        message: 'ID de usuario requerido',
      };
    }

    // ============================================
    // PASO 2: Cliente de Ejecución (Para hacer el trabajo sucio)
    // ============================================
    logger.debug('Paso 2: Ejecutando eliminación', {
      context: 'deleteUser',
      targetUserId: userId
    });

    // Obtener información del usuario antes de eliminar (para el mensaje)
    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single();

    const userName = userProfile?.full_name || userProfile?.email || 'Usuario';

    // Eliminar de Auth (esto también eliminará el perfil si hay un trigger CASCADE)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      logger.error(deleteAuthError instanceof Error ? deleteAuthError : new Error('Error al eliminar usuario de Auth'), {
        context: 'deleteUser',
        error: deleteAuthError.message,
        userId
      });
      return {
        success: false,
        message: deleteAuthError.message || 'Error al eliminar el usuario del sistema de autenticación',
      };
    }

    // Eliminar también de la tabla profiles (por si acaso el trigger no lo hace)
    const { error: deleteProfileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (deleteProfileError) {
      logger.warn('No se pudo eliminar de profiles', {
        context: 'deleteUser',
        error: deleteProfileError.message,
        userId
      });
      // No fallar si solo falla profiles, Auth ya se eliminó
    }

    // Revalidar la ruta para refrescar la tabla
    revalidatePath('/dashboard/admin');

    logger.debug('Usuario eliminado exitosamente', {
      context: 'deleteUser',
      userName,
      userId
    });

    return {
      success: true,
      message: `Usuario ${userName} eliminado exitosamente`,
    };
  } catch (error: any) {
    logger.error(error instanceof Error ? error : new Error('Error inesperado al eliminar usuario'), {
      context: 'deleteUser',
      error: error.message
    });
    return {
      success: false,
      message: error.message || 'Error inesperado al eliminar el usuario',
    };
  }
}

