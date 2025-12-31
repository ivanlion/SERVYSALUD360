/**
 * Dashboard - Componente principal con Grid de Tarjetas estilo HealthGuard
 * 
 * Muestra un grid de tarjetas interactivas para navegar por las diferentes secciones
 * 
 * @component
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import Link from 'next/link';
import { CaseData } from '../types';
import { Briefcase, Heart, Shield, Settings, Users, FileText, Building2, Gavel, Upload, TrendingUp, AlertCircle } from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';
import { useCompany } from '../contexts/CompanyContext';
import { useUser } from '../contexts/UserContext';
import { useDashboardStats } from '../hooks/useDashboardStats';

interface DashboardProps {
  onEdit: (data: CaseData) => void;
  onCreate: () => void;
  user?: any; // Datos del usuario para el saludo
}

// OPTIMIZACIÓN: Memoizar componente para evitar re-renders innecesarios
const Dashboard = memo(function Dashboard({ onEdit, onCreate, user: userProp }: DashboardProps) {
  const { setCurrentView } = useNavigation();
  const { empresaActiva, empresas } = useCompany();
  const { user: contextUser, profile } = useUser();
  
  // Usar usuario del contexto si está disponible, sino usar el prop
  const user = contextUser || userProp;
  
  // Obtener nombre del usuario desde el contexto o prop
  const userName = profile?.full_name || 
    (user?.email ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : 'Usuario');
  
  // Usar React Query para cachear estadísticas
  const { data: stats = {
    casosActivos: 0,
    casosTotal: 0,
    trabajadores: 0,
    emosPendientes: 0
  }, isLoading: isLoadingStats } = useDashboardStats();

  // Tarjetas del dashboard (memoizadas para evitar re-renders)
  // ✅ OPTIMIZACIÓN: Usar valores primitivos específicos en lugar del objeto completo
  // para evitar re-renders innecesarios cuando cambian otros valores de stats
  const dashboardCards = useMemo(() => [
    {
      id: 'trabajo-modificado',
      title: 'Trabajo Modificado',
      icon: <Briefcase size={28} />,
      description: 'Gestión de casos y restricciones laborales',
      color: 'blue',
      onClick: () => setCurrentView('WORK_MODIFIED_DASHBOARD'),
      featured: false,
      badge: stats.casosActivos > 0 ? `${stats.casosActivos} activos` : undefined,
      badgeColor: 'blue'
    },
    {
      id: 'vigilancia-medica',
      title: 'Vigilancia Médica',
      icon: <Heart size={28} />,
      description: 'Seguimiento de exámenes y evaluaciones',
      color: 'red',
      onClick: () => setCurrentView('VIGILANCIA_MEDICA'),
      featured: false
    },
    {
      id: 'upload-emo',
      title: 'Subir EMO',
      icon: <Upload size={28} />,
      description: 'Subir y analizar EMO con IA',
      color: 'indigo',
      onClick: () => setCurrentView('UPLOAD_EMO'),
      featured: false,
      highlight: false,
      badge: 'Nuevo con IA',
      badgeColor: 'indigo'
    },
    {
      id: 'gestion-empresas',
      title: 'Gestión de Empresas',
      icon: <Building2 size={28} />,
      description: 'Administra tus empresas y datos',
      color: 'green',
      onClick: () => setCurrentView('GESTION_EMPRESAS'),
      featured: false,
      badge: empresas.length > 0 ? `${empresas.length} empresa${empresas.length > 1 ? 's' : ''}` : undefined,
      badgeColor: 'green'
    },
    {
      id: 'seguimiento-trabajadores',
      title: 'Seguimiento de Trabajadores',
      icon: <Users size={28} />,
      description: 'Monitoreo de trabajadores y casos activos',
      color: 'green',
      onClick: () => {},
      featured: false,
      badge: stats.trabajadores > 0 ? `${stats.trabajadores} trabajadores` : undefined,
      badgeColor: 'green'
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
      id: 'ley29733',
      title: 'Ley 29733',
      icon: <Gavel size={28} />,
      description: 'Consentimiento y protección de datos',
      color: 'purple',
      onClick: () => setCurrentView('LEY29733'),
      featured: false
    },
    {
      id: 'administracion',
      title: 'Administración',
      icon: <Settings size={28} />,
      description: 'Configuración y gestión del sistema',
      color: 'purple',
      onClick: () => setCurrentView('ACCESS_MANAGEMENT'),
      featured: false
    }
  ], [setCurrentView, stats.casosActivos, stats.trabajadores, empresas.length]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 bg-transparent dark:bg-transparent">
      
      {/* Saludo de Bienvenida con información de empresa */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Bienvenido, {userName}
            </h1>
            {empresaActiva && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Building2 size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-xs sm:text-sm">Empresa activa: <span className="font-semibold text-gray-900 dark:text-white">{empresaActiva.nombre}</span></span>
              </div>
            )}
          </div>
          
          {/* Estadísticas rápidas */}
          {!isLoadingStats && (
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="text-center px-3 sm:px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 min-w-[80px]">
                <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.casosActivos}</div>
                <div className="text-xs text-blue-700 dark:text-blue-300 font-medium">Casos Activos</div>
              </div>
              <div className="text-center px-3 sm:px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800 min-w-[80px]">
                <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">{stats.trabajadores}</div>
                <div className="text-xs text-green-700 dark:text-green-300 font-medium">Trabajadores</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid de Tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
        {dashboardCards.map((card) => {
          const isFeatured = card.featured;
          
          // Colores para los iconos según el tipo de tarjeta
          const iconColors = {
            blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
            red: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
            green: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
            purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
            indigo: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
            dark: 'bg-white/10 dark:bg-white/20 text-white'
          };

          const badgeColors = {
            blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
            green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
            purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
            red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
          };

          // Contenido de la tarjeta
          const cardContent = (
            <div
              className={`
                relative p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border transition-all duration-200 group
                transform hover:scale-[1.02] hover:shadow-lg cursor-pointer
                min-h-[140px] sm:min-h-[160px]
                ${isFeatured 
                  ? 'bg-indigo-600 dark:bg-indigo-500 border-indigo-600 dark:border-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600' 
                  : card.highlight
                  ? 'bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border-indigo-200 dark:border-indigo-700 hover:border-indigo-300 dark:hover:border-indigo-600 text-gray-900 dark:text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:border-indigo-200 dark:hover:border-indigo-700 border-gray-100 dark:border-gray-700'
                }
                text-left w-full
              `}
            >
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className={`
                  p-2 sm:p-2.5 rounded-lg transition-transform group-hover:scale-110 shrink-0
                  ${iconColors[card.color as keyof typeof iconColors]}
                `}>
                  <div className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center">
                    {card.icon}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {card.badge && !isFeatured && (
                    <span className={`px-2 py-1 text-xs font-semibold rounded-md border ${badgeColors[card.badgeColor as keyof typeof badgeColors] || badgeColors.blue}`}>
                      {card.badge}
                    </span>
                  )}
                  {isFeatured && (
                    <span className="px-2.5 py-1 text-xs font-semibold bg-white/20 rounded-md text-white">
                      Destacado
                    </span>
                  )}
                </div>
              </div>
              <h3 className={`
                text-lg sm:text-xl font-bold mb-2
                ${isFeatured ? 'text-white' : card.highlight ? 'text-indigo-900 dark:text-indigo-200' : 'text-gray-900 dark:text-white'}
              `}>
                {card.title}
              </h3>
              <p className={`
                text-sm leading-relaxed
                ${isFeatured ? 'text-white/90' : card.highlight ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400'}
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
});

// Exportar componente memoizado
export default Dashboard;
