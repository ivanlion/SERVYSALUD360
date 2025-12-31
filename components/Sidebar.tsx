/**
 * Sidebar - Componente de navegación lateral
 * 
 * Sidebar estilo HealthGuard con menú de navegación
 * 
 * @component
 */

'use client';

import React, { useState, useMemo } from 'react';
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
  History,
  ClipboardList,
  Calendar,
  GraduationCap,
  AlertTriangle,
  Search,
  BarChart3,
  UserCheck
} from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';
import { useUser } from '../contexts/UserContext';
import { logger } from '../utils/logger';
import { isSuperAdmin, isAdminUser, getEffectivePermission } from '../utils/auth-helpers';

interface SidebarItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  view?: 
    | 'DASHBOARD' 
    | 'NEW_CASE' 
    | 'EDIT_CASE' 
    | 'ACCESS_MANAGEMENT' 
    | 'WORK_MODIFIED_DASHBOARD' 
    | 'VIGILANCIA_MEDICA' 
    | 'UPLOAD_EMO' 
    | 'GESTION_EMPRESAS' 
    | 'LEY29733' 
    | 'HISTORIAL_ANALISIS'
    | 'PLAN_ANUAL_SST'
    | 'AUSENTISMO_LABORAL'
    | 'CAPACITACIONES_SST'
    | 'COMITE_SST'
    | 'ACCIDENTES_INCIDENTES'
    | 'INSPECCIONES_SST'
    | 'INDICADORES_SST'
    | 'GESTION_TRABAJADORES';
  hasSubItems?: boolean;
  section?: string; // Para agrupar items en secciones
}

// Sección: Vigilancia Médica
const vigilanciaMedicaItems: SidebarItem[] = [
  {
    label: 'Exámenes Médicos',
    icon: <Stethoscope size={20} />,
    href: '/',
    view: 'VIGILANCIA_MEDICA' as const,
    section: 'vigilancia'
  },
  {
    label: 'Análisis de EMOs',
    icon: <Activity size={20} />,
    href: '/',
    view: 'UPLOAD_EMO' as const,
    section: 'vigilancia'
  },
  {
    label: 'Historial de Análisis',
    icon: <History size={20} />,
    href: '/',
    view: 'HISTORIAL_ANALISIS' as const,
    section: 'vigilancia'
  }
];

// Sección: Trabajo Modificado
const trabajoModificadoItems: SidebarItem[] = [
  {
    label: 'Dashboard de Casos',
    icon: <FileText size={20} />,
    href: '/',
    view: 'WORK_MODIFIED_DASHBOARD' as const,
    section: 'trabajo'
  },
  {
    label: 'Nuevo Caso',
    icon: <FileText size={20} />,
    href: '/',
    view: 'NEW_CASE' as const,
    section: 'trabajo'
  }
];

// Sección: Gestión de SST
const gestionSSTItems: SidebarItem[] = [
  {
    label: 'Plan Anual SST',
    icon: <ClipboardList size={20} />,
    href: '/',
    view: 'PLAN_ANUAL_SST' as const,
    section: 'sst'
  },
  {
    label: 'Ausentismo Laboral',
    icon: <Calendar size={20} />,
    href: '/',
    view: 'AUSENTISMO_LABORAL' as const,
    section: 'sst'
  },
  {
    label: 'Capacitaciones',
    icon: <GraduationCap size={20} />,
    href: '/',
    view: 'CAPACITACIONES_SST' as const,
    section: 'sst'
  },
  {
    label: 'Comité SST',
    icon: <Users size={20} />,
    href: '/',
    view: 'COMITE_SST' as const,
    section: 'sst'
  },
  {
    label: 'Accidentes e Incidentes',
    icon: <AlertTriangle size={20} />,
    href: '/',
    view: 'ACCIDENTES_INCIDENTES' as const,
    section: 'sst'
  },
  {
    label: 'Inspecciones',
    icon: <Search size={20} />,
    href: '/',
    view: 'INSPECCIONES_SST' as const,
    section: 'sst'
  },
  {
    label: 'Indicadores SST',
    icon: <BarChart3 size={20} />,
    href: '/',
    view: 'INDICADORES_SST' as const,
    section: 'sst'
  }
];

// Sección: Gestión de Personal
const gestionPersonalItems: SidebarItem[] = [
  {
    label: 'Trabajadores',
    icon: <UserCheck size={20} />,
    href: '/',
    view: 'GESTION_TRABAJADORES' as const,
    section: 'personal'
  },
  {
    label: 'Gestión de Empresas',
    icon: <Building2 size={20} />,
    href: '/',
    view: 'GESTION_EMPRESAS' as const,
    section: 'personal'
  }
];

