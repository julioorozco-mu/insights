"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const isActive = (path: string) => pathname === path;

  const menuItems = [
    { path: "/dashboard", label: "Dashboard", icon: "📊" },
    { path: "/dashboard/courses", label: "Cursos", icon: "📚" },
    { path: "/dashboard/live", label: "En Vivo", icon: "📹" },
  ];

  if (user?.role === "admin") {
    menuItems.push({ path: "/dashboard/users", label: "Usuarios", icon: "👥" });
  }

  menuItems.push({ path: "/dashboard/settings", label: "Configuración", icon: "⚙️" });

  return (
    <aside className="w-64 bg-base-200 min-h-screen p-4">
      <ul className="menu">
        {menuItems.map((item) => (
          <li key={item.path}>
            <Link
              href={item.path}
              className={isActive(item.path) ? "active" : ""}
            >
              <span className="text-xl">{item.icon}</span>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
