import { Ionicons } from '@expo/vector-icons';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppText } from './AppText';
import { ThemeColors } from '../../constants/colors';
import { motion } from '../../constants/motion';
import { useThemeColors } from '../../hooks/useThemeColors';

type ToastType = 'success' | 'error' | 'warning' | 'info';

type ToastPayload = {
  title: string;
  message?: string;
  type?: ToastType;
  durationMs?: number;
};

type ToastState = Required<Omit<ToastPayload, 'durationMs'>> & {
  id: number;
};

type ToastContextValue = {
  showToast: (payload: ToastPayload) => void;
  hideToast: () => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function getToastIcon(type: ToastType): keyof typeof Ionicons.glyphMap {
  if (type === 'success') return 'checkmark-circle-outline';
  if (type === 'error') return 'alert-circle-outline';
  if (type === 'warning') return 'warning-outline';

  return 'information-circle-outline';
}

function getToastTone(type: ToastType, colors: ThemeColors) {
  if (type === 'success') {
    return {
      icon: colors.income,
      background: colors.incomeSoft,
      border: colors.income,
    };
  }

  if (type === 'error') {
    return {
      icon: colors.expense,
      background: colors.expenseSoft,
      border: colors.expense,
    };
  }

  if (type === 'warning') {
    return {
      icon: colors.warning,
      background: colors.warningSoft,
      border: colors.warning,
    };
  }

  return {
    icon: colors.primary,
    background: colors.primarySoft,
    border: colors.primary,
  };
}

export function AppToastProvider({ children }: { children: ReactNode }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const [toast, setToast] = useState<ToastState | null>(null);
  const visibility = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const hideToast = useCallback(() => {
    clearHideTimer();

    Animated.timing(visibility, {
      toValue: 0,
      duration: motion.base,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setToast(null);
      }
    });
  }, [clearHideTimer, visibility]);

  const showToast = useCallback(
    (payload: ToastPayload) => {
      clearHideTimer();

      const nextToast: ToastState = {
        id: Date.now(),
        title: payload.title,
        message: payload.message || '',
        type: payload.type || 'info',
      };

      setToast(nextToast);

      visibility.setValue(0);

      Animated.spring(visibility, {
        toValue: 1,
        speed: motion.spring.speed,
        bounciness: motion.spring.bounciness,
        useNativeDriver: true,
      }).start();

      hideTimer.current = setTimeout(() => {
        hideToast();
      }, payload.durationMs ?? 2600);
    },
    [clearHideTimer, hideToast, visibility]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      hideToast,
      showSuccess: (title: string, message?: string) =>
        showToast({ title, message, type: 'success' }),
      showError: (title: string, message?: string) =>
        showToast({ title, message, type: 'error', durationMs: 3600 }),
      showWarning: (title: string, message?: string) =>
        showToast({ title, message, type: 'warning', durationMs: 3200 }),
      showInfo: (title: string, message?: string) =>
        showToast({ title, message, type: 'info' }),
    }),
    [hideToast, showToast]
  );

  const translateY = visibility.interpolate({
    inputRange: [0, 1],
    outputRange: [-24, 0],
  });

  const scale = visibility.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });

  const tone = toast ? getToastTone(toast.type, colors) : getToastTone('info', colors);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <View pointerEvents="box-none" style={styles.overlay}>
        {toast ? (
          <Animated.View
            style={[
              styles.toast,
              {
                opacity: visibility,
                transform: [{ translateY }, { scale }],
                borderColor: tone.border,
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              onPress={hideToast}
              style={({ pressed }) => [
                styles.toastPressable,
                pressed ? styles.toastPressed : null,
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: tone.background }]}>
                <Ionicons name={getToastIcon(toast.type)} size={21} color={tone.icon} />
              </View>

              <View style={styles.textBox}>
                <AppText variant="body" style={styles.title} numberOfLines={1}>
                  {toast.title}
                </AppText>

                {toast.message ? (
                  <AppText variant="caption" muted style={styles.message} numberOfLines={2}>
                    {toast.message}
                  </AppText>
                ) : null}
              </View>

              <Ionicons name="close-outline" size={18} color={colors.textMuted} />
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

export function useAppToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useAppToast must be used inside AppToastProvider.');
  }

  return context;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 48,
      zIndex: 999,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    toast: {
      width: '100%',
      maxWidth: 560,
      borderRadius: 22,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      shadowColor: colors.shadow,
      shadowOpacity: 0.24,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
      overflow: 'hidden',
    },
    toastPressable: {
      minHeight: 72,
      padding: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    toastPressed: {
      opacity: 0.86,
    },
    iconBox: {
      width: 42,
      height: 42,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textBox: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      color: colors.text,
      fontWeight: '900',
    },
    message: {
      marginTop: 3,
      lineHeight: 17,
    },
  });
}
