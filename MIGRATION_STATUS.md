# 🔄 Estado de Migración: Firebase → Supabase

> **Última actualización:** 1 de Diciembre, 2025  
> **Proyecto:** MicroCert by Marca UNACH  
> **Versión:** 2.0.0

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
| **Archivos migrados a Supabase** | 46 |
| **Archivos legacy (Firebase)** | 0 |
| **Progreso estimado** | **100%** ✅ |

### 🎉 Estado: MIGRACIÓN COMPLETADA

La migración de Firebase a Supabase está **completada**. Todos los archivos legacy han sido eliminados.

### Leyenda de Estados

- ✅ **MIGRADO** - Usa Supabase real, datos persistentes
- ⚠️ **LEGACY** - Archivo de respaldo con código Firebase (puede eliminarse)
- 🔧 **COMPATIBILIDAD** - Archivo puente (ya no necesario, puede eliminarse)

---

## ✅ Archivos Migrados (Operacionales)

Todos estos archivos ya conectan a Supabase y funcionan correctamente:

### Repositorios (Data Access Layer) - 7 archivos
| Archivo | Descripción |
|---------|-------------|
| `src/lib/repositories/userRepository.ts` | CRUD de usuarios |
| `src/lib/repositories/studentRepository.ts` | CRUD de estudiantes + inscripciones |
| `src/lib/repositories/courseRepository.ts` | CRUD de cursos |
| `src/lib/repositories/lessonRepository.ts` | CRUD de lecciones ✨ NUEVO |
| `src/lib/repositories/teacherRepository.ts` | CRUD de maestros ✨ NUEVO |
| `src/lib/repositories/liveRepository.ts` | Gestión de livestreams |
| `src/lib/repositories/siteConfigRepository.ts` | Configuración del sitio |

### Servicios - 4 archivos
| Archivo | Descripción |
|---------|-------------|
| `src/lib/services/attendanceService.ts` | Registro de asistencia |
| `src/lib/services/chatService.ts` | Chat en vivo |
| `src/lib/services/fileService.ts` | Subida de archivos |
| `src/lib/services/resourceService.ts` | Recursos de maestros |

### Hooks - 2 archivos
| Archivo | Descripción |
|---------|-------------|
| `src/hooks/useAuth.ts` | Autenticación (login, registro, logout) |
| `src/hooks/useHomepageBanner.ts` | Banner de homepage |

### Páginas del Dashboard - 15+ archivos
| Archivo | Usa |
|---------|-----|
| `src/app/page.tsx` | teacherRepository, userRepository |
| `src/app/dashboard/courses/page.tsx` | courseRepository, lessonRepository, siteConfigRepository |
| `src/app/dashboard/courses/[id]/page.tsx` | supabaseClient |
| `src/app/dashboard/courses/[id]/edit/page.tsx` | supabaseClient |
| `src/app/dashboard/courses/[id]/manage/page.tsx` | supabaseClient |
| `src/app/dashboard/courses/[id]/lessons/new/page.tsx` | supabaseClient |
| `src/app/dashboard/courses/new/page.tsx` | supabaseClient |
| `src/app/dashboard/teachers/page.tsx` | supabaseClient, courseRepository ✨ RENOMBRADO |
| `src/app/dashboard/students/page.tsx` | userRepository, studentRepository |
| `src/app/dashboard/certificates/page.tsx` | supabaseClient |
| `src/app/dashboard/certificates/new/page.tsx` | supabaseClient |
| `src/app/dashboard/certificates/[id]/edit/page.tsx` | supabaseClient |
| `src/app/dashboard/certificates/[id]/preview/page.tsx` | supabaseClient |
| `src/app/dashboard/surveys/page.tsx` | supabaseClient |
| `src/app/dashboard/surveys/new/page.tsx` | supabaseClient |
| `src/app/dashboard/surveys/[id]/edit/page.tsx` | supabaseClient |
| `src/app/dashboard/resources/page.tsx` | supabaseClient |
| `src/app/dashboard/reports/page.tsx` | supabaseClient |
| `src/app/dashboard/settings/page.tsx` | supabaseClient |
| `src/app/dashboard/available-courses/page.tsx` | supabaseClient |
| `src/app/dashboard/enrolled-courses/page.tsx` | supabaseClient |
| `src/app/dashboard/lessons/[id]/page.tsx` | supabaseClient |
| `src/app/dashboard/lessons/[id]/edit/page.tsx` | supabaseClient |
| `src/app/dashboard/my-students/page.tsx` | supabaseClient |
| `src/app/dashboard/student/courses/[id]/page.tsx` | supabaseClient |
| `src/app/dashboard/student/courses/[id]/livestream/[lessonId]/page.tsx` | supabaseClient |
| `src/app/course/[id]/page.tsx` | supabaseClient |
| `src/app/profile/[id]/page.tsx` | supabaseClient |

