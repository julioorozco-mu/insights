"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/lib/validators/userSchema";
import { APP_NAME } from "@/utils/constants";

/**
 * Obtiene la ruta de redirección según el rol del usuario.
 * Permite extensión fácil para nuevos roles.
 */
function getRedirectByRole(role: string | undefined): string {
  switch (role) {
    case "admin":
    case "superadmin":
      return "/dashboard"; // Admin dashboard con acceso completo
    case "speaker":
      return "/dashboard/my-courses"; // Profesores a sus cursos
    case "support":
      return "/dashboard/support"; // Soporte a tickets
    case "student":
    default:
      return "/dashboard"; // Estudiantes al dashboard principal
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur", // Validar al salir del campo para mejor UX
  });

  const onSubmit = useCallback(async (data: LoginInput) => {
    // Prevenir doble submit
    if (loading) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // signIn ahora retorna el usuario con su rol
      const authenticatedUser = await signIn(data.email, data.password);
      
      // Redirección condicional basada en el rol
      const redirectPath = getRedirectByRole(authenticatedUser.role);
      router.push(redirectPath);
      
    } catch (err) {
      // El error ya viene formateado del hook
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }, [loading, signIn, router]);

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
            <fieldset disabled={loading || isSubmitting} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Correo electrónico</span>
                </label>
                <input
                  type="email"
                  {...register("email")}
                  className={`input input-bordered ${errors.email ? 'input-error' : ''}`}
                  placeholder="tu@email.com"
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
                  <span className="label-text">Contraseña</span>
                </label>
                <input
                  type="password"
                  {...register("password")}
                  className={`input input-bordered ${errors.password ? 'input-error' : ''}`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                {errors.password && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.password.message}</span>
                  </label>
                )}
                <label className="label">
                  <Link href="/auth/recover-password" className="label-text-alt link link-hover" tabIndex={-1}>
                    ¿Olvidaste tu contraseña?
                  </Link>
                </label>
              </div>
            </fieldset>

            <button 
              type="submit" 
              className="btn btn-primary w-full text-white mt-6" 
              disabled={loading || isSubmitting}
            >
              {loading || isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Iniciando sesión...
                </>
              ) : (
                "Iniciar Sesión"
              )}
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
