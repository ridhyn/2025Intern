/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const TINT_COLORS = {
  light: '#0a7ea4',
  dark: '#fff',
} as const;

const NEUTRAL_COLORS = {
  light: {
    text: '#11181C',
    background: '#fff',
    icon: '#687076',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    icon: '#9BA1A6',
  },
} as const;

export const Colors = {
  light: {
    ...NEUTRAL_COLORS.light,
    tint: TINT_COLORS.light,
    tabIconDefault: NEUTRAL_COLORS.light.icon,
    tabIconSelected: TINT_COLORS.light,
  },
  dark: {
    ...NEUTRAL_COLORS.dark,
    tint: TINT_COLORS.dark,
    tabIconDefault: NEUTRAL_COLORS.dark.icon,
    tabIconSelected: TINT_COLORS.dark,
  },
} as const;