### API Routes - 4 archivos
| Archivo | Usa |
|---------|-----|
| `src/app/api/lessons/[id]/start-live/route.ts` | supabaseClient |
| `src/app/api/lessons/[id]/end-live/route.ts` | supabaseClient |
| `src/app/api/scheduled-emails/route.ts` | supabaseClient |
| `src/app/api/send-reminder/route.ts` | supabaseClient |

### Componentes - 3 archivos
| Archivo | Usa |
|---------|-----|
| `src/components/ReminderModal.tsx` | supabaseClient |
| `src/components/resources/ResourceUploadModal.tsx` | supabaseClient |
| `src/components/students/StudentAttendanceDetail.tsx` | supabaseClient |

### Utilidades - 2 archivos
| Archivo | Usa |
|---------|-----|
| `src/utils/certificateEligibility.ts` | supabaseClient |
| `src/utils/getFileUrl.ts` | supabaseClient |

---

## 🗑️ Limpieza Forense Completada (1 de Diciembre, 2025)

### Archivos de Código Eliminados
| Archivo | Razón |
|---------|-------|
| ~~`src/lib/firebase.ts`~~ | Stub de compatibilidad |
| ~~`src/lib/firestore-compat.ts`~~ | Stub de compatibilidad |
| ~~`src/lib/firebase-admin-compat.ts`~~ | Stub de compatibilidad |
| ~~`src/app/dashboard/student/courses/[id]/page-old.tsx`~~ | Archivo de respaldo |

### Archivos de Configuración Eliminados
| Archivo | Razón |
|---------|-------|
| ~~`.firebaserc`~~ | Config de proyecto Firebase |
| ~~`firebase.json`~~ | Config de Firebase Hosting |
| ~~`firestore.rules`~~ | Reglas de Firestore |
| ~~`firestore.indexes.json`~~ | Índices de Firestore |
| ~~`storage.rules`~~ | Reglas de Firebase Storage |
| ~~`cors.json`~~ | CORS de Firebase Storage |
| ~~`deploy.sh`~~ | Script de deploy a Firebase |

### Documentación Legacy Eliminada
| Archivo | Razón |
|---------|-------|
| ~~`FIREBASE_COMMANDS.md`~~ | Comandos de Firebase CLI |
| ~~`FIREBASE_DEPLOY_FIX.md`~~ | Soluciones de deploy Firebase |
| ~~`FIREBASE_SETUP.md`~~ | Guía de configuración Firebase |
| ~~`.github/workflows/firebase-hosting-deploy.yml`~~ | GitHub Action de Firebase |

### Código Limpiado
| Archivo | Cambio |
|---------|--------|
| `next.config.ts` | Eliminados 7 aliases de Firebase, hostname de Firebase Storage |
| `src/hooks/useFirestoreQuery.ts` | Renombrado → `useSupabaseQuery.ts` |
| `src/utils/handleError.ts` | Eliminada función `getFirebaseAuthErrorMessage` |
| `src/app/dashboard/teachers/page.tsx` | Eliminados mensajes de error con Firebase |
| `src/app/dashboard/lessons/[id]/page.tsx` | Eliminado comentario legacy |
| `.gitignore` | Eliminada sección de Firebase (líneas 36-41) |
| `.env.production.example` | Reemplazadas variables Firebase por Supabase |

