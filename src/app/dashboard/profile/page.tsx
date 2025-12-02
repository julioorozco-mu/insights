"use client";

import { useAuth } from "@/hooks/useAuth";
import { UserProfile } from "@/components/profile/UserProfile";
import { Loader } from "@/components/common/Loader";

export default function DashboardProfilePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-slate-500">Debes iniciar sesión para ver tu perfil.</p>
      </div>
    );
  }

  return <UserProfile userId={user.id} isPublic={false} />;
}
