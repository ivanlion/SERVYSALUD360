'use server';

import { createClient } from '@supabase/supabase-js';

/**
 * Server Action para obtener usuarios de Supabase
 * 
 * Intenta obtener usuarios desde la tabla profiles primero,
 * si no existe, obtiene usuarios desde auth.users
 * 
 * @returns Array de usuarios con sus datos
 */
export async function getUsers() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      return {
        success: false,
        message: 'Error de configuración: NEXT_PUBLIC_SUPABASE_URL no está configurada',
        users: [],
      };
    }

    // Usar Service Role Key si está disponible, sino usar Anon Key
    const supabaseKey = supabaseServiceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseKey) {
      return {
        success: false,
        message: 'Error de configuración: No hay clave de Supabase configurada',
        users: [],
      };
    }

    // Crear cliente de Supabase
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Obtener usuarios desde la tabla profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    // Si hay error pero no es porque la tabla no existe, retornar error
    if (profilesError && profilesError.code !== 'PGRST116') {
      console.error('Error al obtener usuarios de profiles:', profilesError);
      return {
        success: false,
        message: profilesError.message || 'Error al obtener usuarios de profiles',
        users: [],
      };
    }

    // Si la tabla profiles existe y tiene datos, usarlos
    if (!profilesError && profilesData && profilesData.length > 0) {
      const users = profilesData.map((profile: any) => {
        // Manejar permissions como JSON o campos individuales
        let permissions = {
          trabajoModificado: false,
          vigilanciaMedica: false,
          seguimientoTrabajadores: false,
          seguridadHigiene: false,
        };

        // Si permissions es un objeto JSON
        if (profile.permissions && typeof profile.permissions === 'object') {
          permissions = {
            trabajoModificado: profile.permissions.trabajo_modificado || profile.permissions.trabajoModificado || false,
            vigilanciaMedica: profile.permissions.vigilancia_medica || profile.permissions.vigilanciaMedica || false,
            seguimientoTrabajadores: profile.permissions.seguimiento_trabajadores || profile.permissions.seguimientoTrabajadores || false,
            seguridadHigiene: profile.permissions.seguridad_higiene || profile.permissions.seguridadHigiene || false,
          };
        } else {
          // Si permissions viene como campos individuales
          permissions = {
            trabajoModificado: profile.trabajo_modificado || false,
            vigilanciaMedica: profile.vigilancia_medica || false,
            seguimientoTrabajadores: profile.seguimiento_trabajadores || false,
            seguridadHigiene: profile.seguridad_higiene || false,
          };
        }

        return {
          id: profile.id,
          name: profile.full_name || profile.nombre || profile.name || null,
          email: profile.email || '',
          role: profile.rol || profile.role || 'Usuario',
          permissions,
        };
      });

      return {
        success: true,
        message: `${users.length} usuarios encontrados en profiles`,
        users,
      };
    }

    // Si no hay tabla profiles o está vacía, obtener desde auth.users usando admin
    if (supabaseServiceRoleKey) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();

      if (authError) {
        console.error('Error al obtener usuarios de Auth:', authError);
        return {
          success: false,
          message: authError.message || 'Error al obtener usuarios',
          users: [],
        };
      }

      if (authData && authData.users) {
        const users = authData.users.map((user: any) => ({
          id: user.id,
          name: user.user_metadata?.nombre || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario',
          email: user.email || '',
          role: user.user_metadata?.rol || user.user_metadata?.role || 'Usuario',
          permissions: {
            trabajoModificado: user.user_metadata?.trabajo_modificado || false,
            vigilanciaMedica: user.user_metadata?.vigilancia_medica || false,
            seguimientoTrabajadores: user.user_metadata?.seguimiento_trabajadores || false,
            seguridadHigiene: user.user_metadata?.seguridad_higiene || false,
          },
        }));

        return {
          success: true,
          message: `${users.length} usuarios encontrados en Auth`,
          users,
        };
      }
    }

    return {
      success: true,
      message: 'No se encontraron usuarios',
      users: [],
    };
  } catch (error: any) {
    console.error('Error inesperado al obtener usuarios:', error);
    return {
      success: false,
      message: error.message || 'Error inesperado al obtener usuarios',
      users: [],
    };
  }
}

