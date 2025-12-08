"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Undo,
  Redo,
  Palette,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Escribe aquí...",
  maxLength = 500,
  className = "",
}: RichTextEditorProps) {
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const isInternalUpdate = useRef(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  const [showColorPicker, setShowColorPicker] = useState(false);
  
  // Cerrar popup al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    }
    
    if (showColorPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showColorPicker]);
  
  // Colores predefinidos
  const colors = [
    { name: "Negro", value: "#000000" },
    { name: "Gris", value: "#6B7280" },
    { name: "Rojo", value: "#EF4444" },
    { name: "Naranja", value: "#F97316" },
    { name: "Amarillo", value: "#EAB308" },
    { name: "Verde", value: "#22C55E" },
    { name: "Azul", value: "#3B82F6" },
    { name: "Índigo", value: "#6366F1" },
    { name: "Púrpura", value: "#A855F7" },
    { name: "Rosa", value: "#EC4899" },
  ];

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
        // Desactivar link de StarterKit para usar nuestra configuración personalizada
        link: false,
      }),
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-[#A855F7] underline cursor-pointer",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      // Evitar loops: no propagar si ya estamos en una actualización interna
      if (isInternalUpdate.current) return;
      
      const html = editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[100px] p-3",
      },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;

    if (linkUrl === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    // Agregar https:// si no tiene protocolo
    const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    setLinkUrl("");
    setShowLinkInput(false);
  }, [editor, linkUrl]);

  if (!editor) {
    return null;
  }

  const charCount = editor.storage.characterCount?.characters?.() || editor.getText().length;
  const remainingChars = maxLength - charCount;

  return (
    <div className={`border border-slate-200 rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 flex items-center px-2 py-1.5 gap-0.5 flex-wrap">
        {/* Text Style Dropdown */}
        <select
          className="px-2 py-1 text-[13px] border border-slate-200 rounded-md bg-white cursor-pointer mr-1"
          value={
            editor.isActive("heading", { level: 1 })
              ? "h1"
              : editor.isActive("heading", { level: 2 })
              ? "h2"
              : editor.isActive("heading", { level: 3 })
              ? "h3"
              : "p"
          }
          onChange={(e) => {
            const val = e.target.value;
            if (val === "p") {
              editor.chain().focus().setParagraph().run();
            } else if (val === "h1") {
              editor.chain().focus().toggleHeading({ level: 1 }).run();
            } else if (val === "h2") {
              editor.chain().focus().toggleHeading({ level: 2 }).run();
            } else if (val === "h3") {
              editor.chain().focus().toggleHeading({ level: 3 }).run();
            }
          }}
        >
          <option value="p">Normal text</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>

        {/* Divider */}
        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Alignment Buttons */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive({ textAlign: "left" })
              ? "bg-slate-200 text-slate-700"
              : "hover:bg-slate-200 text-slate-500 hover:text-slate-700"
          }`}
          title="Alinear izquierda"
        >
          <AlignLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive({ textAlign: "center" })
              ? "bg-slate-200 text-slate-700"
              : "hover:bg-slate-200 text-slate-500 hover:text-slate-700"
          }`}
          title="Centrar"
        >
          <AlignCenter size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive({ textAlign: "right" })
              ? "bg-slate-200 text-slate-700"
              : "hover:bg-slate-200 text-slate-500 hover:text-slate-700"
          }`}
          title="Alinear derecha"
        >
          <AlignRight size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive({ textAlign: "justify" })
              ? "bg-slate-200 text-slate-700"
              : "hover:bg-slate-200 text-slate-500 hover:text-slate-700"
          }`}
          title="Justificar"
        >
          <AlignJustify size={16} />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Format Buttons */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive("bold")
              ? "bg-slate-200 text-slate-700"
              : "hover:bg-slate-200 text-slate-500 hover:text-slate-700"
          }`}
          title="Negrita (Ctrl+B)"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive("italic")
              ? "bg-slate-200 text-slate-700"
              : "hover:bg-slate-200 text-slate-500 hover:text-slate-700"
          }`}
          title="Cursiva (Ctrl+I)"
        >
          <Italic size={16} />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Color Picker */}
        <div className="relative" ref={colorPickerRef}>
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-1.5 rounded transition-colors hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center gap-1"
            title="Color de texto"
          >
            <Palette size={16} />
            <div 
              className="w-3 h-3 rounded-sm border border-slate-300"
              style={{ backgroundColor: editor.getAttributes("textStyle").color || "#000000" }}
            />
          </button>
          
          {/* Color Picker Popup */}
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 z-50 min-w-[140px]">
              <div className="grid grid-cols-5 gap-2">
                {colors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => {
                      editor.chain().focus().setColor(color.value).run();
                      setShowColorPicker(false);
                    }}
                    className="w-5 h-5 rounded border border-slate-200 hover:scale-125 transition-transform cursor-pointer"
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
              
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2">
                <label className="text-[10px] text-slate-500 whitespace-nowrap">Personalizado:</label>
                <div className="relative w-full h-6 rounded border border-slate-200 overflow-hidden cursor-pointer">
                  <input
                    type="color"
                    onChange={(e: any) => {
                      // Marcar como actualización interna para evitar loop
                      isInternalUpdate.current = true;
                      editor.chain().focus().setColor(e.target.value).run();
                      setTimeout(() => {
                        isInternalUpdate.current = false;
                      }, 0);
                    }}
                    className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 p-0 cursor-pointer border-none"
                    style={{ margin: 0 }}
                    defaultValue={editor.getAttributes("textStyle").color || "#000000"}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().unsetColor().run();
                  setShowColorPicker(false);
                }}
                className="w-full mt-2 px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-100 rounded transition-colors whitespace-nowrap"
              >
                Quitar color
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Link Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              if (editor.isActive("link")) {
                editor.chain().focus().unsetLink().run();
              } else {
                setShowLinkInput(!showLinkInput);
              }
            }}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive("link")
                ? "bg-[#A855F7] text-white"
                : "hover:bg-slate-200 text-slate-500 hover:text-slate-700"
            }`}
            title="Insertar enlace"
          >
            <Link2 size={16} />
          </button>
          
          {/* Link Input Popup */}
          {showLinkInput && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-2 z-50 flex gap-2">
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://ejemplo.com"
                className="px-2 py-1 text-sm border border-slate-200 rounded-md w-48 outline-none focus:border-[#A855F7]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setLink();
                  }
                  if (e.key === "Escape") {
                    setShowLinkInput(false);
                    setLinkUrl("");
                  }
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={setLink}
                className="px-3 py-1 bg-[#A855F7] text-white text-sm rounded-md hover:bg-[#9333EA] transition-colors"
              >
                OK
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* List Buttons */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive("bulletList")
              ? "bg-slate-200 text-slate-700"
              : "hover:bg-slate-200 text-slate-500 hover:text-slate-700"
          }`}
          title="Lista con viñetas"
        >
          <List size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive("orderedList")
              ? "bg-slate-200 text-slate-700"
              : "hover:bg-slate-200 text-slate-500 hover:text-slate-700"
          }`}
          title="Lista numerada"
        >
          <ListOrdered size={16} />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Undo/Redo */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Deshacer (Ctrl+Z)"
        >
          <Undo size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-1.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Rehacer (Ctrl+Y)"
        >
          <Redo size={16} />
        </button>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} className="min-h-[120px]" />

      {/* Character Count */}
      <div className="flex justify-end px-3 py-1.5 border-t border-slate-100">
        <p className={`text-[11px] ${remainingChars < 50 ? "text-orange-500" : "text-slate-400"}`}>
          {remainingChars} caracteres restantes
        </p>
      </div>

      {/* Styles for TipTap */}
      <style jsx global>{`
        .ProseMirror {
          min-height: 100px;
          padding: 12px;
          outline: none;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror p {
          margin: 0.25em 0;
        }
        .ProseMirror h1 {
          font-size: 1.5em;
          font-weight: 700;
          margin: 0.5em 0;
        }
        .ProseMirror h2 {
          font-size: 1.25em;
          font-weight: 600;
          margin: 0.5em 0;
        }
        .ProseMirror h3 {
          font-size: 1.1em;
          font-weight: 600;
          margin: 0.5em 0;
        }
        .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .ProseMirror li {
          margin: 0.25em 0;
        }
        .ProseMirror li p {
          margin: 0;
        }
        .ProseMirror a {
          color: #A855F7;
          text-decoration: underline;
          cursor: pointer;
        }
        .ProseMirror strong {
          font-weight: 600;
        }
        .ProseMirror em {
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
