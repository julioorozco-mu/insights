"use client";

import { useEffect, useState } from "react";
import { userRepository } from "@/lib/repositories/userRepository";
import { User } from "@/types/user";
import { useAuth } from "@/hooks/useAuth";
import { Loader } from "@/components/common/Loader";
import { formatDate } from "@/utils/formatDate";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await userRepository.findAll();
        setUsers(data);
      } catch (error) {
        console.error("Error loading users:", error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser?.role === "admin") {
      loadUsers();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  if (loading) {
    return <Loader />;
  }

  if (currentUser?.role !== "admin") {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Acceso Denegado</h2>
        <p className="text-base-content/70">No tienes permisos para ver esta página</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Usuarios</h1>
        <p className="text-base-content/70">Administra los usuarios de la plataforma</p>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Fecha de Registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar">
                          <div className="w-10 h-10 rounded-full">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt={user.name} />
                            ) : (
                              <div className="bg-neutral text-neutral-content flex items-center justify-center w-full h-full">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="font-bold">{user.name}</div>
                        </div>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <div className="badge badge-outline capitalize">{user.role}</div>
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <button className="btn btn-ghost btn-xs">Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