// Items individuales (sin sección)
const individualItems: SidebarItem[] = [
  {
    label: 'Inicio',
    icon: <LayoutDashboard size={20} />,
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
  const { currentView, setCurrentView, isSidebarCollapsed } = useNavigation();
  
  // OPTIMIZACIÓN: Usar UserContext en lugar de hacer consultas duplicadas a Supabase
  const { user, profile } = useUser();
  
  // Obtener email, rol y permisos desde el contexto (ya cargado)
  const userEmail = user?.email || null;
  const userRole = profile?.role || user?.user_metadata?.role || user?.user_metadata?.rol || null;
  
  // Calcular permisos desde el perfil del contexto
  const userPermissions = useMemo(() => {
    if (!profile?.permissions && !user?.user_metadata?.permissions) {
      // Si no hay permisos, usar helper para determinar según rol
      const defaultPermission = isSuperAdmin(userEmail) || isAdminUser(userEmail, userRole || undefined) 
        ? 'write' 
        : 'none';
      return {
        trabajoModificado: defaultPermission,
        vigilanciaMedica: defaultPermission,
        seguimientoTrabajadores: defaultPermission,
        seguridadHigiene: defaultPermission,
      };
    }
    
    // Obtener permisos del JSONB usando helper que considera Super Admin
    const permissions = profile?.permissions || user?.user_metadata?.permissions || {};
    return {
      trabajoModificado: getEffectivePermission(
        userEmail,
        userRole || undefined,
        permissions.trabajo_modificado || permissions.trabajoModificado
      ),
      vigilanciaMedica: getEffectivePermission(
        userEmail,
        userRole || undefined,
        permissions.vigilancia_medica || permissions.vigilanciaMedica
      ),
      seguimientoTrabajadores: getEffectivePermission(
        userEmail,
        userRole || undefined,
        permissions.seguimiento_trabajadores || permissions.seguimientoTrabajadores
      ),
      seguridadHigiene: getEffectivePermission(
        userEmail,
        userRole || undefined,
        permissions.seguridad_higiene || permissions.seguridadHigiene
      ),
    };
  }, [profile, user, userEmail, userRole]);

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

  // Helper function para renderizar items
  const renderMenuItem = (item: SidebarItem) => {
    const isActive = item.view === currentView || 
      (item.label === 'Inicio' && currentView === 'DASHBOARD') ||
      (item.label === 'Administración' && (currentView === 'ACCESS_MANAGEMENT' || pathname === '/dashboard/admin'));

    return (
      <button
        key={item.label}
        onClick={() => {
          if (item.hasSubItems && isAdmin) {
            handleItemClick(item);
            return;
          }
          if (item.hasSubItems) {
            return;
          }
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
    );
  };

  // Helper function para renderizar sección
  const renderSection = (title: string, icon: React.ReactNode, items: SidebarItem[]) => {
    if (isSidebarCollapsed) {
      // Si está colapsado, mostrar solo el icono de la sección
      return (
        <div key={title} className="flex flex-col items-center space-y-2">
          <div className="text-gray-400 dark:text-gray-500">
            {icon}
          </div>
          {items.map(item => renderMenuItem(item))}
        </div>
      );
    }

    return (
      <div key={title} className="space-y-2">
        <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          <span className="text-gray-400 dark:text-gray-500">{icon}</span>
          <span>{title}</span>
        </div>
        <div className="space-y-1">
          {items.map(item => renderMenuItem(item))}
        </div>
      </div>
    );
  };

  const handleItemClick = (item: SidebarItem) => {
    if (item.view) {
      setCurrentView(item.view);
    }
    
    // Navegación según el módulo
    if (item.label === 'Inicio') {
      router.push('/');
      setCurrentView('DASHBOARD');
    } else if (item.label === 'Dashboard de Casos' || item.label === 'Nuevo Caso') {
      logger.debug('[Sidebar] Navegando a Trabajo Modificado');
      router.push('/');
    } else if (item.label === 'Exámenes Médicos' || item.label === 'Análisis de EMOs' || item.label === 'Historial de Análisis') {
      router.push('/');
    } else if (item.label === 'Gestión de Empresas') {
      router.push('/');
      setCurrentView('GESTION_EMPRESAS');
    } else if (item.label === 'Trabajadores') {
      router.push('/');
      setCurrentView('GESTION_TRABAJADORES');
    } else if (item.label === 'Ley 29733') {
      router.push('/');
      setCurrentView('LEY29733');
    } else if (item.label === 'Administración') {
      // Si es administrador, puede acceder directamente
      if (isAdmin) {
        router.push('/dashboard/admin');
        setCurrentView('ACCESS_MANAGEMENT');
      }
    } else if (item.view) {
      // Para todas las nuevas vistas SST, simplemente navegar
      router.push('/');
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
          <nav className={`flex-1 py-4 space-y-4 overflow-y-auto ${isSidebarCollapsed ? 'px-2' : 'px-4'}`}>
            {/* Inicio */}
            {renderMenuItem(individualItems[0])}

            {/* Sección: Vigilancia Médica */}
            {renderSection('Vigilancia Médica', <Heart size={16} />, vigilanciaMedicaItems)}

            {/* Sección: Trabajo Modificado */}
            {renderSection('Trabajo Modificado', <FileText size={16} />, trabajoModificadoItems)}

            {/* Sección: Gestión de SST */}
            {renderSection('Gestión de SST', <Shield size={16} />, gestionSSTItems)}

            {/* Sección: Gestión de Personal */}
            {renderSection('Gestión de Personal', <Users size={16} />, gestionPersonalItems)}

            {/* Ley 29733 */}
            {renderMenuItem(individualItems[1])}

            {/* Administración */}
            {isAdmin && (
              <React.Fragment>
                {renderMenuItem(individualItems[2])}
                {!isSidebarCollapsed && (
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
            )}
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

