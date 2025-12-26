'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

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
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar email automáticamente
      user_metadata: {
        nombre,
        rol,
      },
    });

    if (authError) {
      console.error('Error al crear usuario en Auth:', authError);
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

    // Insertar datos adicionales en la tabla de perfiles (si existe)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name: nombre, // Usar full_name como campo principal
        nombre: nombre, // Mantener compatibilidad con nombre también
        email,
        rol,
        role: rol, // Mantener compatibilidad con role también
        created_at: new Date().toISOString(),
      })
      .select();

    // Si la tabla 'profiles' no existe, solo registramos el error pero no fallamos
    // porque el usuario ya fue creado en Auth
    if (profileError) {
      console.warn('⚠️ No se pudo insertar en la tabla profiles:', profileError.message);
      console.warn('⚠️ El usuario fue creado en Auth pero no se guardaron datos adicionales.');
      console.warn('⚠️ Asegúrate de crear la tabla "profiles" en Supabase con las columnas: id, nombre, email, rol, created_at');
    }

    // Revalidar la ruta para refrescar la tabla
    revalidatePath('/dashboard/admin');

    return {
      success: true,
      message: `Usuario ${nombre} creado exitosamente`,
      userId: authData.user.id,
    };
  } catch (error: any) {
    console.error('Error inesperado al crear usuario:', error);
    return {
      success: false,
      message: error.message || 'Error inesperado al crear el usuario',
    };
  }
}

