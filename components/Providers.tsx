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
import { NavigationProvider } from '../contexts/NavigationContext';
import { ChatProvider } from '../contexts/ChatContext';
import { CompanyProvider } from '../contexts/CompanyContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { UserProvider } from '../contexts/UserContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { ReactQueryProvider } from '../lib/react-query';
import LayoutWrapper from './LayoutWrapper';
import GlobalChat from './GlobalChat';

interface ProvidersProps {
  children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
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
  );
}

