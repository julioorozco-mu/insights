"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, ResetPasswordInput } from "@/lib/validators/userSchema";
import { APP_NAME } from "@/utils/constants";

export default function RecoverPasswordPage() {
  const { resetPassword } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    try {
      setLoading(true);
      setError(null);
      await resetPassword(data.email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar el correo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl font-bold text-center mb-2">{APP_NAME}</h2>
          <p className="text-center text-base-content/70 mb-6">Recupera tu contraseña</p>

          {error && (
            <div className="alert alert-error mb-4">
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="text-center">
              <div className="alert alert-success mb-4">
                <span>
                  Se ha enviado un correo con instrucciones para restablecer tu contraseña.
                </span>
              </div>
              <Link href="/auth/login" className="btn btn-primary w-full text-white">
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="form-control mb-6">
                <label className="label">
                  <span className="label-text">Correo electrónico</span>
                </label>
                <input
                  type="email"
                  {...register("email")}
                  className="input input-bordered"
                  placeholder="tu@email.com"
                />
                {errors.email && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.email.message}</span>
                  </label>
                )}
              </div>

              <button type="submit" className="btn btn-primary w-full mb-4 text-white" disabled={loading}>
                {loading ? "Enviando..." : "Enviar correo de recuperación"}
              </button>

              <Link href="/auth/login" className="btn btn-ghost w-full">
                Volver al inicio de sesión
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
