"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { resourceService } from "@/lib/services/resourceService";
import { SpeakerResource } from "@/types/resource";
import { Course } from "@/types/course";
import { courseRepository } from "@/lib/repositories/courseRepository";
import { IconX, IconCheck, IconBook } from "@tabler/icons-react";

interface ResourceAssignModalProps {
  resource: SpeakerResource;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ResourceAssignModal({
  resource,
  onClose,
  onSuccess,
}: ResourceAssignModalProps) {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>(
    resource.assignedCourses || []
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCourses();
  }, [user]);

  const loadCourses = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const coursesData = await courseRepository.findBySpeaker(user.id);
      setCourses(coursesData);
    } catch (error) {
      console.error("Error loading courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCourse = (courseId: string) => {
    setSelectedCourses((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await resourceService.assignToCourses(resource.id, selectedCourses);
      onSuccess();
    } catch (error) {
      console.error("Error saving assignments:", error);
      alert("Error al guardar las asignaciones");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Asignar a Cursos</h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            <IconX size={20} />
          </button>
        </div>

        {/* Info del recurso */}
        <div className="alert alert-info mb-4">
          <IconBook size={20} />
          <div>
            <div className="font-semibold">{resource.fileName}</div>
            <div className="text-sm opacity-70">
              Selecciona los cursos donde quieres usar este recurso
            </div>
          </div>
        </div>

        {/* Lista de cursos */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-8 text-base-content/60">
              No tienes cursos asignados
            </div>
          ) : (
            courses.map((course) => {
              const isSelected = selectedCourses.includes(course.id);
              return (
                <div
                  key={course.id}
                  className={`card bg-base-100 border-2 cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? "border-primary bg-primary/5" : "border-base-300"
                  }`}
                  onClick={() => toggleCourse(course.id)}
                >
                  <div className="card-body p-4">
                    <div className="flex items-start gap-3">
                      <div className="form-control">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleCourse(course.id)}
                          className="checkbox checkbox-primary"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{course.title}</h4>
                        {course.description && (
                          <p className="text-sm text-base-content/70 line-clamp-2 mt-1">
                            {course.description}
                          </p>
                        )}
                        {course.tags && course.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {course.tags.slice(0, 3).map((tag, index) => (
                              <span key={index} className="badge badge-sm badge-outline">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <div className="text-primary">
                          <IconCheck size={24} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Resumen */}
        <div className="mt-4 p-3 bg-base-200 rounded-lg">
          <div className="text-sm">
            <span className="font-semibold">{selectedCourses.length}</span> curso(s)
            seleccionado(s)
          </div>
        </div>

        <div className="modal-action">
          <button onClick={onClose} className="btn btn-ghost" disabled={saving}>
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary text-white"
            disabled={saving || loading}
          >
            {saving ? "Guardando..." : "Guardar Asignaciones"}
          </button>
        </div>
      </div>
    </div>
  );
}
