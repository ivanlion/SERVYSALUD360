/**
 * Loading Component - Estado de carga para página de administración
 * 
 * Se muestra mientras se carga la página de administración
 * 
 * @module app/dashboard/admin/loading
 */

import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={48} />
        <p className="text-lg font-semibold text-slate-600 dark:text-gray-300">Cargando administración...</p>
      </div>
    </div>
  );
}



