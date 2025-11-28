# ✅ Checklist de Despliegue a Firebase Hosting

## Pre-Despliegue

### 1. Configuración de Firebase
- [ ] Instalar Firebase CLI: `npm install -g firebase-tools`
- [ ] Autenticarse: `firebase login`
- [ ] Editar `.firebaserc` con tu Project ID real
- [ ] Verificar proyecto: `firebase projects:list`

### 2. Variables de Entorno
- [ ] Copiar `.env.production.example` a `.env`
- [ ] Completar todas las variables de Firebase Client
- [ ] Completar variables de Agora (App ID y Certificate)
- [ ] Obtener Service Account Key de Firebase Admin
- [ ] Completar variables de Firebase Admin

### 3. Configuración de Firebase Console

#### Firebase Authentication
- [ ] Habilitar Email/Password en Authentication > Sign-in method
- [ ] (Opcional) Habilitar Google Sign-in
- [ ] Configurar dominios autorizados en Authentication > Settings

#### Firestore Database
- [ ] Crear base de datos Firestore (si no existe)
- [ ] Desplegar reglas: `firebase deploy --only firestore:rules`
- [ ] Desplegar índices: `firebase deploy --only firestore:indexes`

#### Storage
- [ ] Habilitar Firebase Storage
- [ ] Desplegar reglas: `firebase deploy --only storage`
- [ ] Configurar CORS si es necesario

#### Agora
- [ ] Crear proyecto en Agora Console
- [ ] Obtener App ID
- [ ] Generar App Certificate
- [ ] Habilitar servicios de RTC

### 4. Verificación Local
- [ ] Ejecutar `npm run build` sin errores
- [ ] Probar la aplicación localmente: `npm run start`
- [ ] Verificar que todas las funcionalidades trabajen:
  - [ ] Login/Registro
  - [ ] Crear curso
  - [ ] Subir archivos
  - [ ] Iniciar livestream
  - [ ] Chat en vivo
  - [ ] Encuestas
  - [ ] Certificados

## Despliegue

### Opción A: Despliegue Automático (Recomendado)
```bash
./deploy.sh production
```

### Opción B: Despliegue Manual
```bash
# 1. Limpiar
rm -rf .next

# 2. Instalar dependencias
npm ci

# 3. Build
npm run build

# 4. Desplegar
firebase deploy --only hosting
```

### Opción C: Despliegue Preview (Testing)
```bash
./deploy.sh preview
```

## Post-Despliegue

### 1. Verificación Básica
- [ ] Abrir URL de producción
- [ ] Verificar que la página carga correctamente
- [ ] Verificar SSL (candado verde en navegador)
- [ ] Probar en diferentes navegadores (Chrome, Firefox, Safari)
- [ ] Probar en móvil

### 2. Verificación de Funcionalidades

#### Autenticación
- [ ] Registro de nuevo usuario
- [ ] Login con usuario existente
- [ ] Logout
- [ ] Recuperación de contraseña

#### Instructor
- [ ] Crear curso
- [ ] Subir thumbnail
- [ ] Crear lección
- [ ] Iniciar livestream
- [ ] Compartir pantalla
- [ ] Activar/desactivar cámara
- [ ] Activar/desactivar micrófono
- [ ] Crear encuesta
- [ ] Ver resultados de encuesta
- [ ] Finalizar livestream

#### Estudiante
- [ ] Ver cursos disponibles
- [ ] Inscribirse a curso
- [ ] Ver lecciones
- [ ] Unirse a livestream
- [ ] Ver pantalla compartida del instructor
- [ ] Ver cámara del instructor (flotante)
- [ ] Escuchar audio del instructor
- [ ] Enviar mensajes en chat
- [ ] Responder encuestas
- [ ] Ver resultados de encuestas
- [ ] Generar certificado

### 3. Monitoreo
- [ ] Verificar logs en Firebase Console > Functions
- [ ] Verificar métricas en Firebase Console > Hosting
- [ ] Configurar alertas de errores
- [ ] Configurar Google Analytics (opcional)

### 4. Performance
- [ ] Ejecutar Lighthouse audit
- [ ] Verificar tiempos de carga
- [ ] Optimizar imágenes si es necesario
- [ ] Verificar que CDN esté funcionando

### 5. Seguridad
- [ ] Verificar reglas de Firestore
- [ ] Verificar reglas de Storage
- [ ] Revisar que variables sensibles no estén expuestas
- [ ] Verificar HTTPS en todas las páginas
- [ ] Revisar CORS si aplica

## Troubleshooting Común

### Build Falla
```bash
# Limpiar cache
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

### Variables de Entorno No Funcionan
- Verificar que variables públicas empiecen con `NEXT_PUBLIC_`
- Reconstruir después de cambiar variables
- Verificar que `.env` esté en la raíz del proyecto

### API Routes Retornan 404
- Verificar que estén en `src/app/api/`
- Reconstruir y redesplegar
- Verificar logs en Firebase Console

### Livestream No Funciona
- Verificar tokens de Agora
- Verificar que App Certificate sea correcto
- Verificar que UIDs sean únicos
- Revisar logs del navegador

### Audio No Se Escucha
- Verificar permisos de micrófono en navegador
- Verificar que autoplay esté permitido
- Hacer clic en botón "Habilitar audio" si aparece
- Verificar que el track de audio esté publicado

### Pantalla Compartida No Se Ve
- Verificar permisos de pantalla en navegador
- Verificar que el token de screen share sea correcto
- Verificar que el UID de screen share sea baseUid + 1000
- Revisar logs del navegador

## Rollback

Si algo sale mal:

```bash
# Ver versiones anteriores
firebase hosting:releases:list

# Restaurar versión anterior
firebase hosting:rollback
```

## Dominio Personalizado

1. Firebase Console > Hosting > Add custom domain
2. Agregar dominio (ejemplo: cursos.tudominio.com)
3. Configurar DNS según instrucciones de Firebase
4. Esperar propagación DNS (puede tomar hasta 24 horas)
5. Firebase proveerá certificado SSL automáticamente

## Mantenimiento

### Actualizaciones Regulares
- [ ] Actualizar dependencias: `npm update`
- [ ] Revisar vulnerabilidades: `npm audit`
- [ ] Actualizar Firebase CLI: `npm install -g firebase-tools@latest`

### Backups
- [ ] Exportar Firestore regularmente
- [ ] Hacer backup de Storage
- [ ] Guardar configuraciones importantes

### Monitoreo Continuo
- [ ] Revisar logs semanalmente
- [ ] Monitorear uso de recursos
- [ ] Verificar costos en Firebase Console
- [ ] Revisar métricas de usuarios

## Recursos Útiles

- [Documentación Firebase Hosting](https://firebase.google.com/docs/hosting)
- [Next.js en Firebase](https://firebase.google.com/docs/hosting/frameworks/nextjs)
- [Agora Documentation](https://docs.agora.io/)
- [DaisyUI Components](https://daisyui.com/components/)

## Soporte

Si encuentras problemas:
1. Revisar logs en Firebase Console
2. Revisar documentación en `DEPLOYMENT.md`
3. Buscar en Stack Overflow
4. Contactar soporte de Firebase
