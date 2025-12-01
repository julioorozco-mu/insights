# 🔄 Estado de Migración: Firebase → Supabase

> **Fecha de generación:** 30 de Noviembre, 2025  
> **Proyecto:** MicroCert by Marca UNACH  
> **Versión:** 1.0.0

---

## 🤖 INSTRUCCIONES PARA AI AGENT

<details>
<summary><strong>📋 LEER ANTES DE EMPEZAR (Click para expandir)</strong></summary>

### Contexto del Proyecto

Este proyecto es una plataforma LMS (Learning Management System) llamada **MicroCert** desarrollada por **Marca UNACH**. Originalmente usaba **Firebase** (Firestore, Auth, Storage) y está siendo migrada a **Supabase** (PostgreSQL, Auth, Storage).

### Tu Rol como AI Agent

Eres el asistente de migración. Tu objetivo es ayudar a migrar los archivos de la lista **⚠️ STUB ACTIVO** a la lista **✅ MIGRADO**.

### Reglas de Migración

1. **SIEMPRE** reemplazar imports de Firebase por Supabase:
   ```typescript
   // ❌ ELIMINAR
   import { collection, getDocs } from "firebase/firestore";
   import { db } from "@/lib/firebase";
   
   // ✅ USAR
   import { supabaseClient } from "@/lib/supabase";
   import { TABLES } from "@/utils/constants";
   ```

2. **PREFERIR** usar repositorios existentes en lugar de queries directas:
   ```typescript
   // ✅ MEJOR - Usar repositorio
   import { courseRepository } from "@/lib/repositories/courseRepository";
   const courses = await courseRepository.findAll();
   
   // ⚠️ ACEPTABLE - Query directa
   const { data } = await supabaseClient.from(TABLES.COURSES).select("*");
   ```

3. **MAPEAR** nombres de campos (Firebase usa camelCase, Supabase usa snake_case):
   - `createdAt` → `created_at`
   - `isActive` → `is_active`
   - `speakerIds` → `teacher_ids`
   - `coverImageUrl` → `cover_image_url`

4. **MANEJAR** errores de Supabase:
   ```typescript
   const { data, error } = await supabaseClient.from(TABLES.X).select("*");
   if (error) {
     console.error("Error:", error);
     return [];
   }
   ```

5. **NO INVENTAR** tablas o campos. Solo usar los definidos en `schema.sql`.

### Archivos de Referencia

| Archivo | Propósito |
|---------|-----------|
| `schema.sql` | Estructura de la base de datos PostgreSQL |
| `src/lib/supabase.ts` | Cliente de Supabase |
| `src/utils/constants.ts` | Constantes y nombres de tablas (`TABLES`) |
| `src/lib/repositories/*` | Ejemplos de código migrado |

### Instrucciones para Actualizar Este Documento

**IMPORTANTE:** Después de migrar un archivo, DEBES actualizar este documento:

1. **Mover el archivo** de la sección "⚠️ Archivos con Stub Activo" a "✅ Archivos Migrados"
2. **Actualizar los contadores** en el Resumen Ejecutivo:
   - Incrementar "Archivos migrados a Supabase"
   - Decrementar "Archivos usando stubs"
   - Recalcular "Progreso estimado" como: `(migrados / total) * 100`
3. **Marcar checkbox** en la sección "🎯 Orden de Migración Recomendado" con `[x]`

**Ejemplo de actualización después de migrar `src/app/page.tsx`:**

```markdown
## 📊 Resumen Ejecutivo
| Métrica | Valor |
|---------|-------|
| **Archivos migrados a Supabase** | 11 |  <!-- Era 10, ahora 11 -->
| **Archivos usando stubs** | 41 |         <!-- Era 42, ahora 41 -->
| **Progreso estimado** | ~21% |           <!-- (11/52)*100 -->

## 🎯 Orden de Migración Recomendado
1. **Fase 1 - Core Dashboard**
   - [x] `src/app/page.tsx`  <!-- Marcado como completado -->
```

### Comando para el Usuario

Cuando el usuario pida migrar un archivo, responde con:
1. Los cambios de código necesarios
2. La actualización correspondiente a este documento
3. Instrucciones para probar la migración

</details>

---

## 📊 Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| **Archivos migrados a Supabase** | 10 |
| **Archivos usando stubs (Firebase fake)** | 42 |
| **Progreso estimado** | ~19% |

### Leyenda de Estados

