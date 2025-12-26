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
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      console.error('❌ NEXT_PUBLIC_SUPABASE_URL no está configurada');
      return {
        isAdmin: false,
        userId: null,
        error: 'Variables de entorno no configuradas',
      };
    }

    if (!supabaseServiceRoleKey && !supabaseAnonKey) {
      console.error('❌ No hay clave de Supabase configurada (ni SERVICE_ROLE_KEY ni ANON_KEY)');
      return {
        isAdmin: false,
        userId: null,
        error: 'Variables de entorno no configuradas',
      };
    }

    // Obtener el usuario actual desde las cookies usando cookies() de Next.js
    const cookieStore = await cookies();
    
    // Obtener todas las cookies para debugging
    const allCookies = cookieStore.getAll();
    console.log('🔍 [verifyAdmin] Cookies disponibles:', allCookies.map(c => c.name).join(', '));
    
    // Buscar el token de acceso en las cookies de Supabase
    // Supabase almacena el token en cookies con formato: sb-<project-ref>-auth-token
    const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || '';
    const authCookieName = `sb-${projectRef}-auth-token`;
    
    // Buscar también otras posibles cookies de Supabase
    const supabaseCookies = allCookies.filter(c => 
      c.name.includes('supabase') || 
      c.name.includes('sb-') || 
      c.name.includes('auth') ||
      c.name.includes('access-token')
    );
    
    console.log('🔍 [verifyAdmin] Cookies de Supabase encontradas:', supabaseCookies.map(c => c.name).join(', '));
    console.log('🔍 [verifyAdmin] Buscando cookie específica:', authCookieName);
    
    // Crear cliente de Supabase con Anon Key para obtener el usuario actual
    // En Server Actions, necesitamos pasar las cookies manualmente
    const supabase = createClient(supabaseUrl, supabaseAnonKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          // Intentar pasar las cookies si están disponibles
          Cookie: allCookies.map(c => `${c.name}=${c.value}`).join('; '),
        },
      },
    });
    
    // Intentar obtener el usuario directamente
    // Si esto falla, intentaremos con el Service Role Key
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    // Si no se puede obtener el usuario con Anon Key, intentar con Service Role Key
    // Esto es necesario porque en Server Actions las cookies pueden no estar disponibles
    let currentUser = user;
    
    if (userError || !currentUser) {
      console.warn('⚠️ [verifyAdmin] No se pudo obtener usuario con Anon Key, intentando con Service Role Key');
      console.warn('⚠️ [verifyAdmin] Error:', userError?.message);
      
      // Si tenemos Service Role Key, intentar obtener el usuario desde las cookies manualmente
      if (supabaseServiceRoleKey) {
        // Buscar el access_token en las cookies
        const accessTokenCookie = supabaseCookies.find(c => 
          c.name.includes('access-token') || 
          c.value.includes('eyJ') // Los JWT suelen empezar con 'eyJ'
        );
        
        if (accessTokenCookie) {
          console.log('🔍 [verifyAdmin] Token encontrado en cookie:', accessTokenCookie.name);
          // Intentar decodificar el token o usar el Service Role Key para verificar
        }
        
        // Como último recurso, si no podemos obtener el usuario, retornar error
        // pero esto debería ser raro en producción
        console.error('❌ [verifyAdmin] Usuario no autenticado:', userError?.message || 'No se encontró usuario');
        return {
          isAdmin: false,
          userId: null,
          error: 'Usuario no autenticado. Por favor, inicia sesión nuevamente.',
        };
      } else {
        console.error('❌ [verifyAdmin] Usuario no autenticado y no hay Service Role Key');
        return {
          isAdmin: false,
          userId: null,
          error: 'Usuario no autenticado',
        };
      }
    }

    console.log('✅ [verifyAdmin] Usuario encontrado:', { 
      id: currentUser.id, 
      email: currentUser.email,
      user_metadata: currentUser.user_metadata 
    });

    // Usar Service Role Key para consultar profiles sin restricciones RLS
    if (!supabaseServiceRoleKey) {
      console.error('❌ [verifyAdmin] SUPABASE_SERVICE_ROLE_KEY no está configurada');
      return {
        isAdmin: false,
        userId: currentUser?.id || null,
        error: 'Service Role Key no configurada',
      };
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verificar el rol del usuario en la tabla profiles
    const { data: currentUserProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('rol, role')
      .eq('id', currentUser.id)
      .single();

    // Log de depuración completo
    console.log('🔍 [verifyAdmin] Admin Check - Perfil encontrado:', {
      profile: currentUserProfile,
      profileError: profileError?.message,
      profileErrorCode: profileError?.code,
      profileErrorDetails: profileError?.details,
      userId: currentUser.id,
    });

    if (profileError) {
      console.warn('⚠️ [verifyAdmin] Error al obtener perfil:', profileError.message);
      console.warn('⚠️ [verifyAdmin] Código de error:', profileError.code);
      
      // Si no hay perfil, verificar en user_metadata
      const role = currentUser.user_metadata?.rol || currentUser.user_metadata?.role || '';
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
        userId: currentUser.id,
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
      userId: currentUser.id,
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

