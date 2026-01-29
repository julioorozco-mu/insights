/**
 * Dashboard Shell - Client Component
 * MicroCert by Marca UNACH
 * 
 * Componente cliente que envuelve el contenido del dashboard.
 * Recibe los datos del usuario desde el Server Component padre.
 * 
 * Este patrón permite:
 * - Verificar autenticación en el servidor (sin flashes)
 * - Mantener interactividad en el cliente (sidebar, topbar)
 */

"use client";

import { useState, useEffect } from "react";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { DashboardTopbar } from "@/components/layout/DashboardTopbar";
import { User } from "@/types/user";
import { logoutAction } from "@/app/auth/actions";
import { useAuth } from "@/hooks/useAuth";

interface DashboardShellProps {
    user: User;
    children: React.ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
    const { signOut } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Auto-colapsar sidebar después de 10 segundos
    useEffect(() => {
        const timer = setTimeout(() => {
            setSidebarCollapsed(true);
        }, 10000);
        return () => clearTimeout(timer);
    }, []);

    // Handler de logout que sincroniza servidor y cliente
    const handleSignOut = async () => {
        if (isLoggingOut) return;

        setIsLoggingOut(true);

        try {
            // 1. Llamar al Server Action para limpiar cookies en el servidor
            const result = await logoutAction();

            // 2. Limpiar estado del cliente usando el AuthContext
            // Esto evita que el cliente piense que aún hay sesión
            await signOut();

            // 3. El signOut del AuthContext ya maneja la redirección
            // pero por si acaso, forzamos una navegación limpia
            if (result.success) {
                // Usar window.location para forzar recarga completa
                // Esto asegura que todo el estado se limpie
                window.location.href = '/';
            }
        } catch (error) {
            console.error("[DashboardShell] Error en logout:", error);
            // En caso de error, intentar redirección de todas formas
            window.location.href = '/';
        }
    };

    // Si estamos cerrando sesión, mostrar loader
    if (isLoggingOut) {
        return (
            <div className="flex h-screen items-center justify-center bg-brand-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="loading loading-spinner loading-lg text-primary"></div>
                    <p className="text-sm text-base-content/60">Cerrando sesión...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-brand-background overflow-hidden">
            {/* Sidebar - Fixed */}
            <DashboardSidebar
                isOpen={sidebarOpen}
                isCollapsed={sidebarCollapsed}
                onClose={() => setSidebarOpen(false)}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                user={user}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Top Bar - Fixed at top */}
                <DashboardTopbar
                    onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                    sidebarCollapsed={sidebarCollapsed}
                    user={user}
                    onSignOut={handleSignOut}
                />

                {/* Main Content - Only this scrolls */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 sm:px-6 lg:px-10">
                    {children}
                </main>
            </div>
        </div>
    );
}
