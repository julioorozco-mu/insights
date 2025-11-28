# Configuración de Mailgun para Envío de Correos

## ✅ Implementación Completada y Actualizada

Se ha implementado y actualizado exitosamente el sistema de envío de correos con Mailgun para enviar correos de bienvenida automáticamente cuando un usuario se registra en la plataforma.

### 🎨 Actualizaciones de Diseño (Última versión)
- ✅ Color rojo oficial: **#FD002A**
- ✅ Logos centrados en contenedor blanco
- ✅ Links en color blanco (forzado con !important)
- ✅ Botón rojo con texto blanco
- ✅ Texto justificado en el mensaje principal
- ✅ Nuevo texto específico del curso **"Narrativas de Poder"**
- ✅ HTML organizado en archivo separado (`public/mails/welcome.html`)

## 📋 Archivos Creados/Modificados

### Archivos Creados:

1. **`/src/app/api/send-email/route.ts`**
   - Endpoint API para enviar correos usando Mailgun
   - Configurado para usar el dominio: `epolitica.com.mx`
   - Correo de envío: `InstitutoReyesHeroles@epolitica.com.mx`

2. **`/src/app/api/preview-email/route.ts`** ⭐ NUEVO
   - Endpoint para previsualizar el correo en el navegador
   - Permite ver el diseño sin enviar correo
   - Acepta parámetros: `name` y `email`

3. **`/src/app/api/test-email/route.ts`** ⭐ NUEVO
   - Endpoint para enviar correos de prueba
   - Usado por la página de configuración de admin
   - Envía correo con datos del usuario actual

4. **`/public/mails/welcome.html`** ⭐ NUEVO
   - Template HTML del correo de bienvenida
   - Organizado en archivo separado para mejor mantenibilidad
   - Usa variables `${name}` y `${email}` para personalización
   - Diseño actualizado con color #FD002A

5. **`/src/lib/email/templates.ts`** (ACTUALIZADO)
   - Lee el HTML desde `public/mails/welcome.html`
   - Reemplaza variables dinámicamente
   - Manejo de errores con fallback

6. **`/src/lib/email/sendWelcomeEmail.ts`**
   - Función auxiliar para enviar correos de bienvenida
   - Manejo de errores sin interrumpir el flujo de registro

7. **`.env.example`**
   - Archivo de ejemplo con la configuración necesaria
   - Incluye placeholder para API key de Mailgun

### Archivos Modificados:

1. **`/src/hooks/useAuth.ts`**
   - Integración del envío de correo en la función `signUp`
   - El correo se envía automáticamente después de crear el usuario
   - El proceso es no-bloqueante (no interrumpe el registro si falla)

2. **`/src/app/dashboard/settings/page.tsx`** ⭐ ACTUALIZADO
   - Nueva sección "Prueba de Correo de Bienvenida" (solo visible para admins)
   - Permite previsualizar el diseño del correo en el navegador
   - Permite enviar correos de prueba a cualquier dirección
   - Bordes destacados en color primario para fácil identificación

## 🔧 Configuración Requerida

### Paso 1: Actualizar Variables de Entorno

Debes agregar la siguiente variable a tu archivo `.env.local`:

```env
MAILGUN_API_KEY=bfd2b2002bce47c4b2ab1eef7efe0410-653fadca-3abadb51
```

Si no tienes un archivo `.env.local`, créalo en la raíz del proyecto y agrega esta variable junto con las demás configuraciones de Firebase y otros servicios.

### Paso 2: Verificar Imágenes de Logos

Asegúrate de que los logos estén disponibles en las siguientes rutas:

- `/public/images/logos/logo_pri_edomex.png` - Logo del PRI Estado de México
- `/public/images/logos/logo-ire-edomex-red.png` - Logo del Instituto Reyes Heroles

También deben estar accesibles en:
- `https://www.epolitica.com.mx/images/logos/logo_pri_edomex.png`
- `https://www.epolitica.com.mx/images/logos/logo-ire-edomex-red.png`

## 📧 Funcionalidad Implementada

### Flujo de Registro:

