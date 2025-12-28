# 📝 Guía: Crear Usuarios desde Gestión de Accesos

Esta guía explica cómo configurar y usar la funcionalidad de creación de usuarios desde la página de "Gestión de Accesos".

## 🔧 Configuración Requerida

### 1. Variable de Entorno: `SUPABASE_SERVICE_ROLE_KEY`

Para crear usuarios como administrador sin desloguear al usuario actual, necesitas agregar la **Service Role Key** de Supabase a tus variables de entorno.

#### Pasos:

1. **Obtener la Service Role Key:**
   - Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
   - Navega a **Settings** → **API**
   - En la sección **Project API keys**, copia la **`service_role`** key (⚠️ **NUNCA** compartas esta clave públicamente)

2. **Agregar al archivo `.env.local`:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
   ```

3. **Para producción (Vercel/otros):**
   - Agrega `SUPABASE_SERVICE_ROLE_KEY` en las variables de entorno de tu plataforma de despliegue
   - **IMPORTANTE:** Esta variable NO debe tener el prefijo `NEXT_PUBLIC_` porque es una clave secreta del servidor

### 2. Crear la Tabla `profiles` en Supabase (Opcional pero Recomendado)

Si quieres almacenar información adicional de los usuarios (nombre, rol, etc.), crea una tabla `profiles`:

#### SQL para crear la tabla:

```sql
-- Crear tabla profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  rol TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Política: Los administradores pueden ver todos los perfiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND rol = 'Administrador'
    )
  );

-- Política: Solo el sistema puede insertar perfiles (usando Service Role)
CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (true);
```

#### Nota:
- Si no creas la tabla `profiles`, el usuario se creará igualmente en Auth, pero no se guardarán los datos adicionales (nombre, rol).
- El Server Action mostrará una advertencia en la consola pero no fallará.

## 🚀 Uso de la Funcionalidad

### Crear un Nuevo Usuario:

1. **Navegar a Gestión de Accesos:**
   - Ve a `/dashboard/admin` o haz clic en "Administración" → "Gestión de Usuarios" en el sidebar

2. **Abrir el Modal:**
   - Haz clic en el botón **"Agregar Usuario"** (esquina superior derecha)

3. **Completar el Formulario:**
   - **Nombre Completo:** Nombre completo del usuario
   - **Correo Electrónico:** Email válido (será el username para login)
   - **Contraseña:** Mínimo 6 caracteres
   - **Rol:** Selecciona entre Administrador, Médico o Seguridad

4. **Crear Usuario:**
   - Haz clic en **"Crear Usuario"**
   - Verás una notificación de éxito o error
   - El nuevo usuario aparecerá automáticamente en la tabla

### Estados y Notificaciones:

- ✅ **Éxito:** Notificación verde con mensaje de confirmación
- ❌ **Error:** Notificación roja con el mensaje de error específico
- ⏳ **Cargando:** El botón muestra un spinner y se deshabilita durante la creación

## 🔒 Seguridad

- ⚠️ **NUNCA** expongas `SUPABASE_SERVICE_ROLE_KEY` en el código del cliente
- ⚠️ **NUNCA** subas `.env.local` al repositorio (debe estar en `.gitignore`)
- ✅ Usa variables de entorno en producción
- ✅ La Service Role Key solo se usa en Server Actions (código del servidor)

## 🐛 Troubleshooting

### Error: "Variables de entorno no configuradas"
- Verifica que `SUPABASE_SERVICE_ROLE_KEY` esté en `.env.local`
- Reinicia el servidor de desarrollo después de agregar la variable

### Error: "No se pudo insertar en la tabla profiles"
- Crea la tabla `profiles` en Supabase usando el SQL proporcionado arriba
- Verifica que las políticas RLS permitan la inserción con Service Role

### El usuario se crea pero no aparece en la tabla
- La tabla se actualiza automáticamente con `revalidatePath`
- Si usas datos mock, el nuevo usuario se agrega localmente
- Para ver usuarios reales de Supabase, necesitas modificar `AccessManagement.tsx` para cargar desde la tabla `profiles`

## 📚 Próximos Pasos

Para cargar usuarios reales desde Supabase en lugar de datos mock:

1. Modifica `AccessManagement.tsx` para hacer un `SELECT * FROM profiles`
2. Usa el cliente de Supabase para obtener los usuarios
3. Mapea los datos de `profiles` al formato `User` del componente



