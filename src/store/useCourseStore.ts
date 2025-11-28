import { create } from "zustand";
import { Course } from "@/types/course";

interface CourseState {
  courses: Course[];
  selectedCourse: Course | null;
  setCourses: (courses: Course[]) => void;
  addCourse: (course: Course) => void;
  updateCourse: (id: string, course: Partial<Course>) => void;
  removeCourse: (id: string) => void;
  setSelectedCourse: (course: Course | null) => void;
  clearCourses: () => void;
}

export const useCourseStore = create<CourseState>((set) => ({
  courses: [],
  selectedCourse: null,

  setCourses: (courses) => set({ courses }),

  addCourse: (course) =>
    set((state) => ({
      courses: [course, ...state.courses],
    })),

  updateCourse: (id, updatedCourse) =>
    set((state) => ({
      courses: state.courses.map((course) =>
        course.id === id ? { ...course, ...updatedCourse } : course
      ),
    })),

  removeCourse: (id) =>
    set((state) => ({
      courses: state.courses.filter((course) => course.id !== id),
    })),

  setSelectedCourse: (course) => set({ selectedCourse: course }),

  clearCourses: () => set({ courses: [], selectedCourse: null }),
}));
