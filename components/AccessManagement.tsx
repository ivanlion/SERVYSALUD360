/**
 * AccessManagement - Componente de Gestión de Accesos
 * 
 * Muestra una tabla con usuarios y permisos para cada módulo del sistema
 * 
 * @component
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Check, Plus, X, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { createUser } from '../app/actions/create-user';
import { getUsers } from '../app/actions/get-users';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  permissions: {
    trabajoModificado: boolean;
    vigilanciaMedica: boolean;
    seguimientoTrabajadores: boolean;
    seguridadHigiene: boolean;
  };
}

// Función para obtener inicial del nombre o email
const getInitial = (name: string | null, email: string): string => {
  if (name && name.trim()) {
    return name.charAt(0).toUpperCase();
  }
  if (email && email.trim()) {
    return email.charAt(0).toUpperCase();
  }
  return 'U';
};

// Función para obtener nombre para mostrar
const getDisplayName = (name: string | null, email: string): string => {
  if (name && name.trim()) {
    return name;
  }
  return 'Usuario Nuevo';
};

// Función para obtener color del avatar basado en el nombre o email
const getAvatarColor = (name: string | null, email: string): string => {
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-purple-100 text-purple-700',
    'bg-orange-100 text-orange-700',
    'bg-pink-100 text-pink-700',
    'bg-indigo-100 text-indigo-700',
  ];
  const text = name || email || 'U';
  const index = text.charCodeAt(0) % colors.length;
  return colors[index];
};

export default function AccessManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Estados del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'Médico',
  });

  // Cargar usuarios de Supabase al montar el componente
  useEffect(() => {
    const loadUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const result = await getUsers();
        if (result.success) {
          setUsers(result.users);
          console.log(`✅ ${result.users.length} usuarios cargados desde Supabase`);
        } else {
          console.error('❌ Error al cargar usuarios:', result.message);
          setUsers([]);
        }
      } catch (error: any) {
        console.error('❌ Error inesperado al cargar usuarios:', error);
        setUsers([]);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    loadUsers();
  }, []);

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

  // Manejar cambio en los campos del formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setNotification(null);

    try {
      // Crear FormData para el Server Action
      const formDataToSend = new FormData();
      formDataToSend.append('nombre', formData.nombre);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('rol', formData.rol);

      // Llamar al Server Action
      const result = await createUser(formDataToSend);

      if (result.success) {
        // Mostrar notificación de éxito
        setNotification({
          type: 'success',
          message: result.message || 'Usuario creado exitosamente',
        });

        // Recargar usuarios desde Supabase para obtener el usuario recién creado
        const reloadResult = await getUsers();
        if (reloadResult.success && reloadResult.users.length > 0) {
          setUsers(reloadResult.users);
        } else {
          // Si falla la recarga, agregar el usuario localmente como fallback
          const newUser: User = {
            id: result.userId || `temp-${Date.now()}`,
            name: formData.nombre,
            email: formData.email,
            role: formData.rol,
            permissions: {
              trabajoModificado: false,
              vigilanciaMedica: false,
              seguimientoTrabajadores: false,
              seguridadHigiene: false,
            },
          };
          setUsers(prevUsers => [...prevUsers, newUser]);
        }

        // Limpiar el formulario
        setFormData({
          nombre: '',
          email: '',
          password: '',
          rol: 'Médico',
        });

        // Cerrar el modal automáticamente después de mostrar éxito
        setTimeout(() => {
          setIsModalOpen(false);
          setNotification(null);
        }, 1500);
      } else {
        // Mostrar notificación de error
        setNotification({
          type: 'error',
          message: result.message || 'Error al crear el usuario',
        });
      }
    } catch (error: any) {
      console.error('Error al crear usuario:', error);
      setNotification({
        type: 'error',
        message: error.message || 'Error inesperado al crear el usuario',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Cerrar modal y limpiar estado
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setNotification(null);
    setFormData({
      nombre: '',
      email: '',
      password: '',
      rol: 'Médico',
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Encabezado */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gestión de Accesos
          </h1>
          <p className="text-gray-500 text-base">
            Configure los módulos visibles para cada usuario del sistema.
          </p>
        </div>
        {/* Botón Agregar Usuario */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={18} />
          <span>Agregar Usuario</span>
        </button>
      </div>

      {/* Tabla de Permisos */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoadingUsers ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
              <p className="text-sm text-gray-500">Cargando usuarios...</p>
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-gray-500 mb-2">No hay usuarios registrados</p>
              <p className="text-sm text-gray-400">Haz clic en "Agregar Usuario" para crear el primero</p>
            </div>
          </div>
        ) : (
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
                          user.name,
                          user.email
                        )}`}
                      >
                        {getInitial(user.name, user.email)}
                      </div>
                      {/* Nombre y Email */}
                      <div>
                        <div className="font-semibold text-gray-900">
                          {getDisplayName(user.name, user.email)}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Checkbox Trabajo Modificado */}
                  <td className="px-6 py-4 text-center">
                    <label className="flex items-center justify-center cursor-not-allowed">
                      <input
                        type="checkbox"
                        checked={user.permissions.trabajoModificado}
                        onChange={() =>
                          handlePermissionChange(user.id, 'trabajoModificado')
                        }
                        disabled
                        readOnly
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
                    <label className="flex items-center justify-center cursor-not-allowed">
                      <input
                        type="checkbox"
                        checked={user.permissions.vigilanciaMedica}
                        onChange={() =>
                          handlePermissionChange(user.id, 'vigilanciaMedica')
                        }
                        disabled
                        readOnly
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
                    <label className="flex items-center justify-center cursor-not-allowed">
                      <input
                        type="checkbox"
                        checked={user.permissions.seguimientoTrabajadores}
                        onChange={() =>
                          handlePermissionChange(
                            user.id,
                            'seguimientoTrabajadores'
                          )
                        }
                        disabled
                        readOnly
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
                    <label className="flex items-center justify-center cursor-not-allowed">
                      <input
                        type="checkbox"
                        checked={user.permissions.seguridadHigiene}
                        onChange={() =>
                          handlePermissionChange(user.id, 'seguridadHigiene')
                        }
                        disabled
                        readOnly
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
        )}
      </div>

      {/* Modal para Crear Usuario */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            {/* Header del Modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Registrar Nuevo Usuario</h2>
              <button
                onClick={handleCloseModal}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isLoading}
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Notificación */}
            {notification && (
              <div
                className={`mx-6 mt-4 p-3 rounded-lg flex items-center gap-2 ${
                  notification.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {notification.type === 'success' ? (
                  <CheckCircle size={18} />
                ) : (
                  <AlertCircle size={18} />
                )}
                <span className="text-sm font-medium">{notification.message}</span>
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Nombre Completo */}
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              {/* Correo Electrónico */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="usuario@servysalud.com"
                />
              </div>

              {/* Contraseña */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  minLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              {/* Rol */}
              <div>
                <label htmlFor="rol" className="block text-sm font-medium text-gray-700 mb-2">
                  Rol
                </label>
                <select
                  id="rol"
                  name="rol"
                  value={formData.rol}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="Administrador">Administrador</option>
                  <option value="Médico">Médico</option>
                  <option value="Ingeniero">Ingeniero</option>
                  <option value="Usuario">Usuario</option>
                </select>
              </div>

              {/* Botones */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar Usuario</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

