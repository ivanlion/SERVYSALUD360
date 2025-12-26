/**
 * NavigationContext - Contexto para compartir la función de navegación
 * 
 * Permite que el Sidebar pueda cambiar la vista actual
 * 
 * @module contexts/NavigationContext
 */

'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type View = 'DASHBOARD' | 'NEW_CASE' | 'EDIT_CASE' | 'ACCESS_MANAGEMENT' | 'WORK_MODIFIED_DASHBOARD';

interface NavigationContextType {
  currentView: View;
  setCurrentView: (view: View) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');

  return (
    <NavigationContext.Provider value={{ currentView, setCurrentView }}>
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

