/**
 * Header - Barra superior de navegación
 * 
 * Header fijo que aparece en todas las páginas (excepto login)
 * 
 * Optimizado con React.memo para prevenir re-renders innecesarios
 * cuando los valores de los contextos no cambian significativamente
 * 
 * @component
 */

'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
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
  Gift,
  ChevronDown,
  MessageSquare,
  History,
  BookOpen,
  BarChart2,
  Database
} from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';
import { useChat } from '../contexts/ChatContext';
import { useUser } from '../contexts/UserContext';
import { useNotifications } from '../contexts/NotificationContext';
import { logger } from '../utils/logger';
import { supabase } from '../lib/supabase';
import CompanySelector from './CompanySelector';
import { ThemeToggle, ThemeToggleCompact } from './ThemeToggle';

/**
 * Header optimizado con React.memo para prevenir re-renders
 * cuando las props no cambian. Como este componente no recibe props,
 * memo previene re-renders cuando los contextos cambian pero los valores
 * relevantes (user, profile, currentView) permanecen iguales.
 */
const Header = memo(() => {
  const router = useRouter();
  const { currentView, setCurrentView, toggleSidebar } = useNavigation();
  const { toggleChat } = useChat();
  const { user, profile } = useUser();
  const { showError } = useNotifications();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supportRef = useRef<HTMLDivElement>(null);

  // Función para crear nuevo caso (memoizada)
  const handleCreateNew = useCallback(() => {
    setCurrentView('NEW_CASE');
  }, [setCurrentView]);

  // Función para navegar al dashboard (memoizada)
  const handleGoToDashboard = useCallback(() => {
    setCurrentView('DASHBOARD');
    router.push('/');
  }, [setCurrentView, router]);

  // Función para toggle del dropdown de soporte (memoizada)
  const handleToggleSupport = useCallback(() => {
    setIsSupportOpen(prev => !prev);
  }, []);

  // Función para toggle del dropdown de usuario (memoizada)
  const handleToggleDropdown = useCallback(() => {
    setIsDropdownOpen(prev => !prev);
  }, []);


  // Función para cerrar sesión (memoizada)
  const handleLogout = useCallback(async () => {
    try {
      logger.debug('[Header] Iniciando cierre de sesión...');
      setIsDropdownOpen(false);
      
      // Cerrar sesión en Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.error(error instanceof Error ? error : new Error('Error al cerrar sesión'), {
          context: 'Header'
        });
        showError('Error al cerrar sesión. Por favor, intenta nuevamente.');
        return;
      }
      
      logger.debug('[Header] Sesión cerrada exitosamente, redirigiendo...');
      
      // Forzar recarga completa de la página para limpiar todo el estado
      // Usar replace en lugar de href para evitar problemas de navegación
      window.location.replace('/login');
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error('Error inesperado al cerrar sesión'), {
        context: 'Header'
      });
      // Aun si hay error, redirigir al login
      window.location.replace('/login');
    }
  }, [showError]);

  // Cerrar dropdown del perfil al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (supportRef.current && !supportRef.current.contains(event.target as Node)) {
        setIsSupportOpen(false);
      }
    };

    if (isDropdownOpen || isSupportOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, isSupportOpen]);

  // Obtener nombre completo del usuario (memoizado)
  const getUserDisplayName = useMemo(() => {
    // Prioridad 1: full_name desde profiles
    if (profile?.full_name) {
      return profile.full_name;
    }
    
    // Prioridad 2: full_name desde user_metadata
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    
    // Prioridad 3: nombre desde user_metadata
    if (user?.user_metadata?.nombre) {
      return user.user_metadata.nombre;
    }
    
    // Fallback: usar email si no hay nombre
    if (!user?.email) return 'Usuario';
    const emailParts = user.email.split('@')[0];
    return emailParts.charAt(0).toUpperCase() + emailParts.slice(1);
  }, [profile, user]);

  // Obtener iniciales desde el nombre completo (memoizado)
  const getInitialsFromName = useCallback((name: string): string => {
    if (!name) return 'U';
    
    // Dividir el nombre en palabras
    const words = name.trim().split(/\s+/);
    
    if (words.length >= 2) {
      // Si hay al menos 2 palabras, usar primera letra de cada una
      return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    } else if (words.length === 1) {
      // Si hay una sola palabra, usar las primeras 2 letras
      const word = words[0];
      const firstLetter = word.charAt(0).toUpperCase();
      const secondLetter = word.length > 1 ? word.charAt(1).toUpperCase() : '';
      return firstLetter + secondLetter;
    }
    
    return 'U';
  }, []);

  // Obtener iniciales para el avatar grande (memoizado)
  const getUserInitials = useMemo(() => {
    return getInitialsFromName(getUserDisplayName);
  }, [getUserDisplayName, getInitialsFromName]);

  // Obtener iniciales para el avatar pequeño (memoizado)
  const getSmallAvatarInitials = useMemo(() => {
    return getInitialsFromName(getUserDisplayName);
  }, [getUserDisplayName, getInitialsFromName]);

      return (
        <nav className="w-full h-14 md:h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 flex items-center justify-between px-3 md:px-4 lg:px-6 transition-colors">
          {/* BLOQUE IZQUIERDO - Identidad Rígida */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0 min-w-0">
            {/* Botón Menú Hamburguesa */}
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Toggle sidebar"
            >
              <Menu size={20} className="text-gray-600 dark:text-gray-300" />
            </button>

            {/* Icono Logo */}
            <div className="bg-blue-600 dark:bg-blue-500 text-white p-1.5 rounded-lg shrink-0">
              <Activity className="h-4 w-4 md:h-5 md:w-5" />
            </div>

            {/* Título - Siempre lleva al módulo INICIO */}
            <div
              className="cursor-pointer hover:opacity-80 transition-opacity min-w-0"
              onClick={handleGoToDashboard}
            >
              <span className="text-sm md:text-base lg:text-lg font-bold text-gray-900 dark:text-white truncate block">
                <span className="hidden sm:inline">Sistema de Gestión de Salud Ocupacional</span>
                <span className="sm:hidden">SERVYSALUD360</span>
              </span>
            </div>
          </div>

          {/* BLOQUE CENTRAL - La 'Isla' de Búsqueda */}
          <div className="hidden md:flex flex-1 justify-center items-center px-4 lg:px-8">
            <div className="flex items-center w-full max-w-xl gap-2">
              {/* Input de Búsqueda con Icono */}
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
                />
              </div>

              {/* Botón Asistente IA */}
              <button
                onClick={toggleChat}
                className="whitespace-nowrap bg-indigo-600 dark:bg-indigo-500 text-white px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors min-h-[44px]"
              >
                <Sparkles size={18} />
                <span className="hidden lg:inline">Asistente IA</span>
              </button>
            </div>
          </div>

          {/* BLOQUE DERECHO - Utilidades Rígida */}
          <div className="flex items-center gap-2 md:gap-3 lg:gap-4 shrink-0">
            {/* Toggle de Tema */}
            <div className="hidden md:block">
              <ThemeToggle />
            </div>
            <div className="md:hidden">
              <ThemeToggleCompact />
            </div>

            {/* Botón Asistente IA - Solo en móvil */}
            <button
              onClick={toggleChat}
              className="md:hidden p-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Asistente IA"
            >
              <Sparkles size={20} />
            </button>

            {/* Selector de Empresa */}
            <div className="hidden sm:block">
              <CompanySelector />
            </div>

            {/* Soporte con Dropdown - Oculto en móvil */}
            <div className="hidden lg:block relative" ref={supportRef}>
              <button
                onClick={handleToggleSupport}
                className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900 rounded-lg px-2 py-1 min-h-[44px]"
                aria-label="Menú de soporte"
              >
                <span>Soporte</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${isSupportOpen ? 'rotate-180' : ''}`}
                />
              </button>

          {/* Dropdown Menu de Soporte */}
          {isSupportOpen && (
            <div className="absolute top-full mt-4 right-0 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50">
              <div className="py-2">
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
                  <MessageSquare size={18} className="text-gray-400 dark:text-gray-500" />
                  <span>Contactar A Soporte</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
                  <History size={18} className="text-gray-400 dark:text-gray-500" />
                  <span>Historial De Soporte</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
                  <BookOpen size={18} className="text-gray-400 dark:text-gray-500" />
                  <span>Centro De Ayuda</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
                  <BarChart2 size={18} className="text-gray-400 dark:text-gray-500" />
                  <span>Estado Del Sistema</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
                  <Database size={18} className="text-gray-400 dark:text-gray-500" />
                  <span>Centros De Datos</span>
                </button>
              </div>
            </div>
          )}
        </div>

            {/* Campana Notificación */}
            <button
              className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Notificaciones"
            >
              <Bell size={20} className="text-gray-600 dark:text-gray-300" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 dark:bg-red-600 rounded-full border-2 border-white dark:border-gray-900"></span>
            </button>

        {/* Avatar Usuario con Dropdown */}
        {user && (
          <div className="relative flex items-center gap-2" ref={dropdownRef}>
            {/* Botón "Nuevo Caso" solo aparece cuando se está editando un caso, NO cuando se está creando uno nuevo */}
            {currentView === 'EDIT_CASE' && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleCreateNew}
                  className="px-3 py-1.5 bg-blue-600 dark:bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center gap-1.5"
                >
                  <PlusCircle size={16} />
                  <span className="hidden lg:inline">Nuevo Caso</span>
                </button>
              </div>
            )}
            
            {/* Botón Avatar - Abre el dropdown */}
            <button
              onClick={handleToggleDropdown}
              className="h-9 w-9 rounded-full bg-gray-800 dark:bg-gray-700 flex items-center justify-center font-semibold text-white text-sm hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              aria-label="Menú de usuario"
            >
              {getSmallAvatarInitials}
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-4 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50">
                {/* A. Cabecera de Usuario */}
                <div className="p-6 flex items-center gap-4">
                  {/* Avatar Grande */}
                  <div className="w-12 h-12 rounded-full bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center font-semibold text-white text-lg flex-shrink-0">
                    {getUserInitials}
                  </div>
                  {/* Info Usuario */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-white truncate">
                      {getUserDisplayName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {user.email}
                    </div>
                  </div>
                </div>

                {/* B. Lista de Opciones */}
                <div className="px-6 pb-4">
                  <button className="w-full flex items-center gap-3 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left">
                    <User size={18} className="text-gray-400 dark:text-gray-500" />
                    <span className="text-sm">Perfil & Privacidad</span>
                  </button>
                  <button className="w-full flex items-center gap-3 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left">
                    <CreditCard size={18} className="text-gray-400 dark:text-gray-500" />
                    <span className="text-sm">Facturación & Pagos</span>
                  </button>
                  <button className="w-full flex items-center gap-3 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left">
                    <Shield size={18} className="text-gray-400 dark:text-gray-500" />
                    <span className="text-sm">Seguridad</span>
                  </button>
                  <button className="w-full flex items-center gap-3 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left">
                    <Gift size={18} className="text-gray-400 dark:text-gray-500" />
                    <span className="text-sm">Refiere y Gana</span>
                  </button>
                </div>

                {/* C. Pie de Página - Logout */}
                <div className="border-t border-gray-100 dark:border-gray-700 mt-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                  >
                    <LogOut size={18} className="text-gray-400 dark:text-gray-500" />
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
});

Header.displayName = 'Header';

export default Header;

