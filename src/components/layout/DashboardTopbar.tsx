"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Bell } from "lucide-react";
import { User } from "@/types/user";

interface DashboardTopbarProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
  user: User | null;
  onSignOut: (options?: { global?: boolean; redirect?: string }) => Promise<void>;
}

export function DashboardTopbar({ onToggleSidebar, user, onSignOut }: DashboardTopbarProps) {
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
    try {
      await onSignOut({ redirect: "/auth/login" });
    } catch (error) {
      // El estado ya está limpio, forzar redirección manual como fallback
      console.error("Error en signOut:", error);
      window.location.href = "/auth/login";
    }
  };

  // Get current date info
  const now = new Date();
  const weekday = now.toLocaleDateString('es-MX', { weekday: 'long' });
  const fullDate = now.toLocaleDateString('es-MX', { 
    day: 'numeric',
    month: 'long', 
    year: 'numeric' 
  });

  // Capitalizar primera letra
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  return (
    <header data-dashboard-topbar className="sticky top-0 z-50 bg-white shadow-card-soft">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left: Mobile menu + Logos + Date */}
        <div className="flex items-center gap-4">
          {/* Botón hamburguesa para móvil */}
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-all"
            aria-label="Abrir menú"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          {/* Logos UNACH */}
          <div className="hidden md:flex items-center gap-4">
            <Image
              src="/images/logos/logo_unach_azul_sin_fondo.png"
              alt="Logo UNACH"
              width={180}
              height={60}
              priority
              className="h-16 w-auto object-contain"
            />
            <Image
              src="/images/logos/marca_unach.png"
              alt="Marca UNACH"
              width={120}
              height={60}
              priority
              className="h-16 w-auto object-contain"
            />
          </div>
          
          {/* Date Display */}
          <div>
            <p className="text-base font-semibold text-slate-900 capitalize">{capitalize(weekday)}</p>
            <p className="text-sm text-slate-500 capitalize">{fullDate}</p>
          </div>
        </div>

        {/* Right: Notifications + User */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <div className="dropdown dropdown-end">
            <label 
              tabIndex={0} 
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 cursor-pointer hover:bg-slate-200 transition-all"
            >
              <Bell className="h-5 w-5 text-slate-600" />
              {/* Notification badge */}
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-error text-[10px] font-bold text-white">
                3
              </span>
            </label>
            <ul
              tabIndex={0}
              className="mt-3 z-[100] p-3 shadow-card menu menu-sm dropdown-content bg-white rounded-xl w-80"
            >
              <li className="menu-title px-3 py-2">
                <span className="text-base font-semibold text-slate-900">Notificaciones</span>
              </li>
              <li>
                <a className="flex items-start gap-3 py-3 px-3 rounded-lg hover:bg-brand-primary/5 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center">
                    <span className="text-lg">📚</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">Nuevo curso disponible</p>
                    <p className="text-xs text-slate-500">Hace 2 horas</p>
                  </div>
                </a>
              </li>
              <li>
                <a className="flex items-start gap-3 py-3 px-3 rounded-lg hover:bg-brand-primary/5 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-brand-success/10 flex items-center justify-center">
                    <span className="text-lg">✅</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">Lección completada</p>
                    <p className="text-xs text-slate-500">Hace 5 horas</p>
                  </div>
                </a>
              </li>
            </ul>
          </div>

          {/* User Info */}
          <div className="dropdown dropdown-end">
            <label 
              tabIndex={0} 
              className="flex items-center gap-3 cursor-pointer"
            >
              {/* Avatar */}
              <div className="h-10 w-10 rounded-full overflow-hidden ring-2 ring-slate-100">
                {user?.avatarUrl ? (
                  <img 
                    src={user.avatarUrl} 
                    alt={user.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-brand-secondary text-white flex items-center justify-center font-semibold text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              {/* Name and Role */}
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-slate-900">{user?.name || 'Usuario'}</p>
                <p className="text-xs text-slate-500">{getRoleInSpanish(user?.role)}</p>
              </div>
            </label>
            <ul
              tabIndex={0}
              className="mt-3 z-[100] p-3 shadow-card menu menu-sm dropdown-content bg-white rounded-xl w-56"
            >
              <li className="px-3 py-2 border-b border-slate-100">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-slate-900">{user?.name}</span>
                  <span className="text-xs text-slate-500">{getRoleInSpanish(user?.role)}</span>
                </div>
              </li>
              <li className="mt-2">
                <Link 
                  href="/dashboard/profile"
                  className="px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-brand-primary/5 hover:text-brand-primary transition-colors block"
                >
                  Ver Perfil
                </Link>
              </li>
              <li>
                <Link 
                  href="/dashboard/settings"
                  className="px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-brand-primary/5 hover:text-brand-primary transition-colors block"
                >
                  Configuración
                </Link>
              </li>
              <li className="mt-2 pt-2 border-t border-slate-100">
                <button 
                  onClick={handleSignOut} 
                  className="px-3 py-2 rounded-lg text-sm text-brand-error hover:bg-red-50 transition-colors w-full text-left"
                >
                  Cerrar Sesión
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </header>
  );
}
