"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/lib/validators/userSchema";
import { APP_NAME } from "@/utils/constants";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      setLoading(true);
      setError(null);
      await signIn(data.email, data.password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-full max-w-md bg-base-100 shadow-2xl">
        <div className="card-body">
          <div className="text-center mb-6">
            <div className="mb-4">
              <h1 className="text-3xl font-bold text-primary">{APP_NAME}</h1>
              <p className="text-sm text-base-content/60">Plataforma de Microcredenciales</p>
            </div>
            <p className="text-base-content/70">Inicia sesión en tu cuenta</p>
          </div>
          {error && (
            <div className="alert alert-error mb-4">
              <span>{error}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-control mb-4">
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

            <div className="form-control mb-6">
              <label className="label">
                <span className="label-text">Contraseña</span>
              </label>
              <input
                type="password"
                {...register("password")}
                className="input input-bordered"
                placeholder="••••••••"
              />
              {errors.password && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.password.message}</span>
                </label>
              )}
              <label className="label">
                <Link href="/auth/recover-password" className="label-text-alt link link-hover">
                  ¿Olvidaste tu contraseña?
                </Link>
              </label>
            </div>

            <button type="submit" className="btn btn-primary w-full text-white" disabled={loading}>
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </button>
          </form>

          <div className="divider">O</div>

          <p className="text-center">
            ¿No tienes cuenta?{" "}
            <Link href="/auth/sign-up" className="link link-primary">
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
