/**
 * Hook personalizado para verificar permisos de módulos
 * 
 * Proporciona funciones canRead y canWrite basadas en el nivel de acceso del usuario
 * 
 * @module hooks/useModulePermission
 */

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
  const [canRead, setCanRead] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('none');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        // Obtener el usuario actual
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          setCanRead(false);
          setCanWrite(false);
          setPermissionLevel('none');
          setIsLoading(false);
          return;
        }

        // Obtener el perfil del usuario
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('rol, role, permissions')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error al obtener perfil:', profileError);
          setCanRead(false);
          setCanWrite(false);
          setPermissionLevel('none');
          setIsLoading(false);
          return;
        }

        // Verificar si es administrador
        const role = profile.rol || profile.role || '';
        const isAdmin = role?.toLowerCase() === 'admin' || 
                       role === 'Administrador' || 
                       role === 'Admin' ||
                       role?.toLowerCase() === 'administrador';

        // Si es administrador, tiene acceso total
        if (isAdmin) {
          setCanRead(true);
          setCanWrite(true);
          setPermissionLevel('write');
          setIsLoading(false);
          return;
        }

        // Obtener el nivel de permiso del módulo desde permissions JSONB
        const permissions = profile.permissions || {};
        
        // Mapear la clave del módulo (puede venir con guiones bajos o camelCase)
        const normalizedKey = moduleKey.replace(/_/g, '_');
        const camelCaseKey = moduleKey.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        
        // Intentar obtener el permiso con diferentes formatos de clave
        const modulePermission = permissions[normalizedKey] || 
                                permissions[camelCaseKey] || 
                                permissions[moduleKey] || 
                                'none';

        // Convertir a PermissionLevel (por si viene como boolean por compatibilidad)
        let level: PermissionLevel = 'none';
        
        if (typeof modulePermission === 'boolean') {
          // Compatibilidad con sistema anterior (boolean)
          level = modulePermission ? 'write' : 'none';
        } else if (typeof modulePermission === 'string') {
          // Nuevo sistema (string: 'none' | 'read' | 'write')
          level = (modulePermission as PermissionLevel) || 'none';
        }

        // Validar que el nivel sea válido
        if (!['none', 'read', 'write'].includes(level)) {
          level = 'none';
        }

        setPermissionLevel(level);

        // Determinar canRead y canWrite basado en el nivel
        switch (level) {
          case 'write':
            setCanRead(true);
            setCanWrite(true);
            break;
          case 'read':
            setCanRead(true);
            setCanWrite(false);
            break;
          case 'none':
          default:
            setCanRead(false);
            setCanWrite(false);
            break;
        }

      } catch (error) {
        console.error('Error al verificar permisos:', error);
        setCanRead(false);
        setCanWrite(false);
        setPermissionLevel('none');
      } finally {
        setIsLoading(false);
      }
    };

    checkPermission();

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkPermission();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [moduleKey]);

  return { canRead, canWrite, permissionLevel, isLoading };
}


