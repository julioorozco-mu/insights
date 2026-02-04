'use client';

/**
 * Sección de Tabs Interactivos (Q&A y Notas)
 *
 * Este componente encapsula los tabs de preguntas y notas con lazy loading.
 * Se puede integrar en el LessonPlayer existente.
 *
 * Características:
 * - Lazy loading de tabs con next/dynamic
 * - Preload en hover para mejor UX
 * - Estado de tab aislado para evitar re-renders
 */

import { useState, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { IconMessageCircle, IconNote } from '@tabler/icons-react';
import { TabSkeleton } from './common';

// Lazy loading de tabs con next/dynamic (bundle-dynamic-imports)
const QuestionsTab = dynamic(() => import('./QuestionsTab'), {
  loading: () => <TabSkeleton />,
  ssr: false, // Solo cliente
});

const NotesTab = dynamic(() => import('./NotesTab'), {
  loading: () => <TabSkeleton />,
  ssr: false,
});

// Preload functions para hover (bundle-preload)
const preloadQuestionsTab = () => import('./QuestionsTab');
const preloadNotesTab = () => import('./NotesTab');

type TabType = 'questions' | 'notes';

interface InteractiveTabsSectionProps {
  lessonId: string;
  courseId: string;
  currentUserId?: string;
  currentVideoTimestamp?: number;
  onTimestampClick?: (timestamp: number) => void;
}

export function InteractiveTabsSection({
  lessonId,
  courseId,
  currentUserId,
  currentVideoTimestamp = 0,
  onTimestampClick,
}: InteractiveTabsSectionProps) {
  const [activeTab, setActiveTab] = useState<TabType>('questions');

  // Preload en hover (bundle-preload)
  const handleTabHover = useCallback((tab: TabType) => {
    if (tab === 'questions') {
      preloadQuestionsTab();
    } else {
      preloadNotesTab();
    }
  }, []);

  const tabs = [
    {
      key: 'questions' as TabType,
      label: 'Preguntas',
      icon: <IconMessageCircle size={18} />,
    },
    {
      key: 'notes' as TabType,
      label: 'Mis Notas',
      icon: <IconNote size={18} />,
    },
  ];

  return (
    <div className="card bg-base-100 shadow-lg">
      {/* Tab Headers */}
      <div className="card-body p-0">
        <div className="tabs tabs-boxed bg-base-200 rounded-t-2xl rounded-b-none">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              onMouseEnter={() => handleTabHover(tab.key)}
              className={`tab tab-lg flex-1 gap-2 ${
                activeTab === tab.key ? 'tab-active' : ''
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-4">
          <Suspense fallback={<TabSkeleton />}>
            {activeTab === 'questions' && (
              <QuestionsTab
                lessonId={lessonId}
                courseId={courseId}
                currentUserId={currentUserId}
                currentVideoTimestamp={currentVideoTimestamp}
                onTimestampClick={onTimestampClick}
              />
            )}
            {activeTab === 'notes' && (
              <NotesTab
                lessonId={lessonId}
                courseId={courseId}
                currentVideoTimestamp={currentVideoTimestamp}
                onTimestampClick={onTimestampClick}
              />
            )}
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default InteractiveTabsSection;
