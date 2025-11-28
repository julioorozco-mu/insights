# 🚀 Guía de Inicio Rápido

## Instalación

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copia el archivo de ejemplo y configura tus credenciales:

```bash
cp .env.local.example .env.local
```

Edita `.env.local` con tus credenciales de Firebase y Mux.

### 3. Configurar Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto
3. Habilita:
   - **Authentication** → Email/Password
   - **Firestore Database** → Modo producción
   - **Storage** → Modo producción
4. Copia las credenciales a `.env.local`

### 4. Configurar Mux

1. Ve a [Mux Dashboard](https://dashboard.mux.com/)
2. Crea una cuenta
3. Genera tokens de API
4. Copia las credenciales a `.env.local`

### 5. Poblar base de datos con datos de prueba

```bash
npm run seed
```

Esto creará usuarios de prueba para cada rol:

- **Admin**: `admin@test.com` / `admin123`
- **Instructor**: `instructor@test.com` / `instructor123`
- **Estudiante**: `estudiante@test.com` / `estudiante123`

### 6. Ejecutar el proyecto

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🎯 Estructura del Proyecto

```
src/
├── app/                    # Rutas de Next.js
│   ├── (auth)/            # Páginas de autenticación
│   ├── (dashboard)/       # Páginas del dashboard
│   └── api/               # API Routes
├── components/            # Componentes React
│   ├── layout/           # Componentes de layout
│   ├── common/           # Componentes comunes
│   ├── live/             # Componentes de streaming
│   └── chat/             # Componentes de chat
├── hooks/                # Custom hooks
├── lib/                  # Lógica de negocio
│   ├── repositories/     # Acceso a datos
│   ├── services/         # Servicios
│   └── validators/       # Validadores Zod
├── store/                # Estado global (Zustand)
├── types/                # Tipos TypeScript
├── utils/                # Utilidades
└── styles/               # Estilos globales
```

## 👥 Roles y Permisos

### Admin
- ✅ Gestión completa de cursos
- ✅ Gestión de tutores/instructores
- ✅ Gestión de estudiantes
- ✅ Creación de encuestas
- ✅ Gestión de recursos
- ✅ Gestión de certificados

### Instructor/Ponente
- ✅ Crear y gestionar sus cursos
- ✅ Ver alumnos por curso
- ✅ Iniciar transmisiones en vivo
- ✅ Gestionar recursos propios
- ✅ Crear encuestas para sus cursos

### Estudiante
- ✅ Ver cursos disponibles
- ✅ Inscribirse a cursos
- ✅ Acceder a lecciones
- ✅ Descargar recursos
- ✅ Responder encuestas
- ✅ Ver certificados obtenidos

## 📊 Colecciones de Firestore

### users
```typescript
{
  id: string
  name: string
  lastName: string
  email: string
  role: "admin" | "instructor" | "student"
  phone?: string
  state?: string
  city?: string
  isActive: boolean
  createdAt: Date
}
```

### courses
```typescript
{
  id: string
  title: string
  description: string
  instructorId: string
  lessons: string[]
  price?: number
  level?: "beginner" | "intermediate" | "advanced"
  category?: string
  isPublished: boolean
  createdAt: Date
}
```

### lessons
```typescript
{
  id: string
  courseId: string
  title: string
  description: string
  order: number
  videoUrl?: string
  duration?: number
  resources: Resource[]
  surveys: string[]
  isPublished: boolean
}
```

### enrollments
```typescript
{
  id: string
  userId: string
  courseId: string
  status: "active" | "completed" | "cancelled"
  progress: number
  completedLessons: string[]
  enrolledAt: Date
}
```

### surveys
```typescript
{
  id: string
  title: string
  questions: Question[]
  courseId?: string
  lessonId?: string
  createdBy: string
  isActive: boolean
}
```

### certificates
```typescript
{
  id: string
  userId: string
  courseId: string
  templateId: string
  certificateUrl?: string
  issuedAt: Date
}
```

## 🎨 Temas de DaisyUI

El proyecto usa DaisyUI con los siguientes temas disponibles:
- `light` (por defecto)
- `dark`
- `cupcake`

Puedes cambiar el tema en `tailwind.config.ts`.

## 🔒 Reglas de Seguridad de Firestore

Las reglas de seguridad están documentadas en `SETUP.md`. Asegúrate de configurarlas antes de desplegar a producción.

## 📝 Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Construir para producción
npm start            # Ejecutar en producción
npm run lint         # Ejecutar ESLint
npm run format       # Formatear código
npm run seed         # Poblar base de datos
```

## 🐛 Solución de Problemas

### Error: Firebase no inicializado
- Verifica que las variables de entorno estén configuradas correctamente
- Asegúrate de que el archivo `.env.local` exista

### Error: Mux API
- Verifica tus tokens de Mux
- Asegúrate de que tengan los permisos correctos

### Error al poblar la base de datos
- Verifica que Firebase esté configurado
- Asegúrate de que Authentication esté habilitado

## 📚 Recursos Adicionales

- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Firebase](https://firebase.google.com/docs)
- [Documentación de Mux](https://docs.mux.com/)
- [Documentación de DaisyUI](https://daisyui.com/)
- [Documentación de Zod](https://zod.dev/)

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

MIT
