# 🏥 SERVYSALUD 360 - Sistema de Trabajo Modificado

Sistema profesional de gestión de trabajo modificado para Servysalud, desarrollado con tecnologías modernas y mejores prácticas de desarrollo.

## 📋 Descripción

Sistema integral para la gestión de casos de trabajo modificado en el ámbito de salud ocupacional. Permite el registro, seguimiento y análisis de casos de trabajadores con restricciones laborales, cumpliendo con la normativa peruana de seguridad y salud en el trabajo (Ley 29783).

## 🚀 Características Principales

### ✨ Funcionalidades Core
- **📝 Formulario Multi-paso**: Sistema completo de registro con validación por pasos
  - Datos generales del trabajador
  - Evaluación de capacidad funcional (Sección A)
  - Análisis de puesto de trabajo (Sección B & C)
  - Seguimiento y reevaluaciones (Sección D & E)

- **📊 Dashboard Interactivo**: Visualización y gestión de casos
  - Búsqueda avanzada por trabajador, DNI o empresa
  - KPIs en tiempo real (Total casos, Activos, Cerrados, Días acumulados)
  - Tabla responsive con información detallada

- **🤖 Asistente IA con Gemini**: Chatbot especializado en salud ocupacional
  - Respuestas basadas en normativa peruana (Ley 29783)
  - Análisis de PDFs de exámenes médicos
  - Extracción automática de datos estructurados

- **💾 Integración con Supabase**: Almacenamiento seguro y escalable
  - Base de datos en tiempo real
  - Sincronización automática
  - Backup y recuperación de datos

## 📋 Requisitos Previos

- Node.js 18+ 
- npm o yarn
- Cuenta de Supabase
- API Key de Google Gemini

## 🔧 Instalación

1. Clona el repositorio:
```bash
git clone <url-del-repositorio>
cd servysalud-pro
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno. Crea un archivo `.env.local` en la raíz del proyecto:
```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
NEXT_PUBLIC_GEMINI_API_KEY=tu_api_key_de_gemini
```

4. Ejecuta el servidor de desarrollo:
```bash
npm run dev
```

5. Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🗄️ Base de Datos

El proyecto utiliza Supabase. Asegúrate de tener una tabla `registros_trabajadores` con las siguientes columnas:

- `fecha_registro` (date)
- `apellidos_nombre` (text)
- `dni_ce_pas` (text)
- `telefono_trabajador` (text)
- `sexo` (text)
- `jornada_laboral` (text)
- `puesto_trabajo` (text)
- `empresa` (text)
- `gerencia` (text)
- `supervisor_responsable` (text)
- `telf_contacto_supervisor` (text)

## 🛠️ Stack Tecnológico

### Frontend
- **Next.js 16** - Framework React con App Router
- **TypeScript** - Tipado estático para mayor seguridad
- **Tailwind CSS 4** - Framework de estilos utility-first
- **React 19** - Biblioteca UI moderna

### Backend & Base de Datos
- **Supabase** - Backend as a Service (BaaS)
  - PostgreSQL como base de datos
  - API REST automática
  - Autenticación y seguridad integrada

### IA & Machine Learning
- **Google Gemini 2.5 Flash** - Modelo de lenguaje para asistente IA
  - Análisis de documentos PDF
  - Extracción de datos estructurados
  - Respuestas contextuales especializadas

### UI/UX
- **Lucide React** - Iconos modernos y consistentes
- **Responsive Design** - Optimizado para móvil, tablet y desktop

## 📁 Estructura del Proyecto

```
servysalud-pro/
├── app/                          # Páginas y rutas de Next.js (App Router)
│   ├── page.tsx                 # Página principal con navegación y chat IA
│   ├── layout.tsx               # Layout raíz con metadata y fuentes
│   └── globals.css              # Estilos globales
├── components/                   # Componentes React reutilizables
│   ├── Dashboard.tsx            # Dashboard principal con listado de casos
│   ├── CaseForm.tsx             # Formulario multi-paso de casos
│   ├── Notification.tsx         # Componente de notificaciones toast
│   └── sections/                # Secciones del formulario
│       ├── GeneralInfo.tsx      # Paso 1: Datos generales
│       ├── PhysicalAssessment.tsx  # Paso 2: Evaluación física
│       ├── JobAnalysis.tsx      # Paso 4: Análisis de puesto
│       └── Reevaluation.tsx     # Paso 5: Reevaluaciones
├── lib/                          # Utilidades y configuraciones
│   └── supabase.ts              # Cliente de Supabase configurado
├── types.ts                     # Definiciones de tipos TypeScript
├── package.json                 # Dependencias y scripts
├── tsconfig.json                # Configuración de TypeScript
├── tailwind.config.js           # Configuración de Tailwind CSS
└── README.md                    # Este archivo
```

## 🚀 Despliegue

### Vercel (Recomendado)

1. **Conectar repositorio**
   - Ve a [Vercel](https://vercel.com)
   - Importa tu repositorio de GitHub

2. **Configurar variables de entorno**
   ```
   NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
   NEXT_PUBLIC_GEMINI_API_KEY=tu_api_key_gemini
   ```

3. **Desplegar**
   - Vercel detectará automáticamente Next.js
   - El despliegue se realizará automáticamente en cada push a `main`

### Otros proveedores

El proyecto puede desplegarse en cualquier plataforma que soporte Next.js:
- Netlify
- AWS Amplify
- Railway
- Render

## 🔒 Seguridad

- Las variables de entorno nunca deben subirse al repositorio
- El archivo `.env.local` está en `.gitignore`
- Usa variables de entorno en producción
- Revisa los permisos de Supabase (RLS - Row Level Security)

## 🧪 Desarrollo

### Scripts disponibles

```bash
npm run dev      # Servidor de desarrollo (localhost:3000)
npm run build    # Compilar para producción
npm run start    # Iniciar servidor de producción
npm run lint     # Ejecutar linter
```

### Próximas mejoras

- [ ] Autenticación de usuarios
- [ ] Exportación de reportes en PDF
- [ ] Dashboard con gráficos y estadísticas
- [ ] Notificaciones por email
- [ ] Integración con sistemas externos

## 📄 Licencia

Este proyecto es privado y propiedad de **Servysalud 360**.

Todos los derechos reservados © 2024

## 👥 Equipo

Desarrollado para **Servysalud 360** - Especialistas en Salud Ocupacional

---

**Versión:** 1.0.0  
**Última actualización:** Diciembre 2024
