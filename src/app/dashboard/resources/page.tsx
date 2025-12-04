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
  filePath?: string; // Path del archivo para regenerar URLs
  bucket?: string; // Bucket donde está almacenado
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
      let data: any[] = [];
      
      // Intentar cargar de teacher_resources primero
      let query = supabaseClient
        .from(TABLES.TEACHER_RESOURCES)
        .select('*')
        .order('created_at', { ascending: false });
      
      // Filtrar eliminados si la columna existe
      const { data: teacherResData, error: teacherResError } = await query;
      
      if (!teacherResError && teacherResData) {
        // Filtrar recursos eliminados (la columna puede no existir, así que verificamos)
        data = teacherResData.filter((r: any) => {
          // Si la columna existe, filtrar eliminados, si no existe, mostrar todos
          return r.is_deleted === undefined || r.is_deleted === null || !r.is_deleted;
        });
      } else {
        console.log('teacher_resources error, trying file_attachments:', teacherResError);
        // Fallback a file_attachments
        let fileQuery = supabaseClient
          .from(TABLES.FILE_ATTACHMENTS)
          .select('*')
          .order('created_at', { ascending: false });
        
        const { data: fileResData, error: fileResError } = await fileQuery;
        
        if (fileResError) {
          console.error("Error loading resources:", fileResError);
        } else {
          data = (fileResData || []).filter((r: any) => {
            return r.is_deleted === undefined || r.is_deleted === null || !r.is_deleted;
          });
        }
      }
      
      const resourcesData = (data || []).map((r: any) => {
        // Obtener nombre del archivo correctamente
        const fileName = r.file_name || r.name || r.title || 'Sin nombre';
        // Extraer nombre sin extensión para mostrar mejor
        const displayName = fileName.replace(/\.[^/.]+$/, "") || fileName;
        const description = r.description || '';
        
        return {
          id: r.id,
          name: fileName, // Nombre completo con extensión
          url: r.url || r.file_url,
          type: r.file_type || r.type || 'application/octet-stream',
          size: r.size_kb ? r.size_kb * 1024 : r.size || r.file_size || 0,
          uploadedBy: r.owner_id || r.uploaded_by || r.created_by,
          uploadedByName: r.uploaded_by_name,
          createdAt: r.created_at,
          metadata: r.metadata ? r.metadata : { title: displayName, description },
        };
      }) as Resource[];
      
      // Filtrar duplicados por ID y ordenar por fecha
      const uniqueResources = Array.from(
        new Map(resourcesData.map(r => [r.id, r])).values()
      ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setResources(uniqueResources);
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
    if (!user) {
      alert('Debes estar autenticado para subir archivos');
      return;
    }

    const fileId = `${Date.now()}_${file.name}`;
    // Ruta sin el prefijo 'resources/' ya que el bucket ya es 'resources'
    const filePath = `${user.id}/${fileId}`;
    
    try {
      setUploadProgress(prev => ({ ...prev, [fileId]: 20 }));
      
      // Determinar bucket según tipo de archivo
      // covers solo acepta imágenes, así que usamos attachments o resources para otros archivos
      const isImage = file.type?.startsWith('image/');
      
      let bucketUsed = 'attachments'; // Por defecto usar attachments (acepta cualquier tipo)
      let uploadResult: any = { error: null };
      
      // Si es imagen, intentar primero con covers (público)
      if (isImage) {
        uploadResult = await supabaseClient.storage
          .from('covers')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (!uploadResult.error) {
          bucketUsed = 'covers';
        }
      }
      
      // Si no es imagen o covers falló, intentar con attachments
      if (!isImage || uploadResult.error) {
        console.log('Usando bucket attachments para:', file.type || 'archivo desconocido');
        bucketUsed = 'attachments';
        uploadResult = await supabaseClient.storage
          .from('attachments')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });
      }
      
      // Si attachments falla, intentar con resources
      if (uploadResult?.error) {
        console.log('Intentando con bucket resources...');
        bucketUsed = 'resources';
        uploadResult = await supabaseClient.storage
          .from('resources')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });
      }
      
      if (uploadResult?.error) {
        console.error('Storage upload error:', uploadResult.error);
        throw new Error(`Error al subir archivo: ${uploadResult.error.message || 'Error desconocido'}. Verifica que el bucket exista y tengas permisos.`);
      }
      
      setUploadProgress(prev => ({ ...prev, [fileId]: 60 }));
      
      // Obtener URL según el tipo de bucket
      let fileUrl: string;
      
      if (bucketUsed === 'covers') {
        // Bucket público: usar URL pública
        const { data: urlData } = supabaseClient.storage
          .from('covers')
          .getPublicUrl(filePath);
        fileUrl = urlData.publicUrl;
      } else {
        // Buckets privados (resources, attachments): usar URL firmada (válida por 1 año)
        const { data: signedUrlData, error: signedError } = await supabaseClient.storage
          .from(bucketUsed)
          .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 año
        
        if (signedError) {
          console.error('Error generando URL firmada:', signedError);
          // Fallback: intentar con covers como público
          const { data: publicUrlData } = supabaseClient.storage
            .from('covers')
            .getPublicUrl(filePath);
          fileUrl = publicUrlData.publicUrl;
        } else {
          fileUrl = signedUrlData.signedUrl;
        }
      }
      
      setUploadProgress(prev => ({ ...prev, [fileId]: 80 }));
      
      // Guardar en teacher_resources con estructura correcta (SIN metadata)
      const insertData: any = {
        owner_id: user.id,
        file_name: file.name,
        file_type: file.type || 'application/octet-stream',
        url: fileUrl,
        size_kb: Math.round(file.size / 1024),
        category: 'document',
        description: '',
        tags: [],
      };
      
      // NO intentar guardar metadata - esa columna no existe
      
      const { error: dbError } = await supabaseClient
        .from(TABLES.TEACHER_RESOURCES)
        .insert(insertData);

      if (dbError) {
        console.error('Database error (teacher_resources):', dbError);
        // Fallback a file_attachments con estructura correcta
        const fallbackData: any = {
          owner_id: user.id,
          file_name: file.name,
          file_type: file.type || 'application/octet-stream',
          url: fileUrl,
          size_kb: Math.round(file.size / 1024),
          category: 'general',
        };
        
        const { error: dbError2 } = await supabaseClient
          .from(TABLES.FILE_ATTACHMENTS)
          .insert(fallbackData);
        
        if (dbError2) {
          console.error('Database error (file_attachments):', dbError2);
          throw new Error(`Error al guardar en base de datos: ${dbError2.message}`);
        }
      }

      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[fileId];
        return newProgress;
      });

      loadResources();
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(`Error al subir el archivo: ${error.message || 'Error desconocido'}`);
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
      let deletedCount = 0;
      let errorCount = 0;

      for (const resourceId of selectedResources) {
        try {
          // Primero intentar eliminación física directa en teacher_resources
          const { error: deleteError } = await supabaseClient
            .from(TABLES.TEACHER_RESOURCES)
            .delete()
            .eq('id', resourceId);

          if (deleteError) {
            console.log(`Eliminación física falló, intentando marcar como eliminado:`, deleteError);
            
            // Si falla, intentar marcar como eliminado
            const { error: updateError } = await supabaseClient
              .from(TABLES.TEACHER_RESOURCES)
              .update({ is_deleted: true })
              .eq('id', resourceId);

            if (updateError) {
              // Fallback a file_attachments - eliminación física
              const { error: fileAttDeleteError } = await supabaseClient
                .from(TABLES.FILE_ATTACHMENTS)
                .delete()
                .eq('id', resourceId);

              if (fileAttDeleteError) {
                // Último intento: marcar como eliminado en file_attachments
                const { error: fileAttUpdateError } = await supabaseClient
                  .from(TABLES.FILE_ATTACHMENTS)
                  .update({ is_deleted: true })
                  .eq('id', resourceId);

                if (fileAttUpdateError) {
                  console.error(`Error eliminando recurso ${resourceId}:`, fileAttUpdateError);
                  errorCount++;
                  continue;
                }
              }
            }
          }
          
          deletedCount++;
        } catch (err) {
          console.error(`Error procesando recurso ${resourceId}:`, err);
          errorCount++;
        }
      }

      setSelectedResources(new Set());
      
      // Recargar recursos después de eliminar (esperar un momento para que la BD se actualice)
      setTimeout(async () => {
        await loadResources();
      }, 500);
      
      if (errorCount > 0) {
        alert(`${deletedCount} recurso(s) eliminado(s), ${errorCount} error(es)`);
      } else if (deletedCount > 0) {
        // No mostrar alerta si todo salió bien, solo recargar
      }
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

  // Función para obtener URL válida de un recurso (regenera URL firmada si es necesario)
  const getResourceUrl = async (resource: Resource): Promise<string> => {
    // Si la URL parece ser válida y no está expirada, usarla directamente
    if (resource.url && !resource.url.includes('404') && !resource.url.includes('Bucket not found')) {
      // Si es una URL firmada que aún no ha expirado, usarla
      if (resource.url.includes('token=')) {
        return resource.url;
      }
      // Si es una URL pública válida, usarla
      if (resource.url.includes('.supabase.co/storage/')) {
        return resource.url;
      }
    }
    
    // Extraer path de la URL guardada si es posible
    let extractedPath: string | null = null;
    let extractedBucket: string | null = null;
    
    if (resource.url) {
      // Intentar extraer path de URL de Supabase
      const urlMatch = resource.url.match(/\/storage\/v1\/object\/(?:public|sign\/[^/]+)\/([^/]+)\/(.+)$/);
      if (urlMatch) {
        extractedBucket = urlMatch[1];
        extractedPath = decodeURIComponent(urlMatch[2]);
      }
    }
    
    // Usar path extraído o el path guardado
    const pathToUse = extractedPath || resource.filePath;
    const bucketsToTry = extractedBucket ? [extractedBucket] : ['covers', 'resources', 'attachments'];
    
    if (pathToUse) {
      // Intentar diferentes buckets
      for (const bucket of bucketsToTry) {
        try {
          if (bucket === 'covers') {
            // Bucket público
            const { data } = supabaseClient.storage.from(bucket).getPublicUrl(pathToUse);
            if (data?.publicUrl) return data.publicUrl;
          } else {
            // Buckets privados: generar URL firmada
            const { data, error } = await supabaseClient.storage
              .from(bucket)
              .createSignedUrl(pathToUse, 60 * 60 * 24 * 365);
            if (!error && data?.signedUrl) {
              return data.signedUrl;
            }
          }
        } catch (err) {
          console.log(`Error al generar URL desde bucket ${bucket}:`, err);
          continue;
        }
      }
    }
    
    // Fallback: usar la URL guardada
    return resource.url || '#';
  };

  const handlePreview = async (resource: Resource) => {
    setPreviewResource(resource);
    setShowPreviewModal(true);
    // Intentar obtener URL válida en segundo plano
    const validUrl = await getResourceUrl(resource);
    if (validUrl !== resource.url) {
      setPreviewResource({ ...resource, url: validUrl });
    }
  };

  const handleEdit = (resource: Resource) => {
    setEditingResource(resource);
    // Usar el nombre del archivo directamente
    const fileName = resource.name || 'Sin título';
    // Remover extensión para el título editable
    const titleWithoutExt = fileName.replace(/\.[^/.]+$/, "");
    setEditTitle(titleWithoutExt || fileName);
    setEditDescription(resource.metadata?.description || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingResource) return;

    try {
      // Actualizar en teacher_resources con estructura correcta
      const updateData: any = {
        file_name: editTitle,
        description: editDescription,
      };
      
      const { error: updateError } = await supabaseClient
        .from(TABLES.TEACHER_RESOURCES)
        .update(updateData)
        .eq('id', editingResource.id);
      
      if (updateError) {
        // Intentar en file_attachments como fallback
        const { error: fileAttError } = await supabaseClient
        .from(TABLES.FILE_ATTACHMENTS)
        .update({
            file_name: editTitle,
        })
        .eq('id', editingResource.id);
        
        if (fileAttError) {
          throw fileAttError;
        }
      }
      
      setShowEditModal(false);
      loadResources();
    } catch (error: any) {
      console.error('Error updating resource:', error);
      alert(`Error al actualizar el recurso: ${error.message || 'Error desconocido'}`);
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
                          <div className="font-medium">{resource.name || 'Sin nombre'}</div>
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
                <h2 className="card-title text-base line-clamp-2" title={resource.name || 'Sin nombre'}>
                  {resource.name || 'Sin nombre'}
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
              <img 
                src={previewResource.url} 
                alt={previewResource.name} 
                className="w-full rounded-lg"
                onError={async (e) => {
                  // Si la imagen falla, intentar regenerar URL
                  const validUrl = await getResourceUrl(previewResource);
                  if (validUrl && validUrl !== previewResource.url) {
                    (e.target as HTMLImageElement).src = validUrl;
                  } else {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }
                }}
              />
            ) : previewResource.type.includes('pdf') ? (
              <iframe 
                src={previewResource.url} 
                className="w-full h-96 rounded-lg"
                onError={async (e) => {
                  // Si el iframe falla, intentar regenerar URL
                  const validUrl = await getResourceUrl(previewResource);
                  if (validUrl && validUrl !== previewResource.url) {
                    (e.target as HTMLIFrameElement).src = validUrl;
                  }
                }}
              />
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
