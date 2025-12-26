/**
 * Dashboard - Componente principal con Grid de Tarjetas estilo HealthGuard
 * 
 * Muestra un grid de tarjetas interactivas para navegar por las diferentes secciones
 * 
 * @component
 */

'use client';

import React from 'react';
import { CaseData } from '../types';
import { Briefcase, Heart, Shield, Settings, Users } from 'lucide-react';

interface DashboardProps {
  onEdit: (data: CaseData) => void;
  onCreate: () => void;
  user?: any; // Datos del usuario para el saludo
}

export default function Dashboard({ onEdit, onCreate, user }: DashboardProps) {
  // Obtener nombre del usuario del email
  const getUserName = () => {
    if (!user?.email) return 'Usuario';
    const emailParts = user.email.split('@')[0];
    return emailParts.charAt(0).toUpperCase() + emailParts.slice(1);
  };

  const userName = getUserName();

  // Tarjetas del dashboard
  const dashboardCards = [
    {
      id: 'trabajo-modificado',
      title: 'Trabajo Modificado',
      icon: <Briefcase size={28} />,
      description: 'Gestión de casos y restricciones laborales',
      color: 'blue',
      onClick: onCreate,
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
      onClick: () => {},
      featured: true
    }
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      
      {/* Saludo de Bienvenida */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-sm p-6 sm:p-8 text-white">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          Bienvenido, {userName}
        </h1>
        <p className="text-blue-100 text-sm sm:text-base">
          Sistema de Gestión de Salud Ocupacional
        </p>
      </div>

      {/* Grid de Tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardCards.map((card) => {
          const isFeatured = card.featured;
          const colorClasses = {
            blue: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
            red: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',
            green: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
            purple: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
            dark: 'bg-slate-800 border-slate-700 text-white hover:bg-slate-900'
          };

          return (
            <button
              key={card.id}
              onClick={card.onClick}
              className={`
                relative p-6 rounded-xl shadow-sm border-2 transition-all duration-200
                transform hover:scale-105 hover:shadow-md
                ${isFeatured 
                  ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 text-white hover:from-slate-900 hover:to-slate-800' 
                  : colorClasses[card.color as keyof typeof colorClasses]
                }
                ${isFeatured ? 'md:col-span-2 lg:col-span-1' : ''}
                text-left
              `}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`
                  p-3 rounded-lg
                  ${isFeatured 
                    ? 'bg-white/10' 
                    : card.color === 'blue' ? 'bg-blue-100' :
                      card.color === 'red' ? 'bg-red-100' :
                      card.color === 'green' ? 'bg-green-100' :
                      card.color === 'purple' ? 'bg-purple-100' : ''
                  }
                `}>
                  <div className={isFeatured ? 'text-white' : ''}>
                    {card.icon}
                  </div>
                </div>
                {isFeatured && (
                  <span className="px-2 py-1 text-xs font-semibold bg-white/20 rounded text-white">
                    Destacado
                  </span>
                )}
              </div>
              <h3 className={`
                text-xl font-bold mb-2
                ${isFeatured ? 'text-white' : ''}
              `}>
                {card.title}
              </h3>
              <p className={`
                text-sm
                ${isFeatured ? 'text-slate-300' : 'opacity-70'}
              `}>
                {card.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
