# **Contexto Técnico para Desarrollo: Plataforma LMS & Microcredenciales Marca UNACH (v5.0)**

ID del Proyecto: UNACH-LMS-MARKETPLACE-V5  
Referencia Visual: UI Kit "Skillzone" (Adaptado a identidad UNACH)  
Desarrolladores: Ing. Julio Cesar Orozco Espinosa, Ing. Rafael Enrique Guillen Álvarez  
Fecha de Actualización: 2025-11-19

## **1\. Visión General del Producto**

Este proyecto consiste en el desarrollo de una **Plataforma Híbrida de Educación Digital** para la Universidad Autónoma de Chiapas. El sistema unifica tres verticales de negocio en una sola Single Page Application (SPA):

1. **LMS Asíncrono:** Consumo de video cursos y recursos estáticos.  
2. **Marketplace de Tutorías (Síncrono):** Agenda ("Booking") de sesiones en vivo con instructores.  
3. **Sistema de Microcredenciales:** Emisión de insignias digitales verificables.

**Directriz Principal:** La plataforma debe replicar la experiencia de usuario (UX) del UI Kit "Skillzone", adaptando estrictamente la paleta de colores a la identidad institucional de la UNACH.

## **2\. Especificaciones de UI/UX (Design Tokens)**

El asistente debe forzar el uso de estas variables en Tailwind CSS y componentes de UI.

### **2.1. Paleta de Colores (Strict Mode)**

* **Primary (Brand Core):** \#192170 (Azul UNACH Profundo).  
  * *Uso:* Sidebar de navegación (fondo), Botones primarios (CTA), Encabezados principales.  
* **Secondary / Accent:** \#3C1970 (Índigo/Violeta Institucional).  
  * *Uso:* Elementos seleccionados en calendario, estados :hover, bordes de inputs activos, iconos destacados.  
* **Functional Success:** \#10B981 (Verde Esmeralda).  
  * *Uso:* Indicadores de "Aprobado", "Pagado", "Verificado", Checks de respuestas correctas.  
* **Functional Error/Alert:** \#EF4444 (Rojo Suave).  
  * *Uso:* "Cancelado", "Fallido", "Respuesta Incorrecta".  
* **Background Surface:** \#F1F5F9 (Gris Pálido \- Slate 100).  
  * *Uso:* Fondo general de la aplicación (detrás de las tarjetas).  
* **Card Surface:** \#FFFFFF (Blanco Puro).  
  * *Uso:* Contenedores de contenido, paneles, modales.

### **2.2. Tipografía**

* **Familia Principal:** Plus Jakarta Sans o Inter.  
* **Jerarquía:**  
  * H1/H2: Bold (700), Color \#192170.  
  * Body: Regular (400) / Medium (500), Color \#1E293B (Slate 800).  
  * Subtitles/Meta: Regular, Color \#64748B (Slate 500).

### **2.3. Componentes Estructurales (Layout)**

