# INSTRUCCIONES DE REFACTORIZACIÓN: LessonPlayer Q&A + Notes
## Para implementación por LLM Code Assistant

---

## CONTEXTO DEL PROYECTO

**Sistema**: Insights LMS (NextJS 14 + Supabase)
**Componente**: LessonPlayer (página de visualización de lecciones)
**Problema actual**: 
- Mega-componente de ~4000 líneas en `page.tsx`
- Todo el código de Q&A y Notas se carga inicialmente aunque el usuario no los use
- Re-renders innecesarios al escribir en inputs
- Vulnerabilidad de seguridad (IDOR) en endpoints API

**Objetivo**: Refactorizar siguiendo arquitectura modular, code-splitting, y seguridad mejorada.

---

## FASE 1: SEGURIDAD API (CRÍTICO - HACER PRIMERO)

### 1.1 MIGRAR ENDPOINTS A AUTENTICACIÓN SEGURA

**Archivos a modificar**:
- `src/app/api/student/lessons/[id]/questions/route.ts`
- `src/app/api/student/lessons/[id]/notes/route.ts`

**Cambios requeridos**:

```typescript
// ❌ ELIMINAR (código inseguro actual):
import { createClient } from '@/utils/supabase/server';
const supabaseAdmin = createClient(); // service role
const { userId } = await request.json(); // NO confiar en cliente

// ✅ REEMPLAZAR con (código seguro):
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  // 1. Autenticar con sesión del usuario
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Usar RLS automáticamente (NO usar admin client)
  const { data, error } = await supabase
    .from('lesson_notes') // o 'lesson_questions'
    .select('id, content, video_timestamp, created_at')
    .eq('lesson_id', params.id)
    .order('video_timestamp', { ascending: true })
    .limit(50); // Paginación forzada

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ notes: data });
}
```

**Reglas de seguridad**:
1. NUNCA usar `getSupabaseAdmin()` en endpoints `/api/student/*`
2. SIEMPRE autenticar con `supabase.auth.getUser()`
3. SIEMPRE usar límites (`.limit()`) en queries
4. Dejar que RLS maneje permisos automáticamente

---

### 1.2 IMPLEMENTAR RATE LIMITING (OPCIONAL PERO RECOMENDADO)

**Crear archivo**: `src/lib/rate-limit.ts`

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Requiere Upstash Redis (opcional)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const rateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 requests por minuto
  analytics: true,
});

// Uso en endpoints:
const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
const { success } = await rateLimit.limit(ip);
if (!success) {
  return Response.json({ error: 'Too many requests' }, { status: 429 });
}
```

---

## FASE 2: CODE SPLITTING Y ARQUITECTURA MODULAR

### 2.1 ESTRUCTURA DE ARCHIVOS NUEVA

**Crear esta estructura**:

```
src/app/student/lessons/[id]/
├── page.tsx (Shell principal - ~100 líneas)
├── _components/
│   ├── LessonPlayer.tsx (Video + controles)
│   ├── LessonDescription.tsx (Tab Overview)
│   ├── QuestionsTab/
│   │   ├── index.tsx (Componente principal - lazy loaded)
│   │   ├── QuestionCard.tsx
│   │   ├── QuestionComposer.tsx
│   │   ├── AnswerCard.tsx
│   │   └── hooks/
│   │       ├── useQuestions.ts
│   │       └── useAnswers.ts
│   └── NotesTab/
│       ├── index.tsx (Componente principal - lazy loaded)
│       ├── NoteCard.tsx
│       ├── NoteComposer.tsx
│       └── hooks/
│           └── useNotes.ts
└── loading.tsx (Skeleton de carga)
```

---

### 2.2 IMPLEMENTAR SHELL PRINCIPAL (page.tsx)

**Archivo**: `src/app/student/lessons/[id]/page.tsx`

```typescript
'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { LessonPlayer } from './_components/LessonPlayer';
import { LessonDescription } from './_components/LessonDescription';

// ✅ Lazy loading de tabs pesados
const QuestionsTab = dynamic(
  () => import('./_components/QuestionsTab'),
  { 
    loading: () => <TabSkeleton />,
    ssr: false // No SSR para tabs interactivos
  }
);

const NotesTab = dynamic(
  () => import('./_components/NotesTab'),
  { 
    loading: () => <TabSkeleton />,
    ssr: false
  }
);

