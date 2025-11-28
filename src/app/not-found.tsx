"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <span className="loading loading-spinner loading-lg"></span>
        <p className="mt-4 text-base-content/70">Redirigiendo...</p>
      </div>
    </div>
  );
}
