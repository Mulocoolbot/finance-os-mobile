import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { AppToastProvider } from '../src/components/ui/AppToast';
import { EMBEDDED_EXCHANGE_RATE_CONFIG } from '../src/config/exchangeRateConfig';
import { useThemeColors, useResolvedThemeMode } from '../src/hooks/useThemeColors';
import { runInvestmentPriceSyncOnAppOpen } from '../src/services/investmentAppOpenPriceSync';
import { useFinanceStore } from '../src/stores/useFinanceStore';
import { useThemeStore } from '../src/stores/useThemeStore';

const screenTransitionOptions = {
  animation: 'slide_from_right' as const,
  animationDuration: 220,
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
};

export default function RootLayout() {
  const colors = useThemeColors();
  const resolvedThemeMode = useResolvedThemeMode();

  const hydrateThemeMode = useThemeStore((state) => state.hydrateThemeMode);
  const hydrateFinanceData = useFinanceStore((state) => state.hydrateFinanceData);
  const refreshExchangeRatesIfStale = useFinanceStore(
    (state) => state.refreshExchangeRatesIfStale
  );
  const refreshExchangeRatesOnAppOpen = useFinanceStore(
    (state) => state.refreshExchangeRatesOnAppOpen
  );

  useEffect(() => {
    let isMounted = true;

    async function bootstrapApp() {
      await hydrateThemeMode();
      await hydrateFinanceData();

      if (isMounted) {
        await refreshExchangeRatesOnAppOpen();
        await runInvestmentPriceSyncOnAppOpen('startup');
      }
    }

    void bootstrapApp();

    return () => {
      isMounted = false;
    };
  }, [hydrateThemeMode, hydrateFinanceData, refreshExchangeRatesOnAppOpen]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void refreshExchangeRatesOnAppOpen().finally(() => {
          void runInvestmentPriceSyncOnAppOpen('foreground');
        });
      }
    });

    const realtimeRefreshTimer = setInterval(() => {
      void refreshExchangeRatesIfStale();
    }, EMBEDDED_EXCHANGE_RATE_CONFIG.realtimeRefreshIntervalMs);

    return () => {
      subscription.remove();
      clearInterval(realtimeRefreshTimer);
    };
  }, [refreshExchangeRatesIfStale, refreshExchangeRatesOnAppOpen]);

  return (
    <AppToastProvider>
      <StatusBar style={resolvedThemeMode === 'light' ? 'dark' : 'light'} />

      <Stack
        screenOptions={{
          headerShown: false,
          ...screenTransitionOptions,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      />
    </AppToastProvider>
  );
}
