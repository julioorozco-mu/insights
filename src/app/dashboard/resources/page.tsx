"use client";

import { useEffect, useState, useRef } from "react";
import { Loader } from "@/components/common/Loader";
import { 
  IconFolder, 
  IconPlus, 
  IconFile, 
  IconDownload, 
  IconTrash, 
  IconFileTypePdf, 
  IconFileTypeDoc, 
  IconPhoto,
  IconList,
  IconLayoutGrid,
  IconEye,
  IconEdit,
  IconCheck,
  IconX,
  IconUpload
} from "@tabler/icons-react";
import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";
import { formatDate } from "@/utils/formatDate";
import { useAuth } from "@/hooks/useAuth";

interface Resource {
  id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
  uploadedBy: string;
  uploadedByName?: string;
  createdAt: string;
  metadata?: {
    title?: string;
    description?: string;
  };
}

export default function ResourcesPage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedResources, setSelectedResources] = useState<Set<string>>(new Set());
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [previewResource, setPreviewResource] = useState<Resource | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    try {
      const { data, error } = await supabaseClient
        .from(TABLES.FILE_ATTACHMENTS)
        .select('*')
        .neq('status', 'disabled');
      
      if (error) throw error;
      
      const resourcesData = (data || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        url: r.url,
        type: r.type,
        size: r.size,
        uploadedBy: r.uploaded_by,
        uploadedByName: r.uploaded_by_name,
        createdAt: r.created_at,
        metadata: r.metadata,
      })) as Resource[];
      setResources(resourcesData);
    } catch (error) {
      console.error("Error loading resources:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  const getFileIcon = (type: string) => {
    if (type.includes("pdf")) return <IconFileTypePdf size={40} className="text-error" />;
    if (type.includes("doc")) return <IconFileTypeDoc size={40} className="text-info" />;
    if (type.includes("image")) return <IconPhoto size={40} className="text-success" />;
    return <IconFile size={40} className="text-base-content/60" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !user) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    if (!user) return;

    const fileId = `${Date.now()}_${file.name}`;
    const filePath = `resources/${user.id}/${fileId}`;
    
    try {
      setUploadProgress(prev => ({ ...prev, [fileId]: 50 }));
      
      const { error: uploadError } = await supabaseClient.storage
        .from('files')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      setUploadProgress(prev => ({ ...prev, [fileId]: 80 }));
      
      const { data: urlData } = supabaseClient.storage
        .from('files')
        .getPublicUrl(filePath);
      
      await supabaseClient.from(TABLES.FILE_ATTACHMENTS).insert({
        name: file.name,
        url: urlData.publicUrl,
        type: file.type,
        size: file.size,
        uploaded_by: user.id,
        uploaded_by_name: user.name || user.email,
        metadata: {
          title: file.name,
          description: ''
        }
      });

      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[fileId];
        return newProgress;
      });

      loadResources();
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error al subir el archivo');
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[fileId];
        return newProgress;
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedResources.size === 0) return;
    if (!confirm(`¿Eliminar ${selectedResources.size} archivo(s)?`)) return;

    try {
      for (const resourceId of selectedResources) {
        // Verificar si el recurso está vinculado a alguna lección
        const { data: lessonsData } = await supabaseClient
          .from(TABLES.LESSONS)
          .select('id, resource_ids');
        
        let isLinked = false;
        for (const lesson of (lessonsData || [])) {
          if (lesson.resource_ids && lesson.resource_ids.includes(resourceId)) {
            isLinked = true;
            break;
          }
        }

        if (isLinked) {
          // Baja lógica: marcar como deshabilitado
          await supabaseClient
            .from(TABLES.FILE_ATTACHMENTS)
            .update({
              status: 'disabled',
              disabled_at: new Date().toISOString(),
              disabled_by: user?.id
            })
            .eq('id', resourceId);
        } else {
          // Eliminación física
          await supabaseClient
            .from(TABLES.FILE_ATTACHMENTS)
            .delete()
            .eq('id', resourceId);
        }
      }
      setSelectedResources(new Set());
      loadResources();
      alert('Recursos procesados correctamente');
    } catch (error) {
      console.error('Error deleting resources:', error);
      alert('Error al eliminar archivos');
    }
  };

  const toggleSelectResource = (resourceId: string) => {
    const newSelected = new Set(selectedResources);
    if (newSelected.has(resourceId)) {
      newSelected.delete(resourceId);
    } else {
      newSelected.add(resourceId);
    }
    setSelectedResources(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedResources.size === resources.length) {
      setSelectedResources(new Set());
    } else {
      setSelectedResources(new Set(resources.map(r => r.id)));
    }
  };

  const handlePreview = (resource: Resource) => {
    setPreviewResource(resource);
    setShowPreviewModal(true);
  };

  const handleEdit = (resource: Resource) => {
    setEditingResource(resource);
    setEditTitle(resource.metadata?.title || resource.name);
    setEditDescription(resource.metadata?.description || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingResource) return;

    try {
      await supabaseClient
        .from(TABLES.FILE_ATTACHMENTS)
        .update({
          metadata: {
            title: editTitle,
            description: editDescription
          }
        })
        .eq('id', editingResource.id);
      setShowEditModal(false);
      loadResources();
    } catch (error) {
      console.error('Error updating resource:', error);
      alert('Error al actualizar el recurso');
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div>
      {/* Header con controles */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">Recursos</h1>
          <p className="text-base-content/70">Gestiona archivos y documentos</p>
        </div>
        <div className="flex gap-2">
          {/* Toggle de vista */}
          <div className="btn-group">
            <button 
              className={`btn btn-sm ${viewMode === 'list' ? 'btn-active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <IconList size={18} />
            </button>
            <button 
              className={`btn btn-sm ${viewMode === 'grid' ? 'btn-active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <IconLayoutGrid size={18} />
            </button>
          </div>
          
          <button 
            className="btn btn-primary text-white gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <IconPlus size={20} />
            Subir Recurso
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Barra de acciones cuando hay selección */}
      {selectedResources.size > 0 && (
        <div className="alert alert-info mb-4">
          <div className="flex justify-between items-center w-full">
            <span>{selectedResources.size} archivo(s) seleccionado(s)</span>
            <div className="flex gap-2">
              <button 
                className="btn btn-sm btn-error text-white gap-2"
                onClick={handleDeleteSelected}
              >
                <IconTrash size={16} />
                Eliminar
              </button>
              <button 
                className="btn btn-sm btn-ghost"
                onClick={() => setSelectedResources(new Set())}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Indicadores de progreso de subida */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="card bg-base-100 shadow-xl mb-4">
          <div className="card-body">
            <h3 className="font-semibold mb-2">Subiendo archivos...</h3>
            {Object.entries(uploadProgress).map(([fileId, progress]) => (
              <div key={fileId} className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>{fileId.split('_').slice(1).join('_')}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <progress className="progress progress-primary w-full" value={progress} max="100"></progress>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de recursos */}
      {resources.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <div className="text-primary mb-4 flex justify-center">
              <IconFolder size={64} stroke={2} />
            </div>
            <h2 className="text-2xl font-bold mb-2">No hay recursos disponibles</h2>
            <p className="text-base-content/70 mb-4">
              Sube archivos, documentos y materiales de apoyo
            </p>
            <button 
              className="btn btn-primary text-white gap-2 mx-auto"
              onClick={() => fileInputRef.current?.click()}
            >
              <IconPlus size={20} />
              Subir Primer Recurso
            </button>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>
                    <input 
                      type="checkbox" 
                      className="checkbox checkbox-sm"
                      checked={selectedResources.size === resources.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>Nombre</th>
                  <th>Propietario</th>
                  <th>Fecha de modificación</th>
                  <th>Tamaño</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {resources.map((resource) => (
                  <tr key={resource.id} className="hover">
                    <td>
                      <input 
                        type="checkbox" 
                        className="checkbox checkbox-sm"
                        checked={selectedResources.has(resource.id)}
                        onChange={() => toggleSelectResource(resource.id)}
                      />
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        {getFileIcon(resource.type)}
                        <div>
                          <div className="font-medium">{resource.metadata?.title || resource.name}</div>
                          {resource.metadata?.description && (
                            <div className="text-sm text-base-content/60">{resource.metadata.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="avatar placeholder">
                          <div className="bg-neutral text-neutral-content rounded-full w-8">
                            <span className="text-xs">{resource.uploadedByName?.charAt(0) || 'U'}</span>
                          </div>
                        </div>
                        <span className="text-sm">{resource.uploadedByName || 'Usuario'}</span>
                      </div>
                    </td>
                    <td className="text-sm">{formatDate(resource.createdAt)}</td>
                    <td className="text-sm">{formatFileSize(resource.size)}</td>
                    <td>
                      <div className="flex gap-1">
                        <button 
                          className="btn btn-sm btn-ghost btn-circle"
                          onClick={() => handlePreview(resource)}
                          title="Ver"
                        >
                          <IconEye size={16} />
                        </button>
                        <button 
                          className="btn btn-sm btn-ghost btn-circle"
                          onClick={() => handleEdit(resource)}
                          title="Editar"
                        >
                          <IconEdit size={16} />
                        </button>
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-ghost btn-circle"
                          title="Descargar"
                        >
                          <IconDownload size={16} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {resources.map((resource) => (
            <div key={resource.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow relative">
              <div className="absolute top-4 left-4 z-10">
                <input 
                  type="checkbox" 
                  className="checkbox checkbox-sm"
                  checked={selectedResources.has(resource.id)}
                  onChange={() => toggleSelectResource(resource.id)}
                />
              </div>
              <div className="card-body">
                <div className="flex justify-center mb-4">
                  {getFileIcon(resource.type)}
                </div>
                <h2 className="card-title text-base line-clamp-2" title={resource.metadata?.title || resource.name}>
                  {resource.metadata?.title || resource.name}
                </h2>
                <div className="text-sm text-base-content/60 space-y-1">
                  <p>Tamaño: {formatFileSize(resource.size)}</p>
                  <p>Subido: {formatDate(resource.createdAt)}</p>
                </div>
                <div className="card-actions justify-between mt-4">
                  <button 
                    className="btn btn-sm btn-ghost gap-2"
                    onClick={() => handlePreview(resource)}
                  >
                    <IconEye size={16} />
                    Ver
                  </button>
                  <button 
                    className="btn btn-sm btn-ghost gap-2"
                    onClick={() => handleEdit(resource)}
                  >
                    <IconEdit size={16} />
                  </button>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-ghost gap-2"
                  >
                    <IconDownload size={16} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de vista previa */}
      {showPreviewModal && previewResource && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-lg mb-4">{previewResource.metadata?.title || previewResource.name}</h3>
            
            {previewResource.type.includes('image') ? (
              <img src={previewResource.url} alt={previewResource.name} className="w-full rounded-lg" />
            ) : previewResource.type.includes('pdf') ? (
              <iframe src={previewResource.url} className="w-full h-96 rounded-lg" />
            ) : (
              <div className="text-center py-12">
                <div className="flex justify-center mb-4">
                  {getFileIcon(previewResource.type)}
                </div>
                <p className="text-base-content/70 mb-4">Vista previa no disponible para este tipo de archivo</p>
                <a
                  href={previewResource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary text-white gap-2"
                >
                  <IconDownload size={20} />
                  Descargar para ver
                </a>
              </div>
            )}
            
            <div className="modal-action">
              <button className="btn" onClick={() => setShowPreviewModal(false)}>Cerrar</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowPreviewModal(false)}>
            <button>close</button>
          </div>
        </div>
      )}

      {/* Modal de edición */}
      {showEditModal && editingResource && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Editar Metadatos</h3>
            
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-semibold">Título</span>
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="input input-bordered"
                placeholder="Título del archivo"
              />
            </div>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-semibold">Descripción</span>
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="textarea textarea-bordered h-24"
                placeholder="Descripción opcional"
              />
            </div>
            
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setShowEditModal(false)}>Cancelar</button>
              <button className="btn btn-primary text-white" onClick={handleSaveEdit}>
                <IconCheck size={20} />
                Guardar
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowEditModal(false)}>
            <button>close</button>
          </div>
        </div>
      )}
    </div>
  );
}
