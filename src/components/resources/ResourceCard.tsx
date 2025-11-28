"use client";

import { SpeakerResource } from "@/types/resource";
import {
  IconFile,
  IconVideo,
  IconPhoto,
  IconFileText,
  IconDownload,
  IconTrash,
  IconLink,
  IconClock,
  IconTag,
} from "@tabler/icons-react";

interface ResourceCardProps {
  resource: SpeakerResource;
  onDelete: (id: string) => void;
  onAssign: (resource: SpeakerResource) => void;
}

export default function ResourceCard({ resource, onDelete, onAssign }: ResourceCardProps) {
  const getCategoryIcon = () => {
    switch (resource.category) {
      case "video":
        return <IconVideo size={48} className="text-accent" />;
      case "image":
        return <IconPhoto size={48} className="text-info" />;
      case "document":
        return <IconFileText size={48} className="text-secondary" />;
      default:
        return <IconFile size={48} className="text-primary" />;
    }
  };

  const getCategoryBadge = () => {
    const badges = {
      video: "badge-accent",
      image: "badge-info",
      document: "badge-secondary",
      other: "badge-neutral",
    };
    return badges[resource.category || "other"] || "badge-neutral";
  };

  const formatFileSize = (sizeKB?: number) => {
    if (!sizeKB) return "Desconocido";
    if (sizeKB < 1024) return `${sizeKB} KB`;
    return `${(sizeKB / 1024).toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all">
      <div className="card-body">
        {/* Icono y categoría */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-shrink-0">{getCategoryIcon()}</div>
          <span className={`badge ${getCategoryBadge()} badge-sm`}>
            {resource.category || "otro"}
          </span>
        </div>

        {/* Nombre del archivo */}
        <h3 className="card-title text-base line-clamp-2" title={resource.fileName}>
          {resource.fileName}
        </h3>

        {/* Descripción */}
        {resource.description && (
          <p className="text-sm text-base-content/70 line-clamp-2 mb-2">
            {resource.description}
          </p>
        )}

        {/* Metadata */}
        <div className="space-y-1 text-xs text-base-content/60 mb-4">
          <div className="flex items-center gap-2">
            <IconFile size={14} />
            <span>{formatFileSize(resource.sizeKB)}</span>
          </div>
          <div className="flex items-center gap-2">
            <IconClock size={14} />
            <span>{formatDate(resource.createdAt)}</span>
          </div>
          {resource.assignedCourses && resource.assignedCourses.length > 0 && (
            <div className="flex items-center gap-2">
              <IconLink size={14} />
              <span>{resource.assignedCourses.length} curso(s)</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {resource.tags && resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {resource.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="badge badge-outline badge-xs">
                {tag}
              </span>
            ))}
            {resource.tags.length > 3 && (
              <span className="badge badge-outline badge-xs">
                +{resource.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Acciones */}
        <div className="card-actions justify-end">
          <button
            onClick={() => onAssign(resource)}
            className="btn btn-sm btn-primary gap-1"
            title="Asignar a cursos"
          >
            <IconLink size={16} />
            Asignar
          </button>
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-ghost gap-1"
            title="Descargar"
          >
            <IconDownload size={16} />
          </a>
          <button
            onClick={() => onDelete(resource.id)}
            className="btn btn-sm btn-ghost text-error gap-1"
            title="Eliminar"
          >
            <IconTrash size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
