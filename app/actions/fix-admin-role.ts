'use server';

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '../../lib/supabase-server';

/**
 * Server Action para verificar y corregir el rol de administrador de un usuario
 * 
 * @param email - Email del usuario a verificar/corregir
 * @returns Objeto con información del proceso
 */
export async function fixAdminRole(email: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return {
        success: false,
        message: 'Error de configuración: Variables de entorno no configuradas',
      };
    }

    // Cliente con Service Role para operaciones administrativas
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Buscar el usuario por email en auth.users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      return {
        success: false,
        message: `Error al buscar usuarios: ${authError.message}`,
      };
    }

    const targetUser = authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!targetUser) {
      return {
        success: false,
        message: `Usuario con email ${email} no encontrado en auth.users`,
      };
    }

    console.log('✅ Usuario encontrado:', {
      id: targetUser.id,
      email: targetUser.email,
      user_metadata: targetUser.user_metadata,
    });

    // 2. Verificar/actualizar en la tabla profiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', targetUser.id)
      .single();

    let profileUpdated = false;
    let authUpdated = false;

    if (profileError && profileError.code === 'PGRST116') {
      // Perfil no existe, crear uno nuevo
      const { error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: targetUser.id,
          email: targetUser.email,
          full_name: targetUser.user_metadata?.full_name || targetUser.email?.split('@')[0] || 'Usuario',
          rol: 'Administrador',
          role: 'Administrador',
          permissions: {
            trabajo_modificado: 'write',
            vigilancia_medica: 'write',
            seguimiento_trabajadores: 'write',
            seguridad_higiene: 'write',
          },
        });

      if (insertError) {
        return {
          success: false,
          message: `Error al crear perfil: ${insertError.message}`,
        };
      }

      profileUpdated = true;
      console.log('✅ Perfil creado con rol Administrador');
    } else if (profile) {
      // Perfil existe, verificar y actualizar si es necesario
      const currentRole = profile.rol || profile.role || '';
      const isAdmin = currentRole?.toLowerCase() === 'admin' || 
                     currentRole === 'Administrador' || 
                     currentRole === 'Admin' ||
                     currentRole?.toLowerCase() === 'administrador';

      if (!isAdmin) {
        // Actualizar el rol a Administrador
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            rol: 'Administrador',
            role: 'Administrador',
            permissions: {
              trabajo_modificado: 'write',
              vigilancia_medica: 'write',
              seguimiento_trabajadores: 'write',
              seguridad_higiene: 'write',
            },
          })
          .eq('id', targetUser.id);

        if (updateError) {
          return {
            success: false,
            message: `Error al actualizar perfil: ${updateError.message}`,
          };
        }

        profileUpdated = true;
        console.log('✅ Perfil actualizado con rol Administrador');
      } else {
        console.log('ℹ️ El perfil ya tiene rol de administrador');
      }
    }

    // 3. Actualizar user_metadata en auth.users
    const currentMetadata = targetUser.user_metadata || {};
    const currentRoleInMetadata = currentMetadata.rol || currentMetadata.role || '';
    const isAdminInMetadata = currentRoleInMetadata?.toLowerCase() === 'admin' || 
                             currentRoleInMetadata === 'Administrador' || 
                             currentRoleInMetadata === 'Admin' ||
                             currentRoleInMetadata?.toLowerCase() === 'administrador';

    if (!isAdminInMetadata) {
      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
        targetUser.id,
        {
          user_metadata: {
            ...currentMetadata,
            rol: 'Administrador',
            role: 'Administrador',
          },
        }
      );

      if (updateAuthError) {
        return {
          success: false,
          message: `Error al actualizar user_metadata: ${updateAuthError.message}`,
        };
      }

      authUpdated = true;
      console.log('✅ user_metadata actualizado con rol Administrador');
    } else {
      console.log('ℹ️ user_metadata ya tiene rol de administrador');
    }

    return {
      success: true,
      message: `Rol de administrador configurado correctamente para ${email}`,
      details: {
        userId: targetUser.id,
        email: targetUser.email,
        profileUpdated,
        authUpdated,
      },
    };
  } catch (error: any) {
    console.error('Error inesperado al corregir rol:', error);
    return {
      success: false,
      message: error.message || 'Error inesperado al corregir el rol',
    };
  }
}

