"use client";

import React, { useEffect, useRef, useState } from "react";
import AgoraRTC, {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser,
} from "agora-rtc-sdk-ng";
import { IconMicrophoneOff, IconCameraOff } from "@tabler/icons-react";

// Registro global de UIDs en uso para prevenir conflictos
const activeScreenUIDs = new Set<string>();

interface AgoraStreamProps {
  channel: string;
  role: "host" | "audience";
  token: string;
  uid: string | number;
  appId: string;
  micEnabled?: boolean;
  cameraEnabled?: boolean;
  screenStream?: MediaStream | null;
  screenShareToken?: string | null;
  screenShareUid?: number | null;
  leftPreferredUid?: number; // UID base preferido para el lado izquierdo (audiencia)
  hostNames?: Record<number, string>; // baseUid -> nombre
  onError?: (error: Error) => void;
  onUserJoined?: (user: IAgoraRTCRemoteUser) => void;
  onUserLeft?: (user: IAgoraRTCRemoteUser) => void;
}

export default function AgoraStream({
  channel,
  role,
  token,
  uid,
  appId,
  micEnabled = true,
  cameraEnabled = true,
  screenStream = null,
  screenShareToken = null,
  screenShareUid = null,
  leftPreferredUid,
  hostNames,
  onError,
  onUserJoined,
  onUserLeft,
}: AgoraStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const screenClientRef = useRef<IAgoraRTCClient | null>(null);
  const localTracksRef = useRef<[IMicrophoneAudioTrack, ICameraVideoTrack] | null>(null);
  const screenTrackRef = useRef<any>(null);
  const screenAudioTrackRef = useRef<any>(null);
  const cameraContainerRef = useRef<HTMLDivElement | null>(null);
  const screenContainerRef = useRef<HTMLDivElement | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const activeStreamsRef = useRef<{ [key: number]: { isScreen: boolean; isCam: boolean } }>({});
  const isJoiningScreenRef = useRef(false);
  const screenUidRef = useRef<number | null>(null);
  const joinOrderRef = useRef<number[]>([]);

  const getDisplayName = (baseUid: number, fallback: string = 'Ponente') => {
    return (hostNames && hostNames[baseUid]) || fallback;
  };

  const forceHostPip = () => {
    if (role !== 'host') return;
    if (anyScreenActive()) return; // si hay pantalla compartida no forzar PIP local
    const myBaseUid = typeof uid === 'number' ? uid : parseInt(uid as string);
    const localEl = document.getElementById(`local-player-${myBaseUid}`) as HTMLDivElement | null;
    if (!localEl) return;
    localEl.className = "absolute bottom-4 left-4 w-48 h-36 rounded-lg border-2 border-white shadow-2xl overflow-hidden z-50";
    localEl.style.cssText = "background: black;";
    putLabel(localEl, getDisplayName(myBaseUid, 'Tú'));
  };

  const putLabel = (container: HTMLElement, text: string) => {
    let lbl = container.querySelector('.agora-name-label') as HTMLDivElement | null;
    if (!lbl) {
      lbl = document.createElement('div');
      lbl.className = 'agora-name-label absolute top-2 left-2 z-20 bg-black/70 text-white text-[10px] sm:text-xs px-2 py-0.5 rounded pointer-events-none';
      container.appendChild(lbl);
    }
    lbl.textContent = text;
  };

  const anyScreenActive = () => Object.values(activeStreamsRef.current).some(s => s.isScreen);
  const getScreenSharerBaseUid = (): number | null => {
    const entry = Object.entries(activeStreamsRef.current).find(([, v]) => v.isScreen);
    return entry ? parseInt(entry[0]) : null;
  };

  const hasRemoteCamPresent = (myBaseUid: number) => {
    // 1) Estado conocido
    const hasByState = Object.entries(activeStreamsRef.current).some(([b, s]) => s.isCam && parseInt(b) !== myBaseUid);
    if (hasByState) return true;
    // 2) Fallback por DOM (por si el estado aún no se actualiza)
    if (!containerRef.current) return false;
    const nodes = containerRef.current.querySelectorAll("[id^='camera-player-']");
    for (const n of Array.from(nodes)) {
      const id = (n as HTMLElement).id; // camera-player-<baseUid>
      const baseStr = id.replace('camera-player-', '');
      const base = parseInt(baseStr);
      if (!isNaN(base) && base !== myBaseUid) return true;
    }
    return false;
  };

  const applyHostCamLayout = () => {
    if (role !== 'host') return;
    const myBaseUid = typeof uid === 'number' ? uid : parseInt(uid as string);
    const hasRemoteCam = hasRemoteCamPresent(myBaseUid);
    const localEl = document.getElementById(`local-player-${myBaseUid}`) as HTMLDivElement | null;
    if (!localEl) return;
    const screenSharer = getScreenSharerBaseUid();
    if (anyScreenActive() && screenSharer !== null && screenSharer !== myBaseUid) {
      // Ocultar mi cámara local cuando otro está compartiendo pantalla
      localEl.className = "hidden";
      localEl.style.cssText = "display:none;";
      return;
    }
    if (hasRemoteCam && !anyScreenActive()) {
      localEl.className = "absolute bottom-4 left-4 w-48 h-36 rounded-lg border-2 border-white shadow-2xl overflow-hidden z-50";
      localEl.style.cssText = "background: black;";
      putLabel(localEl, getDisplayName(myBaseUid, 'Tú'));
    } else if (!anyScreenActive()) {
      localEl.className = "w-full h-full";
      localEl.style.cssText = "background: black;";
      putLabel(localEl, getDisplayName(myBaseUid, 'Tú'));
    } else {
      // Si la pantalla compartida es mía, muestro PIP (esto ya lo maneja flujo de share)
      localEl.classList.remove('hidden');
      localEl.style.removeProperty('display');
      putLabel(localEl, getDisplayName(myBaseUid, 'Tú'));
    }
  };

  const pipRetryTimer = useRef<any>(null);
  const applyHostCamLayoutWithRetry = (attempt = 0) => {
    // Intenta aplicar el layout y reintenta si el contenedor local aún no existe/ajusta
    applyHostCamLayout();
    if (role !== 'host') return;
    const myBaseUid = typeof uid === 'number' ? uid : parseInt(uid as string);
    const localEl = document.getElementById(`local-player-${myBaseUid}`) as HTMLDivElement | null;
    const hasRemoteCam = Object.entries(activeStreamsRef.current).some(([b, s]) => s.isCam && parseInt(b) !== myBaseUid);
    const needPip = hasRemoteCam && !anyScreenActive();
    const ok = !!localEl && (!needPip || (needPip && localEl.classList.contains('absolute')));
    if (!ok && attempt < 3) {
      if (pipRetryTimer.current) {
        clearTimeout(pipRetryTimer.current);
      }
      pipRetryTimer.current = setTimeout(() => {
        pipRetryTimer.current = null;
        applyHostCamLayoutWithRetry(attempt + 1);
      }, 160);
    }
  };

  const recalcSplitLayout = () => {
    if (role !== 'audience') return;
    if (!containerRef.current) return;
    if (anyScreenActive()) return;
    const camUids = Object.entries(activeStreamsRef.current)
      .filter(([, s]) => s.isCam)
      .map(([k]) => parseInt(k));
    if (camUids.length === 0) return;
    if (camUids.length === 1) {
      const only = camUids[0];
      const cont = document.getElementById(`camera-player-${only}`) as HTMLDivElement | null;
      if (cont) {
        cont.className = "w-full h-full";
        cont.style.cssText = "background: black;";
      }
      return;
    }
    let ordered = [...camUids];
    if (leftPreferredUid && ordered.includes(leftPreferredUid)) {
      ordered = [leftPreferredUid, ...ordered.filter(u => u !== leftPreferredUid)];
    } else {
      ordered.sort((a, b) => joinOrderRef.current.indexOf(a) - joinOrderRef.current.indexOf(b));
    }
    const left = ordered[0];
    const right = ordered[1];
    const leftEl = document.getElementById(`camera-player-${left}`) as HTMLDivElement | null;
    const rightEl = document.getElementById(`camera-player-${right}`) as HTMLDivElement | null;
    if (leftEl) {
      leftEl.className = "absolute top-0 left-0 w-1/2 h-full overflow-hidden";
      leftEl.style.cssText = "background: black; z-index: 0;";
    }
    if (rightEl) {
      rightEl.className = "absolute top-0 right-0 w-1/2 h-full overflow-hidden";
      rightEl.style.cssText = "background: black; z-index: 0;";
    }
    for (const extra of ordered.slice(2)) {
      const el = document.getElementById(`camera-player-${extra}`);
      if (el) el.remove();
      delete activeStreamsRef.current[extra];
    }
  };

  // Determinar si un UID corresponde a pantalla compartida buscando su par ±1000
  const getBaseInfo = (uidNum: number) => {
    const remotes = clientRef.current?.remoteUsers || [];
    const hasCameraPair = remotes.some(r => {
      const ruid = typeof r.uid === 'number' ? r.uid : parseInt(r.uid as string);
      return ruid === uidNum - 1000;
    });
    if (hasCameraPair) {
      return { baseUid: uidNum - 1000, isScreen: true } as const;
    }
    const hasScreenPair = remotes.some(r => {
      const ruid = typeof r.uid === 'number' ? r.uid : parseInt(r.uid as string);
      return ruid === uidNum + 1000;
    });
    return { baseUid: uidNum, isScreen: false, hasScreenPair } as const;
  };

  // Manejar políticas de autoplay de audio (Chrome/iOS)
  useEffect(() => {
    AgoraRTC.onAutoplayFailed = () => {
      console.warn('🔇 Autoplay de audio bloqueado. Mostrando botón para reanudar.');
      const btn = document.createElement('button');
      btn.id = 'resume-audio-btn';
      btn.className = 'absolute bottom-4 left-4 z-[1000] px-3 py-1 rounded bg-white text-black shadow';
      btn.textContent = 'Habilitar audio';
      btn.onclick = () => {
        try {
          const users = clientRef.current?.remoteUsers || [];
          const myBaseUid = typeof uid === 'number' ? uid : parseInt(uid as string);
          users.forEach(u => {
            const numericUid = typeof u.uid === 'number' ? u.uid : parseInt(u.uid as string);
            const baseCandidate = numericUid >= 1000 ? numericUid - 1000 : numericUid;
            if (role === 'host' && baseCandidate === myBaseUid) return; // evitar eco
            if (u.audioTrack) u.audioTrack.play();
          });
          btn.remove();
        } catch (e) {
          console.error('Error reanudando audio:', e);
        }
      };
      containerRef.current?.appendChild(btn);
    };
    return () => {
      // @ts-ignore
      AgoraRTC.onAutoplayFailed = null;
      const existing = document.getElementById('resume-audio-btn');
      if (existing) existing.remove();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    let isJoining = false;

    const init = async () => {
      try {
        // Prevenir múltiples inicializaciones
        if (isJoining || clientRef.current) {
          return;
        }
        
        isJoining = true;

        // Crear cliente de Agora
        const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
        clientRef.current = client;

        // Configurar eventos
        client.on("user-published", async (user, mediaType) => {
          try {
            console.log(`📢 Usuario publicó ${mediaType}:`, user.uid);
            await client.subscribe(user, mediaType);
            console.log(`✅ Suscrito a ${mediaType} de usuario:`, user.uid);
            
            if (mediaType === "video" && containerRef.current) {
              // Verificar si es el stream de pantalla (UID > 1000) o cámara
              const numericUid = typeof user.uid === 'number' ? user.uid : parseInt(user.uid as string);
              const info = getBaseInfo(numericUid);
              const isScreenShare = info.isScreen;
              const baseUid = info.baseUid;

              // No filtramos usuarios: audiencia puede ver múltiples ponentes
              
              // Registrar el stream activo
              if (!activeStreamsRef.current[baseUid]) {
                activeStreamsRef.current[baseUid] = { isScreen: false, isCam: false };
              }
              
              if (isScreenShare) {
                activeStreamsRef.current[baseUid].isScreen = true;
                console.log("🖥️ Detectado stream de pantalla compartida del usuario:", baseUid);
                
                // Crear o actualizar contenedor de pantalla (fondo)
                let screenContainer = document.getElementById(`screen-player-${numericUid}`);
                if (!screenContainer) {
                  screenContainer = document.createElement("div");
                  screenContainer.id = `screen-player-${numericUid}`;
                  screenContainer.className = "w-full h-full absolute inset-0";
                  screenContainer.style.cssText = "background: black; z-index: 0;";
                  containerRef.current.appendChild(screenContainer);
                }
                user.videoTrack?.play(screenContainer);
                putLabel(screenContainer, `Compartiendo: ${getDisplayName(baseUid)}`);
                
                // Si hay cámara del mismo usuario, moverla a flotante
                const existingCamera = document.getElementById(`camera-player-${baseUid}`);
                if (existingCamera) {
                  // Cambiar a flotante si no lo es ya
                  if (!existingCamera.classList.contains('absolute')) {
                    existingCamera.className = "absolute bottom-4 right-4 w-48 h-36 rounded-lg border-2 border-white shadow-2xl overflow-hidden z-10";
                    existingCamera.style.cssText = "background: black; z-index: 999;";
                  }
                }
              } else {
                activeStreamsRef.current[baseUid].isCam = true;
                console.log("📹 Detectado stream de cámara del usuario:", baseUid);

                // Registrar orden de llegada
                if (!joinOrderRef.current.includes(baseUid)) {
                  joinOrderRef.current.push(baseUid);
                }
                
                // Verificar si hay pantalla compartida del mismo usuario
                const screenUid = baseUid + 1000;
                const hasScreenShare = activeStreamsRef.current[baseUid]?.isScreen || 
                                      document.getElementById(`screen-player-${screenUid}`);
                
                let cameraContainer = document.getElementById(`camera-player-${baseUid}`);

                if (hasScreenShare) {
                  // Hay pantalla compartida, mostrar cámara flotante
                  console.log("📹 Mostrando cámara flotante porque hay pantalla compartida");
                  if (!cameraContainer) {
                    cameraContainer = document.createElement("div");
                    cameraContainer.id = `camera-player-${baseUid}`;
                    containerRef.current.appendChild(cameraContainer);
                  }
                  cameraContainer.className = "absolute bottom-4 right-4 w-48 h-36 rounded-lg border-2 border-white shadow-2xl overflow-hidden z-50";
                  cameraContainer.style.cssText = "background: black; z-index: 999;";
                  user.videoTrack?.play(cameraContainer);
                  putLabel(cameraContainer, getDisplayName(baseUid));
                  // Asegurar audio del ponente al publicar cámara
                  try {
                    if (user.hasAudio) {
                      await client.subscribe(user, "audio");
                      user.audioTrack?.play();
                      console.log("🔊 Audio (cam) reproduciéndose");
                    }
                  } catch (audioErr) {
                    console.error("❌ Error al reproducir audio de cam:", audioErr);
                  }
                } else {
                  // No hay pantalla compartida, mostrar cámara en grande
                  console.log("📹 Mostrando cámara en grande");
                  const screenSharer = getScreenSharerBaseUid();
                  if (anyScreenActive() && screenSharer !== null && screenSharer !== baseUid) {
                    // Hay pantalla compartida de otro usuario: mantener oculta esta cámara
                    if (!cameraContainer) {
                      cameraContainer = document.createElement("div");
                      cameraContainer.id = `camera-player-${baseUid}`;
                      containerRef.current.appendChild(cameraContainer);
                    }
                    cameraContainer.className = "hidden";
                    cameraContainer.style.cssText = "display:none;";
                    // Aún así reproducimos el video para poder mostrarlo rápido al terminar pantalla
                    user.videoTrack?.play(cameraContainer);
                    return;
                  }
                  if (!cameraContainer) {
                    // Solo limpiar si no hay pantalla compartida activa de ningún usuario
                    const hasAnyScreen = Object.values(activeStreamsRef.current).some(s => s.isScreen);
                    if (!hasAnyScreen) {
                      // No limpiar el contenedor para no afectar otros elementos
                    }
                    cameraContainer = document.createElement("div");
                    cameraContainer.id = `camera-player-${baseUid}`;
                    containerRef.current.appendChild(cameraContainer);
                  }
                  cameraContainer.className = "w-full h-full";
                  cameraContainer.style.cssText = "background: black;";
                  user.videoTrack?.play(cameraContainer);
                  putLabel(cameraContainer, getDisplayName(baseUid));
                  // Host: PIP si hay remoto (forzar para evitar carreras)
                  forceHostPip();
                  // Audiencia: recalcular split 2x
                  recalcSplitLayout();
                }
              }
              console.log("🎥 Video reproduciéndose");
            }
            
            if (mediaType === "audio") {
              console.log("🔊 Intentando reproducir audio...");
              const numericUid = typeof user.uid === 'number' ? user.uid : parseInt(user.uid as string);
              // Base por convención: pantalla usa base+1000
              const baseCandidate = numericUid >= 1000 ? numericUid - 1000 : numericUid;
              const myBaseUid = typeof uid === 'number' ? uid : parseInt(uid as string);
              // Evitar eco en el host: no reproducir audio de su propio cliente (cam o pantalla)
              if (role === "host" && baseCandidate === myBaseUid) {
                console.log('🔇 No reproduzco audio propio en host (evitar eco). baseUid:', baseCandidate);
                return;
              }
              console.log("🔊 audioTrack existe?", !!user.audioTrack);
              if (user.audioTrack) {
                try {
                  // No await para no bloquear la UI
                  user.audioTrack.play();
                  console.log("✅ Audio reproduciéndose exitosamente");
                } catch (audioErr) {
                  console.error("❌ Error reproduciendo audio:", audioErr);
                }
              } else {
                console.error("❌ No hay audioTrack disponible");
              }
            }

            if (onUserJoined) {
              onUserJoined(user);
            }
          } catch (err) {
            console.error("❌ Error subscribing to user:", err);
          }
        });

        client.on("user-unpublished", (user, mediaType) => {
          if (mediaType === "video") {
            const numericUid = typeof user.uid === 'number' ? user.uid : parseInt(user.uid as string);
            const info = getBaseInfo(numericUid);
            const isScreenShare = info.isScreen;
            const baseUid = info.baseUid;
            
            // Actualizar registro de streams
            if (activeStreamsRef.current[baseUid]) {
              if (isScreenShare) {
                activeStreamsRef.current[baseUid].isScreen = false;
                console.log("🖥️ Pantalla compartida detenida del usuario:", baseUid);
                
                // Remover contenedor de pantalla
                const screenContainer = document.getElementById(`screen-player-${numericUid}`);
                if (screenContainer) {
                  screenContainer.remove();
                }
                
                // Si hay cámara, moverla a pantalla completa
                if (activeStreamsRef.current[baseUid].isCam) {
                  const cameraContainer = document.getElementById(`camera-player-${baseUid}`);
                  if (cameraContainer) {
                    cameraContainer.className = "w-full h-full";
                    cameraContainer.style.cssText = "background: black;";
                    putLabel(cameraContainer, getDisplayName(baseUid));
                  }
                }
                // Rehabilitar cámaras ocultas de otros usuarios
                const camKeys = Object.entries(activeStreamsRef.current).filter(([, s]) => s.isCam).map(([k]) => parseInt(k));
                for (const k of camKeys) {
                  const el = document.getElementById(`camera-player-${k}`) as HTMLDivElement | null;
                  if (el) {
                    el.classList.remove('hidden');
                    el.style.removeProperty('display');
                    putLabel(el, getDisplayName(k));
                  }
                }
                // Recalcular layout para audiencia
                recalcSplitLayout();
              } else {
                activeStreamsRef.current[baseUid].isCam = false;
                console.log("📹 Cámara detenida del usuario:", baseUid);
                
                // Remover contenedor de cámara
                const cameraContainer = document.getElementById(`camera-player-${baseUid}`);
                if (cameraContainer) {
                  cameraContainer.remove();
                }
                // Ajustar layouts
                applyHostCamLayout();
                recalcSplitLayout();
              }
            }
            
            // También intentar remover contenedor legacy
            const remotePlayerContainer = document.getElementById(`remote-player-${user.uid}`);
            if (remotePlayerContainer) {
              remotePlayerContainer.remove();
            }
          }
        });

        client.on("user-left", (user) => {
          const numericUid = typeof user.uid === 'number' ? user.uid : parseInt(user.uid as string);
          const isScreenShare = numericUid >= 1000;
          const baseUid = isScreenShare ? numericUid - 1000 : numericUid;
          
          console.log("👋 Usuario salió:", user.uid, "baseUid:", baseUid, "isScreenShare:", isScreenShare);
          
          // Limpiar streams de este usuario
          if (activeStreamsRef.current[baseUid]) {
            delete activeStreamsRef.current[baseUid];
          }
          
          // Remover contenedores
          const cameraContainer = document.getElementById(`camera-player-${baseUid}`);
          if (cameraContainer) {
            cameraContainer.remove();
          }
          
          const screenContainer = document.getElementById(`screen-player-${baseUid + 1000}`);
          if (screenContainer) {
            screenContainer.remove();
          }
          
          const remotePlayerContainer = document.getElementById(`remote-player-${user.uid}`);
          if (remotePlayerContainer) {
            remotePlayerContainer.remove();
          }
          
          if (onUserLeft) {
            onUserLeft(user);
          }

          // Layout updates
          applyHostCamLayoutWithRetry(0);
          recalcSplitLayout();
        });

        client.on('user-joined', () => {
          // Unirse detectado: intentar aplicar PIP en corto
          applyHostCamLayoutWithRetry(0);
        });

        // Monitorear estado de conexión
        client.on('connection-state-change', (curState, prevState, reason) => {
          console.log('🔌 Estado de conexión:', prevState, '->', curState, reason);
        });

        // Unirse al canal
        console.log("🔵 Uniéndose al canal:", channel, "como", role);
        await client.join(appId, channel, token, uid);
        console.log("✅ Unido al canal exitosamente");

        if (!mounted) return;

        // Si es host, publicar audio y video
        if (role === "host") {
          console.log("🎤 Configurando como host...");
          await client.setClientRole("host");
          
          // Crear tracks locales
          const [micTrack, camTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
          localTracksRef.current = [micTrack, camTrack];

          if (!mounted) {
            micTrack.close();
            camTrack.close();
            return;
          }

          // Publicar tracks
          await client.publish([micTrack, camTrack]);

          // Mostrar video local
          if (containerRef.current) {
            const localPlayerContainer = document.createElement("div");
            localPlayerContainer.id = `local-player-${uid}`;
            localPlayerContainer.className = "w-full h-full";
            containerRef.current.appendChild(localPlayerContainer);
            camTrack.play(localPlayerContainer);
            // Aplicar PIP si ya hay alguien con cámara
            applyHostCamLayoutWithRetry(0);
            // Marcar inicializado temprano para evitar spinner largo
            setIsInitialized(true);
          }
        } else {
          // Si es audiencia, solo observar
          console.log("👥 Configurando como audiencia...");
          await client.setClientRole("audience");
          console.log("✅ Configurado como audiencia");
          
          // Obtener lista de usuarios remotos ya en el canal
          const remoteUsers = client.remoteUsers;
          console.log("👥 Usuarios remotos en el canal:", remoteUsers.length);
          
          // Primero: identificar qué streams hay (pantalla compartida vs cámara)
          const userStreams: { [key: number]: { screen?: typeof remoteUsers[0], cam?: typeof remoteUsers[0] } } = {};
          
          for (const remoteUser of remoteUsers) {
            const numericUid = typeof remoteUser.uid === 'number' ? remoteUser.uid : parseInt(remoteUser.uid as string);
            const info = getBaseInfo(numericUid);
            if (!userStreams[info.baseUid]) {
              userStreams[info.baseUid] = {};
            }
            if (info.isScreen) {
              userStreams[info.baseUid].screen = remoteUser;
            } else {
              userStreams[info.baseUid].cam = remoteUser;
              if (!joinOrderRef.current.includes(info.baseUid)) {
                joinOrderRef.current.push(info.baseUid);
              }
            }
          }
          
          console.log("👥 Streams por usuario:", Object.keys(userStreams).map(uid => ({
            uid,
            hasScreen: !!userStreams[parseInt(uid)].screen,
            hasCam: !!userStreams[parseInt(uid)].cam
          })));
          
          // Segundo: suscribirse y renderizar en orden correcto
          for (const baseUidStr of Object.keys(userStreams)) {
            const baseUid = parseInt(baseUidStr);
            const { screen, cam } = userStreams[baseUid];
            
            // Registrar streams activos
            activeStreamsRef.current[baseUid] = {
              isScreen: !!screen,
              isCam: !!cam
            };
            
            // Suscribirse y renderizar pantalla compartida primero (si existe)
            if (screen?.hasVideo) {
              try {
                console.log("🖥️ Suscribiéndose a pantalla compartida del usuario:", baseUid);
                await client.subscribe(screen, "video");
                
                if (containerRef.current && screen.videoTrack) {
                  const screenUid = baseUid + 1000;
                  let screenContainer = document.getElementById(`screen-player-${screenUid}`);
                  if (!screenContainer) {
                    // Limpiar protegiendo elementos locales
                    const children = Array.from(containerRef.current.children);
                    children.forEach(child => {
                      const el = child as HTMLElement;
                      if (el.id !== 'camera-float' && !el.hasAttribute('data-local-camera')) {
                        el.remove();
                      }
                    });
                    
                    screenContainer = document.createElement("div");
                    screenContainer.id = `screen-player-${screenUid}`;
                    screenContainer.className = "w-full h-full absolute inset-0";
                    screenContainer.style.cssText = "background: black; z-index: 0;";
                    containerRef.current.appendChild(screenContainer);
                  }
                  screen.videoTrack.play(screenContainer);
                  console.log("✅ Pantalla compartida reproduciéndose");
                  putLabel(screenContainer as HTMLElement, `Compartiendo: ${getDisplayName(baseUid)}`);
                  // Registrar stream de pantalla en inicial
                  if (!activeStreamsRef.current[baseUid]) {
                    activeStreamsRef.current[baseUid] = { isScreen: true, isCam: false };
                  } else {
                    activeStreamsRef.current[baseUid].isScreen = true;
                  }
                }
              } catch (err) {
                console.error("❌ Error con pantalla compartida:", err);
              }
            }
            
            // Suscribirse y renderizar cámara
            if (cam?.hasVideo) {
              try {
                console.log("📹 Suscribiéndose a cámara del usuario:", baseUid);
                await client.subscribe(cam, "video");
                
                if (containerRef.current && cam.videoTrack) {
                  let cameraContainer = document.getElementById(`camera-player-${baseUid}`);
                  
                  if (screen) {
                    // Hay pantalla compartida, cámara flotante
                    console.log("📹 Renderizando cámara flotante");
                    if (!cameraContainer) {
                      cameraContainer = document.createElement("div");
                      cameraContainer.id = `camera-player-${baseUid}`;
                      containerRef.current.appendChild(cameraContainer);
                    }
                    cameraContainer.className = "absolute bottom-4 right-4 w-48 h-36 rounded-lg border-2 border-white shadow-2xl overflow-hidden z-10";
                    cameraContainer.style.cssText = "background: black;";
                  } else {
                    // No hay pantalla, cámara en grande
                    console.log("📹 Renderizando cámara en grande");
                    const screenSharer = Object.entries(activeStreamsRef.current).find(([, v]) => v.isScreen);
                    const screenSharerBase = screenSharer ? parseInt(screenSharer[0]) : null;
                    if (anyScreenActive() && screenSharerBase !== null && screenSharerBase !== baseUid) {
                      // Si hay pantalla de otro usuario, ocultar esta cámara
                      if (!cameraContainer) {
                        cameraContainer = document.createElement("div");
                        cameraContainer.id = `camera-player-${baseUid}`;
                        containerRef.current.appendChild(cameraContainer);
                      }
                      cameraContainer.className = "hidden";
                      cameraContainer.style.cssText = "display:none;";
                    } else {
                      if (!cameraContainer) {
                        // No limpiar el contenedor: preservar el local-player para PIP
                        cameraContainer = document.createElement("div");
                        cameraContainer.id = `camera-player-${baseUid}`;
                        containerRef.current.appendChild(cameraContainer);
                      }
                      cameraContainer.className = "w-full h-full";
                      cameraContainer.style.cssText = "background: black;";
                    }
                  }
                  cam.videoTrack.play(cameraContainer);
                  putLabel(cameraContainer as HTMLElement, getDisplayName(baseUid));
                  console.log("✅ Cámara reproduciéndose");
                  // Registrar cámara en inicial
                  if (!activeStreamsRef.current[baseUid]) {
                    activeStreamsRef.current[baseUid] = { isScreen: !!screen, isCam: true };
                  } else {
                    activeStreamsRef.current[baseUid].isCam = true;
                  }
                  // Recalcular split 2x para audiencia
                  recalcSplitLayout();
                  // Asegurar PIP del host que ya estaba (manejo de carreras)
                  applyHostCamLayoutWithRetry(0);
                }
              } catch (err) {
                console.error("❌ Error con cámara:", err);
              }
            }
            
            // Suscribirse al audio del usuario (cam y/o pantalla si existen)
            const audioSources = [cam, screen].filter(Boolean) as IAgoraRTCRemoteUser[];
            for (const audioUser of audioSources) {
              if (audioUser?.hasAudio) {
                try {
                  console.log("🔊 Suscribiéndose al audio (inicial) del usuario:", baseUid, "uid:", audioUser.uid);
                  await client.subscribe(audioUser, "audio");
                  if (audioUser.audioTrack) {
                    // No await para evitar bloqueos por políticas de autoplay
                    audioUser.audioTrack.play();
                    console.log("✅ Audio reproduciéndose, volume:", audioUser.audioTrack.getVolumeLevel());
                  } else {
                    console.error("❌ No hay audioTrack");
                  }
                } catch (err) {
                  console.error("❌ Error con audio:", err);
                }
              }
            }
          }
        }

        if (mounted) {
          setIsInitialized(true);
          console.log("✅ Inicialización completa");
        }
      } catch (err: any) {
        console.error("Error initializing Agora:", err);
        const errorMessage = err.message || "Failed to initialize stream";
        setError(errorMessage);
        if (onError) {
          onError(new Error(errorMessage));
        }
      }
    };

    // Pequeño delay para evitar re-renders rápidos
    const timeoutId = setTimeout(() => {
      if (mounted) {
        init();
      }
    }, 100);

    // Cleanup
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      
      const cleanup = async () => {
        try {
          // Detener y cerrar tracks locales
          if (localTracksRef.current) {
            try {
              localTracksRef.current[0].stop();
              localTracksRef.current[0].close();
              localTracksRef.current[1].stop();
              localTracksRef.current[1].close();
            } catch (err) {
              console.error("Error closing tracks:", err);
            }
            localTracksRef.current = null;
          }

          // Limpiar cliente de pantalla compartida
          if (screenClientRef.current) {
            try {
              // Limpiar UID del registro global usando el UID guardado
              const screenUid = screenUidRef.current || (typeof uid === 'number' ? uid + 1000 : parseInt(uid as string) + 1000);
              const uidKey = `${channel}-${screenUid}`;
              activeScreenUIDs.delete(uidKey);
              console.log("🖥️ [CLEANUP] UID", screenUid, "liberado en cleanup del componente");
              
              if (screenTrackRef.current) {
                await screenClientRef.current.unpublish([screenTrackRef.current]);
                screenTrackRef.current.stop();
                screenTrackRef.current.close();
                screenTrackRef.current = null;
              }
              if (screenAudioTrackRef.current) {
                try { await screenClientRef.current.unpublish([screenAudioTrackRef.current]); } catch {}
                try { screenAudioTrackRef.current.stop(); } catch {}
                try { screenAudioTrackRef.current.close(); } catch {}
                screenAudioTrackRef.current = null;
              }
              await screenClientRef.current.leave();
              console.log("✅ [CLEANUP] Screen client cleaned up");
            } catch (err) {
              console.error("Error cleaning up screen client:", err);
            }
            screenClientRef.current = null;
            isJoiningScreenRef.current = false;
            screenUidRef.current = null;
          }

          // Salir del canal principal
          if (clientRef.current) {
            try {
              await clientRef.current.leave();
            } catch (err) {
              console.error("Error leaving channel:", err);
            }
            clientRef.current = null;
          }
        } catch (err) {
          console.error("Error during cleanup:", err);
        }
      };

      // Ejecutar cleanup de forma asíncrona sin bloquear
      cleanup();
    };
  }, [channel, token, appId]);

  // Controlar micrófono y cámara
  useEffect(() => {
    if (localTracksRef.current && role === "host") {
      const [micTrack, camTrack] = localTracksRef.current;
      
      // Controlar micrófono
      if (micTrack) {
        micTrack.setEnabled(micEnabled);
      }
      
      // Controlar cámara
      if (camTrack) {
        camTrack.setEnabled(cameraEnabled);
      }
    }
  }, [micEnabled, cameraEnabled, role]);

  // Manejar compartir pantalla con segundo cliente
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;
    
    const handleScreenShare = async () => {
      if (role !== "host") return;

      try {
        if (screenStream && screenStream.active && screenShareToken && screenShareUid && !screenClientRef.current) {
          // Prevenir múltiples intentos simultáneos
          if (isJoiningScreenRef.current) {
            console.log("⏸️ [BLOCKED] Ya hay un intento de unirse en proceso");
            return;
          }
          
          isJoiningScreenRef.current = true;
          
          // Usar el UID que viene de la prop (ya incluye timestamp)
          const screenUid = screenShareUid;
          const uidKey = `${channel}-${screenUid}`;
          
          // Guardar el UID para usar en cleanup
          screenUidRef.current = screenUid;
          
          console.log("🖥️ [START] Usando UID de pantalla compartida:", screenUid);
          
          // Registrar el UID como en uso
          activeScreenUIDs.add(uidKey);
          console.log("🖥️ [START] UIDs activos:", Array.from(activeScreenUIDs));
          
          console.log("🖥️ [START] Preparando compartir pantalla...");
          console.log("🖥️ [START] Canal:", channel);
          
          try {
            // Esperar un poco más para asegurar que cualquier sesión anterior se haya limpiado en Agora
            await new Promise(resolve => setTimeout(resolve, 500));
            
            if (!mounted) {
              activeScreenUIDs.delete(uidKey);
              isJoiningScreenRef.current = false;
              return;
            }
            
            // Crear segundo cliente para pantalla compartida
            const screenClient = AgoraRTC.createClient({ mode: "live", codec: "vp8" });

            console.log("🖥️ [START] Cliente creado, configurando rol...");
            await screenClient.setClientRole("host");
            
            console.log("🖥️ [START] Uniéndose al canal con UID:", screenUid);
            
            // Unirse al canal con el segundo cliente usando el token de pantalla compartida
            await screenClient.join(appId, channel, screenShareToken, screenUid);
            
            console.log("✅ [START] Unido exitosamente al canal");
            
            if (!mounted) {
              console.log("⚠️ [START] Componente desmontado, saliendo...");
              await screenClient.leave();
              activeScreenUIDs.delete(uidKey);
              isJoiningScreenRef.current = false;
              return;
            }
            
            // Solo establecer la referencia después de unirse exitosamente
            screenClientRef.current = screenClient;
          
            // Crear track de video desde el stream de pantalla
            const screenTrack = await AgoraRTC.createCustomVideoTrack({
              mediaStreamTrack: screenStream.getVideoTracks()[0]
            });
            screenTrackRef.current = screenTrack;

            // Si hay audio del sistema/tab, creamos un track de audio y lo publicamos también
            let screenAudioTrack: any = null;
            const screenAudioMedia = screenStream.getAudioTracks && screenStream.getAudioTracks()[0];
            if (screenAudioMedia) {
              try {
                screenAudioTrack = await AgoraRTC.createCustomAudioTrack({
                  mediaStreamTrack: screenAudioMedia
                });
                screenAudioTrackRef.current = screenAudioTrack;
                console.log("🔊 [START] Audio de pantalla detectado y creado");
              } catch (e) {
                console.warn("⚠️ [START] No se pudo crear track de audio de pantalla:", e);
              }
            } else {
              console.log("ℹ️ [START] No hay pista de audio en el stream de pantalla");
            }

            // Publicar video de la pantalla y, si existe, audio de la pantalla
            const toPublish = screenAudioTrack ? [screenTrack, screenAudioTrack] : [screenTrack];
            await screenClient.publish(toPublish);
            
            // Reorganizar la vista: pantalla grande + cámara flotante
            if (containerRef.current && localTracksRef.current) {
              console.log("🎨 [VIEW] Reorganizando vista para pantalla compartida");
              
              // Limpiar contenido anterior (excepto elementos locales protegidos)
              const children = Array.from(containerRef.current.children);
              children.forEach(child => {
                const el = child as HTMLElement;
                // No eliminar elementos locales que vamos a reusar
                if (el.id !== 'screen-share-container' && el.id !== 'camera-float') {
                  el.remove();
                }
              });
              
              // Contenedor para pantalla compartida (fondo completo)
              let screenContainer = document.getElementById('screen-share-container') as HTMLDivElement;
              if (!screenContainer) {
                screenContainer = document.createElement("div");
                screenContainer.id = "screen-share-container";
                screenContainer.className = "w-full h-full absolute inset-0";
                screenContainer.style.cssText = "background: black; z-index: 0;";
                containerRef.current.appendChild(screenContainer);
              }
              
              console.log("🖥️ [VIEW] Reproduciendo pantalla compartida...");
              screenTrack.play(screenContainer);
              screenContainerRef.current = screenContainer;

              // Contenedor flotante para la cámara
              const [, camTrack] = localTracksRef.current;
              
              console.log("📹 [VIEW] Configurando contenedor flotante para cámara...");
              let cameraFloat = document.getElementById('camera-float') as HTMLDivElement;
              if (!cameraFloat) {
                cameraFloat = document.createElement("div");
                cameraFloat.id = "camera-float";
                cameraFloat.className = "absolute bottom-4 right-4 w-48 h-36 rounded-lg border-2 border-white shadow-2xl overflow-hidden cursor-move";
                cameraFloat.style.cssText = "background: black; z-index: 999; width: 192px; height: 144px;";
                cameraFloat.setAttribute('data-local-camera', 'true'); // Marca como elemento local
                containerRef.current.appendChild(cameraFloat);
                
                // Hacer arrastrable solo la primera vez
                makeDraggable(cameraFloat);
                
                console.log("📹 [VIEW] Contenedor flotante creado");
              } else {
                console.log("📹 [VIEW] Reutilizando contenedor flotante existente");
              }
              
              console.log("📹 [VIEW] Reproduciendo cámara en contenedor flotante...");
              console.log("📹 [VIEW] Estado del track de cámara:", {
                enabled: camTrack.enabled,
                muted: camTrack.muted,
                trackMediaType: camTrack.getMediaStreamTrack()?.kind
              });
              
              // Reproducir en el contenedor
              camTrack.play(cameraFloat);
              cameraContainerRef.current = cameraFloat;
              
              console.log("📹 [VIEW] Cámara reproduciendo en:", cameraFloat.id);
              
              // Verificar que el audio del cliente principal sigue publicado
              const [micTrack, ] = localTracksRef.current;
              console.log("🔊 [AUDIO] Estado del micrófono:", {
                enabled: micTrack.enabled,
                muted: micTrack.muted,
                trackMediaType: micTrack.getMediaStreamTrack()?.kind
              });
              
              if (clientRef.current) {
                const tracks = clientRef.current.localTracks;
                console.log("🔊 [AUDIO] Tracks publicados en cliente principal:", 
                  tracks.map(t => ({ type: t.trackMediaType, enabled: t.enabled }))
                );
              }
              
              // Verificación continua para detectar si desaparece
              const checkInterval = setInterval(() => {
                const cameraEl = document.getElementById('camera-float');
                if (!cameraEl && screenClientRef.current) {
                  console.error("⚠️ [WARNING] Cámara flotante desapareció! Recreando...");
                  clearInterval(checkInterval);
                  // La recrearemos en el próximo ciclo del efecto
                } else if (cameraEl) {
                  const rect = cameraEl.getBoundingClientRect();
                  if (rect.width === 0 || rect.height === 0) {
                    console.warn("⚠️ [WARNING] Cámara flotante tiene dimensiones 0");
                  }
                }
              }, 2000);
              
              // Limpiar intervalo cuando se detenga la pantalla compartida
              setTimeout(() => clearInterval(checkInterval), 60000); // 1 minuto máximo
              
              console.log("✅ [VIEW] Vista reorganizada: pantalla + cámara flotante");
            }

            setIsScreenSharing(true);
            isJoiningScreenRef.current = false;
            console.log("✅ Pantalla compartida activa con segundo cliente");
          } catch (joinErr) {
            // Error al unirse, limpiar el UID del registro
            console.error("❌ Error al unirse al canal:", joinErr);
            activeScreenUIDs.delete(uidKey);
            isJoiningScreenRef.current = false;
            throw joinErr;
          }
        } else if (screenClientRef.current && (!screenStream || !screenStream.active)) {
          // Detener compartir pantalla
          const screenUid = screenUidRef.current || (typeof uid === 'number' ? uid + 1000 : parseInt(uid as string) + 1000);
          const uidKey = `${channel}-${screenUid}`;
          
          console.log("🖥️ [STOP] Deteniendo compartir pantalla con UID:", screenUid);
          
          if (screenTrackRef.current) {
            try {
              await screenClientRef.current.unpublish([screenTrackRef.current]);
            } catch (err) {
              console.error("Error unpublishing:", err);
            }
            screenTrackRef.current.stop();
            screenTrackRef.current.close();
            screenTrackRef.current = null;
          }
          if (screenAudioTrackRef.current) {
            try {
              await screenClientRef.current.unpublish([screenAudioTrackRef.current]);
            } catch (err) {
              console.error("Error unpublishing audio:", err);
            }
            try { screenAudioTrackRef.current.stop(); } catch {}
            try { screenAudioTrackRef.current.close(); } catch {}
            screenAudioTrackRef.current = null;
          }

          try {
            await screenClientRef.current.leave();
            console.log("✅ [STOP] Cliente desconectado del canal");
          } catch (err) {
            console.error("Error leaving channel:", err);
          }
          
          screenClientRef.current = null;
          isJoiningScreenRef.current = false;
          screenUidRef.current = null;
          
          // Esperar para asegurar que Agora libere el UID en el servidor
          console.log("⏳ [STOP] Esperando 1.5s para que Agora libere el UID...");
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Liberar el UID del registro global
          activeScreenUIDs.delete(uidKey);
          console.log("🖥️ [STOP] UID", screenUid, "liberado del registro");

          // Restaurar vista normal
          if (localTracksRef.current && containerRef.current) {
            const [, camTrack] = localTracksRef.current;
            containerRef.current.innerHTML = "";
            const localPlayerContainer = document.createElement("div");
            localPlayerContainer.id = `local-player-${uid}`;
            localPlayerContainer.className = "w-full h-full";
            containerRef.current.appendChild(localPlayerContainer);
            camTrack.play(localPlayerContainer);
          }

          setIsScreenSharing(false);
          console.log("✅ [STOP] Pantalla compartida detenida");
        }
      } catch (err) {
        console.error("❌ [ERROR] Error manejando pantalla compartida:", err);
        
        // Limpiar UID del registro global
        const screenUid = screenUidRef.current || (typeof uid === 'number' ? uid + 1000 : parseInt(uid as string) + 1000);
        const uidKey = `${channel}-${screenUid}`;
        activeScreenUIDs.delete(uidKey);
        console.log("🖥️ [ERROR] UID", screenUid, "liberado después de error");
        screenUidRef.current = null;
        
        // Limpiar en caso de error
        if (screenClientRef.current) {
          try {
            if (screenTrackRef.current) {
              screenTrackRef.current.stop();
              screenTrackRef.current.close();
              screenTrackRef.current = null;
            }
            await screenClientRef.current.leave();
          } catch (cleanupErr) {
            console.error("Error en cleanup después de error:", cleanupErr);
          }
          screenClientRef.current = null;
        }
        isJoiningScreenRef.current = false;
        setIsScreenSharing(false);
      }
    };

    // Debounce para evitar múltiples ejecuciones
    timeoutId = setTimeout(() => {
      if (mounted) {
        handleScreenShare();
      }
    }, 200);
    
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [screenStream, screenShareToken, screenShareUid, role, uid, appId, channel]);

  

  // Función para hacer arrastrable el video flotante
  const makeDraggable = (element: HTMLElement) => {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    element.onmousedown = dragMouseDown;

    function dragMouseDown(e: MouseEvent) {
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }

    function elementDrag(e: MouseEvent) {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      element.style.top = (element.offsetTop - pos2) + "px";
      element.style.left = (element.offsetLeft - pos1) + "px";
      element.style.bottom = "auto";
      element.style.right = "auto";
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  };

  if (error) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="text-red-500 text-center p-4">
          <p className="font-bold mb-2">Error al conectar</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      <div ref={containerRef} className="relative w-full h-full" />
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Conectando...</p>
          </div>
        </div>
      )}
      {role === "host" && isInitialized && (
        <div className="absolute top-4 left-4 flex gap-2">
          {!micEnabled && (
            <div className="bg-red-500 text-white p-2 rounded-full shadow-lg">
              <IconMicrophoneOff size={24} />
            </div>
          )}
          {!cameraEnabled && (
            <div className="bg-red-500 text-white p-2 rounded-full shadow-lg">
              <IconCameraOff size={24} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
