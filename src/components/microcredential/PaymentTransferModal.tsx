/**
 * PaymentTransferModal - Modal para datos de transferencia y referencia de pago
 */

'use client';

import { useState } from 'react';
import { IconCopy, IconCheck, IconX, IconBuildingBank } from '@tabler/icons-react';

interface PaymentTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (paymentReference: string) => Promise<void>;
    price: number;
    productTitle: string;
}

// Configuración de datos bancarios (podría venir de site_config)
const BANK_INFO = {
    bankName: 'BBVA México',
    accountHolder: 'Marca UNACH S.A. de C.V.',
    clabe: '012345678901234567',
    accountNumber: '0123456789',
    concept: 'Microcredencial - ',
};

export function PaymentTransferModal({
    isOpen,
    onClose,
    onConfirm,
    price,
    productTitle,
}: PaymentTransferModalProps) {
    const [paymentReference, setPaymentReference] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleCopy = async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(field);
            setTimeout(() => setCopied(null), 2000);
        } catch (err) {
            console.error('Error copying:', err);
        }
    };

    const handleSubmit = async () => {
        if (!paymentReference.trim()) {
            setError('Por favor ingresa la referencia de pago');
            return;
        }

        setError(null);
        setLoading(true);

        try {
            await onConfirm(paymentReference.trim());
            setPaymentReference('');
            onClose();
        } catch (err: any) {
            setError(err.message || 'Error al procesar el pago');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-lg">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <IconBuildingBank size={24} className="text-primary" />
                        Pago por Transferencia
                    </h3>
                    <button
                        onClick={onClose}
                        className="btn btn-ghost btn-sm btn-circle"
                    >
                        <IconX size={20} />
                    </button>
                </div>

                {/* Producto y precio */}
                <div className="bg-base-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-base-content/70">Producto:</p>
                    <p className="font-medium">{productTitle}</p>
                    <p className="text-2xl font-bold text-primary mt-2">
                        ${price.toLocaleString()} MXN
                    </p>
                </div>

                {/* Datos bancarios */}
                <div className="space-y-3 mb-6">
                    <h4 className="font-medium">Datos para transferencia:</h4>

                    <div className="bg-base-100 border border-base-300 rounded-lg divide-y divide-base-300">
                        {/* Banco */}
                        <div className="flex items-center justify-between p-3">
                            <div>
                                <p className="text-xs text-base-content/60">Banco</p>
                                <p className="font-medium">{BANK_INFO.bankName}</p>
                            </div>
                        </div>

                        {/* Beneficiario */}
                        <div className="flex items-center justify-between p-3">
                            <div>
                                <p className="text-xs text-base-content/60">Beneficiario</p>
                                <p className="font-medium">{BANK_INFO.accountHolder}</p>
                            </div>
                        </div>

                        {/* CLABE */}
                        <div className="flex items-center justify-between p-3">
                            <div className="flex-1">
                                <p className="text-xs text-base-content/60">CLABE Interbancaria</p>
                                <p className="font-mono font-medium">{BANK_INFO.clabe}</p>
                            </div>
                            <button
                                onClick={() => handleCopy(BANK_INFO.clabe, 'clabe')}
                                className="btn btn-ghost btn-sm"
                            >
                                {copied === 'clabe' ? (
                                    <IconCheck size={16} className="text-success" />
                                ) : (
                                    <IconCopy size={16} />
                                )}
                            </button>
                        </div>

                        {/* Número de cuenta */}
                        <div className="flex items-center justify-between p-3">
                            <div className="flex-1">
                                <p className="text-xs text-base-content/60">Número de Cuenta</p>
                                <p className="font-mono font-medium">{BANK_INFO.accountNumber}</p>
                            </div>
                            <button
                                onClick={() => handleCopy(BANK_INFO.accountNumber, 'account')}
                                className="btn btn-ghost btn-sm"
                            >
                                {copied === 'account' ? (
                                    <IconCheck size={16} className="text-success" />
                                ) : (
                                    <IconCopy size={16} />
                                )}
                            </button>
                        </div>

                        {/* Concepto */}
                        <div className="flex items-center justify-between p-3">
                            <div className="flex-1">
                                <p className="text-xs text-base-content/60">Concepto</p>
                                <p className="font-medium">{BANK_INFO.concept}{productTitle}</p>
                            </div>
                            <button
                                onClick={() => handleCopy(`${BANK_INFO.concept}${productTitle}`, 'concept')}
                                className="btn btn-ghost btn-sm"
                            >
                                {copied === 'concept' ? (
                                    <IconCheck size={16} className="text-success" />
                                ) : (
                                    <IconCopy size={16} />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Input de referencia */}
                <div className="form-control mb-4">
                    <label className="label">
                        <span className="label-text font-medium">
                            Referencia o Número de Confirmación
                        </span>
                    </label>
                    <input
                        type="text"
                        placeholder="Ej: REF123456789"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        className={`input input-bordered w-full ${error ? 'input-error' : ''}`}
                    />
                    {error && (
                        <label className="label">
                            <span className="label-text-alt text-error">{error}</span>
                        </label>
                    )}
                    <label className="label">
                        <span className="label-text-alt text-base-content/60">
                            Ingresa la referencia de tu transferencia para verificar tu pago
                        </span>
                    </label>
                </div>

                {/* Nota importante */}
                <div className="alert alert-info mb-4">
                    <span className="text-sm">
                        Tu inscripción quedará pendiente hasta que verifiquemos el pago.
                        Este proceso puede tomar hasta 24 horas hábiles.
                    </span>
                </div>

                {/* Botones */}
                <div className="modal-action">
                    <button
                        onClick={onClose}
                        className="btn btn-ghost"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="btn btn-primary"
                        disabled={loading || !paymentReference.trim()}
                    >
                        {loading ? (
                            <>
                                <span className="loading loading-spinner loading-sm"></span>
                                Procesando...
                            </>
                        ) : (
                            'Confirmar Pago'
                        )}
                    </button>
                </div>
            </div>
            <div className="modal-backdrop bg-black/50" onClick={onClose}></div>
        </div>
    );
}
