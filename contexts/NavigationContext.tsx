/**
 * NavigationContext - Contexto para compartir la función de navegación
 * 
 * Permite que el Sidebar pueda cambiar la vista actual
 * 
 * @module contexts/NavigationContext
 */

'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type View = 
  | 'DASHBOARD' 
  | 'NEW_CASE' 
  | 'EDIT_CASE' 
  | 'ACCESS_MANAGEMENT' 
  | 'WORK_MODIFIED_DASHBOARD' 
  | 'VIGILANCIA_MEDICA' 
  | 'LEY29733' 
  | 'GESTION_EMPRESAS' 
  | 'UPLOAD_EMO' 
  | 'HISTORIAL_ANALISIS'
  | 'PLAN_ANUAL_SST'
  | 'AUSENTISMO_LABORAL'
  | 'CAPACITACIONES_SST'
  | 'COMITE_SST'
  | 'ACCIDENTES_INCIDENTES'
  | 'INSPECCIONES_SST'
  | 'INDICADORES_SST'
  | 'GESTION_TRABAJADORES';

interface NavigationContextType {
  currentView: View;
  setCurrentView: (view: View) => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  return (
    <NavigationContext.Provider value={{ currentView, setCurrentView, isSidebarCollapsed, toggleSidebar }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}

