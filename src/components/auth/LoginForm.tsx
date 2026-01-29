/**
 * Login Form Component (Server Actions Version)
 * MicroCert by Marca UNACH
 * 
 * Formulario de login que usa Server Actions para autenticación.
 * Compatible con el skill nextjs-supabase-auth.
 * 
 * Características:
 * - Validación con react-hook-form + Zod
 * - Manejo de estados de carga con useTransition
 * - Rate limiting integrado
 * - Redirección inteligente por rol
 */

"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/lib/validators/userSchema";
import { loginAction, type LoginActionResult } from "@/app/auth/actions";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import {
    checkRateLimit,
    recordFailedAttempt,
    recordSuccessfulAttempt
} from "@/lib/auth/rateLimiter";

interface LoginFormProps {
    /** Callback opcional cuando el login es exitoso */
    onSuccess?: (result: LoginActionResult) => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [rateLimitStatus, setRateLimitStatus] = useState({
        allowed: true,
        remainingAttempts: 5,
        waitTimeFormatted: '',
    });

    // Verificar rate limit al montar
    useEffect(() => {
        const status = checkRateLimit();
        setRateLimitStatus({
            allowed: status.allowed,
            remainingAttempts: status.remainingAttempts,
            waitTimeFormatted: status.waitTimeFormatted,
        });
    }, []);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
        mode: "onBlur",
    });

    const onSubmit = async (data: LoginInput) => {
        if (isPending || isRedirecting) return;

        // Verificar rate limit antes de intentar
        const rateLimitCheck = checkRateLimit();
        if (!rateLimitCheck.allowed) {
            setError(`Cuenta bloqueada temporalmente. Intenta de nuevo en ${rateLimitCheck.waitTimeFormatted}.`);
            setRateLimitStatus({
                allowed: rateLimitCheck.allowed,
                remainingAttempts: rateLimitCheck.remainingAttempts,
                waitTimeFormatted: rateLimitCheck.waitTimeFormatted,
            });
            return;
        }

        setError(null);

        // Crear FormData para el Server Action
        const formData = new FormData();
        formData.append('email', data.email);
        formData.append('password', data.password);

        startTransition(async () => {
            try {
                const result = await loginAction(formData);

                if (!result.success) {
                    // Registrar intento fallido
                    const newStatus = recordFailedAttempt();
                    setRateLimitStatus({
                        allowed: newStatus.allowed,
                        remainingAttempts: newStatus.remainingAttempts,
                        waitTimeFormatted: newStatus.waitTimeFormatted,
                    });

                    // Mostrar error con intentos restantes
                    let errorMessage = result.error || 'Error al iniciar sesión';
                    if (newStatus.remainingAttempts <= 2 && newStatus.remainingAttempts > 0) {
                        errorMessage = `${errorMessage} (${newStatus.remainingAttempts} intento${newStatus.remainingAttempts === 1 ? '' : 's'} restante${newStatus.remainingAttempts === 1 ? '' : 's'})`;
                    } else if (!newStatus.allowed) {
                        errorMessage = `Cuenta bloqueada temporalmente. Intenta de nuevo en ${newStatus.waitTimeFormatted}.`;
                    }

                    setError(errorMessage);
                    return;
                }

                // Login exitoso
                recordSuccessfulAttempt();
                setIsRedirecting(true);

                // Callback opcional
                if (onSuccess) {
                    onSuccess(result);
                }

                // Determinar URL de redirección
                const redirectTo = searchParams.get('redirectTo') || result.redirectTo || '/dashboard';

                // Usar router.push para navegación suave
                router.push(redirectTo);
                router.refresh(); // Forzar revalidación de Server Components

            } catch (err) {
                console.error('[LoginForm] Error inesperado:', err);
                setError('Error inesperado. Por favor intenta de nuevo.');
            }
        });
    };

    const isBlocked = !rateLimitStatus.allowed;
    const isLoading = isPending || isRedirecting;

    return (
        <>
            {/* Alerta de rate limiting */}
            {isBlocked && (
                <div className="alert alert-warning mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Cuenta bloqueada temporalmente. Intenta de nuevo en {rateLimitStatus.waitTimeFormatted}.</span>
                </div>
            )}

            {/* Alerta de error general */}
            {error && !isBlocked && (
                <div className="alert alert-error mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                </div>
            )}

            {/* Indicador de intentos restantes */}
            {!isBlocked && rateLimitStatus.remainingAttempts <= 2 && rateLimitStatus.remainingAttempts > 0 && (
                <div className="alert alert-info mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>Te quedan {rateLimitStatus.remainingAttempts} intento{rateLimitStatus.remainingAttempts === 1 ? '' : 's'}.</span>
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
                <fieldset disabled={isLoading || isBlocked} className="space-y-4">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-semibold">Correo electrónico</span>
                        </label>
                        <input
                            type="email"
                            {...register("email")}
                            className={`input input-bordered w-full ${errors.email ? 'input-error' : ''}`}
                            placeholder="tu@ejemplo.com"
                            autoComplete="email"
                            autoFocus
                        />
                        {errors.email && (
                            <label className="label">
                                <span className="label-text-alt text-error">{errors.email.message}</span>
                            </label>
                        )}
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-semibold">Contraseña</span>
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                {...register("password")}
                                className={`input input-bordered w-full pr-12 ${errors.password ? 'input-error' : ''}`}
                                placeholder="Ingresa tu contraseña"
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/60 hover:text-base-content"
                                tabIndex={-1}
                            >
                                {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                            </button>
                        </div>
                        {errors.password && (
                            <label className="label">
                                <span className="label-text-alt text-error">{errors.password.message}</span>
                            </label>
                        )}
                        <label className="label">
                            <span className="label-text-alt"></span>
                            <Link href="/auth/recover-password" className="label-text-alt link link-hover" tabIndex={-1}>
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </label>
                    </div>

                    <div className="form-control">
                        <label className="label cursor-pointer justify-start gap-3">
                            <input type="checkbox" className="checkbox checkbox-primary" />
                            <span className="label-text">Recordarme</span>
                        </label>
                    </div>
                </fieldset>

                <button
                    type="submit"
                    className="btn btn-primary w-full text-white mt-6"
                    disabled={isLoading || isBlocked}
                >
                    {isLoading ? (
                        <>
                            <span className="loading loading-spinner loading-sm"></span>
                            {isRedirecting ? 'Redirigiendo...' : 'Iniciando sesión...'}
                        </>
                    ) : (
                        "Iniciar sesión"
                    )}
                </button>
            </form>

            <div className="divider my-6">O</div>

            <div className="text-center space-y-4">
                <p className="text-base-content/70">
                    ¿No tienes una cuenta?{" "}
                    <Link href="/auth/sign-up" className="link link-primary font-semibold">
                        Regístrate
                    </Link>
                </p>
            </div>
        </>
    );
}
