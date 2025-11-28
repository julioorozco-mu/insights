# 🚀 Quick Start - Agora Live Streaming

## ✅ Migración Completada

La plataforma ha sido **migrada exitosamente de Mux a Agora.io**. Ahora puedes hacer transmisiones en vivo directamente desde el navegador.

---

## 📋 Pasos Rápidos para Empezar

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Variables de Entorno

Crea o actualiza tu archivo `.env.local`:

```bash
# Firebase (ya configurado)
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxx

# Agora (NUEVO - necesitas configurar)
AGORA_APP_ID=tu_app_id_aqui
AGORA_APP_CERTIFICATE=tu_app_certificate_aqui
NEXT_PUBLIC_AGORA_APP_ID=tu_app_id_aqui

# General
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Obtener Credenciales de Agora

1. Ve a [Agora Console](https://console.agora.io/)
2. Crea una cuenta (gratis)
3. Crea un proyecto
4. Copia el **APP ID**
5. Habilita y copia el **APP Certificate**
6. Pégalos en `.env.local`

**Guía detallada:** [AGORA_SETUP.md](./AGORA_SETUP.md)

### 4. Iniciar la Aplicación

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## 🎥 Cómo Usar las Transmisiones en Vivo

### Como Ponente (Instructor)

1. **Crear transmisión**
   - Dashboard → Live Streams → Crear nueva
   
2. **Iniciar transmisión**
   - Entrar a la transmisión creada
   - Permitir acceso a cámara/micrófono
   - ¡Listo! Ya estás en vivo

3. **Finalizar transmisión**
   - Clic en "Finalizar Transmisión"

### Como Estudiante

1. **Ver transmisiones activas**
   - Dashboard → Live Streams
   - Ver transmisiones con badge "EN VIVO"

2. **Unirse a transmisión**
   - Clic en la transmisión
   - El video se carga automáticamente

3. **Interactuar**
   - Usar chat en tiempo real
   - Participar en encuestas

---

## 📚 Documentación Completa

- **[AGORA_SETUP.md](./AGORA_SETUP.md)** - Configuración detallada de Agora
- **[LIVE_STREAMING_GUIDE.md](./LIVE_STREAMING_GUIDE.md)** - Guía completa de uso
- **[AGORA_EXAMPLES.md](./AGORA_EXAMPLES.md)** - Ejemplos de código
- **[MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md)** - Resumen de la migración

---

## 🔧 Solución de Problemas

### "Agora credentials not configured"

**Solución:**
1. Verifica que las variables estén en `.env.local`
2. Reinicia el servidor: `npm run dev`

### No se activa la cámara

**Solución:**
1. Verifica permisos del navegador
2. Debe estar en HTTPS o localhost
3. Revisa la consola del navegador para errores

### "Invalid token"

**Solución:**
1. Verifica que `AGORA_APP_CERTIFICATE` sea correcto
2. El token expira en 1 hora - recarga la página

---

## ✨ Ventajas de Agora

| Antes (Mux) | Ahora (Agora) |
|-------------|---------------|
| Requiere OBS | Solo navegador |
| 10-30 seg latencia | 1-3 seg latencia |
| Complejo | Simple |
| $$ | Plan gratuito |

---

## 🎯 Próximos Pasos

1. ✅ **Configurar Agora** (ver arriba)
2. ✅ **Probar transmisión** como ponente
3. ✅ **Probar visualización** como estudiante
4. 📖 **Leer documentación** para funciones avanzadas

---

## 🆘 ¿Necesitas Ayuda?

- **Configuración de Agora:** [AGORA_SETUP.md](./AGORA_SETUP.md)
- **Ejemplos de código:** [AGORA_EXAMPLES.md](./AGORA_EXAMPLES.md)
- **Documentación oficial:** [Agora Docs](https://docs.agora.io/)

---

## 📊 Estado del Proyecto

- ✅ Migración de Mux a Agora completada
- ✅ Componentes actualizados
- ✅ API routes actualizadas
- ✅ Tipos actualizados
- ✅ Build exitoso
- ⚠️ **Pendiente:** Configurar credenciales de Agora

---

**¡Listo para transmitir en vivo!** 🎉

Sigue los pasos arriba y estarás transmitiendo en minutos.
