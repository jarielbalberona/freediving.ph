import { create } from "zustand";

type MobileShellState = {
  isMenuOpen: boolean;
  closeMenu: () => void;
  openMenu: () => void;
  toggleMenu: () => void;
};

export const useMobileShellStore = create<MobileShellState>((set) => ({
  isMenuOpen: false,
  closeMenu: () => set({ isMenuOpen: false }),
  openMenu: () => set({ isMenuOpen: true }),
  toggleMenu: () => set((state) => ({ isMenuOpen: !state.isMenuOpen })),
}));
