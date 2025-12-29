# Guía de Deployment en Vercel

## 📋 Pre-requisitos

1. Cuenta en [Vercel](https://vercel.com)
2. Proyecto conectado a un repositorio Git (GitHub, GitLab, Bitbucket)
3. Variables de entorno configuradas

## 🚀 Deployment Rápido

### Opción 1: CLI de Vercel (Recomendado)

```bash
# Instalar Vercel CLI globalmente
npm i -g vercel

# Login en Vercel
vercel login

# Deploy a preview
vercel

# Deploy a producción
vercel --prod
```

### Opción 2: Dashboard de Vercel

1. Ve a [vercel.com/new](https://vercel.com/new)
2. Conecta tu repositorio Git
3. Configura las variables de entorno
4. Click en "Deploy"

## 🔐 Variables de Entorno Requeridas

Configura estas variables en el dashboard de Vercel o usando la CLI:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Google Generative AI (Gemini)
NEXT_PUBLIC_GEMINI_API_KEY=tu_api_key
```

### Configurar variables con CLI:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXT_PUBLIC_GEMINI_API_KEY
```

## ✅ Checklist Pre-Deploy

Antes de hacer deploy, ejecuta el script de verificación:

```bash
bash scripts/pre-deploy-check.sh
```

O verifica manualmente:

- [ ] Variables de entorno configuradas en Vercel
- [ ] Tests pasando (`npm test`)
- [ ] Build exitoso (`npm run build`)
- [ ] Linter sin errores (`npm run lint`)
- [ ] Sin errores en consola del navegador
- [ ] Dark mode funcionando correctamente
- [ ] Responsive design OK
- [ ] PWA funcionando (si aplica)

## 🧪 Testing en Producción

Después del deploy, verifica:

1. **Funcionalidad básica:**
   - Login funciona
   - Navegación entre módulos
   - Dark mode toggle

2. **Performance:**
   - Lighthouse score > 90
   - Tiempo de carga < 3s
   - Sin errores en consola

3. **Responsive:**
   - Mobile (< 768px)
   - Tablet (768px - 1024px)
   - Desktop (> 1024px)

## 🔄 Actualizaciones

Para actualizar el proyecto en producción:

```bash
# Hacer cambios y commit
git add .
git commit -m "Descripción de cambios"
git push

# Vercel automáticamente detectará los cambios y hará deploy
# O manualmente:
vercel --prod
```

## 📊 Monitoreo

- **Analytics:** Disponible en el dashboard de Vercel
- **Logs:** `vercel logs [deployment-url]`
- **Insights:** Dashboard de Vercel > Analytics

## 🐛 Troubleshooting

### Build falla

```bash
# Ver logs detallados
vercel logs [deployment-url]

# Build local para debug
npm run build
```

### Variables de entorno no funcionan

- Verifica que las variables estén configuradas en Vercel
- Asegúrate de que las variables `NEXT_PUBLIC_*` estén disponibles en el cliente
- Reinicia el deployment después de agregar variables

### Errores de runtime

- Revisa los logs en Vercel Dashboard
- Verifica la consola del navegador
- Revisa Network tab para errores de API

## 📚 Recursos

- [Documentación de Vercel](https://vercel.com/docs)
- [Next.js en Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Variables de Entorno](https://vercel.com/docs/environment-variables)

