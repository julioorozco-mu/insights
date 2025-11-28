# 🎥 Configuración de Agora.io - Guía Paso a Paso

## ¿Qué es Agora.io?

Agora.io es una plataforma de comunicación en tiempo real que permite transmisiones en vivo directamente desde el navegador, sin necesidad de OBS o software externo. Perfecto para:

- ✅ Transmisiones en vivo con 300-500 espectadores
- ✅ Activar cámara y micrófono directamente desde el navegador
- ✅ Chat, encuestas y control desde tu propia UI
- ✅ Todo sin salir de tu plataforma

---

## 📋 Paso 1: Crear Cuenta en Agora

1. Ve a [Agora Console](https://console.agora.io/)
2. Haz clic en **"Sign Up"** o **"Registrarse"**
3. Completa el formulario de registro
4. Verifica tu email
5. Inicia sesión en la consola

---

## 📋 Paso 2: Crear un Proyecto

1. En el dashboard, haz clic en **"Project Management"**
2. Haz clic en **"Create"** o **"Crear Proyecto"**
3. Ingresa un nombre para tu proyecto (ej: `easy-courses-platform`)
4. Selecciona **"Secured mode: APP ID + Token"** (recomendado para producción)
5. Haz clic en **"Submit"** o **"Crear"**

---

## 📋 Paso 3: Obtener Credenciales

### 3.1 Obtener APP ID

1. En la lista de proyectos, verás tu proyecto recién creado
2. Copia el **APP ID** (una cadena alfanumérica)
3. Guárdalo para usarlo en las variables de entorno

### 3.2 Obtener APP Certificate

1. En tu proyecto, haz clic en el ícono de **"Edit"** o **"Editar"**
2. Ve a la sección **"Primary Certificate"**
3. Haz clic en **"Enable"** para generar el certificado
4. Copia el **Primary Certificate** (App Certificate)
5. Guárdalo de forma segura - lo necesitarás para generar tokens

⚠️ **IMPORTANTE**: El App Certificate es secreto y debe mantenerse en el servidor (nunca en el cliente).

---

## 📋 Paso 4: Configurar Variables de Entorno

Agrega las siguientes variables a tu archivo `.env.local`:

```bash
# Agora (Live Streaming)
AGORA_APP_ID=tu_app_id_aqui
AGORA_APP_CERTIFICATE=tu_app_certificate_aqui
NEXT_PUBLIC_AGORA_APP_ID=tu_app_id_aqui
```

**Explicación:**
- `AGORA_APP_ID`: Se usa en el servidor para generar tokens
- `AGORA_APP_CERTIFICATE`: Se usa en el servidor para firmar tokens (¡NUNCA expongas esto!)
- `NEXT_PUBLIC_AGORA_APP_ID`: Se usa en el cliente para conectarse a Agora

---

## 📋 Paso 5: Verificar la Configuración

Puedes verificar que todo está configurado correctamente:

1. Reinicia tu servidor de desarrollo:
   ```bash
   npm run dev
   ```

2. Verifica que no hay errores en la consola relacionados con Agora

---

## 🎯 Cómo Funciona

### Modo "Live Streaming" (Broadcast Mode)

Agora tiene dos modos principales:
- **Communication**: Para videollamadas bidireccionales (todos hablan y ven)
- **Live**: Para transmisiones tipo evento (1 host, muchos espectadores) ✅ **Este es el que usamos**

### Roles en el Stream

1. **Host (Ponente)**:
   - Publica video y audio
   - Controla la transmisión
   - Puede ver estadísticas

2. **Audience (Estudiantes)**:
   - Solo reciben el stream
   - No publican video/audio
   - Pueden participar en chat y encuestas

### Flujo Técnico

1. **Backend genera un token RTC** con tu APP_ID y APP_CERTIFICATE
2. **Ponente y alumnos entran al mismo canal** (ej: `curso-123`)
3. **Ponente publica su stream** con `client.publish(...)`
4. **Alumnos se suscriben automáticamente** y ven el stream

---

## 🔐 Seguridad

### Tokens RTC

Los tokens RTC son temporales y se generan en el servidor. Cada token:
- Es válido por 1 hora (configurable)
- Está asociado a un canal específico
- Tiene un rol específico (host o audience)
- Se genera usando tu APP_CERTIFICATE (que nunca se expone al cliente)

### Endpoint de Generación de Tokens

El endpoint `/api/agora-token` genera tokens seguros:

```typescript
GET /api/agora-token?channel=curso-123&uid=12345&role=host
```

Respuesta:
```json
{
  "token": "006abc123...",
  "appId": "your-app-id",
  "channel": "curso-123",
  "uid": 12345,
  "role": "host",
  "expiresAt": 1234567890
}
```

---

## 📊 Límites del Plan Gratuito

Agora ofrece un plan gratuito generoso:
- **10,000 minutos gratis al mes**
- Hasta **1,000 usuarios concurrentes**
- Todas las funciones de RTC (Real-Time Communication)

Para más información sobre precios: [Agora Pricing](https://www.agora.io/en/pricing/)

---

## 🛠️ Componentes Implementados

### 1. AgoraService (`src/lib/services/agoraService.ts`)
Maneja la lógica del servidor para crear canales y gestionar streams.

### 2. AgoraStream Component (`src/components/live/AgoraStream.tsx`)
Componente React que maneja la conexión y visualización del stream.

### 3. Token API (`src/app/api/agora-token/route.ts`)
Endpoint para generar tokens RTC seguros.

---

## 🚀 Uso en la Aplicación

### Para el Ponente (Host)

```tsx
import AgoraStream from "@/components/live/AgoraStream";

// Obtener token del servidor
const response = await fetch(
  `/api/agora-token?channel=curso-123&uid=${userId}&role=host`
);
const { token, appId } = await response.json();

// Renderizar componente
<AgoraStream
  channel="curso-123"
  role="host"
  token={token}
  uid={userId}
  appId={appId}
/>
```

### Para los Estudiantes (Audience)

```tsx
import AgoraStream from "@/components/live/AgoraStream";

// Obtener token del servidor
const response = await fetch(
  `/api/agora-token?channel=curso-123&uid=${userId}&role=audience`
);
const { token, appId } = await response.json();

// Renderizar componente
<AgoraStream
  channel="curso-123"
  role="audience"
  token={token}
  uid={userId}
  appId={appId}
/>
```

---

## 🔧 Troubleshooting

### Error: "Agora credentials not configured"
- Verifica que las variables de entorno estén configuradas correctamente
- Reinicia el servidor de desarrollo

### Error: "Invalid token"
- Verifica que el APP_CERTIFICATE sea correcto
- Asegúrate de que el token no haya expirado

### No se ve el video
- Verifica que el navegador tenga permisos de cámara/micrófono
- Revisa la consola del navegador para errores
- Asegúrate de que el rol sea correcto (host para publicar, audience para ver)

### Problemas de latencia
- Agora optimiza automáticamente la latencia
- Para latencia ultra-baja, considera usar el modo "low latency"

---

## 📚 Recursos Adicionales

- [Agora Documentation](https://docs.agora.io/)
- [Agora Web SDK Reference](https://docs.agora.io/en/video-calling/reference/web-sdk)
- [Agora Console](https://console.agora.io/)
- [Agora Community](https://www.agora.io/en/community/)

---

## ✅ Checklist de Configuración

- [ ] Cuenta de Agora creada
- [ ] Proyecto creado en Agora Console
- [ ] APP ID obtenido
- [ ] APP Certificate generado y guardado
- [ ] Variables de entorno configuradas en `.env.local`
- [ ] Servidor de desarrollo reiniciado
- [ ] Verificación de que no hay errores en consola

¡Listo! Tu plataforma ahora puede hacer transmisiones en vivo sin salir del navegador. 🎉
