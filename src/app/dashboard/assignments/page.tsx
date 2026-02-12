"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Loader } from "@/components/common/Loader";
import { AlertTriangle, Filter, Search, User as UserIcon, X, Save } from "lucide-react";

type StatusFilter = "all" | "assigned" | "unassigned";

type CourseSpeaker = {
  id: string;
  name: string;
  email?: string;
  photoURL?: string;
};

type CourseLesson = {
  id: string;
  title: string;
  startDate?: string;
};

type CourseRow = {
  id: string;
  title: string;
  description?: string | null;
  coverImageUrl?: string | null;
  thumbnailUrl?: string | null;
  speakerIds?: string[];
  speakers?: CourseSpeaker[];
  lessons?: CourseLesson[];
};

type SpeakerRow = {
  id: string;
  userId?: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  expertise?: string[];
};

function getInitials(name: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "U";
  const second = parts.length > 1 ? parts[1]?.[0] : "";
  return (first + second).toUpperCase();
}

function isAdminRole(role: any) {
  return role === "admin" || role === "superadmin" || role === "support";
}

export default function AssignmentsPage() {
  const { user, loading: authLoading } = useAuth();

  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [speakers, setSpeakers] = useState<SpeakerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [selectedTeacherUserId, setSelectedTeacherUserId] = useState<string | null>(null);
  const [currentAssignedTeacherUserId, setCurrentAssignedTeacherUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const allowed = useMemo(() => isAdminRole(user?.role), [user?.role]);

  const selectedCourse = useMemo(() => {
    if (!selectedCourseId) return null;
    return courses.find((c) => c.id === selectedCourseId) || null;
  }, [courses, selectedCourseId]);

  const teacherCourseCounts = useMemo(() => {
    const map = new Map<string, number>();
    (courses || []).forEach((course) => {
      // Obtener el primer speaker asignado
      const firstSpeaker = Array.isArray(course.speakers) && course.speakers.length > 0 
        ? course.speakers[0] 
        : null;
      if (!firstSpeaker) return;
      
      // firstSpeaker.id es el userId directamente
      const teacherUserId = firstSpeaker.id;
      
      if (!teacherUserId) return;
      map.set(teacherUserId, (map.get(teacherUserId) || 0) + 1);
    });
    return map;
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return (courses || []).filter((course) => {
      const hasTeacher = (course.speakerIds || []).length > 0;
      const statusOk =
        statusFilter === "all" ||
        (statusFilter === "assigned" && hasTeacher) ||
        (statusFilter === "unassigned" && !hasTeacher);

      if (!statusOk) return false;
      if (!term) return true;

      const haystack = `${course.title || ""} ${course.id || ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [courses, searchTerm, statusFilter]);

  const filteredSpeakers = useMemo(() => {
    const term = teacherSearch.trim().toLowerCase();
    const list = (speakers || []).filter((s) => !!s.userId);
    
    // Filtrar para excluir solo el docente asignado actual
    const listFiltered = list.filter((s) => s.userId !== currentAssignedTeacherUserId);
    
    if (!term) return listFiltered;

    return listFiltered.filter((s) => {
      const expertise = Array.isArray(s.expertise) ? s.expertise.join(" ") : "";
      const haystack = `${s.name || ""} ${s.email || ""} ${expertise}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [speakers, teacherSearch, currentAssignedTeacherUserId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !allowed) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const load = async () => {
      try {
        setError(null);
        setLoading(true);

        const [coursesRes, speakersRes] = await Promise.all([
          fetch("/api/admin/getCourses"),
          fetch("/api/admin/getSpeakers"),
        ]);

        if (!coursesRes.ok) {
          const err = await coursesRes.json().catch(() => ({}));
          throw new Error(err?.error || "Error cargando cursos");
        }

        if (!speakersRes.ok) {
          const err = await speakersRes.json().catch(() => ({}));
          throw new Error(err?.error || "Error cargando docentes");
        }

        const coursesJson = await coursesRes.json();
        const speakersJson = await speakersRes.json();

        if (!mounted) return;

        const nextCourses: CourseRow[] = Array.isArray(coursesJson?.courses) ? coursesJson.courses : [];
        setCourses(nextCourses);
        setSpeakers(Array.isArray(speakersJson?.speakers) ? speakersJson.speakers : []);

        if (!selectedCourseId && nextCourses.length > 0) {
          const firstUnassigned = nextCourses.find((c) => (c.speakerIds || []).length === 0);
          setSelectedCourseId((firstUnassigned || nextCourses[0]).id);
        }
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Error interno");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [authLoading, user?.id, allowed]);

  useEffect(() => {
    if (!selectedCourse) return;
    // Obtener el userId del primer speaker asignado
    const firstSpeaker = Array.isArray(selectedCourse.speakers) && selectedCourse.speakers.length > 0 
      ? selectedCourse.speakers[0] 
      : null;
    // firstSpeaker.id es el userId, lo usamos directamente
    const currentTeacherUserId = firstSpeaker?.id || null;
    setCurrentAssignedTeacherUserId(currentTeacherUserId);
    setSelectedTeacherUserId(currentTeacherUserId);
    setTeacherSearch("");
  }, [selectedCourseId, selectedCourse]);

  const closePanel = () => {
    setSelectedCourseId(null);
    setTeacherSearch("");
    setSelectedTeacherUserId(null);
    setCurrentAssignedTeacherUserId(null);
  };

  const handleAssign = async () => {
    if (!selectedCourse) return;

    try {
      setSaving(true);
      setError(null);

      const payload = {
        courseId: selectedCourse.id,
        // updateCourse espera userId(s)
        speakerIds: selectedTeacherUserId ? [selectedTeacherUserId] : [],
      };

      const res = await fetch("/api/admin/updateCourse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Error al asignar docente");
      }

      const refresh = await fetch("/api/admin/getCourses");
      if (refresh.ok) {
        const data = await refresh.json();
        setCourses(Array.isArray(data?.courses) ? data.courses : []);
      }
    } catch (e: any) {
      setError(e?.message || "Error interno");
    } finally {
      setSaving(false);
    }
  };

  const panelBody = (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-900">Asignación Docente</h2>
        <button type="button" onClick={closePanel} className="text-slate-400 hover:text-slate-600" aria-label="Cerrar">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {!selectedCourse ? (
          <div className="text-sm text-slate-500">Selecciona un curso para asignar docente.</div>
        ) : (
          <>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2 tracking-wide">Curso seleccionado</p>
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded overflow-hidden bg-slate-200 flex-shrink-0">
                  {selectedCourse.coverImageUrl || selectedCourse.thumbnailUrl ? (
                    <img
                      alt=""
                      src={(selectedCourse.coverImageUrl || selectedCourse.thumbnailUrl) as string}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-brand-primary/10 to-brand-secondary/10" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">{selectedCourse.title}</h4>
                  {(selectedCourse.speakerIds || []).length === 0 ? (
                    <p className="text-xs text-brand-error mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Sin docente asignado
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <UserIcon className="h-3.5 w-3.5" />
                      Docente asignado
                    </p>
                  )}
                </div>
              </div>
            </div>

            {currentAssignedTeacherUserId && (() => {
              const currentSpeaker = speakers.find(s => s.userId === currentAssignedTeacherUserId);
              if (!currentSpeaker) return null;
              
              const count = teacherCourseCounts.get(currentAssignedTeacherUserId) || 0;
              
              return (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Docente Actual</p>
                  <div className="p-4 bg-brand-primary/5 rounded-lg border-2 border-brand-primary/20">
                    <div className="flex items-center gap-3">
                      {currentSpeaker.avatarUrl ? (
                        <img alt="" src={currentSpeaker.avatarUrl} className="h-12 w-12 rounded-full object-cover" />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-brand-secondary/10 flex items-center justify-center text-brand-secondary font-bold text-sm">
                          {getInitials(currentSpeaker.name || currentSpeaker.email || "Docente")}
                        </div>
                      )}
                      <div className="flex-1">
                        <span className="block text-sm font-bold text-slate-900">{currentSpeaker.name || currentSpeaker.email}</span>
                        <span className="block text-xs text-slate-600 mt-0.5">
                          {Array.isArray(currentSpeaker.expertise) && currentSpeaker.expertise.length > 0 ? currentSpeaker.expertise[0] : ""}
                        </span>
                      </div>
                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-brand-primary/10 text-brand-primary font-medium">
                        {count === 1 ? "1 Curso" : `${count} Cursos`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Buscar Docente</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  placeholder="Nombre, email o especialidad"
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-sm"
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Resultados sugeridos</p>
              <div className="space-y-3">
                <label 
                  className={
                    "relative flex items-center p-3 rounded-lg border cursor-pointer hover:bg-slate-50 transition-colors " +
                    (!selectedTeacherUserId ? "border-brand-primary bg-brand-primary/5" : "border-slate-200")
                  }
                  onClick={() => setSelectedTeacherUserId(null)}
                >
                  <input
                    type="radio"
                    name="teacher_select"
                    className="h-4 w-4 text-brand-primary border-slate-300 focus:ring-brand-primary cursor-pointer"
                    checked={!selectedTeacherUserId}
                    onChange={() => setSelectedTeacherUserId(null)}
                  />
                  <div className="ml-3 flex items-center gap-3 w-full">
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                      <UserIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <span className="block text-sm font-medium text-slate-900">Sin docente</span>
                      <span className="block text-xs text-slate-500">Dejar el curso sin asignación</span>
                    </div>
                  </div>
                  {!selectedTeacherUserId && (
                    <div className="absolute inset-0 rounded-lg ring-2 ring-brand-primary ring-opacity-20 pointer-events-none" />
                  )}
                </label>

                {filteredSpeakers.map((sp) => {
                  const teacherUserId = sp.userId as string;
                  const count = teacherCourseCounts.get(teacherUserId) || 0;
                  const badgeText = count === 0 ? "Disponible" : `${count} Cursos`;
                  const badgeClass =
                    count === 0
                      ? "bg-brand-success/10 text-brand-success"
                      : "bg-amber-100 text-amber-700";

                  return (
                    <label
                      key={sp.id}
                      className={
                        "relative flex items-center p-3 rounded-lg border cursor-pointer hover:bg-slate-50 transition-colors group " +
                        (selectedTeacherUserId === teacherUserId ? "border-brand-primary bg-brand-primary/5" : "border-slate-200")
                      }
                      onClick={() => setSelectedTeacherUserId(teacherUserId)}
                    >
                      <input
                        type="radio"
                        name="teacher_select"
                        className="h-4 w-4 text-brand-primary border-slate-300 focus:ring-brand-primary cursor-pointer"
                        checked={selectedTeacherUserId === teacherUserId}
                        onChange={() => setSelectedTeacherUserId(teacherUserId)}
                      />
                      <div className="ml-3 flex items-center gap-3 w-full">
                        {sp.avatarUrl ? (
                          <img alt="" src={sp.avatarUrl} className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-brand-secondary/10 flex items-center justify-center text-brand-secondary font-bold text-xs">
                            {getInitials(sp.name || sp.email || "Docente")}
                          </div>
                        )}
                        <div className="flex-1">
                          <span className="block text-sm font-medium text-slate-900">{sp.name || sp.email}</span>
                          <span className="block text-xs text-slate-500">
                            {Array.isArray(sp.expertise) && sp.expertise.length > 0 ? sp.expertise[0] : ""}
                          </span>
                        </div>
                        <span className={"text-[10px] px-2 py-0.5 rounded-full " + badgeClass}>{badgeText}</span>
                      </div>
                      {selectedTeacherUserId === teacherUserId && (
                        <div className="absolute inset-0 rounded-lg ring-2 ring-brand-primary ring-opacity-20 pointer-events-none" />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="p-6 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={closePanel}
            className="flex-1 bg-white text-slate-700 border border-slate-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleAssign}
            className="flex-1 bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-primary/90 shadow-sm transition-colors flex justify-center items-center gap-2"
            disabled={saving || !selectedCourse}
          >
            <Save className="h-4 w-4" />
            {saving ? "Asignando..." : "Asignar"}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-3 text-center">Solo se permite un docente por curso.</p>
      </div>
    </div>
  );

  if (authLoading) return <Loader />;
  if (!user) return null;

  if (!allowed) {
    return (
      <div className="dashboard-card-soft">
        <p className="text-sm text-slate-600">No autorizado.</p>
      </div>
    );
  }

  return (
    <div className="-mx-4 -my-6 sm:-mx-6 lg:-mx-10">
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)] relative">
        <div className="flex-1 p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="relative w-full sm:w-96">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar curso por nombre o código..."
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg leading-5 bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-sm shadow-sm"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-2 sm:mt-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="block w-full sm:w-auto pl-3 pr-10 py-2.5 text-sm border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary rounded-lg bg-white shadow-sm appearance-none leading-5"
              >
                <option value="all">Todos los Estados</option>
                <option value="unassigned">Sin Docente</option>
                <option value="assigned">Asignado</option>
              </select>

              <button
                type="button"
                className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg shadow-sm text-white bg-brand-primary hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-brand-error/20 bg-brand-error/10 px-4 py-3 text-sm text-brand-error">
              {error}
            </div>
          )}

          {loading ? (
            <Loader />
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Curso
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Docente Asignado
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Lecciones
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {filteredCourses.map((course) => {
                      const hasTeacher = (course.speakerIds || []).length > 0;
                      const teacher = Array.isArray(course.speakers) ? course.speakers[0] : null;
                      const isSelected = selectedCourseId === course.id;
                      const imageUrl = course.coverImageUrl || course.thumbnailUrl;

                      return (
                        <tr
                          key={course.id}
                          onClick={() => setSelectedCourseId(course.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? "bg-brand-primary/5 hover:bg-brand-primary/10" : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-12 w-12 rounded-lg overflow-hidden bg-slate-100">
                                {imageUrl ? (
                                  <img alt={course.title} src={imageUrl as string} className="h-12 w-12 object-cover" />
                                ) : (
                                  <div className="h-12 w-12 bg-gradient-to-br from-brand-primary/10 to-brand-secondary/10" />
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-slate-900">{course.title}</div>
                                <div className="text-xs text-slate-500">ID: {course.id.slice(0, 8)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {hasTeacher && teacher ? (
                              <div className="flex items-center">
                                {teacher.photoURL ? (
                                  <img alt="" className="h-8 w-8 rounded-full" src={teacher.photoURL} />
                                ) : (
                                  <div className="h-8 w-8 rounded-full bg-brand-secondary/10 text-brand-secondary flex items-center justify-center text-xs font-bold">
                                    {getInitials(teacher.name || teacher.email || "Docente")}
                                  </div>
                                )}
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-slate-900">{teacher.name || teacher.email}</div>
                                  <div className="text-xs text-slate-500">Docente Titular</div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center text-slate-400">
                                <UserIcon className="h-5 w-5 mr-2" />
                                <span className="text-sm">Sin asignar</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {Array.isArray(course.lessons) ? course.lessons.length : 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                hasTeacher
                                  ? "bg-brand-success/10 text-brand-success"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {hasTeacher ? "Asignado" : "Sin Docente"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              type="button"
                              className={`${
                                hasTeacher ? "text-brand-secondary hover:text-brand-secondary/80" : "text-brand-primary hover:text-brand-primary/80"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCourseId(course.id);
                              }}
                            >
                              {hasTeacher ? "Editar" : "Gestionar"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredCourses.length === 0 && (
                <div className="text-center text-sm text-slate-500 py-12">No se encontraron cursos.</div>
              )}
            </div>
          )}
        </div>

        <aside className="hidden lg:flex w-96 bg-white border-l border-slate-200 flex-col shadow-xl">
          {panelBody}
        </aside>

        {selectedCourseId && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={closePanel} />
            <div className="absolute right-0 top-0 h-full w-full max-w-[24rem] bg-white shadow-xl">
              {panelBody}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
