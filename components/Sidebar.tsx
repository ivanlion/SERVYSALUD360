/**
 * Sidebar - Componente de navegación lateral
 * 
 * Sidebar estilo HealthGuard con menú de navegación
 * 
 * @component
 */

'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  FileText, 
  Stethoscope, 
  Shield, 
  Settings,
  Menu,
  X,
  Activity,
  Users,
  Heart,
  Upload,
  Building2,
  Gavel,
  History
} from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import { isSuperAdmin, isAdminUser, getEffectivePermission } from '../utils/auth-helpers';

interface SidebarItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  view?: 'DASHBOARD' | 'NEW_CASE' | 'EDIT_CASE' | 'ACCESS_MANAGEMENT' | 'WORK_MODIFIED_DASHBOARD' | 'VIGILANCIA_MEDICA' | 'UPLOAD_EMO' | 'GESTION_EMPRESAS' | 'LEY29733' | 'HISTORIAL_ANALISIS';
  hasSubItems?: boolean;
}

const menuItems: SidebarItem[] = [
  {
    label: 'Inicio',
    icon: <LayoutDashboard size={20} />,
    href: '/',
    view: 'DASHBOARD' as const
  },
  {
    label: 'Trabajo Modificado',
    icon: <FileText size={20} />,
    href: '/',
    view: 'WORK_MODIFIED_DASHBOARD' as const
  },
  {
    label: 'Vigilancia Médica',
    icon: <Heart size={20} />,
    href: '/',
    view: 'VIGILANCIA_MEDICA' as const
  },
  {
    label: 'Subir EMO',
    icon: <Upload size={20} />,
    href: '/',
    view: 'UPLOAD_EMO' as const
  },
  {
    label: 'Historial de Análisis',
    icon: <History size={20} />,
    href: '/',
    view: 'HISTORIAL_ANALISIS' as const
  },
  {
    label: 'Gestión de Empresas',
    icon: <Building2 size={20} />,
    href: '/',
    view: 'GESTION_EMPRESAS' as const
  },
  {
    label: 'Seguimiento de Trabajadores',
    icon: <Users size={20} />,
    href: '/',
    view: 'DASHBOARD' as const
  },
  {
    label: 'Seguridad e Higiene',
    icon: <Shield size={20} />,
    href: '/',
    view: 'DASHBOARD' as const
  },
  {
    label: 'Ley 29733',
    icon: <Gavel size={20} />,
    href: '/',
    view: 'LEY29733' as const
  },
  {
    label: 'Administración',
    icon: <Settings size={20} />,
    href: '/',
    view: 'ACCESS_MANAGEMENT' as const,
    hasSubItems: true
  }
];

