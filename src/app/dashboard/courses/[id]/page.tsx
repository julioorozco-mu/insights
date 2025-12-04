"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader } from "@/components/common/Loader";

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  // Redirigir automáticamente a la página de edición con el nuevo diseño
  useEffect(() => {
    if (courseId) {
      router.replace(`/dashboard/courses/${courseId}/edit`);
    }
  }, [courseId, router]);

  // Mostrar loader mientras redirige
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader />
    </div>
  );
}
