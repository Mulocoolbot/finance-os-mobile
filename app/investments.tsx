import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { AnimatedPressable } from '../src/components/ui/AnimatedPressable';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { StatCard } from '../src/components/ui/StatCard';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { fetchInvestmentPriceForHolding, isPriceSyncSupportedHolding } from '../src/services/investmentPriceSync';
import { addInvestmentPriceSyncHistory, InvestmentPriceSyncHistoryDetail } from '../src/services/investmentPriceSyncHistory';
import { useFinanceStore } from '../src/stores/useFinanceStore';
import { Account, Currency, InvestmentAssetType, InvestmentHolding } from '../src/types/finance';
import { formatCurrency } from '../src/utils/currency';
import { convertCurrencyAmount } from '../src/utils/currencyConversion';
import { formatCompactCurrency } from '../src/utils/formatCompactCurrency';

function isInvestmentAccount(account: Account) {
  return account.type === 'broker' || account.type === 'crypto_wallet';
}

function getAssetIcon(type: InvestmentAssetType) {
  if (type === 'crypto') return 'logo-bitcoin';
  if (type === 'stock') return 'business-outline';
  if (type === 'fund') return 'pie-chart-outline';
  if (type === 'etf') return 'layers-outline';
  if (type === 'bond') return 'shield-checkmark-outline';

  return 'diamond-outline';
}

function getAssetTypeLabel(type: InvestmentAssetType) {
  if (type === 'crypto') return 'Crypto';
  if (type === 'stock') return 'Stock';
  if (type === 'fund') return 'Fund';
  if (type === 'etf') return 'ETF';
  if (type === 'bond') return 'Bond';

  return 'Other';
}

function getHoldingCost(holding: InvestmentHolding) {
  return holding.quantity * holding.averagePrice;
}

function getHoldingValue(holding: InvestmentHolding) {
  return holding.quantity * holding.currentPrice;
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return '0.0%';
  }

  return `${value.toFixed(1)}%`;
}

type InvestmentPerformanceItem = {
  label: string;
  buyValue: number;
  sellValue: number;
  realizedPnL: number;
};

function getInvestmentPerformanceItems(
  orders: ReturnType<typeof useFinanceStore.getState>['investmentOrders'],
  selectedYear: number,
  defaultCurrency: Currency,
  exchangeRates: Record<Currency, number>
): InvestmentPerformanceItem[] {
  return Array.from({ length: 12 }).map((_, monthIndex) => {
    const monthOrders = orders.filter((order) => {
      const date = new Date(order.date);

      return (
        !Number.isNaN(date.getTime()) &&
        date.getFullYear() === selectedYear &&
        date.getMonth() === monthIndex
      );
    });

    const buyValue = monthOrders
      .filter((order) => order.orderType === 'buy')
      .reduce((total, order) => {
        return (
          total +
          convertCurrencyAmount(
            order.totalAmount,
            order.currency,
            defaultCurrency,
            exchangeRates
          )
        );
      }, 0);

    const sellValue = monthOrders
      .filter((order) => order.orderType === 'sell')
      .reduce((total, order) => {
        return (
          total +
          convertCurrencyAmount(
            order.totalAmount,
            order.currency,
            defaultCurrency,
            exchangeRates
          )
        );
      }, 0);

    const realizedPnL = monthOrders
      .filter((order) => order.orderType === 'sell')
      .reduce((total, order) => {
        return (
          total +
          convertCurrencyAmount(
            order.realizedPnL,
            order.currency,
            defaultCurrency,
            exchangeRates
          )
        );
      }, 0);

    const label = new Intl.DateTimeFormat('en-US', {
      month: 'short',
    }).format(new Date(selectedYear, monthIndex, 1));

    return {
      label,
      buyValue,
      sellValue,
      realizedPnL,
    };
  });
}

function getMaxInvestmentPerformanceValue(items: InvestmentPerformanceItem[]) {
  const values = items.flatMap((item) => [
    item.buyValue,
    item.sellValue,
    Math.abs(item.realizedPnL),
  ]);

  return Math.max(...values, 1);
}

type HoldingFilter = 'all' | 'profit' | 'loss' | 'stock' | 'crypto';
type HoldingSort = 'value' | 'pnl' | 'symbol';

const holdingFilters: {
  label: string;
  value: HoldingFilter;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { label: 'All', value: 'all', icon: 'apps-outline' },
  { label: 'Profit', value: 'profit', icon: 'trending-up-outline' },
  { label: 'Loss', value: 'loss', icon: 'trending-down-outline' },
  { label: 'Stock', value: 'stock', icon: 'business-outline' },
  { label: 'Crypto', value: 'crypto', icon: 'logo-bitcoin' },
];

const holdingSorts: {
  label: string;
  value: HoldingSort;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { label: 'Value', value: 'value', icon: 'cash-outline' },
  { label: 'P/L', value: 'pnl', icon: 'analytics-outline' },
  { label: 'Symbol', value: 'symbol', icon: 'text-outline' },
];

