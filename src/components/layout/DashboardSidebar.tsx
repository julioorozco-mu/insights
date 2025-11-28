"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  IconHome,
  IconBook,
  IconMicrophone,
  IconSchool,
  IconChartBar,
  IconFolder,
  IconCertificate,
  IconUsers,
  IconSearch,
  IconBookmark,
  IconSettings,
  IconX,
  IconFileAnalytics,
  IconHeadset,
  IconMessage,
  IconCreditCard,
} from "@tabler/icons-react";
import { FC } from "react";

interface MenuItem {
  path: string;
  label: string;
  icon: FC<{ size?: number; stroke?: number }>;
  roles?: string[];
  badge?: number;
}

const MENU_ITEMS: MenuItem[] = [
  // Admin menu
  { path: "/dashboard", label: "Dashboard", icon: IconHome, roles: ["admin", "speaker", "student"] },
  { path: "/dashboard/courses", label: "Cursos", icon: IconBook, roles: ["admin"] },
  { path: "/dashboard/speakers", label: "Ponentes", icon: IconMicrophone, roles: ["admin"] },
  { path: "/dashboard/students", label: "Estudiantes", icon: IconSchool, roles: ["admin"] },
  { path: "/dashboard/surveys", label: "Encuestas", icon: IconChartBar, roles: ["admin"] },
  { path: "/dashboard/resources", label: "Recursos", icon: IconFolder, roles: ["admin"] },
  { path: "/dashboard/certificates", label: "Certificados", icon: IconCertificate, roles: ["admin"] },
  { path: "/dashboard/reports", label: "Reportes", icon: IconFileAnalytics, roles: ["admin"] },
  
  // Speaker menu
  { path: "/dashboard/my-courses", label: "Mis Cursos", icon: IconBook, roles: ["speaker"] },
  { path: "/dashboard/my-students", label: "Alumnos", icon: IconUsers, roles: ["speaker"] },
  { path: "/dashboard/my-resources", label: "Mis Recursos", icon: IconFolder, roles: ["speaker"] },
  
  // Student menu
  { path: "/dashboard/available-courses", label: "Cursos Disponibles", icon: IconSearch, roles: ["student"] },
  { path: "/dashboard/enrolled-courses", label: "Mis Cursos", icon: IconBookmark, roles: ["student"] },
];

const SECONDARY_MENU: MenuItem[] = [
  { path: "/dashboard/messages", label: "Mensajes", icon: IconMessage, roles: ["admin", "speaker", "student"], badge: 8 },
  { path: "/dashboard/analytics", label: "Analytics", icon: IconChartBar, roles: ["admin", "speaker"] },
  { path: "/dashboard/payments", label: "Pagos", icon: IconCreditCard, roles: ["admin"] },
];

const FOOTER_MENU: MenuItem[] = [
  { path: "/dashboard/support", label: "Soporte", icon: IconHeadset, roles: ["admin", "speaker", "student"] },
  { path: "/dashboard/settings", label: "Configuración", icon: IconSettings, roles: ["admin", "speaker", "student"] },
];

interface DashboardSidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}

export function DashboardSidebar({ isOpen, isCollapsed, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return pathname === path;
    }
    return pathname?.startsWith(path);
  };

  const filteredMenuItems = MENU_ITEMS.filter((item) => 
    !item.roles || item.roles.includes(user?.role || "")
  );

  const filteredSecondaryMenu = SECONDARY_MENU.filter((item) => 
    !item.roles || item.roles.includes(user?.role || "")
  );

  const filteredFooterMenu = FOOTER_MENU.filter((item) => 
    !item.roles || item.roles.includes(user?.role || "")
  );

  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    
    return (
      <li key={item.path}>
        <Link
          href={item.path}
          onClick={() => onClose()}
          className={`
            sidebar-nav-item
            ${active ? "active" : ""}
            ${isCollapsed ? 'justify-center tooltip tooltip-right' : ''}
          `}
          data-tip={isCollapsed ? item.label : undefined}
        >
          <Icon size={20} stroke={1.5} />
          {!isCollapsed && (
            <>
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="pill-counter">{item.badge}</span>
              )}
            </>
          )}
        </Link>
      </li>
    );
  };

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={`
          fixed lg:relative
          inset-y-0 left-0
          bg-dashboard-sidebar min-h-screen
          transition-all duration-300 ease-in-out
          z-50
          ${isCollapsed ? 'lg:w-20' : 'lg:w-[260px]'}
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          w-[260px]
          flex flex-col
        `}
      >
        {/* Header with Logo */}
        <div className="p-6 flex items-center justify-between">
          {!isCollapsed ? (
            <div className="flex items-center gap-3">
              {/* Logo Icon */}
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                <svg 
                  viewBox="0 0 24 24" 
                  className="w-6 h-6 text-dashboard-sidebar"
                  fill="currentColor"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              {/* Brand Name */}
              <span className="text-xl font-bold text-white">Skillzone</span>
            </div>
          ) : (
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mx-auto">
              <svg 
                viewBox="0 0 24 24" 
                className="w-6 h-6 text-dashboard-sidebar"
                fill="currentColor"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
          )}
          
          {/* Botón cerrar en móvil */}
          <button
            onClick={onClose}
            className="lg:hidden text-white/80 hover:text-white p-1"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 px-4 overflow-y-auto">
          <ul className="space-y-1">
            {filteredMenuItems.map(renderMenuItem)}
          </ul>

          {/* Divider */}
          <div className="my-6 border-t border-white/10" />

          {/* Secondary Navigation */}
          <ul className="space-y-1">
            {filteredSecondaryMenu.map(renderMenuItem)}
          </ul>
        </nav>

        {/* Footer Navigation */}
        <div className="px-4 py-6 border-t border-white/10">
          <ul className="space-y-1">
            {filteredFooterMenu.map(renderMenuItem)}
          </ul>
        </div>
      </aside>
    </>
  );
}
