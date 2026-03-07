import { create } from "zustand";

export const useUserStore: any = create((set) => ({
  user: null,
  setUser: (userData: any) => set({ user: userData }),
  logout: () => set({ user: null }),
}));
