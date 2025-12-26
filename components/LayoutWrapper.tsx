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

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    // En login, renderizar sin sidebar
    return <>{children}</>;
  }

  // En otras páginas, renderizar con sidebar
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar - Columna Izquierda (Fija, w-64) */}
      <Sidebar />
      
      {/* Contenido Principal - Columna Derecha (Flexible) */}
      <main className="flex-1 flex flex-col min-w-0">
        {children}
      </main>
    </div>
  );
}

