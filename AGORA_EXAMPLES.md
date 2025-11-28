# 🎬 Ejemplos Prácticos de Agora

## Ejemplos de Uso Real

Esta guía contiene ejemplos prácticos y código listo para usar con Agora en tu plataforma.

---

## 📝 Ejemplo 1: Página de Transmisión del Ponente

```typescript
// app/dashboard/instructor/live/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import AgoraStream from '@/components/live/AgoraStream';
import { useAuth } from '@/hooks/useAuth';

export default function InstructorLivePage() {
  const params = useParams();
  const { user } = useAuth();
  const [stream, setStream] = useState(null);
  const [token, setToken] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStream();
  }, [params.id]);

  const loadStream = async () => {
    try {
      // Cargar información del stream
      const res = await fetch(`/api/live/${params.id}`);
      if (!res.ok) throw new Error('Stream no encontrado');
      
      const data = await res.json();
      setStream(data);

      // Obtener token para host
      const tokenRes = await fetch(
        `/api/agora-token?channel=${data.agoraChannel}&uid=${user.id}&role=host`
      );
      const tokenData = await tokenRes.json();
      setToken(tokenData.token);
    } catch (err) {
      setError(err.message);
    }
  };

  const startStream = async () => {
    try {
      await fetch(`/api/live/${params.id}/start`, { method: 'POST' });
      setIsLive(true);
    } catch (err) {
      setError('Error al iniciar transmisión');
    }
  };

  const endStream = async () => {
    try {
      await fetch(`/api/live/${params.id}/stop`, { method: 'POST' });
      setIsLive(false);
    } catch (err) {
      setError('Error al finalizar transmisión');
    }
  };

  if (error) {
    return (
      <div className="alert alert-error">
        <p>{error}</p>
      </div>
    );
  }

  if (!stream || !token) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Video Principal */}
        <div className="lg:col-span-2">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-0">
              <AgoraStream
                channel={stream.agoraChannel}
                role="host"
                token={token}
                uid={user.id}
                appId={stream.agoraAppId}
                onError={(err) => setError(err.message)}
                onUserJoined={() => setViewerCount(prev => prev + 1)}
                onUserLeft={() => setViewerCount(prev => prev - 1)}
              />
            </div>
          </div>

          {/* Controles */}
          <div className="card bg-base-100 shadow-xl mt-4">
            <div className="card-body">
              <h2 className="card-title">{stream.title}</h2>
              <p className="text-sm text-gray-600">{stream.description}</p>
              
              <div className="flex items-center gap-4 mt-4">
                <div className="badge badge-lg">
                  👥 {viewerCount} espectadores
                </div>
                
                {isLive ? (
                  <div className="badge badge-error badge-lg">
                    🔴 EN VIVO
                  </div>
                ) : (
                  <div className="badge badge-ghost badge-lg">
                    ⏸️ Pausado
                  </div>
                )}
              </div>

              <div className="card-actions justify-end mt-4">
                {!isLive ? (
                  <button 
                    className="btn btn-primary"
                    onClick={startStream}
                  >
                    🎥 Iniciar Transmisión
                  </button>
                ) : (
                  <button 
                    className="btn btn-error"
                    onClick={endStream}
                  >
                    ⏹️ Finalizar Transmisión
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Chat y Encuestas */}
        <div className="lg:col-span-1">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">💬 Chat en Vivo</h3>
              {/* Componente de chat aquí */}
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl mt-4">
            <div className="card-body">
              <h3 className="card-title">📊 Encuestas</h3>
              {/* Componente de encuestas aquí */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 📝 Ejemplo 2: Página de Visualización del Estudiante

```typescript
// app/dashboard/student/live/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import AgoraStream from '@/components/live/AgoraStream';
import { useAuth } from '@/hooks/useAuth';

