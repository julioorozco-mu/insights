"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { APP_NAME } from "@/utils/constants";

export function Navbar() {
  const { user, signOut } = useAuth();

  return (
    <div className="navbar bg-base-100 shadow-lg">
      <div className="navbar-start">
        <div className="dropdown">
          <label tabIndex={0} className="btn btn-ghost lg:hidden">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h8m-8 6h16"
              />
            </svg>
          </label>
          <ul
            tabIndex={0}
            className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
          >
            <li>
              <Link href="/dashboard">Dashboard</Link>
            </li>
            <li>
              <Link href="/dashboard/courses">Cursos</Link>
            </li>
            <li>
              <Link href="/dashboard/live">En Vivo</Link>
            </li>
          </ul>
        </div>
        <Link href="/dashboard" className="btn btn-ghost text-xl">
          {APP_NAME}
        </Link>
      </div>
      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
          <li>
            <Link href="/dashboard">Dashboard</Link>
          </li>
          <li>
            <Link href="/dashboard/courses">Cursos</Link>
          </li>
          <li>
            <Link href="/dashboard/live">En Vivo</Link>
          </li>
        </ul>
      </div>
      <div className="navbar-end">
        {user ? (
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
              <div className="w-10 rounded-full">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} />
                ) : (
                  <div className="bg-neutral text-neutral-content flex items-center justify-center w-full h-full">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </label>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
            >
              <li>
                <Link href="/dashboard/settings" className="justify-between">
                  Perfil
                  <span className="badge">{user.role}</span>
                </Link>
              </li>
              <li>
                <Link href="/dashboard/settings">Configuración</Link>
              </li>
              <li>
                <button onClick={() => signOut()}>Cerrar Sesión</button>
              </li>
            </ul>
          </div>
        ) : (
          <Link href="/auth/login" className="btn btn-primary text-white">
            Iniciar Sesión
          </Link>
        )}
      </div>
    </div>
  );
}
