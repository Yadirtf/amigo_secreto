/**
 * Haptics, only for the events in the style guide §8.3 (never on every tap).
 */
import * as Haptics from 'expo-haptics';

const safe = (p: Promise<void>) => {
  p.catch(() => undefined);
};

export const haptics = {
  selection: () => safe(Haptics.selectionAsync()),
  tapLight: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  tapMedium: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  reveal: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  success: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