export default function StudentLivePage() {
  const params = useParams();
  const { user } = useAuth();
  const [stream, setStream] = useState(null);
  const [token, setToken] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStream();
    
    // Polling para verificar si el stream está activo
    const interval = setInterval(checkStreamStatus, 5000);
    return () => clearInterval(interval);
  }, [params.id]);

  const loadStream = async () => {
    try {
      const res = await fetch(`/api/live/${params.id}`);
      if (!res.ok) throw new Error('Stream no encontrado');
      
      const data = await res.json();
      setStream(data);
      setIsLive(data.active);

      // Obtener token para audience
      const tokenRes = await fetch(
        `/api/agora-token?channel=${data.agoraChannel}&uid=${user.id}&role=audience`
      );
      const tokenData = await tokenRes.json();
      setToken(tokenData.token);
    } catch (err) {
      setError(err.message);
    }
  };

  const checkStreamStatus = async () => {
    try {
      const res = await fetch(`/api/live/${params.id}/status`);
      const data = await res.json();
      setIsLive(data.isActive);
    } catch (err) {
      console.error('Error checking status:', err);
    }
  };

  if (error) {
    return (
      <div className="alert alert-error">
        <p>{error}</p>
      </div>
    );
  }

  if (!stream || !token) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Video */}
        <div className="lg:col-span-2">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-0">
              {isLive ? (
                <AgoraStream
                  channel={stream.agoraChannel}
                  role="audience"
                  token={token}
                  uid={user.id}
                  appId={stream.agoraAppId}
                  onError={(err) => setError(err.message)}
                />
              ) : (
                <div className="aspect-video bg-gray-900 flex items-center justify-center">
                  <div className="text-center text-white">
                    <p className="text-2xl mb-2">⏸️</p>
                    <p>La transmisión no ha iniciado</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Espera a que el ponente inicie
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl mt-4">
            <div className="card-body">
              <h2 className="card-title">{stream.title}</h2>
              <p className="text-sm text-gray-600">{stream.description}</p>
              <p className="text-xs text-gray-500 mt-2">
                Instructor: {stream.instructorName}
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">💬 Chat</h3>
              {/* Chat component */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 📝 Ejemplo 3: Hook Personalizado para Agora

```typescript
// hooks/useAgoraStream.ts
import { useState, useEffect, useCallback } from 'react';

interface UseAgoraStreamProps {
  streamId: string;
  userId: string;
  role: 'host' | 'audience';
}

export function useAgoraStream({ streamId, userId, role }: UseAgoraStreamProps) {
  const [stream, setStream] = useState(null);
  const [token, setToken] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cargar stream y token
  useEffect(() => {
    loadStream();
  }, [streamId]);

  const loadStream = async () => {
    try {
      setLoading(true);
      
      // Obtener información del stream
      const streamRes = await fetch(`/api/live/${streamId}`);
      if (!streamRes.ok) throw new Error('Stream no encontrado');
      const streamData = await streamRes.json();
      setStream(streamData);
      setIsLive(streamData.active);

      // Obtener token
      const tokenRes = await fetch(
        `/api/agora-token?channel=${streamData.agoraChannel}&uid=${userId}&role=${role}`
      );
      if (!tokenRes.ok) throw new Error('Error al obtener token');
      const tokenData = await tokenRes.json();
      setToken(tokenData.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Iniciar transmisión
  const startStream = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/${streamId}/start`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Error al iniciar');
      setIsLive(true);
    } catch (err) {
      setError(err.message);
    }
  }, [streamId]);

  // Finalizar transmisión
  const endStream = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/${streamId}/stop`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Error al finalizar');
      setIsLive(false);
    } catch (err) {
      setError(err.message);
    }
  }, [streamId]);

  // Handlers para eventos de Agora
  const handleUserJoined = useCallback(() => {
    setViewerCount(prev => prev + 1);
  }, []);

  const handleUserLeft = useCallback(() => {
    setViewerCount(prev => Math.max(0, prev - 1));
  }, []);

  const handleError = useCallback((err: Error) => {
    setError(err.message);
  }, []);

  return {
    stream,
    token,
    isLive,
    viewerCount,
    error,
    loading,
    startStream,
    endStream,
    handleUserJoined,
    handleUserLeft,
    handleError,
  };
}
```

**Uso del hook:**

```typescript
'use client';

import AgoraStream from '@/components/live/AgoraStream';
import { useAgoraStream } from '@/hooks/useAgoraStream';

export default function LivePage({ streamId, userId, role }) {
  const {
    stream,
    token,
    isLive,
    viewerCount,
    error,
    loading,
    startStream,
    endStream,
    handleUserJoined,
    handleUserLeft,
    handleError,
  } = useAgoraStream({ streamId, userId, role });

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!stream || !token) return null;

  return (
    <div>
      <AgoraStream
        channel={stream.agoraChannel}
        role={role}
        token={token}
        uid={userId}
        appId={stream.agoraAppId}
        onUserJoined={handleUserJoined}
        onUserLeft={handleUserLeft}
        onError={handleError}
      />
      
      {role === 'host' && (
        <div>
          <p>Espectadores: {viewerCount}</p>
          {!isLive ? (
            <button onClick={startStream}>Iniciar</button>
          ) : (
            <button onClick={endStream}>Finalizar</button>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## 📝 Ejemplo 4: Componente de Controles de Stream

```typescript
// components/live/StreamControls.tsx
'use client';

import { useState } from 'react';

interface StreamControlsProps {
  isLive: boolean;
  viewerCount: number;
  onStart: () => Promise<void>;
  onEnd: () => Promise<void>;
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
}

