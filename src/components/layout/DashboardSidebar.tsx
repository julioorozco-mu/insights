"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User } from "@/types/user";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  MessageCircle,
  BarChart3,
  CreditCard,
  HelpCircle,
  Settings,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Package,
  Mic,
  GraduationCap,
  FolderOpen,
  Award,
  FileBarChart,
  Search,
  Bookmark,
  X,
} from "lucide-react";
import { FC } from "react";

interface MenuItem {
  path: string;
  label: string;
  icon: FC<{ className?: string }>;
  roles?: string[];
  badge?: number;
  indent?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  // Admin menu
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "speaker", "student"],
  },
  { path: "/dashboard/courses", label: "Cursos", icon: BookOpen, roles: ["admin"], indent: true },
  { path: "/dashboard/teachers", label: "Profesores", icon: Mic, roles: ["admin"], indent: true },
  { path: "/dashboard/students", label: "Estudiantes", icon: GraduationCap, roles: ["admin"], indent: true },
  { path: "/dashboard/surveys", label: "Encuestas", icon: BarChart3, roles: ["admin"], indent: true },
  { path: "/dashboard/resources", label: "Recursos", icon: FolderOpen, roles: ["admin"], indent: true },
  { path: "/dashboard/certificates", label: "Certificados", icon: Award, roles: ["admin"], indent: true },
  { path: "/dashboard/reports", label: "Reportes", icon: FileBarChart, roles: ["admin"], indent: true },

  // Speaker menu
  { path: "/dashboard/my-courses", label: "Mis Cursos", icon: BookOpen, roles: ["speaker"] },
  { path: "/dashboard/my-students", label: "Alumnos", icon: Users, roles: ["speaker"] },
  { path: "/dashboard/my-resources", label: "Mis Recursos", icon: FolderOpen, roles: ["speaker"] },

  // Student menu
  {
    path: "/dashboard/available-courses",
    label: "Cursos Disponibles",
    icon: Search,
    roles: ["student"],
  },
  { path: "/dashboard/enrolled-courses", label: "Mis Cursos", icon: Bookmark, roles: ["student"] },
];

const SECONDARY_MENU: MenuItem[] = [
  {
    path: "/dashboard/messages",
    label: "Mensajes",
    icon: MessageCircle,
    roles: ["admin", "speaker", "student"],
    badge: 8,
    indent: true,
  },
  {
    path: "/dashboard/analytics",
    label: "Analytics",
    icon: BarChart3,
    roles: ["admin", "speaker"],
    indent: true,
  },
  { path: "/dashboard/payments", label: "Pagos", icon: CreditCard, roles: ["admin"], indent: true },
];

const FOOTER_MENU: MenuItem[] = [
  {
    path: "/dashboard/support",
    label: "Soporte",
    icon: HelpCircle,
    roles: ["admin", "speaker", "student"],
  },
  {
    path: "/dashboard/settings",
    label: "Configuración",
    icon: Settings,
    roles: ["admin", "speaker", "student"],
  },
];

interface DashboardSidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
  user: User | null;
}

export function DashboardSidebar({
  isOpen,
  isCollapsed,
  onClose,
  onToggleCollapse,
  user,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return pathname === path;
    }
    return pathname?.startsWith(path);
  };

  const filteredMenuItems = MENU_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user?.role || "")
  );

  const filteredSecondaryMenu = SECONDARY_MENU.filter(
    (item) => !item.roles || item.roles.includes(user?.role || "")
  );

  const filteredFooterMenu = FOOTER_MENU.filter(
    (item) => !item.roles || item.roles.includes(user?.role || "")
  );

  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icon;
    const active = isActive(item.path);

    return (
      <li key={item.path}>
        <Link
          href={item.path}
          onClick={() => onClose()}
          className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"} rounded-full ${item.indent && !isCollapsed ? "pl-11 pr-4" : "px-4"} py-2 text-sm font-medium transition relative ${
            active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10"
          }`}
          title={isCollapsed ? item.label : undefined}
        >
          {isCollapsed ? (
            <>
              <Icon className="h-5 w-5" />
              {item.badge && (
                <span className="absolute -top-1 -right-1 rounded-full bg-brand-secondary px-1.5 text-xs font-semibold">
                  {item.badge}
                </span>
              )}
            </>
          ) : (
            <>
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {item.label}
              </span>
              {item.badge && (
                <span className="rounded-full bg-brand-secondary px-2 text-xs font-semibold">
                  {item.badge}
                </span>
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
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <aside
        className={`hidden lg:flex bg-brand-primary text-white flex-col py-8 space-y-8 transition-all duration-300 sticky top-0 h-screen flex-shrink-0 relative z-40 ${
          isCollapsed ? "w-[70px] px-3" : "w-[260px] px-6"
        }`}
      >
        {/* Toggle Button */}
        <button
          onClick={onToggleCollapse}
          className="absolute top-9 -right-4 bg-brand-primary rounded-full w-8 h-8 flex items-center justify-center hover:bg-brand-secondary z-50 shadow-lg transition-all duration-300"
          aria-label={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        {/* Logo */}
        <div className={`${isCollapsed ? "flex justify-center" : "text-center"}`}>
          {isCollapsed ? (
            <Package className="h-8 w-8" />
          ) : (
            <>
              <div className="text-2xl font-semibold tracking-tight">MicroCert</div>
              <p className="text-sm text-white/70 text-center">Microcredenciales<br />Marca UNACH</p>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          <ul className="space-y-1">{filteredMenuItems.map(renderMenuItem)}</ul>

          {/* Divider */}
          <div className="my-6 border-t border-white/10" />

          {/* Secondary Navigation */}
          <ul className="space-y-1">{filteredSecondaryMenu.map(renderMenuItem)}</ul>

          {/* Divider */}
          <div className="my-6 border-t border-white/10" />

          {/* Footer Links */}
          <ul className="space-y-1">{filteredFooterMenu.map(renderMenuItem)}</ul>
        </nav>
      </aside>

      {/* Mobile Sidebar */}
      {isOpen && (
        <aside className="lg:hidden fixed inset-y-0 left-0 w-[260px] bg-brand-primary text-white flex flex-col py-8 px-6 space-y-8 z-50">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Logo */}
          <div>
            <div className="text-2xl font-semibold tracking-tight">Marca UNACH</div>
            <p className="text-sm text-white/70">Microcredenciales</p>
          </div>

          {/* Navigation */}
          <nav className="space-y-1 flex-1">
            <ul className="space-y-1">{filteredMenuItems.map(renderMenuItem)}</ul>
            <div className="my-6 border-t border-white/10" />
            <ul className="space-y-1">{filteredSecondaryMenu.map(renderMenuItem)}</ul>
            <div className="my-6 border-t border-white/10" />
            <ul className="space-y-1">{filteredFooterMenu.map(renderMenuItem)}</ul>
          </nav>
        </aside>
      )}
    </>
  );
}
