"use client";

import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Edit3,
  Plus,
  Trash2,
  Copy,
} from "lucide-react";

// ============================================================================
// TIPOS
// ============================================================================

export interface SectionLesson {
  id: string;
  title: string;
  order: number;
  sectionId?: string;
}

export interface CourseSection {
  id: string;
  title: string;
  order: number;
  isExpanded?: boolean;
  lessons: SectionLesson[];
}

interface SortableSectionItemProps {
  section: CourseSection;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onEditSection: (sectionId: string) => void;
  onEditSubsection: (sectionId: string, subsectionId: string) => void;
  onAddSubsection: (sectionId: string) => void;
  onDelete?: (sectionId: string) => void;
  onDuplicate?: (sectionId: string) => void;
}

interface SortableSectionListProps {
  sections: CourseSection[];
  onReorder: (sections: CourseSection[]) => void;
  onEditSection: (sectionId: string) => void;
  onEditSubsection: (sectionId: string, subsectionId: string) => void;
  onAddSubsection: (sectionId: string) => void;
  onDeleteSection?: (sectionId: string) => void;
  onDuplicateSection?: (sectionId: string) => void;
  emptyMessage?: string;
}

// ============================================================================
// COMPONENTE SORTABLE ITEM
// ============================================================================

function SortableSectionItem({
  section,
  index,
  isExpanded,
  onToggle,
  onEditSection,
  onEditSubsection,
  onAddSubsection,
  onDelete,
  onDuplicate,
}: SortableSectionItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Cerrar menú al hacer clic fuera
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-[#F8FAFF] border border-slate-200 rounded-xl transition-all ${
        isDragging ? "shadow-elevated z-50" : showMenu ? "z-[100]" : "hover:shadow-cardSoft"
      }`}
    >
      {/* Section Header */}
      <div
        className="flex justify-between items-center p-3.5 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {/* Drag Handle */}
          <button
            type="button"
            className="p-1 text-slate-400 opacity-60 cursor-grab active:cursor-grabbing hover:opacity-100 transition-opacity"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical size={18} />
          </button>

          {/* Expand/Collapse Button */}
          <button
            type="button"
            className="p-0.5 hover:bg-slate-200 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            {isExpanded ? (
              <ChevronDown size={16} className="text-slate-500" />
            ) : (
              <ChevronRight size={16} className="text-slate-500" />
            )}
          </button>

          {/* Section Title - Mostrar exactamente lo que se guardó */}
          <span className="text-sm font-medium text-brand-primary leading-relaxed">
            {section.title}
          </span>

          {/* Lesson Count Badge */}
          {section.lessons.length > 0 && (
            <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full">
              {section.lessons.length} {section.lessons.length === 1 ? "lección" : "lecciones"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Edit Section Button - Navega al editor general de la lección */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditSection(section.id);
            }}
            className="h-8 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm rounded-full transition-colors"
          >
            Editar
          </button>

          {/* More Options Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className={`p-2 rounded-full transition-all duration-200 ${
                showMenu 
                  ? "bg-brand-primary text-white shadow-md" 
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200"
              }`}
            >
              <MoreVertical size={16} />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate?.(section.id);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Copy size={15} className="text-slate-400" />
                  Duplicar sección
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(section.id);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={15} />
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-200 bg-white px-4 py-3">
          <div className="pl-10 space-y-2">
            {section.lessons.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                Esta sección no tiene lecciones aún.
              </p>
            ) : (
              <div className="space-y-2">
                {section.lessons.map((lesson, lessonIndex) => (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-6">
                        {lessonIndex + 1}.
                      </span>
                      <span className="text-sm text-slate-700">
                        {lesson.title}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onEditSubsection(section.id, lesson.id)}
                      className="text-xs text-[#A855F7] hover:text-[#9333EA] font-medium flex items-center gap-1"
                    >
                      <Edit3 size={12} />
                      Editar
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Lesson Button */}
            <button
              type="button"
              onClick={() => onAddSubsection(section.id)}
              className="text-xs text-[#A855F7] hover:text-[#9333EA] font-medium flex items-center gap-1 mt-3"
            >
              <Plus size={12} />
              Agregar lección
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function SortableSectionList({
  sections,
  onReorder,
  onEditSection,
  onEditSubsection,
  onAddSubsection,
  onDeleteSection,
  onDuplicateSection,
  emptyMessage = "Aún no hay secciones",
}: SortableSectionListProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);

      const newSections = arrayMove(sections, oldIndex, newIndex).map(
        (section, index) => ({
          ...section,
          order: index,
        })
      );

      onReorder(newSections);
    }
  };

  if (sections.length === 0) {
    return (
      <div className="text-center py-12 px-5">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Plus size={24} className="text-slate-400" />
        </div>
        <p className="text-sm text-slate-500 mb-2">{emptyMessage}</p>
        <p className="text-xs text-slate-400">
          Haz clic en "Agregar sección" para comenzar a construir tu currículo.
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sections.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2.5">
          {sections.map((section, index) => (
            <SortableSectionItem
              key={section.id}
              section={section}
              index={index}
              isExpanded={expandedSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
              onEditSection={onEditSection}
              onEditSubsection={onEditSubsection}
              onAddSubsection={onAddSubsection}
              onDelete={onDeleteSection}
              onDuplicate={onDuplicateSection}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
