import { Image } from 'react-native';
import mascot from '../../assets/logo-mascota.png';
const RATIO = 864 / 900;

/**
 * The brand mascot (docs/ux/logo-regalo.png): a gift in a mask asking for
 * silence, the secret "entre nos". The art has no background, so it reads on
 * both themes; `dark` is kept for API compatibility.
 */
export function BrandMark({ size = 96 }: { size?: number; dark?: boolean }) {
  return (
    <Image
      source={mascot}
      style={{ width: size, height: size * RATIO }}
      resizeMode="contain"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    />
  );
}
