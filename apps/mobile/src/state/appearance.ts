/**
 * Light/dark choice made by the user in Perfil → Tema. Kept apart from the
 * other prefs so signing out never resets it (it belongs to the device).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type AppearanceMode = 'light' | 'dark' | 'system';

export const APPEARANCE_LABEL: Record<AppearanceMode, string> = {
  light: 'Claro',
  dark: 'Oscuro',
  system: 'Como el teléfono',
};

interface AppearanceState {
  mode: AppearanceMode;
  setMode: (mode: AppearanceMode) => void;
}

// The choice only drives our ThemeProvider. We deliberately do not call
// Appearance.setColorScheme: on Android it changes the night mode, which
// recreates the activity, and a recreate during startup brought the native
// splash back after it was hidden (app stuck on the splash, seen in e2e).
// Native pieces (keyboard, system dialogs) keep following the phone.

export const useAppearance = create<AppearanceState>()(
  persist(
    (set) => ({
      // The app opens in light mode until the user picks something else.
      mode: 'light',
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'entrenos.appearance.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ mode: s.mode }),
    },
  ),
);

/** True once the stored choice was read, so the first frame uses the right theme. */
export function useAppearanceHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useAppearance.persist.hasHydrated());
  useEffect(() => {
    if (hydrated) return;
    const unsub = useAppearance.persist.onFinishHydration(() => setHydrated(true));
    if (useAppearance.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, [hydrated]);
  return hydrated;
}
