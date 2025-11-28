"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader } from "@/components/common/Loader";
import { IconCertificate, IconPlus, IconEye, IconEdit, IconTrash, IconFileTypePdf } from "@tabler/icons-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatDate } from "@/utils/formatDate";

interface CertificateTemplate {
  id: string;
  title: string;
  backgroundUrl?: string;
  pdfTemplateUrl?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export default function CertificatesPage() {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const templatesSnapshot = await getDocs(collection(db, "certificateTemplates"));
        const templatesData = templatesSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          };
        }) as CertificateTemplate[];
        setTemplates(templatesData);
      } catch (error) {
        console.error("Error loading certificate templates:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, []);

  if (loading) {
    return <Loader />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Certificados</h1>
          <p className="text-base-content/70">Gestiona plantillas de certificados</p>
        </div>
        <Link href="/dashboard/certificates/new" className="btn btn-primary text-white gap-2">
          <IconPlus size={20} />
          Crear Plantilla
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <div className="text-primary mb-4 flex justify-center">
              <IconCertificate size={64} stroke={2} />
            </div>
            <h2 className="text-2xl font-bold mb-2">No hay plantillas de certificados</h2>
            <p className="text-base-content/70 mb-4">
              Crea plantillas para generar certificados automáticamente
            </p>
            <Link href="/dashboard/certificates/new" className="btn btn-primary text-white gap-2 mx-auto">
              <IconPlus size={20} />
              Crear Primera Plantilla
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
              <figure className="h-48 bg-base-300">
                {template.backgroundUrl ? (
                  <img
                    src={template.backgroundUrl}
                    alt={template.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-primary">
                    <IconCertificate size={64} stroke={2} />
                  </div>
                )}
              </figure>
              <div className="card-body">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="card-title text-lg">{template.title}</h2>
                  {template.isActive ? (
                    <div className="badge badge-success">Activa</div>
                  ) : (
                    <div className="badge badge-ghost">Inactiva</div>
                  )}
                </div>
                {template.description && (
                  <p className="text-sm text-base-content/70 mb-3 line-clamp-2">
                    {template.description}
                  </p>
                )}
                <div className="text-xs text-base-content/60 mb-4">
                  Creada: {formatDate(template.createdAt)}
                </div>
                {template.pdfTemplateUrl && (
                  <div className="flex items-center gap-2 mb-4">
                    <IconFileTypePdf size={20} className="text-error" />
                    <span className="text-sm">Plantilla PDF disponible</span>
                  </div>
                )}
                <div className="card-actions justify-between">
                  <Link
                    href={`/dashboard/certificates/${template.id}/preview`}
                    className="btn btn-sm btn-ghost gap-2"
                  >
                    <IconEye size={16} />
                    Vista Previa
                  </Link>
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/certificates/${template.id}/edit`}
                      className="btn btn-sm btn-ghost gap-2"
                    >
                      <IconEdit size={16} />
                      Editar
                    </Link>
                    <button className="btn btn-sm btn-ghost text-error gap-2">
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
  );
}
