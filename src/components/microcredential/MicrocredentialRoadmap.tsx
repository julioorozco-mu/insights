/**
 * MicrocredentialRoadmap - Roadmap visual de trazabilidad hacia la insignia
 */

'use client';

import Link from 'next/link';
import { IconLock, IconPlayerPlay, IconCheck, IconAlertTriangle, IconAward } from '@tabler/icons-react';

interface CourseLevel {
    id: string;
    title: string;
    description?: string | null;
    coverImageUrl?: string | null;
    learningOutcome?: string;
}

interface MicrocredentialRoadmapProps {
    level1: CourseLevel;
    level2: CourseLevel;
    level1Progress: number;
    level2Progress: number;
    level1Completed: boolean;
    level2Completed: boolean;
    level2Unlocked: boolean;
    isEnrolled: boolean;
    isPendingPayment: boolean;
    badgeUnlocked: boolean;
    onLockedClick?: () => void;
}

export function MicrocredentialRoadmap({
    level1,
    level2,
    level1Progress,
    level2Progress,
    level1Completed,
    level2Completed,
    level2Unlocked,
    isEnrolled,
    isPendingPayment,
    badgeUnlocked,
    onLockedClick,
}: MicrocredentialRoadmapProps) {
    const isLevel1Locked = !isEnrolled || isPendingPayment;
    const isLevel2Locked = !isEnrolled || isPendingPayment || !level2Unlocked;

    return (
        <div className="roadmap-container relative">
            {/* ===== NIVEL 1 ===== */}
            <div className="roadmap-level roadmap-level-1">
                {/* Conector superior hacia el badge */}
                <div className="roadmap-connector roadmap-connector-top">
                    <svg
                        className="roadmap-path-svg"
                        viewBox="0 0 100 120"
                        preserveAspectRatio="none"
                        fill="none"
                    >
                        <path
                            d="M 50 0 L 50 40 Q 50 60 70 70 L 100 70"
                            stroke={level1Completed ? '#C9A227' : '#E5E7EB'}
                            strokeWidth="6"
                            strokeLinecap="round"
                            fill="none"
                        />
                    </svg>
                </div>

                {/* Número de nivel flotante */}
                <div className={`roadmap-level-number ${level1Completed ? 'completed' : isLevel1Locked ? 'locked' : 'active'}`}>
                    {level1Completed ? <IconCheck size={20} /> : '1'}
                </div>

                {/* Card del curso */}
                <div className={`roadmap-course-card ${isLevel1Locked ? 'locked' : ''}`}>
                    {/* Imagen de portada */}
                    <div className="roadmap-course-image">
                        {level1.coverImageUrl ? (
                            <img
                                src={level1.coverImageUrl}
                                alt={level1.title}
                                className={`w-full h-full object-cover ${isLevel1Locked ? 'grayscale opacity-60' : ''}`}
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                <IconAward size={32} className="text-primary/40" />
                            </div>
                        )}
                        {isLevel1Locked && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <div className="p-2 rounded-full bg-gray-800/80">
                                    <IconLock className="w-5 h-5 text-white" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Contenido */}
                    <div className="roadmap-course-content">
                        {/* Header con badges */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                                <span className={`badge badge-sm ${level1Completed ? 'badge-success' : 'badge-primary'}`}>
                                    Nivel 1
                                </span>
                                {level1Completed ? (
                                    <span className="badge badge-sm badge-success badge-outline gap-1">
                                        <IconCheck size={10} /> Desbloqueado
                                    </span>
                                ) : isLevel1Locked ? (
                                    <span className="badge badge-sm badge-warning gap-1">
                                        <IconLock size={10} /> Bloqueado
                                    </span>
                                ) : null}
                            </div>
                            {/* Porcentaje de progreso */}
                            {!isLevel1Locked && (
                                <span className="text-sm font-bold text-base-content/70">
                                    {level1Progress}%
                                </span>
                            )}
                        </div>

                        {/* Título */}
                        <h3 className="font-semibold text-base line-clamp-2 mb-1">
                            {level1.title}
                        </h3>

                        {/* Resultados de aprendizaje */}
                        {level1.learningOutcome && (
                            <p className="text-xs text-base-content/60 line-clamp-2 mb-3">
                                <span className="font-medium">Resultados de aprendizaje:</span> {level1.learningOutcome}
                            </p>
                        )}

                        {/* Barra de progreso */}
                        {!isLevel1Locked && !level1Completed && level1Progress > 0 && (
                            <div className="w-full mb-3">
                                <progress
                                    className="progress progress-primary w-full h-2"
                                    value={level1Progress}
                                    max="100"
                                />
                            </div>
                        )}

                        {/* Botón de acción */}
                        <div className="flex items-center justify-between">
                            {isLevel1Locked ? (
                                <button
                                    onClick={onLockedClick}
                                    className="btn btn-sm btn-primary"
                                >
                                    Entrar al nivel
                                </button>
                            ) : level1Completed ? (
                                <Link
                                    href={`/dashboard/student/courses/${level1.id}`}
                                    className="btn btn-sm btn-outline btn-success gap-1"
                                >
                                    <IconCheck size={14} />
                                    Revisar
                                </Link>
                            ) : (
                                <Link
                                    href={`/dashboard/student/courses/${level1.id}`}
                                    className="btn btn-sm btn-primary gap-1"
                                >
                                    <IconPlayerPlay size={14} />
                                    Entrar al nivel
                                </Link>
                            )}

                            {/* Indicador de requisito */}
                            <span className="text-xs text-base-content/50 flex items-center gap-1">
                                <IconAlertTriangle size={12} />
                                Completa el Nivel 1
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== CONECTOR CENTRAL ===== */}
            <div className="roadmap-connector-central">
                <svg
                    className="w-full h-full"
                    viewBox="0 0 120 200"
                    preserveAspectRatio="none"
                    fill="none"
                >
                    <path
                        d="M 60 0 Q 60 50 20 80 L 20 120 Q 20 150 60 180 L 60 200"
                        stroke={level1Completed ? '#192170' : '#E5E7EB'}
                        strokeWidth="8"
                        strokeLinecap="round"
                        fill="none"
                    />
                </svg>
            </div>

            {/* ===== NIVEL 2 ===== */}
            <div className="roadmap-level roadmap-level-2">
                {/* Número de nivel flotante */}
                <div className={`roadmap-level-number ${level2Completed ? 'completed' : isLevel2Locked ? 'locked' : 'active'}`}>
                    {level2Completed ? <IconCheck size={20} /> : '2'}
                </div>

                {/* Card del curso */}
                <div className={`roadmap-course-card ${isLevel2Locked ? 'locked' : ''}`}>
                    {/* Imagen de portada */}
                    <div className="roadmap-course-image">
                        {level2.coverImageUrl ? (
                            <img
                                src={level2.coverImageUrl}
                                alt={level2.title}
                                className={`w-full h-full object-cover ${isLevel2Locked ? 'grayscale opacity-60' : ''}`}
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                <IconAward size={32} className="text-primary/40" />
                            </div>
                        )}
                        {isLevel2Locked && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <div className="p-2 rounded-full bg-gray-800/80">
                                    <IconLock className="w-5 h-5 text-white" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Contenido */}
                    <div className="roadmap-course-content">
                        {/* Header con badges */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                                <span className={`badge badge-sm ${level2Completed ? 'badge-success' : 'badge-secondary'}`}>
                                    Nivel 2
                                </span>
                                {level2Completed ? (
                                    <span className="badge badge-sm badge-success badge-outline gap-1">
                                        <IconCheck size={10} /> Completado
                                    </span>
                                ) : isLevel2Locked ? (
                                    <span className="badge badge-sm badge-warning gap-1">
                                        <IconLock size={10} /> Bloqueado
                                    </span>
                                ) : null}
                            </div>
                            {/* Porcentaje de progreso */}
                            {!isLevel2Locked && (
                                <span className="text-sm font-bold text-base-content/70">
                                    {level2Progress}%
                                </span>
                            )}
                        </div>

                        {/* Título */}
                        <h3 className="font-semibold text-base line-clamp-2 mb-1">
                            {level2.title}
                        </h3>

                        {/* Resultados de aprendizaje */}
                        {level2.learningOutcome && (
                            <p className="text-xs text-base-content/60 line-clamp-2 mb-3">
                                <span className="font-medium">Resultados de aprendizaje:</span> {level2.learningOutcome}
                            </p>
                        )}

                        {/* Barra de progreso */}
                        {!isLevel2Locked && !level2Completed && level2Progress > 0 && (
                            <div className="w-full mb-3">
                                <progress
                                    className="progress progress-secondary w-full h-2"
                                    value={level2Progress}
                                    max="100"
                                />
                            </div>
                        )}

                        {/* Botón de acción */}
                        <div className="flex items-center justify-between">
                            {isLevel2Locked ? (
                                <button
                                    onClick={onLockedClick}
                                    className="btn btn-sm btn-secondary"
                                >
                                    Entrar al nivel
                                </button>
                            ) : level2Completed ? (
                                <Link
                                    href={`/dashboard/student/courses/${level2.id}`}
                                    className="btn btn-sm btn-outline btn-success gap-1"
                                >
                                    <IconCheck size={14} />
                                    Revisar
                                </Link>
                            ) : (
                                <Link
                                    href={`/dashboard/student/courses/${level2.id}`}
                                    className="btn btn-sm btn-secondary gap-1"
                                >
                                    <IconPlayerPlay size={14} />
                                    Entrar al nivel
                                </Link>
                            )}

                            {/* Indicador de requisito */}
                            <span className="text-xs text-base-content/50 flex items-center gap-1">
                                <IconAlertTriangle size={12} />
                                Completa el Nivel 1
                            </span>
                        </div>
                    </div>
                </div>

                {/* Conector inferior hacia certificado */}
                <div className="roadmap-connector roadmap-connector-bottom">
                    <svg
                        className="roadmap-path-svg"
                        viewBox="0 0 100 120"
                        preserveAspectRatio="none"
                        fill="none"
                    >
                        <path
                            d="M 0 50 L 30 50 Q 50 50 50 70 L 50 120"
                            stroke={level2Completed ? '#192170' : '#E5E7EB'}
                            strokeWidth="6"
                            strokeLinecap="round"
                            fill="none"
                        />
                    </svg>
                </div>
            </div>

            {/* ===== CERTIFICADO FINAL ===== */}
            <div className="roadmap-certificate">
                <div className={`roadmap-certificate-badge ${badgeUnlocked ? 'unlocked' : 'locked'}`}>
                    <div className="certificate-ribbon">
                        <span className="certificate-text">Official</span>
                        <span className="certificate-text-small">Certificate</span>
                    </div>
                </div>
                <p className="text-center text-sm font-medium mt-3 text-base-content/80">
                    Certificado Oficial de<br />Micro-Credencial
                </p>
            </div>

            {/* Estilos del roadmap */}
            <style jsx>{`
                .roadmap-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 2rem 0;
                    gap: 0;
                    position: relative;
                }

                .roadmap-level {
                    position: relative;
                    width: 100%;
                    max-width: 480px;
                    margin-bottom: 0;
                }

                .roadmap-level-1 {
                    margin-left: 0;
                }

                .roadmap-level-2 {
                    margin-left: 0;
                }

                .roadmap-level-number {
                    position: absolute;
                    top: -16px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 1.125rem;
                    z-index: 10;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }

                .roadmap-level-number.active {
                    background: linear-gradient(135deg, #C9A227, #B8860B);
                    color: white;
                }

                .roadmap-level-number.completed {
                    background: linear-gradient(135deg, #10B981, #059669);
                    color: white;
                }

                .roadmap-level-number.locked {
                    background: #9CA3AF;
                    color: white;
                }

                .roadmap-course-card {
                    display: flex;
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
                    overflow: hidden;
                    border: 2px solid transparent;
                    transition: all 0.3s ease;
                }

                .roadmap-course-card:hover {
                    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
                    transform: translateY(-2px);
                }

                .roadmap-course-card.locked {
                    border-color: #E5E7EB;
                }

                .roadmap-course-image {
                    position: relative;
                    width: 140px;
                    min-height: 160px;
                    flex-shrink: 0;
                    overflow: hidden;
                }

                .roadmap-course-content {
                    flex: 1;
                    padding: 1rem;
                    display: flex;
                    flex-direction: column;
                }

                .roadmap-connector-central {
                    width: 120px;
                    height: 80px;
                    margin: -20px 0;
                    position: relative;
                    z-index: 1;
                }

                .roadmap-connector-top,
                .roadmap-connector-bottom {
                    position: absolute;
                    width: 100px;
                    height: 80px;
                    z-index: 0;
                }

                .roadmap-connector-top {
                    top: -60px;
                    right: -30px;
                }

                .roadmap-connector-bottom {
                    bottom: -60px;
                    left: -30px;
                }

                .roadmap-path-svg {
                    width: 100%;
                    height: 100%;
                }

                .roadmap-certificate {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-top: 1rem;
                }

                .roadmap-certificate-badge {
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
                }

                .roadmap-certificate-badge.unlocked {
                    background: linear-gradient(135deg, #C9A227, #8B6914);
                }

                .roadmap-certificate-badge.locked {
                    background: linear-gradient(135deg, #9CA3AF, #6B7280);
                }

                .certificate-ribbon {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                }

                .certificate-text {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: white;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .certificate-text-small {
                    font-size: 0.625rem;
                    font-weight: 600;
                    color: rgba(255, 255, 255, 0.85);
                    text-transform: uppercase;
                    letter-spacing: 0.03em;
                }

                @media (max-width: 640px) {
                    .roadmap-course-card {
                        flex-direction: column;
                    }

                    .roadmap-course-image {
                        width: 100%;
                        min-height: 120px;
                    }

                    .roadmap-connector-central {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
}
