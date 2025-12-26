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
  Users
} from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';
import { supabase } from '../lib/supabase';

interface SidebarItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  view?: 'DASHBOARD' | 'NEW_CASE' | 'EDIT_CASE' | 'ACCESS_MANAGEMENT' | 'WORK_MODIFIED_DASHBOARD';
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
    icon: <Stethoscope size={20} />,
    href: '/',
    view: 'DASHBOARD' as const
  },
  {
    label: 'Seguridad',
    icon: <Shield size={20} />,
    href: '/',
    view: 'DASHBOARD' as const
  },
  {
    label: 'Administración',
    icon: <Settings size={20} />,
    href: '/',
    view: 'DASHBOARD' as const,
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
            setUserRole(profile.rol || profile.role || null);
            
            // Obtener permisos del JSONB
            if (profile.permissions && typeof profile.permissions === 'object') {
              // Normalizar permisos (pueden venir como boolean o string)
              const normalizePermission = (value: any): 'none' | 'read' | 'write' => {
                if (typeof value === 'boolean') {
                  return value ? 'write' : 'none';
                }
                if (typeof value === 'string' && ['none', 'read', 'write'].includes(value)) {
                  return value as 'none' | 'read' | 'write';
                }
                return 'none';
              };

              setUserPermissions({
                trabajoModificado: normalizePermission(
                  profile.permissions.trabajo_modificado || profile.permissions.trabajoModificado
                ),
                vigilanciaMedica: normalizePermission(
                  profile.permissions.vigilancia_medica || profile.permissions.vigilanciaMedica
                ),
                seguimientoTrabajadores: normalizePermission(
                  profile.permissions.seguimiento_trabajadores || profile.permissions.seguimientoTrabajadores
                ),
                seguridadHigiene: normalizePermission(
                  profile.permissions.seguridad_higiene || profile.permissions.seguridadHigiene
                ),
              });
            }
          } else {
            // Si no hay perfil, obtener desde user_metadata
            const role = user.user_metadata?.rol || user.user_metadata?.role || null;
            setUserRole(role);
          }
        }
      } catch (error) {
        console.error('Error al obtener rol y permisos del usuario:', error);
      }
    };

    getUserRoleAndPermissions();
  }, []);

  // Verificar si el usuario es administrador
  const isAdmin = userRole === 'Administrador' || userRole === 'Admin';

  // Función helper para verificar si el usuario tiene acceso a un módulo
  const hasModuleAccess = (moduleKey: keyof typeof userPermissions): boolean => {
    if (isAdmin) return true; // Administradores tienen acceso a todo
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
    } else if (item.label === 'Trabajo Modificado') {
      router.push('/');
      setCurrentView('WORK_MODIFIED_DASHBOARD');
    } else if (item.label === 'Vigilancia Médica') {
      router.push('/');
      setCurrentView('DASHBOARD'); // Por ahora lleva al dashboard principal
    } else if (item.label === 'Seguridad') {
      router.push('/');
      setCurrentView('DASHBOARD'); // Por ahora lleva al dashboard principal
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
          bg-white border-r border-blue-100
          transform transition-all duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isSidebarCollapsed ? 'w-16' : 'w-64'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Menu Items */}
          <nav className={`flex-1 py-4 space-y-2 overflow-y-auto ${isSidebarCollapsed ? 'px-2' : 'px-4'}`}>
            {menuItems.map((item) => {
              // Lógica mejorada para determinar si un item está activo
              const isActive = item.view === currentView && 
                (currentView !== 'ACCESS_MANAGEMENT' || item.label === 'Administración');
              const isAdminActive = item.label === 'Administración' && 
                (currentView === 'ACCESS_MANAGEMENT' || pathname === '/dashboard/admin');
              
              return (
                <React.Fragment key={item.label}>
                  <button
                    onClick={() => {
                      // Si tiene sub-items (Administración) y es admin, permitir acceso directo
                      if (item.hasSubItems && isAdmin) {
                        handleItemClick(item);
                        return;
                      }
                      // Si tiene sub-items pero no es admin, solo mostrar/ocultar sub-items
                      if (item.hasSubItems) {
                        return;
                      }
                      // Para otros items, cambiar la vista normalmente
                      handleItemClick(item);
                    }}
                    className={`
                      w-full flex items-center rounded-lg text-left transition-all duration-200
                      ${isSidebarCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3'}
                      ${
                        isActive || (item.label === 'Administración' && currentView === 'ACCESS_MANAGEMENT')
                          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-semibold'
                          : 'text-slate-600 hover:bg-blue-50/50 hover:text-blue-600'
                      }
                      ${!isAdmin && item.label === 'Administración' ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    title={isSidebarCollapsed ? item.label : undefined}
                    disabled={!isAdmin && item.label === 'Administración'}
                  >
                    <span className={isActive || (item.label === 'Administración' && currentView === 'ACCESS_MANAGEMENT') ? 'text-blue-600' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    {!isSidebarCollapsed && (
                      <span className="text-sm">{item.label}</span>
                    )}
                  </button>
                  
                  {/* Sub-items de Administración - Solo mostrar si no está colapsado */}
                  {item.hasSubItems && !isSidebarCollapsed && (
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
                                  ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-semibold'
                                  : 'text-slate-600 hover:bg-blue-50/50 hover:text-blue-600'
                              }
                            `}
                          >
                            <span className={isSubActive ? 'text-blue-600' : 'text-slate-400'}>
                              {subItem.icon}
                            </span>
                            <span className="text-sm">{subItem.label}</span>
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

