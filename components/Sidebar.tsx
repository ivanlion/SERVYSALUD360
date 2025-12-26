/**
 * Sidebar - Componente de navegación lateral
 * 
 * Sidebar estilo HealthGuard con menú de navegación
 * 
 * @component
 */

'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
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
import { useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';

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
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { currentView, setCurrentView } = useNavigation();

  // No mostrar sidebar en la página de login
  if (pathname === '/login') {
    return null;
  }

  const handleItemClick = (item: SidebarItem) => {
    if (item.view) {
      setCurrentView(item.view);
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
          w-64 bg-white border-r border-blue-100
          transform transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Menu Items */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {/* Subtítulo MÓDULOS DE GESTIÓN */}
            <div className="px-4 mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                MÓDULOS DE GESTIÓN
              </p>
            </div>
            {menuItems.map((item) => {
              const isActive = item.view === currentView && currentView !== 'ACCESS_MANAGEMENT';
              const isAdminActive = item.label === 'Administración' && (currentView === 'ACCESS_MANAGEMENT' || currentView === 'DASHBOARD');
              
              return (
                <React.Fragment key={item.label}>
                  <button
                    onClick={() => {
                      if (item.hasSubItems && currentView !== 'ACCESS_MANAGEMENT') {
                        // Si es Administración y no estamos en ACCESS_MANAGEMENT, no hacer nada (solo mostrar sub-items)
                        return;
                      }
                      handleItemClick(item);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left
                      transition-all duration-200
                      ${
                        isActive || (item.label === 'Administración' && currentView === 'ACCESS_MANAGEMENT')
                          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-semibold'
                          : 'text-slate-600 hover:bg-blue-50/50 hover:text-blue-600'
                      }
                    `}
                  >
                    <span className={isActive || (item.label === 'Administración' && currentView === 'ACCESS_MANAGEMENT') ? 'text-blue-600' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span className="text-sm">{item.label}</span>
                  </button>
                  
                  {/* Sub-items de Administración - Siempre mostrar cuando Administración está en el menú */}
                  {item.hasSubItems && (
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
          <div className="px-4 py-4 border-t border-blue-100">
            <p className="text-xs text-slate-500 text-center">
              © 2025 SGSO
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

