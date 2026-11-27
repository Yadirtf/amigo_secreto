import Svg, { Circle, ClipPath, Defs, G, Path } from 'react-native-svg';

/**
 * The brand mark (docs/ux/logo.svg): two speech bubbles, the golden
 * intersection is the secret "entre nos". Pastel graphic colors from identidad §6 (palette 1.1).
 */
export function BrandMark({ size = 96, dark = false }: { size?: number; dark?: boolean }) {
  const mint = dark ? '#86E0C6' : '#52C7A5';
  const coral = dark ? '#FF9E8A' : '#FF7F6B';
  return (
    <Svg
      width={size}
      height={size * (98 / 114)}
      viewBox="4 12 114 98"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Defs>
        <ClipPath id="enA">
          <Circle cx="48" cy="56" r="34" />
        </ClipPath>
      </Defs>
      <G>
        <Path d="M24 80 L14 100 L40 88 Z" fill={coral} />
        <Path d="M98 80 L108 100 L82 88 Z" fill={mint} />
        <Circle cx="48" cy="56" r="34" fill={coral} />
        <Circle cx="74" cy="56" r="34" fill={mint} />
        <Circle cx="74" cy="56" r="34" fill="#FFD166" clipPath="url(#enA)" />
        <Path
          d="M61 44 Q62.6 54.4 72 56 Q62.6 57.6 61 68 Q59.4 57.6 50 56 Q59.4 54.4 61 44 Z"
          fill="#FFFFFF"
        />
      </G>
    </Svg>
  );
}
