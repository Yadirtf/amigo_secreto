import { Icons, type IconName } from '../icons';
import { useTheme } from '../theme';
import type { ColorName } from '../tokens';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: ColorName;
  /** Raw color, only for values coming from tokens (e.g. forced dark palette). */
  rawColor?: string;
  strokeWidth?: number;
}

/** Decorative icon: hidden from screen readers (the text next to it is read). */
export function Icon({ name, size = 24, color = 'textPrimary', rawColor, strokeWidth }: IconProps) {
  const theme = useTheme();
  const Cmp = Icons[name];
  return (
    <Cmp
      size={size}
      color={rawColor ?? theme.color[color]}
      strokeWidth={strokeWidth ?? (size <= 20 ? 1.75 : 2)}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    />
  );
}
