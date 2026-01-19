/**
 * MicrocredentialProgress - Barra de progreso visual
 */

'use client';

import { IconCheck, IconLock, IconAward } from '@tabler/icons-react';

interface MicrocredentialProgressProps {
    level1Completed: boolean;
    level2Unlocked: boolean;
    level2Completed: boolean;
    badgeUnlocked: boolean;
    level1Title?: string;
    level2Title?: string;
    compact?: boolean;
}

export function MicrocredentialProgress({
    level1Completed,
    level2Unlocked,
    level2Completed,
    badgeUnlocked,
    level1Title = 'Nivel 1',
    level2Title = 'Nivel 2',
    compact = false,
}: MicrocredentialProgressProps) {

    const steps = [
        {
            label: level1Title,
            shortLabel: 'N1',
            completed: level1Completed,
            locked: false,
        },
        {
            label: level2Title,
            shortLabel: 'N2',
            completed: level2Completed,
            locked: !level2Unlocked,
        },
        {
            label: 'Insignia',
            shortLabel: 'Badge',
            completed: badgeUnlocked,
            locked: !level2Completed,
            isBadge: true,
        },
    ];

    if (compact) {
        // Vista compacta - solo círculos
        return (
            <div className="flex items-center gap-1">
                {steps.map((step, idx) => (
                    <div key={idx} className="flex items-center">
                        <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step.completed
                                    ? 'bg-success text-success-content'
                                    : step.locked
                                        ? 'bg-base-300 text-base-content/50'
                                        : 'bg-primary/20 text-primary'
                                }`}
                            title={step.label}
                        >
                            {step.completed ? (
                                <IconCheck size={14} />
                            ) : step.locked ? (
                                <IconLock size={12} />
                            ) : step.isBadge ? (
                                <IconAward size={14} />
                            ) : (
                                idx + 1
                            )}
                        </div>
                        {idx < steps.length - 1 && (
                            <div className={`w-4 h-0.5 ${steps[idx + 1].completed || !steps[idx + 1].locked
                                    ? 'bg-success'
                                    : 'bg-base-300'
                                }`} />
                        )}
                    </div>
                ))}
            </div>
        );
    }

    // Vista completa
    return (
        <div className="w-full">
            <ul className="steps steps-horizontal w-full">
                {steps.map((step, idx) => (
                    <li
                        key={idx}
                        className={`step ${step.completed
                                ? 'step-success'
                                : step.locked
                                    ? ''
                                    : 'step-primary'
                            }`}
                        data-content={
                            step.completed
                                ? '✓'
                                : step.locked
                                    ? '🔒'
                                    : step.isBadge
                                        ? '🏆'
                                        : (idx + 1).toString()
                        }
                    >
                        <span className={`text-xs ${step.locked ? 'text-base-content/50' : ''}`}>
                            {step.label}
                        </span>
                    </li>
                ))}
            </ul>

            {/* Mensaje de estado */}
            <div className="text-center mt-2">
                {badgeUnlocked ? (
                    <span className="text-sm text-success font-medium">
                        🎉 ¡Microcredencial completada!
                    </span>
                ) : level2Completed ? (
                    <span className="text-sm text-info">
                        Procesando tu insignia...
                    </span>
                ) : level1Completed ? (
                    <span className="text-sm text-base-content/70">
                        ¡Excelente! Ahora completa el {level2Title}
                    </span>
                ) : (
                    <span className="text-sm text-base-content/70">
                        Comienza con el {level1Title}
                    </span>
                )}
            </div>
        </div>
    );
}
