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

    // Obtener usuarios desde la tabla profiles (solo campos necesarios para mejor rendimiento)
    // Nota: Solo seleccionar columnas que existen en la tabla (full_name, no nombre ni name)
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, rol, role, permissions, created_at')
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

    // Si la tabla profiles existe (incluso si está vacía), procesar los datos
    if (!profilesError && profilesData !== null) {
      // Si no hay datos, retornar array vacío pero con success: true
      if (profilesData.length === 0) {
        return {
          success: true,
          message: 'No se encontraron usuarios en la tabla profiles',
          users: [],
        };
      }
      const users = profilesData.map((profile: any) => {
        // Manejar permissions como JSON con niveles de acceso (none, read, write)
        // Compatibilidad: Si viene como boolean, convertir a nivel de acceso
        type PermissionLevel = 'none' | 'read' | 'write';
        
        const normalizePermission = (value: any): PermissionLevel => {
          if (typeof value === 'boolean') {
            // Compatibilidad con sistema anterior: true -> 'write', false -> 'none'
            return value ? 'write' : 'none';
          }
          if (typeof value === 'string' && ['none', 'read', 'write'].includes(value)) {
            return value as PermissionLevel;
          }
          return 'none'; // Valor por defecto
        };

        let permissions: {
          trabajoModificado: PermissionLevel;
          vigilanciaMedica: PermissionLevel;
          seguimientoTrabajadores: PermissionLevel;
          seguridadHigiene: PermissionLevel;
        } = {
          trabajoModificado: 'none',
          vigilanciaMedica: 'none',
          seguimientoTrabajadores: 'none',
          seguridadHigiene: 'none',
        };

        // Si permissions es un objeto JSON
        if (profile.permissions && typeof profile.permissions === 'object') {
          permissions = {
            trabajoModificado: normalizePermission(
              profile.permissions.trabajo_modificado || profile.permissions.trabajoModificado
            ),
            vigilanciaMedica: normalizePermission(
              profile.permissions.vigilancia_medica || profile.permissions.vigilanciaMedica
            ),
            seguimientoTrabajadores: normalizePermission(
              profile.permissions.seguimiento_trabajadores || profile.permissions.seguimientoTrabajadores
            ),
            seguridadHigiene: normalizePermission(
              profile.permissions.seguridad_higiene || profile.permissions.seguridadHigiene
            ),
          };
        } else {
          // Si permissions viene como campos individuales
          permissions = {
            trabajoModificado: normalizePermission(profile.trabajo_modificado),
            vigilanciaMedica: normalizePermission(profile.vigilancia_medica),
            seguimientoTrabajadores: normalizePermission(profile.seguimiento_trabajadores),
            seguridadHigiene: normalizePermission(profile.seguridad_higiene),
          };
        }

        return {
          id: profile.id,
          name: profile.full_name || null, // Solo usar full_name, que es la columna que existe
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
            trabajoModificado: (user.user_metadata?.trabajo_modificado === true || user.user_metadata?.trabajo_modificado === 'write') ? 'write' : 
                             (user.user_metadata?.trabajo_modificado === 'read') ? 'read' : 'none',
            vigilanciaMedica: (user.user_metadata?.vigilancia_medica === true || user.user_metadata?.vigilancia_medica === 'write') ? 'write' : 
                             (user.user_metadata?.vigilancia_medica === 'read') ? 'read' : 'none',
            seguimientoTrabajadores: (user.user_metadata?.seguimiento_trabajadores === true || user.user_metadata?.seguimiento_trabajadores === 'write') ? 'write' : 
                                    (user.user_metadata?.seguimiento_trabajadores === 'read') ? 'read' : 'none',
            seguridadHigiene: (user.user_metadata?.seguridad_higiene === true || user.user_metadata?.seguridad_higiene === 'write') ? 'write' : 
                             (user.user_metadata?.seguridad_higiene === 'read') ? 'read' : 'none',
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

