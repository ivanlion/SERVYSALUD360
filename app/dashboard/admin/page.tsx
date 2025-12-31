/**
 * Página de Administración - Gestión de Accesos
 * 
 * Ruta: /dashboard/admin
 * Muestra el componente de gestión de accesos y permisos de usuarios
 * 
 * @module app/dashboard/admin/page
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AccessManagement from '../../../components/AccessManagement';
import AuthGuard from '../../../components/AuthGuard';
import { useNavigation } from '../../../contexts/NavigationContext';
import { supabase } from '../../../lib/supabase';
import { Loader2, AlertCircle } from 'lucide-react';
import { isSuperAdmin, isAdminUser } from '../../../utils/auth-helpers';
import { logger } from '../../../utils/logger';

export default function AdminPage() {
  const { setCurrentView } = useNavigation();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState<boolean>(true);

  // Verificar si el usuario es administrador
  useEffect(() => {
    const checkAdminAccess = async () => {
      setIsCheckingAdmin(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/login');
          return;
        }

        // Verificar si el usuario es administrador
        const { data: profile } = await supabase
          .from('profiles')
          .select('rol, role')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          const role = profile.rol || profile.role || '';
          // Usar helper que incluye verificación de Super Admin
          const userIsAdmin = isAdminUser(user.email, role);
          setIsAdmin(userIsAdmin);
          
          if (!userIsAdmin) {
            // Si no es admin, redirigir al dashboard principal
            router.push('/');
            return;
          }
        } else {
          // Si no hay perfil, verificar en user_metadata
          const role = user.user_metadata?.rol || user.user_metadata?.role || '';
          // Usar helper que incluye verificación de Super Admin
          const userIsAdmin = isAdminUser(user.email, role);
          setIsAdmin(userIsAdmin);
          
          if (!userIsAdmin) {
            router.push('/');
            return;
          }
        }
      } catch (error) {
        logger.error(error instanceof Error ? error : new Error('Error al verificar permisos de administrador'), {
          context: 'AdminPage'
        });
        router.push('/');
      } finally {
        setIsCheckingAdmin(false);
      }
    };

    checkAdminAccess();
  }, [router]);

  // Nota: Esta página solo se accede cuando el usuario hace clic en "Gestión de Usuarios"
  // No establecemos la vista automáticamente para que el usuario pueda navegar libremente
  // Si el usuario accede directamente a /dashboard/admin, establecer la vista
  useEffect(() => {
    if (isAdmin) {
      // Solo establecer ACCESS_MANAGEMENT si el usuario accede directamente a esta ruta
      // No forzar la vista si viene del login (debe ir al Dashboard primero)
      setCurrentView('ACCESS_MANAGEMENT');
    }
  }, [setCurrentView, isAdmin]);

  // Mostrar loading mientras se verifica
  if (isCheckingAdmin) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-indigo-600" size={48} />
            <p className="text-lg font-semibold text-slate-600">Verificando permisos...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  // Si no es admin, no debería llegar aquí (ya fue redirigido), pero por seguridad mostrar mensaje
  if (!isAdmin) {
    return (
      <AuthGuard>
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <AlertCircle className="mx-auto text-red-600 mb-4" size={48} />
          <h2 className="text-2xl font-bold text-red-800 mb-2">
            Acceso Denegado
          </h2>
          <p className="text-red-600">
            No tienes permiso para acceder a esta página.
          </p>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AccessManagement />
    </AuthGuard>
  );
}

