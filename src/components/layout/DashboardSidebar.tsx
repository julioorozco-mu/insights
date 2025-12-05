"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { User, UserRole } from "@/types/user";
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
  ChevronDown,
  Package,
  GraduationCap,
  FolderOpen,
  Award,
  TrendingUp,
  ClipboardCheck,
  PlusCircle,
  FileText,
  Bookmark,
  CheckCircle,
  X,
} from "lucide-react";
import { FC, useState, useEffect, useRef } from "react";

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface MenuItem {
  path: string;
  label: string;
  icon: FC<{ className?: string }>;
  badge?: number;
  indent?: boolean;
}

interface MenuSection {
  title?: string;
  icon?: FC<{ className?: string }>;
  items: MenuItem[];
}

interface RoleMenuConfig {
  main: MenuSection[];
  footer: MenuItem[];
}

// ============================================================================
// CONFIGURACIÓN DE MENÚS POR ROL
// ============================================================================

/** Menú para rol STUDENT */
const studentMenuConfig: RoleMenuConfig = {
  main: [
    {
      items: [
        { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { path: "/dashboard/progress", label: "Progreso", icon: TrendingUp },
      ],
    },
    {
      title: "Catálogo",
      icon: BookOpen,
      items: [
        { path: "/dashboard/available-courses", label: "Explorar", icon: BookOpen, indent: true },
        { path: "/dashboard/enrolled-courses", label: "En Curso", icon: TrendingUp, indent: true },
        { path: "/dashboard/completed-courses", label: "Completadas", icon: CheckCircle, indent: true },
        { path: "/dashboard/favorites", label: "Favoritos", icon: Bookmark, indent: true },
      ],
    },
    {
      items: [
        { path: "/dashboard/credentials", label: "Credenciales", icon: Award },
        { path: "/dashboard/explore-teachers", label: "Docentes", icon: GraduationCap },
      ],
    },
    {
      items: [
        { path: "/dashboard/messages", label: "Mensajes", icon: MessageCircle, badge: 8 },
        { path: "/dashboard/payments", label: "Pagos", icon: CreditCard },
      ],
    },
  ],
  footer: [
    { path: "/dashboard/support", label: "Soporte", icon: HelpCircle },
    { path: "/dashboard/settings", label: "Configuración", icon: Settings },
  ],
};

/** Menú para rol TEACHER */
const teacherMenuConfig: RoleMenuConfig = {
  main: [
    {
      items: [
        { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      ],
    },
    {
      title: "Microcredenciales",
      icon: Award,
      items: [
        { path: "/dashboard/my-courses", label: "Mis Cursos", icon: BookOpen, indent: true },
        { path: "/dashboard/calendar", label: "Calendario", icon: CalendarDays, indent: true },
        { path: "/dashboard/surveys", label: "Evaluaciones", icon: ClipboardCheck, indent: true },
        { path: "/dashboard/reports", label: "Reportes", icon: BarChart3, indent: true },
        { path: "/dashboard/courses/new", label: "Crear / Editar", icon: PlusCircle, indent: true },
        { path: "/dashboard/my-resources", label: "Mis Recursos", icon: FolderOpen, indent: true },
      ],
    },
    {
      items: [
        { path: "/dashboard/my-students", label: "Estudiantes", icon: Users },
        { path: "/dashboard/analytics", label: "Analíticas", icon: BarChart3 },
        { path: "/dashboard/messages", label: "Mensajes", icon: MessageCircle, badge: 8 },
      ],
    },
  ],
  footer: [
    { path: "/dashboard/support", label: "Soporte", icon: HelpCircle },
    { path: "/dashboard/settings", label: "Configuración", icon: Settings },
  ],
};

/** Menú para rol ADMIN */
const adminMenuConfig: RoleMenuConfig = {
  main: [
    {
      items: [
        { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      ],
    },
    {
      title: "Gestión de Usuarios",
      icon: Users,
      items: [
        { path: "/dashboard/users", label: "Usuarios", icon: Users, indent: true },
        { path: "/dashboard/students", label: "Estudiantes", icon: GraduationCap, indent: true },
        { path: "/dashboard/teachers", label: "Maestros", icon: Award, indent: true },
      ],
    },
    {
      title: "Microcredenciales",
      icon: BookOpen,
      items: [
        { path: "/dashboard/certificates", label: "Insignias", icon: Award, indent: true },
        { path: "/dashboard/courses", label: "Cursos", icon: BookOpen, indent: true },
        { path: "/dashboard/resources", label: "Recursos", icon: FolderOpen, indent: true },
      ],
    },
    {
      items: [
        { path: "/dashboard/surveys", label: "Evaluaciones", icon: ClipboardCheck },
        { path: "/dashboard/reports", label: "Reportes", icon: BarChart3 },
        { path: "/dashboard/payments", label: "Pagos", icon: CreditCard },
        { path: "/dashboard/logs", label: "Logs del Sistema", icon: FileText },
      ],
    },
  ],
  footer: [
    { path: "/dashboard/settings", label: "Ajustes del Sistema", icon: Settings },
  ],
};

/** Menú de fallback (cuando el rol está cargando o es desconocido) */
const fallbackMenuConfig: RoleMenuConfig = {
  main: [
    {
      items: [
        { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      ],
    },
  ],
  footer: [
    { path: "/dashboard/settings", label: "Configuración", icon: Settings },
  ],
};

// ============================================================================
// FUNCIÓN HELPER PARA OBTENER MENÚ POR ROL
// ============================================================================

function getMenuConfigByRole(role: UserRole | undefined | null): RoleMenuConfig {
  if (!role) return fallbackMenuConfig;

  switch (role) {
    case "student":
      return studentMenuConfig;
    case "teacher":
      return teacherMenuConfig;
    case "admin":
    case "superadmin":
      return adminMenuConfig;
    case "support":
      // Support usa el menú de student por ahora
      return studentMenuConfig;
    default:
      return fallbackMenuConfig;
  }
}

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
  const router = useRouter();
  
  // Refs para detectar clics fuera del sidebar
  const sidebarRef = useRef<HTMLElement>(null);
  const mobileSidebarRef = useRef<HTMLElement>(null);
  
  // Estado para controlar qué secciones acordeón están expandidas
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  // Estado para secciones colapsadas manualmente (override del auto-expand)
  const [manuallyCollapsed, setManuallyCollapsed] = useState<Set<string>>(new Set());

  // Colapsar todos los acordeones
  const collapseAllSections = () => {
    const menuConfig = getMenuConfigByRole(user?.role);
    const allTitles = menuConfig.main
      .filter((section) => section.title)
      .map((section) => section.title!);
    
    setManuallyCollapsed(new Set(allTitles));
    setExpandedSections(new Set());
  };

  // Detectar clics fuera del sidebar para colapsar acordeones y sidebar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Si el clic fue fuera del sidebar desktop
      const isOutsideDesktop = sidebarRef.current && !sidebarRef.current.contains(target);
      
      // Si estamos en desktop y el clic fue fuera
      if (isOutsideDesktop && !mobileSidebarRef.current?.contains(target)) {
        // Colapsar acordeones
        collapseAllSections();
        // Colapsar sidebar si está expandido
        if (!isCollapsed) {
          onToggleCollapse();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [user?.role, isCollapsed, onToggleCollapse]);

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return pathname === path;
    }
    return pathname?.startsWith(path);
  };

  // Verificar si algún item de la sección está activo
  const isSectionActive = (section: MenuSection) => {
    return section.items.some((item) => isActive(item.path));
  };

  // Obtener el primer item navegable de una sección (que no sea placeholder #)
  const getFirstNavigableItem = (section: MenuSection): MenuItem | undefined => {
    return section.items.find((item) => item.path !== "#");
  };

  // Toggle para expandir/colapsar sección + navegar al primer item
  const toggleSection = (sectionTitle: string, section: MenuSection) => {
    // Si el sidebar está colapsado, expandirlo primero
    if (isCollapsed) {
      onToggleCollapse();
    }
    
    const isCurrentlyExpanded = isSectionExpanded(section);
    
    if (isCurrentlyExpanded && !isCollapsed) {
      // Colapsar: agregar a manuallyCollapsed y remover de expandedSections
      setManuallyCollapsed((prev) => new Set(prev).add(sectionTitle));
      setExpandedSections((prev) => {
        const newSet = new Set(prev);
        newSet.delete(sectionTitle);
        return newSet;
      });
    } else {
      // Expandir: remover de manuallyCollapsed y agregar a expandedSections
      setManuallyCollapsed((prev) => {
        const newSet = new Set(prev);
        newSet.delete(sectionTitle);
        return newSet;
      });
      setExpandedSections((prev) => new Set(prev).add(sectionTitle));
      
      // Navegar al primer item navegable
      const firstItem = getFirstNavigableItem(section);
      if (firstItem) {
        router.push(firstItem.path);
      }
    }
  };

  // Verificar si una sección está expandida
  const isSectionExpanded = (section: MenuSection) => {
    if (!section.title) return true;
    // Si fue colapsada manualmente, respetar eso
    if (manuallyCollapsed.has(section.title)) return false;
    // Si está en expandedSections o tiene item activo, expandir
    return expandedSections.has(section.title) || isSectionActive(section);
  };

  // Obtener configuración de menú basada en el rol del usuario
  const menuConfig = getMenuConfigByRole(user?.role);

  // Handler para expandir sidebar al hacer clic en un item cuando está colapsado
  const handleMenuItemClick = () => {
    if (isCollapsed) {
      onToggleCollapse();
    }
    onClose();
  };

  const renderMenuItem = (item: MenuItem, index: number) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    const uniqueKey = `${item.path}-${item.label}-${index}`;

    return (
      <li key={uniqueKey}>
        <Link
          href={item.path}
          onClick={handleMenuItemClick}
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
        ref={sidebarRef}
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
        <nav className="space-y-1 flex-1">
          {menuConfig.main.map((section, sectionIndex) => {
            const hasTitle = !!section.title;
            const isExpanded = isSectionExpanded(section);
            const SectionIcon = section.icon;

            return (
              <div key={sectionIndex}>
                {sectionIndex > 0 && <div className="my-4 border-t border-white/10" />}
                
                {/* Sección con título = Acordeón */}
                {hasTitle && !isCollapsed ? (
                  <button
                    onClick={() => toggleSection(section.title!, section)}
                    className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium rounded-full transition ${
                      isSectionActive(section)
                        ? "bg-white/15 text-white"
                        : "text-white/70 hover:bg-white/10"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      {SectionIcon && <SectionIcon className="h-4 w-4" />}
                      {section.title}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                ) : hasTitle && isCollapsed ? (
                  // Modo colapsado: mostrar solo icono de la sección
                  <button
                    onClick={() => toggleSection(section.title!, section)}
                    className={`w-full flex items-center justify-center px-4 py-2 rounded-full transition ${
                      isSectionActive(section)
                        ? "bg-white/15 text-white"
                        : "text-white/70 hover:bg-white/10"
                    }`}
                    title={section.title}
                  >
                    {SectionIcon && <SectionIcon className="h-5 w-5" />}
                  </button>
                ) : null}

                {/* Items de la sección */}
                <div
                  className={`overflow-hidden transition-all duration-200 ${
                    hasTitle
                      ? isExpanded
                        ? "max-h-96 opacity-100 mt-1"
                        : "max-h-0 opacity-0"
                      : ""
                  }`}
                >
                  <ul className="space-y-1">
                    {section.items.map(renderMenuItem)}
                  </ul>
                </div>
              </div>
            );
          })}

          {/* Divider antes del footer */}
          <div className="my-4 border-t border-white/10" />

          {/* Footer Links */}
          <ul className="space-y-1">
            {menuConfig.footer.map(renderMenuItem)}
          </ul>
        </nav>
      </aside>

      {/* Mobile Sidebar */}
      {isOpen && (
        <aside
          ref={mobileSidebarRef}
          className="lg:hidden fixed inset-y-0 left-0 w-[260px] bg-brand-primary text-white flex flex-col py-8 px-6 space-y-8 z-50"
        >
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
            {menuConfig.main.map((section, sectionIndex) => {
              const hasTitle = !!section.title;
              const isExpanded = isSectionExpanded(section);
              const SectionIcon = section.icon;

              return (
                <div key={sectionIndex}>
                  {sectionIndex > 0 && <div className="my-4 border-t border-white/10" />}
                  
                  {/* Sección con título = Acordeón */}
                  {hasTitle && (
                    <button
                      onClick={() => toggleSection(section.title!, section)}
                      className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium rounded-full transition ${
                        isSectionActive(section)
                          ? "bg-white/15 text-white"
                          : "text-white/70 hover:bg-white/10"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        {SectionIcon && <SectionIcon className="h-4 w-4" />}
                        {section.title}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  )}

                  {/* Items de la sección */}
                  <div
                    className={`overflow-hidden transition-all duration-200 ${
                      hasTitle
                        ? isExpanded
                          ? "max-h-96 opacity-100 mt-1"
                          : "max-h-0 opacity-0"
                        : ""
                    }`}
                  >
                    <ul className="space-y-1">
                      {section.items.map(renderMenuItem)}
                    </ul>
                  </div>
                </div>
              );
            })}

            {/* Divider antes del footer */}
            <div className="my-4 border-t border-white/10" />

            {/* Footer Links */}
            <ul className="space-y-1">
              {menuConfig.footer.map(renderMenuItem)}
            </ul>
          </nav>
        </aside>
      )}
    </>
  );
}