export default function InvestmentsScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const accounts = useFinanceStore((state) => state.accounts);
  const investmentHoldings = useFinanceStore((state) => state.investmentHoldings);
  const investmentOrders = useFinanceStore((state) => state.investmentOrders);
  const deleteInvestmentHolding = useFinanceStore((state) => state.deleteInvestmentHolding);
  const updateInvestmentHoldingPrice = useFinanceStore((state) => state.updateInvestmentHoldingPrice);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);
  const exchangeRates = useFinanceStore((state) => state.exchangeRates);
  const [activeFilter, setActiveFilter] = useState<HoldingFilter>('all');
  const [activeSort, setActiveSort] = useState<HoldingSort>('value');
  const [isSyncingPrices, setIsSyncingPrices] = useState(false);
  const [lastPriceSyncSummary, setLastPriceSyncSummary] = useState('Prices auto-update when app opens. Manual sync is still available.');
  const performanceReveal = useRef(new Animated.Value(0)).current;

  const investmentAccounts = useMemo(() => {
    return accounts.filter((account) => account.isActive && isInvestmentAccount(account));
  }, [accounts]);

  const filteredHoldings = useMemo(() => {
    const filteredItems = investmentHoldings.filter((holding) => {
      const holdingValue = getHoldingValue(holding);
      const holdingCost = getHoldingCost(holding);
      const pnl = holdingValue - holdingCost;

      if (activeFilter === 'profit') {
        return pnl > 0;
      }

      if (activeFilter === 'loss') {
        return pnl < 0;
      }

      if (activeFilter === 'stock') {
        return holding.assetType === 'stock';
      }

      if (activeFilter === 'crypto') {
        return holding.assetType === 'crypto';
      }

      return true;
    });

    return [...filteredItems].sort((firstHolding, secondHolding) => {
      if (activeSort === 'symbol') {
        return firstHolding.symbol.localeCompare(secondHolding.symbol);
      }

      const firstValue = getHoldingValue(firstHolding);
      const secondValue = getHoldingValue(secondHolding);

      if (activeSort === 'pnl') {
        const firstPnl = firstValue - getHoldingCost(firstHolding);
        const secondPnl = secondValue - getHoldingCost(secondHolding);

        return secondPnl - firstPnl;
      }

      return secondValue - firstValue;
    });
  }, [investmentHoldings, activeFilter, activeSort]);

  const summary = useMemo(() => {
    const totalCost = investmentHoldings.reduce((total, holding) => {
      return (
        total +
        convertCurrencyAmount(
          getHoldingCost(holding),
          holding.currency,
          defaultCurrency,
          exchangeRates
        )
      );
    }, 0);

    const totalValue = investmentHoldings.reduce((total, holding) => {
      return (
        total +
        convertCurrencyAmount(
          getHoldingValue(holding),
          holding.currency,
          defaultCurrency,
          exchangeRates
        )
      );
    }, 0);

    const realizedPnL = investmentOrders.reduce((total, order) => {
      return (
        total +
        convertCurrencyAmount(
          order.realizedPnL,
          order.currency,
          defaultCurrency,
          exchangeRates
        )
      );
    }, 0);

    const sellOrderCount = investmentOrders.filter(
      (order) => order.orderType === 'sell'
    ).length;

    return {
      totalCost,
      totalValue,
      unrealizedPnL: totalValue - totalCost,
      realizedPnL,
      sellOrderCount,
      holdingCount: investmentHoldings.length,
      accountCount: investmentAccounts.length,
    };
  }, [
    investmentHoldings,
    investmentOrders,
    investmentAccounts,
    defaultCurrency,
    exchangeRates,
  ]);

  const allocationItems = useMemo(() => {
    const allocationMap = investmentHoldings.reduce<
      Record<string, { label: string; value: number; count: number }>
    >((result, holding) => {
      const label = getAssetTypeLabel(holding.assetType);
      const convertedValue = convertCurrencyAmount(
        getHoldingValue(holding),
        holding.currency,
        defaultCurrency,
        exchangeRates
      );

      if (!result[holding.assetType]) {
        result[holding.assetType] = {
          label,
          value: 0,
          count: 0,
        };
      }

      result[holding.assetType].value += convertedValue;
      result[holding.assetType].count += 1;

      return result;
    }, {});

    return Object.values(allocationMap)
      .map((item) => ({
        ...item,
        percentage:
          summary.totalValue > 0 ? (item.value / summary.totalValue) * 100 : 0,
      }))
      .sort((firstItem, secondItem) => secondItem.value - firstItem.value);
  }, [investmentHoldings, defaultCurrency, exchangeRates, summary.totalValue]);

  const accountAllocationItems = useMemo(() => {
    const allocationMap = investmentHoldings.reduce<
      Record<string, { label: string; value: number; count: number; currency: string }>
    >((result, holding) => {
      const account = accounts.find((item) => item.id === holding.accountId);
      const label = account?.name || 'Investment Account';
      const convertedValue = convertCurrencyAmount(
        getHoldingValue(holding),
        holding.currency,
        defaultCurrency,
        exchangeRates
      );

      if (!result[holding.accountId]) {
        result[holding.accountId] = {
          label,
          value: 0,
          count: 0,
          currency: account?.currency || holding.currency,
        };
      }

      result[holding.accountId].value += convertedValue;
      result[holding.accountId].count += 1;

      return result;
    }, {});

    return Object.values(allocationMap)
      .map((item) => ({
        ...item,
        percentage:
          summary.totalValue > 0 ? (item.value / summary.totalValue) * 100 : 0,
      }))
      .sort((firstItem, secondItem) => secondItem.value - firstItem.value);
  }, [
    investmentHoldings,
    accounts,
    defaultCurrency,
    exchangeRates,
    summary.totalValue,
  ]);

  const selectedPerformanceYear = new Date().getFullYear();

  const performanceItems = useMemo(() => {
    return getInvestmentPerformanceItems(
      investmentOrders,
      selectedPerformanceYear,
      defaultCurrency,
      exchangeRates
    );
  }, [
    investmentOrders,
    selectedPerformanceYear,
    defaultCurrency,
    exchangeRates,
  ]);

  const maxPerformanceValue = useMemo(() => {
    return getMaxInvestmentPerformanceValue(performanceItems);
  }, [performanceItems]);
  const performanceAnimationKey = useMemo(() => {
    return performanceItems
      .map((item) => `${item.label}:${item.buyValue}:${item.sellValue}:${item.realizedPnL}`)
      .join('|');
  }, [performanceItems]);

  useEffect(() => {
    performanceReveal.stopAnimation();
    performanceReveal.setValue(0);

    Animated.timing(performanceReveal, {
      toValue: 1,
      duration: Math.min(1400, 460 + performanceItems.length * 70),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [performanceAnimationKey, performanceItems.length, performanceReveal]);

  const pnlIsPositive = summary.unrealizedPnL >= 0;
  const realizedPnlIsPositive = summary.realizedPnL >= 0;

  async function handleSyncPrices() {
    if (isSyncingPrices) {
      return;
    }

    const supportedHoldings = investmentHoldings.filter(isPriceSyncSupportedHolding);
    const skippedHoldings = investmentHoldings.filter(
      (holding) => !isPriceSyncSupportedHolding(holding)
    );

    if (supportedHoldings.length === 0) {
      Alert.alert(
        'Finance OS Mobile',
        'No supported holdings to sync. Crypto, stock, ETF, and fund are supported.'
      );
      return;
    }

    setIsSyncingPrices(true);
    setLastPriceSyncSummary(`Syncing ${supportedHoldings.length} asset price...`);

    let successCount = 0;
    let failedCount = 0;
    const providers = new Set<string>();
    const syncDetails: InvestmentPriceSyncHistoryDetail[] = skippedHoldings.map(
      (holding) => ({
        holdingId: holding.id,
        symbol: holding.symbol,
        name: holding.name,
        assetType: holding.assetType,
        currency: holding.currency,
        status: 'skipped',
        oldPrice: holding.currentPrice,
        newPrice: holding.currentPrice,
        message: 'This asset type is not supported by manual price sync yet.',
      })
    );

    for (const holding of supportedHoldings) {
      const oldPrice = holding.currentPrice;

      try {
        const result = await fetchInvestmentPriceForHolding(holding, exchangeRates);
        const updateResult = updateInvestmentHoldingPrice({
          holdingId: holding.id,
          currentPrice: result.currentPrice,
          source: 'sync',
          provider: result.provider,
          recordedAt: result.sourceUpdatedAt,
        });

        if (updateResult.success) {
          successCount += 1;
          providers.add(result.provider);

          syncDetails.push({
            holdingId: holding.id,
            symbol: holding.symbol,
            name: holding.name,
            assetType: holding.assetType,
            currency: holding.currency,
            status: 'success',
            oldPrice,
            newPrice: result.currentPrice,
            provider: result.provider,
            sourceUpdatedAt: result.sourceUpdatedAt,
            message: 'Price updated successfully.',
          });
        } else {
          failedCount += 1;

          syncDetails.push({
            holdingId: holding.id,
            symbol: holding.symbol,
            name: holding.name,
            assetType: holding.assetType,
            currency: holding.currency,
            status: 'failed',
            oldPrice,
            newPrice: oldPrice,
            message: updateResult.message,
          });
        }
      } catch (error) {
        failedCount += 1;

        syncDetails.push({
          holdingId: holding.id,
          symbol: holding.symbol,
          name: holding.name,
          assetType: holding.assetType,
          currency: holding.currency,
          status: 'failed',
          oldPrice,
          newPrice: oldPrice,
          message:
            error instanceof Error
              ? error.message
              : 'Provider failed. Last/manual price is kept.',
        });
      }
    }

    const skippedCount = skippedHoldings.length;
    const providerText =
      providers.size > 0 ? Array.from(providers).join(', ') : 'no provider';
    const summaryText =
      failedCount === 0
        ? `Updated ${successCount}/${supportedHoldings.length} prices via ${providerText}.`
        : `Updated ${successCount}/${supportedHoldings.length} prices. ${failedCount} kept last/manual price.`;

    await addInvestmentPriceSyncHistory({
      summary: summaryText,
      totalCount: investmentHoldings.length,
      successCount,
      failedCount,
      skippedCount,
      providers: Array.from(providers),
      details: syncDetails,
    });

    setLastPriceSyncSummary(summaryText);
    setIsSyncingPrices(false);

    Alert.alert('Finance OS Mobile', summaryText);
  }

  function handleDeleteHolding(holding: InvestmentHolding) {
    Alert.alert(
      'Delete Holding',
      `Delete ${holding.symbol} from your portfolio?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const result = deleteInvestmentHolding(holding.id);
            Alert.alert('Finance OS Mobile', result.message);
          },
        },
      ]
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
          </Pressable>

          <View style={styles.headerText}>
            <AppText variant="caption" muted>
              Portfolio
            </AppText>

            <AppText variant="title" style={styles.title} numberOfLines={1}>
              Investments
            </AppText>
          </View>
        </View>

        <View style={styles.headerActionRow}>
          <Pressable
            onPress={handleSyncPrices}
            disabled={isSyncingPrices}
            style={[styles.headerActionPill, isSyncingPrices && styles.disabledButton]}
          >
            <Ionicons
              name={isSyncingPrices ? 'sync-outline' : 'cloud-download-outline'}
              size={17}
              color={colors.text}
            />

            <AppText variant="caption" style={styles.headerActionText}>
              Sync
            </AppText>
          </Pressable>

          <Pressable
            onPress={() => router.push('/investment-orders')}
            style={styles.headerActionPill}
          >
            <Ionicons name="receipt-outline" size={17} color={colors.text} />

            <AppText variant="caption" style={styles.headerActionText}>
              Orders
            </AppText>
          </Pressable>

          <Pressable
            onPress={() => router.push('/buy-investment-asset')}
            style={styles.headerActionPrimary}
          >
            <Ionicons name="cart-outline" size={17} color={colors.black} />

            <AppText variant="caption" style={styles.headerActionPrimaryText}>
              Buy
            </AppText>
          </Pressable>

          <Pressable
            onPress={() => router.push('/add-investment-holding')}
            style={styles.headerActionPill}
          >
            <Ionicons name="archive-outline" size={17} color={colors.text} />

            <AppText variant="caption" style={styles.headerActionText}>
              Manual
            </AppText>
          </Pressable>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Ionicons name="trending-up-outline" size={26} color={colors.black} />
          </View>

          <View style={styles.heroTextBox}>
            <AppText variant="caption" style={styles.heroLabel}>
              Portfolio Value
            </AppText>

            <AppText variant="title" style={styles.heroValue} numberOfLines={1}>
              {formatCompactCurrency(summary.totalValue, defaultCurrency)}
            </AppText>


          </View>
        </View>

        <View style={styles.pnlBox}>
          <AppText variant="caption" style={styles.pnlLabel}>
            Unrealized P/L
          </AppText>

          <AppText
            variant="subtitle"
            style={[
              styles.pnlValue,
              { color: pnlIsPositive ? colors.income : colors.expense },
            ]}
            numberOfLines={1}
          >
            {pnlIsPositive ? '+' : ''}
            {formatCurrency(summary.unrealizedPnL, defaultCurrency)}
          </AppText>
        </View>
      </View>

      <View style={styles.investmentEntryCard}>
        <View>
          <AppText variant="caption" muted>
            Add Investment
          </AppText>

          <AppText variant="subtitle" style={styles.entryTitle}>
            Add assets
          </AppText>
        </View>

        <View style={styles.entryActions}>
          <Pressable
            onPress={() => router.push('/buy-investment-asset')}
            style={styles.entryPrimaryButton}
          >
            <Ionicons name="cart-outline" size={17} color={colors.black} />

            <AppText variant="caption" style={styles.entryPrimaryText}>
              Buy Asset
            </AppText>
          </Pressable>

          <Pressable
            onPress={() => router.push('/add-investment-holding')}
            style={styles.entrySecondaryButton}
          >
            <Ionicons name="archive-outline" size={17} color={colors.text} />

            <AppText variant="caption" style={styles.entrySecondaryText}>
              Manual
            </AppText>
          </Pressable>
        </View>

        <AppText variant="caption" muted style={styles.entryDescription}>
          Buy new assets or add existing holdings manually.
        </AppText>
      </View>

      <View style={styles.priceSyncCard}>
        <View style={styles.priceSyncIcon}>
          <Ionicons
            name={isSyncingPrices ? 'sync-outline' : 'cloud-outline'}
            size={19}
            color={colors.investment}
          />
        </View>

        <View style={styles.priceSyncTextBox}>
          <AppText variant="caption" muted>
            Price Sync
          </AppText>

          <AppText variant="body" style={styles.priceSyncTitle}>
            {isSyncingPrices ? 'Syncing prices...' : 'Auto update on app open'}
          </AppText>

          <AppText variant="caption" muted style={styles.priceSyncDescription} numberOfLines={2}>
            {lastPriceSyncSummary}
          </AppText>

          <AnimatedPressable
            onPress={() => router.push('/investment-price-sync-history')}
            style={styles.priceSyncHistoryButton}
          >
            <Ionicons name="time-outline" size={15} color={colors.text} />

            <AppText variant="caption" style={styles.priceSyncHistoryButtonText}>
              Sync History
            </AppText>
          </AnimatedPressable>
        </View>

        <AnimatedPressable
          onPress={handleSyncPrices}
          disabled={isSyncingPrices}
          style={[styles.priceSyncButton, isSyncingPrices && styles.disabledButton]}
        >
          <Ionicons
            name={isSyncingPrices ? 'sync-outline' : 'refresh-outline'}
            size={17}
            color={colors.black}
          />
        </AnimatedPressable>
      </View>

      <View style={styles.grid}>
        <StatCard
          label="Cost Basis"
          value={formatCompactCurrency(summary.totalCost, defaultCurrency)}
          tone="transfer"
        />
        <StatCard
          label="Unrealized"
          value={`${pnlIsPositive ? '+' : ''}${formatCompactCurrency(
            summary.unrealizedPnL,
            defaultCurrency
          )}`}
          tone={pnlIsPositive ? 'income' : 'expense'}
        />
        <StatCard
          label="Realized"
          value={`${realizedPnlIsPositive ? '+' : ''}${formatCompactCurrency(
            summary.realizedPnL,
            defaultCurrency
          )}`}
          tone={realizedPnlIsPositive ? 'income' : 'expense'}
        />
        <StatCard label="Sells" value={`${summary.sellOrderCount}`} tone="saving" />
        <StatCard label="Holdings" value={`${summary.holdingCount}`} tone="investment" />
        <StatCard label="Accounts" value={`${summary.accountCount}`} />
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Performance</AppText>

        <AppText variant="caption" muted>
          {selectedPerformanceYear}
        </AppText>
      </View>

      <View style={styles.performanceCard}>
        <View style={styles.performanceLegendRow}>
          <View style={styles.performanceLegendItem}>
            <View style={[styles.performanceLegendDot, { backgroundColor: colors.income }]} />

            <AppText variant="caption" muted>
              Buy
            </AppText>
          </View>

          <View style={styles.performanceLegendItem}>
            <View style={[styles.performanceLegendDot, { backgroundColor: colors.saving }]} />

            <AppText variant="caption" muted>
              Sell
            </AppText>
          </View>

          <View style={styles.performanceLegendItem}>
            <View style={[styles.performanceLegendDot, { backgroundColor: colors.investment }]} />

            <AppText variant="caption" muted>
              Realized
            </AppText>
          </View>
        </View>

        <View style={styles.performanceChartBody}>
          {performanceItems.map((item, index) => {
            const buyHeight = Math.max(
              (item.buyValue / maxPerformanceValue) * 100,
              item.buyValue > 0 ? 8 : 0
            );
            const sellHeight = Math.max(
              (item.sellValue / maxPerformanceValue) * 100,
              item.sellValue > 0 ? 8 : 0
            );
            const pnlHeight = Math.max(
              (Math.abs(item.realizedPnL) / maxPerformanceValue) * 100,
              item.realizedPnL !== 0 ? 8 : 0
            );
            const itemStart = performanceItems.length <= 1 ? 0 : index / performanceItems.length;
            const itemEnd = performanceItems.length <= 1 ? 1 : (index + 1) / performanceItems.length;
            const itemReveal = performanceReveal.interpolate({
              inputRange: [itemStart, itemEnd],
              outputRange: [0, 1],
              extrapolate: 'clamp',
            });
            const buyAnimatedHeight = itemReveal.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', `${buyHeight}%`],
            });
            const sellAnimatedHeight = itemReveal.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', `${sellHeight}%`],
            });
            const pnlAnimatedHeight = itemReveal.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', `${pnlHeight}%`],
            });

            return (
              <View key={item.label} style={styles.performanceChartItem}>
                <View style={styles.performanceBarGroup}>
                  <Animated.View
                    style={[
                      styles.performanceBar,
                      {
                        height: buyAnimatedHeight as any,
                        backgroundColor: colors.income,
                      },
                    ]}
                  />

                  <Animated.View
                    style={[
                      styles.performanceBar,
                      {
                        height: sellAnimatedHeight as any,
                        backgroundColor: colors.saving,
                      },
                    ]}
                  />

                  <Animated.View
                    style={[
                      styles.performanceBar,
                      {
                        height: pnlAnimatedHeight as any,
                        backgroundColor:
                          item.realizedPnL >= 0 ? colors.investment : colors.expense,
                      },
                    ]}
                  />
                </View>

                <AppText variant="caption" muted style={styles.performanceChartLabel}>
                  {item.label}
                </AppText>
              </View>
            );
          })}
        </View>

        <View style={styles.performanceFooter}>
          <AppText variant="caption" muted>
            Max scale
          </AppText>

          <AppText variant="caption" style={styles.performanceFooterValue}>
            {formatCompactCurrency(maxPerformanceValue, defaultCurrency)}
          </AppText>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Allocation</AppText>

        <AppText variant="caption" muted>
          By asset type
        </AppText>
      </View>

      {allocationItems.length === 0 ? (
        <View style={styles.allocationEmptyCard}>
          <Ionicons name="pie-chart-outline" size={22} color={colors.textMuted} />

          <AppText variant="caption" muted style={styles.allocationEmptyText}>
            Allocation will appear after you add holdings.
          </AppText>
        </View>
      ) : (
        <View style={styles.allocationCard}>
          {allocationItems.map((item) => (
            <View key={item.label} style={styles.allocationItem}>
              <View style={styles.allocationTopRow}>
                <View style={styles.allocationLabelBox}>
                  <AppText variant="body" style={styles.allocationLabel}>
                    {item.label}
                  </AppText>

                  <AppText variant="caption" muted>
                    {item.count} asset
                  </AppText>
                </View>

                <View style={styles.allocationValueBox}>
                  <AppText variant="body" style={styles.allocationValue} numberOfLines={1}>
                    {formatCompactCurrency(item.value, defaultCurrency)}
                  </AppText>

                  <AppText variant="caption" muted>
                    {formatPercent(item.percentage)}
                  </AppText>
                </View>
              </View>

              <View style={styles.allocationTrack}>
                <View
                  style={[
                    styles.allocationFill,
                    {
                      width: `${Math.min(item.percentage, 100)}%`,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Account Allocation</AppText>

        <AppText variant="caption" muted>
          By investment account
        </AppText>
      </View>

      {accountAllocationItems.length === 0 ? (
        <View style={styles.allocationEmptyCard}>
          <Ionicons name="wallet-outline" size={22} color={colors.textMuted} />

          <AppText variant="caption" muted style={styles.allocationEmptyText}>
            Account allocation will appear after you add holdings.
          </AppText>
        </View>
      ) : (
        <View style={styles.allocationCard}>
          {accountAllocationItems.map((item) => (
            <View key={item.label} style={styles.allocationItem}>
              <View style={styles.allocationTopRow}>
                <View style={styles.allocationLabelBox}>
                  <AppText variant="body" style={styles.allocationLabel} numberOfLines={1}>
                    {item.label}
                  </AppText>

                  <AppText variant="caption" muted>
                    {item.count} asset • {item.currency}
                  </AppText>
                </View>

                <View style={styles.allocationValueBox}>
                  <AppText variant="body" style={styles.allocationValue} numberOfLines={1}>
                    {formatCompactCurrency(item.value, defaultCurrency)}
                  </AppText>

                  <AppText variant="caption" muted>
                    {formatPercent(item.percentage)}
                  </AppText>
                </View>
              </View>

              <View style={styles.allocationTrack}>
                <View
                  style={[
                    styles.allocationFill,
                    {
                      width: `${Math.min(item.percentage, 100)}%`,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Holdings</AppText>

        <AppText variant="caption" muted>
          {filteredHoldings.length} of {investmentHoldings.length} asset
        </AppText>
      </View>

      <View style={styles.controlCard}>
        <View style={styles.controlBlock}>
          <AppText variant="caption" muted style={styles.controlLabel}>
            Filter
          </AppText>

          <View style={styles.chipRow}>
            {holdingFilters.map((filter) => {
              const active = activeFilter === filter.value;

              return (
                <Pressable
                  key={filter.value}
                  onPress={() => setActiveFilter(filter.value)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <Ionicons
                    name={filter.icon}
                    size={15}
                    color={active ? colors.black : colors.text}
                  />

                  <AppText
                    variant="caption"
                    style={[styles.filterText, active && styles.filterTextActive]}
                  >
                    {filter.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.controlBlock}>
          <AppText variant="caption" muted style={styles.controlLabel}>
            Sort by
          </AppText>

          <View style={styles.chipRow}>
            {holdingSorts.map((sort) => {
              const active = activeSort === sort.value;

              return (
                <Pressable
                  key={sort.value}
                  onPress={() => setActiveSort(sort.value)}
                  style={[styles.sortChip, active && styles.sortChipActive]}
                >
                  <Ionicons
                    name={sort.icon}
                    size={15}
                    color={active ? colors.black : colors.text}
                  />

                  <AppText
                    variant="caption"
                    style={[styles.sortText, active && styles.sortTextActive]}
                  >
                    {sort.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {investmentHoldings.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons name="bar-chart-outline" size={25} color={colors.textMuted} />
          </View>

          <AppText variant="subtitle" style={styles.emptyTitle}>
            No holdings yet
          </AppText>

          <AppText variant="body" muted style={styles.emptyText}>
            Add your first stock, crypto, fund, or ETF to start tracking portfolio value and unrealized P/L.
          </AppText>

          <Pressable
            onPress={() => router.push('/buy-investment-asset')}
            style={styles.emptyButton}
          >
            <AppText variant="body" style={styles.emptyButtonText}>
              Buy Asset
            </AppText>
          </Pressable>

          <Pressable
            onPress={() => router.push('/add-investment-holding')}
            style={styles.emptySecondaryButton}
          >
            <AppText variant="body" style={styles.emptySecondaryButtonText}>
              Add Manual Holding
            </AppText>
          </Pressable>
        </View>
      ) : filteredHoldings.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons name="filter-outline" size={25} color={colors.textMuted} />
          </View>

          <AppText variant="subtitle" style={styles.emptyTitle}>
            No matching holdings
          </AppText>

          <AppText variant="body" muted style={styles.emptyText}>
            Try another filter to see more portfolio assets.
          </AppText>
        </View>
      ) : (
        <View style={styles.holdingList}>
          {filteredHoldings.map((holding) => {
            const account = accounts.find((item) => item.id === holding.accountId);
            const currentValue = getHoldingValue(holding);
            const costValue = getHoldingCost(holding);
            const pnl = currentValue - costValue;
            const pnlPercent = costValue > 0 ? (pnl / costValue) * 100 : 0;
            const convertedValue = convertCurrencyAmount(
              currentValue,
              holding.currency,
              defaultCurrency,
              exchangeRates
            );
            const pnlPositive = pnl >= 0;

            return (
              <View key={holding.id} style={styles.holdingCard}>
                <View style={styles.holdingHeader}>
                  <View style={styles.assetIcon}>
                    <Ionicons
                      name={getAssetIcon(holding.assetType) as any}
                      size={22}
                      color={colors.investment}
                    />
                  </View>

                  <View style={styles.holdingTitleBox}>
                    <AppText variant="body" style={styles.holdingSymbol} numberOfLines={1}>
                      {holding.symbol}
                    </AppText>

                    <AppText variant="caption" muted numberOfLines={1}>
                      {holding.name} • {getAssetTypeLabel(holding.assetType)}
                    </AppText>
                  </View>

                  <View style={styles.holdingValueBox}>
                    <AppText variant="body" style={styles.holdingValue} numberOfLines={1}>
                      {formatCompactCurrency(convertedValue, defaultCurrency)}
                    </AppText>

                    <AppText variant="caption" muted numberOfLines={1}>
                      {defaultCurrency} base
                    </AppText>
                  </View>
                </View>

                <View style={styles.holdingMetrics}>
                  <View style={styles.metricItem}>
                    <AppText variant="caption" muted>
                      Qty
                    </AppText>

                    <AppText variant="caption" style={styles.metricValue}>
                      {holding.quantity.toLocaleString('id-ID', {
                        maximumFractionDigits: 8,
                      })}
                    </AppText>
                  </View>

                  <View style={styles.metricItem}>
                    <AppText variant="caption" muted>
                      Avg
                    </AppText>

                    <AppText variant="caption" style={styles.metricValue}>
                      {formatCompactCurrency(holding.averagePrice, holding.currency)}
                    </AppText>
                  </View>

                  <View style={styles.metricItem}>
                    <AppText variant="caption" muted>
                      Now
                    </AppText>

                    <AppText variant="caption" style={styles.metricValue}>
                      {formatCompactCurrency(holding.currentPrice, holding.currency)}
                    </AppText>
                  </View>
                </View>

                <View style={styles.holdingFooter}>
                  <AppText variant="caption" muted numberOfLines={1} style={styles.accountText}>
                    {account?.name || 'Investment account'} • Original {holding.currency}
                  </AppText>

                  <AppText
                    variant="caption"
                    style={[
                      styles.pnlSmall,
                      { color: pnlPositive ? colors.income : colors.expense },
                    ]}
                  >
                    {pnlPositive ? '+' : ''}
                    {formatCompactCurrency(pnl, holding.currency)} ({pnlPercent.toFixed(1)}%)
                  </AppText>
                </View>

                <View style={styles.actionPanel}>
                  <AnimatedPressable
                    onPress={() =>
                      router.push(`/investment-holding-detail?holdingId=${holding.id}`)
                    }
                    style={styles.detailButton}
                  >
                    <Ionicons name="open-outline" size={17} color={colors.text} />

                    <AppText variant="caption" style={styles.detailButtonText}>
                      Details
                    </AppText>
                  </AnimatedPressable>

                  <View style={styles.actionPairRow}>
                    <Pressable
                      onPress={() =>
                        router.push(`/add-investment-order?holdingId=${holding.id}&type=buy`)
                      }
                      style={styles.buyButton}
                    >
                      <Ionicons name="arrow-down-outline" size={17} color={colors.income} />

                      <AppText variant="caption" style={styles.buyButtonText}>
                        Buy
                      </AppText>
                    </Pressable>

                    <Pressable
                      onPress={() =>
                        router.push(`/add-investment-order?holdingId=${holding.id}&type=sell`)
                      }
                      style={styles.sellButton}
                    >
                      <Ionicons name="arrow-up-outline" size={17} color={colors.expense} />

                      <AppText variant="caption" style={styles.sellButtonText}>
                        Sell
                      </AppText>
                    </Pressable>
                  </View>

                  <View style={styles.actionPairRow}>
                    <Pressable
                      onPress={() =>
                        router.push(`/update-investment-holding-price?holdingId=${holding.id}`)
                      }
                      style={styles.updateButton}
                    >
                      <Ionicons name="create-outline" size={17} color={colors.black} />

                      <AppText variant="caption" style={styles.updateButtonText}>
                        Price
                      </AppText>
                    </Pressable>

                    <Pressable
                      onPress={() => handleDeleteHolding(holding)}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash-outline" size={17} color={colors.expense} />

                      <AppText variant="caption" style={styles.deleteButtonText}>
                        Delete
                      </AppText>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: {
      marginBottom: 18,
      gap: 12,
    },
    headerTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      marginTop: 4,
      lineHeight: 44,
    },
    headerActionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    headerActionPill: {
      minHeight: 40,
      minWidth: '47%',
      flex: 1,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },
    headerActionPrimary: {
      minHeight: 42,
      minWidth: '47%',
      flex: 1,
      borderRadius: 16,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },
    headerActionText: {
      color: colors.text,
      fontWeight: '900',
    },
    headerActionPrimaryText: {
      color: colors.black,
      fontWeight: '900',
    },
    heroCard: {
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 30,
      padding: 20,
      shadowColor: colors.shadow,
      shadowOpacity: 0.14,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 2,
    },
    heroTop: {
      flexDirection: 'row',
      gap: 14,
      alignItems: 'center',
    },
    heroIcon: {
      width: 54,
      height: 54,
      borderRadius: 20,
      backgroundColor: colors.investmentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroTextBox: {
      flex: 1,
      minWidth: 0,
    },
    heroLabel: {
      color: colors.textMuted,
      fontWeight: '900',
    },
    heroValue: {
      marginTop: 6,
      color: colors.text,
      letterSpacing: -0.8,
    },
    heroFullValue: {
      marginTop: 3,
      color: 'rgba(0,0,0,0.62)',
      fontWeight: '800',
    },
    pnlBox: {
      marginTop: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 20,
      padding: 13,
    },
    pnlLabel: {
      color: colors.textMuted,
      fontWeight: '900',
    },
    pnlValue: {
      marginTop: 5,
      fontWeight: '900',
    },
    investmentEntryCard: {
      marginTop: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 24,
      padding: 14,
      gap: 11,
    },
    entryTitle: {
      marginTop: 4,
      color: colors.text,
    },
    entryActions: {
      flexDirection: 'row',
      gap: 10,
    },
    entryPrimaryButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: 16,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: 10,
    },
    entryPrimaryText: {
      color: colors.black,
      fontWeight: '900',
    },
    entrySecondaryButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: 10,
    },
    entrySecondaryText: {
      color: colors.text,
      fontWeight: '900',
    },
    entryDescription: {
      lineHeight: 16,
    },
    disabledButton: {
      opacity: 0.56,
    },
    priceSyncCard: {
      marginTop: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 22,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    priceSyncIcon: {
      width: 42,
      height: 42,
      borderRadius: 15,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    priceSyncTextBox: {
      flex: 1,
      minWidth: 0,
    },
    priceSyncTitle: {
      marginTop: 4,
      fontWeight: '900',
      color: colors.text,
    },
    priceSyncDescription: {
      marginTop: 4,
      lineHeight: 17,
    },
    priceSyncHistoryButton: {
      alignSelf: 'flex-start',
      marginTop: 10,
      minHeight: 34,
      borderRadius: 12,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    priceSyncHistoryButtonText: {
      color: colors.text,
      fontWeight: '900',
    },
    priceSyncButton: {
      width: 42,
      height: 42,
      borderRadius: 15,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    grid: {
      marginTop: 14,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    sectionHeader: {
      marginTop: 22,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 12,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 26,
      padding: 22,
      alignItems: 'center',
    },
    emptyIcon: {
      width: 58,
      height: 58,
      borderRadius: 21,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: {
      marginTop: 14,
      textAlign: 'center',
    },
    emptyText: {
      marginTop: 8,
      textAlign: 'center',
      lineHeight: 21,
    },
    emptyButton: {
      marginTop: 16,
      minHeight: 50,
      borderRadius: 17,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
    },
    emptyButtonText: {
      color: colors.black,
      fontWeight: '900',
    },
    emptySecondaryButton: {
      minHeight: 48,
      borderRadius: 17,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      marginTop: 10,
    },
    emptySecondaryButtonText: {
      color: colors.text,
      fontWeight: '900',
    },
    performanceCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 24,
      padding: 14,
      marginBottom: 2,
    },
    performanceLegendRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 16,
    },
    performanceLegendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    performanceLegendDot: {
      width: 9,
      height: 9,
      borderRadius: 999,
    },
    performanceChartBody: {
      height: 168,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 6,
    },
    performanceChartItem: {
      flex: 1,
      alignItems: 'center',
      gap: 8,
    },
    performanceBarGroup: {
      height: 126,
      width: '100%',
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: 3,
    },
    performanceBar: {
      width: 7,
      minHeight: 0,
      borderRadius: 999,
    },
    performanceChartLabel: {
      fontSize: 10,
    },
    performanceFooter: {
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    performanceFooterValue: {
      color: colors.text,
      fontWeight: '900',
    },
    allocationEmptyCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 22,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 4,
    },
    allocationEmptyText: {
      flex: 1,
      lineHeight: 18,
    },
    allocationCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 24,
      padding: 15,
      gap: 14,
      marginBottom: 4,
    },
    allocationItem: {
      gap: 10,
    },
    allocationTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    allocationLabelBox: {
      flex: 1,
      minWidth: 0,
    },
    allocationLabel: {
      fontWeight: '900',
      marginBottom: 4,
    },
    allocationValueBox: {
      alignItems: 'flex-end',
      maxWidth: 140,
    },
    allocationValue: {
      color: colors.investment,
      fontWeight: '900',
      marginBottom: 4,
    },
    allocationTrack: {
      height: 9,
      borderRadius: 999,
      backgroundColor: colors.surfaceSoft,
      overflow: 'hidden',
    },
    allocationFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: colors.investment,
    },
    controlCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 22,
      padding: 14,
      gap: 14,
      marginBottom: 14,
    },
    controlBlock: {
      gap: 9,
    },
    controlLabel: {
      fontWeight: '900',
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    filterChip: {
      minHeight: 38,
      borderRadius: 999,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterText: {
      color: colors.text,
      fontWeight: '900',
    },
    filterTextActive: {
      color: colors.black,
    },
    sortChip: {
      minHeight: 38,
      borderRadius: 999,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    sortChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    sortText: {
      color: colors.text,
      fontWeight: '900',
    },
    sortTextActive: {
      color: colors.black,
    },
    holdingList: {
      gap: 10,
    },
    holdingCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 24,
      padding: 14,
      gap: 12,
    },
    holdingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    assetIcon: {
      width: 46,
      height: 46,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    holdingTitleBox: {
      flex: 1,
      minWidth: 0,
    },
    holdingSymbol: {
      fontWeight: '900',
      marginBottom: 4,
    },
    holdingValueBox: {
      alignItems: 'flex-end',
      maxWidth: 130,
    },
    holdingValue: {
      fontWeight: '900',
      color: colors.investment,
    },
    holdingMetrics: {
      flexDirection: 'row',
      gap: 9,
    },
    metricItem: {
      flex: 1,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 16,
      padding: 11,
    },
    metricValue: {
      marginTop: 5,
      fontWeight: '900',
    },
    holdingFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
    },
    accountText: {
      flex: 1,
    },
    pnlSmall: {
      fontWeight: '900',
    },
    actionPanel: {
      gap: 10,
    },
    actionPairRow: {
      flexDirection: 'row',
      gap: 10,
    },
    detailButton: {
      minHeight: 46,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 14,
    },
    detailButtonText: {
      color: colors.text,
      fontWeight: '900',
    },
    buyButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 10,
    },
    buyButtonText: {
      color: colors.income,
      fontWeight: '900',
    },
    sellButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 10,
    },
    sellButtonText: {
      color: colors.expense,
      fontWeight: '900',
    },
    updateButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 10,
    },
    updateButtonText: {
      color: colors.black,
      fontWeight: '900',
    },
    deleteButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 10,
    },
    deleteButtonText: {
      color: colors.expense,
      fontWeight: '900',
    },
  });
}
