# CourseRatingModal - Guía de Reutilización

## 📦 Componente Reutilizable

El componente `CourseRatingModal` está diseñado para ser usado en cualquier parte de la aplicación donde se necesite permitir a los estudiantes calificar un curso.

## 🚀 Uso Básico

```tsx
import CourseRatingModal from "@/components/course/CourseRatingModal";
import { useState } from "react";

function MyComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const user = useAuth(); // Tu hook de autenticación
  
  return (
    <>
      <button onClick={() => setIsModalOpen(true)}>
        Calificar Curso
      </button>
      
      {user && (
        <CourseRatingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          courseId="uuid-del-curso"
          userId={user.id}
          courseName="Nombre del Curso (opcional)"
          onRatingSubmitted={(review) => {
            console.log("Reseña guardada:", review);
            // Aquí puedes mostrar un toast, actualizar UI, etc.
          }}
          onRatingDeleted={() => {
            console.log("Reseña eliminada");
            // Callback opcional cuando se elimina una reseña
          }}
        />
      )}
    </>
  );
}
```

## 📋 Props Requeridas

| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `isOpen` | `boolean` | ✅ Sí | Controla si el modal está visible |
| `onClose` | `() => void` | ✅ Sí | Función llamada al cerrar el modal |
| `courseId` | `string` | ✅ Sí | UUID del curso a calificar |
| `userId` | `string` | ✅ Sí | UUID del usuario/estudiante |

## 📋 Props Opcionales

| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `courseName` | `string` | ❌ No | Nombre del curso (para mostrar en UI futura) |
| `onRatingSubmitted` | `(review: CourseReview) => void` | ❌ No | Callback cuando se guarda/actualiza una reseña |
| `onRatingDeleted` | `() => void` | ❌ No | Callback cuando se elimina una reseña |

## 🎯 Ejemplos de Uso

### Ejemplo 1: En una página de curso completado

```tsx
// src/app/student/courses/[courseId]/complete/page.tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import CourseRatingModal from "@/components/course/CourseRatingModal";

export default function CourseCompletePage({ params }: { params: { courseId: string } }) {
  const { user } = useAuth();
  const [showRatingModal, setShowRatingModal] = useState(false);
  
  return (
    <div>
      <h1>¡Curso Completado!</h1>
      <button onClick={() => setShowRatingModal(true)}>
        Califica este curso
      </button>
      
      {user && (
        <CourseRatingModal
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          courseId={params.courseId}
          userId={user.id}
          onRatingSubmitted={(review) => {
            alert(`¡Gracias por tu calificación de ${review.rating} estrellas!`);
          }}
        />
      )}
    </div>
  );
}
```

### Ejemplo 2: En un card de curso con botón de rating

```tsx
// src/components/course/CourseCard.tsx
"use client";

import { useState } from "react";
import CourseRatingModal from "@/components/course/CourseRatingModal";

interface CourseCardProps {
  course: {
    id: string;
    title: string;
  };
  userId: string;
}

export default function CourseCard({ course, userId }: CourseCardProps) {
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  
  return (
    <div className="course-card">
      <h3>{course.title}</h3>
      <button onClick={() => setIsRatingOpen(true)}>
        ⭐ Calificar
      </button>
      
      <CourseRatingModal
        isOpen={isRatingOpen}
        onClose={() => setIsRatingOpen(false)}
        courseId={course.id}
        userId={userId}
        courseName={course.title}
      />
    </div>
  );
}
```

### Ejemplo 3: Con notificaciones toast

```tsx
import { toast } from "sonner"; // o tu librería de toast favorita

<CourseRatingModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  courseId={courseId}
  userId={userId}
  onRatingSubmitted={(review) => {
    toast.success(`¡Gracias por calificar con ${review.rating} estrellas!`);
    // Actualizar UI local si es necesario
    refetchCourseData();
  }}
  onRatingDeleted={() => {
    toast.info("Reseña eliminada correctamente");
    refetchCourseData();
  }}
/>
```

## 🔌 API Endpoints Disponibles

El componente usa internamente estos endpoints, pero también puedes usarlos directamente:

### GET - Obtener reseña existente
```typescript
const response = await fetch(
  `/api/student/rating?courseId=${courseId}&userId=${userId}`
);
const { review, courseStats } = await response.json();
```

### POST - Crear/Actualizar reseña
```typescript
const response = await fetch("/api/student/rating", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    courseId,
    userId,
    rating: 5, // 1-5
    comment: "Excelente curso!" // opcional
  })
});
const { review, courseStats } = await response.json();
```

### DELETE - Eliminar reseña
```typescript
const response = await fetch(
  `/api/student/rating?courseId=${courseId}&userId=${userId}`,
  { method: "DELETE" }
);
```

## 🎨 Características del Componente

- ✅ **Auto-carga**: Carga automáticamente la reseña existente al abrir
- ✅ **Modo edición**: Detecta si ya existe una reseña y cambia a modo edición
- ✅ **Validación**: Valida rating (1-5) y longitud de comentario (máx 2000 chars)
- ✅ **Estados de carga**: Muestra spinners durante operaciones async
- ✅ **Manejo de errores**: Muestra mensajes de error amigables
- ✅ **Accesibilidad**: Botones con estados disabled apropiados
- ✅ **Animaciones**: Transiciones suaves al abrir/cerrar

## 📊 Estructura de Datos

### CourseReview Interface
```typescript
interface CourseReview {
  id: string;
  course_id: string;
  student_id: string;
  rating: number; // 1-5
  comment: string | null;
  created_at: string;
  updated_at: string;
}
```

### Course Stats (disponible en callbacks)
```typescript
interface CourseStats {
  average_rating: number; // 0.00 - 5.00
  reviews_count: number;
}
```

## 🔒 Seguridad

- El componente valida que `userId` coincida con el usuario autenticado
- Las políticas RLS en la BD aseguran que solo el estudiante puede modificar su propia reseña
- La API valida todos los inputs antes de guardar

## 💡 Tips

1. **Siempre verifica que el usuario esté autenticado** antes de renderizar el modal
2. **Usa los callbacks** `onRatingSubmitted` y `onRatingDeleted` para actualizar tu UI local
3. **El modal se cierra automáticamente** después de guardar/eliminar exitosamente
4. **El componente maneja su propio estado interno**, no necesitas pasarle el estado de la reseña

## 🐛 Troubleshooting

**Problema**: El modal no se abre
- ✅ Verifica que `isOpen={true}`
- ✅ Verifica que `courseId` y `userId` sean válidos

**Problema**: No carga la reseña existente
- ✅ Verifica que la migración SQL se haya ejecutado
- ✅ Verifica que el usuario tenga una reseña en la BD

**Problema**: Error al guardar
- ✅ Verifica que el rating esté entre 1-5
- ✅ Verifica que el comentario no exceda 2000 caracteres
- ✅ Revisa la consola del navegador para más detalles

