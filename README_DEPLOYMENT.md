# 🚀 Guía Rápida de Despliegue

## ¿Qué se ha configurado?

Tu aplicación Next.js está **lista para desplegarse en Firebase Hosting** con soporte completo para:

✅ **Server-Side Rendering (SSR)**  
✅ **API Routes** (generación de tokens Agora)  
✅ **Static Generation** (páginas optimizadas)  
✅ **Firebase Integration** (Firestore, Auth, Storage)  
✅ **Agora Livestreaming** (RTC en tiempo real)  
✅ **Reglas de seguridad** (Firestore y Storage)  

---

## 📋 Pasos Rápidos (5 minutos)

### 1️⃣ Instalar Firebase CLI

```bash
npm install -g firebase-tools
```

### 2️⃣ Autenticarse

```bash
firebase login
```

### 3️⃣ Configurar Project ID

Edita `.firebaserc` y reemplaza `"tu-proyecto-id"` con tu **Project ID real** de Firebase Console.

```json
{
  "projects": {
    "default": "mi-proyecto-real"
  }
}
```

### 4️⃣ Configurar Variables de Entorno

Copia el archivo de ejemplo:

```bash
cp .env.production.example .env
```

Edita `.env` y completa **todas las variables**:

```env
# Firebase Client (obtén de Firebase Console)
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_proyecto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Agora (obtén de Agora Console)
NEXT_PUBLIC_AGORA_APP_ID=tu_agora_app_id
AGORA_APP_CERTIFICATE=tu_agora_certificate

# Firebase Admin (descarga Service Account JSON)
FIREBASE_ADMIN_PROJECT_ID=tu_proyecto_id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@tu_proyecto.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 5️⃣ Desplegar

**Opción A: Script automático** (recomendado)

```bash
./deploy.sh production
```

**Opción B: Manual**

```bash
npm run build
npm run deploy
```

---

## 🎯 Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Desarrollo local |
| `npm run build` | Construir para producción |
| `npm run deploy` | Desplegar solo hosting |
| `npm run deploy:full` | Desplegar todo (hosting + reglas) |
| `./deploy.sh preview` | Crear canal de preview |
| `./deploy.sh production` | Desplegar a producción |

---

## 📁 Archivos Creados

```
easy-courses-platform/
├── firebase.json              # Configuración de Firebase Hosting
├── .firebaserc                # Project ID de Firebase
├── firestore.rules            # Reglas de seguridad Firestore
├── firestore.indexes.json     # Índices de Firestore
├── storage.rules              # Reglas de seguridad Storage
├── deploy.sh                  # Script de despliegue automatizado
├── .env.production.example    # Plantilla de variables de entorno
├── DEPLOYMENT.md              # Guía completa de despliegue
├── DEPLOYMENT_CHECKLIST.md    # Checklist paso a paso
└── README_DEPLOYMENT.md       # Esta guía rápida
```

---

## 🔐 Seguridad

Las reglas de Firestore y Storage ya están configuradas con:

- ✅ Autenticación requerida para la mayoría de operaciones
- ✅ Validación de roles (instructor/estudiante)
- ✅ Límites de tamaño de archivos
- ✅ Validación de tipos de archivo
- ✅ Protección de datos sensibles

---

## 🌐 Después del Despliegue

Tu aplicación estará disponible en:

```
https://tu-proyecto-id.web.app
```

O si configuraste dominio personalizado:

```
https://tu-dominio.com
```

---

## 📊 Monitoreo

Después del despliegue, puedes monitorear:

- **Hosting**: Firebase Console > Hosting
- **Functions**: Firebase Console > Functions
- **Logs**: Firebase Console > Functions > Logs
- **Analytics**: Firebase Console > Analytics
- **Performance**: Firebase Console > Performance

---

## 🆘 Problemas Comunes

### "Firebase CLI not found"
```bash
npm install -g firebase-tools
```

### "Project not found"
Verifica que el Project ID en `.firebaserc` sea correcto.

### "Build failed"
```bash
rm -rf .next
npm run build
```

### "Environment variables not working"
- Variables públicas deben empezar con `NEXT_PUBLIC_`
- Reconstruir después de cambiar variables
- Verificar que `.env` esté en la raíz

---

## 📚 Documentación Completa

Para más detalles, consulta:

- **`DEPLOYMENT.md`** - Guía completa de despliegue
- **`DEPLOYMENT_CHECKLIST.md`** - Checklist detallado
- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
- [Next.js en Firebase](https://firebase.google.com/docs/hosting/frameworks/nextjs)

---

## 🎉 ¡Listo!

Tu aplicación está configurada y lista para desplegarse en Firebase Hosting.

**Siguiente paso**: Ejecuta `./deploy.sh production` y tu app estará en vivo en minutos.

---

## 💡 Tips

1. **Preview antes de producción**: Usa `./deploy.sh preview` para probar cambios
2. **Variables de entorno**: Nunca commitees `.env` con valores reales
3. **Monitoreo**: Revisa logs regularmente en Firebase Console
4. **Backups**: Exporta Firestore periódicamente
5. **Actualizaciones**: Mantén dependencias actualizadas con `npm update`

---

## 🔄 Rollback

Si algo sale mal, puedes volver a una versión anterior:

```bash
firebase hosting:rollback
```

---

**¿Preguntas?** Revisa `DEPLOYMENT.md` o `DEPLOYMENT_CHECKLIST.md` para más detalles.
