/**
 * Header - Barra superior de navegación
 * 
 * Header fijo que aparece en todas las páginas (excepto login)
 * 
 * @component
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Menu,
  Activity,
  Search,
  Bell,
  Sparkles,
  PlusCircle,
  LogOut,
  User,
  CreditCard,
  Shield,
  Gift
} from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';
import { useChat } from '../contexts/ChatContext';
import { supabase } from '../lib/supabase';

export default function Header() {
  const router = useRouter();
  const { currentView, setCurrentView, toggleSidebar } = useNavigation();
  const { toggleChat } = useChat();
  const [user, setUser] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Función para crear nuevo caso
  const handleCreateNew = () => {
    setCurrentView('NEW_CASE');
  };

  // Obtener información del usuario autenticado
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Función para cerrar sesión
  const handleLogout = async () => {
    try {
      setIsDropdownOpen(false);
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Obtener nombre completo del usuario
  const getUserDisplayName = () => {
    if (!user?.email) return 'Usuario';
    const emailParts = user.email.split('@')[0];
    // Capitalizar primera letra de cada palabra si hay puntos o guiones
    return emailParts
      .split(/[._-]/)
      .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  // Obtener iniciales para el avatar grande
  const getUserInitials = () => {
    if (!user?.email) return 'U';
    const emailParts = user.email.split('@')[0];
    const parts = emailParts.split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    const firstLetter = emailParts.charAt(0).toUpperCase();
    const secondLetter = emailParts.length > 1 ? emailParts.charAt(1).toUpperCase() : '';
    return firstLetter + secondLetter;
  };

  // Obtener iniciales para el avatar pequeño
  const getSmallAvatarInitials = () => {
    if (!user?.email) return 'U';
    const emailParts = user.email.split('@')[0];
    const firstLetter = emailParts.charAt(0).toUpperCase();
    const secondLetter = emailParts.length > 1 ? emailParts.charAt(1).toUpperCase() : '';
    return firstLetter + secondLetter;
  };

  return (
    <nav className="w-full h-16 bg-white border-b border-gray-200 sticky top-0 z-50 flex items-center justify-between px-4">
      {/* BLOQUE IZQUIERDO - Identidad Rígida */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Botón Menú Hamburguesa */}
        <button 
          onClick={toggleSidebar}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} className="text-gray-600" />
        </button>
        
        {/* Icono Logo */}
        <div className="bg-blue-600 text-white p-1.5 rounded-lg">
          <Activity className="h-5 w-5" />
        </div>
        
        {/* Título - Siempre lleva al módulo INICIO */}
        <div 
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => {
            setCurrentView('DASHBOARD');
            router.push('/');
          }}
        >
          <span className="text-lg font-bold text-gray-900 whitespace-nowrap">
            Sistema de Gestión de Salud Ocupacional
          </span>
        </div>
      </div>

      {/* BLOQUE CENTRAL - La 'Isla' de Búsqueda */}
      <div className="flex-1 flex justify-center items-center px-8">
        <div className="flex items-center w-full max-w-xl gap-2">
          {/* Input de Búsqueda con Icono */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Botón Asistente IA */}
          <button
            onClick={toggleChat}
            className="whitespace-nowrap bg-indigo-600 text-white px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-indigo-700 transition-colors"
          >
            <Sparkles size={18} />
            <span className="hidden md:inline">Asistente IA</span>
          </button>
        </div>
      </div>

      {/* BLOQUE DERECHO - Utilidades Rígida */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Link Soporte */}
        <a
          href="#"
          className="text-gray-700 hover:text-gray-900 text-sm font-medium transition-colors"
        >
          Soporte
        </a>

        {/* Campana Notificación */}
        <button
          className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Notificaciones"
        >
          <Bell size={20} className="text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        {/* Avatar Usuario con Dropdown */}
        {user && (
          <div className="relative flex items-center gap-2" ref={dropdownRef}>
            {/* Botones condicionales para Trabajo Modificado */}
            {(currentView === 'NEW_CASE' || currentView === 'EDIT_CASE') && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleCreateNew}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                >
                  <PlusCircle size={16} />
                  <span className="hidden lg:inline">Nuevo Caso</span>
                </button>
              </div>
            )}
            
            {/* Botón Avatar - Abre el dropdown */}
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="h-9 w-9 rounded-full bg-gray-800 flex items-center justify-center font-semibold text-white text-sm hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              aria-label="Menú de usuario"
            >
              {getSmallAvatarInitials()}
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-4 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50">
                {/* A. Cabecera de Usuario */}
                <div className="p-6 flex items-center gap-4">
                  {/* Avatar Grande */}
                  <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center font-semibold text-white text-lg flex-shrink-0">
                    {getUserInitials()}
                  </div>
                  {/* Info Usuario */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">
                      {getUserDisplayName()}
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                      {user.email}
                    </div>
                  </div>
                </div>

                {/* B. Lista de Opciones */}
                <div className="px-6 pb-4">
                  <button className="w-full flex items-center gap-3 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-left">
                    <User size={18} className="text-gray-400" />
                    <span className="text-sm">Perfil & Privacidad</span>
                  </button>
                  <button className="w-full flex items-center gap-3 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-left">
                    <CreditCard size={18} className="text-gray-400" />
                    <span className="text-sm">Facturación & Pagos</span>
                  </button>
                  <button className="w-full flex items-center gap-3 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-left">
                    <Shield size={18} className="text-gray-400" />
                    <span className="text-sm">Seguridad</span>
                  </button>
                  <button className="w-full flex items-center gap-3 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-left">
                    <Gift size={18} className="text-gray-400" />
                    <span className="text-sm">Refiere y Gana</span>
                  </button>
                </div>

                {/* C. Pie de Página - Logout */}
                <div className="border-t border-gray-100 mt-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    <LogOut size={18} className="text-gray-400" />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

