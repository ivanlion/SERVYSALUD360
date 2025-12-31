/**
 * Hook personalizado para verificar permisos de módulos
 * 
 * Proporciona funciones canRead y canWrite basadas en el nivel de acceso del usuario
 * 
 * @module hooks/useModulePermission
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser } from '../contexts/UserContext';
import { isSuperAdmin, isAdminUser, getEffectivePermission } from '../utils/auth-helpers';

export type PermissionLevel = 'none' | 'read' | 'write';

interface UseModulePermissionResult {
  canRead: boolean;
  canWrite: boolean;
  permissionLevel: PermissionLevel;
  isLoading: boolean;
}

/**
 * Hook para verificar permisos de un módulo específico
 * 
 * @param moduleKey - Clave del módulo (ej: 'trabajo_modificado', 'vigilancia_medica')
 * @returns Objeto con canRead, canWrite, permissionLevel e isLoading
 * 
 * @example
 * const { canRead, canWrite } = useModulePermission('trabajo_modificado');
 * 
 * if (!canRead) {
 *   return <div>No tienes acceso a este módulo</div>;
 * }
 * 
 * <button disabled={!canWrite}>Guardar</button>
 */
export function useModulePermission(moduleKey: string): UseModulePermissionResult {
  // OPTIMIZACIÓN: Usar UserContext en lugar de hacer consultas duplicadas a Supabase
  const { user, profile, isLoading: isLoadingUser } = useUser();

  // Calcular permisos desde el contexto (memoizado para evitar recálculos)
  const permissionResult = useMemo(() => {
    // Si aún está cargando el usuario, retornar valores por defecto
    if (isLoadingUser || !user) {
      return {
        canRead: false,
        canWrite: false,
        permissionLevel: 'none' as PermissionLevel,
      };
    }

    const userEmail = user.email || '';
    const userRole = profile?.role || user.user_metadata?.role || user.user_metadata?.rol || '';

    // Verificar si es Super Admin o Admin
    const isAdmin = isSuperAdmin(userEmail) || isAdminUser(userEmail, userRole);

    // Si es administrador, tiene acceso total
    if (isAdmin) {
      return {
        canRead: true,
        canWrite: true,
        permissionLevel: 'write' as PermissionLevel,
      };
    }

    // Obtener el nivel de permiso del módulo desde permissions JSONB
    const permissions = profile?.permissions || user.user_metadata?.permissions || {};
    
    // Mapear la clave del módulo (puede venir con guiones bajos o camelCase)
    const normalizedKey = moduleKey.replace(/_/g, '_');
    const camelCaseKey = moduleKey.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    
    // Intentar obtener el permiso con diferentes formatos de clave
    const modulePermission = permissions[normalizedKey] || 
                            permissions[camelCaseKey] || 
                            permissions[moduleKey] || 
                            'none';

    // Usar getEffectivePermission para considerar Super Admin
    const effectivePermission = getEffectivePermission(
      userEmail,
      userRole || undefined,
      modulePermission
    );

    // Convertir a PermissionLevel
    let level: PermissionLevel = 'none';
    
    if (typeof effectivePermission === 'boolean') {
      // Compatibilidad con sistema anterior (boolean)
      level = effectivePermission ? 'write' : 'none';
    } else if (typeof effectivePermission === 'string') {
      // Nuevo sistema (string: 'none' | 'read' | 'write')
      level = (effectivePermission as PermissionLevel) || 'none';
    }

    // Validar que el nivel sea válido
    if (!['none', 'read', 'write'].includes(level)) {
      level = 'none';
    }

    // Determinar canRead y canWrite basado en el nivel
    const canRead = level === 'read' || level === 'write';
    const canWrite = level === 'write';

    return {
      canRead,
      canWrite,
      permissionLevel: level,
    };
  }, [user, profile, isLoadingUser, moduleKey]);

  return {
    ...permissionResult,
    isLoading: isLoadingUser,
  };
}



