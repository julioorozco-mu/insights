# Guía de Despliegue - Firebase Hosting

Esta aplicación Next.js está configurada para desplegarse en **Firebase Hosting** con soporte completo para SSR, API Routes y funciones serverless.

## Requisitos Previos

1. **Node.js 18+** instalado
2. **Firebase CLI** instalado globalmente:
   ```bash
   npm install -g firebase-tools
   ```

3. **Cuenta de Firebase** con un proyecto creado

## Configuración Inicial

### 1. Obtener el ID de tu proyecto Firebase

Ve a [Firebase Console](https://console.firebase.google.com/) y copia el **Project ID** de tu proyecto.

### 2. Configurar el proyecto localmente

Edita el archivo `.firebaserc` y reemplaza `"tu-proyecto-id"` con tu Project ID real:

```json
{
  "projects": {
    "default": "tu-proyecto-id-real"
  }
}
```

### 3. Autenticarse con Firebase

```bash
firebase login
```

Esto abrirá tu navegador para autenticarte con tu cuenta de Google.

### 4. Verificar la configuración

```bash
firebase projects:list
```

Deberías ver tu proyecto listado.

## Variables de Entorno

### Variables Locales (.env.local)

Para desarrollo local, crea un archivo `.env.local` con:

```env
# Firebase Client (público)
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_proyecto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id

# Agora
NEXT_PUBLIC_AGORA_APP_ID=tu_agora_app_id
AGORA_APP_CERTIFICATE=tu_agora_certificate

# Firebase Admin (privado - solo servidor)
FIREBASE_ADMIN_PROJECT_ID=tu_proyecto_id
FIREBASE_ADMIN_CLIENT_EMAIL=tu_service_account@tu_proyecto.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\ntu_private_key\n-----END PRIVATE KEY-----\n"
```

### Variables en Firebase Hosting

Para producción, configura las variables de entorno en Firebase:

```bash
# Variables públicas (NEXT_PUBLIC_*)
firebase hosting:channel:deploy preview --expires 7d

# Variables secretas (servidor)
firebase functions:secrets:set AGORA_APP_CERTIFICATE
firebase functions:secrets:set FIREBASE_ADMIN_PRIVATE_KEY
```

O usa el archivo `.env` en la raíz (Firebase lo detectará automáticamente):

```bash
# Crea un archivo .env en la raíz del proyecto
# Firebase Hosting lo usará automáticamente
```

## Proceso de Despliegue

### Opción 1: Despliegue Rápido (Solo Hosting)

```bash
# 1. Construir la aplicación
npm run build

# 2. Desplegar
npm run deploy
```

### Opción 2: Despliegue Completo (Hosting + Firestore + Storage)

```bash
# Desplegar todo
npm run deploy:full
```

### Opción 3: Despliegue Manual Paso a Paso

```bash
# 1. Construir
npm run build

# 2. Desplegar hosting
firebase deploy --only hosting

# 3. (Opcional) Desplegar reglas de Firestore
firebase deploy --only firestore:rules

# 4. (Opcional) Desplegar reglas de Storage
firebase deploy --only storage
```

## Verificación Post-Despliegue

1. **URL de Hosting**: Después del despliegue, Firebase te dará una URL como:
   ```
   https://tu-proyecto.web.app
   ```

2. **Verificar funcionalidades**:
   - ✅ Autenticación (login/registro)
   - ✅ Firestore (lectura/escritura de datos)
   - ✅ Storage (subida de archivos)
   - ✅ Agora (livestreaming)
   - ✅ API Routes (generación de tokens)

3. **Logs en tiempo real**:
   ```bash
   firebase hosting:channel:open live
   ```

## Comandos Útiles

```bash
# Ver logs de funciones
firebase functions:log

# Probar localmente con emuladores
firebase emulators:start

# Ver estado del despliegue
firebase hosting:channel:list

# Crear un canal de preview
firebase hosting:channel:deploy preview-nombre

# Eliminar un canal de preview
firebase hosting:channel:delete preview-nombre
```

## Configuración de Dominio Personalizado

1. Ve a Firebase Console > Hosting
2. Click en "Add custom domain"
3. Sigue las instrucciones para configurar DNS
4. Firebase proveerá certificado SSL automáticamente

## Troubleshooting

### Error: "Firebase CLI not found"
```bash
npm install -g firebase-tools
```

### Error: "Project not found"
Verifica que el Project ID en `.firebaserc` sea correcto.

### Error: "Build failed"
```bash
# Limpiar cache y reconstruir
rm -rf .next
npm run build
```

### Error: "Environment variables not working"
- Variables públicas deben empezar con `NEXT_PUBLIC_`
- Variables privadas se configuran en Firebase Functions secrets
- Reinicia el servidor después de cambiar variables

### Error: "API Routes returning 404"
Firebase Hosting automáticamente detecta y despliega API Routes de Next.js. Si no funcionan:
1. Verifica que estén en `src/app/api/`
2. Reconstruye: `npm run build`
3. Redesplega: `npm run deploy`

## Monitoreo y Analytics

Firebase Hosting incluye:
- **Performance Monitoring**: Automático
- **Analytics**: Configurable en Firebase Console
- **Crash Reporting**: Integrado con Firebase Crashlytics

## Costos

Firebase Hosting incluye:
- **Spark Plan (Gratis)**:
  - 10 GB almacenamiento
  - 360 MB/día transferencia
  - SSL gratis
  
- **Blaze Plan (Pay as you go)**:
  - Primeros 10 GB gratis
  - $0.026/GB adicional
  - Funciones serverless incluidas

## Rollback

Si necesitas volver a una versión anterior:

```bash
# Ver versiones anteriores
firebase hosting:releases:list

# Restaurar versión específica
firebase hosting:rollback
```

## CI/CD con GitHub Actions

Crea `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: tu-proyecto-id
```

## Soporte

- [Documentación Firebase Hosting](https://firebase.google.com/docs/hosting)
- [Next.js en Firebase](https://firebase.google.com/docs/hosting/frameworks/nextjs)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
