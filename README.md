# SERVYSALUD 360 - Sistema de Trabajo Modificado

Sistema de gestión de trabajo modificado para Servysalud, desarrollado con Next.js, TypeScript, Supabase y Google Gemini AI.

## 🚀 Características

- **Formulario de Trabajo Modificado**: Sistema completo de registro con múltiples pasos
- **Dashboard de Gestión**: Visualización y búsqueda de casos registrados
- **Integración con Supabase**: Almacenamiento de datos en tiempo real
- **Asistente IA con Gemini**: Chatbot especializado en salud ocupacional
- **Análisis de PDFs**: Extracción automática de datos de exámenes médicos

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

## 🛠️ Tecnologías Utilizadas

- **Next.js 16**: Framework de React
- **TypeScript**: Tipado estático
- **Tailwind CSS**: Estilos
- **Supabase**: Base de datos y backend
- **Google Gemini AI**: Asistente inteligente
- **Lucide React**: Iconos

## 📝 Estructura del Proyecto

```
servysalud-pro/
├── app/                    # Páginas y rutas de Next.js
│   ├── page.tsx           # Página principal
│   └── layout.tsx         # Layout principal
├── components/            # Componentes React
│   ├── Dashboard.tsx      # Dashboard principal
│   ├── CaseForm.tsx       # Formulario de casos
│   ├── Notification.tsx   # Componente de notificaciones
│   └── sections/          # Secciones del formulario
├── lib/                   # Utilidades
│   └── supabase.ts       # Cliente de Supabase
├── types.ts              # Definiciones de tipos TypeScript
└── public/               # Archivos estáticos
```

## 🚀 Despliegue

El proyecto está listo para desplegarse en Vercel:

1. Conecta tu repositorio de GitHub a Vercel
2. Configura las variables de entorno en Vercel
3. Despliega automáticamente

## 📄 Licencia

Este proyecto es privado y propiedad de Servysalud.

## 👥 Autor

Desarrollado para Servysalud 360
