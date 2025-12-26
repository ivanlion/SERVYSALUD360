/**
 * Página temporal para corregir el rol de administrador
 * 
 * Esta página permite corregir el rol del usuario lionfonseca@gmail.com
 * 
 * @module app/dashboard/admin/fix-role/page
 */

'use client';

import { useState } from 'react';
import { fixAdminRole } from '../../../actions/fix-admin-role';
import { Loader2, CheckCircle, AlertCircle, UserCheck } from 'lucide-react';

export default function FixRolePage() {
  const [email, setEmail] = useState('lionfonseca@gmail.com');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  const handleFixRole = async () => {
    if (!email.trim()) {
      setResult({
        success: false,
        message: 'Por favor, ingresa un email válido',
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fixAdminRole(email);
      setResult(response);
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Error inesperado',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <UserCheck className="text-indigo-600" size={32} />
            <h1 className="text-2xl font-bold text-gray-900">
              Corregir Rol de Administrador
            </h1>
          </div>

          <p className="text-gray-600 mb-6">
            Esta herramienta verifica y corrige el rol de administrador para un usuario específico.
            Actualiza tanto la tabla <code className="bg-gray-100 px-2 py-1 rounded">profiles</code> como 
            el <code className="bg-gray-100 px-2 py-1 rounded">user_metadata</code> en auth.users.
          </p>

          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email del Usuario
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@ejemplo.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            <button
              onClick={handleFixRole}
              disabled={isLoading || !email.trim()}
              className={`
                w-full px-4 py-3 rounded-lg font-semibold text-white transition-all
                ${isLoading || !email.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow-md'
                }
              `}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={20} />
                  Corrigiendo rol...
                </span>
              ) : (
                'Corregir Rol de Administrador'
              )}
            </button>
          </div>

          {result && (
            <div
              className={`
                p-4 rounded-lg border
                ${result.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
                }
              `}
            >
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                ) : (
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                )}
                <div className="flex-1">
                  <p
                    className={`
                      font-medium
                      ${result.success ? 'text-green-800' : 'text-red-800'}
                    `}
                  >
                    {result.message}
                  </p>
                  {result.details && (
                    <div className="mt-2 text-sm text-gray-600">
                      <p><strong>ID:</strong> {result.details.userId}</p>
                      <p><strong>Email:</strong> {result.details.email}</p>
                      <p><strong>Perfil actualizado:</strong> {result.details.profileUpdated ? 'Sí' : 'No'}</p>
                      <p><strong>Auth actualizado:</strong> {result.details.authUpdated ? 'Sí' : 'No'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Después de corregir el rol, cierra sesión y vuelve a iniciar sesión 
              para que los cambios surtan efecto.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

