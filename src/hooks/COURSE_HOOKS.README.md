# Course Hooks - Guía de Uso

Este documento describe los **Custom Hooks** disponibles para obtener información de cursos en cualquier componente de la aplicación.

## ¿Qué son los Custom Hooks?

Los **Custom Hooks** son funciones de React que encapsulan lógica reutilizable (estado, efectos, llamadas a API). Permiten que cualquier programador obtenga datos sin tener que escribir la lógica de fetch manualmente.

> **Nota:** Este patrón también se conoce como **Data Fetching Hooks** o **State Management Hooks**.

---

## Hooks Disponibles

| Hook | Descripción | Uso |
|------|-------------|-----|
| `useCourseProgress` | Progreso del estudiante en un curso | Individual por estudiante |
| `useStudentCourseRating` | Calificación que dio el estudiante | Individual por estudiante |
| `useCourseRatingStats` | Promedio de calificaciones del curso | Global (todos los estudiantes) |

---

## 1. `useCourseProgress`

Obtiene el **progreso de un estudiante** en un curso específico.

### Importación

```tsx
import { useCourseProgress } from "@/hooks/useCourseProgress";
// O desde el índice:
import { useCourseProgress } from "@/hooks/course";
```

### Uso

```tsx
function MiComponente({ courseId }: { courseId: string }) {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useCourseProgress(courseId, user?.id);

  if (loading) return <Spinner />;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h3>Progreso del curso</h3>
      <p>Completado: {data?.progress}%</p>
      <p>Lecciones completadas: {data?.completedLessons.length} de {data?.totalLessons}</p>
    </div>
  );
}
```

### Datos Retornados

```ts
interface CourseProgressData {
  progress: number;              // Porcentaje 0-100
  completedLessons: string[];    // IDs de lecciones completadas
  subsectionProgress: Record<string, number>; // Progreso por subsección
  lastAccessedLessonId: string | null;
  totalLessons: number;
}
```

---

## 2. `useStudentCourseRating`

Obtiene la **calificación individual** que un estudiante dio a un curso.

### Importación

```tsx
import { useStudentCourseRating } from "@/hooks/useStudentCourseRating";
// O desde el índice:
import { useStudentCourseRating } from "@/hooks/course";
```

### Uso

```tsx
function MiComponente({ courseId }: { courseId: string }) {
  const { user } = useAuth();
  const { hasRated, rating, data, loading } = useStudentCourseRating(courseId, user?.id);

  if (loading) return <Spinner />;

  return (
    <div>
      {hasRated ? (
        <div>
          <span>Tu calificación: {rating} ⭐</span>
          {data?.comment && <p>"{data.comment}"</p>}
        </div>
      ) : (
        <button>Calificar este curso</button>
      )}
    </div>
  );
}
```

### Datos Retornados

```ts
interface UseStudentCourseRatingResult {
  data: StudentCourseRatingData | null;  // Datos completos de la reseña
  hasRated: boolean;                      // ¿Ya calificó?
  rating: number;                         // Calificación (1-5) o 0
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface StudentCourseRatingData {
  id: string;
  courseId: string;
  studentId: string;
  rating: number;        // 1-5 estrellas
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

## 3. `useCourseRatingStats`

Obtiene el **promedio de calificaciones** de un curso (de todos los estudiantes).

### Importación

```tsx
import { useCourseRatingStats } from "@/hooks/useCourseRatingStats";
// O desde el índice:
import { useCourseRatingStats } from "@/hooks/course";
```

### Uso

```tsx
function MiComponente({ courseId }: { courseId: string }) {
  const { averageRating, reviewsCount, hasRatings, loading } = useCourseRatingStats(courseId);

  if (loading) return <Spinner />;

  return (
    <div>
      {hasRatings ? (
        <div>
          <span>⭐ {averageRating.toFixed(1)}</span>
          <span>({reviewsCount} reseñas)</span>
        </div>
      ) : (
        <span>Sin calificaciones aún</span>
      )}
    </div>
  );
}
```

### Datos Retornados

```ts
interface UseCourseRatingStatsResult {
  data: CourseRatingStatsData;
  averageRating: number;   // Promedio (1.00 - 5.00)
  reviewsCount: number;    // Total de reseñas
  hasRatings: boolean;     // ¿Tiene calificaciones?
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
```

---

## Ejemplo Completo: Tarjeta de Curso

```tsx
import { useCourseProgress } from "@/hooks/useCourseProgress";
import { useStudentCourseRating } from "@/hooks/useStudentCourseRating";
import { useCourseRatingStats } from "@/hooks/useCourseRatingStats";
import { useAuth } from "@/hooks/useAuth";

function CourseCard({ courseId, title }: { courseId: string; title: string }) {
  const { user } = useAuth();
  
  // Progreso del estudiante
  const { data: progress } = useCourseProgress(courseId, user?.id);
  
  // Calificación del estudiante
  const { hasRated, rating: myRating } = useStudentCourseRating(courseId, user?.id);
  
  // Promedio global
  const { averageRating, reviewsCount } = useCourseRatingStats(courseId);

  return (
    <div className="card">
      <h3>{title}</h3>
      
      {/* Progreso */}
      <div className="progress-bar">
        <div style={{ width: `${progress?.progress ?? 0}%` }} />
      </div>
      <span>{progress?.progress ?? 0}% completado</span>
      
      {/* Rating global */}
      <div>
        ⭐ {averageRating.toFixed(1)} ({reviewsCount} reseñas)
      </div>
      
      {/* Mi calificación */}
      {hasRated && (
        <div>Tu calificación: {myRating} ⭐</div>
      )}
    </div>
  );
}
```

---

## Resumen de Nombres

| Para obtener... | Usa el hook... |
|-----------------|----------------|
| Progreso del estudiante (%) | `useCourseProgress(courseId, userId)` |
| Calificación del estudiante (1-5) | `useStudentCourseRating(courseId, userId)` |
| Promedio global del curso | `useCourseRatingStats(courseId)` |

---

## Notas Técnicas

- Todos los hooks manejan estados de `loading` y `error`
- Incluyen función `refetch()` para recargar datos manualmente
- Son **reactivos**: se actualizan si cambian `courseId` o `userId`
- Usan las APIs existentes en `/api/student/`

