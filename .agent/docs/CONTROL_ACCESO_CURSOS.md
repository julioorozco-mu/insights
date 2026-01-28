# Control de Acceso a Cursos - Implementación

## Descripción General

Se implementó un sistema robusto de control de acceso para que los estudiantes solo puedan acceder a cursos vinculados a microcredenciales en las que estén inscritos.

## Flujo de Decisiones

```
┌─────────────────────────────────────────────────────────────────┐
│              ESTUDIANTE INTENTA ACCEDER A CURSO X               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                  ┌─────────────────────┐
                  │ ¿Es maestro/admin?  │
                  └─────────────────────┘
                       │           │
                      SÍ          NO
                       │           │
    ┌──────────────────┘           └──────────────────┐
    │                                                 │
    ▼                                                 ▼
┌─────────────┐                         ┌─────────────────────────┐
│ ACCESO OK   │                         │ API: check-course-access│
│ (Preview)   │                         └─────────────────────────┘
└─────────────┘                                       │
                                                      ▼
                                    ┌─────────────────────────────┐
                                    │ ¿Curso pertenece a alguna   │
                                    │    microcredencial (MC)?    │
                                    └─────────────────────────────┘
                                           │           │
                                          SÍ          NO
                                           │           │
             ┌─────────────────────────────┘           └──────────────────┐
             │                                                            │
             ▼                                                            ▼
  ┌─────────────────────────┐                              ┌────────────────────┐
  │ ¿Estudiante inscrito    │                              │ CASO C:            │
  │ en ESA MC?              │                              │ Redirigir a        │
  └─────────────────────────┘                              │ /available-courses │
         │           │                                     │ ?previewCourse=X   │
        SÍ          NO                                     └────────────────────┘
         │           │
         ▼           ▼
┌──────────────┐  ┌────────────────────────────┐
│ ¿Es L2 y    │  │ CASO B:                    │
│ está        │  │ Redirigir a                │
│ bloqueado?  │  │ /catalog/microcredentials  │
└──────────────┘  │ ?openMc=<slug>            │
    │       │     └────────────────────────────┘
   SÍ      NO
    │       │
    ▼       ▼
┌───────────┐  ┌──────────────┐
│ Mensaje:  │  │ CASO A:      │
│ "Completa │  │ ACCESO       │
│ L1 primero│  │ PERMITIDO ✓  │
└───────────┘  └──────────────┘
```

## Archivos Modificados

### 1. API Route: `/api/student/check-course-access/route.ts`

**Cambios:**
- Refactorizada completamente para manejar los 3 casos de uso
- Retorna información detallada sobre:
  - `canAccess`: Si el estudiante puede acceder
  - `isMicrocredentialCourse`: Si el curso pertenece a una MC
  - `isEnrolledInMicrocredential`: Si está inscrito en la MC
  - `redirectTo`: Destino de redirección sugerido
  - `redirectUrl`: URL completa con parámetros

### 2. Repository: `/lib/repositories/microcredentialRepository.ts`

**Cambios:**
- Nueva función `findMicrocredentialByCourseId(courseId)`:
  - Busca si un curso pertenece a **cualquier** microcredencial (no solo las del estudiante)
  - Retorna: `{ microcredentialId, microcredentialSlug, microcredentialTitle, levelNumber }`

### 3. Página de Curso: `/dashboard/student/courses/[id]/page.tsx`

**Cambios:**
- Agregada lógica de verificación de acceso de microcredenciales antes de la verificación tradicional
- Redirección automática según el caso:
  - Caso B → Catálogo de microcredenciales con drawer abierto
  - Caso C → Cursos disponibles con preview abierto
  - L2 bloqueado → Alert + redirección a cursos inscritos

### 4. Catálogo de Microcredenciales: `/dashboard/catalog/microcredentials/page.tsx`

**Cambios:**
- Nuevo parámetro URL: `?openMc=<slug>`
- `useEffect` que detecta el parámetro y abre automáticamente el drawer de la MC
- Limpieza del parámetro de la URL después de abrir

### 5. Cursos Disponibles: `/dashboard/available-courses/page.tsx`

**Cambios:**
- Nuevo parámetro URL: `?previewCourse=<courseId>`
- `useEffect` que detecta el parámetro y abre automáticamente el side sheet de preview
- Limpieza del parámetro de la URL después de abrir

## Consideraciones de Seguridad

1. **Validación en Backend**: Toda la lógica de acceso se ejecuta en el servidor (API route)
2. **Bypass para Roles Privilegiados**: Maestros y admins pueden acceder sin restricciones (modo preview)
3. **Verificación de Pago**: Si la MC es de pago y no está verificada, se bloquea el acceso
4. **No Exposición de IDs Sensibles**: Solo se exponen slugs públicos y IDs de cursos

## Testing Manual

### Caso A (Acceso Permitido):
1. Inscribirse en una microcredencial
2. Navegar directamente a `/dashboard/student/courses/<course_level_1_id>`
3. **Esperado**: Se carga el contenido del curso

### Caso B (Redirigir a MC):
1. Obtener el ID de un curso que pertenece a una MC en la que NO estás inscrito
2. Navegar a `/dashboard/student/courses/<course_id>`
3. **Esperado**: Redirección a `/dashboard/catalog/microcredentials?openMc=<slug>` con drawer abierto

### Caso C (Redirigir a Available):
1. Crear un curso que NO pertenezca a ninguna MC
2. Navegar a `/dashboard/student/courses/<course_id>` (sin inscripción)
3. **Esperado**: Redirección a `/dashboard/available-courses?previewCourse=<id>` con drawer abierto

## Dependencias

- `next/navigation`: `useRouter`, `useSearchParams`
- `@/lib/repositories/microcredentialRepository`
- `@/types/microcredential`

## Notas de Migración

Ninguna migración de base de datos requerida. La estructura de tablas `microcredentials` y `microcredential_enrollments` ya existe.
