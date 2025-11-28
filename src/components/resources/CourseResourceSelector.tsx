"use client";

import { useState, useEffect } from "react";
import { resourceService } from "@/lib/services/resourceService";
import { SpeakerResource } from "@/types/resource";
import {
  IconFile,
  IconVideo,
  IconPhoto,
  IconFileText,
  IconPlus,
  IconTrash,
  IconDownload,
  IconSearch,
} from "@tabler/icons-react";

interface CourseResourceSelectorProps {
  courseId: string;
  speakerId: string;
  onResourcesChange?: (resourceIds: string[]) => void;
}

export default function CourseResourceSelector({
  courseId,
  speakerId,
  onResourcesChange,
}: CourseResourceSelectorProps) {
  const [allResources, setAllResources] = useState<SpeakerResource[]>([]);
  const [assignedResources, setAssignedResources] = useState<SpeakerResource[]>([]);
  const [availableResources, setAvailableResources] = useState<SpeakerResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    loadResources();
  }, [courseId, speakerId]);

  const loadResources = async () => {
    try {
      setLoading(true);
      
      // Cargar todos los recursos del speaker
      const speakerResources = await resourceService.getByOwnerId(speakerId);
      setAllResources(speakerResources);

      // Cargar recursos asignados al curso
      const courseResources = await resourceService.getByCourseId(courseId);
      setAssignedResources(courseResources);

      // Calcular recursos disponibles (no asignados)
      const assignedIds = courseResources.map((r) => r.id);
      const available = speakerResources.filter((r) => !assignedIds.includes(r.id));
      setAvailableResources(available);
    } catch (error) {
      console.error("Error loading resources:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (resourceId: string) => {
    try {
      await resourceService.assignToCourse(resourceId, courseId);
      await loadResources();
      
      if (onResourcesChange) {
        const updatedAssigned = await resourceService.getByCourseId(courseId);
        onResourcesChange(updatedAssigned.map((r) => r.id));
      }
    } catch (error) {
      console.error("Error assigning resource:", error);
      alert("Error al asignar el recurso");
    }
  };

  const handleUnassign = async (resourceId: string) => {
    if (!confirm("¿Desasignar este recurso del curso?")) return;

    try {
      await resourceService.unassignFromCourse(resourceId, courseId);
      await loadResources();
      
      if (onResourcesChange) {
        const updatedAssigned = await resourceService.getByCourseId(courseId);
        onResourcesChange(updatedAssigned.map((r) => r.id));
      }
    } catch (error) {
      console.error("Error unassigning resource:", error);
      alert("Error al desasignar el recurso");
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case "video":
        return <IconVideo size={20} className="text-accent" />;
      case "image":
        return <IconPhoto size={20} className="text-info" />;
      case "document":
        return <IconFileText size={20} className="text-secondary" />;
      default:
        return <IconFile size={20} className="text-primary" />;
    }
  };

  const formatFileSize = (sizeKB?: number) => {
    if (!sizeKB) return "Desconocido";
    if (sizeKB < 1024) return `${sizeKB} KB`;
    return `${(sizeKB / 1024).toFixed(2)} MB`;
  };

  const filteredAvailable = availableResources.filter((r) =>
    r.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Recursos asignados */}
      <div>
        <h3 className="font-semibold text-lg mb-3">
          Recursos del Curso ({assignedResources.length})
        </h3>
        
        {assignedResources.length === 0 ? (
          <div className="alert alert-info text-white">
            <IconFile size={20} />
            <span>No hay recursos asignados a este curso</span>
          </div>
        ) : (
          <div className="space-y-2">
            {assignedResources.map((resource) => (
              <div
                key={resource.id}
                className="card bg-base-100 border border-base-300 hover:shadow-md transition-all"
              >
                <div className="card-body p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">{getCategoryIcon(resource.category)}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{resource.fileName}</h4>
                      <div className="flex items-center gap-4 text-xs text-base-content/60 mt-1">
                        <span>{resource.category || "otro"}</span>
                        <span>{formatFileSize(resource.sizeKB)}</span>
                      </div>
                      {resource.description && (
                        <p className="text-sm text-base-content/70 line-clamp-1 mt-1">
                          {resource.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-ghost"
                        title="Descargar"
                      >
                        <IconDownload size={16} />
                      </a>
                      <button
                        onClick={() => handleUnassign(resource.id)}
                        className="btn btn-sm btn-ghost text-error"
                        title="Desasignar"
                      >
                        <IconTrash size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Botón para agregar recursos */}
      <div>
        <button
          onClick={() => setShowSelector(!showSelector)}
          className="btn btn-outline btn-primary gap-2"
        >
          <IconPlus size={20} />
          Agregar Recursos
        </button>
      </div>

      {/* Selector de recursos disponibles */}
      {showSelector && (
        <div className="card bg-base-200">
          <div className="card-body">
            <h4 className="font-semibold mb-3">Recursos Disponibles</h4>

            {/* Búsqueda */}
            <div className="form-control mb-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IconSearch size={20} className="text-base-content/40" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar recursos..."
                  className="input input-bordered w-full pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Lista de recursos */}
            {filteredAvailable.length === 0 ? (
              <div className="text-center py-8 text-base-content/60">
                {searchTerm
                  ? "No se encontraron recursos"
                  : "No hay recursos disponibles para asignar"}
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredAvailable.map((resource) => (
                  <div
                    key={resource.id}
                    className="card bg-base-100 border border-base-300 hover:shadow-md transition-all"
                  >
                    <div className="card-body p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">{getCategoryIcon(resource.category)}</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{resource.fileName}</h4>
                          <div className="flex items-center gap-4 text-xs text-base-content/60 mt-1">
                            <span>{resource.category || "otro"}</span>
                            <span>{formatFileSize(resource.sizeKB)}</span>
                          </div>
                          {resource.description && (
                            <p className="text-sm text-base-content/70 line-clamp-1 mt-1">
                              {resource.description}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleAssign(resource.id)}
                          className="btn btn-sm btn-primary gap-1"
                        >
                          <IconPlus size={16} />
                          Asignar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
