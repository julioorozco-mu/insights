# **Documento de Especificación Funcional (FSD)**

## **Plataforma LMS & Microcredenciales Marca UNACH (Alineado a UI Kit)**

Versión: 2.0 (UI/UX Design Aligned)  
Fecha: 2025-11-19  
Estado: Aprobado para Desarrollo  
Base de Diseño: UI Kit "Skillzone" (Adaptado a identidad UNACH)

## **1\. Propósito del Documento**

Este documento detalla la funcionalidad técnica requerida para replicar con exactitud las interfaces de usuario (UI) proporcionadas por el equipo de diseño. El objetivo es construir una plataforma **Pixel-Perfect** basada en la navegación lateral y los flujos de creación de contenido por bloques.

## **2\. Layout y Navegación General**

**Referencia Visual:** Todas las pantallas.

### **2.1 Sidebar de Navegación (Izquierda)**

A diferencia de la versión anterior, la navegación principal es **lateral, oscura y persistente**.

* **Cabecera:** Logo "Marca UNACH" (reemplazando Skillzone).  
* **Menú Principal:**  
  * Dashboard (Icono Grid).  
  * Courses (Icono Libro).  
  * Teachers / Instructores (Icono Usuario).  
  * Messages (Icono Chat) \+ Badge de notificación.  
  * Analytics (Icono Gráfica).  
  * Payments / Historial (Icono Tarjeta).  
* **Footer Sidebar:**  
  * Support (Ayuda).  
  * Settings (Configuración).

## **3\. Módulos del Estudiante (Frontend)**

### **3.1 Dashboard del Estudiante**

**Referencia Visual:** student-dashboard.jpg

* **Sección "Top courses you may like":** Grid de tarjetas destacadas con botón de "Bookmark" (Favorito), Rating (Estrellas), Nivel (Beginner/Advanced) y Avatar del instructor.  
* **Widget Calendario (Derecha):** Calendario interactivo mensual mostrando días con actividad.  
* **Widget "Upcoming Events":** Lista de próximas lecciones o sesiones (ej. "Business Prospect Analysis").  
* **Widget "Overall Information":** Cards estadísticas con iconos:  
  * Score (Puntos).  
  * Completed Courses (Cantidad).  
  * Total Student (Compañeros).  
  * Total Hours (Horas consumidas).  
  * **Gráfica "Productivity":** Gráfico de barras vertical (Bar Chart) comparando actividad diaria (Mon-Sun) con desglose por categoría (Mentoring, Self Improve).

### **3.2 Búsqueda de Instructores**

**Referencia Visual:** searchs-teachers.jpg

* **Layout:** Lista de tarjetas de instructores.  
* **Teacher Card:**  
  * Avatar, Nombre, Estado de verificación (Blue check).  
  * Badges: "TOP Tutor", "Certified", "High Demand".  
  * Stats rápidas: Lecciones dadas, Cursos creados, Estudiantes.  
  * Precio/Hora (si aplica para tutorías) o Referencia.  
  * Botón: "View Profile" / "View More".

### **3.3 Detalle del Curso (Landing de Venta)**

**Referencia Visual:** buy-course.jpg

* **Cabecera:** Breadcrumbs, Título grande, Rating, Badges.  
* **Columna Izquierda (Contenido):**  
  * Descripción de texto.  
  * **Accordion "Course content":** Lista desplegable de semanas/módulos.  
  * Items de lista con iconos específicos según tipo (Video, Lectura, Quiz).  
* **Columna Derecha (Sticky Card):**  
  * Preview de video/imagen.  
  * Precio (Actual vs Tachado).  
  * Botones: "Buy course now" (Principal), "Send message to teacher" (Secundario).  
  * **Sección "This course includes":** Lista de características con iconos (horas de video, recursos descargables, certificado).  
  * **Widget "Trial":** Toggle para activar "10 min trial course".

### **3.4 Reproductor y Evaluaciones (Quiz Taking)**

**Referencia Visual:** passing-quiz.jpg

* **Header:** Título de la lección y botón "Next lesson".  
* **Layout Dividido:**  
  * **Izquierda (Lista de Preguntas):** Scroll vertical con "Quiz 1", "Quiz 2", etc. Estado visual de seleccionado/respondido.  
  * **Centro (Área de Trabajo):**  
    * Enunciado de la pregunta.  
    * Imagen de contexto (si aplica).  
    * Opciones de respuesta (Tarjetas seleccionables grandes).  
  * **Bottom-Left (Timer):** Cronómetro flotante oscuro (Estilo reloj digital) mostrando el tiempo restante.  
  * **Navegación:** Botones "Finish quiz" y "Next question".

