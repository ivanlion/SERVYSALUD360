/**
 * Dashboard - Componente principal con Grid de Tarjetas estilo HealthGuard
 * 
 * Muestra un grid de tarjetas interactivas para navegar por las diferentes secciones
 * 
 * @component
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { CaseData } from '../types';
import { Briefcase, Heart, Shield, Settings, Users } from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';
import { supabase } from '../lib/supabase';

interface DashboardProps {
  onEdit: (data: CaseData) => void;
  onCreate: () => void;
  user?: any; // Datos del usuario para el saludo
}

export default function Dashboard({ onEdit, onCreate, user }: DashboardProps) {
  const { setCurrentView } = useNavigation();
  const [userName, setUserName] = useState<string>('Usuario');
  
  // Obtener nombre completo del usuario desde el perfil
  useEffect(() => {
    const getUserName = async () => {
      if (!user?.id) {
        setUserName('Usuario');
        return;
      }

      try {
        // Intentar obtener el nombre desde la tabla profiles
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (!error && profile?.full_name) {
          setUserName(profile.full_name);
        } else {
          // Si no hay perfil, intentar desde user_metadata
          const fullName = user.user_metadata?.full_name || user.user_metadata?.nombre;
          if (fullName) {
            setUserName(fullName);
          } else {
            // Fallback: usar email si no hay nombre
            const emailParts = user.email?.split('@')[0] || 'Usuario';
            setUserName(emailParts.charAt(0).toUpperCase() + emailParts.slice(1));
          }
        }
      } catch (error) {
        console.error('Error al obtener nombre del usuario:', error);
        // Fallback: usar email si hay error
        const emailParts = user.email?.split('@')[0] || 'Usuario';
        setUserName(emailParts.charAt(0).toUpperCase() + emailParts.slice(1));
      }
    };

    getUserName();
  }, [user]);

  // Tarjetas del dashboard (memoizadas para evitar re-renders)
  const dashboardCards = useMemo(() => [
    {
      id: 'trabajo-modificado',
      title: 'Trabajo Modificado',
      icon: <Briefcase size={28} />,
      description: 'Gestión de casos y restricciones laborales',
      color: 'blue',
      onClick: () => setCurrentView('WORK_MODIFIED_DASHBOARD'),
      featured: false
    },
    {
      id: 'vigilancia-medica',
      title: 'Vigilancia Médica',
      icon: <Heart size={28} />,
      description: 'Seguimiento de exámenes y evaluaciones',
      color: 'red',
      onClick: () => {},
      featured: false
    },
    {
      id: 'seguimiento-trabajadores',
      title: 'Seguimiento de Trabajadores',
      icon: <Users size={28} />,
      description: 'Monitoreo de trabajadores y casos activos',
      color: 'green',
      onClick: () => {},
      featured: false
    },
    {
      id: 'seguridad-higiene',
      title: 'Seguridad e Higiene',
      icon: <Shield size={28} />,
      description: 'Control de seguridad y protocolos',
      color: 'purple',
      onClick: () => {},
      featured: false
    },
    {
      id: 'administracion',
      title: 'Administración',
      icon: <Settings size={28} />,
      description: 'Configuración y gestión del sistema',
      color: 'dark',
      onClick: () => setCurrentView('ACCESS_MANAGEMENT'),
      featured: true
    }
  ], [setCurrentView]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Saludo de Bienvenida - Estilo minimalista */}
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-gray-900">
          Bienvenido, {userName}
        </h1>
      </div>

      {/* Grid de Tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {dashboardCards.map((card) => {
          const isFeatured = card.featured;
          
          // Colores para los iconos según el tipo de tarjeta
          const iconColors = {
            blue: 'bg-blue-50 text-blue-600',
            red: 'bg-red-50 text-red-600',
            green: 'bg-green-50 text-green-600',
            purple: 'bg-purple-50 text-purple-600',
            dark: 'bg-white/10 text-white'
          };

          // Contenido de la tarjeta
          const cardContent = (
            <div
              className={`
                relative p-6 rounded-2xl shadow-sm border border-gray-100 transition-all duration-200
                transform hover:scale-[1.02] hover:shadow-md cursor-pointer
                ${isFeatured 
                  ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700' 
                  : 'bg-white text-gray-900 hover:border-gray-200'
                }
                text-left w-full
              `}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`
                  p-2.5 rounded-lg
                  ${iconColors[card.color as keyof typeof iconColors]}
                `}>
                  {card.icon}
                </div>
                {isFeatured && (
                  <span className="px-2.5 py-1 text-xs font-semibold bg-white/20 rounded-md text-white">
                    Destacado
                  </span>
                )}
              </div>
              <h3 className={`
                text-xl font-bold mb-2
                ${isFeatured ? 'text-white' : 'text-gray-900'}
              `}>
                {card.title}
              </h3>
              <p className={`
                text-sm
                ${isFeatured ? 'text-white/90' : 'text-gray-500'}
              `}>
                {card.description}
              </p>
            </div>
          );

          // Si es Administración, envolver con Link
          if (card.id === 'administracion') {
            return (
              <Link
                key={card.id}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  card.onClick();
                }}
                className="block"
              >
                {cardContent}
              </Link>
            );
          }

          // Para otras tarjetas, usar button normal
          return (
            <button
              key={card.id}
              onClick={card.onClick}
              className="w-full"
            >
              {cardContent}
            </button>
          );
        })}
      </div>
    </div>
  );
}
