"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

/**
 * Página 404 - Not Found
 * 
 * Redirige según el estado de autenticación:
 * - Usuario autenticado → /dashboard
 * - Usuario NO autenticado → /auth/login
 */
export default function NotFound() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Esperar a que termine de cargar el estado de autenticación
    if (loading) return;
    
    // Redirigir según el estado de autenticación
    if (user) {
      router.replace("/dashboard");
    } else {
      router.replace("/auth/login");
    }
  }, [router, user, loading]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="text-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="mt-4 text-base-content/70">Redirigiendo...</p>
      </div>
    </div>
  );
}