* **Persistent Sidebar:** Barra lateral izquierda fija (color \#192170).  
  * *Items:* Dashboard, Courses, Teachers/Classroom, Messages, Analytics, Payments, Settings.  
* **Teacher Toggle Switch:** Interruptor en la cabecera o sidebar que cambia el estado global de la app (isTeacherMode).  
  * *Estado OFF:* Muestra vista de Estudiante (Comprar, Aprender).  
  * *Estado ON:* Muestra vista de Instructor (Vender, Enseñar, Gestionar Agenda).

## **3\. Stack Tecnológico (Reglas de Implementación)**

* **Frontend Framework:** Next.js 16 (App Router).  
* **Lenguaje:** TypeScript (Strict Mode).  
* **Estilos:** Tailwind CSS \+ Shadcn/UI (Radix UI primitives).  
* **Backend:** NestJS (Microservicios monolíticos) o Serverless Functions de Next.js (según preferencia de despliegue).  
* **Base de Datos:** Supabase (PostgreSQL).  
* **Auth:** Supabase Auth (Soporte para Roles: student, instructor, admin).  
* **State Management:** Zustand o React Context (para manejar el estado del TeacherMode).  
* **Librerías Críticas:**  
  * react-big-calendar o fullcalendar: Para el módulo "My Classroom".  
  * @dnd-kit/core: Para el constructor de cursos y preguntas de reordenamiento.  
  * recharts: Para analíticas de instructores.  
  * tiptap: Editor de texto rico para creación de contenido.

## **4\. Módulos Funcionales Detallados**

### **4.1. Módulo "Teacher Classroom" (Gestión Síncrona)**

Este módulo es exclusivo para el rol de instructor.

* **Vista de Calendario:**  
  * Debe mostrar una rejilla semanal/mensual.  
  * **Bloques de Disponibilidad:** El profesor define "Slots" (ej. Lunes 9:00 \- 11:00).  
  * **Bloques de Sesiones:** Las reservas de los alumnos aparecen como tarjetas de colores (ej. Azul para "Lecture", Violeta \#3C1970 para "Discussion").  
* **Lógica de Negocio:**  
  * No permitir solapamiento de horarios (overlap check).  
  * Integración visual con zonas horarias.

### **4.2. Módulo "Course Builder" (CMS No-Code)**

Constructor visual para crear cursos asíncronos.

* **Arquitectura de Bloques:** El contenido de una lección se guarda como un JSON Array de bloques.  
* **Tipos de Bloques Soportados:**  
  1. Text (Rich Text).  
  2. Video (Embed/Upload).  
  3. Image/Gallery.  
  4. Attachment (PDF descargable).  
  5. Quiz (Bloque de evaluación incrustado).  
* **Interacción:** Drag & drop para reordenar bloques dentro de una lección.

### **4.3. Motor de Evaluaciones (Assessment Engine)**

Sistema robusto para validación de conocimientos.

* **Tipos de Reactivos:**  
  * *Standard:* Opción Múltiple, Verdadero/Falso.  
  * *Advanced:*  
    * **Reorder:** El usuario arrastra items para ordenar una secuencia cronológica o lógica.  
    * **Match:** Relacionar columnas.  
* **Feedback Visual:**  
  * Al enviar, marcar respuestas correctas en Verde (\#10B981) e incorrectas en Rojo.  
  * Barra de progreso circular o lineal indicando % completado.

### **4.4. Marketplace & Checkout**

* **Teacher Profile:** Página pública con Bio, Stats (estudiantes, cursos), y listado de cursos.  
* **Checkout Flow:**  
  * Carrito de compras simple.  
  * Gestión de Tarjetas (Guardar método de pago tokenizado).  
  * Historial de transacciones con estado (Paid, Refunded, Cancelled).

## **5\. Modelo de Datos (Schema Overview)**

Estructura relacional sugerida para PostgreSQL (Supabase):

* users: (id, email, role, full\_name, avatar\_url)  
* profiles\_instructor: (user\_id, bio, hourly\_rate, availability\_json)  
* courses: (id, instructor\_id, title, price, status, cover\_image)  
* course\_modules: (id, course\_id, title, order\_index)  
* lessons: (id, module\_id, type, content\_blocks\_json)  
* bookings: (id, student\_id, instructor\_id, start\_time, end\_time, status)  
* enrollments: (id, user\_id, course\_id, progress\_percentage, certificate\_id)

## **6\. Roadmap de Ejecución (Fases)**

Utilizar este orden para la generación de código:

1. **Fase 0: Setup & UI System.** Configurar Tailwind con colores \#192170 / \#3C1970. Crear Layout Shell (Sidebar).  
2. **Fase 1: Auth & Roles.** Implementar Login y el "Teacher Toggle".  
3. **Fase 2: Course Builder.** Crear el editor Drag & Drop.  
4. **Fase 3: LMS Player & Quizzes.** Vista del estudiante y motor de evaluación.  
5. **Fase 4: Classroom & Booking.** Integración del calendario interactivo.  
6. **Fase 5: Marketplace & Payments.** Catálogo público y flujo de pago.

## **7\. Instrucciones para el Asistente (Prompt System)**

* Al generar vistas, siempre verificar que el Sidebar esté presente y colapsable en móvil.  
* Al generar componentes de Calendario, asegurar que los eventos usen el color secundario \#3C1970 para resaltar.  
* En formularios, usar validación en tiempo real (Zod).  
* Para iconos, utilizar lucide-react o font-awesome que encajen con el estilo "SaaS moderno".