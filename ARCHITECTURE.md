# 🏗️ Arquitectura del Proyecto

## Visión General

Este proyecto sigue una arquitectura en capas con separación clara de responsabilidades, utilizando patrones de diseño modernos para garantizar escalabilidad y mantenibilidad.

## Estructura de Capas

```
┌─────────────────────────────────────┐
│     Presentation Layer (UI)         │
│  - Pages (Next.js App Router)       │
│  - Components (React)                │
│  - Hooks (Custom Hooks)              │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      Application Layer               │
│  - Services (Business Logic)         │
│  - Stores (State Management)         │
│  - Validators (Zod Schemas)          │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      Domain Layer                    │
│  - Repositories (Data Access)        │
│  - Types (TypeScript Interfaces)     │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   Infrastructure Layer               │
│  - Firebase (Auth, Firestore, etc)   │
│  - Mux (Video Streaming)             │
│  - External APIs                     │
└─────────────────────────────────────┘
```

## Patrones de Diseño

### 1. Repository Pattern

**Ubicación**: `src/lib/repositories/`

**Propósito**: Encapsular la lógica de acceso a datos y abstraer la fuente de datos.

**Ejemplo**:
```typescript
class UserRepository {
  async findById(id: string): Promise<User | null> {
    // Lógica de acceso a Firestore
  }
}
```

**Beneficios**:
- Facilita el testing (mock repositories)
- Permite cambiar la fuente de datos sin afectar el resto del código
- Centraliza las consultas a la base de datos

### 2. Service Layer Pattern

**Ubicación**: `src/lib/services/`

**Propósito**: Contener la lógica de negocio y orquestar operaciones complejas.

**Ejemplo**:
```typescript
class LiveService {
  async createLiveStream(data: CreateLiveStreamData): Promise<LiveStream> {
    // 1. Crear stream en Mux
    // 2. Guardar en Firestore
    // 3. Retornar resultado
  }
}
```

**Beneficios**:
- Separa la lógica de negocio de la UI
- Reutilizable en diferentes contextos
- Más fácil de testear

### 3. Custom Hooks Pattern

**Ubicación**: `src/hooks/`

**Propósito**: Encapsular lógica reactiva y comunicación con servicios.

**Ejemplo**:
```typescript
function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  // Lógica de autenticación
  return { user, signIn, signOut };
}
```

**Beneficios**:
- Reutilización de lógica entre componentes
- Separación de concerns
- Mejor organización del código

### 4. Presentational/Container Components

**Ubicación**: `src/components/`

**Propósito**: Separar componentes de presentación de componentes con lógica.

**Componentes Presentacionales**:
- Solo reciben props
- No tienen estado complejo
- Enfocados en la UI

**Componentes Contenedores**:
- Manejan estado
- Conectan con hooks/servicios
- Pasan datos a componentes presentacionales

### 5. Dependency Injection

**Implementación**: A través de imports y composición

**Ejemplo**:
```typescript
// Service usa Repository
class LiveService {
  constructor(private liveRepository: LiveRepository) {}
}
```

## Flujo de Datos

### Flujo de Lectura (Query)

```
User Action (UI)
    ↓
Custom Hook
    ↓
Service Layer
    ↓
Repository
    ↓
Firebase/Mux
    ↓
Repository (transform data)
    ↓
Service Layer (business logic)
    ↓
Custom Hook (state update)
    ↓
UI Update
```

### Flujo de Escritura (Command)

```
User Action (UI)
    ↓
Form Validation (Zod)
    ↓
Custom Hook
    ↓
Service Layer
    ↓
Repository
    ↓
Firebase/Mux
    ↓
Success/Error Response
    ↓
UI Update
```

## Gestión de Estado

### Estado Local
- **React useState**: Para estado de componente
- **React useReducer**: Para estado complejo de componente

### Estado Global
- **Zustand**: Para estado compartido entre componentes
  - `useUserStore`: Estado del usuario actual
  - `useCourseStore`: Estado de cursos