export default function StreamControls({
  isLive,
  viewerCount,
  onStart,
  onEnd,
  onToggleMic,
  onToggleCamera,
}: StreamControlsProps) {
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      await onStart();
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async () => {
    setLoading(true);
    try {
      await onEnd();
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMic = () => {
    setMicEnabled(!micEnabled);
    onToggleMic?.();
  };

  const handleToggleCamera = () => {
    setCameraEnabled(!cameraEnabled);
    onToggleCamera?.();
  };

  return (
    <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
      {/* Estado */}
      <div className="flex items-center gap-4">
        {isLive ? (
          <div className="badge badge-error gap-2">
            <span className="animate-pulse">🔴</span>
            EN VIVO
          </div>
        ) : (
          <div className="badge badge-ghost">
            ⏸️ Pausado
          </div>
        )}
        
        <div className="badge badge-outline">
          👥 {viewerCount} espectadores
        </div>
      </div>

      {/* Controles */}
      <div className="flex items-center gap-2">
        {/* Micrófono */}
        <button
          className={`btn btn-sm ${micEnabled ? 'btn-primary' : 'btn-error'}`}
          onClick={handleToggleMic}
          disabled={!isLive}
        >
          {micEnabled ? '🎤' : '🔇'}
        </button>

        {/* Cámara */}
        <button
          className={`btn btn-sm ${cameraEnabled ? 'btn-primary' : 'btn-error'}`}
          onClick={handleToggleCamera}
          disabled={!isLive}
        >
          {cameraEnabled ? '📹' : '📷'}
        </button>

        {/* Iniciar/Finalizar */}
        {!isLive ? (
          <button
            className="btn btn-primary btn-sm"
            onClick={handleStart}
            disabled={loading}
          >
            {loading ? 'Iniciando...' : '🎥 Iniciar'}
          </button>
        ) : (
          <button
            className="btn btn-error btn-sm"
            onClick={handleEnd}
            disabled={loading}
          >
            {loading ? 'Finalizando...' : '⏹️ Finalizar'}
          </button>
        )}
      </div>
    </div>
  );
}
```

---

## 📝 Ejemplo 5: Componente de Lista de Streams Activos

```typescript
// components/live/ActiveStreams.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ActiveStreams() {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveStreams();
    
    // Actualizar cada 10 segundos
    const interval = setInterval(loadActiveStreams, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadActiveStreams = async () => {
    try {
      const res = await fetch('/api/live?active=true');
      const data = await res.json();
      setStreams(data);
    } catch (err) {
      console.error('Error loading streams:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Cargando transmisiones...</div>;
  }

  if (streams.length === 0) {
    return (
      <div className="alert alert-info">
        <p>No hay transmisiones en vivo en este momento</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {streams.map((stream) => (
        <Link
          key={stream.id}
          href={`/dashboard/student/live/${stream.id}`}
          className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow"
        >
          <div className="card-body">
            <div className="flex items-start justify-between">
              <h2 className="card-title">{stream.title}</h2>
              <div className="badge badge-error gap-2">
                <span className="animate-pulse">🔴</span>
                VIVO
              </div>
            </div>
            
            <p className="text-sm text-gray-600 line-clamp-2">
              {stream.description}
            </p>
            
            <div className="card-actions justify-between items-center mt-4">
              <div className="text-sm text-gray-500">
                {stream.instructorName}
              </div>
              <button className="btn btn-primary btn-sm">
                Ver ahora →
              </button>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
```

---

## 🎯 Mejores Prácticas

### 1. Manejo de Tokens

```typescript
// Renovar token antes de que expire
useEffect(() => {
  if (!token) return;
  
  // Renovar 5 minutos antes de expirar (token válido por 1 hora)
  const renewTime = 55 * 60 * 1000; // 55 minutos
  
  const timeout = setTimeout(async () => {
    const res = await fetch(
      `/api/agora-token?channel=${channel}&uid=${uid}&role=${role}`
    );
    const data = await res.json();
    setToken(data.token);
  }, renewTime);
  
  return () => clearTimeout(timeout);
}, [token]);
```

### 2. Manejo de Errores

```typescript
const handleStreamError = (error: Error) => {
  console.error('Stream error:', error);
  
  // Mostrar notificación al usuario
  toast.error('Error en la transmisión: ' + error.message);
  
  // Intentar reconectar
  if (error.message.includes('network')) {
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  }
};
```

### 3. Cleanup Apropiado

```typescript
useEffect(() => {
  // Setup
  initializeStream();
  
  // Cleanup
  return () => {
    // Asegurarse de limpiar recursos
    if (localTracks) {
      localTracks.forEach(track => {
        track.stop();
        track.close();
      });
    }
    
    if (client) {
      client.leave();
    }
  };
}, []);
```

---

¡Estos ejemplos te ayudarán a implementar transmisiones en vivo con Agora en tu plataforma! 🚀
