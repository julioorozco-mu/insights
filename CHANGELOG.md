# 📝 Registro de Cambios - epolítica

## 🎨 Branding y Diseño (2025-10-09)

### Cambios de Marca
- ✅ Nombre actualizado a **epolítica**
- ✅ Tema personalizado con colores rojo (#EF233C) y blanco
- ✅ Logo implementado en todas las páginas
- ✅ Tono profesional y sobrio para capacitación política

### Página de Inicio
- ✅ Carrusel de ancho completo con cursos políticos
- ✅ Overlay oscuro (50%) para mejorar legibilidad del texto
- ✅ Texto blanco con sombras en el slider
- ✅ Controles del carrusel con fondo blanco semitransparente
- ✅ Indicadores en la parte inferior del slider
- ✅ Formulario de login integrado
- ✅ Eliminada sección "¿Por qué elegirnos?"
- ✅ Botones con texto blanco

### Formulario de Registro Mejorado
- ✅ **Nombre y Apellidos** (separados)
- ✅ **Fecha de Nacimiento** con selector
- ✅ **Edad** calculada automáticamente
- ✅ **Correo Electrónico**
- ✅ **Teléfono** (mínimo 10 dígitos)
- ✅ **Nombre de Usuario**
- ✅ **Género** (Masculino, Femenino, Otro)
- ✅ **Estado** (todos los estados de México)
- ✅ **Contraseña** con validación de fortaleza en tiempo real
- ✅ **Confirmar Contraseña** con feedback visual
- ✅ Layout de 2 columnas en desktop

### Validaciones en Tiempo Real
- ✅ **Fortaleza de contraseña**: Débil, Media, Fuerte
- ✅ **Barra de progreso** visual
- ✅ **Coincidencia de contraseñas** con ✓ o ✗
- ✅ Contraseña mínimo 8 caracteres

### Componentes Actualizados
- ✅ **Sidebar**: Logo, fondo blanco, borde rojo
- ✅ **Topbar**: Borde rojo superior, búsqueda mejorada
- ✅ **Dashboard**: Estadísticas por rol
- ✅ **Login**: Logo centrado
- ✅ **Sign-up**: Formulario completo

## 📊 Modelos Actualizados (según MODELS.md)

### Tipos TypeScript
- ✅ **User, Student, Speaker** - Roles actualizados
- ✅ **Course** - Con speakerIds, difficulty, tags
- ✅ **Lesson** - Con videoPlaybackId, attachmentsIds
- ✅ **FormTemplate** - Formularios dinámicos (NUEVO)
- ✅ **Survey** - Encuestas con tipos
- ✅ **CourseChatMessage** - Chat en vivo
- ✅ **SurveyLiveChat** - Encuestas en vivo
- ✅ **CertificateTemplate** - Templates de certificados
- ✅ **FileAttachment** - Archivos adjuntos (NUEVO)
- ✅ **VideoRecording** - Grabaciones de Mux

### Roles
- ✅ `instructor` → `speaker` (ponente)
- ✅ Permisos actualizados según MODELS.md

### Colecciones Firestore
- ✅ users, students, speakers
- ✅ courses, lessons
- ✅ formTemplates, studentAnswers
- ✅ surveys, surveyResponses
- ✅ courseLiveChats, surveyLiveChats
- ✅ certificateTemplates, certificates
- ✅ fileAttachments, videoRecordings

## 🌱 Datos de Prueba

### Cursos Políticos
1. Comunicación Estratégica en Redes Sociales
2. Liderazgo Político y Gestión Pública
3. Análisis Político y Toma de Decisiones

### Lecciones
1. Fundamentos de la Comunicación Digital
2. Estrategias de Contenido en Redes
3. Manejo de Crisis y Respuesta Rápida

### Usuarios de Prueba
- **Admin**: admin@test.com / admin123
- **Speaker**: speaker@test.com / speaker123
- **Student**: student@test.com / student123

## 🔧 Configuración

### Variables de Entorno
- ✅ Archivo `.env` requerido (no `.env.local`)
- ✅ Documentación en FIREBASE_SETUP.md

### Scripts
```bash
npm run dev      # Desarrollo
npm run build    # Producción
npm run seed     # Poblar base de datos
```

## 📚 Documentación Creada
- ✅ README.md - Documentación principal
- ✅ SETUP.md - Guía de configuración
- ✅ FIREBASE_SETUP.md - Configuración de Firebase paso a paso
- ✅ MODELS_SUMMARY.md - Resumen de modelos
- ✅ GETTING_STARTED.md - Guía de inicio rápido
- ✅ FEATURES.md - Lista de características
- ✅ ARCHITECTURE.md - Arquitectura del proyecto

## 🐛 Problemas Conocidos y Soluciones

### Error 404 en /dashboard
**Causa**: El layout del dashboard necesita que el usuario esté autenticado  
**Solución**: Asegúrate de que Firebase esté configurado y el usuario esté logueado

### Error: auth/configuration-not-found
**Causa**: Firebase Authentication no está habilitado  
**Solución**: Habilita Email/Password en Firebase Console

### Dependencias faltantes
**Solución**: Ejecuta `npm install`

## 🚀 Próximos Pasos

1. Configurar Firebase (ver FIREBASE_SETUP.md)
2. Ejecutar seed: `npm run seed`
3. Iniciar servidor: `npm run dev`
4. Acceder a http://localhost:3000
5. Iniciar sesión con credenciales de prueba
