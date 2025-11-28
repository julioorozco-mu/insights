# 🔧 Configuración de GitHub y CI/CD

## ✅ Repositorio Creado

Tu código ha sido subido exitosamente a:
```
https://github.com/odvz/easy-courses-platform
```

## 🚀 CI/CD Automático con GitHub Actions

He configurado **GitHub Actions** para desplegar automáticamente a Firebase Hosting cuando hagas push a `main`.

### Cómo Funciona

1. **Push a `main`** → Despliega a producción automáticamente
2. **Pull Request** → Crea un canal de preview temporal (7 días)

### Configurar Secrets en GitHub

Para que el CI/CD funcione, debes configurar los siguientes **secrets** en GitHub:

#### Paso 1: Ir a Settings > Secrets and variables > Actions

En tu repositorio: https://github.com/odvz/easy-courses-platform/settings/secrets/actions

#### Paso 2: Agregar los siguientes secrets

Click en **"New repository secret"** para cada uno:

##### Firebase Service Account
```
Nombre: FIREBASE_SERVICE_ACCOUNT
Valor: [JSON completo del Service Account]
```

**Cómo obtenerlo:**
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Settings (⚙️) > Project settings > Service accounts
4. Click "Generate new private key"
5. Copia TODO el contenido del archivo JSON descargado

##### Firebase Project ID
```
Nombre: FIREBASE_PROJECT_ID
Valor: tu-proyecto-id
```

##### Variables Públicas de Firebase
```
Nombre: NEXT_PUBLIC_FIREBASE_API_KEY
Valor: tu_api_key

Nombre: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
Valor: tu_proyecto.firebaseapp.com

Nombre: NEXT_PUBLIC_FIREBASE_PROJECT_ID
Valor: tu_proyecto_id

Nombre: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
Valor: tu_proyecto.appspot.com

Nombre: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
Valor: 123456789

Nombre: NEXT_PUBLIC_FIREBASE_APP_ID
Valor: 1:123456789:web:abc123
```

##### Variables de Agora
```
Nombre: NEXT_PUBLIC_AGORA_APP_ID
Valor: tu_agora_app_id

Nombre: AGORA_APP_CERTIFICATE
Valor: tu_agora_certificate
```

##### Variables de Firebase Admin
```
Nombre: FIREBASE_ADMIN_PROJECT_ID
Valor: tu_proyecto_id

Nombre: FIREBASE_ADMIN_CLIENT_EMAIL
Valor: firebase-adminsdk@tu_proyecto.iam.gserviceaccount.com

Nombre: FIREBASE_ADMIN_PRIVATE_KEY
Valor: -----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

**Importante:** Para `FIREBASE_ADMIN_PRIVATE_KEY`, asegúrate de incluir los saltos de línea como `\n`

---

## 📝 Workflow de Desarrollo

### Desarrollo Local
```bash
# 1. Crear rama para feature
git checkout -b feature/nueva-funcionalidad

# 2. Hacer cambios
# ... editar archivos ...

# 3. Commit
git add .
git commit -m "Descripción del cambio"

# 4. Push
git push origin feature/nueva-funcionalidad
```

### Pull Request y Preview
```bash
# 1. Crear Pull Request en GitHub
# 2. GitHub Actions creará un canal de preview automáticamente
# 3. Recibirás una URL de preview en el PR
# 4. Prueba los cambios en el preview
# 5. Si todo está bien, merge el PR
```

### Despliegue a Producción
```bash
# Opción 1: Merge de Pull Request
# Al hacer merge a main, se despliega automáticamente

# Opción 2: Push directo a main
git checkout main
git pull
git merge feature/nueva-funcionalidad
git push origin main
# Se despliega automáticamente
```

---

## 🔄 Comandos Git Útiles

### Ver estado
```bash
git status
```

### Ver historial
```bash
git log --oneline
```

### Crear rama
```bash
git checkout -b nombre-rama
```

### Cambiar de rama
```bash
git checkout nombre-rama
```

### Actualizar desde remoto
```bash
git pull origin main
```

### Ver ramas
```bash
git branch -a
```

### Eliminar rama local
```bash
git branch -d nombre-rama
```

### Eliminar rama remota
```bash
git push origin --delete nombre-rama
```

---

## 🛡️ Protección de la Rama Main

Te recomiendo proteger la rama `main` para evitar pushes directos:

1. Ve a: https://github.com/odvz/easy-courses-platform/settings/branches
2. Click en "Add rule"
3. Branch name pattern: `main`
4. Marca:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
5. Save changes

---

## 📊 Ver Despliegues

### En GitHub
- Ve a la pestaña **Actions** en tu repositorio
- Verás todos los workflows ejecutándose o completados
- Click en cualquiera para ver logs detallados

### En Firebase
- Ve a [Firebase Console](https://console.firebase.google.com/)
- Hosting > Versiones
- Verás todos los despliegues con timestamps

---

## 🐛 Troubleshooting

### Build falla en GitHub Actions

**Ver logs:**
1. Ve a Actions tab
2. Click en el workflow fallido
3. Click en el job "build_and_deploy"
4. Revisa los logs de cada step

**Soluciones comunes:**
- Verificar que todos los secrets estén configurados
- Verificar que el build funcione localmente: `npm run build`
- Verificar que no haya errores de linter

### Secrets no funcionan

**Verificar:**
1. Que los nombres sean exactamente como están en el workflow
2. Que no haya espacios extra al copiar/pegar
3. Para `FIREBASE_ADMIN_PRIVATE_KEY`, verificar los `\n`

**Re-generar Service Account:**
```bash
# Si el Service Account no funciona, genera uno nuevo
# Firebase Console > Project Settings > Service Accounts
# Generate new private key
```

### Preview no se crea en Pull Request

**Verificar:**
1. Que `FIREBASE_SERVICE_ACCOUNT` esté configurado
2. Que `FIREBASE_PROJECT_ID` sea correcto
3. Ver logs en Actions tab

---

## 🔐 Seguridad

### ⚠️ NUNCA commitees:
- ❌ `.env` con valores reales
- ❌ Service Account JSON files
- ❌ API keys o secrets
- ❌ Tokens de acceso

### ✅ Siempre usa:
- ✅ GitHub Secrets para variables sensibles
- ✅ `.env.example` para documentar variables necesarias
- ✅ `.gitignore` para excluir archivos sensibles

---

## 📚 Recursos

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Firebase Hosting GitHub Action](https://github.com/FirebaseExtended/action-hosting-deploy)
- [Git Basics](https://git-scm.com/book/en/v2/Getting-Started-Git-Basics)

---

## 🎉 ¡Listo!

Tu repositorio está configurado con:
- ✅ Código subido a GitHub
- ✅ CI/CD automático con GitHub Actions
- ✅ Preview automático en Pull Requests
- ✅ Despliegue automático a producción

**Próximos pasos:**
1. Configura los secrets en GitHub
2. Haz un pequeño cambio y push para probar el CI/CD
3. Verifica que el despliegue automático funcione
