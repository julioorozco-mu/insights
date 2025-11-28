"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CertificateTemplate, CertificatePageSize, CertificateOrientation } from "@/types/certificate";
import { Loader } from "@/components/common/Loader";
import { IconDownload, IconRefresh, IconUpload, IconX } from "@tabler/icons-react";
import { convertImageToPngDataUrl } from "@/utils/image";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import CertificateDOM from "@/components/certificate/CertificateDOM";

export default function CertificatePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const [template, setTemplate] = useState<CertificateTemplate | null>(null);
  const [pdfTemplate, setPdfTemplate] = useState<CertificateTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const previewBoxRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [pageSize, setPageSize] = useState<CertificatePageSize>('letter');
  const [orientation, setOrientation] = useState<CertificateOrientation>('landscape');
  const hiddenDomRef = useRef<HTMLDivElement | null>(null);
  const [exportBg, setExportBg] = useState<string | undefined>(undefined);
  const [exportSigs, setExportSigs] = useState<typeof signatures>([]);
  const [exporting, setExporting] = useState(false);
  const [previewData, setPreviewData] = useState({
    studentName: 'Juan Pérez García',
    courseTitle: 'Comunicación Estratégica en Redes Sociales',
    instructorName: 'Dr. María González',
    completionDate: new Date().toLocaleDateString('es-MX', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    signatureUrl: '',
  });

  // Estados para firmas
  const [signatures, setSignatures] = useState<Array<{
    id: string;
    imageUrl: string;
    title: string;
    name: string;
  }>>([]);
  const [uploadingSignature, setUploadingSignature] = useState(false);

  useEffect(() => {
    const toDataUrl = async (url: string): Promise<string> => {
      try {
        const res = await fetch(`/api/image-proxy?url=${encodeURIComponent(url)}`);
        if (res.ok) {
          const json = await res.json();
          if (json?.dataUrl) return await convertImageToPngDataUrl(json.dataUrl as string);
        }
      } catch {}
      // Fallback to client-side conversion
      try {
        return await convertImageToPngDataUrl(url);
      } catch {
        return url; // as-is
      }
    };

    const loadTemplate = async () => {
      try {
        const templateDoc = await getDoc(doc(db, 'certificateTemplates', params.id as string));
        if (templateDoc.exists()) {
          const data = templateDoc.data();
          const t = {
            id: templateDoc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          } as CertificateTemplate;
          setTemplate(t);
          setSignatures((t as any).signatures || []);
          setPageSize((t as any).pageSize || 'letter');
          setOrientation((t as any).orientation || 'landscape');

          // Procesar background a data URL para PDF (server proxy + fallback)
          if (t.backgroundUrl) {
            const dataUrl = await toDataUrl(t.backgroundUrl);
            setPdfTemplate({ ...t, backgroundUrl: dataUrl });
          } else {
            setPdfTemplate(t);
          }
        }
      } catch (error) {
        console.error('Error loading template:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [params.id]);

  // Canvas-based export using html-to-image + jsPDF (component scope)
  const exportCanvasPdf = async () => {
    if (!template) return;
    try {
      setExporting(true);
      const [htmlToImage, { default: jsPDF }] = await Promise.all([
        import('html-to-image'),
        import('jspdf'),
      ]);

      // Use already processed background if available
      const bg = pdfTemplate?.backgroundUrl || template.backgroundUrl;
      const safeBg = bg?.startsWith('data:') ? bg : (bg ? await convertImageToPngDataUrl(bg).catch(() => bg) : undefined);
      
      // Convert signatures only if not already data URLs
      const safeSigs = await Promise.all(
        signatures.map(async (s) => {
          if (!s.imageUrl) return s;
          if (s.imageUrl.startsWith('data:')) return s;
          try {
            const dataUrl = await convertImageToPngDataUrl(s.imageUrl);
            return { ...s, imageUrl: dataUrl };
          } catch {
            return s; // Keep original if conversion fails
          }
        })
      );

      setExportBg(safeBg);
      setExportSigs(safeSigs);
      await new Promise((r) => requestAnimationFrame(r));

      const node = hiddenDomRef.current;
      if (!node) throw new Error('Elemento de exportación no disponible');
      const dataUrl = await htmlToImage.toPng(node, { cacheBust: true, pixelRatio: 2 });

      const sizes = { letter: { w: 216, h: 279 }, legal: { w: 216, h: 356 } } as const;
      const base = sizes[pageSize];
      const pdfW = orientation === 'landscape' ? base.h : base.w;
      const pdfH = orientation === 'landscape' ? base.w : base.h;

      const doc = new jsPDF({ orientation, unit: 'mm', format: [pdfW, pdfH] });
      doc.addImage(dataUrl, 'PNG', 0, 0, pdfW, pdfH);
      const filename = `certificado-${previewData.studentName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      doc.save(filename);
    } catch (e: any) {
      console.error('Canvas export error:', e);
      alert('Error al exportar certificado');
    } finally {
      setExporting(false);
    }
  };

  // Escala responsiva para la vista previa (font-size y posiciones coherentes)
  useEffect(() => {
    const updateScale = () => {
      if (!previewBoxRef.current || !template) return;
      const designWidth = template.designWidth || 900;
      setScale(previewBoxRef.current.offsetWidth / designWidth);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [template]);

  // Helpers en scope del componente (accesibles desde JSX)
  const computeDesignDimensions = (ps: CertificatePageSize, or: CertificateOrientation) => {
    const PAGE_SIZES = {
      letter: { width: 612, height: 792 },
      legal: { width: 612, height: 1008 },
    } as const;
    const base = PAGE_SIZES[ps];
    const oriented = or === 'landscape' ? { width: base.height, height: base.width } : base;
    const dw = 900;
    const dh = Math.round((oriented.height / oriented.width) * dw);
    return { designWidth: dw, designHeight: dh };
  };

  const savePageConfig = async () => {
    if (!template) return;
    try {
      const { designWidth, designHeight } = computeDesignDimensions(pageSize, orientation);
      await updateDoc(doc(db, 'certificateTemplates', template.id), {
        pageSize,
        orientation,
        designWidth,
        designHeight,
        updatedAt: new Date(),
      });
      const updated = { ...template, pageSize, orientation, designWidth, designHeight } as CertificateTemplate;
      setTemplate(updated);
      setPdfTemplate(prev => prev ? ({ ...prev, pageSize, orientation, designWidth, designHeight }) : updated);
      alert('Configuración de página guardada');
    } catch (e) {
      console.error('Error saving page config:', e);
      alert('Error al guardar configuración de página');
    }
  };

  const handleAddSignature = () => {
    setSignatures([...signatures, {
      id: Date.now().toString(),
      imageUrl: '',
      title: '',
      name: '',
    }]);
  };

  const handleRemoveSignature = (id: string) => {
    setSignatures(signatures.filter(sig => sig.id !== id));
  };

  const handleSignatureImageUpload = async (id: string, file: File) => {
    try {
      setUploadingSignature(true);
      const timestamp = Date.now();
      const fileName = `certificates/signatures/${timestamp}_${file.name}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      setSignatures(signatures.map(sig => 
        sig.id === id ? { ...sig, imageUrl: downloadURL } : sig
      ));
    } catch (error) {
      console.error("Error uploading signature:", error);
      alert("Error al subir la firma");
    } finally {
      setUploadingSignature(false);
    }
  };

  const updateSignature = (id: string, field: 'title' | 'name' | 'imageUrl', value: string) => {
    setSignatures(signatures.map(sig => 
      sig.id === id ? { ...sig, [field]: value } : sig
    ));
  };

  const saveSignaturesToTemplate = async () => {
    if (!template) return;
    try {
      await updateDoc(doc(db, 'certificateTemplates', template.id), {
        signatures: signatures,
        updatedAt: new Date(),
      });
      const updated = { ...template, signatures } as CertificateTemplate;
      setTemplate(updated);
      setPdfTemplate(prev => prev ? ({ ...prev, signatures }) : updated);
      alert('Firmas guardadas en la plantilla');
    } catch (e) {
      console.error('Error saving signatures:', e);
      alert('Error al guardar firmas');
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Plantilla no encontrada</h2>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => router.back()} className="btn btn-ghost mb-6">
        ← Volver
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de datos de prueba */}
        <div className="lg:col-span-1">
          <div className="card bg-base-100 shadow-xl sticky top-4">
            <div className="card-body">
              <h2 className="card-title mb-4">Datos de Prueba</h2>

              {/* Configuración de Página */}
              <div className="mb-4 p-3 rounded-lg bg-base-200">
                <div className="font-semibold mb-2">Configuración de Página</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="form-control">
                    <label className="label"><span className="label-text">Tamaño</span></label>
                    <select
                      className="select select-bordered select-sm"
                      value={pageSize}
                      onChange={(e) => setPageSize(e.target.value as any)}
                    >
                      <option value="letter">Carta (Letter)</option>
                      <option value="legal">Oficio (Legal)</option>
                    </select>
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text">Orientación</span></label>
                    <select
                      className="select select-bordered select-sm"
                      value={orientation}
                      onChange={(e) => setOrientation(e.target.value as any)}
                    >
                      <option value="landscape">Horizontal</option>
                      <option value="portrait">Vertical</option>
                    </select>
                  </div>
                </div>
                <button onClick={savePageConfig} className="btn btn-xs btn-primary text-white mt-3 w-full">
                  Guardar Configuración
                </button>
              </div>
              
              <div className="form-control mb-3">
                <label className="label">
                  <span className="label-text">Nombre del Estudiante</span>
                </label>
                <input
                  type="text"
                  value={previewData.studentName}
                  onChange={(e) => setPreviewData({ ...previewData, studentName: e.target.value })}
                  className="input input-bordered input-sm"
                />
              </div>

              <div className="form-control mb-3">
                <label className="label">
                  <span className="label-text">Título del Curso</span>
                </label>
                <input
                  type="text"
                  value={previewData.courseTitle}
                  onChange={(e) => setPreviewData({ ...previewData, courseTitle: e.target.value })}
                  className="input input-bordered input-sm"
                />
              </div>

              <div className="form-control mb-3">
                <label className="label">
                  <span className="label-text">Nombre del Instructor</span>
                </label>
                <input
                  type="text"
                  value={previewData.instructorName}
                  onChange={(e) => setPreviewData({ ...previewData, instructorName: e.target.value })}
                  className="input input-bordered input-sm"
                />
              </div>

              <div className="form-control mb-3">
                <label className="label">
                  <span className="label-text">Fecha de Finalización</span>
                </label>
                <input
                  type="text"
                  value={previewData.completionDate}
                  onChange={(e) => setPreviewData({ ...previewData, completionDate: e.target.value })}
                  className="input input-bordered input-sm"
                />
              </div>

              {/* Sección de Firmas */}
              <div className="divider">Firmas</div>
              
              <div className="space-y-4 mb-4">
                {signatures.map((signature, index) => (
                  <div key={signature.id} className="card bg-base-200 p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold text-sm">Firma {index + 1}</h3>
                      <button
                        onClick={() => handleRemoveSignature(signature.id)}
                        className="btn btn-ghost btn-xs btn-circle text-error"
                      >
                        <IconX size={16} />
                      </button>
                    </div>

                    {/* Subir imagen */}
                    <div className="form-control mb-2">
                      <label className="label">
                        <span className="label-text-alt">Imagen de Firma (PNG sin fondo)</span>
                      </label>
                      {signature.imageUrl ? (
                        <div className="relative">
                          <img
                            src={signature.imageUrl}
                            alt="Firma"
                            className="w-full h-20 object-contain bg-white rounded border"
                          />
                          <button
                            onClick={() => updateSignature(signature.id, 'imageUrl', '')}
                            className="btn btn-xs btn-error absolute top-1 right-1"
                          >
                            Cambiar
                          </button>
                        </div>
                      ) : (
                        <input
                          type="file"
                          accept="image/png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleSignatureImageUpload(signature.id, file);
                          }}
                          className="file-input file-input-bordered file-input-xs"
                          disabled={uploadingSignature}
                        />
                      )}
                    </div>

                    {/* Título/Cargo */}
                    <div className="form-control mb-2">
                      <label className="label">
                        <span className="label-text-alt">Título/Cargo</span>
                      </label>
                      <input
                        type="text"
                        value={signature.title}
                        onChange={(e) => updateSignature(signature.id, 'title', e.target.value)}
                        className="input input-bordered input-xs"
                        placeholder="Ej: Director General"
                      />
                    </div>

                    {/* Nombre */}
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text-alt">Nombre</span>
                      </label>
                      <input
                        type="text"
                        value={signature.name}
                        onChange={(e) => updateSignature(signature.id, 'name', e.target.value)}
                        className="input input-bordered input-xs"
                        placeholder="Ej: Dr. Juan Pérez"
                      />
                    </div>
                  </div>
                ))}

                <button
                  onClick={handleAddSignature}
                  className="btn btn-outline btn-sm w-full gap-2"
                  disabled={uploadingSignature}
                >
                  <IconUpload size={16} />
                  Agregar Firma
                </button>
              </div>

              <button
                onClick={saveSignaturesToTemplate}
                className="btn btn-primary text-white btn-sm w-full mb-4"
              >
                Guardar Firmas en Plantilla
              </button>

              <button
                onClick={() => setPreviewData({
                  studentName: 'Juan Pérez García',
                  courseTitle: 'Comunicación Estratégica en Redes Sociales',
                  instructorName: 'Dr. María González',
                  completionDate: new Date().toLocaleDateString('es-MX', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  }),
                  signatureUrl: '',
                })}
                className="btn btn-sm btn-outline gap-2 mb-4"
              >
                <IconRefresh size={16} />
                Restablecer
              </button>
              <button onClick={exportCanvasPdf} className="btn btn-primary text-white gap-2" disabled={exporting}>
                {exporting ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    Generando PDF...
                  </>
                ) : (
                  <>
                    <IconDownload size={20} />
                    Descargar Certificado
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Vista previa */}
        <div className="lg:col-span-2">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title mb-4">Vista Previa: {template.title}</h2>
              
              <div className="border-2 border-base-300 rounded-lg overflow-hidden bg-white">
                {(() => {
                  const designWidth = template.designWidth || 900;
                  const designHeight = template.designHeight || 600;
                  const ratio = (designHeight / designWidth) * 100;
                  return (
                    <div 
                      className="relative"
                      ref={previewBoxRef}
                      style={{ width: '100%', paddingBottom: `${ratio}%` }}
                    >
                      <div
                        className="absolute top-0 left-0"
                        style={{ 
                          width: `${designWidth}px`,
                          height: `${designHeight}px`,
                          transform: `scale(${scale})`,
                          transformOrigin: 'top left',
                        }}
                      >
                        <img
                          src={template.backgroundUrl}
                          alt="Background"
                          style={{ width: `${designWidth}px`, height: `${designHeight}px`, objectFit: 'contain' }}
                        />
                        {template.elements.map((el) => {
                          const getValue = () => {
                            if (el.type === 'variable' && el.variableKey) {
                              const value = (previewData as any)[el.variableKey] || `{{${el.variableKey}}}`;
                              // Aplicar uppercase a studentName
                              if (el.variableKey === 'studentName' && value) {
                                return value.toUpperCase();
                              }
                              return value;
                            }
                            return el.value || 'Texto';
                          };
                          return (
                            <div
                              key={el.id}
                              style={{
                                position: 'absolute',
                                left: `${el.x}px`,
                                top: `${el.y}px`,
                                width: `${el.width}px`,
                                height: `${el.height}px`,
                                fontSize: `${el.style?.fontSize || 18}px`,
                                color: el.style?.color || '#000',
                                fontFamily: el.style?.fontFamily || 'Helvetica',
                                textAlign: el.style?.align || 'left',
                                fontWeight: el.style?.bold ? 'bold' : 'normal',
                                fontStyle: el.style?.italic ? 'italic' : 'normal',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: el.style?.align === 'center' ? 'center' : (el.style?.align === 'right' ? 'flex-end' : 'flex-start'),
                                pointerEvents: 'none',
                              }}
                            >
                              {getValue()}
                            </div>
                          );
                        })}

                    {/* Firmas en la vista previa */}
                        {signatures.length > 0 && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: `${0.08 * designHeight}px`,
                              left: `${0.1 * designWidth}px`,
                              right: `${0.1 * designWidth}px`,
                              display: 'flex',
                              justifyContent: 'space-around',
                              alignItems: 'flex-end',
                            }}
                          >
                            {signatures.map((signature) => (
                              <div
                                key={signature.id}
                                style={{
                                  flex: 1,
                                  textAlign: 'center',
                                  maxWidth: `${0.8 * designWidth / signatures.length}px`,
                                }}
                              >
                                {signature.imageUrl && (
                                  <img
                                    src={signature.imageUrl}
                                    alt="Firma"
                                    style={{
                                      width: `${0.14 * designWidth}px`,
                                      height: `${0.07 * designHeight}px`,
                                      objectFit: 'contain',
                                      marginBottom: '4px',
                                    }}
                                  />
                                )}
                                <div
                                  style={{
                                    borderTop: '1px solid #000',
                                    paddingTop: '4px',
                                    fontSize: '10px',
                                  }}
                                >
                                  {signature.name && (
                                    <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                                      {signature.name}
                                    </div>
                                  )}
                                  {signature.title && (
                                    <div style={{ fontSize: '9px', color: '#666' }}>
                                      {signature.title}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="alert alert-info mt-4 text-white">
                <div>
                  <h3 className="font-bold">💡 Tip</h3>
                  <div className="text-sm">
                    Modifica los datos en el panel izquierdo para ver cómo se verá el certificado con diferentes valores.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Render oculto para exportación por Canvas */}
      <div style={{ position: 'fixed', left: -10000, top: -10000, opacity: 0, pointerEvents: 'none' }}>
        {(template || pdfTemplate) && (
          <CertificateDOM
            ref={hiddenDomRef}
            template={pdfTemplate || template!}
            data={previewData as any}
            signatures={exportSigs.length ? exportSigs : signatures}
            backgroundSrc={exportBg || (pdfTemplate?.backgroundUrl || template!.backgroundUrl)}
          />
        )}
      </div>
    </div>
  );
}
