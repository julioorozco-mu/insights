"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirige /auth/login a la página raíz que ahora contiene el formulario de login
 * con el nuevo diseño que incluye el carousel de cursos.
 */
export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir inmediatamente a la página raíz
    router.replace("/");
  }, [router]);

  // Mostrar un loader mientras redirige
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="loading loading-spinner loading-lg text-primary"></div>
    </div>
  );
}
