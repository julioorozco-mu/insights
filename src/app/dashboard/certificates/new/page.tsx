"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import CertificateEditor from "@/components/certificate/CertificateEditor";
import { CertificateElement, CertificatePageSize, CertificateOrientation } from "@/types/certificate";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { IconUpload, IconPhoto } from "@tabler/icons-react";

export default function NewCertificateTemplatePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState<'info' | 'editor'>('info');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [backgroundPreview, setBackgroundPreview] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pageSize, setPageSize] = useState<CertificatePageSize>('letter');
  const [orientation, setOrientation] = useState<CertificateOrientation>('landscape');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBackgroundPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadBackgroundImage = async (): Promise<string | null> => {
    if (!selectedFile) return null;

    try {
      setUploadingImage(true);
      const timestamp = Date.now();
      const fileName = `certificates/backgrounds/${timestamp}_${selectedFile.name}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, selectedFile);
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleContinueToEditor = async () => {
    if (!title || (!backgroundPreview && !selectedFile)) {
      alert('Por favor completa el título y la imagen de fondo');
      return;
    }

    // Si hay un archivo seleccionado, subirlo primero
    if (selectedFile && !backgroundUrl) {
      try {
        const uploadedUrl = await uploadBackgroundImage();
        if (uploadedUrl) {
          setBackgroundUrl(uploadedUrl);
        }
      } catch (error) {
        alert('Error al subir la imagen. Por favor intenta de nuevo.');
        return;
      }
    }

    setStep('editor');
  };

  const handleSaveTemplate = async (elements: CertificateElement[]) => {
    if (!user) return;

    try {
      setSaving(true);
      const now = new Date();

      // Si aún no se ha subido la imagen, subirla ahora
      let finalBackgroundUrl = backgroundUrl;
      if (selectedFile && !backgroundUrl) {
        const uploadedUrl = await uploadBackgroundImage();
        if (uploadedUrl) {
          finalBackgroundUrl = uploadedUrl;
        }
      }

      // Compute design dimensions keeping width=900px baseline
      const PAGE_SIZES = {
        letter: { width: 612, height: 792 },
        legal: { width: 612, height: 1008 },
      } as const;
      const base = PAGE_SIZES[pageSize];
      const oriented = orientation === 'landscape' ? { width: base.height, height: base.width } : base;
      const designWidth = 900;
      const designHeight = Math.round((oriented.height / oriented.width) * designWidth);

      const templateData = {
        title,
        description,
        backgroundUrl: finalBackgroundUrl,
        elements,
        isActive: true,
        createdBy: user.id,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
        pageSize,
        orientation,
        designWidth,
        designHeight,
      };

      await addDoc(collection(db, 'certificateTemplates'), templateData);
      
      router.push('/dashboard/certificates');
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error al guardar la plantilla');
    } finally {
      setSaving(false);
    }
  };

  if (step === 'editor') {
    // Usar la URL subida o el preview local
    const editorBackgroundUrl = backgroundUrl || backgroundPreview;
    const PAGE_SIZES = {
      letter: { width: 612, height: 792 },
      legal: { width: 612, height: 1008 },
    } as const;
    const base = PAGE_SIZES[pageSize];
    const oriented = orientation === 'landscape' ? { width: base.height, height: base.width } : base;
    const designWidth = 900;
    const designHeight = Math.round((oriented.height / oriented.width) * designWidth);
    
    return (
      <div className="py-6">
        <h1 className="text-3xl font-bold mb-6">Diseñar Plantilla: {title}</h1>
        {editorBackgroundUrl ? (
          <CertificateEditor
            backgroundUrl={editorBackgroundUrl}
            onSave={handleSaveTemplate}
            onCancel={() => router.push('/dashboard/certificates')}
            designWidth={designWidth}
            designHeight={designHeight}
          />
        ) : (
          <div className="alert alert-error">
            <span>Error: No se pudo cargar la imagen de fondo</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12">
      <button onClick={() => router.back()} className="btn btn-ghost mb-6">
        ← Volver
      </button>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="text-3xl font-bold mb-6">Nueva Plantilla de Certificado</h1>

          {/* Título */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-semibold">Título de la Plantilla *</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input input-bordered"
              placeholder="Ej: Certificado de Finalización - Estilo Formal"
            />
          </div>

          {/* Configuración de Página */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Tamaño de Página</span>
              </label>
              <select
                className="select select-bordered"
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as CertificatePageSize)}
              >
                <option value="letter">Carta (Letter)</option>
                <option value="legal">Oficio (Legal)</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Orientación</span>
              </label>
              <select
                className="select select-bordered"
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as CertificateOrientation)}
              >
                <option value="landscape">Horizontal</option>
                <option value="portrait">Vertical</option>
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-semibold">Descripción (opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea textarea-bordered h-24"
              placeholder="Describe esta plantilla..."
            />
          </div>

          {/* Imagen de fondo */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-semibold">Imagen de Fondo *</span>
            </label>
            
            {backgroundPreview && (
              <div className="mb-4">
                <img
                  src={backgroundPreview}
                  alt="Preview"
                  className="w-full h-64 object-contain rounded-lg border-2 border-base-300"
                />
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="file-input file-input-bordered w-full"
            />
            <label className="label">
              <span className="label-text-alt">
                Recomendado: 900x600px. Formatos: JPG, PNG, WebP (máx. 5MB)
              </span>
            </label>
          </div>

          {/* Botones */}
          <div className="flex gap-4 mt-6">
            <button
              onClick={() => router.back()}
              className="btn btn-ghost flex-1"
            >
              Cancelar
            </button>
            <button
              onClick={handleContinueToEditor}
              className="btn btn-primary text-white flex-1"
              disabled={!title || (!backgroundPreview && !selectedFile) || uploadingImage}
            >
              {uploadingImage ? 'Subiendo imagen...' : 'Continuar al Editor →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
