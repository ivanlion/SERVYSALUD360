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
  Activity
} from 'lucide-react';
import { useState } from 'react';

interface SidebarItem {
  label: string;
  icon: React.ReactNode;
  href: string;
}

const menuItems: SidebarItem[] = [
  {
    label: 'Panel Principal',
    icon: <LayoutDashboard size={20} />,
    href: '/'
  },
  {
    label: 'Trabajo Modificado',
    icon: <FileText size={20} />,
    href: '/'
  },
  {
    label: 'Vigilancia Médica',
    icon: <Stethoscope size={20} />,
    href: '/'
  },
  {
    label: 'Seguridad',
    icon: <Shield size={20} />,
    href: '/'
  },
  {
    label: 'Administración',
    icon: <Settings size={20} />,
    href: '/'
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // No mostrar sidebar en la página de login
  if (pathname === '/login') {
    return null;
  }

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
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-blue-100">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <Activity size={24} />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-slate-800 leading-tight">
                Sistema de Gestión
              </span>
              <span className="text-xs text-slate-500 leading-tight">
                Salud Ocupacional
              </span>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {/* Subtítulo MÓDULOS DE GESTIÓN */}
            <div className="px-4 mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                MÓDULOS DE GESTIÓN
              </p>
            </div>
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg
                    transition-all duration-200
                    ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-semibold'
                        : 'text-slate-600 hover:bg-blue-50/50 hover:text-blue-600'
                    }
                  `}
                >
                  <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span className="text-sm">{item.label}</span>
                </Link>
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