- ✅ **MIGRADO** - Usa Supabase real, datos persistentes
- ⚠️ **STUB ACTIVO** - Compila pero NO guarda datos (funciones vacías)
- 🔧 **COMPATIBILIDAD** - Archivo puente para evitar errores de compilación

---

## ✅ Archivos Migrados (Operacionales)

Estos archivos ya conectan a Supabase y funcionan correctamente:

### Core / Autenticación
| Archivo | Descripción |
|---------|-------------|
| `src/hooks/useAuth.ts` | Hook de autenticación (login, registro, logout) |

### Repositorios (Data Access Layer)
| Archivo | Descripción |
|---------|-------------|
| `src/lib/repositories/userRepository.ts` | CRUD de usuarios |
| `src/lib/repositories/studentRepository.ts` | CRUD de estudiantes + inscripciones |
| `src/lib/repositories/courseRepository.ts` | CRUD de cursos |
| `src/lib/repositories/liveRepository.ts` | Gestión de livestreams |
| `src/lib/repositories/siteConfigRepository.ts` | Configuración del sitio |

### Servicios
| Archivo | Descripción |
|---------|-------------|
| `src/lib/services/attendanceService.ts` | Registro de asistencia |
| `src/lib/services/chatService.ts` | Chat en vivo |
| `src/lib/services/fileService.ts` | Subida de archivos |
| `src/lib/services/resourceService.ts` | Recursos de maestros |

---

## ⚠️ Archivos con Stub Activo (Pendientes de Migración)

Estos archivos compilan pero **NO guardan datos reales**. Sus queries retornan arrays vacíos o no hacen nada.

### Páginas del Dashboard (Alta Prioridad)

| Archivo | Imports Firebase | Prioridad |
|---------|------------------|-----------|
| `src/app/page.tsx` | `@/lib/firebase`, `firebase/firestore` | 🔴 Alta |
| `src/app/dashboard/courses/page.tsx` | `@/lib/firebase`, `firebase/firestore` | 🔴 Alta |
| `src/app/dashboard/courses/[id]/page.tsx` | `@/lib/firebase`, `firebase/firestore` | 🔴 Alta |
| `src/app/dashboard/courses/[id]/edit/page.tsx` | `@/lib/firebase`, `firebase/firestore`, `firebase/storage` | 🔴 Alta |
| `src/app/dashboard/courses/[id]/manage/page.tsx` | `@/lib/firebase`, `firebase/firestore`, `firebase/storage` | 🔴 Alta |
| `src/app/dashboard/courses/[id]/lessons/new/page.tsx` | `@/lib/firebase`, `firebase/firestore`, `firebase/storage` | 🔴 Alta |
| `src/app/dashboard/courses/new/page.tsx` | `@/lib/firebase`, `firebase/firestore` | 🔴 Alta |
| `src/app/dashboard/students/page.tsx` | `@/lib/firebase`, `firebase/firestore` | 🔴 Alta |
| `src/app/dashboard/speakers/page.tsx` | `@/lib/firebase`, `firebase/firestore`, `firebase/auth` | 🔴 Alta |
| `src/app/dashboard/settings/page.tsx` | `@/lib/firebase`, `firebase/auth`, `firebase/storage` | 🟡 Media |

### Páginas de Cursos y Lecciones

| Archivo | Imports Firebase |
|---------|------------------|
| `src/app/course/[id]/page.tsx` | `@/lib/firebase`, `firebase/firestore` |
| `src/app/dashboard/available-courses/page.tsx` | `@/lib/firebase`, `firebase/firestore` |
| `src/app/dashboard/enrolled-courses/page.tsx` | `@/lib/firebase`, `firebase/firestore` |
| `src/app/dashboard/lessons/[id]/page.tsx` | `@/lib/firebase`, `firebase/firestore` (x2) |
| `src/app/dashboard/lessons/[id]/edit/page.tsx` | `@/lib/firebase`, `firebase/firestore`, `firebase/storage` |
| `src/app/dashboard/my-students/page.tsx` | `@/lib/firebase`, `firebase/firestore` |

### Páginas de Estudiantes (Vista Estudiante)

| Archivo | Imports Firebase |
|---------|------------------|
| `src/app/dashboard/student/courses/[id]/page.tsx` | `@/lib/firebase`, `firebase/firestore` |
| `src/app/dashboard/student/courses/[id]/page-old.tsx` | `@/lib/firebase`, `firebase/firestore` |
| `src/app/dashboard/student/courses/[id]/livestream/[lessonId]/page.tsx` | `@/lib/firebase`, `firebase/firestore` |

