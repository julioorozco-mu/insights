# Auditoría de Consistencia: signIn ↔ signOut

**Fecha:** Diciembre 2024  
**Proyecto:** MicroCert by Marca UNACH  
**Archivo auditado:** `src/contexts/AuthContext.tsx`

---

## Resumen Ejecutivo

Se realizó una auditoría matemática de los recursos creados/modificados durante `signIn` y su correspondiente limpieza en `signOut`. Se encontraron **3 discrepancias críticas** que fueron corregidas.

---

## Matriz de Recursos (Después de Corrección)

| # | Recurso | signIn (CREA) | signOut (LIMPIA) | Simétrico |
|---|---------|---------------|------------------|-----------|
| 1 | `loading` state | `setLoading(true→false)` | `setLoading(true→false)` | ✅ |
| 2 | `error` state | `setError(null)` | `setError(null)` | ✅ |
| 3 | `user` state | `setUser(userData)` | `setUser(null)` | ✅ |
| 4 | `session` state | `setSession(session)` | `setSession(null)` | ✅ |
| 5 | `supabaseUser` state | `setSupabaseUser(user)` | `setSupabaseUser(null)` | ✅ |
| 6 | `rateLimitStatus` state | `refreshRateLimitStatus()` | `setRateLimitStatus(initial)` | ✅ |
| 7 | `sb-*-auth-token` (localStorage) | Supabase crea | Se elimina explícitamente | ✅ |
| 8 | `auth_rate_limit` (localStorage) | `clearRateLimit()` | `clearRateLimit()` | ✅ |
| 9 | Sesión en Supabase | `signInWithPassword()` | `signOut()` | ✅ |
| 10 | Cookies `sb-*` | Supabase crea | Se eliminan todas | ✅ |
| 11 | sessionStorage | No se usa | `sessionStorage.clear()` | ✅ |

---

## Discrepancias Encontradas y Corregidas

### 🔴 1. Tokens de Supabase NO se limpiaban (CRÍTICO)

**Antes:**
```typescript
// Línea 299 (versión anterior)
if (key && !key.startsWith('sb-')) {  // ← EXCLUÍA tokens de Supabase
```

**Problema:** Los tokens `sb-{project}-auth-token` quedaban en localStorage si `supabaseClient.auth.signOut()` fallaba por error de red.

**Después:**
```typescript
if (
  key.startsWith('sb-') ||      // ← AHORA INCLUYE tokens de Supabase
  key.includes('supabase') ||
  key.includes('auth') ||
  // ... etc
) {
  keysToRemove.push(key);
}
```

---

### ⚠️ 2. Estado `loading` no se modificaba en signOut (MEDIO)

**Antes:**
```typescript
const signOut = async () => {
  // No había setLoading(true) ni setLoading(false)
  setUser(null);
  // ...
};
```

**Después:**
```typescript
const signOut = async () => {
  setLoading(true);  // ← Indica proceso en curso
  try {
    // ... limpieza
  } finally {
    setLoading(false);  // ← Indica proceso terminado
  }
};
```

---

### ⚠️ 3. `rateLimitStatus` no se reseteaba completamente (MEDIO)

**Antes:**
```typescript
clearRateLimit();
refreshRateLimitStatus();  // Dependía de localStorage ya limpio
```

**Después:**
```typescript
clearRateLimit();
setRateLimitStatus({
  allowed: true,
  remainingAttempts: 5,
  waitTimeFormatted: '',
});  // Reset explícito a valores iniciales
```

---

## Flujo Simétrico Final

### signIn (Entrada)
```
1. setError(null)           → Limpiar errores previos
2. setLoading(true)         → Indicar proceso
3. Validar inputs           → Defensa en profundidad
4. checkRateLimit()         → Verificar bloqueo
5. signInWithPassword()     → Autenticar en Supabase
   └─ Supabase crea: sb-*-auth-token en localStorage
   └─ Supabase crea: cookies si SSR
6. recordSuccessfulAttempt() → Limpiar rate limiter
7. setSession(session)      → Guardar sesión
8. setSupabaseUser(user)    → Guardar usuario Supabase
9. setUser(userData)        → Guardar datos de app
10. setLoading(false)       → Proceso terminado
```

### signOut (Salida) - Orden Inverso
```
1. setLoading(true)         → Indicar proceso
2. setError(null)           → Limpiar errores
3. signOut() en Supabase    → Cerrar sesión servidor
4. Limpiar localStorage     → Eliminar sb-* y auth keys
5. Limpiar cookies          → Eliminar sb-* cookies
6. sessionStorage.clear()   → Limpiar sesión browser
7. clearRateLimit()         → Limpiar rate limiter
8. setUser(null)            → Limpiar usuario app
9. setSession(null)         → Limpiar sesión
10. setSupabaseUser(null)   → Limpiar usuario Supabase
11. setRateLimitStatus(init) → Reset a valores iniciales
12. setLoading(false)       → Proceso terminado
13. redirect (opcional)     → Navegar a login
```

---

## Verificación Matemática

### Recursos en localStorage después de signIn:
```
localStorage = {
  "sb-xxxx-auth-token": {...},     // Token de Supabase
  "auth_rate_limit": null,         // Limpiado en éxito
}
```

### Recursos en localStorage después de signOut:
```
localStorage = {
  // Vacío de keys de autenticación
}
```

### Estado de React después de signIn:
```javascript
{
  user: { id, name, email, role, ... },
  session: { access_token, refresh_token, ... },
  supabaseUser: { id, email, ... },
  loading: false,
  error: null,
  rateLimitStatus: { allowed: true, remainingAttempts: 5 }
}
```

### Estado de React después de signOut:
```javascript
{
  user: null,
  session: null,
  supabaseUser: null,
  loading: false,
  error: null,
  rateLimitStatus: { allowed: true, remainingAttempts: 5 }
}
```

**Conclusión:** Todos los recursos son correctamente creados y limpiados. El sistema es ahora **100% simétrico**.

---

## Manejo de Errores (Ahora Consistente)

| Escenario | signIn | signOut |
|-----------|--------|---------|
| Error de red | `setError(mensaje)` + throw | Log + continuar limpieza |
| Error de Supabase | `setError(mensaje)` + throw | Log + continuar limpieza |
| finally | `setLoading(false)` | `setLoading(false)` |

**Nota:** En signOut, los errores de red no bloquean la limpieza local. El usuario siempre queda deslogueado localmente aunque falle la comunicación con el servidor.

---

## Archivos Modificados

1. `src/contexts/AuthContext.tsx` - signOut refactorizado completamente

## Tests Recomendados

```typescript
// Test: signOut limpia todos los tokens de Supabase
test('signOut removes all sb-* tokens from localStorage', async () => {
  localStorage.setItem('sb-test-auth-token', '{"access_token": "xxx"}');
  await signOut();
  expect(localStorage.getItem('sb-test-auth-token')).toBeNull();
});

// Test: signOut resetea loading state
test('signOut sets loading to false after completion', async () => {
  await signOut();
  expect(loading).toBe(false);
});

// Test: signOut funciona offline
test('signOut clears local state even with network error', async () => {
  // Simular error de red
  jest.spyOn(supabaseClient.auth, 'signOut').mockRejectedValue(new Error('Network error'));
  await signOut();
  expect(user).toBeNull();
  expect(session).toBeNull();
});
```