1. Usuario completa el formulario de registro en `/auth/sign-up`
2. Se crea la cuenta en Firebase Authentication
3. Se crea el documento del usuario en Firestore
4. **Se envía automáticamente un correo de bienvenida** con:
   - Logos del PRI e Instituto Reyes Heroles centrados en contenedor blanco
   - Mensaje de bienvenida personalizado específico del curso "Narrativas de Poder"
   - Información de la sesión inaugural (Lunes 03 de noviembre, 12:00 hrs)
   - Lista de beneficios de la plataforma
   - Botón rojo (#FD002A) con texto blanco y link directo al login
   - Diseño profesional y responsive con texto justificado

### 🎯 Panel de Administración (NUEVO):

**Ubicación:** `/dashboard/settings` (solo visible para usuarios con rol "admin")

Los administradores ahora pueden:

1. **Previsualizar el Correo en el Navegador**
   - Botón "Previsualizar en Navegador"
   - Abre una nueva pestaña con el HTML renderizado
   - Usa los datos del usuario actual (nombre y email)
   - URL: `/api/preview-email?name=...&email=...`

2. **Enviar Correos de Prueba**
   - Campo para ingresar el correo de destino
   - Botón "Enviar Correo de Prueba"
   - Envía el correo con el diseño real vía Mailgun
   - Usa el nombre del usuario logueado
   - Confirmación visual de éxito o error

3. **Ventajas del Panel Admin**
   - ✅ Probar cambios de diseño sin registrar usuarios nuevos
   - ✅ Ver exactamente cómo se ve el correo en clientes de correo reales
   - ✅ Verificar que los logos y estilos se muestran correctamente
   - ✅ Enviar a cualquier correo para pruebas
   - ✅ Feedback inmediato con alertas de éxito/error

### Características del Correo:

- **Remitente**: `Instituto Reyes Heroles <InstitutoReyesHeroles@epolitica.com.mx>`
- **Asunto**: `¡Bienvenido [Nombre]! - Instituto Reyes Heroles`
- **Contenido**: HTML responsive con diseño profesional
- **Logos**: PRI e Instituto Reyes Heroles en el header
- **CTA**: Botón para ingresar a la plataforma

## 🔍 Detalles Técnicos

### Configuración de Mailgun:

- **Dominio**: `epolitica.com.mx`
- **API Key**: Proporcionada en las variables de entorno
- **Método de autenticación**: Basic Auth con Buffer encoding
- **Endpoint**: `https://api.mailgun.net/v3/epolitica.com.mx/messages`

### Manejo de Errores:

- Si el correo falla, el registro del usuario se completa exitosamente
- Los errores se registran en la consola para debugging
- No se interrumpe la experiencia del usuario

## 🚀 Testing

Para probar el envío de correos:

1. Asegúrate de que la variable `MAILGUN_API_KEY` esté configurada
2. Registra un nuevo usuario en la plataforma
3. Verifica que recibas el correo de bienvenida en la bandeja de entrada
4. Revisa que los logos se muestren correctamente
5. Verifica que el link de login funcione

## 📝 Notas Importantes

- El correo se envía de forma asíncrona para no retrasar el proceso de registro
- Los errores de envío no afectan el registro del usuario
- La plantilla está optimizada para clientes de correo modernos
- El diseño es responsive y se ve bien en móviles y desktop

## 🎨 Personalización y Edición del Template

### Editar el Diseño del Correo

El template HTML está organizado en un archivo separado para mejor mantenibilidad:

**Ubicación:** `/public/mails/welcome.html`

Para hacer cambios:

1. **Edita el archivo HTML directamente**
   - Abre `/public/mails/welcome.html`
   - Modifica el contenido, estilos CSS, colores, etc.
   - Usa variables `${name}` y `${email}` para personalización dinámica

2. **Prueba tus cambios inmediatamente**
   - Ve a `/dashboard/settings` (como admin)
   - Haz clic en "Previsualizar en Navegador" para ver el diseño
   - O envía un correo de prueba a tu email

3. **Elementos que puedes modificar:**
   - ✏️ Texto del mensaje principal
   - 🎨 Colores y estilos CSS
   - 📐 Estructura y layout
   - 📋 Features y beneficios listados
   - 🖼️ URLs de logos
   - 🔗 Links y botones
   - 📧 Texto del footer

### Variables Disponibles

En el template HTML puedes usar:
- `${name}` - Nombre del usuario
- `${email}` - Email del usuario

Ejemplo:
```html
<p>¡Hola ${name}!</p>
<p>Tu correo es: ${email}</p>
```

### Ventajas de esta Arquitectura

✅ **Separación de responsabilidades**: HTML separado del código TypeScript
✅ **Fácil de editar**: No necesitas tocar código de programación
✅ **Testing rápido**: Panel de admin para probar cambios al instante
✅ **Mantenible**: Un solo archivo para el template
✅ **Reutilizable**: Puedes crear más templates siguiendo el mismo patrón

## ✅ Checklist de Verificación

### Implementación Básica
- [x] Endpoint API creado (`/api/send-email`)
- [x] Plantilla HTML con logos PRI e IRH
- [x] Integración en flujo de registro
- [x] Variables de entorno configuradas
- [x] Manejo de errores implementado
- [x] Link de login incluido

### Nuevas Funcionalidades
- [x] Template HTML en archivo separado (`/public/mails/welcome.html`)
- [x] Endpoint de previsualización (`/api/preview-email`)
- [x] Endpoint de correos de prueba (`/api/test-email`)
- [x] Panel de admin en configuración
- [x] Botón "Previsualizar en Navegador"
- [x] Botón "Enviar Correo de Prueba"
- [x] Actualización de colores a #FD002A
- [x] Logos centrados en contenedor blanco
- [x] Texto justificado
- [x] Links en blanco (con !important)
- [x] Nuevo texto del curso "Narrativas de Poder"

### Acciones Pendientes
- [ ] **Agregar MAILGUN_API_KEY a .env.local** (Acción requerida)
- [ ] Verificar que los logos estén accesibles públicamente
- [ ] Probar el envío de correos con un registro real
- [ ] Probar la previsualización en el navegador
- [ ] Enviar un correo de prueba desde el panel de admin

---

**Implementación completada** ✨
