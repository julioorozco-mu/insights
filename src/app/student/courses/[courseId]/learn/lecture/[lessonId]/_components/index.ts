/**
 * Componentes del LessonPlayer
 *
 * Arquitectura de Tabs (Lazy Loading):
 * - OverviewTab: Descripción y recursos de la lección
 * - QuestionsTab: Preguntas y respuestas (Q&A)
 * - NotesTab: Notas personales del estudiante
 *
 * Los tabs se cargan dinámicamente con next/dynamic en page.tsx
 * para reducir el bundle inicial y mejorar el tiempo de carga.
 */

// Componentes comunes (cargados siempre)
export * from './common';

// Nota: Los tabs se importan con next/dynamic en page.tsx:
// - OverviewTab: import('./OverviewTab')
// - QuestionsTab: import('./QuestionsTab')
// - NotesTab: import('./NotesTab')
