/**
 * Small per-device UI preferences (not sensitive): stored in AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface PrefsState {
  /** Times the notification pre-prompt was shown (max 2: after first group, after the draw). */
  notificationPromptCount: number;
  /** groupId → last draw number the user opened in "¿A quién te tocó?". */
  seenDraw: Record<string, number>;
  /** Whether the "Ojo: no firmes con tu nombre." hint was already shown. */
  chatHintShown: boolean;
  /** groupId → message ids the user reported (shown as "Reportaste este mensaje"). */
  reported: Record<string, string[]>;
  bumpNotificationPrompt: () => void;
  markDrawSeen: (groupId: string, drawNumber: number) => void;
  markChatHintShown: () => void;
  markReported: (groupId: string, messageId: string) => void;
  reset: () => void;
}

const initial = {
  notificationPromptCount: 0,
  seenDraw: {},
  chatHintShown: false,
  reported: {},
};

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      ...initial,
      bumpNotificationPrompt: () =>
        set((s) => ({ notificationPromptCount: s.notificationPromptCount + 1 })),
      markDrawSeen: (groupId, drawNumber) =>
        set((s) => ({ seenDraw: { ...s.seenDraw, [groupId]: drawNumber } })),
      markChatHintShown: () => set({ chatHintShown: true }),
      markReported: (groupId, messageId) =>
        set((s) => ({
          reported: { ...s.reported, [groupId]: [...(s.reported[groupId] ?? []), messageId] },
        })),
      reset: () => set(initial),
    }),
    {
      name: 'entrenos.prefs.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        notificationPromptCount: s.notificationPromptCount,
        seenDraw: s.seenDraw,
        chatHintShown: s.chatHintShown,
        reported: s.reported,
      }),
    },
  ),
);

/** Invite code that arrived by link before the user signed in (memory only). */
interface PendingInviteState {
  code: string | null;
  set: (code: string | null) => void;
}

export const usePendingInvite = create<PendingInviteState>((set) => ({
  code: null,
  set: (code) => set({ code }),
}));
