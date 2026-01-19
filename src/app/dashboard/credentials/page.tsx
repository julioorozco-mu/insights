/**
 * Mis Credenciales - Vista de insignias ganadas
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader } from '@/components/common/Loader';
import { MicrocredentialBadge, MicrocredentialProgress } from '@/components/microcredential';
import { MicrocredentialEnrollmentWithDetails } from '@/types/microcredential';
import { Award, Download, Share2, Shield, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function CredentialsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<MicrocredentialEnrollmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnrollment, setSelectedEnrollment] = useState<MicrocredentialEnrollmentWithDetails | null>(null);

  useEffect(() => {
    const loadCredentials = async () => {
      if (!user) return;

      try {
        const res = await fetch('/api/student/my-credentials');
        if (res.ok) {
          const data = await res.json();
          setEnrollments(data.enrollments || []);
        }
      } catch (error) {
        console.error('Error loading credentials:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCredentials();
  }, [user]);

  if (loading) {
    return <Loader />;
  }

  const completedEnrollments = enrollments.filter(e => e.badgeUnlocked);
  const inProgressEnrollments = enrollments.filter(e => !e.badgeUnlocked && e.status === 'in_progress');

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Mis Credenciales</h1>
        <p className="text-base-content/70">
          Tus microcredenciales e insignias ganadas
        </p>
      </div>

      {/* Stats */}
      <div className="stats shadow w-full mb-8">
        <div className="stat">
          <div className="stat-figure text-primary">
            <Award className="w-8 h-8" />
          </div>
          <div className="stat-title">Completadas</div>
          <div className="stat-value text-primary">{completedEnrollments.length}</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-info">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div className="stat-title">En Progreso</div>
          <div className="stat-value text-info">{inProgressEnrollments.length}</div>
        </div>
      </div>

      {/* Insignias Ganadas */}
      {completedEnrollments.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Award className="w-6 h-6 text-success" />
            Insignias Obtenidas
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {completedEnrollments.map((enrollment) => (
              <div
                key={enrollment.id}
                onClick={() => setSelectedEnrollment(enrollment)}
                className="cursor-pointer hover:scale-105 transition-transform"
              >
                <MicrocredentialBadge
                  imageUrl={enrollment.microcredential?.badgeImageUrl || ''}
                  lockedImageUrl={enrollment.microcredential?.badgeLockedImageUrl}
                  title={enrollment.microcredential?.title || 'Microcredencial'}
                  isUnlocked={true}
                  size="lg"
                  badgeColor={enrollment.microcredential?.badgeColor}
                  showLabel={true}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* En Progreso */}
      {inProgressEnrollments.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-info" />
            En Progreso
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inProgressEnrollments.map((enrollment) => (
              <div
                key={enrollment.id}
                className="card bg-base-100 shadow-md"
              >
                <div className="card-body flex-row gap-4 items-center">
                  <MicrocredentialBadge
                    imageUrl={enrollment.microcredential?.badgeImageUrl || ''}
                    lockedImageUrl={enrollment.microcredential?.badgeLockedImageUrl}
                    title={enrollment.microcredential?.title || ''}
                    isUnlocked={false}
                    size="md"
                    badgeColor={enrollment.microcredential?.badgeColor}
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold line-clamp-1">
                      {enrollment.microcredential?.title}
                    </h3>
                    <MicrocredentialProgress
                      level1Completed={enrollment.level1Completed}
                      level2Unlocked={enrollment.level2Unlocked}
                      level2Completed={enrollment.level2Completed}
                      badgeUnlocked={enrollment.badgeUnlocked}
                      compact={true}
                    />
                    <Link
                      href={`/dashboard/catalog/microcredentials/${enrollment.microcredential?.slug}`}
                      className="btn btn-sm btn-primary mt-2"
                    >
                      Continuar
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Estado vacío */}
      {enrollments.length === 0 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body items-center text-center py-16">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Award className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Comienza tu colección</h2>
            <p className="text-base-content/70 max-w-md mb-6">
              Aún no tienes microcredenciales. Explora el catálogo y
              obtén tu primera insignia completando un programa.
            </p>
            <Link href="/dashboard/catalog/microcredentials" className="btn btn-primary">
              Explorar Microcredenciales
            </Link>
          </div>
        </div>
      )}

      {/* Features */}
      {enrollments.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body items-center text-center">
              <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mb-3">
                <Shield className="w-6 h-6 text-success" />
              </div>
              <h3 className="font-semibold">Verificables</h3>
              <p className="text-sm text-base-content/60">
                Credenciales con verificación digital
              </p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-lg">
            <div className="card-body items-center text-center">
              <div className="w-12 h-12 bg-info/10 rounded-full flex items-center justify-center mb-3">
                <Download className="w-6 h-6 text-info" />
              </div>
              <h3 className="font-semibold">Descargables</h3>
              <p className="text-sm text-base-content/60">
                Descarga tus certificados en PDF
              </p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-lg">
            <div className="card-body items-center text-center">
              <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center mb-3">
                <Share2 className="w-6 h-6 text-warning" />
              </div>
              <h3 className="font-semibold">Compartibles</h3>
              <p className="text-sm text-base-content/60">
                Comparte en redes profesionales
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalle de insignia */}
      {selectedEnrollment && (
        <div className="modal modal-open">
          <div className="modal-box">
            <div className="text-center">
              <MicrocredentialBadge
                imageUrl={selectedEnrollment.microcredential?.badgeImageUrl || ''}
                title={selectedEnrollment.microcredential?.title || ''}
                isUnlocked={true}
                size="xl"
                badgeColor={selectedEnrollment.microcredential?.badgeColor}
                animate={true}
              />
              <h3 className="font-bold text-xl mt-4">
                {selectedEnrollment.microcredential?.title}
              </h3>
              <p className="text-base-content/70 mt-2">
                {selectedEnrollment.microcredential?.description}
              </p>
              <p className="text-sm text-success mt-4">
                ✓ Completada el {new Date(selectedEnrollment.completedAt || '').toLocaleDateString('es-MX')}
              </p>
            </div>
            <div className="modal-action justify-center">
              <button className="btn btn-outline gap-2">
                <Download className="w-4 h-4" />
                Descargar Certificado
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setSelectedEnrollment(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop bg-black/50"
            onClick={() => setSelectedEnrollment(null)}
          />
        </div>
      )}
    </div>
  );
}
