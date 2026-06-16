import { useColorScheme } from 'react-native';
import { darkColors, lightColors } from '../constants/colors';
import { ThemeMode, useThemeStore } from '../stores/useThemeStore';

export function resolveThemeMode(
  themeMode: ThemeMode,
  deviceScheme: 'light' | 'dark' | null | undefined
) {
  if (themeMode === 'system') {
    return deviceScheme === 'light' ? 'light' : 'dark';
  }

  return themeMode;
}

export function useResolvedThemeMode() {
  const deviceScheme = useColorScheme();
  const themeMode = useThemeStore((state) => state.themeMode);

  return resolveThemeMode(themeMode, deviceScheme);
}

export function useThemeColors() {
  const resolvedThemeMode = useResolvedThemeMode();

  return resolvedThemeMode === 'light' ? lightColors : darkColors;
}
