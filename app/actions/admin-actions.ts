'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

/**
 * Verifica si el usuario actual es administrador
 * 
 * @returns Objeto con isAdmin y userId
 */
async function verifyAdmin() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        isAdmin: false,
        userId: null,
        error: 'Variables de entorno no configuradas',
      };
    }

    // Crear cliente de Supabase para verificar el usuario actual
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Obtener el usuario actual desde las cookies
    const cookieStore = await cookies();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        isAdmin: false,
        userId: null,
        error: 'Usuario no autenticado',
      };
    }

    // Verificar el rol del usuario en la tabla profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('rol, role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      // Si no hay perfil, verificar en user_metadata
      const role = user.user_metadata?.rol || user.user_metadata?.role || '';
      const isAdmin = role === 'Administrador' || role === 'Admin';
      return {
        isAdmin,
        userId: user.id,
        error: null,
      };
    }

    const role = profile.rol || profile.role || '';
    const isAdmin = role === 'Administrador' || role === 'Admin';

    return {
      isAdmin,
      userId: user.id,
      error: null,
    };
  } catch (error: any) {
    console.error('Error al verificar admin:', error);
    return {
      isAdmin: false,
      userId: null,
      error: error.message || 'Error al verificar permisos',
    };
  }
}

/**
 * Server Action para actualizar un usuario
 * 
 * @param formData - FormData con userId, nombre, rol
 * @returns Objeto con success y message
 */
export async function updateUser(formData: FormData) {
  try {
    // Verificar que el usuario actual sea administrador
    const adminCheck = await verifyAdmin();
    if (!adminCheck.isAdmin) {
      return {
        success: false,
        message: 'No tienes permisos para realizar esta acción. Solo los administradores pueden editar usuarios.',
      };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return {
        success: false,
        message: 'Error de configuración: Variables de entorno no configuradas',
      };
    }

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

    // Crear cliente de Supabase con Service Role Key (admin)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

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
      console.error('Error al actualizar usuario:', updateError);
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
      console.warn('⚠️ No se pudo actualizar user_metadata:', metadataError.message);
      // No fallar si solo falla metadata, el perfil ya se actualizó
    }

    // Revalidar la ruta para refrescar la tabla
    revalidatePath('/dashboard/admin');

    return {
      success: true,
      message: `Usuario ${nombre} actualizado exitosamente`,
    };
  } catch (error: any) {
    console.error('Error inesperado al actualizar usuario:', error);
    return {
      success: false,
      message: error.message || 'Error inesperado al actualizar el usuario',
    };
  }
}

/**
 * Server Action para eliminar un usuario
 * 
 * @param userId - ID del usuario a eliminar
 * @returns Objeto con success y message
 */
export async function deleteUser(userId: string) {
  try {
    // Verificar que el usuario actual sea administrador
    const adminCheck = await verifyAdmin();
    if (!adminCheck.isAdmin) {
      return {
        success: false,
        message: 'No tienes permisos para realizar esta acción. Solo los administradores pueden eliminar usuarios.',
      };
    }

    // Prevenir auto-eliminación
    if (adminCheck.userId === userId) {
      return {
        success: false,
        message: 'No puedes eliminar tu propia cuenta. Contacta a otro administrador.',
      };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return {
        success: false,
        message: 'Error de configuración: Variables de entorno no configuradas',
      };
    }

    if (!userId) {
      return {
        success: false,
        message: 'ID de usuario requerido',
      };
    }

    // Crear cliente de Supabase con Service Role Key (admin)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
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
      console.error('Error al eliminar usuario de Auth:', deleteAuthError);
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
      console.warn('⚠️ No se pudo eliminar de profiles:', deleteProfileError.message);
      // No fallar si solo falla profiles, Auth ya se eliminó
    }

    // Revalidar la ruta para refrescar la tabla
    revalidatePath('/dashboard/admin');

    return {
      success: true,
      message: `Usuario ${userName} eliminado exitosamente`,
    };
  } catch (error: any) {
    console.error('Error inesperado al eliminar usuario:', error);
    return {
      success: false,
      message: error.message || 'Error inesperado al eliminar el usuario',
    };
  }
}

