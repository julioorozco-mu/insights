/**
 * MicrocredentialEnrollButton - Botón inteligente de inscripción
 */

'use client';

import { useState } from 'react';
import { MicrocredentialWithCourses } from '@/types/microcredential';
import { IconShoppingCart, IconCheck, IconClock, IconLoader2 } from '@tabler/icons-react';

interface MicrocredentialEnrollButtonProps {
    microcredential: MicrocredentialWithCourses;
    isEnrolled?: boolean;
    isPendingPayment?: boolean;
    onEnroll: (paymentReference?: string) => Promise<void>;
    onShowPaymentModal?: () => void;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function MicrocredentialEnrollButton({
    microcredential,
    isEnrolled = false,
    isPendingPayment = false,
    onEnroll,
    onShowPaymentModal,
    className = '',
    size = 'md',
}: MicrocredentialEnrollButtonProps) {
    const [loading, setLoading] = useState(false);

    const { isFree, price, salePercentage } = microcredential;

    // Calcular precio final
    const finalPrice = salePercentage > 0
        ? price * (1 - salePercentage / 100)
        : price;

    const sizeClasses = {
        sm: 'btn-sm',
        md: '',
        lg: 'btn-lg',
    };

    const handleClick = async () => {
        if (isEnrolled || isPendingPayment) return;

        if (!isFree && onShowPaymentModal) {
            // Mostrar modal de pago para microcredenciales de pago
            onShowPaymentModal();
            return;
        }

        // Inscripción gratuita
        setLoading(true);
        try {
            await onEnroll();
        } finally {
            setLoading(false);
        }
    };

    // Estado: Ya inscrito
    if (isEnrolled) {
        return (
            <button
                className={`btn btn-success ${sizeClasses[size]} ${className}`}
                disabled
            >
                <IconCheck size={18} />
                Ya Inscrito
            </button>
        );
    }

    // Estado: Pago pendiente de verificación
    if (isPendingPayment) {
        return (
            <button
                className={`btn btn-warning ${sizeClasses[size]} ${className}`}
                disabled
            >
                <IconClock size={18} />
                Pago Pendiente
            </button>
        );
    }

    // Estado: Cargando
    if (loading) {
        return (
            <button
                className={`btn btn-primary ${sizeClasses[size]} ${className}`}
                disabled
            >
                <IconLoader2 size={18} className="animate-spin" />
                Procesando...
            </button>
        );
    }

    // Estado: Disponible para inscripción
    return (
        <button
            onClick={handleClick}
            className={`btn btn-primary ${sizeClasses[size]} ${className}`}
        >
            {isFree ? (
                <>
                    <IconCheck size={18} />
                    Obtener Gratis
                </>
            ) : (
                <>
                    <IconShoppingCart size={18} />
                    Comprar ${finalPrice.toLocaleString()}
                    {salePercentage > 0 && (
                        <span className="badge badge-sm badge-error ml-1">
                            -{salePercentage}%
                        </span>
                    )}
                </>
            )}
        </button>
    );
}
