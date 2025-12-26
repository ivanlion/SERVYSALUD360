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
      <AccessManagement />
    </AuthGuard>
  );
}