### Certificados

| Archivo | Imports Firebase |
|---------|------------------|
| `src/app/dashboard/certificates/page.tsx` | `@/lib/firebase`, `firebase/firestore` |
| `src/app/dashboard/certificates/new/page.tsx` | `@/lib/firebase`, `firebase/firestore`, `firebase/storage` |
| `src/app/dashboard/certificates/[id]/edit/page.tsx` | `@/lib/firebase`, `firebase/firestore`, `firebase/storage` |
| `src/app/dashboard/certificates/[id]/preview/page.tsx` | `@/lib/firebase` (x2), `firebase/firestore`, `firebase/storage` |

### Encuestas

| Archivo | Imports Firebase |
|---------|------------------|
| `src/app/dashboard/surveys/page.tsx` | `@/lib/firebase`, `firebase/firestore` |
| `src/app/dashboard/surveys/new/page.tsx` | `@/lib/firebase`, `firebase/firestore` |
| `src/app/dashboard/surveys/[id]/edit/page.tsx` | `@/lib/firebase`, `firebase/firestore` |

### Recursos y Reportes

| Archivo | Imports Firebase |
|---------|------------------|
| `src/app/dashboard/resources/page.tsx` | `@/lib/firebase`, `firebase/firestore`, `firebase/storage` |
| `src/app/dashboard/reports/page.tsx` | `@/lib/firebase`, `firebase/firestore` |
| `src/app/profile/[id]/page.tsx` | `@/lib/firebase`, `firebase/firestore` |

### API Routes

| Archivo | Imports Firebase |
|---------|------------------|
| `src/app/api/lessons/[id]/start-live/route.ts` | `@/lib/firebase`, `firebase/firestore` |
| `src/app/api/lessons/[id]/end-live/route.ts` | `@/lib/firebase`, `firebase/firestore` |
| `src/app/api/scheduled-emails/route.ts` | `@/lib/firebase`, `firebase/firestore` |
| `src/app/api/send-reminder/route.ts` | `@/lib/firebase`, `firebase/firestore` |

### Componentes

| Archivo | Imports Firebase |
|---------|------------------|
| `src/components/ReminderModal.tsx` | `@/lib/firebase`, `firebase/firestore` |
| `src/components/resources/ResourceAssignModal.tsx` | `@/lib/firebase`, `firebase/firestore` |
| `src/components/resources/ResourceUploadModal.tsx` | `@/lib/firebase`, `firebase/storage` |
| `src/components/students/StudentAttendanceDetail.tsx` | `@/lib/firebase`, `firebase/firestore` |

### Hooks y Utilidades

| Archivo | Imports Firebase |
|---------|------------------|
| `src/hooks/useHomepageBanner.ts` | `@/lib/firebase`, `firebase/firestore` |
| `src/hooks/useFirestoreQuery.ts` | `firebase/firestore` |
| `src/utils/certificateEligibility.ts` | `@/lib/firebase`, `firebase/firestore` |
| `src/utils/getFileUrl.ts` | `@/lib/firebase`, `firebase/storage` |

### Scripts

| Archivo | Imports Firebase |
|---------|------------------|
| `src/scripts/seedData.ts` | `firebase/firestore`, `firebase/auth` |

---

## 🔧 Archivos de Compatibilidad (Puentes)

Estos archivos son **stubs temporales** que permiten compilar sin Firebase instalado:

| Archivo | Propósito |
|---------|-----------|
| `src/lib/firebase.ts` | Exporta stubs de `db`, `auth`, `storage` y funciones comunes |
| `src/lib/firestore-compat.ts` | Stubs de funciones de Firestore (`collection`, `doc`, `query`, etc.) |
| `src/lib/firebase-admin-compat.ts` | Stubs de Firebase Admin SDK |

### Configuración de Aliases (next.config.ts)

```typescript
turbopack: {
  resolveAlias: {
    'firebase/firestore': './src/lib/firestore-compat.ts',
    'firebase/auth': './src/lib/firebase.ts',
    'firebase/storage': './src/lib/firebase.ts',
    'firebase-admin': './src/lib/firebase-admin-compat.ts',
    'firebase-admin/auth': './src/lib/firebase-admin-compat.ts',
    'firebase-admin/firestore': './src/lib/firebase-admin-compat.ts',
  },
}
```

---

## 📖 Guía de Migración

### Paso 1: Identificar el archivo a migrar

