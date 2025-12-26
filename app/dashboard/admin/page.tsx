/**
 * Página de Administración - Gestión de Accesos
 * 
 * Ruta: /dashboard/admin
 * Muestra el componente de gestión de accesos y permisos de usuarios
 * 
 * @module app/dashboard/admin/page
 */

'use client';

import { useEffect } from 'react';
import AccessManagement from '../../../components/AccessManagement';
import AuthGuard from '../../../components/AuthGuard';
import { useNavigation } from '../../../contexts/NavigationContext';

export default function AdminPage() {
  const { setCurrentView } = useNavigation();

  // Actualizar el estado de navegación cuando se carga esta página
  useEffect(() => {
    setCurrentView('ACCESS_MANAGEMENT');
  }, [setCurrentView]);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
          <AccessManagement />
        </div>
      </div>
    </AuthGuard>
  );
}

