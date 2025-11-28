# 🎥 Guía de Transmisiones en Vivo con Agora

## Descripción General

Esta plataforma utiliza **Agora.io** para transmisiones en vivo directamente desde el navegador. Los ponentes pueden transmitir sin OBS ni software externo, y los estudiantes pueden ver el stream con latencia ultra-baja (1-3 segundos).

---

## 🎯 Características

- ✅ **Streaming directo desde navegador** - Sin OBS, sin RTMP
- ✅ **Latencia ultra-baja** - 1-3 segundos
- ✅ **Hasta 500 espectadores simultáneos**
- ✅ **Roles diferenciados** - Host (ponente) y Audience (estudiantes)
- ✅ **Tokens seguros** - Generados en el servidor
- ✅ **Chat y encuestas en tiempo real**
- ✅ **Interfaz integrada** - Todo en la plataforma

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐              ┌──────────────┐            │
│  │   Ponente    │              │  Estudiante  │            │
│  │   (Host)     │              │  (Audience)  │            │
│  └──────┬───────┘              └──────┬───────┘            │
│         │                              │                     │
│         │  1. Solicita token          │                     │
│         ├─────────────────────────────┤                     │
│         │                              │                     │
│         │  2. Recibe token            │                     │
│         ├─────────────────────────────┤                     │
│         │                              │                     │
│  ┌──────▼──────────────────────────────▼───────┐           │
│  │        AgoraStream Component                │           │
│  │  - Maneja conexión a Agora                  │           │
│  │  - Publica stream (host)                    │           │
│  │  - Se suscribe a stream (audience)          │           │
│  └──────┬──────────────────────────────────────┘           │
│         │                                                    │
└─────────┼────────────────────────────────────────────────────┘
          │
          │ 3. Conecta con token
          │
┌─────────▼────────────────────────────────────────────────────┐
│                    AGORA CLOUD                                │
│  - Maneja distribución de video/audio                        │
│  - Optimiza latencia automáticamente                         │
│  - Escala a cientos de viewers                               │
└───────────────────────────────────────────────────────────────┘
          │
          │ 4. Solicita token
          │
┌─────────▼────────────────────────────────────────────────────┐
│                        BACKEND                                │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────┐             │
│  │  /api/agora-token                          │             │
│  │  - Genera tokens RTC seguros               │             │
│  │  - Valida permisos de usuario              │             │
│  │  - Expira en 1 hora                        │             │
│  └────────────────────────────────────────────┘             │
│                                                               │
│  ┌────────────────────────────────────────────┐             │
│  │  AgoraService                              │             │
│  │  - Crea canales                            │             │
│  │  - Gestiona streams                        │             │
│  └────────────────────────────────────────────┘             │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## 🔐 Seguridad

### Tokens RTC

Los tokens son generados en el servidor y tienen:
- **Expiración**: 1 hora (configurable)
- **Canal específico**: Solo válido para un canal
- **Rol específico**: Host o Audience
- **Firmado**: Con APP_CERTIFICATE (nunca expuesto al cliente)

### Variables de Entorno

```bash
# Servidor (privadas)
AGORA_APP_ID=xxx
AGORA_APP_CERTIFICATE=xxx  # ¡NUNCA exponer al cliente!

# Cliente (públicas)
NEXT_PUBLIC_AGORA_APP_ID=xxx
```

---

## 📝 Uso Paso a Paso

### 1. Crear una Transmisión

```typescript
// En tu componente o página
import { liveService } from '@/lib/services/liveService';

const createStream = async () => {
  const stream = await liveService.createLiveStream({
    title: 'Mi Clase en Vivo',
    description: 'Introducción a React',
    instructorId: currentUser.id,
    startAt: new Date(),
  });
  
  console.log('Stream creado:', stream);
  // {
  //   id: 'abc123',
  //   agoraChannel: 'stream-abc123',
  //   agoraAppId: 'your-app-id',
  //   active: false,
  //   ...
  // }
};
```

### 2. Iniciar Transmisión (Ponente)

