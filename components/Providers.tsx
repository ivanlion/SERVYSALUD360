/**
 * Providers - Componente cliente que envuelve todos los providers
 * 
 * Necesario porque app/layout.tsx es un Server Component y no puede
 * usar directamente componentes cliente como ThemeProvider
 * 
 * @component
 */

'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { NavigationProvider } from '../contexts/NavigationContext';
import { ChatProvider } from '../contexts/ChatContext';
import { CompanyProvider } from '../contexts/CompanyContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { UserProvider } from '../contexts/UserContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { ReactQueryProvider } from '../lib/react-query';
import LayoutWrapper from './LayoutWrapper';
import { ErrorBoundary } from './ErrorBoundary';

// OPTIMIZACIÓN: Dynamic import para GlobalChat - solo se carga cuando se necesita
// Esto reduce el bundle size inicial ya que el chat solo se usa cuando el usuario lo abre
const GlobalChat = dynamic(() => import('./GlobalChat'), {
  ssr: false, // No necesita SSR ya que es un componente flotante
});

interface ProvidersProps {
  children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <NavigationProvider>
          <ChatProvider>
            <ReactQueryProvider>
              <UserProvider>
                <CompanyProvider>
                  <NotificationProvider>
                    <LayoutWrapper>
                      {children}
                    </LayoutWrapper>
                    <GlobalChat />
                  </NotificationProvider>
                </CompanyProvider>
              </UserProvider>
            </ReactQueryProvider>
          </ChatProvider>
        </NavigationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

