"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Roles permitidos para acceder a esta ruta. Si no se especifica, cualquier usuario autenticado puede acceder */
  allowedRoles?: string[];
  /** Ruta de redirección si no está autenticado */
  redirectTo?: string;
}

/**
 * Componente de protección de rutas del lado cliente.
 * Previene el "flash" de contenido antes de la redirección.
 * 
 * Funciona como segunda capa de seguridad junto con el middleware.
 */
export function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = "/auth/login",
}: ProtectedRouteProps) {
  const { isAuthenticated, user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // No hacer nada mientras carga
    if (loading) return;

    // Si no está autenticado, redirigir al login
    if (!isAuthenticated) {
      const currentPath = window.location.pathname;
      const loginUrl = `${redirectTo}?redirectTo=${encodeURIComponent(currentPath)}`;
      router.replace(loginUrl);
      return;
    }

    // Si hay roles específicos requeridos, verificar
    if (allowedRoles && allowedRoles.length > 0 && user) {
      const userRole = user.role || "student";
      if (!allowedRoles.includes(userRole)) {
        // Usuario no tiene permisos, redirigir al dashboard
        router.replace("/dashboard");
      }
    }
  }, [isAuthenticated, user, loading, allowedRoles, redirectTo, router]);

  // Mientras carga, no mostrar nada (pantalla en blanco)
  if (loading) {
    return null;
  }

  // Si no está autenticado, no mostrar nada (se está redirigiendo)
  if (!isAuthenticated) {
    return null;
  }

  // Si hay roles requeridos y el usuario no tiene permiso, no mostrar nada
  if (allowedRoles && allowedRoles.length > 0 && user) {
    const userRole = user.role || "student";
    if (!allowedRoles.includes(userRole)) {
      return null;
    }
  }

  // Usuario autenticado y con permisos, mostrar contenido
  return <>{children}</>;
}

export default ProtectedRoute;