// Item especial para Gestión de Usuarios (dentro de Administración)
const adminSubItems: SidebarItem[] = [
  {
    label: 'Gestión de Usuarios',
    icon: <Users size={20} />,
    href: '/dashboard/admin',
    view: 'ACCESS_MANAGEMENT' as const
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<{
    trabajoModificado?: 'none' | 'read' | 'write';
    vigilanciaMedica?: 'none' | 'read' | 'write';
    seguimientoTrabajadores?: 'none' | 'read' | 'write';
    seguridadHigiene?: 'none' | 'read' | 'write';
  }>({});
  const { currentView, setCurrentView, isSidebarCollapsed } = useNavigation();

  // Obtener el rol y permisos del usuario actual
  useEffect(() => {
    const getUserRoleAndPermissions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Intentar obtener el rol y permisos desde la tabla profiles
          const { data: profile } = await supabase
            .from('profiles')
            .select('rol, role, permissions')
            .eq('id', user.id)
            .single();
          
          if (profile) {
            const role = profile.rol || profile.role || null;
            setUserRole(role);
            
            // Obtener permisos del JSONB usando helper que considera Super Admin
            if (profile.permissions && typeof profile.permissions === 'object') {
              setUserPermissions({
                trabajoModificado: getEffectivePermission(
                  user.email,
                  role || undefined,
                  profile.permissions.trabajo_modificado || profile.permissions.trabajoModificado
                ),
                vigilanciaMedica: getEffectivePermission(
                  user.email,
                  role || undefined,
                  profile.permissions.vigilancia_medica || profile.permissions.vigilanciaMedica
                ),
                seguimientoTrabajadores: getEffectivePermission(
                  user.email,
                  role || undefined,
                  profile.permissions.seguimiento_trabajadores || profile.permissions.seguimientoTrabajadores
                ),
                seguridadHigiene: getEffectivePermission(
                  user.email,
                  role || undefined,
                  profile.permissions.seguridad_higiene || profile.permissions.seguridadHigiene
                ),
              });
            } else {
              // Si no hay permisos, usar helper para determinar según rol
              const defaultPermission = isSuperAdmin(user.email) || isAdminUser(user.email, role || undefined) 
                ? 'write' 
                : 'none';
              setUserPermissions({
                trabajoModificado: defaultPermission,
                vigilanciaMedica: defaultPermission,
                seguimientoTrabajadores: defaultPermission,
                seguridadHigiene: defaultPermission,
              });
            }
          } else {
            // Si no hay perfil, obtener desde user_metadata
            const role = user.user_metadata?.rol || user.user_metadata?.role || null;
            setUserRole(role);
            
            // Si es Super Admin o Admin, dar permisos completos
            const defaultPermission = isSuperAdmin(user.email) || isAdminUser(user.email, role || undefined) 
              ? 'write' 
              : 'none';
            setUserPermissions({
              trabajoModificado: defaultPermission,
              vigilanciaMedica: defaultPermission,
              seguimientoTrabajadores: defaultPermission,
              seguridadHigiene: defaultPermission,
            });
          }
        }
      } catch (error) {
        logger.error(error instanceof Error ? error : new Error('Error al obtener rol y permisos del usuario'), {
          context: 'Sidebar'
        });
      }
    };

    getUserRoleAndPermissions();
  }, []);

  // Obtener email del usuario para verificar Super Admin
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  useEffect(() => {
    const getUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || null);
    };
    getUserEmail();
  }, []);

  // Verificar si el usuario es administrador (incluye Super Admin)
  const isAdmin = isAdminUser(userEmail, userRole);

  // Función helper para verificar si el usuario tiene acceso a un módulo
  const hasModuleAccess = (moduleKey: keyof typeof userPermissions): boolean => {
    // Super Admin y Administradores siempre tienen acceso
    if (isSuperAdmin(userEmail) || isAdmin) return true;
    const permission = userPermissions[moduleKey];
    return permission !== undefined && permission !== 'none';
  };

  // No mostrar sidebar en la página de login
  if (pathname === '/login') {
    return null;
  }

  const handleItemClick = (item: SidebarItem) => {
    if (item.view) {
      setCurrentView(item.view);
    }
    
    // Navegación según el módulo
    if (item.label === 'Inicio') {
      router.push('/');
      setCurrentView('DASHBOARD');
    } else if (item.label === 'Trabajo Modificado') {
      logger.debug('[Sidebar] Navegando a Trabajo Modificado');
      setCurrentView('WORK_MODIFIED_DASHBOARD');
      router.push('/');
    } else if (item.label === 'Vigilancia Médica') {
      router.push('/');
      setCurrentView('VIGILANCIA_MEDICA');
    } else if (item.label === 'Subir EMO') {
      router.push('/');
      setCurrentView('UPLOAD_EMO');
    } else if (item.label === 'Historial de Análisis') {
      router.push('/');
      setCurrentView('HISTORIAL_ANALISIS');
    } else if (item.label === 'Gestión de Empresas') {
      router.push('/');
      setCurrentView('GESTION_EMPRESAS');
    } else if (item.label === 'Seguimiento de Trabajadores') {
      router.push('/');
      setCurrentView('DASHBOARD'); // Por ahora lleva al dashboard principal
    } else if (item.label === 'Seguridad e Higiene') {
      router.push('/');
      setCurrentView('DASHBOARD'); // Por ahora lleva al dashboard principal
    } else if (item.label === 'Ley 29733') {
      router.push('/');
      setCurrentView('LEY29733');
    } else if (item.label === 'Administración') {
      // Si es administrador, puede acceder directamente
      if (isAdmin) {
        router.push('/dashboard/admin');
        setCurrentView('ACCESS_MANAGEMENT');
      }
    }
    
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-blue-200 hover:bg-blue-50 transition-colors"
        aria-label="Toggle menu"
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay para móvil */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          bg-white dark:bg-gray-900 border-r border-blue-100 dark:border-gray-800
          transform transition-all duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isSidebarCollapsed ? 'w-16' : 'w-64'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Menu Items */}
          <nav className={`flex-1 py-4 space-y-2 overflow-y-auto ${isSidebarCollapsed ? 'px-2' : 'px-4'}`}>
            {menuItems.map((item) => {
              // Ocultar completamente el módulo "Administración" si no es admin
              if (item.label === 'Administración' && !isAdmin) {
                return null;
              }

              // Lógica mejorada para determinar si un item está activo
              const isInicioActive = item.label === 'Inicio' && currentView === 'DASHBOARD';
              const isTrabajoModificadoActive = item.label === 'Trabajo Modificado' && currentView === 'WORK_MODIFIED_DASHBOARD';
              const isVigilanciaMedicaActive = item.label === 'Vigilancia Médica' && currentView === 'VIGILANCIA_MEDICA';
              const isUploadEMOActive = item.label === 'Subir EMO' && currentView === 'UPLOAD_EMO';
              const isHistorialAnalisisActive = item.label === 'Historial de Análisis' && currentView === 'HISTORIAL_ANALISIS';
              const isGestionEmpresasActive = item.label === 'Gestión de Empresas' && currentView === 'GESTION_EMPRESAS';
              const isLey29733Active = item.label === 'Ley 29733' && currentView === 'LEY29733';
              const isAdminActive = item.label === 'Administración' && 
                (currentView === 'ACCESS_MANAGEMENT' || pathname === '/dashboard/admin');
              
              // Determinar si el item está activo (solo uno puede estar activo a la vez)
              const isActive = isInicioActive || isTrabajoModificadoActive || isVigilanciaMedicaActive || 
                isUploadEMOActive || isHistorialAnalisisActive || isGestionEmpresasActive || isLey29733Active || isAdminActive;
              
              return (
                <React.Fragment key={item.label}>
                  <button
                    onClick={() => {
                      // Si tiene sub-items (Administración) y es admin, permitir acceso directo
                      if (item.hasSubItems && isAdmin) {
                        handleItemClick(item);
                        return;
                      }
                      // Si tiene sub-items pero no es admin, no debería llegar aquí (ya está oculto)
                      if (item.hasSubItems) {
                        return;
                      }
                      // Para otros items, cambiar la vista normalmente
                      handleItemClick(item);
                    }}
                    className={`
                      w-full flex items-center rounded-lg text-left transition-all duration-200
                      ${isSidebarCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3'}
                      min-h-[44px] sm:min-h-0
                      ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-l-4 border-blue-600 dark:border-blue-500 font-semibold'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }
                    `}
                    title={isSidebarCollapsed ? item.label : undefined}
                  >
                    <span className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}>
                      {item.icon}
                    </span>
                    {!isSidebarCollapsed && (
                      <span className={`text-sm ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}>
                        {item.label}
                      </span>
                    )}
                  </button>
                  
                  {/* Sub-items de Administración - Solo mostrar si es admin y no está colapsado */}
                  {item.hasSubItems && !isSidebarCollapsed && isAdmin && (
                    <div className="mt-1 ml-4 space-y-1">
                      {adminSubItems.map((subItem) => {
                        const isSubActive = subItem.view === currentView || pathname === subItem.href;
                        return (
                          <Link
                            key={subItem.label}
                            href={subItem.href}
                            onClick={() => {
                              if (subItem.view) {
                                setCurrentView(subItem.view);
                              }
                              setIsMobileOpen(false);
                            }}
                            className={`
                              w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left
                              transition-all duration-200
                              ${
                                isSubActive
                                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-l-4 border-blue-600 dark:border-blue-500 font-semibold'
                                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                              }
                            `}
                          >
                            <span className={isSubActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}>
                              {subItem.icon}
                            </span>
                            <span className={`text-sm ${isSubActive ? 'text-blue-700' : 'text-gray-600'}`}>
                              {subItem.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </nav>

          {/* Footer del Sidebar */}
          {!isSidebarCollapsed && (
            <div className="px-4 py-4 border-t border-blue-100">
              <p className="text-xs text-slate-500 text-center">
                © 2025 SGSO
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