### Estado del Servidor
- **Custom Hooks**: Para datos de Firebase/Mux
  - `useAuth`: Autenticación
  - `useChat`: Mensajes en tiempo real
  - `useFirestoreQuery`: Consultas de Firestore

## Validación de Datos

### Zod Schemas

**Ubicación**: `src/lib/validators/`

**Flujo**:
1. Usuario ingresa datos en formulario
2. React Hook Form valida con Zod schema
3. Si es válido, se envía a Service Layer
4. Service Layer puede hacer validaciones adicionales
5. Repository guarda en base de datos

**Ejemplo**:
```typescript
const createCourseSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
});
```

## Manejo de Errores

### Estrategia en Capas

1. **Repository Layer**: Captura errores de Firebase/Mux
2. **Service Layer**: Transforma errores en AppError
3. **Hook Layer**: Maneja errores y actualiza estado
4. **UI Layer**: Muestra errores al usuario

**Ejemplo**:
```typescript
try {
  await service.createCourse(data);
} catch (error) {
  const appError = handleError(error);
  setError(appError.message);
}
```

## Seguridad

### Autenticación
- Firebase Authentication
- Tokens JWT automáticos
- Verificación en cada request

### Autorización
- Roles: admin, instructor, student
- Firestore Rules para control de acceso
- Validación en frontend y backend

### Validación
- Zod schemas en frontend
- Firestore Rules en backend
- Sanitización de inputs

## Escalabilidad

### Horizontal
- Serverless functions (Next.js API Routes)
- Firebase auto-scaling
- Mux CDN global

### Vertical
- Lazy loading de componentes
- Code splitting automático (Next.js)
- Optimización de imágenes

### Base de Datos
- Índices en Firestore para consultas frecuentes
- Paginación en listas grandes
- Cache en cliente cuando sea posible

## Testing Strategy

### Unit Tests
- Repositories
- Services
- Validators
- Utilities

### Integration Tests
- API Routes
- Hooks con servicios
- Flujos completos

### E2E Tests
- Flujos críticos de usuario
- Autenticación
- Creación de cursos
- Transmisión en vivo

## Performance

### Optimizaciones Implementadas

1. **Next.js**:
   - Server Components por defecto
   - Automatic code splitting
   - Image optimization

2. **React**:
   - Lazy loading de componentes
   - Memoization donde sea necesario
   - Suspense boundaries

3. **Firebase**:
   - Índices compuestos
   - Consultas optimizadas
   - Listeners solo cuando sea necesario

4. **Mux**:
   - Low-latency streaming
   - Adaptive bitrate
   - CDN global

## Monitoreo y Logs

### Logging
- Console.error para errores
- Structured logging en producción
- Error tracking (considerar Sentry)

### Analytics
- Firebase Analytics
- Mux Data (métricas de video)
- Custom events

## Deployment

### Vercel (Recomendado)
- Automatic deployments
- Preview deployments
- Edge functions
- Global CDN

### Variables de Entorno
- Diferentes por ambiente
- Nunca en código
- Validación al inicio

## Convenciones de Código

### Naming
- **Components**: PascalCase
- **Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Files**: kebab-case o PascalCase (components)

### Imports
- Absolute imports con `@/`
- Ordenados: externos → internos → relativos
- Agrupados por tipo

### TypeScript
- Strict mode habilitado
- Interfaces para objetos públicos
- Types para uniones/intersecciones
- No usar `any`

## Mejores Prácticas

1. **DRY** (Don't Repeat Yourself)
2. **SOLID** principles
3. **Separation of Concerns**
4. **Single Responsibility**
5. **Composition over Inheritance**
6. **Explicit over Implicit**
7. **Fail Fast**

## Recursos

- [Next.js Best Practices](https://nextjs.org/docs/app/building-your-application)
- [React Patterns](https://reactpatterns.com/)
- [Firebase Best Practices](https://firebase.google.com/docs/rules/best-practices)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
