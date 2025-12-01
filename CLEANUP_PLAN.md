# 🧹 Plan de Limpieza y Sanitización - MicroCert

> **Generado:** 1 de Diciembre, 2025  
> **Estado:** ✅ COMPLETADO  
> **Ejecutado:** 1 de Diciembre, 2025

---

## 📊 Resumen Ejecutivo

| Categoría | Archivos Detectados | Acción |
|-----------|---------------------|--------|
| Documentación obsoleta | 16 archivos | 🗑️ Eliminar |
| Código con branding legacy | 5 archivos | ✏️ Actualizar |
| Assets sin uso | 3 archivos | 🗑️ Eliminar |
| Datos geográficos | 33 archivos | ⚠️ Revisar utilidad |
| Estructura | - | 📁 Sugerencias |

---

## 🗑️ 1. Documentación Obsoleta

### 1.1 Firebase Hosting / Deploy (ELIMINAR)

| Archivo | Razón | Líneas |
|---------|-------|--------|
| `DEPLOYMENT.md` | 100% instrucciones de Firebase Hosting | 269 |
| `DEPLOYMENT_CHECKLIST.md` | Checklist de Firebase | 231 |
| `README_DEPLOYMENT.md` | Deploy a Firebase Hosting | 222 |
| `GITHUB_SETUP.md` | CI/CD de Firebase (ya eliminamos el workflow) | 284 |

### 1.2 Migraciones Completadas (ELIMINAR - histórico)

| Archivo | Razón | Líneas |
|---------|-------|--------|
| `MIGRATION_COMPLETE.md` | Mux→Agora completada, obsoleto | 303 |
| `MIGRATION_MUX_TO_AGORA.md` | Proceso ya terminado | 316 |
| `MIGRATION_SUMMARY.md` | Resumen redundante con MIGRATION_STATUS | 304 |

### 1.3 Guías de Firebase/Firestore (ELIMINAR)

| Archivo | Razón | Líneas |
|---------|-------|--------|
| `GETTING_STARTED.md` | Instrucciones de Firebase | 252 |
| `SETUP.md` | Firebase + Mux (tecnologías antiguas) | 223 |
| `QUICK_START.md` | Menciona Firebase | 165 |
| `SIGN_UP_CHANGES.md` | Describe flujo con Firestore | 167 |
| `MODELS.md` | Modelos de Firestore (ahora usamos PostgreSQL) | 383 |
| `MODELS_SUMMARY.md` | Resumen de modelos Firestore | 405 |

### 1.4 Historial del Proyecto Político (ELIMINAR)

