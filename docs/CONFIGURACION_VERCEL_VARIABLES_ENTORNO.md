# 🔧 Configuración de Variables de Entorno en Vercel

## ❌ Error Actual

```
Environment Variable "NEXT_PUBLIC_SUPABASE_URL" references Secret "supabase_url", which does not exist.
```

## ✅ Solución: Configurar Variables de Entorno en Vercel

### Paso 1: Acceder a la Configuración del Proyecto en Vercel

1. Ve a [vercel.com](https://vercel.com) e inicia sesión
2. Selecciona tu proyecto **SERVYSALUD360**
3. Ve a **Settings** → **Environment Variables**

### Paso 2: Configurar las Variables Requeridas

Agrega las siguientes variables de entorno:

#### 🔴 Variables OBLIGATORIAS (Críticas)

| Variable | Valor | Descripción |
|----------|--------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://tu-proyecto.supabase.co` | URL de tu proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` | Clave pública (anon) de Supabase |

#### 🟡 Variables OPCIONALES (Recomendadas)

| Variable | Valor | Descripción |
|----------|--------|--------------|
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` | Clave de servicio (para server actions) |
| `NEXT_PUBLIC_GEMINI_API_KEY` | `AIza...` | API Key de Google Gemini (para funcionalidad IA) |
| `NEXT_PUBLIC_AUTH_TIMEOUT` | `10000` | Timeout para autenticación (ms) |

### Paso 3: Configurar para Todos los Entornos

Para cada variable, asegúrate de seleccionar:
- ✅ **Production**
- ✅ **Preview** 
- ✅ **Development** (si aplica)

### Paso 4: Obtener los Valores de Supabase

1. Ve a tu proyecto en [supabase.com](https://supabase.com)
2. Ve a **Settings** → **API**
3. Copia los siguientes valores:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Mantener secreto)

### Paso 5: Obtener API Key de Gemini (Opcional)

1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Crea o copia tu API Key
3. Agrégala como `NEXT_PUBLIC_GEMINI_API_KEY`

### Paso 6: Guardar y Redesplegar

1. Haz clic en **Save** para guardar todas las variables
2. Ve a **Deployments**
3. Haz clic en los **3 puntos** del último deployment
4. Selecciona **Redeploy**

## 📋 Checklist de Variables

Antes de redesplegar, verifica que tengas:

- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurada
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurada
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurada (recomendado)
- [ ] `NEXT_PUBLIC_GEMINI_API_KEY` configurada (opcional, para funcionalidad IA)
- [ ] Todas las variables están en **Production**, **Preview** y **Development**

## ⚠️ Notas Importantes

1. **NO** uses referencias a secretos que no existen
2. **NO** subas archivos `.env` al repositorio
3. Las variables `NEXT_PUBLIC_*` son públicas (se incluyen en el bundle del cliente)
4. `SUPABASE_SERVICE_ROLE_KEY` es **SECRETA** - nunca la expongas en el cliente

## 🔍 Verificar Configuración

Después de configurar, puedes verificar en el deployment:

1. Ve a **Deployments** → Selecciona un deployment
2. Ve a **Build Logs**
3. Verifica que no haya errores relacionados con variables de entorno

## 🆘 Si el Error Persiste

1. Verifica que las variables estén escritas **exactamente** como se muestra (case-sensitive)
2. Asegúrate de que no haya espacios extra al inicio o final
3. Elimina cualquier referencia a secretos inexistentes
4. Intenta crear un nuevo deployment desde cero

---

**Última actualización:** 29 de Enero 2025

