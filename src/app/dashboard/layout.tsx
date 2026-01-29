/**
 * Dashboard Layout - Server Component
 * MicroCert by Marca UNACH
 * 
 * Layout principal del dashboard que verifica la autenticación
 * en el SERVIDOR antes de renderizar.
 * 
 * Skill: nextjs-supabase-auth
 * - Verifica autenticación en el servidor (sin flashes de carga)
 * - Usa getUser() para máxima seguridad
 * - Delega interactividad al DashboardShell (Client Component)
 * 
 * IMPORTANTE: Este es un Server Component (sin "use client")
 */

import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { User, UserRole } from "@/types/user";
import { TABLES } from "@/utils/constants";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  // Verificar autenticación en el SERVIDOR
  // Esto ocurre ANTES de que cualquier HTML llegue al navegador
  const authUser = await getAuthUser();

  if (!authUser) {
    // No hay usuario autenticado -> redirigir a la página principal
    redirect("/");
  }

  // Obtener datos del usuario de la tabla users para el nombre correcto
  const supabaseAdmin = getSupabaseAdmin();
  const { data: dbUser } = await supabaseAdmin
    .from(TABLES.USERS)
    .select("id, email, name, last_name, role, avatar_url")
    .eq("id", authUser.id)
    .single();

  // Construir usuario combinando datos de la tabla users con fallback al metadata
  const metadata = authUser.user_metadata || {};
  const appMetadata = authUser.app_metadata || {};

  const user: User = {
    id: authUser.id,
    email: authUser.email || "",
    name: dbUser?.name || (metadata.name as string) || (metadata.full_name as string) || "Usuario",
    lastName: dbUser?.last_name || (metadata.last_name as string) || undefined,
    role: dbUser?.role || (appMetadata.role as UserRole) || (metadata.role as UserRole) || "student",
    avatarUrl: dbUser?.avatar_url || (metadata.avatar_url as string) || undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Renderizar el shell del dashboard con los datos del usuario
  // El DashboardShell es un Client Component que maneja la interactividad
  return (
    <DashboardShell user={user}>
      {children}
    </DashboardShell>
  );
}
