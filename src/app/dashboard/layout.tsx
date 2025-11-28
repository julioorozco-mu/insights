"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { DashboardTopbar } from "@/components/layout/DashboardTopbar";
import { Loader } from "@/components/common/Loader";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dashboard-page">
        <Loader size="lg" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-dashboard-page">
      {/* Sidebar */}
      <DashboardSidebar 
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar - Hidden on desktop, shown on mobile */}
        <div className="lg:hidden">
          <DashboardTopbar 
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            sidebarCollapsed={sidebarCollapsed}
          />
        </div>
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
