"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  // Auto-colapsar sidebar después de 15 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      setSidebarCollapsed(true);
    }, 15000);
    return () => clearTimeout(timer);
  }, []);

  // Si está cargando, mostramos el layout con skeletons (no un loader de pantalla completa)
  if (loading) {
    return (
      <div className="flex min-h-screen bg-brand-background">
        <SidebarSkeleton />
        <div className="flex-1 flex flex-col min-h-screen bg-brand-background">
          <TopbarSkeleton />
          <ContentSkeleton />
        </div>
      </div>
    );
  }

  // Si no hay usuario (y ya no está cargando), no renderizar nada (se redirige en el useEffect)
  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-brand-background">
      {/* Sidebar */}
      <DashboardSidebar 
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        user={user}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen bg-brand-background">
        {/* Top Bar */}
        <DashboardTopbar 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarCollapsed={sidebarCollapsed}
          user={user}
          onSignOut={signOut}
        />
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
