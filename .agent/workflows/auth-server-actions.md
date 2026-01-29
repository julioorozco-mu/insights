---
description: Implementar autenticación Server-Side con Next.js App Router y Supabase
---

# Workflow: Next.js + Supabase Auth (Server-Side)

Este workflow implementa el skill `nextjs-supabase-auth` para modernizar la autenticación del proyecto MicroCert.

## Arquitectura Implementada

```
┌─────────────────────────────────────────────────────────────┐
│                      SERVIDOR                               │
├─────────────────────────────────────────────────────────────┤
│  middleware.ts                                              │
│  ├── Refresca sesión (sincroniza cookies)                   │
│  ├── Protege rutas (/dashboard/*)                           │
│  └── Lee rol desde JWT (NO consulta DB)                     │
│                                                             │
│  src/lib/supabase/server.ts                                 │
│  ├── createClient() - Cliente para Server Components        │
│  ├── getAuthUser() - Obtiene usuario de forma segura        │
│  └── getUserRole() - Rol desde JWT                          │
│                                                             │
│  src/app/auth/actions.ts                                    │
│  ├── loginAction() - Login con FormData                     │
│  ├── signupAction() - Registro completo                     │
│  ├── logoutAction() - Cierre de sesión                      │
│  └── resetPasswordAction() - Recuperar contraseña           │
│                                                             │
│  src/app/dashboard/layout.tsx (Server Component)            │
│  ├── Verifica auth ANTES de renderizar                      │
│  ├── Obtiene datos del usuario                              │
│  └── Pasa datos a DashboardShell                            │
├─────────────────────────────────────────────────────────────┤
│                      CLIENTE                                │
├─────────────────────────────────────────────────────────────┤
│  src/components/auth/LoginForm.tsx                          │
│  ├── Usa loginAction via useTransition                      │
│  ├── Maneja rate limiting                                   │
│  └── Muestra errores de validación                          │
│                                                             │
│  src/components/layout/DashboardShell.tsx                   │
│  ├── Recibe usuario como prop del servidor                  │
│  ├── Maneja sidebar y topbar                                │
│  └── Usa logoutAction para cerrar sesión                    │
│                                                             │
│  src/contexts/AuthContext.tsx (simplificado)                │
│  └── Solo para escuchar cambios en tiempo real              │
└─────────────────────────────────────────────────────────────┘
```

## Archivos Creados/Modificados

### Nuevos Archivos

| Archivo | Descripción |
|---------|-------------|
| `src/lib/supabase/server.ts` | Cliente de Supabase para servidor |
| `src/lib/supabase/middleware.ts` | Cliente de Supabase para middleware |
| `src/lib/supabase/index.ts` | Barrel exports |
| `src/app/auth/actions.ts` | Server Actions de autenticación |
| `src/components/auth/LoginForm.tsx` | Formulario de login con Server Actions |
| `src/components/layout/DashboardShell.tsx` | Shell interactivo del dashboard |

### Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `middleware.ts` | Optimizado para NO consultar DB |
| `src/app/dashboard/layout.tsx` | Convertido a Server Component |
| `src/app/page.tsx` | Usa nuevo LoginForm |

## Cómo Usar

### Login con Server Actions

```tsx
// En cualquier Client Component
import { loginAction } from '@/app/auth/actions';

const formData = new FormData();
formData.append('email', email);
formData.append('password', password);

const result = await loginAction(formData);

if (result.success) {
  router.push(result.redirectTo || '/dashboard');
} else {
  setError(result.error);
}
```

### Verificar Auth en Server Components

```tsx
// En cualquier Server Component
import { getAuthUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ProtectedPage() {
  const user = await getAuthUser();
  
  if (!user) {
    redirect('/auth/login');
  }
  
  return <div>Hola, {user.email}</div>;
}
```

### Logout

```tsx
// En Client Components
import { logoutAction } from '@/app/auth/actions';

// Opción 1: Llamar directamente (redirige automáticamente)
await logoutAction();

// Opción 2: En un formulario
<form action={logoutAction}>
  <button type="submit">Cerrar Sesión</button>
</form>
```

## Beneficios

1. **Sin Flashes de Carga**: El dashboard verifica auth en el servidor, el usuario nunca ve spinners.
2. **Middleware Ligero**: No hace queries a DB, lee el rol del JWT.
3. **Seguridad Mejorada**: Usa `getUser()` en lugar de `getSession()`.
4. **Cookies Automáticas**: `@supabase/ssr` maneja la sincronización de cookies.

## Notas Importantes

- El `AuthContext` sigue existiendo para compatibilidad con código legacy.
- Para nuevas features, preferir Server Components + Server Actions.
- Los roles deben estar en `app_metadata` del JWT para máximo rendimiento.

// turbo-all