Escoge un archivo de la lista ⚠️ (prioriza los marcados con 🔴).

### Paso 2: Reemplazar imports

**ANTES (Firebase):**
```typescript
import { collection, doc, getDoc, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/utils/constants";
```

**DESPUÉS (Supabase):**
```typescript
import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";
```

### Paso 3: Reemplazar queries

**ANTES (Firestore):**
```typescript
const q = query(
  collection(db, COLLECTIONS.COURSES),
  where("isActive", "==", true),
  orderBy("createdAt", "desc")
);
const snapshot = await getDocs(q);
const courses = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}));
```

**DESPUÉS (Supabase):**
```typescript
const { data: courses, error } = await supabaseClient
  .from(TABLES.COURSES)
  .select("*")
  .eq("is_active", true)
  .order("created_at", { ascending: false });

if (error) console.error(error);
```

### Paso 4: Mapear nombres de campos

| Firebase (camelCase) | Supabase (snake_case) |
|---------------------|----------------------|
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |
| `isActive` | `is_active` |
| `speakerIds` | `teacher_ids` |
| `coverImageUrl` | `cover_image_url` |

### Paso 5: Usar repositorios existentes (recomendado)

En lugar de queries directas, usa los repositorios ya migrados:

```typescript
import { courseRepository } from "@/lib/repositories/courseRepository";

// En lugar de query manual:
const courses = await courseRepository.findPublished();
```

### Paso 6: Storage (subida de archivos)

**ANTES (Firebase Storage):**
```typescript
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

const storageRef = ref(storage, `images/${file.name}`);
await uploadBytes(storageRef, file);
const url = await getDownloadURL(storageRef);
```

**DESPUÉS (Supabase Storage):**
```typescript
import { supabaseClient } from "@/lib/supabase";

const { data, error } = await supabaseClient.storage
  .from("images")
  .upload(file.name, file);

const { data: { publicUrl } } = supabaseClient.storage
  .from("images")
  .getPublicUrl(data.path);
```

---

## 🎯 Orden de Migración Recomendado

1. **Fase 1 - Core Dashboard** (crítico para uso básico)
   - [ ] `src/app/page.tsx`
   - [ ] `src/app/dashboard/courses/page.tsx`
   - [ ] `src/app/dashboard/courses/[id]/page.tsx`
   - [ ] `src/app/dashboard/students/page.tsx`
   - [ ] `src/app/dashboard/speakers/page.tsx`

2. **Fase 2 - CRUD de Cursos**
   - [ ] `src/app/dashboard/courses/new/page.tsx`
   - [ ] `src/app/dashboard/courses/[id]/edit/page.tsx`
   - [ ] `src/app/dashboard/courses/[id]/manage/page.tsx`
   - [ ] `src/app/dashboard/courses/[id]/lessons/new/page.tsx`

3. **Fase 3 - Vista Estudiante**
   - [ ] `src/app/dashboard/enrolled-courses/page.tsx`
   - [ ] `src/app/dashboard/available-courses/page.tsx`
   - [ ] `src/app/dashboard/student/courses/[id]/page.tsx`

4. **Fase 4 - Certificados y Encuestas**
   - [ ] Todos los archivos de `/certificates/`
   - [ ] Todos los archivos de `/surveys/`

5. **Fase 5 - APIs y Componentes secundarios**
   - [ ] API routes
   - [ ] Componentes modales
   - [ ] Hooks y utilidades

---

## ✅ Checklist de Verificación Post-Migración

Para cada archivo migrado, verificar:

- [ ] No hay imports de `firebase/*` o `@/lib/firebase`
- [ ] Usa `@/lib/supabase` o repositorios de `@/lib/repositories/*`
- [ ] Los nombres de campos usan `snake_case` (Supabase) no `camelCase`
- [ ] Maneja errores de Supabase (`if (error) ...`)
- [ ] Las tablas referenciadas existen en `schema.sql`
- [ ] Probado manualmente en navegador

---

## 📝 Notas Adicionales

### Tablas disponibles en Supabase (schema.sql)

```
users, students, teachers, courses, lessons, student_enrollments,
lesson_attendance, live_streams, live_chats, live_chat_messages,
certificates, certificate_templates, surveys, survey_questions,
survey_responses, teacher_resources, file_attachments, site_config
```

### Variables de entorno requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=https://lhuqciwwklwbpkvxuvxs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

*Este documento fue generado automáticamente. Actualizar conforme se migren archivos.*
