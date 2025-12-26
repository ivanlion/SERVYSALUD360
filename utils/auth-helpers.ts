/**
 * Helpers de autenticación y verificación de roles
 * 
 * Funciones utilitarias para verificar roles de usuario, especialmente
 * para el Super Admin lionfonseca@gmail.com
 * 
 * @module utils/auth-helpers
 */

/**
 * Email del Super Administrador principal
 * Este usuario siempre tiene acceso total, independientemente de la configuración
 */
export const SUPER_ADMIN_EMAIL = 'lionfonseca@gmail.com';

/**
 * Verifica si un email corresponde al Super Administrador
 * 
 * @param email - Email a verificar
 * @returns true si es el Super Admin
 */
export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

/**
 * Verifica si un usuario es administrador (incluye Super Admin)
 * 
 * @param email - Email del usuario
 * @param role - Rol del usuario (de profiles o user_metadata)
 * @returns true si es admin o Super Admin
 */
export function isAdminUser(email: string | null | undefined, role: string | null | undefined): boolean {
  // Super Admin siempre es admin
  if (isSuperAdmin(email)) {
    return true;
  }

  // Verificar rol
  if (!role) return false;
  
  const roleLower = role.toLowerCase();
  return roleLower === 'admin' || 
         role === 'Administrador' || 
         role === 'Admin' ||
         roleLower === 'administrador';
}

/**
 * Obtiene el nivel de permiso para un módulo, considerando Super Admin
 * 
 * @param email - Email del usuario
 * @param role - Rol del usuario
 * @param permission - Permiso del módulo ('none' | 'read' | 'write')
 * @returns Nivel de permiso (Super Admin siempre retorna 'write')
 */
export function getEffectivePermission(
  email: string | null | undefined,
  role: string | null | undefined,
  permission: 'none' | 'read' | 'write' | boolean | undefined
): 'none' | 'read' | 'write' {
  // Super Admin siempre tiene 'write'
  if (isSuperAdmin(email)) {
    return 'write';
  }

  // Si es admin regular, también tiene 'write'
  if (isAdminUser(email, role)) {
    return 'write';
  }

  // Normalizar permiso
  if (typeof permission === 'boolean') {
    return permission ? 'write' : 'none';
  }

  if (typeof permission === 'string' && ['none', 'read', 'write'].includes(permission)) {
    return permission as 'none' | 'read' | 'write';
  }

  return 'none';
}

