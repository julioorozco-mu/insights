# 🔧 Solución de Problemas - epolítica

## 🚨 Error: 404 en /dashboard

### Causa
El caché de Next.js puede estar corrupto o hay errores de compilación.

### Solución

```bash
# 1. Detener el servidor
# Presiona Ctrl+C en la terminal donde corre npm run dev

# 2. Limpiar caché
rm -rf .next
rm -rf node_modules/.cache

# 3. Reiniciar el servidor
npm run dev
```

---

## 🚨 Error: routes-manifest.json no encontrado

### Causa
Caché corrupto de Next.js

### Solución
```bash
rm -rf .next
npm run dev
```

---

## 🚨 Error: Cannot find module '@/types/catalog'

### Causa
El archivo `src/types/catalog.ts` no existe o no se compiló correctamente

### Solución
El archivo ya fue creado. Si persiste el error:

```bash
# Limpiar y reconstruir
rm -rf .next
npm run dev
```

---

## 🚨 Login funciona pero redirige a 404

### Verificación

1. **Verifica que el usuario se creó en Firebase:**
   - Ve a Firebase Console → Authentication → Users
   - Debe aparecer el usuario con el que intentas hacer login

2. **Verifica que el documento del usuario existe en Firestore:**
   - Ve a Firebase Console → Firestore Database
   - Busca la colección `users`
   - Debe existir un documento con el UID del usuario

3. **Verifica la estructura de carpetas:**
   ```
   src/app/
   ├── (dashboard)/
   │   ├── layout.tsx    ← Debe existir
   │   └── page.tsx      ← Debe existir
   ```

### Solución

Si el usuario existe pero no tiene documento en Firestore:

```bash
# Ejecuta el seed nuevamente
npm run seed
```

---

## 🚨 Error de Compilación: Property 'X' does not exist on type 'Course'

### Causa
Los modelos fueron actualizados pero algunos archivos usan propiedades antiguas

### Propiedades Actualizadas

| Antiguo | Nuevo |
|---------|-------|
| `instructorId` | `speakerIds` (array) |
| `thumbnailUrl` | `coverImageUrl` |
| `isPublished` | `isActive` |
| `modules` | `lessonIds` (array de strings) |
| `price` | (eliminado) |

### Solución
Los archivos ya fueron actualizados. Si ves este error:

```bash
rm -rf .next
npm run dev
```

---

## 🚨 Firebase: auth/configuration-not-found

### Causa
Firebase Authentication no está habilitado

### Solución
Ver **FIREBASE_SETUP.md** - Paso 2

---

## 🚨 Firebase: permission-denied

### Causa
Las reglas de Firestore no permiten lectura/escritura

### Solución

1. Ve a Firebase Console → Firestore Database → Rules
2. Usa estas reglas temporales para desarrollo:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Haz clic en **Publish**

---

## 🔄 Proceso Completo de Reinicio

Si nada funciona, ejecuta estos pasos en orden:

```bash
# 1. Detener todos los procesos de Node
pkill -f "node"

# 2. Limpiar completamente
rm -rf .next
rm -rf node_modules/.cache

# 3. Reinstalar dependencias (opcional, solo si es necesario)
# rm -rf node_modules package-lock.json
# npm install

# 4. Verificar Firebase
# - Ve a Firebase Console
# - Verifica que Authentication esté habilitado
# - Verifica que Firestore Database exista
# - Verifica que las reglas permitan lectura/escritura

# 5. Ejecutar seed (si no lo has hecho)
npm run seed

# 6. Iniciar servidor
npm run dev
```

---

## ✅ Verificación de que Todo Funciona

### 1. Servidor Iniciado Correctamente
Deberías ver:
```
✓ Ready in XXXXms
- Local: http://localhost:3000
```

### 2. Página de Inicio Carga
- Ve a http://localhost:3000
- Debes ver el carrusel de cursos
- Debes ver el formulario de login

### 3. Login Funciona
- Usa: `admin@test.com` / `admin123`
- Debes ser redirigido a `/dashboard`
- **NO** debes ver 404

### 4. Dashboard Se Muestra
Debes ver:
- **Sidebar izquierdo** con logo y menú
- **Topbar superior** con búsqueda y usuario
- **Contenido central** con:
  - Bienvenida
  - 3 tarjetas de estadísticas
  - Accesos rápidos
  - Actividad reciente

---

## 📞 Si Sigue sin Funcionar

### Verifica los Logs

```bash
# En la terminal donde corre npm run dev, busca:
# - Errores de compilación (líneas con ⨯)
# - Warnings importantes
# - Errores de Firebase
```

### Verifica la Consola del Navegador

1. Abre DevTools (F12)
2. Ve a la pestaña Console
3. Busca errores en rojo
4. Copia el error completo

### Información Útil para Debug

- **URL actual**: ¿Qué URL muestra el navegador?
- **Mensaje de error**: ¿Qué dice exactamente?
- **Logs del servidor**: ¿Qué muestra la terminal?
- **Firebase Console**: ¿El usuario existe en Authentication?

---

## 🎯 Checklist Final

Antes de reportar un problema, verifica:

- [ ] Firebase Authentication está habilitado
- [ ] Email/Password está activado en Sign-in methods
- [ ] Firestore Database existe
- [ ] Las reglas de Firestore permiten lectura/escritura
- [ ] El archivo `.env` existe y tiene las credenciales correctas
- [ ] Ejecutaste `npm run seed` exitosamente
- [ ] Limpiaste el caché con `rm -rf .next`
- [ ] El servidor está corriendo sin errores de compilación
- [ ] El usuario existe en Firebase Authentication
- [ ] El documento del usuario existe en Firestore → users
