import { create } from "zustand";
import { User } from "@/types/user";

interface UserState {
  user: User | null;
  setUser: (user: User | null) => void;
  clearUser: () => void;
  isAdmin: () => boolean;
  isInstructor: () => boolean;
  isStudent: () => boolean;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,

  setUser: (user) => set({ user }),

  clearUser: () => set({ user: null }),

  isAdmin: () => get().user?.role === "admin",

  isInstructor: () => {
    const role = get().user?.role;
    return role === "admin" || role === "instructor";
  },

  isStudent: () => get().user?.role === "student",
}));
