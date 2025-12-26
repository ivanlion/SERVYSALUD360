'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient, createAdminClient } from '../../lib/supabase-server';

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
    console.log('🔍 [verifyAdmin] Paso 1: Creando cliente de verificación...');
    
    const supabaseAuth = await createServerClient();
    
    // Obtener el usuario actual desde las cookies
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      console.error('❌ [verifyAdmin] Usuario no autenticado:', userError?.message || 'No se encontró usuario');
      console.error('❌ [verifyAdmin] Error completo:', userError);
      return {
        isAdmin: false,
        userId: null,
        error: 'Usuario no autenticado. Por favor, inicia sesión nuevamente.',
      };
    }

    console.log('✅ [verifyAdmin] Usuario encontrado:', { 
      id: user.id, 
      email: user.email,
      user_metadata: user.user_metadata 
    });

    // ============================================
    // PASO 2: Cliente de Ejecución (Para consultar profiles)
    // ============================================
    console.log('🔍 [verifyAdmin] Paso 2: Creando cliente de ejecución...');
    
    const supabaseAdmin = createAdminClient();

    // Verificar el rol del usuario en la tabla profiles
    const { data: currentUserProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('rol, role')
      .eq('id', user.id)
      .single();

    // Log de depuración completo
    console.log('🔍 [verifyAdmin] Admin Check - Perfil encontrado:', {
      profile: currentUserProfile,
      profileError: profileError?.message,
      profileErrorCode: profileError?.code,
      userId: user.id,
    });

    if (profileError) {
      console.warn('⚠️ [verifyAdmin] Error al obtener perfil:', profileError.message);
      
      // Si no hay perfil, verificar en user_metadata
      const role = user.user_metadata?.rol || user.user_metadata?.role || '';
      console.log('🔍 [verifyAdmin] Rol desde user_metadata:', role);
      
      // Verificar múltiples variantes del rol de administrador (case-insensitive)
      const roleLower = role?.toLowerCase() || '';
      const isAdmin = roleLower === 'admin' || 
                     role === 'Administrador' || 
                     role === 'Admin' ||
                     roleLower === 'administrador';
      
      console.log('🔍 [verifyAdmin] Es admin?', isAdmin, '(rol:', role, ', roleLower:', roleLower, ')');
      
      return {
        isAdmin,
        userId: user.id,
        error: null,
      };
    }

    // Obtener el rol del perfil
    const role = currentUserProfile?.rol || currentUserProfile?.role || '';
    console.log('🔍 [verifyAdmin] Rol desde profiles:', role);
    console.log('🔍 [verifyAdmin] Perfil completo:', currentUserProfile);
    
    // Verificar múltiples variantes del rol de administrador (case-insensitive)
    const roleLower = role?.toLowerCase() || '';
    const isAdmin = roleLower === 'admin' || 
                   role === 'Administrador' || 
                   role === 'Admin' ||
                   roleLower === 'administrador';
    
    console.log('🔍 [verifyAdmin] Es admin?', isAdmin, '(rol:', role, ', rolLower:', roleLower, ')');

    return {
      isAdmin,
      userId: user.id,
      error: null,
    };
  } catch (error: any) {
    console.error('❌ [verifyAdmin] Error al verificar admin:', error);
    console.error('❌ [verifyAdmin] Stack trace:', error.stack);
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
    console.log('🔍 [updateUser] Paso 1: Verificando permisos...');
    
    const supabaseAuth = await createServerClient();
    
    // Obtener el usuario actual desde las cookies
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      console.error('❌ [updateUser] Usuario no autenticado:', userError?.message);
      return {
        success: false,
        message: 'Usuario no autenticado. Por favor, inicia sesión nuevamente.',
      };
    }

    console.log('✅ [updateUser] Usuario identificado:', { id: user.id, email: user.email });

    // Verificar que el usuario actual sea administrador
    const supabaseAdmin = createAdminClient();
    
    const { data: currentUserProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('rol, role')
      .eq('id', user.id)
      .single();

    // Verificar rol desde profiles o user_metadata
    const role = currentUserProfile?.rol || currentUserProfile?.role || 
                 user.user_metadata?.rol || user.user_metadata?.role || '';
    const roleLower = role?.toLowerCase() || '';
    const isAdmin = roleLower === 'admin' || 
                   role === 'Administrador' || 
                   role === 'Admin' ||
                   roleLower === 'administrador';

    console.log('🔍 [updateUser] Verificación de admin:', { role, roleLower, isAdmin });

    if (!isAdmin) {
      return {
        success: false,
        message: 'No tienes permisos para realizar esta acción. Solo los administradores pueden editar usuarios.',
      };
    }

    // ============================================
    // PASO 2: Cliente de Ejecución (Para hacer el trabajo sucio)
    // ============================================
    console.log('🔍 [updateUser] Paso 2: Ejecutando actualización...');

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

    // Actualizar el perfil en la tabla profiles
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: nombre,
        nombre: nombre, // Compatibilidad
        rol: rol,
        role: rol, // Compatibilidad
      })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ [updateUser] Error al actualizar usuario:', updateError);
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
          nombre: nombre,
          rol: rol,
          role: rol,
        },
      }
    );

    if (metadataError) {
      console.warn('⚠️ [updateUser] No se pudo actualizar user_metadata:', metadataError.message);
      // No fallar si solo falla metadata, el perfil ya se actualizó
    }

    // Revalidar la ruta para refrescar la tabla
    revalidatePath('/dashboard/admin');

    console.log('✅ [updateUser] Usuario actualizado exitosamente:', nombre);

    return {
      success: true,
      message: `Usuario ${nombre} actualizado exitosamente`,
    };
  } catch (error: any) {
    console.error('❌ [updateUser] Error inesperado:', error);
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
    console.log('🔍 [deleteUser] Paso 1: Verificando permisos...');
    
    const supabaseAuth = await createServerClient();
    
    // Obtener el usuario actual desde las cookies
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      console.error('❌ [deleteUser] Usuario no autenticado:', userError?.message);
      return {
        success: false,
        message: 'Usuario no autenticado. Por favor, inicia sesión nuevamente.',
      };
    }

    console.log('✅ [deleteUser] Usuario identificado:', { id: user.id, email: user.email });

    // Prevenir auto-eliminación
    if (user.id === userId) {
      return {
        success: false,
        message: 'No puedes eliminar tu propia cuenta. Contacta a otro administrador.',
      };
    }

    // Verificar que el usuario actual sea administrador
    const supabaseAdmin = createAdminClient();
    
    const { data: currentUserProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('rol, role')
      .eq('id', user.id)
      .single();

    // Verificar rol desde profiles o user_metadata
    const role = currentUserProfile?.rol || currentUserProfile?.role || 
                 user.user_metadata?.rol || user.user_metadata?.role || '';
    const roleLower = role?.toLowerCase() || '';
    const isAdmin = roleLower === 'admin' || 
                   role === 'Administrador' || 
                   role === 'Admin' ||
                   roleLower === 'administrador';

    console.log('🔍 [deleteUser] Verificación de admin:', { role, roleLower, isAdmin });

    if (!isAdmin) {
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
    console.log('🔍 [deleteUser] Paso 2: Ejecutando eliminación...');

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
      console.error('❌ [deleteUser] Error al eliminar usuario de Auth:', deleteAuthError);
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
      console.warn('⚠️ [deleteUser] No se pudo eliminar de profiles:', deleteProfileError.message);
      // No fallar si solo falla profiles, Auth ya se eliminó
    }

    // Revalidar la ruta para refrescar la tabla
    revalidatePath('/dashboard/admin');

    console.log('✅ [deleteUser] Usuario eliminado exitosamente:', userName);

    return {
      success: true,
      message: `Usuario ${userName} eliminado exitosamente`,
    };
  } catch (error: any) {
    console.error('❌ [deleteUser] Error inesperado:', error);
    return {
      success: false,
      message: error.message || 'Error inesperado al eliminar el usuario',
    };
  }
}