| Archivo | Razón | Líneas |
|---------|-------|--------|
| `CHANGELOG.md` | Historial de "epolítica" con branding político (rojo #EF233C) | 133 |
| `TROUBLESHOOTING.md` | Título "epolítica" | 248 |

### 1.5 Guías de Email Legacy (ACTUALIZAR o ELIMINAR)

| Archivo | Razón | Acción |
|---------|-------|--------|
| `MAILGUN_SETUP.md` | Referencias a epolitica.com.mx y "Instituto Reyes Heroles" | ⚠️ Actualizar dominio |

---

## ✅ 2. Documentación a CONSERVAR

| Archivo | Razón |
|---------|-------|
| `README.md` | ✅ Ya actualizado para MicroCert |
| `MIGRATION_STATUS.md` | ✅ Documento activo de migración Supabase |
| `ARCHITECTURE.md` | ✅ Arquitectura general (agnóstico a backend) |
| `FEATURES.md` | ✅ Lista de features (lenguaje neutro) |
| `LIVE_STREAMING_GUIDE.md` | ✅ Guía de Agora (tecnología actual) |
| `AGORA_SETUP.md` | ✅ Configuración de Agora |
| `AGORA_EXAMPLES.md` | ✅ Ejemplos de código Agora |
| `docs/` | ✅ Documentación de MicroCert v5 |

---

## 🧟 3. Código con Branding Legacy ("epolítica")

### 3.1 Templates de Email (ACTUALIZAR)

| Archivo | Problema | Cambios Necesarios |
|---------|----------|-------------------|
| `public/mails/welcome.html` | Color #FD002A (rojo político), logos legacy | Cambiar a #192170 (azul UNACH) |
| `public/mails/reminder.html` | Mismo branding político | Actualizar colores y logos |

### 3.2 API de Emails (ACTUALIZAR)

| Archivo | Problema | Cambios Necesarios |
|---------|----------|-------------------|
| `src/app/api/send-email/route.ts` | Dominio `epolitica.com.mx`, remitente "Instituto Reyes Heroles" | Cambiar a dominio MicroCert |
| `src/app/api/send-reminder/route.ts` | Mismo problema | Actualizar |
| `src/app/api/preview-reminder/route.ts` | Mismo problema | Actualizar |
| `src/app/api/test-email/route.ts` | Mismo problema | Actualizar |
| `src/lib/email/templates.ts` | Subject con "Instituto Reyes Heroles" | Cambiar a "MicroCert" |
| `src/components/ReminderModal.tsx` | Referencias a epolítica | Actualizar textos |

---

## 🖼️ 4. Assets sin Uso

### 4.1 Archivos de Backup (.bk)

| Archivo | Tamaño | Acción |
|---------|--------|--------|
| `reference-images/student-dashboard.bk` | 2.5 MB | 🗑️ Eliminar |
| `reference-images/public-course-teachers.bk` | 2.9 MB | 🗑️ Eliminar |
| `reference-images/course-creation.bk` | 3.4 MB | 🗑️ Eliminar |

**Total recuperable:** ~8.8 MB

### 4.2 Carpeta Vacía

| Ruta | Acción |
|------|--------|
| `public/images/logos/` | Carpeta vacía - Eliminar o agregar logos de MicroCert |

---

## ⚠️ 5. Datos Geográficos (Revisión Manual)

### Carpeta: `src/data/municipalities/`

**Contiene:** 33 archivos JSON con municipios de México (por estado).

| Archivos | Uso Detectado | Decisión |
|----------|---------------|----------|
| AGSC.json, CDMX.json, ... | `MunicipalitySelector.tsx` en sign-up y settings | ⚠️ REVISAR |

**Pregunta para el propietario:**
- ¿Los usuarios de MicroCert necesitan seleccionar municipio al registrarse?
- Si NO → Eliminar carpeta completa y componente `MunicipalitySelector.tsx`
- Si SÍ → Conservar

---

## 📁 6. Sugerencias de Estructura

### 6.1 Consolidación de Carpetas

| Actual | Sugerencia |
|--------|------------|
| `src/lib/utils.ts` (1 archivo) | Mover contenido a `src/utils/` y eliminar |
| `src/lib/email/` (2 archivos) | ✅ Bien organizado |
| `src/lib/validators/` (3 archivos) | ✅ Bien organizado |

### 6.2 Renombrar para Claridad

| Archivo Actual | Sugerencia |
|----------------|------------|
| `src/hooks/useSupabaseQuery.ts` | ✅ Ya renombrado correctamente |
| `student-dashboard.json` (raíz) | Mover a `docs/design-system/` |

### 6.3 Archivos en Raíz (Limpiar)

| Archivo | Sugerencia |
|---------|------------|
| `POLITICAS_SUPABASE.sql` | Mover a `docs/` o `database/` |
| `schema.sql` | Mover a `database/schema.sql` |
| `student-dashboard.json` | Mover a `docs/design-system/` |

---

## 📋 7. Resumen de Acciones

### Fase 1: Eliminación de Documentación (16 archivos)
```bash
# Firebase/Deploy docs
rm DEPLOYMENT.md DEPLOYMENT_CHECKLIST.md README_DEPLOYMENT.md GITHUB_SETUP.md

# Migraciones completadas
rm MIGRATION_COMPLETE.md MIGRATION_MUX_TO_AGORA.md MIGRATION_SUMMARY.md

# Firebase/Firestore guides
rm GETTING_STARTED.md SETUP.md QUICK_START.md SIGN_UP_CHANGES.md MODELS.md MODELS_SUMMARY.md

# Historial político
rm CHANGELOG.md TROUBLESHOOTING.md
```

### Fase 2: Eliminación de Assets (3 archivos)
```bash
rm reference-images/*.bk
```

### Fase 3: Actualización de Branding (6 archivos)
- Cambiar dominio de email `epolitica.com.mx` → `[nuevo dominio]`
- Cambiar remitente "Instituto Reyes Heroles" → "MicroCert"
- Actualizar colores en templates HTML: #FD002A → #192170

### Fase 4: Reorganización (Opcional)
- Mover archivos SQL a carpeta `database/`
- Mover JSON sueltos a `docs/design-system/`

---

## ✅ Acciones Completadas (1 de Diciembre, 2025)

### Fase 1: Documentación Eliminada (16 archivos)
- [x] DEPLOYMENT.md, DEPLOYMENT_CHECKLIST.md, README_DEPLOYMENT.md, GITHUB_SETUP.md
- [x] MIGRATION_COMPLETE.md, MIGRATION_MUX_TO_AGORA.md, MIGRATION_SUMMARY.md
- [x] GETTING_STARTED.md, SETUP.md, QUICK_START.md, SIGN_UP_CHANGES.md
- [x] MODELS.md, MODELS_SUMMARY.md, CHANGELOG.md, TROUBLESHOOTING.md, MAILGUN_SETUP.md

### Fase 2: Assets Eliminados
- [x] reference-images/*.bk (3 archivos, ~8.8 MB liberados)
- [x] POLITICAS_SUPABASE.sql

### Fase 3: Reorganización de Estructura
- [x] schema.sql → database/schema.sql
- [x] student-dashboard.json → docs/design-system/student-dashboard.json

### Fase 4: Branding Actualizado (epolítica → MicroCert)
- [x] src/app/api/send-email/route.ts
- [x] src/app/api/send-reminder/route.ts
- [x] src/app/api/test-email/route.ts
- [x] src/app/api/preview-reminder/route.ts
- [x] src/lib/email/templates.ts
- [x] src/components/ReminderModal.tsx
- [x] public/mails/welcome.html (nuevo template con colores #192170)
- [x] public/mails/reminder.html (nuevo template con colores #192170)

### Decisiones Tomadas
- [x] Datos de municipios: **CONSERVADOS** (necesarios para registro)

---

> **Build Status:** ✅ Compilación exitosa
