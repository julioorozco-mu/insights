"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { IconMenu2, IconBell } from "@tabler/icons-react";

interface DashboardTopbarProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

export function DashboardTopbar({ onToggleSidebar }: DashboardTopbarProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();

  // Traducir roles al español
  const getRoleInSpanish = (role: string | undefined) => {
    switch (role) {
      case "admin":
        return "Administrador";
      case "speaker":
        return "Ponente";
      case "student":
        return "Estudiante";
      default:
        return role;
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth/login");
  };

  // Get current date info
  const now = new Date();
  const weekday = now.toLocaleDateString('es-ES', { weekday: 'long' });
  const fullDate = now.toLocaleDateString('es-ES', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });

  return (
    <div className="px-6 py-4 bg-dashboard-page">
      <div className="flex items-center justify-between">
        {/* Mobile menu button and Date */}
        <div className="flex items-center gap-4">
          {/* Botón hamburguesa para móvil */}
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg text-dashboard-textSecondary hover:bg-white hover:shadow-cardSoft transition-all"
            aria-label="Abrir menú"
          >
            <IconMenu2 size={24} />
          </button>
          
          {/* Date Display */}
          <div className="hidden md:block">
            <h2 className="text-h3 font-semibold text-dashboard-textPrimary capitalize">{weekday}</h2>
            <p className="text-body-sm text-dashboard-textMuted capitalize">{fullDate}</p>
          </div>
        </div>

        {/* Espaciador */}
        <div className="flex-1"></div>

        {/* User Actions */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="dropdown dropdown-end">
            <label 
              tabIndex={0} 
              className="w-10 h-10 rounded-full bg-white shadow-cardSoft flex items-center justify-center cursor-pointer hover:shadow-card transition-all"
            >
              <div className="indicator">
                <IconBell size={20} className="text-dashboard-textSecondary" stroke={1.5} />
                <span className="w-2 h-2 bg-dashboard-danger rounded-full absolute top-0 right-0"></span>
              </div>
            </label>
            <ul
              tabIndex={0}
              className="mt-3 z-[1] p-3 shadow-card menu menu-sm dropdown-content bg-white rounded-lg w-80"
            >
              <li className="menu-title px-3 py-2">
                <span className="text-h3 font-semibold text-dashboard-textPrimary">Notificaciones</span>
              </li>
              <li>
                <a className="flex items-start gap-3 py-3 px-3 rounded-lg hover:bg-dashboard-accentSoft transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-dashboard-accentSoft flex items-center justify-center">
                    <span className="text-lg">📚</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-body-md font-medium text-dashboard-textPrimary">Nuevo curso disponible</p>
                    <p className="text-body-sm text-dashboard-textMuted">Hace 2 horas</p>
                  </div>
                </a>
              </li>
              <li>
                <a className="flex items-start gap-3 py-3 px-3 rounded-lg hover:bg-dashboard-accentSoft transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <span className="text-lg">✅</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-body-md font-medium text-dashboard-textPrimary">Lección completada</p>
                    <p className="text-body-sm text-dashboard-textMuted">Hace 5 horas</p>
                  </div>
                </a>
              </li>
            </ul>
          </div>

          {/* User Avatar */}
          <div className="dropdown dropdown-end">
            <label 
              tabIndex={0} 
              className="w-10 h-10 rounded-full cursor-pointer overflow-hidden ring-2 ring-white shadow-cardSoft hover:shadow-card transition-all"
            >
              {user?.avatarUrl ? (
                <img 
                  src={user.avatarUrl} 
                  alt={user.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-dashboard-accent text-white flex items-center justify-center font-semibold text-body-lg">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </label>
            <ul
              tabIndex={0}
              className="mt-3 z-[1] p-3 shadow-card menu menu-sm dropdown-content bg-white rounded-lg w-56"
            >
              <li className="px-3 py-2 border-b border-gray-100">
                <div className="flex flex-col gap-0.5">
                  <span className="text-body-md font-semibold text-dashboard-textPrimary">{user?.name}</span>
                  <span className="text-body-sm text-dashboard-textMuted">{getRoleInSpanish(user?.role)}</span>
                </div>
              </li>
              <li className="mt-2">
                <a 
                  href={`/profile/${user?.id}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-lg text-body-md text-dashboard-textSecondary hover:bg-dashboard-accentSoft hover:text-dashboard-accent transition-colors"
                >
                  Ver Perfil
                </a>
              </li>
              <li>
                <a 
                  href="/dashboard/settings"
                  className="px-3 py-2 rounded-lg text-body-md text-dashboard-textSecondary hover:bg-dashboard-accentSoft hover:text-dashboard-accent transition-colors"
                >
                  Configuración
                </a>
              </li>
              <li className="mt-2 pt-2 border-t border-gray-100">
                <button 
                  onClick={handleSignOut} 
                  className="px-3 py-2 rounded-lg text-body-md text-dashboard-danger hover:bg-red-50 transition-colors w-full text-left"
                >
                  Cerrar Sesión
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
