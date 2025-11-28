# 🔥 Configuración de Firebase - Guía Paso a Paso

## ⚠️ Error Común: `auth/configuration-not-found`

Este error ocurre cuando Firebase Authentication no está configurado correctamente. Sigue estos pasos:

---

## 📋 Paso 1: Crear Proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en **"Add project"** o **"Crear un proyecto"**
3. Ingresa un nombre para tu proyecto (ej: `easy-courses-platform`)
4. Acepta los términos y haz clic en **Continue**
5. Desactiva Google Analytics (opcional) y haz clic en **Create project**
6. Espera a que se cree el proyecto y haz clic en **Continue**

---

## 📋 Paso 2: Configurar Firebase Authentication

### 2.1 Habilitar Authentication

1. En el menú lateral izquierdo, ve a **Build** → **Authentication**
2. Haz clic en **Get started**
3. Ve a la pestaña **Sign-in method**
4. Haz clic en **Email/Password**
5. **Activa el switch de "Enable"** (MUY IMPORTANTE)
6. Haz clic en **Save**

### 2.2 Verificar que está habilitado

Deberías ver **Email/Password** con estado **"Enabled"** en verde.

---

## 📋 Paso 3: Configurar Firestore Database

1. En el menú lateral, ve a **Build** → **Firestore Database**
2. Haz clic en **Create database**
3. Selecciona **"Start in production mode"**
4. Haz clic en **Next**
5. Elige una ubicación cercana (ej: `us-central1` o `southamerica-east1`)
6. Haz clic en **Enable**

### 3.1 Configurar Reglas de Firestore (Temporal para Desarrollo)

1. Ve a la pestaña **Rules**
2. Reemplaza las reglas con esto:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir lectura/escritura solo a usuarios autenticados
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Haz clic en **Publish**

---

## 📋 Paso 4: Configurar Firebase Storage

1. En el menú lateral, ve a **Build** → **Storage**
2. Haz clic en **Get started**
3. Selecciona **"Start in production mode"**
4. Haz clic en **Next**
5. Usa la misma ubicación que Firestore
6. Haz clic en **Done**

### 4.1 Configurar Reglas de Storage

1. Ve a la pestaña **Rules**
2. Reemplaza las reglas con esto:

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

3. Haz clic en **Publish**

---

## 📋 Paso 5: Obtener Credenciales de Firebase

1. Haz clic en el ícono de **⚙️ (Settings)** en el menú lateral
2. Selecciona **Project settings**
3. Baja hasta la sección **"Your apps"**
4. Si no tienes una app web, haz clic en el ícono **</>** (Web)
5. Ingresa un nombre para tu app (ej: `easy-courses-web`)
6. **NO marques** "Also set up Firebase Hosting"
7. Haz clic en **Register app**
8. Verás un código como este:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto-id",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

9. **Copia estos valores**

---

## 📋 Paso 6: Configurar Variables de Entorno

1. En la raíz de tu proyecto, crea un archivo `.env` (sin `.local`):

```bash
touch .env
```

2. Abre el archivo `.env` y pega tus credenciales:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# Mux (opcional por ahora)
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=
MUX_WEBHOOK_SECRET=

# General
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. **Guarda el archivo**

---

## 📋 Paso 7: Ejecutar el Seed

Ahora sí, ejecuta el script de seed:

```bash
npm run seed
```

Deberías ver:

```
🌱 Iniciando población de base de datos...

👥 Creando usuarios de prueba...
✅ Usuario creado: admin@test.com (admin)
✅ Usuario creado: speaker@test.com (speaker)
✅ Usuario creado: speaker2@test.com (speaker)
✅ Usuario creado: student@test.com (student)
✅ Usuario creado: student2@test.com (student)

📚 Creando cursos de prueba...
✅ Curso creado: Introducción a React
✅ Curso creado: Diseño UX/UI Profesional
✅ Curso creado: JavaScript Avanzado

📖 Creando lecciones de prueba...
✅ Lección creada: Introducción a React
✅ Lección creada: Componentes y Props
✅ Lección creada: Estado y Hooks

🎓 Creando templates de certificados...
✅ Template creado: Certificado Estándar

📊 Creando encuestas de prueba...
✅ Encuesta creada: Evaluación del Curso

✨ ¡Base de datos poblada exitosamente!

📝 Credenciales de prueba:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADMIN: admin@test.com / admin123
SPEAKER: speaker@test.com / speaker123
SPEAKER: speaker2@test.com / speaker123
STUDENT: student@test.com / student123
STUDENT: student2@test.com / student123
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 📋 Paso 8: Ejecutar la Aplicación

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) y:

1. Verás el carrusel de cursos
2. Podrás iniciar sesión con cualquiera de las credenciales de prueba
3. O registrarte como nuevo alumno en `/sign-up`

---

## ✅ Checklist de Verificación

Antes de ejecutar el seed, verifica:

- [ ] Proyecto de Firebase creado
- [ ] **Authentication habilitado** con Email/Password
- [ ] Firestore Database creado
- [ ] Storage configurado
- [ ] Archivo `.env` creado con todas las credenciales
- [ ] Las credenciales son correctas (copiadas de Firebase Console)

---

## 🐛 Solución de Problemas

### Error: `auth/configuration-not-found`
**Causa**: Authentication no está habilitado en Firebase Console  
**Solución**: Ve a Authentication → Sign-in method → Habilita Email/Password

### Error: `auth/invalid-api-key`
**Causa**: La API Key en `.env` es incorrecta o está vacía  
**Solución**: Verifica que copiaste correctamente la API Key de Firebase Console

### Error: `permission-denied`
**Causa**: Las reglas de Firestore no permiten escritura  
**Solución**: Configura las reglas de Firestore como se indica arriba

### Los usuarios no se crean
**Causa**: Authentication no está habilitado  
**Solución**: Verifica en Firebase Console → Authentication que Email/Password esté "Enabled"

---

## 📊 Verificar que Funcionó

Después de ejecutar el seed exitosamente:

1. Ve a Firebase Console → **Authentication** → **Users**
2. Deberías ver 5 usuarios creados
3. Ve a **Firestore Database** → **Data**
4. Deberías ver las colecciones: `users`, `students`, `speakers`, `courses`, `lessons`, `certificateTemplates`, `surveys`

---

## 🎯 Credenciales de Prueba

Una vez poblada la base de datos, puedes usar estas credenciales:

| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@test.com | admin123 |
| Speaker | speaker@test.com | speaker123 |
| Speaker | speaker2@test.com | speaker123 |
| Student | student@test.com | student123 |
| Student | student2@test.com | student123 |

---

## 🚀 Siguiente Paso

Una vez que el seed funcione correctamente:

1. **Configura Agora.io** para transmisiones en vivo (ver [AGORA_SETUP.md](./AGORA_SETUP.md))
2. Ejecuta el servidor de desarrollo:

```bash
npm run dev
```

3. Accede a [http://localhost:3000](http://localhost:3000)
