import { create } from 'zustand';

import { type UserInterface } from './ability';

interface AuthState {
  user: UserInterface | null;
  setUser: (user: UserInterface) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
