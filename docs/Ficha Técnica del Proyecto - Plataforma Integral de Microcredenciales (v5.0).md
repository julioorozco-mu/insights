# **Ficha Técnica del Proyecto \- Plataforma Integral de Microcredenciales (v5.0)**

Proyecto: Plataforma LMS, Marketplace & Microcredenciales Marca UNACH  
Versión del Documento: 5.0 (Full Scope \- Pixel Perfect Analysis)  
Fecha: 2025-11-19  
Desarrolladores: Ing. Julio Cesar Orozco Espinosa, Ing. Rafael Enrique Guillen Álvarez

## **1\. Introducción**

La Universidad Autónoma de Chiapas (UNACH), a través de Marca UNACH, impulsa la creación de una **Plataforma Híbrida de Educación Digital**. Este sistema trasciende los LMS tradicionales al fusionar tres modelos de negocio en una sola interfaz unificada: **Gestión de Aprendizaje Asíncrono (Videos/Cursos)**, **Marketplace de Tutorías Síncronas (Booking)** y **Certificación Digital (Microcredenciales)**.

Esta versión 5.0 se basa estrictamente en el análisis forense del UI Kit "Skillzone" adaptado a la identidad institucional (Azul \#192170), incorporando módulos avanzados como el "Teacher Classroom" para gestión de agenda, un constructor de cursos basado en bloques (No-Code) y un motor de evaluaciones con reactivos de pensamiento espacial y secuencial.

## **2\. Objetivos Generales del Proyecto**

1. **Unificar Asíncrono y Síncrono:** Permitir que un mismo curso incluya lecciones de video pregrabado y sesiones en vivo gestionadas desde un calendario integrado ("My Classroom").  
2. **Empoderar al Instructor (Teacher Mode):** Implementar un interruptor global "Activate teacher account" que transforme la interfaz de estudiante a panel de instructor sin cerrar sesión.  
3. **CMS de Bloques Rico:** Proveer herramientas de autoría avanzadas (Casos de estudio, Galerías, Tablas, Videos) mediante una interfaz *Drag & Drop* intuitiva.  
4. **Evaluación de Competencias Complejas:** Soportar tipos de preguntas no convencionales (Reordenar, Arrastrar y Soltar, Secuenciación) para validar habilidades prácticas.  
5. **Gestión Financiera Transparente:** Ofrecer a los instructores y estudiantes un desglose detallado de transacciones, facturas y gestión de tarjetas bancarias.  
6. **Identidad Marca UNACH:** Garantizar que toda la experiencia visual respete la paleta institucional (\#192170 / \#3C1970) transmitiendo sobriedad y modernidad.

## **3\. Público Objetivo**

* **Estudiantes (Learners):** Usuarios que consumen contenido, reservan tutorías y coleccionan insignias.  
* **Instructores / Tutores:** Académicos que publican cursos, definen su disponibilidad horaria y monetizan su conocimiento.  
* **Administradores:** Personal de Marca UNACH que verifica perfiles docentes ("Certified"), valida contenidos y supervisa transacciones.  
* **Instituciones Externas:** Entidades que validan las microcredenciales emitidas a través de blockchain/Open Badges.

## **4\. Lineamientos Visuales y de Experiencia de Usuario (UX/UI)**

### **4.1 Estilo General (Dashboard & Classroom)**

Se adopta un diseño de **Sidebar Persistente** que cambia contextualmente según el rol.

* **Modo Estudiante:** Dashboard, Courses, Teachers, Messages, Analytics, Payments.  
* **Modo Instructor:** Dashboard, **My** Classroom (Nuevo), Courses (Manager), Analytics, Payments.

### **4.2 Colorimetría Institucional (Armonía Profunda)**

* **Primary (\#192170 \- Azul UNACH):** Fondos de Sidebar, Botones CTA ("Buy course now", "Create new course"), Textos de cabecera.  
* **Secondary (\#3C1970 \- Índigo/Violeta):** Elementos seleccionados en calendario, estados activos (Active Tab), hovers y acentos visuales.  
* **Functional Colors:**  
  * Verde Esmeralda: "Passed", "Paid", "Top Tutor Badge".  
  * Rojo Suave: "Cancelled", "Missed".  
  * Gris Neutro (\#F3F4F6): Fondo general de la aplicación (Surface).

### **4.3 Componentes de Interfaz Críticos**

* **Teacher Toggle:** Switch en la cabecera para alternar roles instantáneamente.  
* **Classroom Calendar:** Widget de calendario completo con vistas Mensual/Semanal y bloques de tiempo coloreados por tipo de sesión (Lecture, Discussion, Practice).  
* **Course Builder Canvas:** Área de trabajo central con barra lateral de componentes arrastrables (Image, Gallery, Video, List, Table, Quiz, Case Study).

## **5\. Arquitectura del Sistema**

La arquitectura evoluciona para soportar **Eventos de Calendario en Tiempo Real** y **Streaming** de **Datos**.

* **Frontend:** Next.js 16 (App Router) \+ React 19\.  
* **Backend:** NestJS (Arquitectura de Microservicios Monolíticos).  
* **Base de Datos:** PostgreSQL (Supabase) con extensiones para manejo de rangos de tiempo (tsrange) para evitar conflictos en reservas.  
* **Real-time:** WebSockets para notificaciones de "Booking request" y Chat.

## **6\. Stack Tecnológico**

### **6.1 Frontend**

* **Core:** Next.js 16, React 19, TypeScript.  
* **Styling:** Tailwind CSS, Shadcn/UI (Radix UI).  
* **Calendar Engine:** react-big-calendar o FullCalendar (Imprescindible para módulo "My Classroom").  
* **Drag & Drop:** @dnd-kit/core y @dnd-kit/sortable (Para CMS de bloques y preguntas de reordenar).  
* **Rich Text:** TipTap (Headless WYSIWYG).  
* **Charts:** Recharts (Gráficas de productividad).

### **6.2 Backend**

* **Runtime:** Node.js (NestJS framework).  
* **ORM:** Prisma (Manejo de esquemas complejos JSONB para bloques de cursos).  
* **Validation:** Zod (Validación estricta de tipos de preguntas y estructura de cursos).  
* **Payment Processing:** Integración simulada o real (Stripe/PayPal) vía Webhooks.

## **7\. Modelo Académico \- Dominios Funcionales**

1. **Gestión de Contenido (LMS):** Curso, Sección, Lección, Bloque de Contenido (JSON polimórfico).  
2. **Evaluación (Assessment):** Quiz, Banco de Preguntas (Tipos: Opción Múltiple, V/F, Poll, Reorder, Match, Drag\&Drop, Sequencing), Intento, Resultado.  
3. **Agenda (Classroom):** Disponibilidad (AvailabilitySlot), Reserva (Booking), Sesión (SessionType: Lecture, Discussion, Practice).  
4. **Mercado (Marketplace):** Perfil Instructor (Tarifa/hr, Bio, Specs), Reseña (Review), Transacción (Order, Invoice).  
5. **Social:** Conversación, Mensaje, Archivo Adjunto.  
6. **Certificación:** Plantilla de Insignia, Insignia Emitida (Open Badge v3.0).

## **8\. Flujos Operativos Críticos**

### **8.1 Publicación de Curso (Teacher)**

1. Instructor define "Basic Info" y precio.  
2. Usa el **Block Builder** para arrastrar componentes multimedia y casos de estudio.  
3. Configura cuestionarios con preguntas complejas (ej. "Ordenar cronológicamente").  
4. Publica y el curso aparece en el Marketplace.

### **8.2 Flujo de Reserva (Student \-\> Teacher)**

1. Estudiante explora "Teachers", filtra por especialidad y precio.  
2. Accede al perfil, revisa disponibilidad en "Schedule".  
3. Selecciona un slot libre \-\> Paga la sesión.  
4. Se genera un evento en "My Classroom" del instructor y una notificación en Chat.

### **8.3 Toma de Evaluaciones**

1. Estudiante inicia Quiz.  
2. Interfaz presenta preguntas una por una o en lista (según config).  
3. Interactúa (arrastra elementos, selecciona opciones).  
4. Al finalizar, recibe retroalimentación inmediata ("You've answered right 4 out of 6").

## **9\. Infraestructura**

* **Hosting:** Vercel (Frontend & Serverless Functions).  
* **Database:** Supabase (PostgreSQL Managed).  
* **Storage:** Supabase Storage (Assets protegidos por RLS).  
* **CDN:** Caching en el borde para entrega rápida de videos e imágenes.

## **10\. Seguridad Institucional**

* **Role-Based Access Control (RBAC):** Permisos granulares. El "Teacher Mode" solo activa funcionalidades de edición si el usuario tiene el rol INSTRUCTOR verificado.  
* **Protección de Contenido:** Las lecciones pagas solo son accesibles si existe un registro válido en la tabla Enrollment.  
* **Privacidad de Datos:** Los datos de pago (tarjetas) no se almacenan localmente; se usa tokenización.

## **11\. Checklist Operativo**

* \[ \] Configuración de colores institucionales en Tailwind.  
* \[ \] Implementación de la Sidebar Colapsable/Responsive.  
* \[ \] Desarrollo del componente "Course Card" y "Teacher Card".  
* \[ \] Integración de librería de Calendario.  
* \[ \] Desarrollo del motor de bloques para el CMS.  
* \[ \] Configuración de WebSockets para Chat.

## **12\. Ventajas Estratégicas**

* **Modelo de Negocio Dual:** Ingresos por venta de contenido estático (Cursos) y comisiones por servicios en vivo (Tutorías).  
* **Fidelización:** Las herramientas sociales (Chat, Perfiles) crean comunidad.  
* **Flexibilidad Pedagógica:** El soporte para evaluaciones complejas permite certificar habilidades reales, no solo memoria.

## **13\. Visión a Futuro**

* **AI Assistant:** Bot en el chat para agendar automáticamente según disponibilidad.  
* **Videoconferencia Nativa:** Integración de Jitsi o Zoom dentro de la plataforma para las sesiones de "My Classroom".  
* **Mobile App:** Versión nativa en React Native.  
* **IA Generativa:** Asistente para crear preguntas de examen basadas en el contenido de la lección.  
* **Blockchain:** Hashing de certificados en una cadena pública para inmutabilidad eterna.  
* **Multi-tenant:** Capacidad de ofrecer la plataforma como SaaS a otras facultades o instituciones (preparar esquemas de DB para organization\_id).

## **14\. Conclusión**

La Plataforma v5.0 de Marca UNACH es un ecosistema educativo robusto y moderno. Al replicar la fidelidad visual y funcional del UI Kit "Skillzone", la universidad se dota de una herramienta competitiva a nivel global, capaz de gestionar todo el ciclo de vida del aprendizaje: desde el descubrimiento y la compra, pasando por el consumo y la interacción en vivo, hasta la certificación verificable.

# **Roadmap de Desarrollo (Cronograma de Ejecución)**

Este plan de trabajo está diseñado para construir la plataforma capa por capa, asegurando que los cimientos (Auth, DB, UI Core) estén sólidos antes de añadir complejidad (Booking, CMS Avanzado).

### **Fase 1: Fundamentos y UI System (Semanas 1-3)**

* **Objetivo:** Tener la "cáscara" visual y la autenticación listas.  
* **Tareas:**  
  * Inicializar proyecto Next.js 16 \+ Tailwind.  
  * Configurar paleta de colores \#192170 / \#3C1970.  
  * Implementar **Sidebar Navigation** y Layouts (Student vs Teacher).  
  * Configurar Supabase Auth y Tablas Base (Users, Profiles).  
  * Desarrollar componentes UI atómicos (Botones, Inputs, Cards).

### **Fase 2: CMS "Course Builder" (Núcleo del Instructor) (Semanas 4-7)**

* **Objetivo:** Permitir la creación de cursos ricos en contenido.  
* **Tareas:**  
  * Integrar editor de texto rico (TipTap).  
  * Implementar **Drag & Drop** para bloques de contenido (Video, Texto, Imagen).  
  * Desarrollar formulario de "Creación de Curso" (Info básica, Precio, Tags).  
  * Configurar subida de archivos a Supabase Storage.

### **Fase 3: LMS y Motor de Evaluaciones (Semanas 8-11)**

* **Objetivo:** Que el estudiante pueda consumir cursos y evaluarse.  
* **Tareas:**  
  * Vista de "Detalle de Curso" (Landing Page del curso).  
  * Reproductor de Lecciones (Video Player \+ Navegación de contenido).  
  * **Motor de Quizzes:** Implementar tipos de pregunta (Opción múltiple, V/F).  
  * **Quizzes Avanzados:** Implementar "Drag and Drop" y "Reorder" questions.  
  * Lógica de Progreso y Emisión de Insignias.

### **Fase 4: Marketplace y Perfiles (Semanas 12-14)**

* **Objetivo:** Descubrimiento y Venta.  
* **Tareas:**  
  * Buscador de Cursos y Profesores con filtros.  
  * Página de Perfil Público del Instructor (Bio, Stats, Reviews).  
  * Carrito de compras / Pasarela de Pagos (Simulación/Integración).  
  * Historial de Pedidos y Facturas.

### **Fase 5: Sistema de Reservas "My Classroom" (Semanas 15-18)**

* **Objetivo:** Gestión de tutorías síncronas.  
* **Tareas:**  
  * Integración de **Calendario Interactivo**.  
  * Lógica de disponibilidad (Slots libres/ocupados).  
  * Flujo de reserva (Estudiante selecciona slot \-\> Paga \-\> Confirma).  
  * Dashboard "My Classroom" para ver agenda semanal.

### **Fase 6: Social y Chat (Semanas 19-20)**

* **Objetivo:** Comunicación en tiempo real.  
* **Tareas:**  
  * Sistema de Chat 1 a 1 (WebSockets).  
  * Notificaciones en tiempo real (Nueva reserva, Mensaje recibido).  
  * Envío de archivos adjuntos en chat.

### **Fase 7: Pulido, QA y Despliegue (Semanas 21-22)**

* **Objetivo:** Lanzamiento a producción.  
* **Tareas:**  
  * Pruebas de carga y estrés.  
  * Optimización de imágenes y SEO.  
  * Revisión de seguridad (RLS policies).  
  * Despliegue final en