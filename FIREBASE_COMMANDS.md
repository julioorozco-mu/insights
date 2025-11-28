# 🔥 Comandos Útiles de Firebase

## Autenticación y Configuración

```bash
# Login a Firebase
firebase login

# Logout
firebase logout

# Ver proyectos disponibles
firebase projects:list

# Cambiar proyecto activo
firebase use <project-id>

# Ver proyecto actual
firebase use

# Inicializar proyecto (si es necesario)
firebase init
```

---

## Despliegue

```bash
# Desplegar solo hosting
firebase deploy --only hosting

# Desplegar solo reglas de Firestore
firebase deploy --only firestore:rules

# Desplegar solo índices de Firestore
firebase deploy --only firestore:indexes

# Desplegar solo reglas de Storage
firebase deploy --only storage

# Desplegar todo
firebase deploy

# Desplegar con mensaje
firebase deploy -m "Descripción del cambio"
```

---

## Hosting

```bash
# Ver versiones desplegadas
firebase hosting:releases:list

# Rollback a versión anterior
firebase hosting:rollback

# Crear canal de preview
firebase hosting:channel:deploy preview-nombre

# Crear canal con expiración
firebase hosting:channel:deploy preview-nombre --expires 7d

# Listar canales activos
firebase hosting:channel:list

# Abrir canal en navegador
firebase hosting:channel:open preview-nombre

# Eliminar canal
firebase hosting:channel:delete preview-nombre

# Clonar versión a canal
firebase hosting:clone <source-channel>:<target-channel>
```

---

## Firestore

```bash
# Exportar datos de Firestore
firebase firestore:export gs://tu-bucket/backup-$(date +%Y%m%d)

# Importar datos a Firestore
firebase firestore:import gs://tu-bucket/backup-20240101

# Eliminar todos los datos (¡CUIDADO!)
firebase firestore:delete --all-collections

# Eliminar colección específica
firebase firestore:delete --recursive /path/to/collection

# Ver índices
firebase firestore:indexes

# Desplegar índices
firebase deploy --only firestore:indexes
```

---

## Storage

```bash
# Listar archivos en Storage
gsutil ls gs://tu-bucket

# Descargar archivo
gsutil cp gs://tu-bucket/path/to/file.jpg ./local-file.jpg

# Subir archivo
gsutil cp ./local-file.jpg gs://tu-bucket/path/to/file.jpg

# Eliminar archivo
gsutil rm gs://tu-bucket/path/to/file.jpg

# Eliminar carpeta recursivamente
gsutil rm -r gs://tu-bucket/path/to/folder/

# Ver tamaño de bucket
gsutil du -sh gs://tu-bucket
```

---

## Functions (si las usas)

```bash
# Ver logs de functions
firebase functions:log

# Ver logs en tiempo real
firebase functions:log --only functionName

# Listar functions desplegadas
firebase functions:list

# Eliminar function
firebase functions:delete functionName

# Ver configuración de functions
firebase functions:config:get

# Establecer variable de entorno
firebase functions:config:set someservice.key="THE API KEY"

# Eliminar variable de entorno
firebase functions:config:unset someservice.key

# Secrets (variables sensibles)
firebase functions:secrets:set SECRET_NAME
firebase functions:secrets:access SECRET_NAME
firebase functions:secrets:destroy SECRET_NAME
```

---

## Emuladores (Testing Local)

```bash
# Iniciar todos los emuladores
firebase emulators:start

# Iniciar emuladores específicos
firebase emulators:start --only hosting,firestore

# Iniciar con datos de prueba
firebase emulators:start --import=./emulator-data

# Exportar datos de emuladores
firebase emulators:export ./emulator-data

# Ver UI de emuladores
# Automáticamente abre en http://localhost:4000
```

---

## Debugging y Logs

```bash
# Ver logs de hosting
firebase hosting:channel:list

# Ver logs de functions
firebase functions:log

# Ver logs con filtro
firebase functions:log --only myFunction

# Ver logs de los últimos N minutos
firebase functions:log --lines 100

# Modo debug
firebase --debug deploy
```

---

## Información del Proyecto

```bash
# Ver información del proyecto
firebase projects:list

# Ver cuota de uso
firebase projects:quota

# Ver configuración actual
firebase apps:list

# Ver SDKs configurados
firebase apps:sdkconfig
```

---

## Extensiones de Firebase

```bash
# Listar extensiones disponibles
firebase ext:list

# Instalar extensión
firebase ext:install extension-name

# Actualizar extensión
firebase ext:update extension-name

# Desinstalar extensión
firebase ext:uninstall extension-name
```

---

## Utilidades

```bash
# Verificar configuración
firebase --version

# Ayuda general
firebase --help

# Ayuda de comando específico
firebase deploy --help

# Modo interactivo
firebase

# Limpiar cache
firebase logout
rm -rf ~/.config/firebase
firebase login
```

---

## Scripts NPM Personalizados

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Desplegar solo hosting
npm run deploy

# Desplegar todo
npm run deploy:full

# Preview
./deploy.sh preview

# Producción
./deploy.sh production
```

---

## Workflow Recomendado

### Desarrollo Local
```bash
# 1. Trabajar en feature
npm run dev

# 2. Probar con emuladores
firebase emulators:start

# 3. Build local
npm run build
```

### Testing en Preview
```bash
# 1. Crear canal de preview
./deploy.sh preview

# 2. Probar en URL de preview
# 3. Si todo está bien, desplegar a producción
```

### Despliegue a Producción
```bash
# 1. Build
npm run build

# 2. Desplegar
./deploy.sh production

# 3. Verificar en producción
# 4. Monitorear logs
firebase functions:log
```

---

## Monitoreo Post-Despliegue

```bash
# Ver métricas de hosting
firebase hosting:channel:list

# Ver logs en tiempo real
firebase functions:log --only functionName

# Verificar estado
firebase projects:list
```

---

## Troubleshooting

### Limpiar todo y empezar de nuevo
```bash
# Logout
firebase logout

# Limpiar cache
rm -rf ~/.config/firebase
rm -rf .firebase/

# Login nuevamente
firebase login

# Verificar proyecto
firebase use
```

### Problemas con despliegue
```bash
# Limpiar build
rm -rf .next

# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install

# Build limpio
npm run build

# Desplegar con debug
firebase --debug deploy
```

### Problemas con variables de entorno
```bash
# Verificar que .env existe
ls -la .env

# Verificar contenido (sin mostrar valores sensibles)
cat .env | grep "NEXT_PUBLIC"

# Reconstruir
npm run build
```

---

## Recursos Adicionales

- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
- [Firestore Docs](https://firebase.google.com/docs/firestore)
- [Storage Docs](https://firebase.google.com/docs/storage)

---

**Tip**: Guarda este archivo como referencia rápida para comandos de Firebase.
