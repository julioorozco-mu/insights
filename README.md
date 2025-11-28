# 🎓 epolítica - Plataforma de Capacitación Política

Plataforma de capacitación política con cursos en línea, transmisión en vivo, chat en tiempo real y gestión de contenido educativo para servidores públicos.

## 🚀 Quick Start

**¿Primera vez?** Lee la [Guía de Inicio Rápido](./QUICK_START.md) para empezar en 5 minutos.

**Migración completada:** Mux → Agora.io ✅ ([Ver detalles](./MIGRATION_COMPLETE.md))

## 🚀 Tecnologías

- **Framework**: Next.js 15 (App Router)
- **Frontend/UI**: React + Tailwind CSS + DaisyUI
- **Streaming**: Agora.io (WebRTC - Ultra Low Latency)
- **Chat**: Firebase Firestore (tiempo real)
- **Base de datos**: Firestore
- **Storage**: Firebase Storage
- **Autenticación**: Firebase Auth
- **Estado global**: Zustand
- **Validación**: Zod
- **Formularios**: React Hook Form

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

### Firebase

1. Crear proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Habilitar Authentication, Firestore y Storage
3. Copiar credenciales a `.env.local`

Ver guía completa: [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)

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

- ✅ Autenticación de usuarios (Firebase Auth)
- ✅ Gestión de cursos y lecciones
- ✅ **Transmisión en vivo desde el navegador** (Agora.io)
  - Sin OBS ni software externo
  - Latencia ultra-baja (1-3 segundos)
  - Hasta 500 espectadores simultáneos
- ✅ Chat en tiempo real (Firestore)
- ✅ Encuestas en vivo
- ✅ Subida de archivos (Firebase Storage)
- ✅ Roles de usuario (admin, instructor, student)
- ✅ Generación de certificados
- ✅ UI moderna y responsiva (DaisyUI)

## 🔒 Seguridad

- Variables de entorno para credenciales sensibles
- Reglas de seguridad en Firestore
- Validación de datos con Zod
- Autenticación requerida para rutas protegidas

## 📖 Documentación

- [🔥 Configuración de Firebase](./FIREBASE_SETUP.md)
- [🎥 Configuración de Agora](./AGORA_SETUP.md)
- [📺 Guía de Transmisiones en Vivo](./LIVE_STREAMING_GUIDE.md)
- [🎬 Ejemplos de Código](./AGORA_EXAMPLES.md)
- [🔄 Migración Mux → Agora](./MIGRATION_MUX_TO_AGORA.md)
- [📋 Resumen de Migración](./MIGRATION_SUMMARY.md)

## 🆕 Novedades

### v1.0.0 - Migración a Agora.io

La plataforma ha sido migrada de Mux a Agora.io para transmisiones en vivo:

- ✅ **Streaming directo desde navegador** - Sin OBS
- ✅ **Latencia ultra-baja** - 1-3 segundos vs 10-30 segundos
- ✅ **Más simple para ponentes** - Solo clic en botón
- ✅ **Mejor interactividad** - Chat y encuestas en tiempo real
- ✅ **Más económico** - Plan gratuito generoso

Ver [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md) para más detalles.

## 📄 Licencia

MIT
