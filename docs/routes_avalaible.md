# Rutas del Proyecto - MicroCert by Marca UNACH

## 📋 Tabla de Contenidos

- [Rutas Públicas](#-rutas-públicas)
- [Rutas de Autenticación](#-rutas-de-autenticación)
- [Dashboard Principal](#-dashboard-principal-protegidas)
- [Rutas de Estudiantes](#-rutas-de-estudiantes)
- [Rutas de Profesores/Teachers](#-rutas-de-profesoresteachers)
- [Rutas de Certificados](#-rutas-de-certificados)
- [Rutas de Encuestas](#-rutas-de-encuestas)
- [Rutas de Recursos](#-rutas-de-recursos)
- [Rutas Administrativas](#-rutas-administrativas)
- [Protección de Rutas](#-protección-de-rutas)
- [Redirección por Rol](#-redirección-por-rol)

---

## 🌐 Rutas Públicas

Estas rutas son accesibles sin autenticación.

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/` | `src/app/page.tsx` | Página principal (landing page) |
| `/course/[id]` | `src/app/course/[id]/page.tsx` | Vista pública de curso específico |
| `/profile/[id]` | `src/app/profile/[id]/page.tsx` | Perfil público de usuario |

---

## 🔐 Rutas de Autenticación

Rutas para el proceso de login, registro y recuperación de cuenta.

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/auth/login` | `src/app/auth/login/page.tsx` | Inicio de sesión |
| `/auth/sign-up` | `src/app/auth/sign-up/page.tsx` | Registro de nuevos usuarios |
| `/auth/recover-password` | `src/app/auth/recover-password/page.tsx` | Recuperación de contraseña |

**Características de seguridad implementadas:**
- Rate limiting: 5 intentos cada 15 minutos
- Bloqueo de 30 minutos tras exceder límite
- Validación anti-XSS/injection
- Feedback visual de intentos restantes

---

## 📊 Dashboard Principal (Protegidas)

Rutas principales del dashboard accesibles para todos los roles autenticados.

| Ruta | Archivo | Descripción | Rol |
|------|---------|-------------|-----|
| `/dashboard` | `src/app/dashboard/page.tsx` | Dashboard principal | Todos |
| `/dashboard/profile` | `src/app/dashboard/profile/page.tsx` | Perfil de usuario | Todos |
| `/dashboard/settings` | `src/app/dashboard/settings/page.tsx` | Configuración de cuenta | Todos |

---

## 👨‍🎓 Rutas de Estudiantes

Funcionalidades específicas para estudiantes.

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/dashboard/student/courses/[id]` | `src/app/dashboard/student/courses/[id]/page.tsx` | Vista de curso inscrito |
| `/dashboard/student/courses/[id]/livestream/[lessonId]` | `src/app/dashboard/student/courses/[id]/livestream/[lessonId]/page.tsx` | Livestream de lección |
| `/dashboard/enrolled-courses` | `src/app/dashboard/enrolled-courses/page.tsx` | Cursos inscritos |
| `/dashboard/available-courses` | `src/app/dashboard/available-courses/page.tsx` | Catálogo de cursos disponibles |
| `/dashboard/certificates` | `src/app/dashboard/certificates/page.tsx` | Certificados obtenidos |

---

## 👨‍🏫 Rutas de Profesores/Teachers

Funcionalidades para creación y gestión de contenido educativo.

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/dashboard/my-courses` | `src/app/dashboard/my-courses/page.tsx` | Mis cursos creados |
| `/dashboard/my-students` | `src/app/dashboard/my-students/page.tsx` | Estudiantes de mis cursos |
| `/dashboard/courses/new` | `src/app/dashboard/courses/new/page.tsx` | Crear nuevo curso |
| `/dashboard/courses/[id]` | `src/app/dashboard/courses/[id]/page.tsx` | Detalles de curso |
| `/dashboard/courses/[id]/edit` | `src/app/dashboard/courses/[id]/edit/page.tsx` | Editar curso |
| `/dashboard/courses/[id]/manage` | `src/app/dashboard/courses/[id]/manage/page.tsx` | Gestionar curso |
| `/dashboard/courses/[id]/lessons/new` | `src/app/dashboard/courses/[id]/lessons/new/page.tsx` | Agregar lección |
| `/dashboard/lessons/[id]` | `src/app/dashboard/lessons/[id]/page.tsx` | Detalles de lección |
| `/dashboard/lessons/[id]/edit` | `src/app/dashboard/lessons/[id]/edit/page.tsx` | Editar lección |
| `/dashboard/live` | `src/app/dashboard/live/page.tsx` | Clases en vivo |
| `/dashboard/live/[id]` | `src/app/dashboard/live/[id]/page.tsx` | Clase en vivo específica |

---

## 📜 Rutas de Certificados

Gestión de certificados digitales.

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/dashboard/certificates` | `src/app/dashboard/certificates/page.tsx` | Gestión de certificados |
| `/dashboard/certificates/new` | `src/app/dashboard/certificates/new/page.tsx` | Crear certificado |
| `/dashboard/certificates/[id]/edit` | `src/app/dashboard/certificates/[id]/edit/page.tsx` | Editar certificado |
| `/dashboard/certificates/[id]/preview` | `src/app/dashboard/certificates/[id]/preview/page.tsx` | Vista previa de certificado |

---

## 📋 Rutas de Encuestas

Sistema de encuestas y evaluaciones.

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/dashboard/surveys` | `src/app/dashboard/surveys/page.tsx` | Gestión de encuestas |
| `/dashboard/surveys/new` | `src/app/dashboard/surveys/new/page.tsx` | Crear encuesta |
| `/dashboard/surveys/[id]/edit` | `src/app/dashboard/surveys/[id]/edit/page.tsx` | Editar encuesta |

---

## 📚 Rutas de Recursos

Biblioteca y gestión de recursos educativos.

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/dashboard/resources` | `src/app/dashboard/resources/page.tsx` | Biblioteca de recursos |
| `/dashboard/my-resources` | `src/app/dashboard/my-resources/page.tsx` | Mis recursos |

---

## 📈 Rutas Administrativas

Panel de administración con acceso restringido.

| Ruta | Archivo | Descripción | Rol |
|------|---------|-------------|-----|
| `/dashboard/analytics` | `src/app/dashboard/analytics/page.tsx` | Análisis y estadísticas | Admin |
| `/dashboard/users` | `src/app/dashboard/users/page.tsx` | Gestión de usuarios | Admin |
| `/dashboard/students` | `src/app/dashboard/students/page.tsx` | Gestión de estudiantes | Admin |
| `/dashboard/teachers` | `src/app/dashboard/teachers/page.tsx` | Gestión de profesores | Admin |
| `/dashboard/support` | `src/app/dashboard/support/page.tsx` | Sistema de soporte | Support, Admin |
| `/dashboard/reports` | `src/app/dashboard/reports/page.tsx` | Reportes | Admin |
| `/dashboard/payments` | `src/app/dashboard/payments/page.tsx` | Gestión de pagos | Admin |
| `/dashboard/messages` | `src/app/dashboard/messages/page.tsx` | Mensajes internos | Admin |

---

## 🛡️ Protección de Rutas

### Middleware Implementation

El proyecto implementa un middleware de Next.js (`middleware.ts`) que proporciona:

- **Protección a nivel servidor** para todas las rutas `/dashboard/*`
- **Redirección automática** a `/auth/login` con parámetro `redirectTo`
- **Bloqueo de acceso** a rutas de auth para usuarios ya autenticados
- **Validación de roles** para rutas específicas
- **Headers de seguridad** adicionales

### Rutas Protegidas por Defecto

```typescript
const PROTECTED_ROUTES = ['/dashboard', '/profile', '/courses/my', '/settings'];
```

### Permisos por Rol

```typescript
const ROLE_PERMISSIONS = {
  '/dashboard/admin': ['admin', 'superadmin'],
  '/dashboard/support': ['support', 'admin', 'superadmin'],
  '/dashboard/my-courses': ['teacher', 'speaker', 'admin', 'superadmin'],
};
```

---

## 🔄 Redirección por Rol

Después del login exitoso, los usuarios son redirigidos según su rol:

| Rol | Ruta de Destino |
|-----|-----------------|
| `admin` / `superadmin` | `/dashboard` |
| `teacher` / `speaker` | `/dashboard/my-courses` |
| `support` | `/dashboard/support` |
| `student` | `/dashboard` |

### Lógica de Redirección

```typescript
function getRedirectByRole(role: string | undefined): string {
  switch (role) {
    case "admin":
    case "superadmin":
      return "/dashboard";
    case "teacher":
    case "speaker":
      return "/dashboard/my-courses";
    case "support":
      return "/dashboard/support";
    case "student":
    default:
      return "/dashboard";
  }
}
```

---

## 📝 Notas Técnicas

1. **Arquitectura**: Next.js 16 con App Router
2. **Autenticación**: Supabase Auth con middleware de protección
3. **Rate Limiting**: Implementado a nivel cliente con localStorage
4. **Validación**: Zod schemas para validación de inputs
5. **Tipado**: TypeScript estricto con tipos generados

### Archivos Clave

- `middleware.ts` - Protección de rutas a nivel servidor
- `src/contexts/AuthContext.tsx` - Gestión de autenticación
- `src/lib/auth/rateLimiter.ts` - Sistema de rate limiting
- `src/lib/validators/userSchema.ts` - Validación de formularios

---

**Última actualización:** Diciembre 2024  
**Versión:** v5.0 - MicroCert by Marca UNACH
