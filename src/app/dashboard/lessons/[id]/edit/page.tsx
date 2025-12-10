"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabaseClient } from "@/lib/supabase";
import { lessonRepository } from "@/lib/repositories/lessonRepository";
import RichTextEditor from "@/components/ui/RichTextEditor";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
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
  IconPhoto,
  IconLayoutGrid,
  IconVideo,
  IconList,
  IconPaperclip,
  IconTable,
  IconCheckbox,
  IconPlus,
  IconMenu2,
  IconCheck,
  IconArrowLeft,
  IconArrowRight,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconAlignJustified,
  IconBold,
  IconItalic,
  IconUnderline,
  IconStrikethrough,
  IconQuestionMark,
  IconGripVertical,
  IconX,
  IconUpload,
  IconTrash,
  IconChevronLeft,
  IconChevronRight,
  IconLink,
  IconBrandYoutube,
  IconCloudUpload,
  IconLoader2,
  IconFileText,
  IconEye,
  IconDownload,
  IconH1,
  IconH2,
  IconRowInsertBottom,
  IconColumnInsertRight,
  IconFileTypePdf,
  IconFileTypeDoc,
  IconPencil,
} from "@tabler/icons-react";

// Design System Colors - Color primario #1A2170
const COLORS = {
  background: {
    app: "#F3F4F8",
    headerBar: "#1A2170", // Cambiado de #111827 a #1A2170
    tabsBar: "#FFFFFF",
    canvas: "#FFFFFF",
    sidebar: "#FFFFFF",
    sidebarAlt: "#F9FAFF",
    rightPanel: "#FFFFFF",
  },
  text: {
    primary: "#1A2170", // Cambiado
    secondary: "#4B5563",
    muted: "#9CA3AF",
    placeholder: "#9CA3AF",
    onDark: "#F9FAFB",
    onAccent: "#FFFFFF",
  },
  accent: {
    primary: "#1A2170",
    primarySoft: "#E8EAF6",
    secondary: "#6366F1",
    borderSubtle: "rgba(26,33,112,0.10)",
    borderStrong: "rgba(26,33,112,0.18)",
    focus: "#1A2170",
  },
  status: {
    success: "#22C55E",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#0EA5E9",
  },
  palettSwatches: [
    "#1A2170", "#000000", "#6B7280", "#E5E7EB",
    "#F97316", "#FACC15", "#22C55E", "#0EA5E9",
    "#6366F1", "#A855F7", "#EC4899", "#A3E635",
  ],
};

// Tipos de bloques
type BlockType = "text" | "heading" | "richtext" | "image" | "video" | "gallery" | "list" | "attachment" | "table" | "quiz" | "case-study";

interface ContentBlock {
  id: string;
  type: BlockType;
  content: string;
  data?: any;
}

interface Subsection {
  id: string;
  title: string;
  blocks: ContentBlock[];
}

// Componentes del sidebar para drag (sin Caso de Estudio)
const COMPONENTS = [
  { id: "heading", icon: IconBold, label: "Título" },
  { id: "text", icon: IconAlignLeft, label: "Texto" },
  { id: "richtext", icon: IconFileText, label: "Texto Enriquecido" },
  { id: "image", icon: IconPhoto, label: "Imagen" },
  { id: "gallery", icon: IconLayoutGrid, label: "Galería" },
  { id: "video", icon: IconVideo, label: "Video" },
  { id: "list", icon: IconList, label: "Lista" },
  { id: "attachment", icon: IconPaperclip, label: "Adjunto" },
  { id: "table", icon: IconTable, label: "Tabla" },
  { id: "quiz", icon: IconCheckbox, label: "Quiz" },
];

