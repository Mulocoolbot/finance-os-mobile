import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light' | 'system';

const THEME_STORAGE_KEY = 'finance-os-mobile-theme-mode';

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'dark' || value === 'light' || value === 'system';
}

type ThemeStore = {
  themeMode: ThemeMode;
  hasHydratedTheme: boolean;
  setThemeMode: (themeMode: ThemeMode) => void;
  hydrateThemeMode: () => Promise<void>;
  resetThemeMode: () => void;
};

export const useThemeStore = create<ThemeStore>((set) => ({
  themeMode: 'dark',
  hasHydratedTheme: false,

  setThemeMode: (themeMode) => {
    set({ themeMode });

    AsyncStorage.setItem(THEME_STORAGE_KEY, themeMode).catch(() => {
      // Keep the selected theme in memory even if local save fails.
    });
  },

  hydrateThemeMode: async () => {
    try {
      const storedThemeMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);

      if (isThemeMode(storedThemeMode)) {
        set({
          themeMode: storedThemeMode,
          hasHydratedTheme: true,
        });

        return;
      }

      set({
        hasHydratedTheme: true,
      });
    } catch {
      set({
        hasHydratedTheme: true,
      });
    }
  },

  resetThemeMode: () => {
    set({
      themeMode: 'dark',
    });

    AsyncStorage.removeItem(THEME_STORAGE_KEY).catch(() => {
      // Ignore reset storage failure.
    });
  },
}));
