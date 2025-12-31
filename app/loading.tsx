/**
 * Loading Component - Estado de carga global
 * 
 * Se muestra mientras se carga la página principal
 * 
 * @module app/loading
 */

import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={48} />
        <p className="text-lg font-semibold text-slate-600 dark:text-gray-300">Cargando...</p>
      </div>
    </div>
  );
}