```typescript
'use client';

import { useState, useEffect } from 'react';
import AgoraStream from '@/components/live/AgoraStream';

export default function HostStreamPage({ streamId }) {
  const [token, setToken] = useState(null);
  const [stream, setStream] = useState(null);
  
  useEffect(() => {
    // Cargar información del stream
    const loadStream = async () => {
      const res = await fetch(`/api/live/${streamId}`);
      const data = await res.json();
      setStream(data);
      
      // Obtener token para host
      const tokenRes = await fetch(
        `/api/agora-token?channel=${data.agoraChannel}&uid=${userId}&role=host`
      );
      const tokenData = await tokenRes.json();
      setToken(tokenData.token);
    };
    
    loadStream();
  }, [streamId]);
  
  if (!token || !stream) return <div>Cargando...</div>;
  
  return (
    <div className="container">
      <h1>{stream.title}</h1>
      
      <AgoraStream
        channel={stream.agoraChannel}
        role="host"
        token={token}
        uid={userId}
        appId={stream.agoraAppId}
        onError={(error) => console.error('Stream error:', error)}
      />
      
      {/* Controles adicionales */}
      <div className="controls">
        <button onClick={endStream}>Finalizar Transmisión</button>
      </div>
    </div>
  );
}
```

### 3. Ver Transmisión (Estudiante)

```typescript
'use client';

import { useState, useEffect } from 'react';
import AgoraStream from '@/components/live/AgoraStream';

export default function ViewStreamPage({ streamId }) {
  const [token, setToken] = useState(null);
  const [stream, setStream] = useState(null);
  
  useEffect(() => {
    const loadStream = async () => {
      const res = await fetch(`/api/live/${streamId}`);
      const data = await res.json();
      setStream(data);
      
      // Obtener token para audience
      const tokenRes = await fetch(
        `/api/agora-token?channel=${data.agoraChannel}&uid=${userId}&role=audience`
      );
      const tokenData = await tokenRes.json();
      setToken(tokenData.token);
    };
    
    loadStream();
  }, [streamId]);
  
  if (!token || !stream) return <div>Cargando...</div>;
  
  return (
    <div className="container">
      <h1>{stream.title}</h1>
      
      <AgoraStream
        channel={stream.agoraChannel}
        role="audience"
        token={token}
        uid={userId}
        appId={stream.agoraAppId}
      />
      
      {/* Chat y encuestas */}
      <div className="sidebar">
        <LiveChat streamId={streamId} />
        <LivePolls streamId={streamId} />
      </div>
    </div>
  );
}
```

---

## 🎨 Personalización del Componente

### Props del AgoraStream

```typescript
interface AgoraStreamProps {
  channel: string;           // Nombre del canal
  role: 'host' | 'audience'; // Rol del usuario
  token: string;             // Token RTC
  uid: string | number;      // ID único del usuario
  appId: string;             // Agora App ID
  onError?: (error: Error) => void;
  onUserJoined?: (user: IAgoraRTCRemoteUser) => void;
  onUserLeft?: (user: IAgoraRTCRemoteUser) => void;
}
```

### Eventos Disponibles

```typescript
<AgoraStream
  // ... props básicas
  onError={(error) => {
    console.error('Error en stream:', error);
    // Mostrar notificación al usuario
  }}
  onUserJoined={(user) => {
    console.log('Usuario se unió:', user.uid);
    // Actualizar contador de viewers
  }}
  onUserLeft={(user) => {
    console.log('Usuario salió:', user.uid);
    // Actualizar contador de viewers
  }}
/>
```

---

## 🔧 API Endpoints

### POST /api/live/create

Crea una nueva transmisión.

**Request:**
```json
{
  "title": "Mi Clase",
  "description": "Descripción",
  "instructorId": "user123",
  "startAt": "2025-01-15T10:00:00Z"
}
```

**Response:**
```json
{
  "id": "stream123",
  "agoraChannel": "stream-123",
  "agoraAppId": "app-id",
  "active": false,
  ...
}
```

### GET /api/agora-token

Genera un token RTC.

