# 🔐 Guía de Autenticación - SERVYSALUD 360

## 📋 Configuración Inicial

Para usar el sistema de login, necesitas crear usuarios en Supabase. Hay dos formas de hacerlo:

---

## 🎯 Opción 1: Crear Usuarios desde el Panel de Supabase (Recomendado)

### Paso 1: Accede al Panel de Supabase
1. Ve a [https://supabase.com](https://supabase.com)
2. Inicia sesión en tu cuenta
3. Selecciona tu proyecto

### Paso 2: Ir a Authentication
1. En el menú lateral, haz clic en **"Authentication"**
2. Luego haz clic en **"Users"**

### Paso 3: Crear un Nuevo Usuario
1. Haz clic en el botón **"Add user"** o **"Create new user"**
2. Completa el formulario:
   - **Email**: Ingresa el correo electrónico (ej: `admin@servysalud.com`)
   - **Password**: Crea una contraseña segura
   - **Auto Confirm User**: ✅ Activa esta opción para que el usuario pueda iniciar sesión inmediatamente

3. Haz clic en **"Create user"**

### Paso 4: Usar las Credenciales
Ahora puedes usar estas credenciales para iniciar sesión en la aplicación:
- **Email**: El que ingresaste (ej: `admin@servysalud.com`)
- **Password**: La contraseña que creaste

---

## 🎯 Opción 2: Habilitar Registro Automático (Opcional)

Si deseas que los usuarios se registren automáticamente, puedes habilitar el registro en Supabase:

### Paso 1: Configurar Provider de Email
1. Ve a **Authentication > Providers**
2. Asegúrate de que **"Email"** esté habilitado
3. En la sección de **"Email Auth"**, activa:
   - ✅ **Enable email signup**: Permite que nuevos usuarios se registren

### Paso 2: (Opcional) Agregar Página de Registro
Si habilitas el registro automático, podrías agregar una página de registro a la aplicación.

---

## 🔑 Crear Usuario de Prueba Rápido

Para probar rápidamente, puedes usar este ejemplo:

### Usuario de Prueba Recomendado:
- **Email**: `admin@servysalud.com`
- **Password**: (Crea una contraseña segura, mínimo 6 caracteres)

O cualquier otro correo que desees usar, por ejemplo:
- `usuario@servysalud.com`
- `medico@servysalud.com`
- `supervisor@servysalud.com`

---

## ⚙️ Configuración Adicional en Supabase

### Verificar Configuración de Email:
1. Ve a **Authentication > Settings**
2. Verifica que **"Enable email confirmations"** esté configurado según tus necesidades:
   - Si está **DESACTIVADO**: Los usuarios pueden iniciar sesión inmediatamente
   - Si está **ACTIVADO**: Los usuarios deben confirmar su email primero

### Recomendación para Desarrollo:
Para desarrollo rápido, desactiva la confirmación de email temporalmente:
- **"Enable email confirmations"**: ❌ Desactivado
- Esto permite que los usuarios creados desde el panel puedan iniciar sesión inmediatamente sin necesidad de confirmar el email.

---

## 🚀 Pasos Rápidos Resumidos

1. **Ve a Supabase Dashboard** → Tu Proyecto
2. **Authentication** → **Users**
3. **Add user** → Ingresa email y contraseña
4. **Auto Confirm User**: ✅ Activado
5. **Create user**
6. **Usa esas credenciales en** `/login`

---

## ❓ Problemas Comunes

### "Invalid login credentials"
- Verifica que el usuario existe en Supabase
- Verifica que el email esté correctamente escrito
- Verifica que la contraseña sea correcta

### "Email not confirmed"
- Ve a Authentication > Settings
- Desactiva temporalmente "Enable email confirmations"
- O confirma el email del usuario desde el panel

### No puedo crear usuarios
- Verifica que tengas permisos de administrador en Supabase
- Verifica que el provider de Email esté habilitado en Authentication > Providers

---

## 📧 Contacto

Para más ayuda, consulta la documentación oficial de Supabase:
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)