export default function LessonPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'notes'>('overview');
  
  return (
    <div className="container mx-auto">
      {/* Video Player (siempre visible) */}
      <LessonPlayer lessonId={params.id} />
      
      {/* Tabs */}
      <div className="mt-6">
        {/* Tab Headers */}
        <div className="tabs tabs-bordered">
          <button 
            className={`tab ${activeTab === 'overview' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Descripción General
          </button>
          <button 
            className={`tab ${activeTab === 'questions' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('questions')}
          >
            Preguntas y Respuestas
          </button>
          <button 
            className={`tab ${activeTab === 'notes' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            Mis Notas
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === 'overview' && <LessonDescription lessonId={params.id} />}
          {activeTab === 'questions' && <QuestionsTab lessonId={params.id} />}
          {activeTab === 'notes' && <NotesTab lessonId={params.id} />}
        </div>
      </div>
    </div>
  );
}

function TabSkeleton() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-32 w-full"></div>
      <div className="skeleton h-24 w-full"></div>
      <div className="skeleton h-24 w-full"></div>
    </div>
  );
}
```

**Reglas**:
- ❌ NO incluir lógica de Q&A/Notas en `page.tsx`
- ✅ Usar `next/dynamic` con `ssr: false` para tabs
- ✅ Solo renderizar tab activo (no pre-renderizar)
- ✅ Loading skeleton mientras carga el tab

---

### 2.3 IMPLEMENTAR QuestionsTab

**Archivo**: `src/app/student/lessons/[id]/_components/QuestionsTab/index.tsx`

```typescript
'use client';

import { useState } from 'react';
import { QuestionComposer } from './QuestionComposer';
import { QuestionCard } from './QuestionCard';
import { useQuestions } from './hooks/useQuestions';

interface QuestionsTabProps {
  lessonId: string;
}

export default function QuestionsTab({ lessonId }: QuestionsTabProps) {
  const { questions, loading, error, refetch } = useQuestions(lessonId);
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');

  if (loading) {
    return <div className="loading loading-spinner loading-lg"></div>;
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  const sortedQuestions = [...questions].sort((a, b) => {
    if (sortBy === 'popular') {
      return b.upvotes - a.upvotes;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-6">
      {/* Composer */}
      <QuestionComposer 
        lessonId={lessonId} 
        onSuccess={refetch}
      />

      {/* Filters */}
      <div className="flex gap-2">
        <button
          className={`btn btn-sm ${sortBy === 'recent' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setSortBy('recent')}
        >
          Más recientes
        </button>
        <button
          className={`btn btn-sm ${sortBy === 'popular' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setSortBy('popular')}
        >
          Más populares
        </button>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {sortedQuestions.map((question) => (
          <QuestionCard 
            key={question.id} 
            question={question}
            onUpdate={refetch}
          />
        ))}

        {sortedQuestions.length === 0 && (
          <div className="text-center text-base-content/60 py-8">
            No hay preguntas aún. ¡Sé el primero en preguntar!
          </div>
        )}
      </div>
    </div>
  );
}
```

**Reglas**:
- ✅ Estado local de tab (no compartido con padre)
- ✅ Sorting en cliente (no afecta queries)
- ✅ `React.memo` en `QuestionCard` (ver siguiente sección)

---

### 2.4 IMPLEMENTAR QuestionCard CON LAZY LOADING DE RESPUESTAS

**Archivo**: `src/app/student/lessons/[id]/_components/QuestionsTab/QuestionCard.tsx`

```typescript
'use client';

import { useState, memo } from 'react';
import { AnswerCard } from './AnswerCard';
import { useAnswers } from './hooks/useAnswers';

interface QuestionCardProps {
  question: {
    id: string;
    question_text: string;
    upvotes: number;
    answer_count: number;
    is_resolved: boolean;
    created_at: string;
    student: {
      full_name: string;
      avatar_url?: string;
    };
  };
  onUpdate: () => void;
}

// ✅ React.memo para evitar re-renders innecesarios
export const QuestionCard = memo(function QuestionCard({ 
  question, 
  onUpdate 
}: QuestionCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  // ✅ Lazy loading: solo fetch cuando se expande
  const { answers, loading, error } = useAnswers(
    question.id, 
    expanded // Solo fetch si expanded = true
  );

  const handleExpand = () => {
    setExpanded(!expanded);
  };

  return (
    <div className="card bg-base-100 border">
      <div className="card-body">
        {/* Question Header */}
        <div className="flex items-start gap-3">
          {/* Upvote Button */}
          <VoteButton 
            votes={question.upvotes}
            questionId={question.id}
            onVote={onUpdate}
          />

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="avatar">
                <div className="w-8 rounded-full">
                  <img src={question.student.avatar_url || '/default-avatar.png'} />
                </div>
              </div>
              <span className="font-medium">{question.student.full_name}</span>
              <span className="text-sm text-base-content/60">
                {new Date(question.created_at).toLocaleDateString('es-MX')}
              </span>
            </div>

            <p className="text-base">{question.question_text}</p>

            {/* Expand Button */}
            <button 
              onClick={handleExpand}
              className="btn btn-sm btn-ghost mt-2"
            >
              {expanded ? '▲' : '▼'} {question.answer_count} respuestas
            </button>
          </div>
        </div>

        {/* Answers (lazy loaded) */}
        {expanded && (
          <div className="mt-4 pl-12 space-y-3 border-l-2 border-base-300">
            {loading && <div className="loading loading-spinner"></div>}
            
            {error && <div className="alert alert-error">{error}</div>}
            
            {answers?.map((answer) => (
              <AnswerCard 
                key={answer.id} 
                answer={answer}
                onUpdate={onUpdate}
              />
            ))}

            {/* Answer Composer */}
            <AnswerComposer 
              questionId={question.id}
              onSuccess={onUpdate}
            />
          </div>
        )}
      </div>
    </div>
  );
});
```

**Reglas críticas**:
- ✅ `React.memo` para evitar re-renders
- ✅ Lazy loading de respuestas SOLO al expandir
- ✅ `useAnswers` hook con conditional fetching
- ❌ NO fetch todas las respuestas al cargar preguntas

---

### 2.5 IMPLEMENTAR CUSTOM HOOKS

**Archivo**: `src/app/student/lessons/[id]/_components/QuestionsTab/hooks/useQuestions.ts`

```typescript
'use client';

import { useState, useEffect } from 'react';

interface Question {
  id: string;
  question_text: string;
  upvotes: number;
  answer_count: number;
  is_resolved: boolean;
  created_at: string;
  student: {
    full_name: string;
    avatar_url?: string;
  };
}

export function useQuestions(lessonId: string) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/student/lessons/${lessonId}/questions`);
      
      if (!response.ok) {
        throw new Error('Error al cargar preguntas');
      }

      const data = await response.json();
      setQuestions(data.questions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [lessonId]);

  return {
    questions,
    loading,
    error,
    refetch: fetchQuestions,
  };
}
```

**Archivo**: `src/app/student/lessons/[id]/_components/QuestionsTab/hooks/useAnswers.ts`

```typescript
'use client';

import { useState, useEffect } from 'react';

interface Answer {
  id: string;
  answer_text: string;
  upvotes: number;
  is_instructor_answer: boolean;
  is_accepted: boolean;
  created_at: string;
  user: {
    full_name: string;
    avatar_url?: string;
  };
}

export function useAnswers(questionId: string, enabled: boolean) {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ✅ Solo fetch si enabled = true (expanded)
    if (!enabled) {
      return;
    }

    const fetchAnswers = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/student/questions/${questionId}/answers`);
        
        if (!response.ok) {
          throw new Error('Error al cargar respuestas');
        }

        const data = await response.json();
        setAnswers(data.answers || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchAnswers();
  }, [questionId, enabled]);

  return { answers, loading, error };
}
```

**Reglas**:
- ✅ Separar lógica de fetching en hooks
- ✅ Conditional fetching en `useAnswers` (solo si `enabled`)
- ✅ Manejo de errores consistente

---

### 2.6 IMPLEMENTAR NotesTab (SIMILAR A QuestionsTab)

**Archivo**: `src/app/student/lessons/[id]/_components/NotesTab/index.tsx`

```typescript
'use client';

import { useState } from 'react';
import { NoteComposer } from './NoteComposer';
import { NoteCard } from './NoteCard';
import { useNotes } from './hooks/useNotes';

interface NotesTabProps {
  lessonId: string;
}

export default function NotesTab({ lessonId }: NotesTabProps) {
  const { notes, loading, error, refetch } = useNotes(lessonId);

  if (loading) {
    return <div className="loading loading-spinner loading-lg"></div>;
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Composer */}
      <NoteComposer 
        lessonId={lessonId} 
        onSuccess={refetch}
      />

      {/* Notes List (ordenadas por video_timestamp) */}
      <div className="space-y-4">
        {notes.map((note) => (
          <NoteCard 
            key={note.id} 
            note={note}
            onUpdate={refetch}
          />
        ))}

        {notes.length === 0 && (
          <div className="text-center text-base-content/60 py-8">
            No tienes notas aún. ¡Agrega tu primera nota!
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## FASE 3: OPTIMIZACIÓN DE API Y QUERIES

### 3.1 ENDPOINT DE PREGUNTAS CON answer_count

**Archivo**: `src/app/api/student/lessons/[id]/questions/route.ts`

```typescript
import { createClient } from '@/utils/supabase/server';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  
  // 1. Autenticar
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Query optimizada (SIN JOIN de respuestas)
  const { data: questions, error } = await supabase
    .from('lesson_questions')
    .select(`
      id,
      question_text,
      upvotes,
      answer_count,
      is_resolved,
      created_at,
      student:students!inner (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('lesson_id', params.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ questions });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { question_text, video_timestamp, course_id } = body;

  // Validación
  if (!question_text || question_text.length < 10) {
    return Response.json(
      { error: 'La pregunta debe tener al menos 10 caracteres' }, 
      { status: 400 }
    );
  }

  // Obtener student_id del usuario autenticado
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!student) {
    return Response.json({ error: 'Student not found' }, { status: 404 });
  }

  // Insertar pregunta
  const { data, error } = await supabase
    .from('lesson_questions')
    .insert({
      lesson_id: params.id,
      course_id,
      student_id: student.id,
      question_text,
      video_timestamp: video_timestamp || 0,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ question: data }, { status: 201 });
}
```

---

### 3.2 ENDPOINT DE RESPUESTAS (LAZY LOADING)

**Crear archivo**: `src/app/api/student/questions/[id]/answers/route.ts`

```typescript
import { createClient } from '@/utils/supabase/server';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Query optimizada (solo respuestas de esta pregunta)
  const { data: answers, error } = await supabase
    .from('lesson_question_answers')
    .select(`
      id,
      answer_text,
      upvotes,
      is_instructor_answer,
      is_accepted,
      created_at,
      user:users!inner (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('question_id', params.id)
    .order('is_instructor_answer', { ascending: false })
    .order('upvotes', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ answers });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { answer_text } = body;

  if (!answer_text || answer_text.length < 5) {
    return Response.json(
      { error: 'La respuesta debe tener al menos 5 caracteres' }, 
      { status: 400 }
    );
  }

  // Determinar si es instructor
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  const is_instructor = !!teacher;

  // Insertar respuesta
  const { data, error } = await supabase
    .from('lesson_question_answers')
    .insert({
      question_id: params.id,
      user_id: user.id,
      answer_text,
      is_instructor_answer: is_instructor,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ answer: data }, { status: 201 });
}
```

---

### 3.3 ENDPOINT DE NOTAS

**Archivo**: `src/app/api/student/lessons/[id]/notes/route.ts`

```typescript
import { createClient } from '@/utils/supabase/server';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Obtener student_id
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!student) {
    return Response.json({ error: 'Student not found' }, { status: 404 });
  }

  // Query con paginación
  const { data: notes, error } = await supabase
    .from('lesson_notes')
    .select('id, content, video_timestamp, created_at')
    .eq('lesson_id', params.id)
    .eq('student_id', student.id)
    .order('video_timestamp', { ascending: true })
    .limit(100);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ notes });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { content, video_timestamp, course_id } = body;

  if (!content || content.length < 5) {
    return Response.json(
      { error: 'La nota debe tener al menos 5 caracteres' }, 
      { status: 400 }
    );
  }

  // Obtener student_id
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!student) {
    return Response.json({ error: 'Student not found' }, { status: 404 });
  }

  // Insertar nota
  const { data, error } = await supabase
    .from('lesson_notes')
    .insert({
      lesson_id: params.id,
      course_id,
      student_id: student.id,
      content,
      video_timestamp: video_timestamp || 0,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ note: data }, { status: 201 });
}
```

---

## CHECKLIST DE IMPLEMENTACIÓN

### ✅ Seguridad (Hacer PRIMERO)
- [ ] Migrar `/api/student/lessons/[id]/questions/route.ts` a auth segura
- [ ] Migrar `/api/student/lessons/[id]/notes/route.ts` a auth segura
- [ ] Crear `/api/student/questions/[id]/answers/route.ts` (nuevo)
- [ ] Eliminar `getSupabaseAdmin()` de todos los endpoints student
- [ ] Validar inputs (longitud mínima, sanitización)
- [ ] (Opcional) Implementar rate limiting

### ✅ Code Splitting
- [ ] Crear estructura de carpetas `_components/`
- [ ] Implementar `page.tsx` como shell (~100 líneas)
- [ ] Crear `QuestionsTab/index.tsx` con lazy loading
- [ ] Crear `NotesTab/index.tsx` con lazy loading
- [ ] Agregar `loading.tsx` skeleton

### ✅ Componentes Q&A
- [ ] Crear `QuestionCard.tsx` con `React.memo`
- [ ] Crear `QuestionComposer.tsx` (input aislado)
- [ ] Crear `AnswerCard.tsx` con `React.memo`
- [ ] Crear `hooks/useQuestions.ts`
- [ ] Crear `hooks/useAnswers.ts` con conditional fetching

### ✅ Componentes Notas
- [ ] Crear `NoteCard.tsx` con `React.memo`
- [ ] Crear `NoteComposer.tsx` (input aislado)
- [ ] Crear `hooks/useNotes.ts`

### ✅ Optimización
- [ ] Verificar que `answer_count` existe en DB (migración SQL ya ejecutada)
- [ ] Usar `answer_count` en lugar de COUNT en queries
- [ ] Lazy loading de respuestas (solo al expandir)
- [ ] Límites en queries (50-100 items)

---

## REGLAS CRÍTICAS PARA EL LLM

### ❌ NO HACER:
1. NO usar `getSupabaseAdmin()` en endpoints `/api/student/*`
2. NO confiar en `userId` del cliente
3. NO hacer queries sin límites (`.limit()`)
4. NO incluir toda la lógica en `page.tsx`
5. NO hacer fetch de respuestas al cargar preguntas
6. NO usar callbacks inline en lists (causa re-renders)
7. NO usar SSR en tabs interactivos (`ssr: false`)

### ✅ SÍ HACER:
1. SÍ usar `createClient()` (no admin) en endpoints
2. SÍ autenticar con `supabase.auth.getUser()`
3. SÍ usar RLS (políticas ya configuradas)
4. SÍ usar `next/dynamic` para lazy loading
5. SÍ usar `React.memo` en cards/items de lista
6. SÍ separar estado por tab (no global)
7. SÍ usar hooks custom para fetching
8. SÍ validar inputs en backend

---

## TESTING POST-IMPLEMENTACIÓN

### Test 1: Verificar Code Splitting
```bash
npm run build
```
Verificar que el bundle de `page.tsx` sea < 100KB (antes: ~850KB)

### Test 2: Verificar Lazy Loading
1. Abrir DevTools → Network
2. Cargar lección
3. Verificar que `date-fns` NO se carga inicialmente
4. Click en tab "Preguntas"
5. Verificar que `date-fns` se carga ahora

### Test 3: Verificar Seguridad
1. Abrir DevTools → Network
2. Ver request a `/api/student/lessons/[id]/questions`
3. Verificar que NO hay `userId` en request body
4. Verificar que header `Authorization` existe

### Test 4: Verificar Lazy Loading de Respuestas
1. Abrir tab "Preguntas"
2. Verificar que solo hay 1 request (preguntas, sin respuestas)
3. Click en "Ver respuestas"
4. Verificar que ahora hay request a `/api/student/questions/[id]/answers`

---

## ENTREGABLES ESPERADOS

1. ✅ Estructura modular con carpetas `_components/`
2. ✅ `page.tsx` < 150 líneas
3. ✅ Lazy loading funcional de tabs
4. ✅ Endpoints seguros (sin admin client)
5. ✅ Lazy loading de respuestas
6. ✅ React.memo en componentes de lista
7. ✅ Hooks custom para data fetching
8. ✅ TypeScript sin errores
9. ✅ Build exitoso con bundle reducido

---

## NOTAS FINALES

- **Prioridad**: Seguridad > Code Splitting > Optimizaciones
- **Testing**: Probar cada fase antes de continuar
- **Rollback**: Mantener backup del código original
- **Performance**: Esperar ~50% reducción en tiempo de carga inicial

---

**¿Dudas o necesitas aclaraciones?** Este documento debe ser suficiente para que un LLM competente implemente la refactorización completa.

---

## ✅ IMPLEMENTACIÓN COMPLETADA (Febrero 2026)

### Archivos Creados/Modificados

#### 1. Migración SQL (CORREGIDA)
- `supabase/migrations/20260204_lessonplayer_indexes_upgrade_CORRECTED.sql` - v3.0
  - ✅ Fix: `RAISE NOTICE` dentro de bloques `DO $$`
  - ✅ Fix: `SECURITY INVOKER` en lugar de `SECURITY DEFINER`
  - ✅ Agregado: índice `course_id` para dashboards
  - ✅ Agregado: función `sync_all_answer_counts()` para mantenimiento

#### 2. Validación con Zod
- `src/lib/validators/lessonContentSchema.ts`
  - Schemas: `createQuestionSchema`, `createAnswerSchema`, `createNoteSchema`, etc.
  - Sanitización XSS incluida
  - Límites de longitud (min/max)
  - Validación de `video_timestamp` (0-86400)
  - Helper: `parseRequestBody()` para API routes

#### 3. Rate Limiting Server-Side
- `src/lib/auth/serverRateLimiter.ts`
  - LRU Cache en memoria (no requiere Redis)
  - Configuraciones predefinidas: `RATE_LIMITS.READ`, `RATE_LIMITS.CONTENT_CREATE`, etc.
  - Middleware: `rateLimitMiddleware()`
  - HOF: `withRateLimit()` para wrapear endpoints

#### 4. Endpoints API Refactorizados
- `src/app/api/student/questions/route.ts` - GET/POST seguros
- `src/app/api/student/questions/answer/route.ts` - POST/PATCH seguros
- `src/app/api/student/questions/[questionId]/answers/route.ts` - GET (lazy loading)
- `src/app/api/student/notes/route.ts` - GET/POST/PATCH/DELETE seguros

**Cambios clave**:
- `createClient()` en lugar de `getSupabaseAdmin()`
- Autenticación via `supabase.auth.getUser()`
- Rate limiting obligatorio
- Validación con Zod
- Verificación de inscripción al curso

#### 5. Hooks con SWR
- `src/app/student/courses/[courseId]/learn/lecture/[lessonId]/_hooks/`
  - `types.ts` - Tipos compartidos
  - `useQuestions.ts` - SWR + sorting + crear pregunta
  - `useAnswers.ts` - SWR + lazy loading (enabled flag) + crear/aceptar
  - `useNotes.ts` - SWR + crear/actualizar/eliminar

**Beneficios SWR**:
- Deduplicación automática de requests
- Cache con revalidación
- Optimistic updates

#### 6. Componentes Modulares
- `src/app/student/courses/[courseId]/learn/lecture/[lessonId]/_components/`
  - `common/` - `Avatar.tsx`, `TabSkeleton.tsx`
  - `QuestionsTab/` - `index.tsx`, `QuestionCard.tsx`, `QuestionComposer.tsx`, `AnswerCard.tsx`, `AnswerComposer.tsx`
  - `NotesTab/` - `index.tsx`, `NoteCard.tsx`, `NoteComposer.tsx`
  - `InteractiveTabsSection.tsx` - Componente wrapper con lazy loading

### Cómo Integrar en page.tsx Existente

```typescript
// En el page.tsx existente, agregar:
import dynamic from 'next/dynamic';

// Lazy loading del componente de tabs
const InteractiveTabsSection = dynamic(
  () => import('./_components/InteractiveTabsSection'),
  {
    loading: () => <div className="skeleton h-96 w-full" />,
    ssr: false
  }
);

// Dentro del componente, reemplazar la sección de tabs existente con:
<InteractiveTabsSection
  lessonId={lessonId}
  courseId={courseId}
  currentUserId={user?.id}
  currentVideoTimestamp={videoRef.current?.currentTime ?? 0}
  onTimestampClick={(ts) => {
    if (videoRef.current) {
      videoRef.current.currentTime = ts;
    }
  }}
/>
```

### Checklist de Verificación Post-Integración

- [ ] Ejecutar migración SQL en Supabase
- [ ] Verificar que SWR está instalado (`npm install swr`)
- [ ] Probar crear pregunta (debe funcionar sin `userId` en body)
- [ ] Probar expandir pregunta (respuestas cargan via lazy loading)
- [ ] Probar crear nota (debe verificar inscripción)
- [ ] Verificar rate limiting (429 después de muchos requests)
- [ ] Verificar bundle size reducido (`npm run build`)

---

**Implementado por**: Claude Opus 4.5 (Febrero 2026)
**Versión**: 3.0
