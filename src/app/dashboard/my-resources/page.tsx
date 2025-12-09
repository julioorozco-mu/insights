"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { resourceService } from "@/lib/services/resourceService";
import { SpeakerResource } from "@/types/resource";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { Loader } from "@/components/common/Loader";
import ResourceUploadModal from "@/components/resources/ResourceUploadModal";
import ResourceCard from "@/components/resources/ResourceCard";
import ResourceAssignModal from "@/components/resources/ResourceAssignModal";
import {
  IconUpload,
  IconFile,
  IconVideo,
  IconPhoto,
  IconFileText,
  IconSearch,
  IconFilter,
} from "@tabler/icons-react";

export default function MyResourcesPage() {
  const { user } = useAuth();
  const [resources, setResources] = useState<SpeakerResource[]>([]);
  const [filteredResources, setFilteredResources] = useState<SpeakerResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState<SpeakerResource | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  useEffect(() => {
    loadResources();
  }, [user]);

  useEffect(() => {
    filterResources();
  }, [resources, searchTerm, filterCategory]);

  const loadResources = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await resourceService.getByOwner(user.id);
      setResources(data);
    } catch (error) {
      console.error("Error loading resources:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterResources = () => {
    let filtered = [...resources];

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por categoría
    if (filterCategory !== "all") {
      filtered = filtered.filter((r) => r.category === filterCategory);
    }

    setFilteredResources(filtered);
  };

  const handleUploadSuccess = () => {
    setShowUploadModal(false);
    loadResources();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este recurso?")) return;

    try {
      await resourceService.delete(id);
      loadResources();
    } catch (error) {
      console.error("Error deleting resource:", error);
      alert("Error al eliminar el recurso");
    }
  };

  const handleAssign = (resource: SpeakerResource) => {
    setSelectedResource(resource);
    setShowAssignModal(true);
  };

  const handleAssignSuccess = () => {
    setShowAssignModal(false);
    setSelectedResource(null);
    loadResources();
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case "video":
        return <IconVideo size={20} />;
      case "image":
        return <IconPhoto size={20} />;
      case "document":
        return <IconFileText size={20} />;
      default:
        return <IconFile size={20} />;
    }
  };

  const getCategoryStats = () => {
    return {
      all: resources.length,
      document: resources.filter((r) => r.category === "document").length,
      video: resources.filter((r) => r.category === "video").length,
      image: resources.filter((r) => r.category === "image").length,
      other: resources.filter((r) => r.category === "other" || !r.category).length,
    };
  };

  const stats = getCategoryStats();

  if (loading) {
    return <Loader />;
  }

  return (
    <div>
      <DashboardHeader
        title="Mis Recursos"
        description="Gestiona tus archivos y asígnalos a tus cursos"
      />

      {/* Stats */}
      <div className="stats shadow w-full mb-6">
        <div className="stat">
          <div className="stat-figure text-primary">
            <IconFile size={32} />
          </div>
          <div className="stat-title">Total</div>
          <div className="stat-value text-primary">{stats.all}</div>
          <div className="stat-desc">Recursos totales</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-secondary">
            <IconFileText size={32} />
          </div>
          <div className="stat-title">Documentos</div>
          <div className="stat-value text-secondary">{stats.document}</div>
          <div className="stat-desc">PDFs, DOCs, etc.</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-accent">
            <IconVideo size={32} />
          </div>
          <div className="stat-title">Videos</div>
          <div className="stat-value text-accent">{stats.video}</div>
          <div className="stat-desc">MP4, MOV, etc.</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-info">
            <IconPhoto size={32} />
          </div>
          <div className="stat-title">Imágenes</div>
          <div className="stat-value text-info">{stats.image}</div>
          <div className="stat-desc">PNG, JPG, etc.</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        {/* Búsqueda */}
        <div className="flex-1">
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

        {/* Filtro */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <IconFilter size={20} className="text-base-content/60" />
            <select
              className="select select-bordered w-full md:w-56"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">Todas las categorías</option>
              <option value="document">Documentos</option>
              <option value="video">Videos</option>
              <option value="image">Imágenes</option>
              <option value="other">Otros</option>
            </select>
          </div>

          {/* Botón subir */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn btn-circle btn-error text-white"
            title="Subir Recurso"
          >
            <IconUpload size={24} />
          </button>
        </div>
      </div>

      {/* Grid de recursos */}
      {filteredResources.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body items-center text-center py-16">
            <IconFile size={64} className="opacity-30 mb-4" />
            <h3 className="text-2xl font-bold mb-2">No hay recursos</h3>
            <p className="text-base-content/70 mb-6">
              {searchTerm || filterCategory !== "all"
                ? "No se encontraron recursos con los filtros aplicados"
                : "Comienza subiendo tu primer recurso"}
            </p>
            {!searchTerm && filterCategory === "all" && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="btn btn-error text-white gap-2"
              >
                <IconUpload size={20} />
                Subir Recurso
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredResources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onDelete={handleDelete}
              onAssign={handleAssign}
            />
          ))}
        </div>
      )}

      {/* Modales */}
      {showUploadModal && (
        <ResourceUploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleUploadSuccess}
        />
      )}

      {showAssignModal && selectedResource && (
        <ResourceAssignModal
          resource={selectedResource}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedResource(null);
          }}
          onSuccess={handleAssignSuccess}
        />
      )}
    </div>
  );
}
