/**
 * Light/dark choice made by the user in Perfil → Tema. Kept apart from the
 * other prefs so signing out never resets it (it belongs to the device).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Appearance } from 'react-native';
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

/** Native views (keyboard, dialogs, date picker) follow the same choice. */
export function applyNativeAppearance(mode: AppearanceMode): void {
  try {
    Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
  } catch {
    // Older runtimes: the app theme still follows the choice.
  }
}

export const useAppearance = create<AppearanceState>()(
  persist(
    (set) => ({
      // The app opens in light mode until the user picks something else.
      mode: 'light',
      setMode: (mode) => {
        applyNativeAppearance(mode);
        set({ mode });
      },
    }),
    {
      name: 'entrenos.appearance.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ mode: s.mode }),
      onRehydrateStorage: () => (state) => applyNativeAppearance(state?.mode ?? 'light'),
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
