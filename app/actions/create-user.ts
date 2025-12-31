'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { logger } from '../../utils/logger';

/**
 * Server Action para crear un nuevo usuario en Supabase Auth
 * 
 * Usa SUPABASE_SERVICE_ROLE_KEY para crear usuarios como administrador
 * sin desloguear al usuario actual
 * 
 * @param formData - FormData con los campos: email, password, nombre, rol
 * @returns Objeto con success y message
 */
export async function createUser(formData: FormData) {
  try {
    // Obtener variables de entorno
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Validar que existan las variables de entorno
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return {
        success: false,
        message: 'Error de configuración: Variables de entorno no configuradas',
      };
    }

    // Extraer datos del formulario
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const nombre = formData.get('nombre') as string;
    const rol = formData.get('rol') as string;

    // Validar campos requeridos
    if (!email || !password || !nombre || !rol) {
      return {
        success: false,
        message: 'Todos los campos son requeridos',
      };
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        message: 'El formato del correo electrónico no es válido',
      };
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      return {
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres',
      };
    }

    // Crear cliente de Supabase con Service Role Key (admin)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Crear usuario en Auth
    // El trigger de SQL se encargará de crear el perfil automáticamente
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar email automáticamente
      user_metadata: {
        full_name: nombre, // Usar full_name para que el trigger lo detecte
        nombre: nombre, // Mantener compatibilidad
        rol: rol,
        role: rol, // Mantener compatibilidad
      },
    });

    if (authError) {
      logger.error(authError instanceof Error ? authError : new Error('Error al crear usuario en Auth'), {
        context: 'createUser',
        error: authError.message
      });
      return {
        success: false,
        message: authError.message || 'Error al crear el usuario en el sistema de autenticación',
      };
    }

    if (!authData.user) {
      return {
        success: false,
        message: 'No se pudo crear el usuario. Intenta nuevamente.',
      };
    }

    // El trigger de SQL debería crear automáticamente el perfil
    // Esperar un momento para que el trigger se ejecute
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verificar que el perfil se haya creado (opcional, solo para logging)
    const { data: profileCheck } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', authData.user.id)
      .single();

    if (!profileCheck) {
      logger.warn('El usuario fue creado en Auth pero el perfil no se creó automáticamente', {
        context: 'createUser',
        userId: authData.user.id,
        message: 'Verifica que el trigger de SQL esté configurado correctamente'
      });
    } else {
      logger.debug('Usuario y perfil creados exitosamente', {
        context: 'createUser',
        userId: authData.user.id
      });
    }

    // Revalidar la ruta para refrescar la tabla
    revalidatePath('/dashboard/admin');

    return {
      success: true,
      message: `Usuario ${nombre} creado exitosamente`,
      userId: authData.user.id,
    };
  } catch (error: any) {
    logger.error(error instanceof Error ? error : new Error('Error inesperado al crear usuario'), {
      context: 'createUser',
      error: error.message
    });
    return {
      success: false,
      message: error.message || 'Error inesperado al crear el usuario',
    };
  }
}

