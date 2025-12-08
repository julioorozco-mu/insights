"use client";

interface RichTextContentProps {
  html: string;
  className?: string;
}

/**
 * Componente para renderizar contenido HTML de texto enriquecido
 * con estilos consistentes para headings, listas, links, etc.
 */
export default function RichTextContent({ html, className = "" }: RichTextContentProps) {
  if (!html) return null;

  return (
    <>
      <div 
        className={`rich-text-content ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <style jsx global>{`
        .rich-text-content {
          line-height: 1.6;
        }
        .rich-text-content h1 {
          font-size: 1.5em;
          font-weight: 700;
          margin: 0.5em 0;
          color: #1A2170;
        }
        .rich-text-content h2 {
          font-size: 1.25em;
          font-weight: 600;
          margin: 0.5em 0;
          color: #1A2170;
        }
        .rich-text-content h3 {
          font-size: 1.1em;
          font-weight: 600;
          margin: 0.5em 0;
          color: #1A2170;
        }
        .rich-text-content p {
          margin: 0.5em 0;
        }
        .rich-text-content ul {
          list-style-type: disc;
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .rich-text-content ol {
          list-style-type: decimal;
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .rich-text-content li {
          margin: 0.25em 0;
        }
        .rich-text-content a {
          color: #A855F7;
          text-decoration: underline;
          cursor: pointer;
        }
        .rich-text-content a:hover {
          color: #9333EA;
        }
        .rich-text-content strong {
          font-weight: 600;
        }
        .rich-text-content em {
          font-style: italic;
        }
      `}</style>
    </>
  );
}
