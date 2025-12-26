/**
 * AccessManagement - Componente de Gestión de Accesos
 * 
 * Muestra una tabla con usuarios y permisos para cada módulo del sistema
 * 
 * @component
 */

'use client';

import React, { useState } from 'react';
import { Check } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: {
    trabajoModificado: boolean;
    vigilanciaMedica: boolean;
    seguimientoTrabajadores: boolean;
    seguridadHigiene: boolean;
  };
}

// Datos mock de usuarios
const MOCK_USERS: User[] = [
  {
    id: '1',
    name: 'Administrador',
    email: 'admin@servysalud.com',
    role: 'Administrador',
    permissions: {
      trabajoModificado: true,
      vigilanciaMedica: true,
      seguimientoTrabajadores: true,
      seguridadHigiene: true,
    }
  },
  {
    id: '2',
    name: 'Dr. Roberto',
    email: 'roberto.medico@servysalud.com',
    role: 'Médico',
    permissions: {
      trabajoModificado: true,
      vigilanciaMedica: true,
      seguimientoTrabajadores: true,
      seguridadHigiene: false,
    }
  },
  {
    id: '3',
    name: 'Ing. Ana',
    email: 'ana.ingeniera@servysalud.com',
    role: 'Ingeniero',
    permissions: {
      trabajoModificado: true,
      vigilanciaMedica: false,
      seguimientoTrabajadores: true,
      seguridadHigiene: true,
    }
  }
];

// Función para obtener inicial del nombre
const getInitial = (name: string): string => {
  return name.charAt(0).toUpperCase();
};

// Función para obtener color del avatar basado en el nombre
const getAvatarColor = (name: string): string => {
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-purple-100 text-purple-700',
    'bg-orange-100 text-orange-700',
    'bg-pink-100 text-pink-700',
    'bg-indigo-100 text-indigo-700',
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

export default function AccessManagement() {
  const [users, setUsers] = useState<User[]>(MOCK_USERS);

  const handlePermissionChange = (
    userId: string,
    permissionKey: keyof User['permissions']
  ) => {
    setUsers(prevUsers =>
      prevUsers.map(user =>
        user.id === userId
          ? {
              ...user,
              permissions: {
                ...user.permissions,
                [permissionKey]: !user.permissions[permissionKey],
              },
            }
          : user
      )
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Encabezado */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Gestión de Accesos
        </h1>
        <p className="text-gray-500 text-base">
          Configure los módulos visibles para cada usuario del sistema.
        </p>
      </div>

      {/* Tabla de Permisos */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Cabecera de Tabla */}
            <thead className="bg-white border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  USUARIO
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  TRABAJO MODIFICADO
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  VIGILANCIA MÉDICA
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  SEGUIMIENTO DE TRABAJADORES
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  SEGURIDAD E HIGIENE
                </th>
              </tr>
            </thead>

            {/* Cuerpo de Tabla */}
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  {/* Columna Usuario */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${getAvatarColor(
                          user.name
                        )}`}
                      >
                        {getInitial(user.name)}
                      </div>
                      {/* Nombre y Email */}
                      <div>
                        <div className="font-semibold text-gray-900">
                          {user.name}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Checkbox Trabajo Modificado */}
                  <td className="px-6 py-4 text-center">
                    <label className="flex items-center justify-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={user.permissions.trabajoModificado}
                        onChange={() =>
                          handlePermissionChange(user.id, 'trabajoModificado')
                        }
                        className="sr-only"
                      />
                      <div
                        className={`
                          w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                          ${
                            user.permissions.trabajoModificado
                              ? 'bg-gray-900 border-gray-900'
                              : 'bg-white border-gray-300'
                          }
                        `}
                      >
                        {user.permissions.trabajoModificado && (
                          <Check size={14} className="text-white" />
                        )}
                      </div>
                    </label>
                  </td>

                  {/* Checkbox Vigilancia Médica */}
                  <td className="px-6 py-4 text-center">
                    <label className="flex items-center justify-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={user.permissions.vigilanciaMedica}
                        onChange={() =>
                          handlePermissionChange(user.id, 'vigilanciaMedica')
                        }
                        className="sr-only"
                      />
                      <div
                        className={`
                          w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                          ${
                            user.permissions.vigilanciaMedica
                              ? 'bg-gray-900 border-gray-900'
                              : 'bg-white border-gray-300'
                          }
                        `}
                      >
                        {user.permissions.vigilanciaMedica && (
                          <Check size={14} className="text-white" />
                        )}
                      </div>
                    </label>
                  </td>

                  {/* Checkbox Seguimiento de Trabajadores */}
                  <td className="px-6 py-4 text-center">
                    <label className="flex items-center justify-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={user.permissions.seguimientoTrabajadores}
                        onChange={() =>
                          handlePermissionChange(
                            user.id,
                            'seguimientoTrabajadores'
                          )
                        }
                        className="sr-only"
                      />
                      <div
                        className={`
                          w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                          ${
                            user.permissions.seguimientoTrabajadores
                              ? 'bg-gray-900 border-gray-900'
                              : 'bg-white border-gray-300'
                          }
                        `}
                      >
                        {user.permissions.seguimientoTrabajadores && (
                          <Check size={14} className="text-white" />
                        )}
                      </div>
                    </label>
                  </td>

                  {/* Checkbox Seguridad e Higiene */}
                  <td className="px-6 py-4 text-center">
                    <label className="flex items-center justify-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={user.permissions.seguridadHigiene}
                        onChange={() =>
                          handlePermissionChange(user.id, 'seguridadHigiene')
                        }
                        className="sr-only"
                      />
                      <div
                        className={`
                          w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                          ${
                            user.permissions.seguridadHigiene
                              ? 'bg-gray-900 border-gray-900'
                              : 'bg-white border-gray-300'
                          }
                        `}
                      >
                        {user.permissions.seguridadHigiene && (
                          <Check size={14} className="text-white" />
                        )}
                      </div>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

