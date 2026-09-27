/**
 * Design tokens. Green inspired by the Bangladesh flag, with a warm coral accent.
 * Every screen reads colours through `useTheme()` so light & dark mode stay in sync.
 */

const light = {
  primary: '#0E8F63',
  primaryPressed: '#0B7652',
  primarySoft: '#E5F5EE',
  onPrimary: '#FFFFFF',
  accent: '#F2545B',
  accentSoft: '#FDECED',

  bg: '#F4F6F9',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF1F5',
  border: '#E3E7ED',
  borderStrong: '#C9D1DC',

  text: '#0F172A',
  textMuted: '#556173',
  textSubtle: '#8D99AB',
  textInverse: '#FFFFFF',

  success: '#15984A',
  successSoft: '#E6F6EC',
  warning: '#C96A04',
  warningSoft: '#FEF3E4',
  danger: '#E0474C',
  dangerSoft: '#FDEBEC',
  info: '#2563EB',
  infoSoft: '#E9F0FE',
  star: '#F5A524',

  overlay: 'rgba(15, 23, 42, 0.45)',
  skeleton: '#E6EAF0',
  heroFrom: '#0E8F63',
  heroTo: '#0B6C85',
  shadow: 'rgba(15, 23, 42, 0.07)',
  // Chart mark colour, validated (lightness band + contrast) against the light surface.
  chart: '#0E8F63',
};

const dark: typeof light = {
  primary: '#2BC48E',
  primaryPressed: '#22A977',
  primarySoft: 'rgba(43, 196, 142, 0.14)',
  onPrimary: '#03140D',
  accent: '#FF6B71',
  accentSoft: 'rgba(255, 107, 113, 0.14)',

  bg: '#090D12',
  surface: '#11171F',
  surfaceAlt: '#18202A',
  border: '#212B37',
  borderStrong: '#344152',

  text: '#EEF2F7',
  textMuted: '#9DA9B9',
  textSubtle: '#697587',
  textInverse: '#FFFFFF',

  success: '#3DD68C',
  successSoft: 'rgba(61, 214, 140, 0.14)',
  warning: '#F7B955',
  warningSoft: 'rgba(247, 185, 85, 0.14)',
  danger: '#FF7A7F',
  dangerSoft: 'rgba(255, 122, 127, 0.14)',
  info: '#6EA8FF',
  infoSoft: 'rgba(110, 168, 255, 0.14)',
  star: '#FBBF24',

  overlay: 'rgba(0, 0, 0, 0.6)',
  skeleton: '#1A232E',
  heroFrom: '#0C6B4B',
  heroTo: '#0A4A5E',
  shadow: 'rgba(0, 0, 0, 0.35)',
  // Slightly deeper than `primary` so bars stay inside the dark-mode lightness band.
  chart: '#22AD7D',
};

export type ColorName = keyof typeof light;

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const typography = {
  display: { fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 37, letterSpacing: -0.6 },
  title: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 31, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  subheading: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  bodySemibold: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  smallMedium: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  smallBold: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  overline: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 0.8, textTransform: 'uppercase' as const },
} as const;

export type TypographyVariant = keyof typeof typography;

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 48 } as const;
export const radii = { xs: 6, sm: 10, md: 14, lg: 18, xl: 22, xxl: 28, pill: 999 } as const;

export type Theme = {
  dark: boolean;
  colors: typeof light;
  shadow: { card: string; raised: string };
};

export const lightTheme: Theme = {
  dark: false,
  colors: light,
  shadow: {
    card: '0px 2px 10px rgba(15, 23, 42, 0.05)',
    raised: '0px 10px 30px rgba(15, 23, 42, 0.12)',
  },
};

export const darkTheme: Theme = {
  dark: true,
  colors: dark,
  shadow: {
    card: '0px 0px 0px rgba(0, 0, 0, 0)',
    raised: '0px 12px 32px rgba(0, 0, 0, 0.5)',
  },
};
