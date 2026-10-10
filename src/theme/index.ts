import { Platform } from 'react-native';

export const colors = {
  background: '#090B0E',
  surface: '#12161C',
  surfaceRaised: '#181E26',
  surfaceTint: '#202833',
  line: '#2A323D',
  text: '#F5F7F2',
  muted: '#98A19A',
  lime: '#C8FF3D',
  limeDark: '#28350A',
  cyan: '#54D8FF',
  orange: '#FF9B52',
  red: '#FF6B6B',
  white: '#FFFFFF',
  black: '#000000'
} as const;

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, huge: 48 } as const;
export const shadow = Platform.select({
  web: { boxShadow: '0 16px 60px rgba(0,0,0,0.22)' } as const,
  default: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 4 }
}) ?? {};

export const font = {
  display: 'BarlowCondensed_900Black',
  displayAlt: 'BarlowCondensed_700Bold',
  body: 'Inter_400Regular',
  bodySemibold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  data: 'Inter_600SemiBold',
  mono: 'Inter_600SemiBold'
} as const;