## **4\. Módulos del Instructor & CMS Propio (Backend/Admin)**

### **4.1 Creación de Curso \- Configuración**

**Referencia Visual:** public-course-teachers.jpg

* **Campos:** Título, Descripción (Rich Text simple), Imagen de Portada.  
* **Organizador de Contenido:** Lista reordenable (Drag & Drop) de Semanas/Secciones.  
  * Cada fila tiene botón "Edit" y menú de opciones (...).  
* **Sidebar de Configuración (Derecha):**  
  * Course Status (Published/Draft).  
  * Level (Beginner, etc.).  
  * Tags (Etiquetas con botón de eliminar 'x').  
  * Pricing (Precio y descuento con slider de porcentaje).

### **4.2 Editor de Contenido (Block Builder) \- CRÍTICO**

Referencia Visual: course-creation.jpg  
El CMS interno NO es un simple cuadro de texto. Es un constructor de componentes estilo Notion/Gutenberg.

* **Sidebar "Components" (Izquierda):** Panel de herramientas arrastrables o clickeables:  
  * Image, Gallery, Video.  
  * List, Attachment (Archivos).  
  * Table, Quiz, Case Study.  
* **Canvas Central:**  
  * Renderizado WYSIWYG de los bloques.  
  * Soporte para incrustar videos (con botón de Play overlay).  
  * Listas y tipografía enriquecida.  
* **Panel "Typography & Palette" (Derecha):**  
  * Selector de Fuente, Peso, Alineación.  
  * Paleta de colores para resaltar textos o fondos de bloques.  
* **Course Guide:** Widget flotante para previsualizar estructura.

### **4.3 Creador de Evaluaciones (Quiz Creator)**

**Referencia Visual:** quiz-creation.jpg

* **Selector de Tipo:** Tarjetas para elegir "Multiple Choice", "True/False", "Poll", "Reorder", "Match".  
* **Editor de Pregunta:**  
  * Input de texto.  
  * Toggle "Allow multiple answers".  
  * Lista de opciones con botón de eliminar (basurero) y radio button para marcar la correcta.  
  * "Add explanation" (tooltip).  
* **Bulk Update (Derecha):** Configuración masiva de tiempo y puntos.

## **5\. Módulos de Soporte y Social**

### **5.1 Mensajería (Chat)**

**Referencia Visual:** messages-chat.jpg

* **Lista de Contactos (Izquierda):** Avatar, Nombre, snippet del último mensaje, hora y badge de no leídos.  
* **Área de Chat:**  
  * Cabecera con estado (Online) y botones "Call" / "View Profile".  
  * Burbujas de mensaje (Propios y recibidos).  
  * "System Messages" para notificaciones automáticas (ej. "Booking request sent").  
  * Input de texto con adjuntos y emojis.

### **5.2 Pagos y Configuración**

**Referencia Visual:** payments.jpg

* **Pestañas:** My details, Profile, Password, **Payment details**, Notification.  
* **Tarjetas:** Visualización gráfica de tarjetas de crédito (Visa/Mastercard styling).  
* **Historial:** Tabla de transacciones (Invoice, Date, Status \[Paid/Refunded\], Product, Card).

## **6\. Adaptación de Marca (Brand Guidelines)**

Aunque los diseños dicen "Skillzone", se aplicarán los estilos de **Marca UNACH**:

* **Logo:** Reemplazar cubo 3D por Escudo/Logo UNACH.  
* **Color Primario (Botones/Active States):** Cambiar el Púrpura (\#8A70D6) de los diseños por **Azul UNACH (\#192170)** o **Dorado (\#C5911E)** para acentos, según manual de identidad.  
* **Tipografía:** Mantener Sans-Serif limpia (Inter o similar) como sugieren las imágenes.

## **7\. Requerimientos Técnicos para Soportar UI**

1. **Modelo de Datos de Contenido (JSON):** Para soportar el editor de bloques (course-creation.jpg), el contenido de la lección no puede ser un string HTML simple. Debe guardarse como un array de objetos JSON (ej. \[{ type: 'video', src: '...' }, { type: 'text', content: '...' }\]).  
2. **Websockets:** Para el módulo de chat (messages-chat.jpg) se requiere implementación de Websockets en NestJS (Gateway) \+ Supabase Realtime.  
3. **Drag & Drop Library:** Implementar dnd-kit o react-beautiful-dnd para los organizadores de cursos y componentes.  
4. **Gráficas:** Usar Recharts o Chart.js para la gráfica de productividad del dashboard.