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
import { supabase } from '../lib/supabase';

export default function Header() {
  const router = useRouter();
  const { currentView, setCurrentView, toggleSidebar } = useNavigation();
  const { toggleChat } = useChat();
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supportRef = useRef<HTMLDivElement>(null);

  // Función para crear nuevo caso
  const handleCreateNew = () => {
    setCurrentView('NEW_CASE');
  };

  // Obtener información del usuario autenticado y su perfil
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      // Obtener perfil del usuario desde la tabla profiles
      if (user?.id) {
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
          
          if (!error && profile) {
            setUserProfile(profile);
          }
        } catch (error) {
          console.error('Error al obtener perfil del usuario:', error);
        }
      }
    };
    getUser();

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUser(session.user);
        
        // Obtener perfil del usuario
        if (session.user?.id) {
          try {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', session.user.id)
              .single();
            
            if (!error && profile) {
              setUserProfile(profile);
            }
          } catch (error) {
            console.error('Error al obtener perfil del usuario:', error);
          }
        }
      } else {
        setUser(null);
        setUserProfile(null);
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

  // Obtener nombre completo del usuario
  const getUserDisplayName = () => {
    // Prioridad 1: full_name desde profiles
    if (userProfile?.full_name) {
      return userProfile.full_name;
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
  };

  // Obtener iniciales desde el nombre completo
  const getInitialsFromName = (name: string): string => {
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
  };

  // Obtener iniciales para el avatar grande
  const getUserInitials = () => {
    const displayName = getUserDisplayName();
    return getInitialsFromName(displayName);
  };

  // Obtener iniciales para el avatar pequeño
  const getSmallAvatarInitials = () => {
    const displayName = getUserDisplayName();
    return getInitialsFromName(displayName);
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
        {/* Soporte con Dropdown */}
        <div className="relative" ref={supportRef}>
          <button
            onClick={() => setIsSupportOpen(!isSupportOpen)}
            className="flex items-center gap-1.5 text-gray-700 hover:text-gray-900 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-lg px-2 py-1"
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
            <div className="absolute top-full mt-4 right-0 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50">
              <div className="py-2">
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left">
                  <MessageSquare size={18} className="text-gray-400" />
                  <span>Contactar A Soporte</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left">
                  <History size={18} className="text-gray-400" />
                  <span>Historial De Soporte</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left">
                  <BookOpen size={18} className="text-gray-400" />
                  <span>Centro De Ayuda</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left">
                  <BarChart2 size={18} className="text-gray-400" />
                  <span>Estado Del Sistema</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left">
                  <Database size={18} className="text-gray-400" />
                  <span>Centros De Datos</span>
                </button>
              </div>
            </div>
          )}
        </div>

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

