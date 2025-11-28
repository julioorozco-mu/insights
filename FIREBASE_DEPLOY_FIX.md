# 🔧 Fix: Error de Despliegue en Firebase App Hosting

## ✅ Problema Resuelto DEFINITIVAMENTE

El error que experimentaste:
```
npm error Invalid: lock file's picomatch@2.3.1 does not satisfy picomatch@4.0.3
```

**Causa:** Conflicto de versiones de `picomatch` entre dependencias. Algunas dependencias (como `tailwindcss`, `chokidar`) requerían `picomatch@2.3.1` mientras que otras (como `fdir`) requerían `picomatch@4.0.3`.

**Solución DEFINITIVA aplicada:**
1. ✅ Agregué `"overrides": { "picomatch": "^4.0.3" }` en `package.json`
2. ✅ Eliminé `node_modules` y `package-lock.json`
3. ✅ Regeneré con `npm install --force`
4. ✅ Verifiqué que TODAS las instancias de picomatch sean 4.0.3
5. ✅ Verifiqué que el build funcione localmente
6. ✅ Committeé y pusheé el nuevo `package-lock.json`

**Resultado:** Ahora TODAS las dependencias usan `picomatch@4.0.3` gracias a npm overrides.

## 🚀 Ahora Puedes Desplegar

### Opción 1: Despliegue Manual con Firebase CLI

```bash
# 1. Asegúrate de tener Firebase CLI instalado
npm install -g firebase-tools

# 2. Login (si no lo has hecho)
firebase login

# 3. Edita .firebaserc con tu Project ID real
# Reemplaza "tu-proyecto-id" con tu ID de Firebase

# 4. Despliega
firebase deploy --only hosting
```

### Opción 2: Despliegue con Script Automatizado

```bash
./deploy.sh production
```

### Opción 3: Despliegue desde Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **App Hosting** (o **Hosting**)
4. Click en **Deploy**
5. Conecta tu repositorio de GitHub si no lo has hecho
6. Selecciona la rama `main`
7. Click en **Deploy**

## 🔍 Verificación Pre-Despliegue

Antes de desplegar, verifica que todo funcione localmente:

```bash
# 1. Limpiar
rm -rf .next

# 2. Build
npm run build

# 3. Si el build es exitoso, estás listo para desplegar
```

## 📋 Checklist de Despliegue

- [x] `package-lock.json` sincronizado
- [x] Build local exitoso
- [x] Código pusheado a GitHub
- [ ] Variables de entorno configuradas en Firebase
- [ ] `.firebaserc` configurado con tu Project ID
- [ ] Firebase CLI instalado y autenticado

## 🔐 Variables de Entorno en Firebase

Si usas Firebase App Hosting, necesitas configurar las variables de entorno:

### Método 1: Firebase Console

1. Ve a Firebase Console > App Hosting
2. Click en tu app
3. Settings > Environment variables
4. Agrega cada variable:

```
NEXT_PUBLIC_FIREBASE_API_KEY=tu_valor
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_valor
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_valor
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_valor
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_valor
NEXT_PUBLIC_FIREBASE_APP_ID=tu_valor
NEXT_PUBLIC_AGORA_APP_ID=tu_valor
AGORA_APP_CERTIFICATE=tu_valor
FIREBASE_ADMIN_PROJECT_ID=tu_valor
FIREBASE_ADMIN_CLIENT_EMAIL=tu_valor
FIREBASE_ADMIN_PRIVATE_KEY=tu_valor
```

### Método 2: Archivo .env en Repositorio

**⚠️ SOLO para testing, NO para producción con valores reales**

Puedes crear un `.env` en la raíz (Firebase lo detectará):

```bash
# Copia el ejemplo
cp .env.production.example .env

# Edita con tus valores
nano .env

# Commit (solo si no tiene valores sensibles)
git add .env
git commit -m "Add environment variables"
git push
```

### Método 3: Firebase Secrets (Recomendado para valores sensibles)

```bash
# Para valores sensibles como AGORA_APP_CERTIFICATE
firebase functions:secrets:set AGORA_APP_CERTIFICATE

# Para FIREBASE_ADMIN_PRIVATE_KEY
firebase functions:secrets:set FIREBASE_ADMIN_PRIVATE_KEY
```

## 🐛 Troubleshooting

### Si el despliegue sigue fallando

#### Error: "Build failed"
```bash
# Verifica que el build funcione localmente
npm run build

# Si falla, revisa los errores y corrígelos
# Luego commit y push
```

#### Error: "Environment variables not found"
```bash
# Verifica que las variables estén configuradas en Firebase Console
# O que tengas un .env en la raíz del proyecto
```

#### Error: "Project not found"
```bash
# Verifica que .firebaserc tenga el Project ID correcto
cat .firebaserc

# Si es incorrecto, edítalo:
nano .firebaserc
```

#### Error: "Authentication required"
```bash
# Login nuevamente
firebase logout
firebase login
```

## 📊 Verificar Despliegue

Después de desplegar:

1. **Firebase Console**
   - Ve a Hosting o App Hosting
   - Verás el despliegue en progreso
   - Cuando termine, tendrás una URL

2. **Verificar URL**
   ```
   https://tu-proyecto-id.web.app
   ```

3. **Verificar funcionalidades**
   - Login/Registro
   - Crear curso
   - Livestream
   - Chat
   - Encuestas

## 🔄 Despliegues Futuros

Para evitar este problema en el futuro:

### Siempre que actualices dependencias:

```bash
# Opción 1: Actualizar una dependencia específica
npm install nombre-paquete@version

# Opción 2: Actualizar todas
npm update

# Opción 3: Instalar nueva dependencia
npm install nuevo-paquete

# IMPORTANTE: Siempre commit el package-lock.json actualizado
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

### Workflow recomendado:

```bash
# 1. Hacer cambios en el código
# ... editar archivos ...

# 2. Si instalaste/actualizaste paquetes
npm install

# 3. Verificar que funcione
npm run build

# 4. Commit TODO (incluyendo package-lock.json)
git add .
git commit -m "Descripción del cambio"

# 5. Push
git push origin main

# 6. Firebase desplegará automáticamente (si configuraste GitHub Actions)
# O despliega manualmente: firebase deploy --only hosting
```

## 🎉 ¡Listo!

Tu `package-lock.json` está ahora sincronizado y el build funciona correctamente.

**Siguiente paso:** Despliega con `firebase deploy --only hosting` o `./deploy.sh production`

---

## 📚 Recursos Adicionales

- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
- [Firebase App Hosting Docs](https://firebase.google.com/docs/app-hosting)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [npm ci vs npm install](https://docs.npmjs.com/cli/v8/commands/npm-ci)

---

**¿Problemas?** Revisa `DEPLOYMENT_CHECKLIST.md` o `TROUBLESHOOTING.md`
