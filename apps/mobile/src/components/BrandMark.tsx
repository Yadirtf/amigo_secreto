import Svg, { Circle, ClipPath, Defs, G, Path } from 'react-native-svg';

/**
 * The brand mark (docs/ux/logo.svg): two speech bubbles, the golden
 * intersection is the secret "entre nos". Graphic colors from identidad §6.
 */
export function BrandMark({ size = 96, dark = false }: { size?: number; dark?: boolean }) {
  const green = dark ? '#3FA488' : '#1F6F5C';
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
        <Path d="M24 80 L14 100 L40 88 Z" fill="#EE6352" />
        <Path d="M98 80 L108 100 L82 88 Z" fill={green} />
        <Circle cx="48" cy="56" r="34" fill="#EE6352" />
        <Circle cx="74" cy="56" r="34" fill={green} />
        <Circle cx="74" cy="56" r="34" fill="#E8B54A" clipPath="url(#enA)" />
        <Path
          d="M61 44 Q62.6 54.4 72 56 Q62.6 57.6 61 68 Q59.4 57.6 50 56 Q59.4 54.4 61 44 Z"
          fill="#FFF8F3"
        />
      </G>
    </Svg>
  );
}
