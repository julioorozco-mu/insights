/**
 * Componentes del LessonPlayer
 *
 * Los tabs de Q&A y Notas se cargan dinámicamente con next/dynamic
 * para reducir el bundle inicial.
 */

// Componentes comunes (cargados siempre)
export * from './common';

// Los tabs se exportan desde sus respectivas carpetas
// pero se importan con next/dynamic en el page.tsx
// export { default as QuestionsTab } from './QuestionsTab';
// export { default as NotesTab } from './NotesTab';
