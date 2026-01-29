/**
 * Login Page - Server Redirect
 * MicroCert by Marca UNACH
 * 
 * Redirige /auth/login a la página raíz que contiene el formulario de login.
 * 
 * NOTA: Esta es una redirección del lado del servidor para evitar
 * flashes de carga y ciclos de redirección.
 */

import { redirect } from "next/navigation";

export default function LoginPage() {
  // Redirección inmediata del lado del servidor
  redirect("/");
}