**Query Params:**
- `channel`: Nombre del canal
- `uid`: ID del usuario
- `role`: `host` o `audience`

**Response:**
```json
{
  "token": "006abc123...",
  "appId": "your-app-id",
  "channel": "stream-123",
  "uid": 12345,
  "role": "host",
  "expiresAt": 1234567890
}
```

### GET /api/live/[id]/status

Obtiene el estado de una transmisión.

**Response:**
```json
{
  "status": "active",
  "isActive": true
}
```

---

## 📊 Monitoreo y Analytics

### Contador de Viewers

```typescript
import { useState } from 'react';

const [viewerCount, setViewerCount] = useState(0);

<AgoraStream
  // ... props
  onUserJoined={(user) => {
    setViewerCount(prev => prev + 1);
  }}
  onUserLeft={(user) => {
    setViewerCount(prev => prev - 1);
  }}
/>

<div>👥 {viewerCount} espectadores</div>
```

### Duración del Stream

```typescript
const [duration, setDuration] = useState(0);

useEffect(() => {
  if (!stream.active) return;
  
  const interval = setInterval(() => {
    setDuration(prev => prev + 1);
  }, 1000);
  
  return () => clearInterval(interval);
}, [stream.active]);

<div>⏱️ {formatDuration(duration)}</div>
```

---

## 🐛 Troubleshooting

### El video no se muestra

1. **Verifica permisos del navegador**
   - Chrome: Settings → Privacy and Security → Site Settings → Camera/Microphone
   - Debe estar en HTTPS o localhost

2. **Revisa la consola**
   ```javascript
   // Busca errores de Agora
   AgoraRTCError: ...
   ```

3. **Verifica el token**
   - ¿Expiró? (válido por 1 hora)
   - ¿Es para el canal correcto?
   - ¿Tiene el rol correcto?

### Latencia alta

- Agora optimiza automáticamente
- Verifica la conexión a internet
- Considera usar servidores más cercanos

### "Invalid token"

- Verifica que `AGORA_APP_CERTIFICATE` sea correcto
- Regenera el token
- Verifica que no haya expirado

---

## 📈 Límites y Escalabilidad

### Plan Gratuito de Agora

- **10,000 minutos gratis/mes**
- Hasta **1,000 usuarios concurrentes**
- Todas las funciones de RTC

### Recomendaciones

- **300-500 viewers**: Óptimo para clases
- **Más de 500**: Considera plan de pago
- **Grabaciones**: Implementar con Agora Cloud Recording

---

## 🚀 Mejoras Futuras

### Grabación de Clases

```typescript
// Implementar con Agora Cloud Recording API
const startRecording = async (channel: string) => {
  // Llamar a Agora Cloud Recording
  // Guardar en Firebase Storage
};
```

### Compartir Pantalla

```typescript
// Agora soporta screen sharing
const screenTrack = await AgoraRTC.createScreenVideoTrack();
await client.publish(screenTrack);
```

### Moderación de Chat

```typescript
// Integrar con Firebase Realtime Database
// Permitir a moderadores eliminar mensajes
```

---

## 📚 Recursos

- [Agora Documentation](https://docs.agora.io/)
- [Web SDK Reference](https://docs.agora.io/en/video-calling/reference/web-sdk)
- [Agora Console](https://console.agora.io/)
- [Setup Guide](./AGORA_SETUP.md)
- [Migration Guide](./MIGRATION_MUX_TO_AGORA.md)

---

## ✅ Checklist de Implementación

- [ ] Agora configurado (ver [AGORA_SETUP.md](./AGORA_SETUP.md))
- [ ] Variables de entorno configuradas
- [ ] Componente `AgoraStream` integrado
- [ ] Endpoint `/api/agora-token` funcionando
- [ ] Permisos de cámara/micrófono solicitados
- [ ] UI de controles implementada
- [ ] Chat en vivo integrado
- [ ] Sistema de encuestas integrado
- [ ] Contador de viewers implementado
- [ ] Manejo de errores configurado

---

¡Listo para transmitir en vivo! 🎉
