# 🚀 Guía de Configuración

## Prerrequisitos

- Node.js 18+ instalado
- Cuenta de Firebase
- Cuenta de Mux
- Git

## 1. Instalación de Dependencias

```bash
npm install
```

## 2. Configuración de Firebase

### Crear Proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto
3. Habilita los siguientes servicios:
   - **Authentication**: Email/Password
   - **Firestore Database**: Modo producción
   - **Storage**: Modo producción

### Obtener Credenciales

1. Ve a **Configuración del Proyecto** > **General**
2. En "Tus apps", selecciona la app web
3. Copia las credenciales de configuración

### Configurar Reglas de Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId || 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Courses collection
    match /courses/{courseId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
                      (request.auth.token.role == 'instructor' || request.auth.token.role == 'admin');
      allow update, delete: if request.auth != null && 
                              (resource.data.instructorId == request.auth.uid || 
                               request.auth.token.role == 'admin');
    }
    
    // Live streams collection
    match /liveStreams/{streamId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
                      (request.auth.token.role == 'instructor' || request.auth.token.role == 'admin');
      allow update, delete: if request.auth != null && 
                              (resource.data.instructorId == request.auth.uid || 
                               request.auth.token.role == 'admin');
    }
    
    // Live chats collection
    match /liveChats/{streamId}/messages/{messageId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow delete: if request.auth != null && 
                      (resource.data.userId == request.auth.uid || 
                       request.auth.token.role == 'admin' || 
                       request.auth.token.role == 'instructor');
    }
  }
}
```

### Configurar Reglas de Storage

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                     request.resource.size < 100 * 1024 * 1024; // 100MB max
    }
  }
}
```

## 3. Configuración de Mux

### Crear Cuenta y Obtener Tokens

1. Ve a [Mux Dashboard](https://dashboard.mux.com/)
2. Crea una nueva cuenta o inicia sesión
3. Ve a **Settings** > **Access Tokens**
4. Crea un nuevo token con permisos de:
   - Mux Video (Read/Write)
   - Mux Data (Read)
5. Guarda el **Token ID** y **Token Secret**

## 4. Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_proyecto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id

# Mux
MUX_TOKEN_ID=tu_mux_token_id
MUX_TOKEN_SECRET=tu_mux_token_secret
MUX_WEBHOOK_SECRET=tu_webhook_secret

# General
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 5. Ejecutar el Proyecto

### Modo Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

### Modo Producción

```bash
npm run build
npm start
```

## 6. Crear Primer Usuario Admin

1. Regístrate en la aplicación
2. Ve a Firebase Console > Authentication
3. Encuentra tu usuario y copia el UID
4. Ve a Firestore Database > users > [tu_uid]
5. Edita el documento y cambia `role` a `"admin"`

## 7. Configurar OBS para Streaming

### Configuración Básica

1. Descarga [OBS Studio](https://obsproject.com/)
2. Abre OBS y ve a **Settings** > **Stream**
3. Configura:
   - **Service**: Custom
   - **Server**: `rtmp://global-live.mux.com:5222/app`
   - **Stream Key**: (obtenlo desde la página de transmisión en la app)

### Configuración Recomendada

- **Output**:
  - Bitrate: 2500-4000 Kbps
  - Encoder: x264
  - Preset: veryfast
  
- **Video**:
  - Base Resolution: 1920x1080
  - Output Resolution: 1280x720
  - FPS: 30

## 8. Despliegue en Vercel

### Conectar Repositorio

1. Sube tu código a GitHub
2. Ve a [Vercel](https://vercel.com/)
3. Importa tu repositorio
4. Configura las variables de entorno en Vercel
5. Despliega

### Variables de Entorno en Vercel

Agrega todas las variables del archivo `.env.local` en:
**Project Settings** > **Environment Variables**

## 9. Índices de Firestore

Crea los siguientes índices compuestos en Firestore:

1. **courses**:
   - `instructorId` (Ascending) + `createdAt` (Descending)
   - `isPublished` (Ascending) + `createdAt` (Descending)

2. **liveStreams**:
   - `instructorId` (Ascending) + `createdAt` (Descending)
   - `active` (Ascending) + `createdAt` (Descending)

## 10. Solución de Problemas

### Error de CORS en Firebase

Asegúrate de que tu dominio esté autorizado en Firebase Console > Authentication > Settings > Authorized domains

### Error de Mux API

Verifica que tus tokens de Mux sean correctos y tengan los permisos necesarios

### Error de Firestore

Revisa las reglas de seguridad y asegúrate de que los índices estén creados

## 📚 Recursos Adicionales

- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Firebase](https://firebase.google.com/docs)
- [Documentación de Mux](https://docs.mux.com/)
- [Documentación de DaisyUI](https://daisyui.com/)
