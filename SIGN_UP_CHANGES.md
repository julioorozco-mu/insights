# Cambios en el Flujo de Registro (Sign-Up)

## Resumen
Se ha implementado la creación automática de documentos en la colección `students` cuando un usuario se registra con el rol de estudiante.

## Archivos Modificados

### 1. Nuevo: `src/lib/repositories/studentRepository.ts`
- **Propósito**: Gestionar la colección `students` en Firestore
- **Funcionalidades**:
  - `create()`: Crea un documento de estudiante con `enrolledCourses` vacío
  - `enrollInCourse()`: Inscribe a un estudiante en un curso
  - `updateProgress()`: Actualiza el progreso de un estudiante en un curso
  - `addCompletedCourse()`: Marca un curso como completado
  - `addCertificate()`: Agrega un certificado al estudiante

### 2. Modificado: `src/lib/repositories/userRepository.ts`
- **Cambios**:
  - Importa `studentRepository`
  - En el método `create()`, después de crear el documento en `users`, verifica si el rol es "student"
  - Si es estudiante, crea automáticamente el documento en la colección `students`
  - Manejo de errores mejorado con try-catch

### 3. Modificado: `src/hooks/useAuth.ts`
- **Cambios**:
  - Mejorado el manejo de errores en `signUp()`
  - Separación de errores de Firebase Auth vs errores de Firestore
  - Mensajes de error más específicos para debugging

### 4. Modificado: `src/types/user.ts`
- **Cambios**:
  - Actualizada la interfaz `Student` para incluir el array `enrolledCourses`
  - Estructura de `enrolledCourses`:
    ```typescript
    enrolledCourses: {
      courseId: string;
      enrolledAt: string;
      progress?: number;
      completedLessons?: string[];
    }[];
    ```

## Estructura de Datos

### Colección `users`
```typescript
{
  id: string;
  name: string;
  lastName?: string;
  email: string;
  role: "student" | "speaker" | "admin";
  phone?: string;
  username?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  state?: string;
  avatarUrl?: string;
  bio?: string;
  isVerified?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Colección `students` (nuevo documento creado automáticamente)
```typescript
{
  userId: string; // ID del documento (mismo que el user ID)
  name: string;
  lastName?: string;
  email: string;
  phone?: string;
  username?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  state?: string;
  enrolledCourses: []; // Array vacío inicialmente
  completedCourses?: string[];
  certificates?: string[];
  enrollmentDate: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Flujo de Registro

1. Usuario completa el formulario en `/auth/sign-up`
2. Se llama a `signUp(data)` del hook `useAuth`
3. Se crea el usuario en Firebase Authentication
4. Se llama a `userRepository.create()` que:
   - Crea el documento en la colección `users`
   - Si el rol es "student", crea el documento en la colección `students`
5. El listener `onAuthStateChanged` detecta el nuevo usuario
6. Se carga el documento del usuario desde Firestore
7. El usuario es redirigido a `/dashboard`

## Pruebas Necesarias

### 1. Registro Exitoso
- [ ] Ir a `/auth/sign-up`
- [ ] Completar todos los campos requeridos
- [ ] Hacer clic en "Crear Cuenta"
- [ ] Verificar que se redirige a `/dashboard`
- [ ] Verificar en Firebase Console:
  - Documento creado en `users` con role="student"
  - Documento creado en `students` con enrolledCourses=[]

### 2. Manejo de Errores
- [ ] Intentar registrarse con un email ya existente
- [ ] Verificar que muestra "Este correo ya está registrado"
- [ ] Intentar con contraseña débil
- [ ] Verificar que muestra "La contraseña es muy débil"

### 3. Consola del Navegador
- [ ] Abrir DevTools > Console
- [ ] Verificar que no hay errores de Firestore
- [ ] Si hay errores, revisar los logs para identificar el problema

## Posibles Problemas y Soluciones

### Error: "Error de autenticación"
**Causa**: Error genérico que puede tener múltiples orígenes
**Solución**:
1. Abrir la consola del navegador (F12)
2. Buscar mensajes de error más específicos
3. Verificar que las reglas de Firestore permiten escritura en `students`

### Error: "Error al crear el perfil de usuario"
**Causa**: Fallo al crear documentos en Firestore
**Solución**:
1. Verificar las reglas de seguridad de Firestore
2. Asegurarse de que el usuario autenticado puede escribir en `users` y `students`

### Reglas de Firestore Recomendadas
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuarios pueden leer/escribir su propio documento
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Estudiantes pueden leer/escribir su propio documento
    match /students/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Próximos Pasos

1. **Probar el flujo completo de registro**
2. **Verificar que los documentos se crean correctamente en Firestore**
3. **Implementar la funcionalidad de inscripción a cursos** usando `studentRepository.enrollInCourse()`
4. **Actualizar la UI del dashboard** para mostrar los cursos inscritos del estudiante

## Notas Adicionales

- El array `enrolledCourses` en la colección `students` es diferente de la colección `enrollments`
- La colección `enrollments` se usa para tracking detallado de inscripciones
- El array `enrolledCourses` en `students` es para acceso rápido a los cursos del estudiante
- Ambos deben mantenerse sincronizados cuando se implementen las inscripciones
