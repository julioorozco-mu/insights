"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { DashboardTopbar } from "@/components/layout/DashboardTopbar";

// Skeleton del Sidebar - DEBE coincidir exactamente con las dimensiones del sidebar real
function SidebarSkeleton() {
  return (
    <aside className="hidden lg:flex w-[260px] flex-col bg-[#192170] min-h-screen flex-shrink-0">
      {/* Logo skeleton */}
      <div className="py-8 px-6">
        <div className="h-7 w-28 bg-white/10 rounded-lg animate-pulse mx-auto" />
        <div className="h-4 w-24 bg-white/5 rounded mt-2 animate-pulse mx-auto" />
      </div>
      {/* Menu items skeleton */}
      <div className="flex-1 px-6 space-y-2">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-10 bg-white/5 rounded-full animate-pulse" />
        ))}
        <div className="my-4 border-t border-white/10" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 bg-white/5 rounded-full animate-pulse" />
        ))}
      </div>
    </aside>
  );
}

// Skeleton del Topbar
function TopbarSkeleton() {
  return (
    <header className="sticky top-0 z-20 bg-white shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-slate-100 rounded-full animate-pulse" />
          <div className="h-10 w-10 bg-slate-100 rounded-full animate-pulse" />
        </div>
      </div>
    </header>
  );
}

// Skeleton del contenido principal
function ContentSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10">
      <div className="space-y-6">
        <div className="h-8 w-64 bg-slate-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-white rounded-2xl shadow-sm animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut, session } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Usar ref para evitar múltiples redirecciones
  const hasRedirected = useRef(false);
  // Estado para saber si ya verificamos la autenticación
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Solo actuar cuando ya no esté cargando
    if (loading) return;
    
    // Marcar que ya verificamos la autenticación
    setAuthChecked(true);
    
    // Si no hay usuario ni sesión, redirigir
    if (!user && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      const currentPath = window.location.pathname;
      router.replace(`/auth/login?redirectTo=${encodeURIComponent(currentPath)}`);
    }
  }, [user, session, loading, router]);

  // Auto-colapsar sidebar después de 15 segundos (solo si hay usuario)
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      setSidebarCollapsed(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [user]);

  // IMPORTANTE: No mostrar NADA hasta verificar autenticación
  // Esto previene el "flash" del skeleton para usuarios no autenticados
  if (!authChecked || loading) {
    // Pantalla completamente vacía mientras se verifica
    // El middleware ya debería haber redirigido si no hay sesión
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-background">
        <div className="flex flex-col items-center gap-4">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="text-sm text-base-content/60">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // Si ya verificamos y no hay usuario, mostrar nada (redirección en progreso)
  if (!user) {
    return null;
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
          onSignOut={signOut}
        />
        
        {/* Main Content - Only this scrolls */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 sm:px-6 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
