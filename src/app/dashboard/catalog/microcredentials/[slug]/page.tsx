/**
 * Detalle de Microcredencial - Vista Estudiante con Roadmap Visual
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader } from '@/components/common/Loader';
import {
    MicrocredentialBadge,
    MicrocredentialEnrollButton,
    PaymentTransferModal,
} from '@/components/microcredential';
import { MicrocredentialWithCourses, MicrocredentialEnrollment } from '@/types/microcredential';
import { IconArrowLeft, IconLock, IconPlayerPlay, IconCheck, IconAlertTriangle, IconAward, IconClock, IconBook } from '@tabler/icons-react';
import Link from 'next/link';

// Helper para limpiar HTML de las descripciones
function stripHtml(html: string | null | undefined): string {
    if (!html) return '';
    return html
        .replace(/<[^>]*>/g, '') // Remover etiquetas HTML
        .replace(/&nbsp;/g, ' ') // Reemplazar &nbsp; por espacios
        .replace(/&amp;/g, '&') // Reemplazar &amp; por &
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ') // Normalizar espacios
        .trim();
}

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

    // Progreso de cursos (simulado por ahora, se puede conectar a API)
    const [level1Progress, setLevel1Progress] = useState(0);
    const [level2Progress, setLevel2Progress] = useState(0);

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

                        // Si está inscrito, cargar progreso real de cursos
                        if (myEnrollment) {
                            // Obtener progreso del nivel 1
                            const level1EnrollRes = await fetch(`/api/student/enrollments/${data.microcredential.courseLevel1Id}`);
                            if (level1EnrollRes.ok) {
                                const level1Data = await level1EnrollRes.json();
                                setLevel1Progress(level1Data.enrollment?.progress || 0);
                            }
                            // Obtener progreso del nivel 2
                            const level2EnrollRes = await fetch(`/api/student/enrollments/${data.microcredential.courseLevel2Id}`);
                            if (level2EnrollRes.ok) {
                                const level2Data = await level2EnrollRes.json();
                                setLevel2Progress(level2Data.enrollment?.progress || 0);
                            }
                        }
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

    // Calcular progreso general
    const overallProgress = enrollment?.badgeUnlocked
        ? 100
        : enrollment?.level1Completed && enrollment?.level2Completed
            ? 100
            : enrollment?.level1Completed
                ? 50 + (level2Progress / 2)
                : level1Progress / 2;

    // Estados de los niveles
    const isLevel1Locked = !isEnrolled || isPendingPayment;
    const isLevel2Locked = !isEnrolled || isPendingPayment || !enrollment?.level2Unlocked;
    const level1Completed = enrollment?.level1Completed || false;
    const level2Completed = enrollment?.level2Completed || false;
    const badgeUnlocked = enrollment?.badgeUnlocked || false;

    return (
        <div className="roadmap-page min-h-screen bg-gradient-to-b from-base-200/50 to-base-100">
            {/* Header compacto con navegación */}
            <div className="container mx-auto max-w-4xl px-4 pt-4 pb-2">
                <Link
                    href="/dashboard/catalog/microcredentials"
                    className="btn btn-ghost btn-sm gap-2"
                >
                    <IconArrowLeft size={18} />
                    Volver al catálogo
                </Link>
            </div>

            {/* ===== SECCIÓN HERO: Badge + Título ===== */}
            <div className="flex flex-col items-center px-4 pt-2 pb-6">
                {/* Título compacto encima del badge */}
                <h1 className="text-xl md:text-2xl font-bold text-base-content text-center mb-4 max-w-lg">
                    {microcredential.title}
                </h1>

                {/* Badge Principal con indicador de progreso a la izquierda */}
                <div className="relative flex items-center justify-center gap-4">
                    {/* Indicador de Progreso General - Estilo flotante izquierda */}
                    {isEnrolled && !isPendingPayment && (
                        <div className="absolute -left-36 top-1/2 transform -translate-y-1/2 hidden md:flex flex-col items-end">
                            <div className="bg-base-200/80 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg border border-base-300">
                                <span className="text-sm font-semibold text-base-content/80 block">Progreso General</span>
                                <span className="text-3xl font-bold text-primary">{Math.round(overallProgress)}%</span>
                            </div>
                        </div>
                    )}

                    {/* Indicador móvil (visible solo en móvil) */}
                    {isEnrolled && !isPendingPayment && (
                        <div className="md:hidden absolute -top-10 left-1/2 transform -translate-x-1/2">
                            <div className="bg-base-200/80 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-md border border-base-300 flex items-center gap-2">
                                <span className="text-xs font-medium text-base-content/70">Progreso General</span>
                                <span className="text-lg font-bold text-primary">{Math.round(overallProgress)}%</span>
                            </div>
                        </div>
                    )}

                    <MicrocredentialBadge
                        imageUrl={microcredential.badgeImageUrl}
                        lockedImageUrl={microcredential.badgeLockedImageUrl}
                        title={microcredential.title}
                        isUnlocked={badgeUnlocked}
                        size="xl"
                        badgeColor={microcredential.badgeColor}
                        animate={badgeUnlocked}
                        progressPercentage={Math.round(overallProgress)}
                    />
                </div>

                {/* Descripción compacta colapsable */}
                {microcredential.description && (
                    <details className="mt-3 max-w-xl">
                        <summary className="text-xs text-base-content/50 cursor-pointer hover:text-base-content/70 transition-colors text-center flex items-center justify-center gap-1">
                            <IconBook size={12} />
                            Ver descripción del programa
                        </summary>
                        <p className="text-sm text-base-content/70 mt-2 text-justify leading-relaxed px-4">
                            {microcredential.description}
                        </p>
                    </details>
                )}

                {/* Botón de inscripción (si no está inscrito) */}
                {!isEnrolled && (
                    <div className="mt-3">
                        <MicrocredentialEnrollButton
                            microcredential={microcredential}
                            isEnrolled={false}
                            isPendingPayment={false}
                            onEnroll={handleEnroll}
                            onShowPaymentModal={() => setShowPaymentModal(true)}
                            size="md"
                        />
                    </div>
                )}

                {/* Estado de pago pendiente */}
                {isPendingPayment && (
                    <div className="alert alert-warning max-w-md mt-3 py-2">
                        <IconAlertTriangle size={16} />
                        <span className="text-sm">Tu pago está siendo verificado.</span>
                    </div>
                )}
            </div>

            {/* ===== ROADMAP VISUAL ===== */}
            <div className="roadmap-container container mx-auto max-w-3xl px-4 pb-16">

                {/* ===== CONECTOR DE INSIGNIA A NIVEL 1 ===== */}
                <div className="flex justify-center">
                    <div
                        className="w-1.5 h-20 rounded-full"
                        style={{ backgroundColor: level1Completed ? '#C9A227' : '#D1D5DB' }}
                    />
                </div>

                {/* ===== NIVEL 1 ===== */}
                <div className="roadmap-level relative pt-8">

                    {/* Número de nivel flotante */}
                    <div className={`
                        roadmap-level-number absolute -top-5 left-1/2 transform -translate-x-1/2 z-10
                        w-12 h-12 rounded-full flex items-center justify-center
                        font-bold text-xl shadow-lg
                        ${level1Completed
                            ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                            : isLevel1Locked
                                ? 'bg-gray-400 text-white'
                                : 'bg-gradient-to-br from-amber-500 to-amber-600 text-white'
                        }
                    `}>
                        {level1Completed ? <IconCheck size={24} /> : '1'}
                    </div>

                    {/* Card del Nivel 1 */}
                    <div className={`
                        roadmap-course-card bg-white rounded-2xl shadow-lg overflow-hidden
                        border-2 transition-all duration-300 hover:shadow-xl
                        ${level1Completed ? 'border-emerald-200' : isLevel1Locked ? 'border-gray-200' : 'border-amber-200'}
                    `}>
                        <div className="flex flex-col md:flex-row">
                            {/* Imagen */}
                            <div className="relative w-full md:w-48 h-40 md:h-auto flex-shrink-0">
                                {courseLevel1?.coverImageUrl ? (
                                    <img
                                        src={courseLevel1.coverImageUrl}
                                        alt={courseLevel1.title}
                                        className={`w-full h-full object-cover ${isLevel1Locked ? 'grayscale opacity-60' : ''}`}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                        <IconBook size={40} className="text-primary/40" />
                                    </div>
                                )}
                                {isLevel1Locked && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                        <div className="p-3 rounded-full bg-gray-800/90">
                                            <IconLock className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Contenido */}
                            <div className="flex-1 p-5">
                                {/* Header */}
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`badge ${level1Completed ? 'badge-success' : 'badge-primary'}`}>
                                            Nivel 1
                                        </span>
                                        {level1Completed ? (
                                            <span className="badge badge-success badge-outline gap-1">
                                                <IconCheck size={12} /> Desbloqueado
                                            </span>
                                        ) : isLevel1Locked ? (
                                            <span className="badge badge-warning gap-1">
                                                <IconLock size={12} /> Bloqueado
                                            </span>
                                        ) : null}
                                    </div>
                                    {!isLevel1Locked && (
                                        <span className="text-lg font-bold text-base-content/80">
                                            {level1Completed ? '100' : level1Progress}%
                                        </span>
                                    )}
                                </div>

                                {/* Título */}
                                <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                                    {courseLevel1?.title || 'Nivel 1'}
                                </h3>

                                {/* Descripción */}
                                {courseLevel1?.description && (
                                    <p className="text-sm text-base-content/60 line-clamp-2 mb-3">
                                        <span className="font-medium text-base-content/70">Resultados de aprendizaje:</span>{' '}
                                        {stripHtml(courseLevel1.description)}
                                    </p>
                                )}

                                {/* Barra de progreso */}
                                {!isLevel1Locked && !level1Completed && (
                                    <div className="w-full mb-4">
                                        <progress
                                            className="progress progress-primary w-full h-2"
                                            value={level1Progress}
                                            max="100"
                                        />
                                    </div>
                                )}

                                {/* Acciones */}
                                <div className="flex items-center justify-between gap-3">
                                    {isLevel1Locked ? (
                                        <button
                                            onClick={() => {
                                                if (!isEnrolled) {
                                                    alert('Inscríbete primero para acceder a los cursos');
                                                }
                                            }}
                                            className="btn btn-primary btn-sm"
                                        >
                                            Entrar al nivel
                                        </button>
                                    ) : level1Completed ? (
                                        <Link
                                            href={`/dashboard/student/courses/${courseLevel1?.id}`}
                                            className="btn btn-success btn-outline btn-sm gap-1"
                                        >
                                            <IconCheck size={16} /> Revisar
                                        </Link>
                                    ) : (
                                        <Link
                                            href={`/dashboard/student/courses/${courseLevel1?.id}`}
                                            className="btn btn-primary btn-sm gap-1"
                                        >
                                            <IconPlayerPlay size={16} />
                                            Entrar al nivel
                                        </Link>
                                    )}
                                    <span className="text-xs text-base-content/50 flex items-center gap-1">
                                        <IconAlertTriangle size={14} />
                                        Completa el Nivel 1
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ===== CONECTOR DE NIVEL 1 A NIVEL 2 ===== */}
                <div className="flex justify-center">
                    <div
                        className="w-1.5 h-20 rounded-full"
                        style={{ backgroundColor: level1Completed ? '#192170' : '#D1D5DB' }}
                    />
                </div>

                {/* ===== NIVEL 2 ===== */}
                <div className="roadmap-level relative pt-8">
                    {/* Número de nivel flotante */}
                    <div className={`
                        roadmap-level-number absolute -top-5 left-1/2 transform -translate-x-1/2 z-10
                        w-12 h-12 rounded-full flex items-center justify-center
                        font-bold text-xl shadow-lg
                        ${level2Completed
                            ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                            : isLevel2Locked
                                ? 'bg-gray-400 text-white'
                                : 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white'
                        }
                    `}>
                        {level2Completed ? <IconCheck size={24} /> : '2'}
                    </div>

                    {/* Card del Nivel 2 */}
                    <div className={`
                        roadmap-course-card bg-white rounded-2xl shadow-lg overflow-hidden
                        border-2 transition-all duration-300 hover:shadow-xl
                        ${level2Completed ? 'border-emerald-200' : isLevel2Locked ? 'border-gray-200' : 'border-indigo-200'}
                    `}>
                        <div className="flex flex-col md:flex-row">
                            {/* Imagen */}
                            <div className="relative w-full md:w-48 h-40 md:h-auto flex-shrink-0">
                                {courseLevel2?.coverImageUrl ? (
                                    <img
                                        src={courseLevel2.coverImageUrl}
                                        alt={courseLevel2.title}
                                        className={`w-full h-full object-cover ${isLevel2Locked ? 'grayscale opacity-60' : ''}`}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center">
                                        <IconBook size={40} className="text-secondary/40" />
                                    </div>
                                )}
                                {isLevel2Locked && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                        <div className="p-3 rounded-full bg-gray-800/90">
                                            <IconLock className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Contenido */}
                            <div className="flex-1 p-5">
                                {/* Header */}
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`badge ${level2Completed ? 'badge-success' : 'badge-secondary'}`}>
                                            Nivel 2
                                        </span>
                                        {level2Completed ? (
                                            <span className="badge badge-success badge-outline gap-1">
                                                <IconCheck size={12} /> Completado
                                            </span>
                                        ) : isLevel2Locked ? (
                                            <span className="badge badge-warning gap-1">
                                                <IconLock size={12} /> Bloqueado
                                            </span>
                                        ) : null}
                                    </div>
                                    {!isLevel2Locked && (
                                        <span className="text-lg font-bold text-base-content/80">
                                            {level2Completed ? '100' : level2Progress}%
                                        </span>
                                    )}
                                </div>

                                {/* Título */}
                                <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                                    {courseLevel2?.title || 'Nivel 2'}
                                </h3>

                                {/* Descripción */}
                                {courseLevel2?.description && (
                                    <p className="text-sm text-base-content/60 line-clamp-2 mb-3">
                                        {stripHtml(courseLevel2.description)}
                                    </p>
                                )}

                                {/* Barra de progreso */}
                                {!isLevel2Locked && !level2Completed && (
                                    <div className="w-full mb-4">
                                        <progress
                                            className="progress progress-secondary w-full h-2"
                                            value={level2Progress}
                                            max="100"
                                        />
                                    </div>
                                )}

                                {/* Acciones */}
                                <div className="flex items-center justify-between gap-3">
                                    {isLevel2Locked ? (
                                        <button
                                            onClick={() => {
                                                if (!isEnrolled) {
                                                    alert('Inscríbete primero para acceder a los cursos');
                                                } else if (!level1Completed) {
                                                    alert('Completa el Nivel 1 primero para desbloquear este curso');
                                                }
                                            }}
                                            className="btn btn-secondary btn-sm"
                                        >
                                            Entrar al nivel
                                        </button>
                                    ) : level2Completed ? (
                                        <Link
                                            href={`/dashboard/student/courses/${courseLevel2?.id}`}
                                            className="btn btn-success btn-outline btn-sm gap-1"
                                        >
                                            <IconCheck size={16} /> Revisar
                                        </Link>
                                    ) : (
                                        <Link
                                            href={`/dashboard/student/courses/${courseLevel2?.id}`}
                                            className="btn btn-secondary btn-sm gap-1"
                                        >
                                            <IconPlayerPlay size={16} />
                                            Entrar al nivel
                                        </Link>
                                    )}
                                    <span className="text-xs text-base-content/50 flex items-center gap-1">
                                        <IconAlertTriangle size={14} />
                                        Completa el Nivel 1
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ===== CONECTOR DE NIVEL 2 A CERTIFICADO ===== */}
                <div className="flex justify-center">
                    <div
                        className="w-1.5 h-20 rounded-full"
                        style={{ backgroundColor: level2Completed ? '#192170' : '#D1D5DB' }}
                    />
                </div>

                {/* ===== CERTIFICADO FINAL ===== */}
                <div className="roadmap-certificate flex flex-col items-center">
                    <div className={`
                        w-28 h-28 rounded-full flex flex-col items-center justify-center
                        shadow-xl transition-all duration-500
                        ${badgeUnlocked
                            ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 animate-pulse'
                            : 'bg-gradient-to-br from-gray-400 to-gray-500'
                        }
                    `}>
                        <span className="text-white text-xs font-bold uppercase tracking-wide">Official</span>
                        <span className="text-white text-[10px] font-semibold uppercase tracking-wide opacity-90">Certificate</span>
                        {badgeUnlocked && (
                            <IconAward className="w-8 h-8 text-white mt-1" />
                        )}
                    </div>
                    <p className="text-center text-sm font-medium mt-4 text-base-content/80">
                        Certificado Oficial de<br />
                        <span className="font-semibold">Micro-Credencial</span>
                    </p>
                    {badgeUnlocked && (
                        <button className="btn btn-primary btn-sm mt-3 gap-1">
                            <IconAward size={16} />
                            Descargar Certificado
                        </button>
                    )}
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