// ===== COMPONENTE DRAGGABLE DEL SIDEBAR =====
function DraggableComponent({ id, icon: Icon, label }: { id: string; icon: any; label: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: `component-${id}`,
    data: { type: "component", componentType: id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="draggable-component"
    >
      <div style={{
        height: 48,
        borderRadius: 12,
        border: "none",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 12px",
        backgroundColor: "transparent",
        color: COLORS.text.secondary,
        cursor: "grab",
        transition: "all 150ms ease-out",
      }}>
        <div style={{
          width: 30,
          height: 30,
          borderRadius: 999,
          backgroundColor: "#F3F4F6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Icon size={16} color={COLORS.text.secondary} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
        <IconGripVertical size={14} color={COLORS.text.muted} style={{ marginLeft: "auto" }} />
      </div>
    </div>
  );
}

// ===== COMPONENTE SORTABLE BLOCK =====
function SortableBlock({ 
  block, 
  isSelected, 
  onSelect, 
  onDelete, 
  onUpdate,
  onOpenVideoModal,
  onOpenGalleryModal,
  onOpenImageModal,
  blockStyles,
}: { 
  block: ContentBlock; 
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onUpdate: (content: string, data?: any) => void;
  onOpenVideoModal: () => void;
  onOpenGalleryModal: () => void;
  onOpenImageModal: () => void;
  blockStyles?: {
    fontFamily: string;
    fontWeight: string;
    fontSize: string;
    textAlign: "left" | "center" | "right" | "justify";
    color: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strikethrough: boolean;
  };
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    data: { type: "block", block },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [galleryIndex, setGalleryIndex] = useState(0);
  const galleryImages = block.data?.images || [];

  // Extraer ID de YouTube
  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
    >
      <div style={{
        position: "relative",
        marginBottom: 16,
        padding: isSelected ? "12px" : "0",
        borderRadius: 8,
        border: isSelected ? `2px solid ${COLORS.accent.primary}` : "2px solid transparent",
        transition: "all 150ms ease-out",
        backgroundColor: isDragging ? COLORS.accent.primarySoft : "transparent",
      }}>
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          style={{
            position: "absolute",
            left: -30,
            top: "50%",
            transform: "translateY(-50%)",
            cursor: "grab",
            padding: 4,
            opacity: isSelected ? 1 : 0,
            transition: "opacity 150ms",
          }}
        >
          <IconGripVertical size={18} color={COLORS.text.muted} />
        </div>

        {/* Delete button - siempre visible cuando está seleccionado */}
        {isSelected && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{
              position: "absolute",
              top: -14,
              right: -14,
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: COLORS.status.danger,
              border: "2px solid white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            <IconTrash size={16} color="white" />
          </button>
        )}

        {/* Contenido del bloque */}
        {block.type === "heading" && (() => {
          const savedStyles = block.data?.styles;
          const displayStyles = isSelected && blockStyles ? blockStyles : (savedStyles || {});
          
          return (
            <input
              type="text"
              value={block.content || ""}
              onChange={(e) => onUpdate(e.target.value)}
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                fontSize: displayStyles.fontSize ? parseInt(displayStyles.fontSize) + 8 : 24,
                fontWeight: displayStyles.bold ? 700 : 600,
                fontStyle: displayStyles.italic ? "italic" : "normal",
                textDecoration: `${displayStyles.underline ? "underline" : ""} ${displayStyles.strikethrough ? "line-through" : ""}`.trim() || "none",
                textAlign: displayStyles.textAlign || "left",
                fontFamily: displayStyles.fontFamily || "inherit",
                lineHeight: 1.35,
                color: displayStyles.color || COLORS.text.primary,
                backgroundColor: "transparent",
              }}
              placeholder="Escribe el título..."
            />
          );
        })()}

        {block.type === "text" && (() => {
          const savedStyles = block.data?.styles;
          const displayStyles = isSelected && blockStyles ? blockStyles : (savedStyles || {});
          
          return (
            <textarea
              value={block.content || ""}
              onChange={(e) => onUpdate(e.target.value)}
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                fontSize: displayStyles.fontSize ? parseInt(displayStyles.fontSize) : 14,
                fontWeight: displayStyles.bold ? 700 : 400,
                fontStyle: displayStyles.italic ? "italic" : "normal",
                textDecoration: `${displayStyles.underline ? "underline" : ""} ${displayStyles.strikethrough ? "line-through" : ""}`.trim() || "none",
                textAlign: displayStyles.textAlign || "left",
                fontFamily: displayStyles.fontFamily || "inherit",
                lineHeight: 1.6,
                color: displayStyles.color || COLORS.text.primary,
                backgroundColor: "transparent",
                resize: "none",
                minHeight: 80,
              }}
              placeholder="Escribe el contenido..."
            />
          );
        })()}

        {block.type === "richtext" && (
          <div style={{ width: "100%" }}>
            <RichTextEditor
              value={block.content || ""}
              onChange={(html) => onUpdate(html)}
              placeholder="Escribe texto enriquecido aquí... Puedes formatear el texto y agregar enlaces."
              className="w-full"
            />
          </div>
        )}

        {block.type === "video" && (
          <div>
            {block.content ? (
              <div style={{ borderRadius: 16, overflow: "hidden", position: "relative" }}>
                {block.data?.videoType === "youtube" && getYouTubeId(block.content) ? (
                  <div style={{ aspectRatio: "16/9" }}>
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${getYouTubeId(block.content)}`}
                      title="YouTube video"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{ borderRadius: 16 }}
                    />
                  </div>
                ) : block.data?.videoType === "external" ? (
                  <div style={{
                    aspectRatio: "16/9",
                    backgroundColor: "#000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: 12,
                  }}>
                    <IconLink size={48} color="white" />
                    <a
                      href={block.content}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "white", fontSize: 14 }}
                    >
                      {block.content}
                    </a>
                  </div>
                ) : (
                  <video
                    src={block.content}
                    controls
                    style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 16 }}
                  />
                )}
                <div style={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  backgroundColor: "rgba(0,0,0,0.6)",
                  color: "white",
                  padding: "4px 8px",
                  borderRadius: 999,
                  fontSize: 11,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}>
                  {block.data?.videoType === "youtube" && <IconBrandYoutube size={14} />}
                  {block.data?.videoType === "upload" && <IconCloudUpload size={14} />}
                  {block.data?.videoType === "external" && <IconLink size={14} />}
                  {block.data?.fileName || block.data?.videoType || "Video"}
                </div>
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onOpenVideoModal(); }}
                style={{
                  width: "100%",
                  aspectRatio: "16/9",
                  border: `2px dashed ${COLORS.accent.borderStrong}`,
                  borderRadius: 16,
                  backgroundColor: COLORS.accent.primarySoft,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <IconVideo size={48} color={COLORS.accent.primary} />
                <span style={{ fontSize: 14, color: COLORS.text.primary }}>Haz clic para agregar video</span>
              </button>
            )}
          </div>
        )}

        {block.type === "image" && (
          <div>
            {block.content ? (
              <div>
                <div style={{ borderRadius: 14, overflow: "hidden", position: "relative" }}>
                  <img
                    src={block.content}
                    alt={block.data?.description || ""}
                    style={{ width: "100%", height: "auto", objectFit: "cover" }}
                  />
                  <div style={{ position: "absolute", top: 8, left: 8, backgroundColor: "rgba(0,0,0,0.5)", color: "white", padding: "4px 8px", borderRadius: 6, fontSize: 11, maxWidth: "calc(100% - 16px)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {block.data?.description || block.data?.fileName || "Imagen"}
                  </div>
                </div>
                {block.data?.description && (
                  <p style={{ 
                    marginTop: 8, 
                    fontSize: 13, 
                    color: COLORS.text.secondary, 
                    fontStyle: "italic",
                    lineHeight: 1.5
                  }}>
                    {block.data.description}
                  </p>
                )}
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onOpenImageModal(); }}
                style={{
                  width: "100%",
                  aspectRatio: "16/9",
                  border: `2px dashed ${COLORS.accent.borderStrong}`,
                  borderRadius: 16,
                  backgroundColor: COLORS.accent.primarySoft,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <IconPhoto size={48} color={COLORS.accent.primary} />
                <span style={{ fontSize: 14, color: COLORS.text.primary }}>Haz clic para agregar imagen</span>
              </button>
            )}
          </div>
        )}

        {block.type === "gallery" && (
          <div>
            {galleryImages.length > 0 ? (
              <div style={{ position: "relative" }}>
                {/* Carrusel */}
                <div style={{
                  borderRadius: 14,
                  overflow: "hidden",
                  aspectRatio: "16/9",
                  position: "relative",
                }}>
                  <img
                    src={galleryImages[galleryIndex]}
                    alt={`Imagen ${galleryIndex + 1}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  
                  {/* Controles del carrusel */}
                  {galleryImages.length > 1 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setGalleryIndex(i => i === 0 ? galleryImages.length - 1 : i - 1); }}
                        style={{
                          position: "absolute",
                          left: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          backgroundColor: "rgba(0,0,0,0.5)",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <IconChevronLeft size={20} color="white" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setGalleryIndex(i => i === galleryImages.length - 1 ? 0 : i + 1); }}
                        style={{
                          position: "absolute",
                          right: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          backgroundColor: "rgba(0,0,0,0.5)",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <IconChevronRight size={20} color="white" />
                      </button>
                    </>
                  )}
                  
                  {/* Indicadores */}
                  <div style={{
                    position: "absolute",
                    bottom: 12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    gap: 6,
                  }}>
                    {galleryImages.map((_: string, i: number) => (
                      <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); setGalleryIndex(i); }}
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: i === galleryIndex ? "white" : "rgba(255,255,255,0.5)",
                          border: "none",
                          cursor: "pointer",
                        }}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Contador */}
                <div style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  backgroundColor: "rgba(0,0,0,0.6)",
                  color: "white",
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                }}>
                  {galleryIndex + 1} / {galleryImages.length}
                </div>
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onOpenGalleryModal(); }}
                style={{
                  width: "100%",
                  aspectRatio: "16/9",
                  border: `2px dashed ${COLORS.accent.borderStrong}`,
                  borderRadius: 16,
                  backgroundColor: COLORS.accent.primarySoft,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <IconLayoutGrid size={48} color={COLORS.accent.primary} />
                <span style={{ fontSize: 14, color: COLORS.text.primary }}>Haz clic para agregar galería</span>
              </button>
            )}
          </div>
        )}

        {block.type === "list" && (
          <ul style={{
            paddingLeft: 20,
            margin: 0,
            fontSize: 14,
            lineHeight: 1.8,
            color: COLORS.text.primary,
          }}>
            {(block.data?.items || ["Elemento 1", "Elemento 2"]).map((item: string, i: number) => (
              <li key={i}>
                <input
                  type="text"
                  value={item || ""}
                  onChange={(e) => {
                    const newItems = [...(block.data?.items || [])];
                    newItems[i] = e.target.value;
                    onUpdate(block.content, { ...block.data, items: newItems });
                  }}
                  style={{
                    border: "none",
                    outline: "none",
                    backgroundColor: "transparent",
                    fontSize: 14,
                    width: "100%",
                  }}
                />
              </li>
            ))}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newItems = [...(block.data?.items || []), "Nuevo elemento"];
                onUpdate(block.content, { ...block.data, items: newItems });
              }}
              style={{
                marginTop: 8,
                padding: "4px 12px",
                borderRadius: 6,
                border: `1px dashed ${COLORS.accent.borderStrong}`,
                backgroundColor: "transparent",
                cursor: "pointer",
                fontSize: 12,
                color: COLORS.text.muted,
              }}
            >
              + Agregar elemento
            </button>
          </ul>
        )}

        {block.type === "attachment" && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: 16,
            backgroundColor: "#F9FAFB",
            borderRadius: 12,
            border: `1px solid ${COLORS.accent.borderSubtle}`,
          }}>
            <IconPaperclip size={20} color={COLORS.accent.primary} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: COLORS.text.primary }}>
                {block.data?.fileName || "Archivo adjunto"}
              </p>
              <p style={{ fontSize: 12, color: COLORS.text.muted }}>
                {block.data?.fileSize ? `${(block.data.fileSize / 1024 / 1024).toFixed(2)} MB` : ""}
              </p>
            </div>
            {block.content && (
              <a href={block.content} target="_blank" rel="noopener noreferrer" style={{ padding: "6px 12px", borderRadius: 6, backgroundColor: COLORS.accent.primarySoft, color: COLORS.accent.primary, textDecoration: "none", fontSize: 12 }}>
                Ver archivo
              </a>
            )}
          </div>
        )}

        {/* Tabla */}
        {block.type === "table" && block.data?.cells && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <tbody>
                {block.data.cells.map((row: string[], rowIdx: number) => (
                  <tr key={rowIdx}>
                    {row.map((cell: string, colIdx: number) => (
                      <td key={colIdx} style={{ border: `1px solid ${COLORS.accent.borderSubtle}`, padding: 8 }}>
                        <input
                          type="text"
                          value={cell || ""}
                          onChange={(e) => {
                            const newCells = [...block.data.cells];
                            newCells[rowIdx][colIdx] = e.target.value;
                            onUpdate(block.content, { ...block.data, cells: newCells });
                          }}
                          style={{ width: "100%", border: "none", outline: "none", backgroundColor: "transparent" }}
                          placeholder="..."
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Quiz */}
        {block.type === "quiz" && (
          <div style={{
            padding: 20,
            backgroundColor: COLORS.accent.primarySoft,
            borderRadius: 12,
            border: `1px solid ${COLORS.accent.primary}`,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: COLORS.accent.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IconCheckbox size={24} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, color: COLORS.text.primary, marginBottom: 4 }}>
                {block.data?.quizTitle || "Quiz"}
              </p>
              <p style={{ fontSize: 12, color: COLORS.text.muted }}>
                Los estudiantes completarán este quiz durante la lección
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== DROPZONE PARA EL CANVAS =====
function CanvasDropzone({ children, id }: { children: React.ReactNode; id: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  
  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: 400,
        backgroundColor: isOver ? COLORS.accent.primarySoft : "transparent",
        borderRadius: 8,
        transition: "background-color 150ms",
      }}
    >
      {children}
    </div>
  );
}

// ===== COMPONENTE PRINCIPAL =====
export default function EditLessonPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const lessonId = params.id as string;
  const tabParam = searchParams.get("tab"); // ID de subsección a activar
  const actionParam = searchParams.get("action"); // Acción a ejecutar (ej: "add")
  
  // Estados principales
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonSubtitle, setLessonSubtitle] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseId, setCourseId] = useState("");
  
  // Subsecciones
  const [subsections, setSubsections] = useState<Subsection[]>([
    {
      id: "1",
      title: "Lee antes de empezar",
      blocks: [
        { id: "b1", type: "heading", content: "Lee antes de empezar" },
        { id: "b2", type: "text", content: "¡Hola estudiante! 🎓 Bienvenido a esta lección. Aquí aprenderás los conceptos fundamentales que te ayudarán a dominar el tema." },
      ],
    },
  ]);
  const [activeSubsection, setActiveSubsection] = useState("1");
  
  // Drag and Drop
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedType, setDraggedType] = useState<string | null>(null);
  
  // Bloque seleccionado
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  
  // Estados de tipografía
  const [fontFamily, setFontFamily] = useState("Inter");
  const [fontWeight, setFontWeight] = useState("Regular");
  const [fontSize, setFontSize] = useState("16");
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right" | "justify">("left");
  const [textStyles, setTextStyles] = useState({ bold: false, italic: false, underline: false, strikethrough: false });
  const [selectedColor, setSelectedColor] = useState(COLORS.palettSwatches[0]);
  
  // Modales
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewType, setPreviewType] = useState<"image" | "pdf">("image");
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  
  // Video modal states
  const [videoTab, setVideoTab] = useState<"youtube" | "external" | "upload">("youtube");
  const [videoUrl, setVideoUrl] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // Gallery modal states
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  
  // Image modal states
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageDescription, setImageDescription] = useState("");
  
  // Table modal states
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  
  // Quiz modal states
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  
  // Attachment modal states
  const [resources, setResources] = useState<any[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [attachmentTab, setAttachmentTab] = useState<"existing" | "upload">("existing");
  
  // Historia para undo/redo
  const [history, setHistory] = useState<Subsection[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const maxHistoryLength = 50;
  const [dataLoadedFromDB, setDataLoadedFromDB] = useState(false);
  
  // File refs
  const videoFileRef = useRef<HTMLInputElement>(null);
  const galleryFileRef = useRef<HTMLInputElement>(null);
  const imageFileRef = useRef<HTMLInputElement>(null);
  const attachmentFileRef = useRef<HTMLInputElement>(null);

  // Sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Cargar lección existente
  useEffect(() => {
    const loadLesson = async () => {
      try {
        if (!lessonId) {
          console.error("No lesson ID provided");
          router.push("/dashboard/courses");
          return;
        }
        
        // Usar API del servidor para evitar problemas de RLS y timeouts
        const lessonRes = await fetch(`/api/admin/getLesson?lessonId=${lessonId}`);
        
        if (!lessonRes.ok) {
          const errorData = await lessonRes.json();
          console.error("Error loading lesson:", errorData);
          router.push("/dashboard/courses");
          return;
        }
        
        const lessonData = await lessonRes.json();
        const lesson = lessonData.lesson;
        
        if (!lesson) {
          console.error("Lesson not found");
          router.push("/dashboard/courses");
          return;
        }
        
        // Cargar datos básicos
        setLessonTitle(lesson.title);
        setLessonSubtitle(lesson.description || "");
        setCourseId(lesson.courseId);
        
        // Cargar curso para obtener el nombre usando API
        if (lesson.courseId) {
          const courseRes = await fetch(`/api/admin/getCourse?courseId=${lesson.courseId}`);
          if (courseRes.ok) {
            const courseData = await courseRes.json();
            if (courseData.course) {
              setCourseName(courseData.course.title);
            }
          }
        }
        
        // Parsear contenido si existe
        if (lesson.content) {
          try {
            console.log("[EditLesson] Raw content:", lesson.content);
            const contentData = JSON.parse(lesson.content);
            console.log("[EditLesson] Parsed content:", contentData);
            
            if (contentData.subsections && Array.isArray(contentData.subsections)) {
              // Convertir las subsecciones guardadas al formato esperado
              const loadedSubsections: Subsection[] = contentData.subsections.map((sub: any, idx: number) => ({
                id: sub.id || `${Date.now()}-${idx}`,
                title: sub.title || "Nueva lección",
                blocks: sub.blocks || [],
              }));
              
              console.log("[EditLesson] Loaded subsections:", loadedSubsections);
              
              if (loadedSubsections.length > 0) {
                // Si hay action=add, agregar nueva subsección a las cargadas
                if (actionParam === "add") {
                  const newId = Date.now().toString();
                  const newSubsection: Subsection = {
                    id: newId,
                    title: `Nueva lección`,
                    blocks: [
                      { id: `${newId}-b1`, type: "heading", content: `Nueva lección` },
                      { id: `${newId}-b2`, type: "text", content: "Escribe el contenido aquí..." },
                    ],
                  };
                  const finalSubs = [...loadedSubsections, newSubsection];
                  setSubsections(finalSubs);
                  setActiveSubsection(newId);
                  setDataLoadedFromDB(true);
                  // Limpiar el parámetro action de la URL
                  window.history.replaceState(null, '', `/dashboard/lessons/${lessonId}/edit`);
                } else {
                  setSubsections(loadedSubsections);
                  setDataLoadedFromDB(true);
                  // Si hay un parámetro tab en la URL, activar esa subsección
                  const targetSubsection = tabParam 
                    ? loadedSubsections.find(s => s.id === tabParam)
                    : null;
                  setActiveSubsection(targetSubsection?.id || loadedSubsections[0].id);
                }
              }
            }
          } catch (parseError) {
            console.error("Error parsing lesson content:", parseError);
            // Si hay error, usar los valores por defecto
          }
        } else {
          console.log("[EditLesson] No content found, using default subsections");
          // Si hay action=add y no hay contenido, crear subsección inicial
          if (actionParam === "add") {
            const newId = Date.now().toString();
            const newSubsection: Subsection = {
              id: newId,
              title: `Nueva lección`,
              blocks: [
                { id: `${newId}-b1`, type: "heading", content: `Nueva lección` },
                { id: `${newId}-b2`, type: "text", content: "Escribe el contenido aquí..." },
              ],
            };
            setSubsections(prev => [...prev, newSubsection]);
            setActiveSubsection(newId);
            window.history.replaceState(null, '', `/dashboard/lessons/${lessonId}/edit`);
          }
          setDataLoadedFromDB(true);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error loading lesson:", error);
        router.push("/dashboard/courses");
      }
    };
    
    loadLesson();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);
  
  // Cargar quizzes disponibles
  const loadQuizzes = async () => {
    try {
      setLoadingQuizzes(true);
      // Usar API del servidor para evitar problemas de RLS y timeouts
      const res = await fetch('/api/admin/getSurveys');
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error("Error loading quizzes:", errorData);
        setQuizzes([]);
        return;
      }
      
      const data = await res.json();
      setQuizzes(data.surveys || []);
    } catch (error) {
      console.error("Error loading quizzes:", error);
      setQuizzes([]);
    } finally {
      setLoadingQuizzes(false);
    }
  };
  
  // Función para obtener ícono según tipo de archivo
  const getFileIcon = (fileType: string) => {
    if (!fileType) return <IconFileText size={24} color={COLORS.text.muted} />;
    if (fileType.includes("pdf")) return <IconFileTypePdf size={24} color="#EF4444" />;
    if (fileType.includes("doc") || fileType.includes("word")) return <IconFileTypeDoc size={24} color="#0EA5E9" />;
    if (fileType.includes("image")) return <IconPhoto size={24} color="#22C55E" />;
    return <IconFileText size={24} color={COLORS.text.muted} />;
  };
  
  // Cargar recursos disponibles
  const loadResources = async () => {
    try {
      setLoadingResources(true);
      
      // Usar API del servidor para evitar problemas de RLS y timeouts
      const res = await fetch('/api/admin/getResources');
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error("Error loading resources:", errorData);
        setResources([]);
        return;
      }
      
      const data = await res.json();
      const apiResources = data.resources || [];
      
      // Mapear recursos al formato esperado por el modal
      const mappedResources = apiResources.map((r: any) => ({
        id: r.id,
        name: r.name || 'Sin nombre',
        title: r.name || 'Sin nombre',
        url: r.url,
        file_url: r.url,
        file_type: r.type || 'application/octet-stream',
        type: r.type || 'application/octet-stream',
        size: r.size || 0,
        description: r.metadata?.description || '',
      }));
      
      setResources(mappedResources);
    } catch (error) {
      console.error("Error loading resources:", error);
      setResources([]);
    } finally {
      setLoadingResources(false);
    }
  };
  
  // Ref para evitar guardar en historial durante undo/redo
  const isUndoRedoAction = useRef(false);
  
  // Función para guardar en historial (para undo/redo)
  const saveToHistory = useCallback((newSubsections: Subsection[]) => {
    // No guardar si estamos en medio de un undo/redo
    if (isUndoRedoAction.current) return;
    
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newSubsections)));
      if (newHistory.length > maxHistoryLength) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, maxHistoryLength - 1));
  }, [historyIndex]);
  
  // Undo
  const handleUndo = useCallback(() => {
    console.log('[Undo] historyIndex:', historyIndex, 'history.length:', history.length);
    console.log('[Undo] history states:', history.map((h, i) => `[${i}]: ${h.length} subs, first: ${h[0]?.title}`));
    if (historyIndex > 0) {
      isUndoRedoAction.current = true;
      const newIndex = historyIndex - 1;
      console.log('[Undo] Going to index:', newIndex, 'state:', history[newIndex]?.[0]?.title);
      setHistoryIndex(newIndex);
      setSubsections(JSON.parse(JSON.stringify(history[newIndex])));
      // Reset flag después de que React procese el cambio
      setTimeout(() => { isUndoRedoAction.current = false; }, 0);
    }
  }, [history, historyIndex]);
  
  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedoAction.current = true;
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setSubsections(JSON.parse(JSON.stringify(history[newIndex])));
      // Reset flag después de que React procese el cambio
      setTimeout(() => { isUndoRedoAction.current = false; }, 0);
    }
  }, [history, historyIndex]);
  
  // Inicializar historial cuando se cargan las subsecciones de la BD
  const historyInitialized = useRef(false);
  useEffect(() => {
    if (!historyInitialized.current && dataLoadedFromDB && subsections.length > 0) {
      console.log('[History] Initializing with DB data:', subsections.length, 'subsections');
      setHistory([JSON.parse(JSON.stringify(subsections))]);
      setHistoryIndex(0);
      historyInitialized.current = true;
    }
  }, [subsections, dataLoadedFromDB]);
  
  // Atajos de teclado para Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input o textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          handleRedo();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);
  
  // Obtener subsección activa
  const currentSubsection = subsections.find(s => s.id === activeSubsection);
  const blockIds = currentSubsection?.blocks.map(b => b.id) || [];
  
  // Ref para evitar loop infinito al cargar estilos
  const isLoadingStylesRef = useRef(false);
  
  // Cargar estilos guardados cuando se selecciona un bloque
  useEffect(() => {
    if (!selectedBlockId || !currentSubsection) return;
    
    const selectedBlock = currentSubsection.blocks.find(b => b.id === selectedBlockId);
    if (!selectedBlock) return;
    
    // Solo cargar estilos para bloques de texto y heading
    if (selectedBlock.type !== "text" && selectedBlock.type !== "heading") return;
    
    isLoadingStylesRef.current = true;
    
    const savedStyles = selectedBlock.data?.styles;
    if (savedStyles) {
      setFontFamily(savedStyles.fontFamily || "Inter");
      setFontWeight(savedStyles.fontWeight || "Regular");
      setFontSize(savedStyles.fontSize || "16");
      setTextAlign(savedStyles.textAlign || "left");
      setSelectedColor(savedStyles.color || COLORS.palettSwatches[0]);
      setTextStyles({
        bold: savedStyles.bold || false,
        italic: savedStyles.italic || false,
        underline: savedStyles.underline || false,
        strikethrough: savedStyles.strikethrough || false,
      });
    } else {
      // Reset a valores por defecto si no hay estilos guardados
      setFontFamily("Inter");
      setFontWeight("Regular");
      setFontSize("16");
      setTextAlign("left");
      setSelectedColor(COLORS.palettSwatches[0]);
      setTextStyles({ bold: false, italic: false, underline: false, strikethrough: false });
    }
    
    // Permitir guardar después de un pequeño delay
    setTimeout(() => {
      isLoadingStylesRef.current = false;
    }, 100);
  }, [selectedBlockId, currentSubsection]);

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    if (active.data.current?.type === "component") {
      setDraggedType(active.data.current.componentType);
    }
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setDraggedType(null);
    
    if (!over) return;
    
    // Si es un componente del sidebar siendo arrastrado al canvas
    if (active.data.current?.type === "component") {
      const componentType = active.data.current.componentType as BlockType;
      addBlock(componentType);
      return;
    }
    
    // Si es un bloque siendo reordenado
    if (active.id !== over.id && currentSubsection) {
      const oldIndex = currentSubsection.blocks.findIndex(b => b.id === active.id);
      const newIndex = currentSubsection.blocks.findIndex(b => b.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        setSubsections(subs => {
          const newSubs = subs.map(s => 
            s.id === activeSubsection
              ? { ...s, blocks: arrayMove(s.blocks, oldIndex, newIndex) }
              : s
          );
          saveToHistory(newSubs);
          return newSubs;
        });
      }
    }
  };
  
  // Agregar bloque
  const addBlock = (type: BlockType) => {
    if (!currentSubsection) return;
    
    // Para tipos que requieren modal, primero abrir el modal
    if (type === "image") {
      const newBlock: ContentBlock = { id: Date.now().toString(), type, content: "", data: {} };
      setSubsections(subs => {
        const newSubs = subs.map(s => 
          s.id === activeSubsection ? { ...s, blocks: [...s.blocks, newBlock] } : s
        );
        saveToHistory(newSubs);
        return newSubs;
      });
      setEditingBlockId(newBlock.id);
      setShowImageModal(true);
      return;
    }
    
    if (type === "video") {
      const newBlock: ContentBlock = { id: Date.now().toString(), type, content: "", data: {} };
      setSubsections(subs => {
        const newSubs = subs.map(s => 
          s.id === activeSubsection ? { ...s, blocks: [...s.blocks, newBlock] } : s
        );
        saveToHistory(newSubs);
        return newSubs;
      });
      setEditingBlockId(newBlock.id);
      setShowVideoModal(true);
      return;
    }
    
    if (type === "gallery") {
      const newBlock: ContentBlock = { id: Date.now().toString(), type, content: "", data: { images: [] } };
      setSubsections(subs => {
        const newSubs = subs.map(s => 
          s.id === activeSubsection ? { ...s, blocks: [...s.blocks, newBlock] } : s
        );
        saveToHistory(newSubs);
        return newSubs;
      });
      setEditingBlockId(newBlock.id);
      setGalleryImages([]);
      setShowGalleryModal(true);
      return;
    }
    
    if (type === "table") {
      const newBlock: ContentBlock = { id: Date.now().toString(), type, content: "", data: { rows: 3, cols: 3, cells: [] } };
      setSubsections(subs => {
        const newSubs = subs.map(s => 
          s.id === activeSubsection ? { ...s, blocks: [...s.blocks, newBlock] } : s
        );
        saveToHistory(newSubs);
        return newSubs;
      });
      setEditingBlockId(newBlock.id);
      setTableRows(3);
      setTableCols(3);
      setShowTableModal(true);
      return;
    }
    
    if (type === "quiz") {
      const newBlock: ContentBlock = { id: Date.now().toString(), type, content: "", data: {} };
      setSubsections(subs => {
        const newSubs = subs.map(s => 
          s.id === activeSubsection ? { ...s, blocks: [...s.blocks, newBlock] } : s
        );
        saveToHistory(newSubs);
        return newSubs;
      });
      setEditingBlockId(newBlock.id);
      loadQuizzes();
      setShowQuizModal(true);
      return;
    }
    
    if (type === "attachment") {
      const newBlock: ContentBlock = { id: Date.now().toString(), type, content: "", data: {} };
      setSubsections(subs => {
        const newSubs = subs.map(s => 
          s.id === activeSubsection ? { ...s, blocks: [...s.blocks, newBlock] } : s
        );
        saveToHistory(newSubs);
        return newSubs;
      });
      setEditingBlockId(newBlock.id);
      loadResources();
      setShowAttachmentModal(true);
      return;
    }
    
    // Para otros tipos (heading, text, richtext, list)
    const newBlock: ContentBlock = {
      id: Date.now().toString(),
      type,
      content: type === "heading" ? "Nuevo título" : type === "text" ? "Escribe aquí..." : type === "richtext" ? "<p></p>" : "",
      data: type === "list" ? { items: ["Elemento 1", "Elemento 2", "Elemento 3"] } : undefined,
    };
    
    setSubsections(subs => {
      const newSubs = subs.map(s => 
        s.id === activeSubsection ? { ...s, blocks: [...s.blocks, newBlock] } : s
      );
      saveToHistory(newSubs);
      return newSubs;
    });
  };
  
  // Actualizar bloque - Solo actualiza el contenido del bloque, NO sincroniza con lessonTitle
  const updateBlockContent = (blockId: string, content: string, data?: any) => {
    setSubsections(subs => {
      const newSubs = subs.map(s => {
        // Verificar si el bloque es el primer heading de la subsección
        const blockIndex = s.blocks.findIndex(b => b.id === blockId);
        const block = s.blocks[blockIndex];
        const isFirstHeading = blockIndex === 0 && block?.type === "heading";
        
        return {
          ...s,
          // Si es el primer heading, sincronizar con el título de la subsección (tab)
          title: isFirstHeading ? content : s.title,
          blocks: s.blocks.map(b => b.id === blockId ? { ...b, content, data: data !== undefined ? data : b.data } : b)
        };
      });
      saveToHistory(newSubs);
      return newSubs;
    });
  };

  // Guardar estilos cuando cambian y hay un bloque seleccionado
  useEffect(() => {
    // No guardar si estamos cargando estilos (evitar loop infinito)
    if (isLoadingStylesRef.current) return;
    if (!selectedBlockId || !currentSubsection) return;
    
    const selectedBlock = currentSubsection.blocks.find(b => b.id === selectedBlockId);
    if (!selectedBlock) return;
    
    // Solo guardar estilos para bloques de texto y heading
    if (selectedBlock.type !== "text" && selectedBlock.type !== "heading") return;
    
    // Guardar estilos en el bloque
    const styles = {
      fontFamily,
      fontWeight,
      fontSize,
      textAlign,
      color: selectedColor,
      bold: textStyles.bold,
      italic: textStyles.italic,
      underline: textStyles.underline,
      strikethrough: textStyles.strikethrough,
    };
    
    // Solo guardar si los estilos son diferentes a los guardados
    const savedStyles = selectedBlock.data?.styles;
    if (savedStyles && 
        savedStyles.fontFamily === styles.fontFamily &&
        savedStyles.fontWeight === styles.fontWeight &&
        savedStyles.fontSize === styles.fontSize &&
        savedStyles.textAlign === styles.textAlign &&
        savedStyles.color === styles.color &&
        savedStyles.bold === styles.bold &&
        savedStyles.italic === styles.italic &&
        savedStyles.underline === styles.underline &&
        savedStyles.strikethrough === styles.strikethrough) {
      return; // No hay cambios, no guardar
    }
    
    updateBlockContent(selectedBlockId, selectedBlock.content, {
      ...selectedBlock.data,
      styles,
    });
  }, [fontFamily, fontWeight, fontSize, textAlign, selectedColor, textStyles, selectedBlockId, currentSubsection, updateBlockContent]);
  
  // Eliminar bloque
  const deleteBlock = (blockId: string) => {
    setSubsections(subs => {
      const newSubs = subs.map(s => ({
        ...s,
        blocks: s.blocks.filter(b => b.id !== blockId)
      }));
      saveToHistory(newSubs);
      return newSubs;
    });
    setSelectedBlockId(null);
  };
  
  // Agregar subsección
  const addSubsection = () => {
    const newId = Date.now().toString();
    const newSubsection: Subsection = {
      id: newId,
      title: `Lección ${subsections.length + 1}`,
      blocks: [
        { id: `${newId}-b1`, type: "heading", content: `Lección ${subsections.length + 1}` },
        { id: `${newId}-b2`, type: "text", content: "Escribe el contenido aquí..." },
      ],
    };
    const newSubs = [...subsections, newSubsection];
    setSubsections(newSubs);
    saveToHistory(newSubs);
    setActiveSubsection(newId);
  };

  const deleteSubsection = (subsectionId: string) => {
    if (subsections.length <= 1) {
      alert("La lección debe tener al menos una subsección");
      return;
    }

    const newSubs = subsections.filter((s) => s.id !== subsectionId);
    setSubsections(newSubs);
    saveToHistory(newSubs);

    if (activeSubsection === subsectionId && newSubs.length > 0) {
      setActiveSubsection(newSubs[0].id);
    }
  };
  
  // Subir video a Supabase (hasta 2GB)
  const handleVideoUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024 * 1024) {
      alert("El video no puede superar los 2GB");
      return;
    }

    try {
      setUploadingVideo(true);
      setUploadProgress(0);
      
      const timestamp = Date.now();
      const filePath = `lessons/${timestamp}_${file.name}`;
      
      // Supabase storage upload
      const { error: uploadError } = await supabaseClient.storage
        .from("videos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });
      
      if (uploadError) throw uploadError;
      
      // Obtener URL firmada (válida por 1 año)
      const { data: urlData, error: urlError } = await supabaseClient.storage
        .from("videos")
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);
      
      if (urlError) throw urlError;
      
      // Actualizar bloque
      if (editingBlockId) {
        updateBlockContent(editingBlockId, urlData.signedUrl, {
          videoType: "upload",
          fileName: file.name,
          fileSize: file.size,
        });
      }
      
      setShowVideoModal(false);
      setVideoUrl("");
      setUploadProgress(100);
    } catch (error) {
      console.error("Error uploading video:", error);
      alert("Error al subir el video");
    } finally {
      setUploadingVideo(false);
    }
  };

  // Agregar video por URL
  const handleAddVideoUrl = () => {
    if (!videoUrl.trim() || !editingBlockId) return;
    
    const isYouTube = videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be");
    
    updateBlockContent(editingBlockId, videoUrl, {
      videoType: isYouTube ? "youtube" : "external",
    });
    
    setShowVideoModal(false);
    setVideoUrl("");
  };
  
  // Subir imágenes a galería
  const handleGalleryUpload = async (files: FileList) => {
    try {
      setUploadingGallery(true);
      const uploadedUrls: string[] = [];
      
      for (const file of Array.from(files)) {
        const timestamp = Date.now();
        const filePath = `lessons/gallery/${timestamp}_${file.name}`;
        
        const { error: uploadError } = await supabaseClient.storage
          .from("covers")
          .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabaseClient.storage
          .from("covers")
          .getPublicUrl(filePath);
        
        uploadedUrls.push(urlData.publicUrl);
      }
      
      // Actualizar bloque con todas las imágenes
      if (editingBlockId) {
        const existingImages = subsections
          .flatMap(s => s.blocks)
          .find(b => b.id === editingBlockId)?.data?.images || [];
        
        updateBlockContent(editingBlockId, "", {
          images: [...existingImages, ...uploadedUrls],
        });
      }
      
      setGalleryImages([...galleryImages, ...uploadedUrls]);
    } catch (error) {
      console.error("Error uploading gallery images:", error);
      alert("Error al subir las imágenes");
    } finally {
      setUploadingGallery(false);
    }
  };
  
  // Guardar lección (actualizar)
  const handleSave = async () => {
    if (!user) {
      alert("Debes iniciar sesión para guardar");
      return;
    }
    
    if (!lessonTitle.trim()) {
      alert("El título es requerido");
      return;
    }
    
    if (!lessonId) {
      alert("ID de lección no encontrado");
      return;
    }
    
    try {
      setSaving(true);
      
      // Preparar contenido serializado (incluir id para mantener consistencia al cargar)
      const contentData = {
        subsections: subsections.map(s => ({
          id: s.id,
          title: s.title,
          blocks: s.blocks,
        })),
      };
      
      // Usar API del servidor para evitar problemas de RLS y timeouts
      const res = await fetch('/api/admin/updateLesson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonId,
          title: lessonTitle,
          description: lessonSubtitle,
          content: JSON.stringify(contentData),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al actualizar la lección');
      }

      const data = await res.json();
      
      if (!data.success) {
        throw new Error('Error al actualizar la lección');
      }

      setLastSaved(new Date());
      alert("¡Lección actualizada exitosamente!");
      router.push(`/dashboard/courses/${courseId}`);
    } catch (error: any) {
      console.error("Error saving lesson:", error);
      alert(error.message || "Error al guardar la lección. Revisa la consola para más detalles.");
    } finally {
      setSaving(false);
    }
  };

  // Formatear tiempo
  const formatLastSaved = () => {
    if (!lastSaved) return null;
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastSaved.getTime()) / 1000);
    if (diff < 60) return "hace unos segundos";
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    return `hace ${Math.floor(diff / 3600)} h`;
  };

  // No necesitamos verificar autenticación aquí - el DashboardLayout ya lo hace
  // Si llegamos aquí, significa que el usuario está autenticado

  // Mostrar loader mientras carga
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        backgroundColor: COLORS.background.app,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <IconLoader2 size={48} className="animate-spin" color={COLORS.accent.primary} />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div style={{ 
        minHeight: "100vh", 
        backgroundColor: COLORS.background.app,
        display: "flex",
        flexDirection: "column",
      }}>
        {/* ===== HEADER BAR ===== */}
        <header style={{
          backgroundColor: COLORS.background.headerBar,
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
        position: "sticky",
        top: 0,
        zIndex: 40, // Reducido para no sobreponerse a la navbar del sistema
      }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={() => router.back()}
              style={{
                background: "transparent",
                border: "none",
                color: COLORS.text.onDark,
                cursor: "pointer",
                padding: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconMenu2 size={20} />
      </button>

            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <input
                  type="text"
                  value={lessonTitle || ""}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: COLORS.text.onDark,
                    fontSize: 15,
                    fontWeight: 500,
                    outline: "none",
                    width: "auto",
                    minWidth: 100,
                    maxWidth: 300,
                  }}
                  size={lessonTitle.length || 10}
                  placeholder="Título de la lección"
                />
                <IconPencil size={12} style={{ color: "rgba(249,250,251,0.5)", flexShrink: 0 }} />
              </div>
              <p style={{
                fontSize: 11,
                color: "rgba(249,250,251,0.7)",
                marginTop: 2,
              }}>
                {lessonSubtitle}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {lastSaved && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                backgroundColor: "rgba(255,255,255,0.1)",
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 11,
                color: COLORS.text.onDark,
              }}>
                <IconCheck size={14} />
                Cambios guardados {formatLastSaved()}
          </div>
            )}
            
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                height: 36,
                padding: "0 18px",
                borderRadius: 999,
                backgroundColor: COLORS.text.onDark,
                color: COLORS.accent.primary,
                border: "none",
                fontSize: 13,
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
                transition: "all 150ms ease-out",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {saving && <IconLoader2 size={16} className="animate-spin" />}
              {saving ? "Guardando..." : "Guardar lección"}
            </button>
          </div>
        </header>
        
        {/* ===== TABS BAR ===== */}
        <div style={{
          backgroundColor: COLORS.background.tabsBar,
          height: 52,
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          gap: 8,
          borderBottom: `1px solid ${COLORS.accent.borderSubtle}`,
          overflowX: "auto",
          position: "relative",
          zIndex: 10, // Menor que el header del sistema
        }}>
          <button
            onClick={addSubsection}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 999,
              border: "none",
              background: "transparent",
              color: COLORS.accent.primary,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <IconPlus size={16} />
            Agregar lección
          </button>
          
          <div style={{ width: 1, height: 24, backgroundColor: COLORS.accent.borderSubtle, margin: "0 8px" }} />
          
          {subsections.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setActiveSubsection(sub.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 18px",
                borderRadius: 999,
                border: "none",
                backgroundColor: activeSubsection === sub.id ? COLORS.accent.primarySoft : "transparent",
                color: activeSubsection === sub.id ? COLORS.accent.primary : COLORS.text.secondary,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 150ms ease-out",
              }}
            >
              <span>{sub.title}</span>
              {subsections.length > 1 && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSubsection(sub.id);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    backgroundColor: activeSubsection === sub.id ? "rgba(26,33,112,0.08)" : "transparent",
                    color: activeSubsection === sub.id ? COLORS.accent.primary : COLORS.text.muted,
                  }}
                >
                  <IconX size={12} />
                </span>
              )}
            </button>
          ))}
        </div>
        
        {/* ===== MAIN AREA ===== */}
        <div style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "220px 1fr 280px",
          gap: 24,
          padding: 24,
          maxWidth: 1440,
          margin: "0 auto",
          width: "100%",
        }}>
          
          {/* ===== COMPONENTS SIDEBAR ===== */}
          <aside style={{
            backgroundColor: COLORS.background.sidebar,
            borderRadius: 16,
            boxShadow: "0 10px 30px rgba(26,33,112,0.10)",
            padding: "24px 16px",
            height: "fit-content",
            position: "sticky",
            top: 140,
          }}>
            <h3 style={{
              fontSize: 11,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: COLORS.text.muted,
              marginBottom: 16,
            }}>
              Componentes
            </h3>
            <p style={{ fontSize: 11, color: COLORS.text.muted, marginBottom: 16 }}>
              Arrastra los componentes al área de contenido
            </p>
            
            <SortableContext items={COMPONENTS.map(c => `component-${c.id}`)} strategy={verticalListSortingStrategy}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {COMPONENTS.map((comp) => (
                  <DraggableComponent key={comp.id} {...comp} />
                ))}
              </div>
            </SortableContext>
          </aside>
          
          {/* ===== CONTENT CANVAS ===== */}
          <main style={{
            backgroundColor: COLORS.background.canvas,
            borderRadius: 16,
            boxShadow: "0 10px 30px rgba(26,33,112,0.10)",
            padding: 32,
            minHeight: 600,
          }}>
            <CanvasDropzone id="canvas">
              {currentSubsection && (
                <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
                  {currentSubsection.blocks.map((block) => (
                    <SortableBlock
                      key={block.id}
                      block={block}
                      isSelected={selectedBlockId === block.id}
                      onSelect={() => setSelectedBlockId(block.id)}
                      onDelete={() => deleteBlock(block.id)}
                      onUpdate={(content, data) => updateBlockContent(block.id, content, data)}
                      onOpenVideoModal={() => {
                        setEditingBlockId(block.id);
                        setShowVideoModal(true);
                      }}
                      onOpenGalleryModal={() => {
                        setEditingBlockId(block.id);
                        setGalleryImages(block.data?.images || []);
                        setShowGalleryModal(true);
                      }}
                      onOpenImageModal={() => {
                        setEditingBlockId(block.id);
                        setImageUrl(block.content || "");
                        setImageDescription(block.data?.description || "");
                        setShowImageModal(true);
                      }}
                      blockStyles={selectedBlockId === block.id ? {
                        fontFamily,
                        fontWeight,
                        fontSize,
                        textAlign,
                        color: selectedColor,
                        bold: textStyles.bold,
                        italic: textStyles.italic,
                        underline: textStyles.underline,
                        strikethrough: textStyles.strikethrough,
                      } : undefined}
                    />
                  ))}
                </SortableContext>
              )}
              
              {/* Botón para agregar más contenido */}
              <button
                onClick={() => addBlock("text")}
                style={{
                  width: "100%",
                  padding: "24px",
                  border: `2px dashed ${COLORS.accent.borderStrong}`,
                  borderRadius: 12,
                  backgroundColor: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  color: COLORS.text.muted,
                  fontSize: 14,
                  transition: "all 150ms ease-out",
                  marginTop: 16,
                }}
              >
                <IconPlus size={20} />
                Agregar contenido
              </button>
            </CanvasDropzone>
          </main>
          
          {/* ===== STYLE PANEL ===== */}
          <aside style={{
            backgroundColor: COLORS.background.rightPanel,
            borderRadius: 16,
            boxShadow: "0 10px 30px rgba(26,33,112,0.10)",
            padding: 18,
            height: "fit-content",
            position: "sticky",
            top: 140,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}>
            {/* Toolbar tabs */}
            <div style={{ display: "flex", gap: 6 }}>
              {[IconAlignLeft, IconAlignCenter, IconTable, IconLayoutGrid, IconList].map((Icon, i) => (
                <button
                  key={i}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    border: "none",
                    backgroundColor: i === 0 ? COLORS.accent.primary : "#F3F4F6",
                    color: i === 0 ? COLORS.text.onAccent : COLORS.text.secondary,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>
            
            {/* Typography Section */}
            <div>
              <h4 style={{
                fontSize: 11,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: COLORS.text.muted,
                marginBottom: 12,
              }}>
                Tipografía
              </h4>
              
              {/* Font Family */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: COLORS.text.secondary, marginBottom: 4, display: "block" }}>
                  Fuente
                </label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  style={{
                    width: "100%",
                    height: 36,
                    borderRadius: 10,
                    border: `1px solid ${COLORS.accent.borderSubtle}`,
                    padding: "0 10px",
                    fontSize: 13,
                    color: COLORS.text.primary,
                    backgroundColor: "white",
                    cursor: "pointer",
                  }}
                >
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Lato">Lato</option>
                </select>
              </div>
              
              {/* Font Weight & Size */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: COLORS.text.secondary, marginBottom: 4, display: "block" }}>
                    Peso
                  </label>
                <select
                    value={fontWeight}
                    onChange={(e) => setFontWeight(e.target.value)}
                    style={{
                      width: "100%",
                      height: 36,
                      borderRadius: 10,
                      border: `1px solid ${COLORS.accent.borderSubtle}`,
                      padding: "0 8px",
                      fontSize: 13,
                      color: COLORS.text.primary,
                      backgroundColor: "white",
                    }}
                  >
                    <option value="Light">Light</option>
                    <option value="Regular">Regular</option>
                    <option value="Medium">Medium</option>
                    <option value="Semibold">Semibold</option>
                    <option value="Bold">Bold</option>
                </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: COLORS.text.secondary, marginBottom: 4, display: "block" }}>
                    Tamaño
                  </label>
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value)}
                    style={{
                      width: "100%",
                      height: 36,
                      borderRadius: 10,
                      border: `1px solid ${COLORS.accent.borderSubtle}`,
                      padding: "0 8px",
                      fontSize: 13,
                      color: COLORS.text.primary,
                      backgroundColor: "white",
                    }}
                  >
                    {[12, 14, 16, 18, 20, 24, 28, 32].map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Alignment */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: COLORS.text.secondary, marginBottom: 4, display: "block" }}>
                  Alineación
              </label>
                <div style={{ display: "flex", gap: 4 }}>
                  {[
                    { value: "left", icon: IconAlignLeft },
                    { value: "center", icon: IconAlignCenter },
                    { value: "right", icon: IconAlignRight },
                    { value: "justify", icon: IconAlignJustified },
                  ].map(({ value, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setTextAlign(value as any)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        border: "none",
                        backgroundColor: textAlign === value ? COLORS.accent.primarySoft : "#F3F4F6",
                        color: textAlign === value ? COLORS.accent.primary : COLORS.text.secondary,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon size={14} />
                    </button>
                  ))}
            </div>
              </div>
              
              {/* Style Toggles */}
              <div>
                <label style={{ fontSize: 12, color: COLORS.text.secondary, marginBottom: 4, display: "block" }}>
                  Estilo
              </label>
                <div style={{ display: "flex", gap: 4 }}>
                  {[
                    { key: "bold", icon: IconBold },
                    { key: "italic", icon: IconItalic },
                    { key: "underline", icon: IconUnderline },
                    { key: "strikethrough", icon: IconStrikethrough },
                  ].map(({ key, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setTextStyles(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        border: `1px solid ${COLORS.accent.borderSubtle}`,
                        backgroundColor: textStyles[key as keyof typeof textStyles] ? COLORS.accent.primarySoft : "white",
                        color: textStyles[key as keyof typeof textStyles] ? COLORS.accent.primary : COLORS.text.secondary,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon size={14} />
                    </button>
                  ))}
            </div>
              </div>
            </div>
            
            {/* Palette Section */}
            <div>
              <h4 style={{
                fontSize: 11,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: COLORS.text.muted,
                marginBottom: 12,
              }}>
                Paleta
              </h4>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: 6,
              }}>
                {COLORS.palettSwatches.map((color, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedColor(color)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      backgroundColor: color,
                      border: selectedColor === color ? `2px solid ${COLORS.text.primary}` : "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {selectedColor === color && <IconCheck size={12} color="white" />}
                  </button>
                ))}
            </div>
            </div>
            
            {/* Image Description Section - Only show when image is selected */}
            {(() => {
              const selectedBlock = currentSubsection?.blocks.find(b => b.id === selectedBlockId);
              if (selectedBlock?.type === "image" && selectedBlock?.content) {
                return (
                  <div>
                    <h4 style={{
                      fontSize: 11,
                      fontWeight: 500,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      color: COLORS.text.muted,
                      marginBottom: 12,
                    }}>
                      Descripción de la Imagen
                    </h4>
                    <textarea
                      value={selectedBlock.data?.description || ""}
                      onChange={(e) => {
                        if (selectedBlockId) {
                          updateBlockContent(selectedBlockId, selectedBlock.content, {
                            ...selectedBlock.data,
                            description: e.target.value
                          });
                        }
                      }}
                      placeholder="Describe la imagen para accesibilidad y contexto..."
                      style={{ 
                        width: "100%", 
                        minHeight: 80, 
                        borderRadius: 10, 
                        border: `1px solid ${COLORS.accent.borderSubtle}`, 
                        padding: "10px", 
                        fontSize: 13,
                        fontFamily: "inherit",
                        resize: "vertical",
                        color: COLORS.text.primary,
                        backgroundColor: "white"
                      }}
                    />
                    <p style={{ 
                      fontSize: 11, 
                      color: COLORS.text.muted, 
                      marginTop: 6 
                    }}>
                      Esta descripción se mostrará debajo de la imagen y como texto alternativo (alt).
                    </p>
                  </div>
                );
              }
              return null;
            })()}
            
            {/* Course Guide Card */}
            <div style={{
              background: `linear-gradient(180deg, ${COLORS.accent.primary} 0%, #6366F1 100%)`,
              borderRadius: 18,
              padding: 16,
            }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", marginBottom: 4 }}>
                Guía del Curso
              </p>
              <p style={{ fontSize: 13, fontWeight: 600, color: "white", marginBottom: 12 }}>
                ¿Cómo crear tu primera lección?
              </p>
              <button 
                onClick={() => setShowGuideModal(true)}
                style={{
                  height: 32,
                  padding: "0 16px",
                  borderRadius: 999,
                  backgroundColor: "white",
                  color: COLORS.text.primary,
                  border: "none",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Iniciar guía
              </button>
            </div>
            
            {/* Controlling Centre */}
            <div style={{
              backgroundColor: COLORS.background.headerBar,
              borderRadius: 22,
              padding: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}>
              <button 
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                style={{
                  height: 32,
                  padding: "0 16px",
                  borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  color: COLORS.text.onDark,
                  border: "none",
                  fontSize: 12,
                  cursor: historyIndex > 0 ? "pointer" : "not-allowed",
                  opacity: historyIndex > 0 ? 1 : 0.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <IconArrowLeft size={14} />
                Deshacer
              </button>
              <button 
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                style={{
                  height: 32,
                  padding: "0 16px",
                  borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  color: COLORS.text.onDark,
                  border: "none",
                  fontSize: 12,
                  cursor: historyIndex < history.length - 1 ? "pointer" : "not-allowed",
                  opacity: historyIndex < history.length - 1 ? 1 : 0.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                Rehacer
                <IconArrowRight size={14} />
              </button>
              <button 
                onClick={() => setShowGuideModal(true)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  backgroundColor: "rgba(255,255,255,0.1)",
                  color: COLORS.text.onDark,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconQuestionMark size={14} />
              </button>
            </div>
          </aside>
        </div>
        
        {/* Drag Overlay */}
        <DragOverlay>
          {activeId && draggedType && (
            <div style={{
              padding: "12px 16px",
              backgroundColor: COLORS.accent.primarySoft,
              borderRadius: 12,
              boxShadow: "0 10px 30px rgba(26,33,112,0.20)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              {COMPONENTS.find(c => c.id === draggedType)?.icon && (
                <>
                  {(() => {
                    const Icon = COMPONENTS.find(c => c.id === draggedType)!.icon;
                    return <Icon size={20} color={COLORS.accent.primary} />;
                  })()}
                </>
              )}
              <span style={{ fontWeight: 500, color: COLORS.accent.primary }}>
                {COMPONENTS.find(c => c.id === draggedType)?.label}
                </span>
            </div>
          )}
        </DragOverlay>
      </div>
      
      {/* ===== VIDEO MODAL ===== */}
      {showVideoModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
          }}
          onClick={() => setShowVideoModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: 24,
              width: 500,
              maxWidth: "90vw",
              maxHeight: "90vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: COLORS.text.primary }}>
                Agregar Video
              </h3>
              <button
                onClick={() => setShowVideoModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                <IconX size={20} color={COLORS.text.muted} />
              </button>
                </div>
            
            {/* Tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {[
                { id: "youtube", label: "YouTube", icon: IconBrandYoutube },
                { id: "external", label: "Link externo", icon: IconLink },
                { id: "upload", label: "Subir video", icon: IconCloudUpload },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setVideoTab(id as any)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: 10,
                    border: "none",
                    backgroundColor: videoTab === id ? COLORS.accent.primarySoft : "#F3F4F6",
                    color: videoTab === id ? COLORS.accent.primary : COLORS.text.secondary,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  <Icon size={24} />
                  {label}
                </button>
              ))}
              </div>

            {/* YouTube Tab */}
            {videoTab === "youtube" && (
              <div>
                <label style={{ fontSize: 12, color: COLORS.text.secondary, marginBottom: 8, display: "block" }}>
                  URL de YouTube
              </label>
              <input
                type="url"
                  value={videoUrl || ""}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  style={{
                    width: "100%",
                    height: 44,
                    borderRadius: 10,
                    border: `1px solid ${COLORS.accent.borderSubtle}`,
                    padding: "0 12px",
                    fontSize: 14,
                    marginBottom: 16,
                  }}
                  />
                  <button
                  onClick={handleAddVideoUrl}
                  disabled={!videoUrl.trim()}
                  style={{
                    width: "100%",
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: COLORS.accent.primary,
                    color: "white",
                    border: "none",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: videoUrl.trim() ? "pointer" : "not-allowed",
                    opacity: videoUrl.trim() ? 1 : 0.5,
                  }}
                >
                  Agregar video
                  </button>
            </div>
          )}

            {/* External Tab */}
            {videoTab === "external" && (
              <div>
                <label style={{ fontSize: 12, color: COLORS.text.secondary, marginBottom: 8, display: "block" }}>
                  URL del video (Vimeo, Wistia, etc.)
              </label>
              <input
                type="url"
                  value={videoUrl || ""}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://vimeo.com/... o cualquier URL de video"
                  style={{
                    width: "100%",
                    height: 44,
                    borderRadius: 10,
                    border: `1px solid ${COLORS.accent.borderSubtle}`,
                    padding: "0 12px",
                    fontSize: 14,
                    marginBottom: 16,
                  }}
                />
                <button
                  onClick={handleAddVideoUrl}
                  disabled={!videoUrl.trim()}
                  style={{
                    width: "100%",
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: COLORS.accent.primary,
                    color: "white",
                    border: "none",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: videoUrl.trim() ? "pointer" : "not-allowed",
                    opacity: videoUrl.trim() ? 1 : 0.5,
                  }}
                >
                  Agregar video
                </button>
            </div>
          )}

            {/* Upload Tab */}
            {videoTab === "upload" && (
              <div>
              <input
                  ref={videoFileRef}
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleVideoUpload(file);
                  }}
                  style={{ display: "none" }}
                />
                <button
                  onClick={() => videoFileRef.current?.click()}
                  disabled={uploadingVideo}
                  style={{
                    width: "100%",
                    padding: "40px",
                    border: `2px dashed ${COLORS.accent.borderStrong}`,
                    borderRadius: 12,
                    backgroundColor: COLORS.accent.primarySoft,
                    cursor: uploadingVideo ? "not-allowed" : "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  {uploadingVideo ? (
                    <>
                      <IconLoader2 size={48} color={COLORS.accent.primary} className="animate-spin" />
                      <span style={{ fontSize: 14, color: COLORS.text.primary }}>
                        Subiendo video... {uploadProgress}%
                      </span>
                    </>
                  ) : (
                    <>
                      <IconCloudUpload size={48} color={COLORS.accent.primary} />
                      <span style={{ fontSize: 14, color: COLORS.text.primary }}>
                        Arrastra o haz clic para subir
                      </span>
                      <span style={{ fontSize: 12, color: COLORS.text.muted }}>
                        MP4, WebM, MOV hasta 2GB
                      </span>
                    </>
                  )}
                </button>
                        </div>
            )}
                      </div>
                </div>
              )}

      {/* ===== GALLERY MODAL ===== */}
      {showGalleryModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
          }}
          onClick={() => setShowGalleryModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: 24,
              width: 600,
              maxWidth: "90vw",
              maxHeight: "90vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: COLORS.text.primary }}>
                Agregar Galería de Imágenes
              </h3>
              <button
                onClick={() => setShowGalleryModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                <IconX size={20} color={COLORS.text.muted} />
              </button>
              </div>

                <input
              ref={galleryFileRef}
                  type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                if (e.target.files) handleGalleryUpload(e.target.files);
              }}
              style={{ display: "none" }}
            />
            
            <button
              onClick={() => galleryFileRef.current?.click()}
              disabled={uploadingGallery}
              style={{
                width: "100%",
                padding: "40px",
                border: `2px dashed ${COLORS.accent.borderStrong}`,
                borderRadius: 12,
                backgroundColor: COLORS.accent.primarySoft,
                cursor: uploadingGallery ? "not-allowed" : "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                marginBottom: 20,
              }}
            >
              {uploadingGallery ? (
                <>
                  <IconLoader2 size={48} color={COLORS.accent.primary} className="animate-spin" />
                  <span style={{ fontSize: 14, color: COLORS.text.primary }}>
                    Subiendo imágenes...
              </span>
                </>
              ) : (
                <>
                  <IconPhoto size={48} color={COLORS.accent.primary} />
                  <span style={{ fontSize: 14, color: COLORS.text.primary }}>
                    Arrastra o haz clic para subir múltiples imágenes
                  </span>
                  <span style={{ fontSize: 12, color: COLORS.text.muted }}>
                    PNG, JPG, WebP hasta 10MB cada una
                  </span>
                </>
              )}
            </button>
            
            {/* Preview de imágenes subidas */}
            {galleryImages.length > 0 && (
              <div>
                <p style={{ fontSize: 12, color: COLORS.text.secondary, marginBottom: 12 }}>
                  Imágenes agregadas ({galleryImages.length})
                </p>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 8,
                }}>
                  {galleryImages.map((img, i) => (
                    <div key={i} style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden" }}>
                      <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button
                        onClick={() => setGalleryImages(imgs => imgs.filter((_, idx) => idx !== i))}
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          backgroundColor: COLORS.status.danger,
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <IconX size={14} color="white" />
                  </button>
                </div>
                  ))}
              </div>
            </div>
          )}

            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                <button
                onClick={() => setShowGalleryModal(false)}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: "#F3F4F6",
                  color: COLORS.text.secondary,
                  border: "none",
                  fontSize: 14,
                  cursor: "pointer",
                }}
            >
              Cancelar
            </button>
            <button
                  onClick={() => {
                  if (editingBlockId && galleryImages.length > 0) {
                    updateBlockContent(editingBlockId, "", { images: galleryImages });
                  }
                  setShowGalleryModal(false);
                  setGalleryImages([]);
                }}
                disabled={galleryImages.length === 0}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: COLORS.accent.primary,
                  color: "white",
                  border: "none",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: galleryImages.length > 0 ? "pointer" : "not-allowed",
                  opacity: galleryImages.length > 0 ? 1 : 0.5,
                }}
              >
                Guardar galería
                </button>
              </div>
        </div>
      </div>
      )}
      
      {/* ===== IMAGE MODAL ===== */}
      {showImageModal && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
          onClick={() => setShowImageModal(false)}
        >
          <div style={{ backgroundColor: "white", borderRadius: 16, padding: 24, width: 500, maxWidth: "90vw" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: COLORS.text.primary }}>Agregar Imagen</h3>
              <button onClick={() => setShowImageModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <IconX size={20} color={COLORS.text.muted} />
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <button onClick={() => setAttachmentTab("upload")} style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", backgroundColor: attachmentTab === "upload" ? COLORS.accent.primarySoft : "#F3F4F6", color: attachmentTab === "upload" ? COLORS.accent.primary : COLORS.text.secondary, cursor: "pointer" }}>
                <IconUpload size={20} style={{ marginBottom: 4 }} /><br />Subir imagen
              </button>
              <button onClick={() => setAttachmentTab("existing")} style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", backgroundColor: attachmentTab === "existing" ? COLORS.accent.primarySoft : "#F3F4F6", color: attachmentTab === "existing" ? COLORS.accent.primary : COLORS.text.secondary, cursor: "pointer" }}>
                <IconLink size={20} style={{ marginBottom: 4 }} /><br />URL externa
              </button>
            </div>
            {attachmentTab === "upload" ? (
              <>
                <input key="file-input" ref={imageFileRef} type="file" accept="image/*" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setUploadingImage(true);
                    try {
                      const filePath = `lessons/images/${Date.now()}_${file.name}`;
                      await supabaseClient.storage.from("covers").upload(filePath, file);
                      const { data } = supabaseClient.storage.from("covers").getPublicUrl(filePath);
                      if (editingBlockId) updateBlockContent(editingBlockId, data.publicUrl, { 
                        fileName: file.name,
                        description: imageDescription || ""
                      });
                      setShowImageModal(false);
                      setImageDescription("");
                    } catch (err) { alert("Error al subir imagen"); }
                    setUploadingImage(false);
                  }
                }} style={{ display: "none" }} />
                <button onClick={() => imageFileRef.current?.click()} disabled={uploadingImage} style={{ width: "100%", padding: 40, border: `2px dashed ${COLORS.accent.borderStrong}`, borderRadius: 12, backgroundColor: COLORS.accent.primarySoft, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  {uploadingImage ? <IconLoader2 size={48} className="animate-spin" color={COLORS.accent.primary} /> : <IconPhoto size={48} color={COLORS.accent.primary} />}
                  <span>{uploadingImage ? "Subiendo..." : "Haz clic para subir imagen"}</span>
                </button>
              </>
            ) : (
              <>
                <input key="url-input" type="url" value={imageUrl || ""} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://ejemplo.com/imagen.jpg" style={{ width: "100%", height: 44, borderRadius: 10, border: `1px solid ${COLORS.accent.borderSubtle}`, padding: "0 12px", marginBottom: 16 }} />
                <label style={{ fontSize: 12, color: COLORS.text.secondary, marginBottom: 8, display: "block" }}>
                  Descripción de la imagen (opcional)
                </label>
                <textarea
                  value={imageDescription}
                  onChange={(e) => setImageDescription(e.target.value)}
                  placeholder="Describe la imagen para accesibilidad y contexto..."
                  style={{ 
                    width: "100%", 
                    minHeight: 80, 
                    borderRadius: 10, 
                    border: `1px solid ${COLORS.accent.borderSubtle}`, 
                    padding: "12px", 
                    fontSize: 14,
                    fontFamily: "inherit",
                    resize: "vertical",
                    marginBottom: 16 
                  }}
                />
                <button onClick={() => { 
                  if (editingBlockId && imageUrl) { 
                    updateBlockContent(editingBlockId, imageUrl, { 
                      description: imageDescription || ""
                    }); 
                    setShowImageModal(false); 
                    setImageUrl(""); 
                    setImageDescription("");
                  } 
                }} disabled={!imageUrl} style={{ width: "100%", height: 44, borderRadius: 10, backgroundColor: COLORS.accent.primary, color: "white", border: "none", cursor: imageUrl ? "pointer" : "not-allowed", opacity: imageUrl ? 1 : 0.5 }}>Agregar imagen</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== TABLE MODAL ===== */}
      {showTableModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setShowTableModal(false)}>
          <div style={{ backgroundColor: "white", borderRadius: 16, padding: 24, width: 400 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: COLORS.text.primary }}>Crear Tabla</h3>
              <button onClick={() => setShowTableModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><IconX size={20} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 12, color: COLORS.text.secondary, marginBottom: 8, display: "block" }}>Filas (máx. 100)</label>
                <input type="number" min={1} max={100} value={tableRows || 3} onChange={(e) => setTableRows(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))} style={{ width: "100%", height: 44, borderRadius: 10, border: `1px solid ${COLORS.accent.borderSubtle}`, padding: "0 12px" }} />
                        </div>
              <div>
                <label style={{ fontSize: 12, color: COLORS.text.secondary, marginBottom: 8, display: "block" }}>Columnas (máx. 10)</label>
                <input type="number" min={1} max={10} value={tableCols || 3} onChange={(e) => setTableCols(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))} style={{ width: "100%", height: 44, borderRadius: 10, border: `1px solid ${COLORS.accent.borderSubtle}`, padding: "0 12px" }} />
                      </div>
                    </div>
            <div style={{ marginBottom: 20, padding: 16, backgroundColor: "#F9FAFB", borderRadius: 8 }}>
              <p style={{ fontSize: 12, color: COLORS.text.muted, marginBottom: 8 }}>Vista previa:</p>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(tableCols, 5)}, 1fr)`, gap: 2 }}>
                {Array.from({ length: Math.min(tableRows, 3) * Math.min(tableCols, 5) }).map((_, i) => (
                  <div key={i} style={{ height: 20, backgroundColor: COLORS.accent.primarySoft, borderRadius: 2 }} />
                  ))}
                </div>
              {(tableRows > 3 || tableCols > 5) && <p style={{ fontSize: 10, color: COLORS.text.muted, marginTop: 4 }}>...y más celdas</p>}
            </div>
            <button onClick={() => {
              if (editingBlockId) {
                const cells = Array.from({ length: tableRows }, () => Array.from({ length: tableCols }, () => ""));
                updateBlockContent(editingBlockId, "", { rows: tableRows, cols: tableCols, cells });
              }
              setShowTableModal(false);
            }} style={{ width: "100%", height: 44, borderRadius: 10, backgroundColor: COLORS.accent.primary, color: "white", border: "none", cursor: "pointer" }}>Crear tabla</button>
          </div>
                </div>
              )}

      {/* ===== QUIZ MODAL ===== */}
      {showQuizModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setShowQuizModal(false)}>
          <div style={{ backgroundColor: "white", borderRadius: 16, padding: 24, width: 500, maxHeight: "80vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: COLORS.text.primary }}>Seleccionar Quiz</h3>
              <button onClick={() => setShowQuizModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><IconX size={20} /></button>
            </div>
            {loadingQuizzes ? (
              <div style={{ textAlign: "center", padding: 40 }}><IconLoader2 size={32} className="animate-spin" color={COLORS.accent.primary} /></div>
            ) : quizzes.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: COLORS.text.muted }}>
                <IconCheckbox size={48} style={{ marginBottom: 12, opacity: 0.5 }} />
                <p>No hay quizzes disponibles</p>
                <p style={{ fontSize: 12 }}>Crea quizzes en la sección de Encuestas</p>
          </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {quizzes.map((quiz) => (
                  <button key={quiz.id} onClick={() => setSelectedQuizId(quiz.id)} style={{ padding: 16, borderRadius: 10, border: selectedQuizId === quiz.id ? `2px solid ${COLORS.accent.primary}` : `1px solid ${COLORS.accent.borderSubtle}`, backgroundColor: selectedQuizId === quiz.id ? COLORS.accent.primarySoft : "white", cursor: "pointer", textAlign: "left" }}>
                    <p style={{ fontWeight: 500, color: COLORS.text.primary }}>{quiz.title}</p>
                    <p style={{ fontSize: 12, color: COLORS.text.muted }}>{quiz.description || "Sin descripción"}</p>
                  </button>
                ))}
                        </div>
            )}
            <button onClick={() => {
              if (editingBlockId && selectedQuizId) {
                const quiz = quizzes.find(q => q.id === selectedQuizId);
                updateBlockContent(editingBlockId, selectedQuizId, { quizTitle: quiz?.title, quizId: selectedQuizId });
              }
              setShowQuizModal(false);
              setSelectedQuizId(null);
            }} disabled={!selectedQuizId} style={{ width: "100%", height: 44, borderRadius: 10, backgroundColor: COLORS.accent.primary, color: "white", border: "none", cursor: selectedQuizId ? "pointer" : "not-allowed", opacity: selectedQuizId ? 1 : 0.5, marginTop: 16 }}>Agregar quiz</button>
                      </div>
        </div>
      )}

      {/* ===== ATTACHMENT MODAL ===== */}
      {showAttachmentModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setShowAttachmentModal(false)}>
          <div style={{ backgroundColor: "white", borderRadius: 16, padding: 24, width: 600, maxHeight: "80vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: COLORS.text.primary }}>Adjuntar Archivo</h3>
              <button onClick={() => setShowAttachmentModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><IconX size={20} /></button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <button onClick={() => setAttachmentTab("existing")} style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", backgroundColor: attachmentTab === "existing" ? COLORS.accent.primarySoft : "#F3F4F6", color: attachmentTab === "existing" ? COLORS.accent.primary : COLORS.text.secondary, cursor: "pointer" }}>Recursos existentes</button>
              <button onClick={() => setAttachmentTab("upload")} style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", backgroundColor: attachmentTab === "upload" ? COLORS.accent.primarySoft : "#F3F4F6", color: attachmentTab === "upload" ? COLORS.accent.primary : COLORS.text.secondary, cursor: "pointer" }}>Subir nuevo</button>
            </div>
            {attachmentTab === "existing" ? (
              loadingResources ? (
                <div style={{ textAlign: "center", padding: 40 }}><IconLoader2 size={32} className="animate-spin" color={COLORS.accent.primary} /></div>
              ) : resources.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: COLORS.text.muted }}>
                  <IconPaperclip size={48} style={{ marginBottom: 12, opacity: 0.5 }} />
                  <p>No hay recursos disponibles</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflow: "auto" }}>
                  {resources.map((res) => {
                    const fileName = res.name || res.title || res.file_name || 'Sin nombre';
                    const fileType = res.file_type || res.type || 'application/octet-stream';
                    
                    return (
                      <div 
                        key={res.id} 
                        style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: 12, 
                          padding: 12, 
                          borderRadius: 8, 
                          border: `1px solid ${COLORS.accent.borderSubtle}`, 
                          cursor: "pointer",
                          transition: "all 150ms",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = COLORS.accent.primarySoft;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                        onClick={() => {
                          if (editingBlockId) {
                            updateBlockContent(editingBlockId, res.file_url || res.url, { 
                              fileName: fileName, 
                              fileType: fileType, 
                              resourceId: res.id 
                            });
                          }
                          setShowAttachmentModal(false);
                        }}
                      >
                        <div style={{ flexShrink: 0 }}>
                          {getFileIcon(fileType)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 500, fontSize: 14, color: COLORS.text.primary, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {fileName}
                          </p>
                          <p style={{ fontSize: 11, color: COLORS.text.muted }}>
                            {fileType.includes('pdf') ? 'PDF' : 
                             fileType.includes('doc') || fileType.includes('word') ? 'Documento Word' :
                             fileType.includes('image') ? 'Imagen' :
                             fileType.includes('video') ? 'Video' :
                             'Archivo'}
                            {res.size && ` • ${(res.size / 1024).toFixed(1)} KB`}
                          </p>
                      </div>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setPreviewUrl(res.file_url || res.url); 
                            setPreviewType(fileType.includes("pdf") ? "pdf" : "image"); 
                            setShowPreviewModal(true); 
                          }} 
                          style={{ 
                            padding: "6px 10px", 
                            borderRadius: 6, 
                            backgroundColor: "#F3F4F6", 
                            border: "none", 
                            cursor: "pointer",
                            flexShrink: 0,
                          }}
                          title="Ver preview"
                        >
                          <IconEye size={16} color={COLORS.text.secondary} />
                        </button>
                    </div>
                    );
                  })}
                </div>
              )
            ) : (
              <>
                <input ref={attachmentFileRef} type="file" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      // Sanitizar nombre de archivo: remover acentos, espacios y caracteres especiales
                      const sanitizedName = file.name
                        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remover acentos
                        .replace(/[^a-zA-Z0-9._-]/g, '_') // Reemplazar caracteres especiales con _
                        .replace(/_+/g, '_'); // Evitar múltiples guiones bajos
                      const filePath = `lessons/attachments/${Date.now()}_${sanitizedName}`;
                      await supabaseClient.storage.from("attachments").upload(filePath, file);
                      const { data } = supabaseClient.storage.from("attachments").getPublicUrl(filePath);
                      if (editingBlockId) updateBlockContent(editingBlockId, data.publicUrl, { fileName: file.name, fileSize: file.size, fileType: file.type });
                      setShowAttachmentModal(false);
                    } catch (err) { alert("Error al subir archivo"); }
                  }
                }} style={{ display: "none" }} />
                <button onClick={() => attachmentFileRef.current?.click()} style={{ width: "100%", padding: 40, border: `2px dashed ${COLORS.accent.borderStrong}`, borderRadius: 12, backgroundColor: COLORS.accent.primarySoft, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <IconCloudUpload size={48} color={COLORS.accent.primary} />
                  <span>Haz clic para subir archivo</span>
                  <span style={{ fontSize: 12, color: COLORS.text.muted }}>PDF, DOC, XLS, PPT, etc.</span>
                </button>
              </>
              )}
            </div>
          </div>
      )}

      {/* ===== GUIDE MODAL ===== */}
      {showGuideModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setShowGuideModal(false)}>
          <div style={{ backgroundColor: "white", borderRadius: 16, padding: 24, width: 500 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: COLORS.text.primary }}>🎓 Guía para crear lecciones</h3>
              <button onClick={() => setShowGuideModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><IconX size={20} /></button>
                </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: COLORS.accent.primarySoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>1</div>
                <div><p style={{ fontWeight: 500 }}>Agrega lecciones</p><p style={{ fontSize: 13, color: COLORS.text.muted }}>Divide tu sección en partes organizadas usando el botón "Agregar lección"</p></div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: COLORS.accent.primarySoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>2</div>
                <div><p style={{ fontWeight: 500 }}>Arrastra componentes</p><p style={{ fontSize: 13, color: COLORS.text.muted }}>Arrastra desde el panel izquierdo: imágenes, videos, galerías, tablas, quizzes y más</p></div>
            </div>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: COLORS.accent.primarySoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>3</div>
                <div><p style={{ fontWeight: 500 }}>Personaliza el contenido</p><p style={{ fontSize: 13, color: COLORS.text.muted }}>Edita textos, sube archivos y configura cada bloque según tus necesidades</p></div>
            </div>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: COLORS.accent.primarySoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>4</div>
                <div><p style={{ fontWeight: 500 }}>Reordena los bloques</p><p style={{ fontSize: 13, color: COLORS.text.muted }}>Arrastra los bloques para cambiar su orden dentro de la lección</p></div>
            </div>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: COLORS.accent.primarySoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>5</div>
                <div><p style={{ fontWeight: 500 }}>Guarda tu trabajo</p><p style={{ fontSize: 13, color: COLORS.text.muted }}>Haz clic en "Guardar lección" cuando termines de editar</p></div>
          </div>
            </div>
            <button onClick={() => setShowGuideModal(false)} style={{ width: "100%", height: 44, borderRadius: 10, backgroundColor: COLORS.accent.primary, color: "white", border: "none", cursor: "pointer", marginTop: 20 }}>¡Entendido!</button>
          </div>
        </div>
      )}

      {/* ===== PREVIEW MODAL ===== */}
      {showPreviewModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }} onClick={() => setShowPreviewModal(false)}>
          <div style={{ backgroundColor: "white", borderRadius: 16, padding: 16, maxWidth: "90vw", maxHeight: "90vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Vista previa</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{ padding: "6px 12px", borderRadius: 6, backgroundColor: "#F3F4F6", textDecoration: "none", color: COLORS.text.primary, display: "flex", alignItems: "center", gap: 4 }}><IconDownload size={16} /> Descargar</a>
                <button onClick={() => setShowPreviewModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><IconX size={20} /></button>
          </div>
        </div>
            {previewType === "pdf" ? (
              <iframe src={previewUrl} style={{ width: "80vw", height: "70vh", border: "none", borderRadius: 8 }} />
            ) : (
              <img src={previewUrl} alt="Preview" style={{ maxWidth: "80vw", maxHeight: "70vh", borderRadius: 8 }} />
            )}
      </div>
    </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </DndContext>
  );
}
