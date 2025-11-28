# 🔄 Migración de Mux a Agora.io

## Resumen de Cambios

Esta aplicación ha sido migrada de **Mux** a **Agora.io** para las transmisiones en vivo. Agora permite streaming directo desde el navegador sin necesidad de OBS o RTMP.

---

## 📊 Comparación: Mux vs Agora

| Característica | Mux | Agora |
|----------------|-----|-------|
| **Streaming** | Requiere OBS + RTMP | Directo desde navegador |
| **Setup Ponente** | Complejo (OBS, stream key) | Simple (clic en botón) |
| **Latencia** | 10-30 segundos | 1-3 segundos |
| **Capacidad** | Miles de viewers | 300-500 viewers (suficiente) |
| **Interactividad** | Limitada | Alta (chat, encuestas en tiempo real) |
| **Costo** | $$ por minuto | Plan gratuito generoso |

---

## 🗂️ Archivos Eliminados

Los siguientes archivos de Mux fueron eliminados:

```
src/lib/mux.ts
src/lib/services/muxService.ts
src/components/live/MuxPlayer.tsx
src/app/api/test-mux/
```

---

## 📝 Archivos Nuevos

### Servicios y Componentes

1. **`src/lib/services/agoraService.ts`**
   - Reemplaza `muxService.ts`
   - Maneja la creación de canales Agora
   - Gestión de streams

2. **`src/components/live/AgoraStream.tsx`**
   - Reemplaza `MuxPlayer.tsx`
   - Componente React para streaming
   - Maneja roles (host/audience)

3. **`src/app/api/agora-token/route.ts`**
   - Nuevo endpoint para generar tokens RTC
   - Seguridad: tokens temporales firmados

### Documentación

4. **`AGORA_SETUP.md`**
   - Guía completa de configuración de Agora
   - Paso a paso para obtener credenciales

5. **`MIGRATION_MUX_TO_AGORA.md`** (este archivo)
   - Guía de migración

---

## 🔄 Cambios en el Modelo de Datos

### Antes (Mux)

```typescript
interface LiveStream {
  id: string;
  title: string;
  muxStreamKey: string;      // ❌ Eliminado
  muxPlaybackId: string;     // ❌ Eliminado
  muxStreamId: string;       // ❌ Eliminado
  active: boolean;
  // ...
}
```

### Después (Agora)

```typescript
interface LiveStream {
  id: string;
  title: string;
  agoraChannel: string;      // ✅ Nuevo
  agoraAppId: string;        // ✅ Nuevo
  active: boolean;
  // ...
}
```

---

## 🔧 Cambios en Variables de Entorno

### Antes (Mux)

```bash
MUX_TOKEN_ID=xxx
MUX_TOKEN_SECRET=xxx
MUX_WEBHOOK_SECRET=xxx
```

### Después (Agora)

```bash
AGORA_APP_ID=xxx
AGORA_APP_CERTIFICATE=xxx
NEXT_PUBLIC_AGORA_APP_ID=xxx
```

⚠️ **IMPORTANTE**: Actualiza tu archivo `.env.local` con las nuevas variables.

---

## 📦 Dependencias

### Eliminadas

```json
{
  "@mux/mux-node": "^12.8.0",
  "@mux/mux-player-react": "^3.6.1"
}
```

### Agregadas

```json
{
  "agora-rtc-sdk-ng": "latest",
  "agora-token": "latest"
}
```

---

## 🔄 Cambios en el Código

### 1. Crear un Stream

**Antes (Mux):**
```typescript
const stream = await muxService.createLiveStream({
  playbackPolicy: 'public',
  reducedLatency: true
});
// Retorna: { streamId, streamKey, playbackId }
```

**Después (Agora):**
```typescript
const stream = await agoraService.createLiveStream({
  channelName: 'curso-123'
});
// Retorna: { channelName, appId, status }
```

### 2. Componente de Streaming

**Antes (Mux):**
```tsx
<MuxPlayer
  playbackId={stream.muxPlaybackId}
  title="Mi Stream"
  autoPlay={true}
/>
```

**Después (Agora):**
```tsx
<AgoraStream
  channel={stream.agoraChannel}
  role="host" // o "audience"
  token={token}
  uid={userId}
  appId={stream.agoraAppId}
/>
```

### 3. Obtener Token

