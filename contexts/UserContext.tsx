/**
 * UserContext - Contexto para gestión de perfil de usuario
 * 
 * Cachea el perfil del usuario para evitar consultas duplicadas
 * 
 * @module contexts/UserContext
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import { User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  permissions: any;
  created_at?: string;
}

interface UserContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar perfil del usuario
  // OPTIMIZACIÓN: Usar getSession primero (más rápido) antes de getUser
  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // OPTIMIZACIÓN: Intentar getSession primero (más rápido que getUser)
      let currentUser: User | null = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          currentUser = session.user;
        }
      } catch (sessionError: any) {
        logger.warn('[UserContext] Error en getSession, intentando getUser', {
          context: 'UserContext',
          error: sessionError.message
        });
      }
      
      // Fallback a getUser si getSession no funcionó
      if (!currentUser) {
        const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
        if (userError || !userData) {
          setUser(null);
          setProfile(null);
          setIsLoading(false);
          return;
        }
        currentUser = userData;
      }

      setUser(currentUser);

      // OPTIMIZACIÓN: Obtener perfil desde la tabla profiles (solo campos necesarios)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, permissions, created_at') // Solo campos necesarios
        .eq('id', currentUser.id)
        .single();

      if (profileError) {
        // Si no existe perfil, crear uno básico desde user_metadata
        logger.warn('Perfil no encontrado en tabla profiles, usando user_metadata', {
          context: 'UserContext',
          userId: currentUser.id
        });
        
        setProfile({
          id: currentUser.id,
          email: currentUser.email || '',
          full_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || null,
          role: currentUser.user_metadata?.role || currentUser.user_metadata?.rol || 'Usuario',
          permissions: currentUser.user_metadata?.permissions || null,
        });
      } else if (profileData) {
        setProfile({
          id: profileData.id,
          email: profileData.email || currentUser.email || '',
          full_name: profileData.full_name,
          role: profileData.role,
          permissions: profileData.permissions,
          created_at: profileData.created_at,
        });
      }
    } catch (error: any) {
      logger.error(error instanceof Error ? error : new Error('Error al cargar perfil'), {
        context: 'UserContext'
      });
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Función para refrescar el perfil
  const refreshProfile = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  // Cargar perfil al montar el componente
  useEffect(() => {
    loadProfile();

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        loadProfile();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  return (
    <UserContext.Provider
      value={{
        user,
        profile,
        isLoading,
        refreshProfile,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}


