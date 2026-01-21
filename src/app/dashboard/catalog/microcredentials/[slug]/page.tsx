/**
 * Detalle de Microcredencial - Vista Estudiante
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader } from '@/components/common/Loader';
import {
    MicrocredentialBadge,
    MicrocredentialProgress,
    MicrocredentialEnrollButton,
    CourseAccessCard,
    PaymentTransferModal,
} from '@/components/microcredential';
import { MicrocredentialWithCourses, MicrocredentialEnrollment } from '@/types/microcredential';
import { IconArrowLeft, IconClock, IconBook } from '@tabler/icons-react';
import Link from 'next/link';

export default function MicrocredentialDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const slug = params.slug as string;

    const [microcredential, setMicrocredential] = useState<MicrocredentialWithCourses | null>(null);
    const [enrollment, setEnrollment] = useState<MicrocredentialEnrollment | null>(null);
    const [loading, setLoading] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [enrolling, setEnrolling] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Cargar microcredencial
                const res = await fetch(`/api/microcredentials/${slug}`);
                if (!res.ok) {
                    router.push('/dashboard/catalog/microcredentials');
                    return;
                }
                const data = await res.json();
                setMicrocredential(data.microcredential);

                // Cargar enrollment si está autenticado
                if (user) {
                    const enrollRes = await fetch('/api/student/my-credentials');
                    if (enrollRes.ok) {
                        const enrollData = await enrollRes.json();
                        const myEnrollment = (enrollData.enrollments || []).find(
                            (e: any) => e.microcredentialId === data.microcredential.id
                        );
                        setEnrollment(myEnrollment || null);
                    }
                }
            } catch (error) {
                console.error('Error loading microcredential:', error);
            } finally {
                setLoading(false);
            }
        };

        if (slug) {
            loadData();
        }
    }, [slug, user, router]);

    const handleEnroll = async (paymentReference?: string) => {
        if (!microcredential) return;

        setEnrolling(true);
        try {
            const res = await fetch('/api/microcredentials/enroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    microcredentialId: microcredential.id,
                    paymentReference,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al inscribirse');
            }

            // Actualizar estado
            setEnrollment(data.enrollment);
            setShowPaymentModal(false);

            // Mostrar mensaje de éxito
            if (data.paymentPending) {
                alert('¡Inscripción registrada! Tu pago será verificado pronto.');
            } else {
                alert('¡Inscripción exitosa! Ya puedes comenzar tu aprendizaje.');
            }
        } catch (error: any) {
            alert(error.message || 'Error al inscribirse');
        } finally {
            setEnrolling(false);
        }
    };

    if (loading) {
        return <Loader />;
    }

    if (!microcredential) {
        return (
            <div className="text-center py-16">
                <p>Microcredencial no encontrada</p>
                <Link href="/dashboard/catalog/microcredentials" className="btn btn-primary mt-4">
                    Volver al catálogo
                </Link>
            </div>
        );
    }

    const { courseLevel1, courseLevel2 } = microcredential;
    const totalDuration = (courseLevel1?.durationMinutes || 0) + (courseLevel2?.durationMinutes || 0);
    const isEnrolled = !!enrollment;
    const isPendingPayment = enrollment?.acquisitionType === 'paid' && !enrollment?.paymentVerifiedAt;

    return (
        <div className="container mx-auto max-w-4xl">
            {/* Navegación */}
            <Link
                href="/dashboard/catalog/microcredentials"
                className="btn btn-ghost btn-sm gap-2 mb-6"
            >
                <IconArrowLeft size={18} />
                Volver al catálogo
            </Link>

            {/* Header con Badge */}
            <div className="card bg-base-100 shadow-xl mb-8">
                <div className="card-body">
                    <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                        {/* Badge */}
                        <div className="flex-shrink-0">
                            <MicrocredentialBadge
                                imageUrl={microcredential.badgeImageUrl}
                                lockedImageUrl={microcredential.badgeLockedImageUrl}
                                title={microcredential.title}
                                isUnlocked={enrollment?.badgeUnlocked || false}
                                size="xl"
                                badgeColor={microcredential.badgeColor}
                                progressPercentage={
                                    enrollment?.badgeUnlocked
                                        ? 100
                                        : enrollment?.level1Completed && enrollment?.level2Completed
                                            ? 100
                                            : enrollment?.level1Completed
                                                ? 50
                                                : enrollment ? 0 : undefined
                                }
                            />
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center md:text-left">
                            <h1 className="text-3xl font-bold mb-2">{microcredential.title}</h1>

                            {microcredential.description && (
                                <p className="text-base-content/70 mb-4 text-justify">
                                    {microcredential.description}
                                </p>
                            )}

                            {/* Metadatos */}
                            <div className="flex flex-wrap gap-4 justify-center md:justify-start mb-6">
                                <div className="flex items-center gap-1.5 text-sm text-base-content/60">
                                    <IconBook size={18} />
                                    <span>2 Niveles incluidos</span>
                                </div>
                                {totalDuration > 0 && (
                                    <div className="flex items-center gap-1.5 text-sm text-base-content/60">
                                        <IconClock size={18} />
                                        <span>
                                            {Math.floor(totalDuration / 60)}h {totalDuration % 60}min
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Botón de inscripción */}
                            <MicrocredentialEnrollButton
                                microcredential={microcredential}
                                isEnrolled={isEnrolled && !isPendingPayment}
                                isPendingPayment={isPendingPayment}
                                onEnroll={handleEnroll}
                                onShowPaymentModal={() => setShowPaymentModal(true)}
                                size="lg"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Progreso (si está inscrito) */}
            {isEnrolled && !isPendingPayment && (
                <div className="card bg-base-100 shadow-xl mb-8">
                    <div className="card-body">
                        <h2 className="card-title mb-4">Tu Progreso</h2>
                        <MicrocredentialProgress
                            level1Completed={enrollment?.level1Completed || false}
                            level2Unlocked={enrollment?.level2Unlocked || false}
                            level2Completed={enrollment?.level2Completed || false}
                            badgeUnlocked={enrollment?.badgeUnlocked || false}
                            level1Title={courseLevel1?.title || 'Nivel 1'}
                            level2Title={courseLevel2?.title || 'Nivel 2'}
                        />
                    </div>
                </div>
            )}

            {/* Cursos incluidos */}
            <div className="card bg-base-100 shadow-xl mb-8">
                <div className="card-body">
                    <h2 className="card-title mb-4">Cursos Incluidos</h2>

                    <div className="space-y-4">
                        {/* Nivel 1 */}
                        {courseLevel1 && (
                            <CourseAccessCard
                                courseId={courseLevel1.id}
                                title={courseLevel1.title}
                                description={courseLevel1.description}
                                coverImageUrl={courseLevel1.coverImageUrl}
                                level={1}
                                isLocked={!isEnrolled || isPendingPayment}
                                isCompleted={enrollment?.level1Completed || false}
                                onLockedClick={() => {
                                    if (!isEnrolled) {
                                        alert('Inscríbete primero para acceder a los cursos');
                                    }
                                }}
                            />
                        )}

                        {/* Nivel 2 */}
                        {courseLevel2 && (
                            <CourseAccessCard
                                courseId={courseLevel2.id}
                                title={courseLevel2.title}
                                description={courseLevel2.description}
                                coverImageUrl={courseLevel2.coverImageUrl}
                                level={2}
                                isLocked={!isEnrolled || isPendingPayment || !enrollment?.level2Unlocked}
                                isCompleted={enrollment?.level2Completed || false}
                                onLockedClick={() => {
                                    if (!isEnrolled) {
                                        alert('Inscríbete primero para acceder a los cursos');
                                    } else if (!enrollment?.level1Completed) {
                                        alert('Completa el Nivel 1 primero para desbloquear este curso');
                                    }
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de pago */}
            <PaymentTransferModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                onConfirm={handleEnroll}
                price={microcredential.price}
                productTitle={microcredential.title}
            />
        </div>
    );
}
