/**
 * AccessManagement - Componente de Gestión de Accesos
 * 
 * Muestra una tabla con usuarios y permisos para cada módulo del sistema
 * 
 * @component
 */

'use client';

import React, { useState, useEffect, useOptimistic, useTransition } from 'react';
import { Check, Plus, X, Loader2, AlertCircle, CheckCircle, Pencil, Trash2, Eye, Edit, Ban } from 'lucide-react';
import { createUser } from '../app/actions/create-user';
import { getUsers } from '../app/actions/get-users';
import { updatePermissionLevel } from '../app/actions/update-permission-level';
import { updateUser, deleteUser } from '../app/actions/admin-actions';
import { supabase } from '../lib/supabase';
import { isSuperAdmin, isAdminUser } from '../utils/auth-helpers';

export type PermissionLevel = 'none' | 'read' | 'write';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  permissions: {
    trabajoModificado: PermissionLevel;
    vigilanciaMedica: PermissionLevel;
    seguimientoTrabajadores: PermissionLevel;
    seguridadHigiene: PermissionLevel;
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [updatingPermissions, setUpdatingPermissions] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState<boolean>(true);
  
  // Estado para cambios pendientes (no guardados)
  const [pendingChanges, setPendingChanges] = useState<Map<string, { userId: string; permissionKey: keyof User['permissions']; newLevel: PermissionLevel; previousLevel: PermissionLevel }>>(new Map());
  
  // Estado para usuarios locales (con cambios pendientes)
  const [localUsers, setLocalUsers] = useState<User[]>([]);
  
  // useTransition para envolver actualizaciones
  const [isPending, startTransition] = useTransition();

  // Estados del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'Usuario', // Valor por defecto
  });

  // Optimización: Verificar admin y cargar usuarios en paralelo para mejor rendimiento
  useEffect(() => {
    const initializeData = async () => {
      setIsCheckingAdmin(true);
      setIsLoadingUsers(true);
      
      try {
        // Obtener usuario actual (rápido)
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsAdmin(false);
          setIsCheckingAdmin(false);
          setIsLoadingUsers(false);
          return;
        }

        setCurrentUserId(user.id);
        
        // Verificación rápida de Super Admin (sin consulta a BD)
        if (isSuperAdmin(user.email)) {
          setIsAdmin(true);
          setIsCheckingAdmin(false);
          
          // Cargar usuarios directamente
          const result = await getUsers();
          console.log('🔍 [SuperAdmin] Resultado de getUsers:', result);
          if (result.success) {
            // Procesar usuarios (incluso si el array está vacío o es undefined)
            const usersArray = result.users || [];
            const normalizedUsers: User[] = usersArray.map((user: any) => ({
              ...user,
              permissions: {
                trabajoModificado: (user.permissions?.trabajoModificado || 'none') as PermissionLevel,
                vigilanciaMedica: (user.permissions?.vigilanciaMedica || 'none') as PermissionLevel,
                seguimientoTrabajadores: (user.permissions?.seguimientoTrabajadores || 'none') as PermissionLevel,
                seguridadHigiene: (user.permissions?.seguridadHigiene || 'none') as PermissionLevel,
              },
            }));
            console.log('✅ [SuperAdmin] Usuarios normalizados:', normalizedUsers.length, normalizedUsers);
            setUsers(normalizedUsers);
            setLocalUsers(normalizedUsers);
          } else {
            console.error('❌ [SuperAdmin] Error en getUsers:', result.message);
            setUsers([]);
            setLocalUsers([]);
          }
          setIsLoadingUsers(false);
          return;
        }
        
        // Para otros usuarios, ejecutar verificación de admin y carga de usuarios en paralelo
        const [profileResult, usersResult] = await Promise.all([
          (async () => {
            try {
              const { data, error } = await supabase
                .from('profiles')
                .select('role') // Solo usar role, que es la columna que existe
                .eq('id', user.id)
                .single();
              return { data, error };
            } catch {
              return { data: null, error: null };
            }
          })(),
          getUsers()
        ]);

        // Procesar verificación de admin
        const profile = profileResult.data;
        const role = profile?.role || user.user_metadata?.role || ''; // Solo usar role, que es la columna que existe
        const userIsAdmin = isAdminUser(user.email, role);
        setIsAdmin(userIsAdmin);
        setIsCheckingAdmin(false);

        // Procesar usuarios solo si es admin
        console.log('🔍 [Admin] Verificación:', { 
          userIsAdmin, 
          usersResultSuccess: usersResult.success, 
          usersCount: usersResult.users?.length || 0,
          usersResult: usersResult 
        });
        if (userIsAdmin && usersResult.success) {
          // Procesar usuarios (incluso si el array está vacío o es undefined)
          const usersArray = usersResult.users || [];
          const normalizedUsers: User[] = usersArray.map((user: any) => ({
            ...user,
            permissions: {
              trabajoModificado: (user.permissions?.trabajoModificado || 'none') as PermissionLevel,
              vigilanciaMedica: (user.permissions?.vigilanciaMedica || 'none') as PermissionLevel,
              seguimientoTrabajadores: (user.permissions?.seguimientoTrabajadores || 'none') as PermissionLevel,
              seguridadHigiene: (user.permissions?.seguridadHigiene || 'none') as PermissionLevel,
            },
          }));
          console.log('✅ [Admin] Usuarios normalizados:', normalizedUsers.length, normalizedUsers);
          setUsers(normalizedUsers);
          setLocalUsers(normalizedUsers);
        } else {
          console.warn('⚠️ [Admin] No se establecieron usuarios:', { 
            userIsAdmin, 
            success: usersResult.success, 
            users: usersResult.users?.length || 0,
            usersResult 
          });
          setUsers([]);
          setLocalUsers([]);
        }
        setIsLoadingUsers(false);
      } catch (error: any) {
        console.error('Error al inicializar datos:', error);
        setIsAdmin(false);
        setUsers([]);
        setLocalUsers([]);
      } finally {
        setIsCheckingAdmin(false);
        setIsLoadingUsers(false);
      }
    };

    initializeData();
  }, []);

  // Manejar cambio de nivel de permiso (solo actualiza estado local, no guarda en BD)
  const handlePermissionLevelChange = (
    userId: string,
    permissionKey: keyof User['permissions'],
    newLevel: PermissionLevel
  ) => {
    // Encontrar el usuario actual
    const currentUser = localUsers.find(u => u.id === userId);
    if (!currentUser) return;

    // Si es Super Admin, no permitir cambios
    if (isSuperAdmin(currentUser.email)) {
      setNotification({
        type: 'error',
        message: 'El Super Administrador tiene acceso total garantizado y sus permisos no pueden ser modificados.',
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    // Si es administrador regular, no permitir cambios
    if (isAdminUser(currentUser.email, currentUser.role)) {
      setNotification({
        type: 'error',
        message: 'Los administradores tienen acceso total y sus permisos no pueden ser modificados.',
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    const previousLevel = currentUser.permissions[permissionKey];
    const changeKey = `${userId}-${permissionKey}`;

    // Si el nuevo nivel es igual al original, eliminar de cambios pendientes
    const originalUser = users.find(u => u.id === userId);
    const originalLevel = originalUser?.permissions[permissionKey] || previousLevel;

    if (newLevel === originalLevel) {
      // Eliminar de cambios pendientes si existe
      setPendingChanges(prev => {
        const newMap = new Map(prev);
        newMap.delete(changeKey);
        return newMap;
      });
    } else {
      // Agregar a cambios pendientes
      setPendingChanges(prev => {
        const newMap = new Map(prev);
        newMap.set(changeKey, { userId, permissionKey, newLevel, previousLevel });
        return newMap;
      });
    }

    // Actualizar estado local (visual inmediata)
    setLocalUsers(prevUsers =>
      prevUsers.map(user =>
        user.id === userId
          ? {
              ...user,
              permissions: {
                ...user.permissions,
                [permissionKey]: newLevel,
              },
            }
          : user
      )
    );
  };

  // Guardar todos los cambios pendientes
  const handleSaveChanges = async () => {
    if (pendingChanges.size === 0) {
      setNotification({
        type: 'error',
        message: 'No hay cambios pendientes para guardar',
      });
      setTimeout(() => setNotification(null), 2000);
      return;
    }

    setIsLoading(true);
    setNotification(null);

    const changesArray = Array.from(pendingChanges.values());
    const errors: string[] = [];
    const successes: string[] = [];

    startTransition(async () => {
      // Mapear la clave del frontend a la clave de la base de datos
      const moduleKeyMap: Record<keyof User['permissions'], string> = {
        trabajoModificado: 'trabajoModificado',
        vigilanciaMedica: 'vigilanciaMedica',
        seguimientoTrabajadores: 'seguimientoTrabajadores',
        seguridadHigiene: 'seguridadHigiene',
      };

      // Guardar cada cambio
      for (const change of changesArray) {
        const updateKey = `${change.userId}-${change.permissionKey}`;
        setUpdatingPermissions(prev => new Set(prev).add(updateKey));

        try {
          const dbModuleKey = moduleKeyMap[change.permissionKey] || change.permissionKey;
          const result = await updatePermissionLevel(change.userId, dbModuleKey, change.newLevel);

          if (!result.success) {
            errors.push(`${change.permissionKey}: ${result.message || 'Error desconocido'}`);
          } else {
            successes.push(`${change.permissionKey}`);
          }
        } catch (error: any) {
          console.error('Error guardando permiso:', error);
          errors.push(`${change.permissionKey}: ${error.message || 'Error inesperado'}`);
        } finally {
          setUpdatingPermissions(prev => {
            const newSet = new Set(prev);
            newSet.delete(updateKey);
            return newSet;
          });
        }
      }

      // Mostrar resultado
      if (errors.length === 0) {
        setNotification({
          type: 'success',
          message: `✅ ${successes.length} permiso(s) actualizado(s) exitosamente`,
        });
        
        // Sincronizar usuarios locales con los usuarios originales (actualizados)
        const reloadResult = await getUsers();
        if (reloadResult.success && reloadResult.users.length > 0) {
          const normalizedUsers: User[] = reloadResult.users.map(user => ({
            ...user,
            permissions: {
              trabajoModificado: (user.permissions?.trabajoModificado || 'none') as PermissionLevel,
              vigilanciaMedica: (user.permissions?.vigilanciaMedica || 'none') as PermissionLevel,
              seguimientoTrabajadores: (user.permissions?.seguimientoTrabajadores || 'none') as PermissionLevel,
              seguridadHigiene: (user.permissions?.seguridadHigiene || 'none') as PermissionLevel,
            },
          }));
          setUsers(normalizedUsers);
          setLocalUsers(normalizedUsers);
        }
        
        // Limpiar cambios pendientes
        setPendingChanges(new Map());
        
        setTimeout(() => setNotification(null), 3000);
      } else {
        setNotification({
          type: 'error',
          message: `❌ ${errors.length} error(es) al guardar. ${errors.join('; ')}`,
        });
        setTimeout(() => setNotification(null), 5000);
      }

      setIsLoading(false);
    });
  };

  // Cancelar cambios pendientes
  const handleCancelChanges = () => {
    if (pendingChanges.size === 0) return;
    
    // Restaurar usuarios locales a los valores originales
    setLocalUsers([...users]);
    setPendingChanges(new Map());
    
    setNotification({
      type: 'success',
      message: 'Cambios cancelados. Se restauraron los valores originales.',
    });
    setTimeout(() => setNotification(null), 2000);
  };

  // Manejar cambio en los campos del formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Manejar envío del formulario (crear o editar)
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setNotification(null);

    try {
      if (isEditMode && editingUserId) {
        // Modo edición: actualizar usuario existente
        const formDataToSend = new FormData();
        formDataToSend.append('userId', editingUserId);
        formDataToSend.append('nombre', formData.nombre);
        formDataToSend.append('rol', formData.rol);

        const result = await updateUser(formDataToSend);

        if (result.success) {
          setNotification({
            type: 'success',
            message: result.message || 'Usuario actualizado exitosamente',
          });

                 // Recargar usuarios desde Supabase
                 const reloadResult = await getUsers();
                 if (reloadResult.success && reloadResult.users.length > 0) {
                   const normalizedUsers: User[] = reloadResult.users.map((user: any) => ({
                     ...user,
                     permissions: {
                       trabajoModificado: (user.permissions?.trabajoModificado || 'none') as PermissionLevel,
                       vigilanciaMedica: (user.permissions?.vigilanciaMedica || 'none') as PermissionLevel,
                       seguimientoTrabajadores: (user.permissions?.seguimientoTrabajadores || 'none') as PermissionLevel,
                       seguridadHigiene: (user.permissions?.seguridadHigiene || 'none') as PermissionLevel,
                     },
                   }));
                   setUsers(normalizedUsers);
                   setLocalUsers(normalizedUsers);
                 }

          // Cerrar el modal después de 1.5 segundos
          setTimeout(() => {
            setIsModalOpen(false);
            setIsEditMode(false);
            setEditingUserId(null);
            setNotification(null);
            setFormData({
              nombre: '',
              email: '',
              password: '',
              rol: 'Usuario',
            });
          }, 1500);
        } else {
          setNotification({
            type: 'error',
            message: result.message || 'Error al actualizar el usuario',
          });
        }
      } else {
        // Modo creación: crear nuevo usuario
        const formDataToSend = new FormData();
        formDataToSend.append('nombre', formData.nombre);
        formDataToSend.append('email', formData.email);
        formDataToSend.append('password', formData.password);
        formDataToSend.append('rol', formData.rol);

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
                   const normalizedUsers: User[] = reloadResult.users.map((user: any) => ({
                     ...user,
                     permissions: {
                       trabajoModificado: (user.permissions?.trabajoModificado || 'none') as PermissionLevel,
                       vigilanciaMedica: (user.permissions?.vigilanciaMedica || 'none') as PermissionLevel,
                       seguimientoTrabajadores: (user.permissions?.seguimientoTrabajadores || 'none') as PermissionLevel,
                       seguridadHigiene: (user.permissions?.seguridadHigiene || 'none') as PermissionLevel,
                     },
                   }));
                   setUsers(normalizedUsers);
                   setLocalUsers(normalizedUsers);
                 } else {
            // Si falla la recarga, agregar el usuario localmente como fallback
                 const newUser: User = {
                   id: result.userId || `temp-${Date.now()}`,
                   name: formData.nombre,
                   email: formData.email,
                   role: formData.rol,
                   permissions: {
                     trabajoModificado: 'none',
                     vigilanciaMedica: 'none',
                     seguimientoTrabajadores: 'none',
                     seguridadHigiene: 'none',
                   },
                 };
            setUsers(prevUsers => [...prevUsers, newUser]);
          }

          // Limpiar el formulario
          setFormData({
            nombre: '',
            email: '',
            password: '',
            rol: 'Usuario',
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
      }
    } catch (error: any) {
      console.error('Error al procesar usuario:', error);
      setNotification({
        type: 'error',
        message: error.message || 'Error inesperado al procesar el usuario',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Abrir modal para editar usuario
  const handleEditUser = (user: User) => {
    setEditingUserId(user.id);
    setIsEditMode(true);
    setFormData({
      nombre: user.name || '',
      email: user.email,
      password: '', // No mostrar contraseña en edición
      rol: user.role,
    });
    setIsModalOpen(true);
    setNotification(null);
  };

  // Abrir modal para crear nuevo usuario
  const handleCreateUser = () => {
    setIsEditMode(false);
    setEditingUserId(null);
    setFormData({
      nombre: '',
      email: '',
      password: '',
      rol: 'Usuario',
    });
    setIsModalOpen(true);
    setNotification(null);
  };

  // Manejar eliminación de usuario
  const handleDeleteUser = async (user: User) => {
    // Prevenir auto-eliminación
    if (currentUserId === user.id) {
      alert('No puedes eliminar tu propia cuenta. Contacta a otro administrador.');
      return;
    }

    // Confirmar eliminación
    const confirmMessage = `¿Estás seguro de que deseas eliminar al usuario ${user.name || user.email}?\n\nEsta acción no se puede deshacer y eliminará el usuario del sistema de autenticación.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsLoading(true);
    setNotification(null);

    try {
      const result = await deleteUser(user.id);

      if (result.success) {
        setNotification({
          type: 'success',
          message: result.message || 'Usuario eliminado exitosamente',
        });

                 // Recargar usuarios desde Supabase
                 const reloadResult = await getUsers();
                 if (reloadResult.success && reloadResult.users.length > 0) {
                   const normalizedUsers: User[] = reloadResult.users.map((user: any) => ({
                     ...user,
                     permissions: {
                       trabajoModificado: (user.permissions?.trabajoModificado || 'none') as PermissionLevel,
                       vigilanciaMedica: (user.permissions?.vigilanciaMedica || 'none') as PermissionLevel,
                       seguimientoTrabajadores: (user.permissions?.seguimientoTrabajadores || 'none') as PermissionLevel,
                       seguridadHigiene: (user.permissions?.seguridadHigiene || 'none') as PermissionLevel,
                     },
                   }));
                   setUsers(normalizedUsers);
                   setLocalUsers(normalizedUsers);
                 } else {
          // Si falla la recarga, eliminar localmente
          setUsers(prevUsers => prevUsers.filter(u => u.id !== user.id));
          setLocalUsers(prevUsers => prevUsers.filter(u => u.id !== user.id));
        }

        // Limpiar notificación después de 2 segundos
        setTimeout(() => {
          setNotification(null);
        }, 2000);
      } else {
        setNotification({
          type: 'error',
          message: result.message || 'Error al eliminar el usuario',
        });
      }
    } catch (error: any) {
      console.error('Error al eliminar usuario:', error);
      setNotification({
        type: 'error',
        message: error.message || 'Error inesperado al eliminar el usuario',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Cerrar modal y limpiar estado
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setEditingUserId(null);
    setNotification(null);
    setFormData({
      nombre: '',
      email: '',
      password: '',
      rol: 'Usuario',
    });
  };

  // Si está verificando permisos, mostrar loading
  if (isCheckingAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-indigo-600" size={48} />
          <p className="text-lg font-semibold text-slate-600">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Si no es administrador, mostrar mensaje de acceso denegado
  if (!isAdmin) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <AlertCircle className="mx-auto text-red-600 mb-4" size={48} />
          <h2 className="text-2xl font-bold text-red-800 mb-2">
            Acceso Denegado
          </h2>
          <p className="text-red-600 mb-4">
            No tienes permiso para acceder a este módulo.
          </p>
          <p className="text-sm text-red-500">
            Solo los administradores pueden gestionar los accesos de usuarios.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Encabezado */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
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
            onClick={handleCreateUser}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            <span>Agregar Usuario</span>
          </button>
        </div>
        
        {/* Barra de acciones para cambios pendientes */}
        {pendingChanges.size > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-yellow-600" size={20} />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Tienes {pendingChanges.size} cambio(s) pendiente(s) sin guardar
                </p>
                <p className="text-xs text-yellow-600 mt-0.5">
                  Haz clic en "Guardar Cambios" para aplicar las modificaciones
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelChanges}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveChanges}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </div>
        )}
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
        ) : localUsers.length === 0 ? (
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
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  ACCIONES
                </th>
              </tr>
            </thead>

              {/* Cuerpo de Tabla */}
              <tbody className="divide-y divide-gray-100">
                {localUsers.map((user) => {
                // Verificar si el usuario es administrador (incluye Super Admin)
                const isAdmin = isAdminUser(user.email, user.role);
                
                // Para administradores, todos los permisos son 'write' y deshabilitados
                const getPermissionLevel = (key: keyof User['permissions']): PermissionLevel => {
                  return isAdmin ? 'write' : user.permissions[key];
                };

                // Función helper para renderizar el Select de permisos
                const renderPermissionSelect = (
                  permissionKey: keyof User['permissions'],
                  label: string
                ) => {
                  const currentLevel = getPermissionLevel(permissionKey);
                  const isUpdating = updatingPermissions.has(`${user.id}-${permissionKey}`);
                  const changeKey = `${user.id}-${permissionKey}`;
                  const hasPendingChange = pendingChanges.has(changeKey);
                  const originalUser = users.find(u => u.id === user.id);
                  const originalLevel = originalUser?.permissions[permissionKey] || currentLevel;
                  const isChanged = currentLevel !== originalLevel;

                  return (
                    <div className="flex items-center justify-center gap-2">
                      <select
                        value={currentLevel}
                        onChange={(e) => {
                          const newLevel = e.target.value as PermissionLevel;
                          handlePermissionLevelChange(user.id, permissionKey, newLevel);
                        }}
                        disabled={isAdmin || isUpdating}
                        className={`
                          text-xs font-medium px-3 py-1.5 rounded-lg border transition-all
                          ${isAdmin 
                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' 
                            : isUpdating
                            ? 'bg-gray-50 text-gray-400 cursor-wait border-gray-200'
                            : isChanged
                            ? 'bg-yellow-50 text-yellow-800 border-yellow-300 hover:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 cursor-pointer'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer'
                          }
                        `}
                        title={
                          isAdmin 
                            ? isSuperAdmin(user.email) 
                              ? 'Super Administrador: Acceso total garantizado' 
                              : 'Los administradores tienen acceso total'
                            : isChanged
                            ? `Cambio pendiente: ${label} (${originalLevel} → ${currentLevel})`
                            : `Cambiar nivel de acceso para ${label}`
                        }
                      >
                        <option value="none">
                          🔴 Sin Acceso
                        </option>
                        <option value="read">
                          👀 Solo Lectura
                        </option>
                        <option value="write">
                          ✏️ Escritura
                        </option>
                      </select>
                      {isUpdating && (
                        <Loader2 size={14} className="animate-spin text-indigo-600" />
                      )}
                      {isChanged && !isUpdating && (
                        <span className="text-xs text-yellow-600 font-medium" title="Cambio pendiente">
                          ●
                        </span>
                      )}
                    </div>
                  );
                };

                return (
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

                  {/* Select Trabajo Modificado */}
                  <td className="px-6 py-4 text-center">
                    {renderPermissionSelect('trabajoModificado', 'Trabajo Modificado')}
                  </td>

                  {/* Select Vigilancia Médica */}
                  <td className="px-6 py-4 text-center">
                    {renderPermissionSelect('vigilanciaMedica', 'Vigilancia Médica')}
                  </td>

                  {/* Select Seguimiento de Trabajadores */}
                  <td className="px-6 py-4 text-center">
                    {renderPermissionSelect('seguimientoTrabajadores', 'Seguimiento de Trabajadores')}
                  </td>

                  {/* Select Seguridad e Higiene */}
                  <td className="px-6 py-4 text-center">
                    {renderPermissionSelect('seguridadHigiene', 'Seguridad e Higiene')}
                  </td>

                  {/* Columna Acciones */}
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {/* Botón Editar */}
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Editar usuario"
                        disabled={isLoading}
                      >
                        <Pencil size={18} />
                      </button>
                      
                      {/* Botón Eliminar */}
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className={`p-2 rounded-lg transition-colors ${
                          currentUserId === user.id
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                        title={currentUserId === user.id ? 'No puedes eliminar tu propia cuenta' : 'Eliminar usuario'}
                        disabled={isLoading || currentUserId === user.id}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
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
                  required={!isEditMode}
                  disabled={isLoading || isEditMode}
                  readOnly={isEditMode}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="usuario@servysalud.com"
                />
                {isEditMode && (
                  <p className="text-xs text-gray-500 mt-1">El correo electrónico no se puede modificar</p>
                )}
              </div>

              {/* Contraseña - Solo en modo creación */}
              {!isEditMode && (
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
              )}

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
                      <span>{isEditMode ? 'Actualizando...' : 'Guardando...'}</span>
                    </>
                  ) : (
                    <span>{isEditMode ? 'Actualizar Usuario' : 'Guardar Usuario'}</span>
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

