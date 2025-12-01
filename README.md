# 🎓 MicroCert - Plataforma de Microcredenciales

> **Desarrollado por [Marca UNACH](https://marcaunach.com)**

Plataforma LMS (Learning Management System) para gestión de microcredenciales, cursos en línea, transmisión en vivo, chat en tiempo real y certificaciones digitales.

## 🚀 Quick Start

**¿Primera vez?** Lee la [Guía de Inicio Rápido](./QUICK_START.md) para empezar en 5 minutos.

### Estado del Proyecto

| Migración | Estado |
|-----------|--------|
| Mux → Agora.io | ✅ Completada |
| Firebase → Supabase | 🔄 En progreso (~19%) |

📋 Ver [MIGRATION_STATUS.md](./MIGRATION_STATUS.md) para detalles de la migración a Supabase.

## 🚀 Tecnologías

- **Framework**: Next.js 16 (App Router + Turbopack)
- **Frontend/UI**: React 19 + Tailwind CSS + DaisyUI
- **Streaming**: Agora.io (WebRTC - Ultra Low Latency)
- **Base de datos**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Autenticación**: Supabase Auth
- **Chat**: Supabase Realtime
- **Estado global**: Zustand
- **Validación**: Zod
- **Formularios**: React Hook Form
- **Íconos**: Lucide React

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.local.example .env.local
# Editar .env.local con tus credenciales

# Ejecutar en desarrollo
npm run dev

# Construir para producción
npm run build
npm start
```

## 🏗️ Estructura del Proyecto

```
src/
├── app/              # Rutas de Next.js (App Router)
├── components/       # Componentes React
├── hooks/           # Custom hooks
├── lib/             # Configuraciones y lógica de negocio
├── store/           # Estado global (Zustand)
├── styles/          # Estilos globales
├── types/           # Tipos TypeScript
└── utils/           # Utilidades
```

## 🔐 Configuración

### Supabase (Base de Datos y Auth)

1. Crear proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Ejecutar `schema.sql` en el SQL Editor
3. Copiar URL y Anon Key a `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

### Agora.io (Transmisiones en Vivo)

1. Crear cuenta en [Agora Console](https://console.agora.io/)
2. Crear proyecto y obtener APP ID y APP Certificate
3. Copiar credenciales a `.env.local`

Ver guía completa: [AGORA_SETUP.md](./AGORA_SETUP.md)

## 🎨 Scripts Disponibles

- `npm run dev` - Servidor de desarrollo
- `npm run build` - Construir para producción
- `npm start` - Ejecutar en producción
- `npm run lint` - Ejecutar ESLint
- `npm run format` - Formatear código con Prettier

## 📚 Características

- ✅ Autenticación de usuarios (Supabase Auth)
- ✅ Gestión de cursos y lecciones
- ✅ **Transmisión en vivo desde el navegador** (Agora.io)
  - Sin OBS ni software externo
  - Latencia ultra-baja (1-3 segundos)
  - Hasta 500 espectadores simultáneos
- ✅ Chat en tiempo real (Supabase Realtime)
- ✅ Encuestas en vivo
- ✅ Subida de archivos (Supabase Storage)
- ✅ Sistema de roles:
  - `student` - Estudiante
  - `teacher` - Maestro/Instructor
  - `admin` - Administrador
  - `support` - Soporte técnico
  - `superadmin` - Super administrador
- ✅ Generación de certificados digitales
- ✅ Sistema de microcredenciales
- ✅ UI moderna y responsiva (DaisyUI + Tailwind)

## 🔒 Seguridad

- Variables de entorno para credenciales sensibles
- Row Level Security (RLS) en Supabase
- Validación de datos con Zod
- Autenticación requerida para rutas protegidas

## 📖 Documentación

- [📋 Estado de Migración Firebase → Supabase](./MIGRATION_STATUS.md) ⭐
- [🎥 Configuración de Agora](./AGORA_SETUP.md)
- [📺 Guía de Transmisiones en Vivo](./LIVE_STREAMING_GUIDE.md)
- [🎬 Ejemplos de Código Agora](./AGORA_EXAMPLES.md)
- [🔄 Migración Mux → Agora](./MIGRATION_MUX_TO_AGORA.md)
- [📋 Resumen de Migración Agora](./MIGRATION_SUMMARY.md)

### Archivos Legacy (Firebase)

> ⚠️ Estos documentos son de referencia histórica. El proyecto ahora usa Supabase.

- [🔥 Configuración de Firebase](./FIREBASE_SETUP.md) *(legacy)*

## 🆕 Historial de Versiones

### v2.0.0 - Migración a Supabase (En progreso)

El proyecto está siendo migrado de Firebase a Supabase:

- 🔄 **Base de datos**: Firestore → PostgreSQL (Supabase)
- 🔄 **Autenticación**: Firebase Auth → Supabase Auth
- 🔄 **Storage**: Firebase Storage → Supabase Storage
- 🔄 **Realtime**: Firestore listeners → Supabase Realtime
- ✅ **Renombrado**: epolítica → MicroCert

Ver [MIGRATION_STATUS.md](./MIGRATION_STATUS.md) para el progreso detallado.

### v1.0.0 - Migración a Agora.io

La plataforma fue migrada de Mux a Agora.io para transmisiones en vivo:

- ✅ **Streaming directo desde navegador** - Sin OBS
- ✅ **Latencia ultra-baja** - 1-3 segundos vs 10-30 segundos
- ✅ **Más simple para ponentes** - Solo clic en botón
- ✅ **Mejor interactividad** - Chat y encuestas en tiempo real

## 👥 Equipo

Desarrollado por **Marca UNACH** - Universidad Autónoma de Chiapas

## 📄 Licencia

MIT
