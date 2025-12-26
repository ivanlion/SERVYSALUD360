/**
 * LayoutWrapper - Wrapper condicional para el layout
 * 
 * Solo aplica la estructura de Sidebar + Contenido cuando no estamos en login
 * 
 * @component
 */

'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    // En login, renderizar sin sidebar ni header
    return <>{children}</>;
  }

  // En otras páginas, renderizar con header y sidebar
  return (
    <div className="flex min-h-screen bg-slate-50 flex-col">
      {/* Header - Siempre visible en la parte superior */}
      <Header />
      
      <div className="flex flex-1 min-h-0">
        {/* Sidebar - Columna Izquierda (Fija, w-64) */}
        <Sidebar />
        
        {/* Contenido Principal - Columna Derecha (Flexible) */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <div className="flex-1 w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