**Nuevo en Agora:**
```typescript
const response = await fetch(
  `/api/agora-token?channel=${channel}&uid=${userId}&role=host`
);
const { token, appId } = await response.json();
```

---

## 🎯 Flujo de Trabajo Actualizado

### Para el Ponente (Host)

1. **Crear transmisión** → Se genera un canal Agora
2. **Obtener token** → Llamada a `/api/agora-token` con role=host
3. **Iniciar stream** → Componente `<AgoraStream>` activa cámara/micrófono
4. **Transmitir** → Video se publica automáticamente al canal
5. **Finalizar** → Componente se desmonta, canal se limpia

### Para los Estudiantes (Audience)

1. **Unirse a transmisión** → Obtienen el canal activo
2. **Obtener token** → Llamada a `/api/agora-token` con role=audience
3. **Ver stream** → Componente `<AgoraStream>` se suscribe al host
4. **Interactuar** → Chat y encuestas en tiempo real
5. **Salir** → Componente se desmonta

---

## 🗄️ Migración de Datos Existentes

Si tienes streams existentes en Firestore con campos de Mux:

### Opción 1: Script de Migración (Recomendado)

```typescript
// scripts/migrateStreamsToAgora.ts
import { db } from '@/lib/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

async function migrateStreams() {
  const streamsRef = collection(db, 'liveStreams');
  const snapshot = await getDocs(streamsRef);
  
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    
    // Generar nuevo canal Agora basado en el ID del stream
    const agoraChannel = `stream-${docSnap.id}`;
    const agoraAppId = process.env.AGORA_APP_ID!;
    
    // Actualizar documento
    await updateDoc(doc(db, 'liveStreams', docSnap.id), {
      agoraChannel,
      agoraAppId,
      // Opcional: eliminar campos antiguos de Mux
      muxStreamKey: null,
      muxPlaybackId: null,
      muxStreamId: null,
    });
    
    console.log(`✅ Migrado: ${docSnap.id}`);
  }
  
  console.log('🎉 Migración completada');
}

migrateStreams();
```

### Opción 2: Recrear Streams

Si prefieres empezar de cero:

1. Elimina los streams antiguos de Firestore
2. Crea nuevos streams usando la nueva implementación de Agora

---

## ✅ Checklist de Migración

- [ ] Configurar cuenta de Agora.io
- [ ] Obtener APP_ID y APP_CERTIFICATE
- [ ] Actualizar variables de entorno en `.env.local`
- [ ] Desinstalar paquetes de Mux: `npm uninstall @mux/mux-node @mux/mux-player-react`
- [ ] Instalar paquetes de Agora: `npm install agora-rtc-sdk-ng agora-token`
- [ ] Migrar datos existentes (si aplica)
- [ ] Actualizar componentes que usen streaming
- [ ] Probar flujo completo: host → audience
- [ ] Verificar permisos de cámara/micrófono en navegador
- [ ] Documentar cambios para el equipo

---

## 🐛 Problemas Comunes

### "Agora credentials not configured"
- Verifica que las variables de entorno estén en `.env.local`
- Reinicia el servidor de desarrollo

### "Permission denied" para cámara/micrófono
- El navegador debe estar en HTTPS o localhost
- Usuario debe dar permisos explícitos

### Stream no se ve
- Verifica que el rol sea correcto (host publica, audience ve)
- Revisa la consola del navegador para errores
- Asegúrate de que el token no haya expirado

---

## 📚 Recursos

- [Documentación de Agora](https://docs.agora.io/)
- [Guía de Setup](./AGORA_SETUP.md)
- [Web SDK Reference](https://docs.agora.io/en/video-calling/reference/web-sdk)

---

## 🎉 Ventajas de la Migración

✅ **Más simple para ponentes**: No necesitan OBS ni configuración técnica  
✅ **Menor latencia**: 1-3 segundos vs 10-30 segundos  
✅ **Mejor interactividad**: Chat y encuestas en tiempo real  
✅ **Más económico**: Plan gratuito generoso de Agora  
✅ **Todo en el navegador**: No se sale de la plataforma  
✅ **Mejor experiencia de usuario**: Interfaz integrada y moderna  

---

¿Preguntas? Revisa [AGORA_SETUP.md](./AGORA_SETUP.md) o la documentación oficial de Agora.
