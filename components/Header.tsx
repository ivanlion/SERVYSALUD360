/**
 * Header - Barra superior de navegación
 * 
 * Header fijo que aparece en todas las páginas (excepto login)
 * 
 * @component
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Menu,
  Activity,
  Search,
  Bell,
  Sparkles,
  PlusCircle,
  LogOut
} from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';
import { useChat } from '../contexts/ChatContext';
import { supabase } from '../lib/supabase';

export default function Header() {
  const router = useRouter();
  const { currentView, setCurrentView, toggleSidebar } = useNavigation();
  const { toggleChat } = useChat();
  const [user, setUser] = useState<any>(null);

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
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
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

        {/* Avatar Usuario */}
        {user && (
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-gray-800 flex items-center justify-center font-semibold text-white text-sm">
              {(() => {
                if (!user.email) return 'U';
                const emailParts = user.email.split('@')[0];
                const firstLetter = emailParts.charAt(0).toUpperCase();
                const secondLetter = emailParts.length > 1 ? emailParts.charAt(1).toUpperCase() : '';
                return firstLetter + secondLetter;
              })()}
            </div>
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
                <button 
                  onClick={handleLogout}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-1.5"
                  title="Cerrar sesión"
                >
                  <LogOut size={16} />
                  <span className="hidden lg:inline">Salir</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