---

## 📖 Guía de Referencia

### Cómo hacer queries con Supabase

```typescript
import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";

// SELECT con filtros
const { data: courses, error } = await supabaseClient
  .from(TABLES.COURSES)
  .select("*")
  .eq("is_active", true)
  .order("created_at", { ascending: false });

// INSERT
const { data, error } = await supabaseClient
  .from(TABLES.COURSES)
  .insert({ title: "Nuevo curso", is_active: true })
  .select()
  .single();

// UPDATE
const { error } = await supabaseClient
  .from(TABLES.COURSES)
  .update({ title: "Título actualizado" })
  .eq("id", courseId);

// DELETE
const { error } = await supabaseClient
  .from(TABLES.COURSES)
  .delete()
  .eq("id", courseId);
```

### Usar repositorios (recomendado)

```typescript
import { courseRepository } from "@/lib/repositories/courseRepository";
import { userRepository } from "@/lib/repositories/userRepository";
import { studentRepository } from "@/lib/repositories/studentRepository";
import { teacherRepository } from "@/lib/repositories/teacherRepository";
import { lessonRepository } from "@/lib/repositories/lessonRepository";

const courses = await courseRepository.findAll();
const user = await userRepository.findById(id);
```

### Storage (subida de archivos)

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

## ✅ Progreso de Migración

### Fase 1 - Core Dashboard ✅ COMPLETADO
- [x] `src/app/page.tsx`
- [x] `src/app/dashboard/courses/page.tsx`
- [x] `src/app/dashboard/courses/[id]/page.tsx`
- [x] `src/app/dashboard/students/page.tsx`
- [x] `src/app/dashboard/teachers/page.tsx` *(renombrado de speakers)*

### Fase 2 - CRUD de Cursos ✅ COMPLETADO
- [x] `src/app/dashboard/courses/new/page.tsx`
- [x] `src/app/dashboard/courses/[id]/edit/page.tsx`
- [x] `src/app/dashboard/courses/[id]/manage/page.tsx`
- [x] `src/app/dashboard/courses/[id]/lessons/new/page.tsx`

### Fase 3 - Vista Estudiante ✅ COMPLETADO
- [x] `src/app/dashboard/enrolled-courses/page.tsx`
- [x] `src/app/dashboard/available-courses/page.tsx`
- [x] `src/app/dashboard/student/courses/[id]/page.tsx`

### Fase 4 - Certificados y Encuestas ✅ COMPLETADO
- [x] Todos los archivos de `/certificates/`
- [x] Todos los archivos de `/surveys/`

### Fase 5 - APIs y Componentes ✅ COMPLETADO
- [x] API routes
- [x] Componentes modales
- [x] Hooks y utilidades

---

## 📝 Notas Adicionales

### Tablas disponibles en Supabase (schema.sql)

```
users, students, teachers, courses, lessons, student_enrollments,
lesson_attendance, live_streams, live_chats, live_chat_messages,
certificates, certificate_templates, surveys, survey_questions,
survey_responses, teacher_resources, file_attachments, site_config,
scheduled_emails, certificate_downloads
```

### Variables de entorno requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=https://lhuqciwwklwbpkvxuvxs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

### Nuevos repositorios creados

| Repositorio | Descripción |
|-------------|-------------|
| `lessonRepository` | CRUD completo de lecciones |
| `teacherRepository` | CRUD de maestros (antes speakers) |

### Cambios de nomenclatura

| Antes | Ahora |
|-------|-------|
| `speakers` | `teachers` |
| `speakerIds` | `teacher_ids` |
| `/dashboard/speakers` | `/dashboard/teachers` |
| `COLLECTIONS` | `TABLES` |

---

*Última actualización: 1 de Diciembre, 2025*
*Estado: ✅ Migración completada al 98%*
