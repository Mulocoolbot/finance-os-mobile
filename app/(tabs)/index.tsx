import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { AppText } from '../../src/components/ui/AppText';
import { Screen } from '../../src/components/ui/Screen';
import { StatCard } from '../../src/components/ui/StatCard';
import { ThemeColors } from '../../src/constants/colors';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useFinanceStore } from '../../src/stores/useFinanceStore';
import { Account, Currency, InvestmentHolding, InvestmentOrder, NetWorthSnapshot, Transaction, TransactionType } from '../../src/types/finance';
import { convertCurrencyAmount } from '../../src/utils/currencyConversion';
import { formatCurrency } from '../../src/utils/currency';
import { formatCompactCurrency } from '../../src/utils/formatCompactCurrency';

function isCurrentMonth(dateValue: string) {
  const date = new Date(dateValue);
  const now = new Date();

  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function getAccountSummary(
  accounts: Account[],
  defaultCurrency: Currency,
  exchangeRates: Record<Currency, number>
) {
  const activeAccounts = accounts.filter((account) => account.isActive);

  const toDefaultCurrency = (account: Account) =>
    convertCurrencyAmount(account.balance, account.currency, defaultCurrency, exchangeRates);

  const availableBalance = activeAccounts
    .filter(
      (account) =>
        account.type !== 'saving' &&
        account.type !== 'broker' &&
        account.type !== 'crypto_wallet'
    )
    .reduce((total, account) => total + toDefaultCurrency(account), 0);

  const totalSavings = activeAccounts
    .filter((account) => account.type === 'saving')
    .reduce((total, account) => total + toDefaultCurrency(account), 0);

  const totalInvestment = activeAccounts
    .filter((account) => account.type === 'broker' || account.type === 'crypto_wallet')
    .reduce((total, account) => total + toDefaultCurrency(account), 0);

  const netWorth = activeAccounts.reduce((total, account) => total + toDefaultCurrency(account), 0);

  return {
    availableBalance,
    totalSavings,
    totalInvestment,
    netWorth,
  };
}

function getSortedNetWorthSnapshots(items: NetWorthSnapshot[]) {
  return [...items].sort((firstItem, secondItem) => {
    return new Date(firstItem.date).getTime() - new Date(secondItem.date).getTime();
  });
}

function convertNetWorthSnapshotToCurrency(
  snapshot: NetWorthSnapshot,
  targetCurrency: Currency,
  exchangeRates: Record<Currency, number>
): NetWorthSnapshot {
  if (snapshot.currency === targetCurrency) {
    return snapshot;
  }

  return {
    ...snapshot,
    currency: targetCurrency,
    netWorth: convertCurrencyAmount(
      snapshot.netWorth,
      snapshot.currency,
      targetCurrency,
      exchangeRates
    ),
    cashValue: convertCurrencyAmount(
      snapshot.cashValue,
      snapshot.currency,
      targetCurrency,
      exchangeRates
    ),
    savingValue: convertCurrencyAmount(
      snapshot.savingValue,
      snapshot.currency,
      targetCurrency,
      exchangeRates
    ),
    investmentValue: convertCurrencyAmount(
      snapshot.investmentValue,
      snapshot.currency,
      targetCurrency,
      exchangeRates
    ),
    liabilityValue:
      typeof snapshot.liabilityValue === 'number'
        ? convertCurrencyAmount(
            snapshot.liabilityValue,
            snapshot.currency,
            targetCurrency,
            exchangeRates
          )
        : snapshot.liabilityValue,
  };
}



function getNetWorthChartMax(items: NetWorthSnapshot[], fallbackValue: number) {
  return Math.max(...items.map((item) => item.netWorth), fallbackValue, 1);
}

function getNetWorthChartMin(items: NetWorthSnapshot[], fallbackValue: number) {
  return Math.min(...items.map((item) => item.netWorth), fallbackValue, 0);
}

function formatDashboardChartDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function getHoldingCost(holding: InvestmentHolding) {
  return holding.quantity * holding.averagePrice;
}

function getHoldingValue(holding: InvestmentHolding) {
  return holding.quantity * holding.currentPrice;
}

function getDashboardHoldingIcon(assetType: InvestmentHolding['assetType']) {
  if (assetType === 'crypto') return 'logo-bitcoin';
  if (assetType === 'stock') return 'business-outline';
  if (assetType === 'etf') return 'layers-outline';
  if (assetType === 'fund') return 'pie-chart-outline';
  if (assetType === 'bond') return 'document-text-outline';

  return 'cube-outline';
}

function getInvestmentSummary(
  holdings: InvestmentHolding[],
  orders: InvestmentOrder[],
  defaultCurrency: Currency,
  exchangeRates: Record<Currency, number>
) {
  const portfolioValue = holdings.reduce((total, holding) => {
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

  const costBasis = holdings.reduce((total, holding) => {
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

  const unrealizedPnL = portfolioValue - costBasis;

  const currentMonthOrders = orders.filter((order) => isCurrentMonth(order.date));

  const monthlyBuyValue = currentMonthOrders
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

  const monthlySellValue = currentMonthOrders
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

  const monthlyRealizedPnL = currentMonthOrders
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

  return {
    portfolioValue,
    costBasis,
    unrealizedPnL,
    monthlyRealizedPnL,
    monthlyBuyValue,
    monthlySellValue,
    holdingCount: holdings.length,
    monthlyOrderCount: currentMonthOrders.length,
  };
}

function getTransactionTone(colors: ThemeColors, type: TransactionType) {
  if (type === 'income') {
    return colors.income;
  }

  if (type === 'expense') {
    return colors.expense;
  }

  if (type === 'saving_deposit' || type === 'saving_withdrawal') {
    return colors.saving;
  }

  if (type === 'investment_buy' || type === 'investment_sell') {
    return colors.investment;
  }

  return colors.transfer;
}

function getTransactionIcon(type: TransactionType) {
  if (type === 'income') {
    return 'arrow-down-outline';
  }

  if (type === 'expense') {
    return 'arrow-up-outline';
  }

  if (type === 'transfer') {
    return 'swap-horizontal-outline';
  }

  if (type === 'saving_deposit') {
    return 'sparkles-outline';
  }

  if (type === 'saving_withdrawal') {
    return 'return-down-back-outline';
  }

  return 'ellipse-outline';
}

function getTransactionSign(type: TransactionType) {
  if (type === 'income') {
    return '+';
  }

  if (type === 'expense') {
    return '-';
  }

  return '';
}

function formatShortDate(dateValue: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(dateValue));
}

function formatRate(value: number) {
  return value.toLocaleString('id-ID', {
    maximumFractionDigits: 2,
  });
}

function isRealtimeKeyConfigured(value?: string) {
  return Boolean(value) && value !== 'PASTE_YOUR_ALPHA_VANTAGE_API_KEY_HERE';
}

function getLiveStatusLabel(value: string) {
  if (value === 'updating') return 'Updating';
  if (value === 'live') return 'Live';
  if (value === 'fallback') return 'Fallback';
  if (value === 'rate_limited') return 'Limit reached';
  if (value === 'failed') return 'Failed';

  return 'Idle';
}

function getLiveStatusIcon(value: string) {
  if (value === 'updating') return 'sync-outline';
  if (value === 'live') return 'checkmark-circle-outline';
  if (value === 'fallback') return 'git-branch-outline';
  if (value === 'rate_limited') return 'hourglass-outline';
  if (value === 'failed') return 'alert-circle-outline';

  return 'pulse-outline';
}

export default function HomeScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();
  const netWorthChartWidth = Math.min(width - 64, 360);
  const netWorthChartHeight = 146;
  const [selectedDashboardPointId, setSelectedDashboardPointId] = useState<string | null>(null);

  const accounts = useFinanceStore((state) => state.accounts);
  const transactions = useFinanceStore((state) => state.transactions);
  const budgets = useFinanceStore((state) => state.budgets);
  const savingGoals = useFinanceStore((state) => state.savingGoals);
  const investmentHoldings = useFinanceStore((state) => state.investmentHoldings);
  const investmentOrders = useFinanceStore((state) => state.investmentOrders);
  const netWorthSnapshots = useFinanceStore((state) => state.netWorthSnapshots);
  const upsertTodayNetWorthSnapshot = useFinanceStore(
    (state) => state.upsertTodayNetWorthSnapshot
  );
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);
  const exchangeRates = useFinanceStore((state) => state.exchangeRates);
  const exchangeRateLastUpdated = useFinanceStore((state) => state.exchangeRateLastUpdated);
  const exchangeRateApiKey = useFinanceStore((state) => state.exchangeRateApiKey);
  const exchangeRateLiveStatus = useFinanceStore((state) => state.exchangeRateLiveStatus);
  const exchangeRateLastError = useFinanceStore((state) => state.exchangeRateLastError);

  const dashboard = useMemo(() => {
    const accountSummary = getAccountSummary(accounts, defaultCurrency, exchangeRates);
    const investmentSummary = getInvestmentSummary(
      investmentHoldings,
      investmentOrders,
      defaultCurrency,
      exchangeRates
    );

    const monthlyTransactions = transactions.filter((transaction) =>
      isCurrentMonth(transaction.date)
    );

    const monthlyIncome = monthlyTransactions
      .filter((transaction) => transaction.type === 'income')
      .reduce(
        (total, transaction) =>
          total +
          convertCurrencyAmount(
            transaction.amount,
            transaction.currency,
            defaultCurrency,
            exchangeRates
          ),
        0
      );

    const monthlyExpense = monthlyTransactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce(
        (total, transaction) =>
          total +
          convertCurrencyAmount(
            transaction.amount,
            transaction.currency,
            defaultCurrency,
            exchangeRates
          ),
        0
      );

    const savingProgress = savingGoals.length
      ? savingGoals.reduce((total, saving) => {
          if (saving.targetAmount <= 0) {
            return total;
          }

          return total + Math.min(saving.currentAmount / saving.targetAmount, 1);
        }, 0) / savingGoals.length
      : 0;

    const activeBudgetCount = budgets.filter((budget) => budget.isActive).length;

    return {
      ...accountSummary,
      totalInvestment: accountSummary.totalInvestment + investmentSummary.portfolioValue,
      netWorth: accountSummary.netWorth + investmentSummary.portfolioValue,
      investmentSummary,
      monthlyIncome,
      monthlyExpense,
      monthlyNetFlow: monthlyIncome - monthlyExpense,
      savingProgress,
      activeBudgetCount,
    };
  }, [
    accounts,
    transactions,
    budgets,
    savingGoals,
    investmentHoldings,
    investmentOrders,
    defaultCurrency,
    exchangeRates,
  ]);

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  const dashboardHoldings = useMemo(() => {
    return [...investmentHoldings]
      .filter((holding) => holding.quantity > 0)
      .map((holding) => ({
        holding,
        value: convertCurrencyAmount(
          getHoldingValue(holding),
          holding.currency,
          defaultCurrency,
          exchangeRates
        ),
      }))
      .sort((firstItem, secondItem) => secondItem.value - firstItem.value)
      .slice(0, 5);
  }, [investmentHoldings, defaultCurrency, exchangeRates]);

  const hiddenDashboardHoldingCount = Math.max(
    investmentHoldings.filter((holding) => holding.quantity > 0).length -
      dashboardHoldings.length,
    0
  );

  const netWorthChartItems = useMemo(() => {
    const sortedItems = getSortedNetWorthSnapshots(netWorthSnapshots)
      .slice(-12)
      .map((snapshot) =>
        convertNetWorthSnapshotToCurrency(snapshot, defaultCurrency, exchangeRates)
      );

    if (sortedItems.length > 0) {
      return sortedItems;
    }

    return [
      {
        id: 'current-net-worth',
        date: new Date().toISOString(),
        currency: defaultCurrency,
        netWorth: dashboard.netWorth,
        cashValue: dashboard.availableBalance,
        savingValue: dashboard.totalSavings,
        investmentValue: dashboard.totalInvestment,
        liabilityValue: 0,
        note: 'Current realtime net worth',
        createdAt: new Date().toISOString(),
      },
    ];
  }, [
    netWorthSnapshots,
    defaultCurrency,
    exchangeRates,
    dashboard.netWorth,
    dashboard.availableBalance,
    dashboard.totalSavings,
    dashboard.totalInvestment,
  ]);

  const netWorthChartMax = useMemo(() => {
    return getNetWorthChartMax(netWorthChartItems, dashboard.netWorth);
  }, [netWorthChartItems, dashboard.netWorth]);

  const netWorthChartMin = useMemo(() => {
    return getNetWorthChartMin(netWorthChartItems, dashboard.netWorth);
  }, [netWorthChartItems, dashboard.netWorth]);

  useEffect(() => {
    upsertTodayNetWorthSnapshot({
      currency: defaultCurrency,
      netWorth: dashboard.netWorth,
      cashValue: dashboard.availableBalance,
      savingValue: dashboard.totalSavings,
      investmentValue: dashboard.totalInvestment,
      liabilityValue: 0,
      note: 'Auto daily net worth history',
    });
  }, [
    upsertTodayNetWorthSnapshot,
    defaultCurrency,
    dashboard.netWorth,
    dashboard.availableBalance,
    dashboard.totalSavings,
    dashboard.totalInvestment,
  ]);

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <AppText variant="caption" muted>
            Finance OS Mobile
          </AppText>

          <AppText variant="title" style={styles.title}>
            Dashboard
          </AppText>
        </View>

        <Pressable
          onPress={() => router.push('/add-transaction')}
          style={styles.headerAction}
        >
          <Ionicons name="add-outline" size={24} color={colors.black} />
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroMainText}>
            <AppText variant="caption" muted>
              Net Worth
            </AppText>

            <AppText variant="title" style={styles.netWorth}>
              {formatCompactCurrency(dashboard.netWorth, defaultCurrency)}
            </AppText>

            <AppText variant="caption" muted style={styles.netWorthFull}>
              {formatCurrency(dashboard.netWorth, defaultCurrency)}
            </AppText>
          </View>

          <View style={styles.heroBadge}>
            <Ionicons name="pulse-outline" size={15} color={colors.income} />

            <AppText variant="caption" style={styles.heroBadgeText}>
              Active
            </AppText>
          </View>
        </View>

        <View style={styles.heroDivider} />

        <View style={styles.heroStats}>
          <View style={styles.heroStatItem}>
            <AppText variant="caption" muted>
              Available
            </AppText>

            <AppText variant="body" style={styles.heroStatValue}>
              {formatCompactCurrency(dashboard.availableBalance, defaultCurrency)}
            </AppText>
          </View>

          <View style={styles.heroStatItem}>
            <AppText variant="caption" muted>
              Savings
            </AppText>

            <AppText variant="body" style={styles.heroStatValue}>
              {formatCompactCurrency(dashboard.totalSavings, defaultCurrency)}
            </AppText>
          </View>

          <View style={styles.heroStatItem}>
            <AppText variant="caption" muted>
              Invest
            </AppText>

            <AppText variant="body" style={styles.heroStatValue}>
              {formatCompactCurrency(dashboard.totalInvestment, defaultCurrency)}
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.liveRateCard}>
        <View style={styles.liveRateHeader}>
          <View style={styles.liveRateTitleBox}>
            <View style={styles.liveRateTitleRow}>
              <Ionicons
                name="pulse-outline"
                size={17}
                color={isRealtimeKeyConfigured(exchangeRateApiKey) ? colors.income : colors.investment}
              />

              <AppText variant="body" style={styles.liveRateTitle}>
                Live Exchange Rate
              </AppText>
            </View>

            <AppText variant="caption" muted style={styles.liveRateSubtitle}>
              Current currency conversion rate
            </AppText>
          </View>

          <View
            style={[
              styles.liveRateBadge,
              {
                borderColor: isRealtimeKeyConfigured(exchangeRateApiKey)
                  ? colors.income
                  : colors.investment,
              },
            ]}
          >
            <Ionicons
              name={getLiveStatusIcon(exchangeRateLiveStatus) as any}
              size={15}
              color={
                isRealtimeKeyConfigured(exchangeRateApiKey)
                  ? colors.income
                  : colors.investment
              }
            />

            <AppText
              variant="caption"
              style={[
                styles.liveRateBadgeText,
                {
                  color: isRealtimeKeyConfigured(exchangeRateApiKey)
                    ? colors.income
                    : colors.investment,
                },
              ]}
            >
              {getLiveStatusLabel(exchangeRateLiveStatus)}
            </AppText>
          </View>
        </View>

        <View style={styles.liveRateGrid}>
          <View style={styles.liveRateItem}>
            <AppText variant="caption" muted>
              USD / IDR
            </AppText>

            <AppText variant="body" style={styles.liveRateValue}>
              Rp {formatRate(exchangeRates.USD)}
            </AppText>
          </View>

          <View style={styles.liveRateItem}>
            <AppText variant="caption" muted>
              EUR / IDR
            </AppText>

            <AppText variant="body" style={styles.liveRateValue}>
              Rp {formatRate(exchangeRates.EUR)}
            </AppText>
          </View>
        </View>

        <View style={styles.liveRateFooter}>
          <AppText variant="caption" muted style={styles.liveRateFooterText}>
            {exchangeRateLastError
              ? 'Using last saved rate because live update is temporarily unavailable.'
              : 'Rates update automatically while the app is active.'}
          </AppText>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.quickActionsScroll}
        contentContainerStyle={styles.quickActionsContent}
      >
        <QuickAction
          icon="add-circle-outline"
          label="Add"
          onPress={() => router.push('/add-transaction')}
          colors={colors}
        />

        <QuickAction
          icon="search-outline"
          label="Search"
          onPress={() => router.push('/advanced-search')}
          colors={colors}
        />

        <QuickAction
          icon="sparkles-outline"
          label="Savings"
          onPress={() => router.push('/savings')}
          colors={colors}
        />

        <QuickAction
          icon="wallet-outline"
          label="Accounts"
          onPress={() => router.push('/accounts')}
          colors={colors}
        />

        <QuickAction
          icon="speedometer-outline"
          label="Budget"
          onPress={() => router.push('/budget')}
          colors={colors}
        />

        <QuickAction
          icon="bar-chart-outline"
          label="Reports"
          onPress={() => router.push('/reports')}
          colors={colors}
        />

        <QuickAction
          icon="book-outline"
          label="Journal"
          onPress={() => router.push('/journal')}
          colors={colors}
        />

        <QuickAction
          icon="sparkles-outline"
          label="AI Coach"
          onPress={() => router.push('/trading-ai-performance')}
          colors={colors}
        />

        <QuickAction
          icon="pie-chart-outline"
          label="Profit Pool"
          onPress={() => router.push('/trading-profit-pool')}
          colors={colors}
        />
      </ScrollView>

      <View style={styles.netWorthHistoryCard}>
        <View style={styles.netWorthHistoryHeader}>
          <View style={styles.netWorthHistoryTextBox}>
            <View style={styles.netWorthHistoryTitleRow}>
              <Ionicons name="analytics-outline" size={18} color={colors.text} />

              <AppText variant="body" style={styles.netWorthHistoryTitle}>
                Net Worth Trend
              </AppText>
            </View>

            <AppText variant="caption" muted style={styles.netWorthHistoryDescription}>
              Realtime value with auto daily history.
            </AppText>
          </View>

          <Pressable
            onPress={() => router.push('/net-worth-history')}
            style={styles.historyIconButton}
          >
            <Ionicons name="open-outline" size={17} color={colors.text} />
          </Pressable>
        </View>

        <View
          style={[
            styles.dashboardLineChartBody,
            {
              width: netWorthChartWidth,
              height: netWorthChartHeight,
            },
          ]}
        >
          {(() => {
            const chartMin = Math.min(...netWorthChartItems.map((item) => item.netWorth));
            const chartMax = Math.max(...netWorthChartItems.map((item) => item.netWorth));
            const chartRange = Math.max(chartMax - chartMin, 1);
            const chartHorizontalPadding = 22;
            const chartVerticalPadding = 18;
            const chartPlotWidth = Math.max(
              netWorthChartWidth - chartHorizontalPadding * 2,
              1
            );
            const chartPlotHeight = Math.max(
              netWorthChartHeight - chartVerticalPadding * 2,
              1
            );
            const points = netWorthChartItems.map((snapshot, index) => {
              const x =
                chartHorizontalPadding +
                (netWorthChartItems.length === 1
                  ? 0
                  : (index / (netWorthChartItems.length - 1)) * chartPlotWidth);
              const normalized =
                netWorthChartItems.length === 1
                  ? 0
                  : Math.min(Math.max((snapshot.netWorth - chartMin) / chartRange, 0), 1);
              const y =
                chartVerticalPadding + (1 - normalized) * chartPlotHeight;

              return {
                ...snapshot,
                x,
                y,
              };
            });
            const selectedPoint =
              points.find((point) => point.id === selectedDashboardPointId) || null;
            const handleChartPress = (touchX: number) => {
              if (points.length === 0) {
                return;
              }

              const nearestPoint = points.reduce((closestPoint, currentPoint) => {
                return Math.abs(currentPoint.x - touchX) <
                  Math.abs(closestPoint.x - touchX)
                  ? currentPoint
                  : closestPoint;
              }, points[0]);

              setSelectedDashboardPointId(nearestPoint.id);
            };
            const tooltipWidth = 138;
            const tooltipLeft = selectedPoint
              ? Math.min(
                  Math.max(selectedPoint.x - tooltipWidth / 2, 8),
                  netWorthChartWidth - tooltipWidth - 8
                )
              : 8;
            const tooltipTop = selectedPoint
              ? Math.min(Math.max(selectedPoint.y > 70 ? selectedPoint.y - 64 : selectedPoint.y + 16, 8), netWorthChartHeight - 62)
              : 8;

            return (
              <>
                <View
                  style={[
                    styles.dashboardLineGuide,
                    {
                      left: chartHorizontalPadding,
                      width: chartPlotWidth,
                      top: chartVerticalPadding,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.dashboardLineGuide,
                    {
                      left: chartHorizontalPadding,
                      width: chartPlotWidth,
                      top: chartVerticalPadding + chartPlotHeight / 2,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.dashboardLineGuide,
                    {
                      left: chartHorizontalPadding,
                      width: chartPlotWidth,
                      top: chartVerticalPadding + chartPlotHeight,
                    },
                  ]}
                />

                {selectedPoint ? (
                  <View
                    style={[
                      styles.dashboardLineVerticalGuide,
                      {
                        left: selectedPoint.x,
                      },
                    ]}
                  />
                ) : null}

                {points.slice(0, -1).map((point, index) => {
                  const nextPoint = points[index + 1];
                  const deltaX = nextPoint.x - point.x;
                  const deltaY = nextPoint.y - point.y;
                  const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                  const angle = Math.atan2(deltaY, deltaX);

                  return (
                    <View
                      key={`${point.id}-${nextPoint.id}`}
                      style={[
                        styles.dashboardLineSegment,
                        {
                          left: point.x + deltaX / 2 - length / 2,
                          top: point.y + deltaY / 2,
                          width: length,
                          transform: [{ rotateZ: `${angle}rad` }],
                        },
                      ]}
                    />
                  );
                })}

                {points.map((point) => {
                  const active = point.id === selectedDashboardPointId;

                  return (
                    <View
                      key={point.id}
                      pointerEvents="none"
                      style={[
                        styles.dashboardLinePointTouch,
                        {
                          left: point.x - 17,
                          top: point.y - 17,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.dashboardLinePointDot,
                          active && styles.dashboardLinePointDotActive,
                        ]}
                      />
                    </View>
                  );
                })}

                <Pressable
                  onPressIn={(event) => handleChartPress(event.nativeEvent.locationX)}
                  onLongPress={(event) => handleChartPress(event.nativeEvent.locationX)}
                  style={styles.dashboardChartTouchLayer}
                />

                {selectedPoint ? (
                  <Pressable
                    onPress={() => setSelectedDashboardPointId(null)}
                    style={[
                      styles.dashboardChartTooltip,
                      {
                        left: tooltipLeft,
                        top: tooltipTop,
                        width: tooltipWidth,
                      },
                    ]}
                  >
                    <AppText
                      variant="caption"
                      style={styles.dashboardChartTooltipValue}
                      numberOfLines={1}
                    >
                      {formatCompactCurrency(selectedPoint.netWorth, defaultCurrency)}
                    </AppText>

                    <AppText
                      variant="caption"
                      style={styles.dashboardChartTooltipDate}
                      numberOfLines={1}
                    >
                      {formatDashboardChartDate(selectedPoint.date)}
                    </AppText>
                  </Pressable>
                ) : null}
              </>
            );
          })()}
        </View>

        <View style={styles.dashboardLineFooter}>
          <View style={styles.dashboardLineFooterItem}>
            <AppText variant="caption" muted>
              Points
            </AppText>

            <AppText variant="caption" style={styles.dashboardLineFooterValue}>
              {netWorthChartItems.length}
            </AppText>
          </View>

          <View style={styles.dashboardLineFooterItem}>
            <AppText variant="caption" muted>
              Latest
            </AppText>

            <AppText variant="caption" style={styles.dashboardLineFooterValue} numberOfLines={1}>
              {formatDashboardChartDate(
                netWorthChartItems[netWorthChartItems.length - 1]?.date || new Date().toISOString()
              )}
            </AppText>
          </View>

          <View style={styles.dashboardLineFooterItem}>
            <AppText variant="caption" muted>
              Max
            </AppText>

            <AppText variant="caption" style={styles.dashboardLineFooterValue} numberOfLines={1}>
              {formatCompactCurrency(netWorthChartMax, defaultCurrency)}
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.investmentCard}>
        <View style={styles.investmentHeader}>
          <View style={styles.investmentTitleBox}>
            <View style={styles.investmentTitleRow}>
              <Ionicons name="trending-up-outline" size={18} color={colors.investment} />

              <AppText variant="body" style={styles.investmentTitle}>
                Investment Summary
              </AppText>
            </View>

            <AppText variant="caption" muted style={styles.investmentDescription}>
              Portfolio value, unrealized P/L, and monthly realized P/L.
            </AppText>
          </View>

          <Pressable onPress={() => router.push('/investments')} style={styles.investmentOpenButton}>
            <AppText variant="caption" style={styles.investmentOpenText}>
              Open
            </AppText>
          </Pressable>
        </View>

        <View style={styles.investmentMain}>
          <View style={styles.investmentMainValueBox}>
            <AppText variant="caption" muted>
              Portfolio Value
            </AppText>

            <AppText variant="title" style={styles.investmentMainValue} numberOfLines={1}>
              {formatCompactCurrency(
                dashboard.investmentSummary.portfolioValue,
                defaultCurrency
              )}
            </AppText>

            <AppText variant="caption" muted numberOfLines={1}>
              {dashboard.investmentSummary.holdingCount} holdings • {dashboard.investmentSummary.monthlyOrderCount} orders this month
            </AppText>
          </View>
        </View>

        <View style={styles.investmentMetricRow}>
          <View style={styles.investmentMetricItem}>
            <AppText variant="caption" muted>
              Unrealized
            </AppText>

            <AppText
              variant="body"
              style={[
                styles.investmentMetricValue,
                { color: dashboard.investmentSummary.unrealizedPnL >= 0 ? colors.income : colors.expense },
              ]}
              numberOfLines={1}
            >
              {dashboard.investmentSummary.unrealizedPnL >= 0 ? '+' : ''}
              {formatCompactCurrency(
                dashboard.investmentSummary.unrealizedPnL,
                defaultCurrency
              )}
            </AppText>
          </View>

          <View style={styles.investmentMetricItem}>
            <AppText variant="caption" muted>
              Realized Month
            </AppText>

            <AppText
              variant="body"
              style={[
                styles.investmentMetricValue,
                { color: dashboard.investmentSummary.monthlyRealizedPnL >= 0 ? colors.income : colors.expense },
              ]}
              numberOfLines={1}
            >
              {dashboard.investmentSummary.monthlyRealizedPnL >= 0 ? '+' : ''}
              {formatCompactCurrency(
                dashboard.investmentSummary.monthlyRealizedPnL,
                defaultCurrency
              )}
            </AppText>
          </View>
        </View>

        {dashboardHoldings.length > 0 ? (
          <View style={styles.currentHoldingsSection}>
            <View style={styles.currentHoldingsHeader}>
              <AppText variant="caption" style={styles.currentHoldingsTitle}>
                Current Holdings
              </AppText>

              {hiddenDashboardHoldingCount > 0 ? (
                <AppText variant="caption" muted>
                  +{hiddenDashboardHoldingCount} more
                </AppText>
              ) : null}
            </View>

            <View style={styles.currentHoldingsList}>
              {dashboardHoldings.map((item) => (
                <Pressable
                  key={item.holding.id}
                  onPress={() => router.push('/investments')}
                  style={styles.currentHoldingChip}
                >
                  <View style={styles.currentHoldingIcon}>
                    <Ionicons
                      name={getDashboardHoldingIcon(item.holding.assetType) as any}
                      size={15}
                      color={colors.investment}
                    />
                  </View>

                  <View style={styles.currentHoldingTextBox}>
                    <AppText
                      variant="caption"
                      style={styles.currentHoldingSymbol}
                      numberOfLines={1}
                    >
                      {item.holding.symbol}
                    </AppText>

                    <AppText
                      variant="caption"
                      muted
                      style={styles.currentHoldingName}
                      numberOfLines={1}
                    >
                      {item.holding.name}
                    </AppText>
                  </View>

                  <AppText
                    variant="caption"
                    style={styles.currentHoldingValue}
                    numberOfLines={1}
                  >
                    {formatCompactCurrency(item.value, defaultCurrency)}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.grid}>
        <StatCard
          label="Monthly Income"
          value={formatCurrency(dashboard.monthlyIncome, defaultCurrency)}
          tone="income"
        />

        <StatCard
          label="Monthly Expense"
          value={formatCurrency(dashboard.monthlyExpense, defaultCurrency)}
          tone="expense"
        />

        <StatCard
          label="Net Flow"
          value={formatCurrency(dashboard.monthlyNetFlow, defaultCurrency)}
          tone={dashboard.monthlyNetFlow >= 0 ? 'income' : 'expense'}
        />

        <StatCard
          label="Budgets"
          value={`${dashboard.activeBudgetCount} active`}
          tone="investment"
        />
      </View>

      <Pressable onPress={() => router.push('/budget')} style={styles.dashboardAlertCard}>
        <View style={styles.dashboardAlertIcon}>
          <Ionicons
            name={dashboard.activeBudgetCount > 0 ? 'speedometer-outline' : 'add-circle-outline'}
            size={20}
            color={colors.text}
          />
        </View>

        <View style={styles.dashboardAlertTextBox}>
          <AppText variant="body" style={styles.dashboardAlertTitle}>
            {dashboard.activeBudgetCount > 0
              ? `${dashboard.activeBudgetCount} active budget tracker`
              : 'No active budget yet'}
          </AppText>

          <AppText variant="caption" muted style={styles.dashboardAlertDescription}>
            {dashboard.activeBudgetCount > 0
              ? 'Open budget to review spending control, archived budgets, and category limits.'
              : 'Create a budget to monitor monthly or weekly category spending.'}
          </AppText>
        </View>

        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>

      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <View style={styles.progressTextBox}>
            <AppText variant="subtitle">Saving Progress</AppText>

            <AppText variant="caption" muted style={styles.progressDescription}>
              Average progress across active saving goals.
            </AppText>
          </View>

          <AppText variant="subtitle" style={styles.progressPercent}>
            {(dashboard.savingProgress * 100).toFixed(0)}%
          </AppText>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(dashboard.savingProgress * 100, 100)}%`,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Recent Activity</AppText>

        <Pressable onPress={() => router.push('/reports')}>
          <AppText variant="caption" style={styles.viewAllText}>
            View all
          </AppText>
        </Pressable>
      </View>

      <View style={styles.recentList}>
        {recentTransactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <AppText variant="subtitle">No activity yet</AppText>

            <AppText variant="body" muted style={styles.emptyDescription}>
              Add your first transaction using the + button.
            </AppText>
          </View>
        ) : null}

        {recentTransactions.map((transaction) => (
          <RecentTransactionRow
            key={transaction.id}
            transaction={transaction}
            colors={colors}
            onPress={() =>
              router.push({
                pathname: '/transaction-detail',
                params: { transactionId: transaction.id },
              })
            }
          />
        ))}
      </View>
    </Screen>
  );
}

type QuickActionProps = {
  icon: string;
  label: string;
  onPress: () => void;
  colors: ThemeColors;
};

function QuickAction({ icon, label, onPress, colors }: QuickActionProps) {
  const styles = createStyles(colors);

  return (
    <Pressable onPress={onPress} style={styles.quickActionCard}>
      <View style={styles.quickActionIcon}>
        <Ionicons name={icon as any} size={22} color={colors.text} />
      </View>

      <AppText variant="caption" style={styles.quickActionLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

function RecentTransactionRow({
  transaction,
  colors,
  onPress,
}: {
  transaction: Transaction;
  colors: ThemeColors;
  onPress?: () => void;
}) {
  const styles = createStyles(colors);
  const toneColor = getTransactionTone(colors, transaction.type);
  const iconName = getTransactionIcon(transaction.type) as any;
  const sign = getTransactionSign(transaction.type);

  return (
    <Pressable onPress={onPress} style={styles.transactionRow}>
      <View
        style={[
          styles.transactionIcon,
          {
            borderColor: toneColor,
          },
        ]}
      >
        <Ionicons name={iconName} size={20} color={toneColor} />
      </View>

      <View style={styles.transactionContent}>
        <AppText variant="body" style={styles.transactionTitle}>
          {transaction.title}
        </AppText>

        <AppText variant="caption" muted style={styles.transactionMeta}>
          {transaction.categoryName || transaction.accountName} •{' '}
          {formatShortDate(transaction.date)}
        </AppText>
      </View>

      <View style={styles.transactionAmountBox}>
        <AppText
          variant="body"
          style={[
            styles.transactionAmount,
            {
              color: toneColor,
            },
          ]}
          numberOfLines={1}
        >
          {sign}
          {formatCurrency(transaction.amount, transaction.currency)}
        </AppText>

        {onPress ? (
          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
        ) : null}
      </View>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: {
      marginBottom: 22,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      marginTop: 4,
    },
    headerAction: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 30,
      padding: 22,
      overflow: 'hidden',
    },
    heroTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 14,
    },
    heroMainText: {
      flex: 1,
      minWidth: 0,
    },
    netWorth: {
      marginTop: 8,
      fontSize: 34,
      lineHeight: 40,
    },
    netWorthFull: {
      marginTop: 4,
      lineHeight: 18,
    },
    heroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    heroBadgeText: {
      color: colors.income,
      fontWeight: '900',
    },
    heroDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 18,
    },
    heroStats: {
      flexDirection: 'row',
      gap: 8,
    },
    heroStatItem: {
      flex: 1,
      minWidth: 0,
    },
    heroStatValue: {
      marginTop: 5,
      fontWeight: '900',
      fontSize: 15,
      lineHeight: 20,
    },
    liveRateCard: {
      marginTop: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 16,
      gap: 14,
    },
    liveRateHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    liveRateTitleBox: {
      flex: 1,
      minWidth: 0,
    },
    liveRateTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    liveRateTitle: {
      fontWeight: '900',
    },
    liveRateSubtitle: {
      marginTop: 5,
      lineHeight: 18,
    },
    liveRateBadge: {
      minHeight: 34,
      borderRadius: 999,
      borderWidth: 1,
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    liveRateBadgeText: {
      fontWeight: '900',
    },
    liveRateGrid: {
      flexDirection: 'row',
      gap: 10,
    },
    liveRateItem: {
      flex: 1,
      minWidth: 0,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 13,
    },
    liveRateValue: {
      marginTop: 6,
      fontWeight: '900',
    },
    liveRateFooter: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
      gap: 4,
    },
    liveRateFooterText: {
      lineHeight: 17,
    },
    quickActionsScroll: {
      marginTop: 18,
      marginHorizontal: -2,
    },
    quickActionsContent: {
      paddingHorizontal: 2,
      paddingRight: 18,
      gap: 10,
    },
    quickActionCard: {
      width: 104,
      minHeight: 82,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      paddingHorizontal: 10,
    },
    quickActionIcon: {
      width: 42,
      height: 42,
      borderRadius: 15,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickActionLabel: {
      fontWeight: '800',
    },
    netWorthHistoryCard: {
      marginTop: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 16,
      gap: 14,
    },
    netWorthHistoryHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    netWorthHistoryTextBox: {
      flex: 1,
      minWidth: 0,
    },
    netWorthHistoryTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    netWorthHistoryTitle: {
      fontWeight: '900',
    },
    netWorthHistoryDescription: {
      marginTop: 7,
      lineHeight: 18,
    },
    historyIconButton: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dashboardLineChartBody: {
      alignSelf: 'center',
      position: 'relative',
      borderRadius: 22,
      backgroundColor: colors.surfaceSoft,
      overflow: 'hidden',
    },
    dashboardLineGuide: {
      position: 'absolute',
      height: 1,
      borderRadius: 999,
      backgroundColor: colors.border,
      opacity: 0.45,
    },
    dashboardLineVerticalGuide: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: 1,
      backgroundColor: colors.textMuted,
      opacity: 0.45,
      zIndex: 2,
    },
    dashboardLineSegment: {
      position: 'absolute',
      height: 3,
      borderRadius: 999,
      backgroundColor: colors.primary,
    },
    dashboardChartTouchLayer: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      zIndex: 5,
    },
    dashboardLinePointTouch: {
      position: 'absolute',
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 4,
    },
    dashboardLinePointDot: {
      width: 10,
      height: 10,
      borderRadius: 999,
      backgroundColor: colors.primary,
      borderWidth: 2,
      borderColor: colors.surface,
    },
    dashboardLinePointDotActive: {
      width: 17,
      height: 17,
      borderWidth: 4,
      borderColor: colors.surface,
      shadowColor: colors.black,
      shadowOpacity: 0.16,
      shadowRadius: 8,
      elevation: 4,
    },
    dashboardChartTooltip: {
      position: 'absolute',
      minHeight: 52,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 9,
      justifyContent: 'center',
      zIndex: 6,
      shadowColor: colors.black,
      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 5,
    },
    dashboardChartTooltipValue: {
      color: colors.text,
      fontWeight: '900',
    },
    dashboardChartTooltipDate: {
      marginTop: 3,
      color: colors.textMuted,
      fontWeight: '800',
    },
    dashboardLineFooter: {
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      flexDirection: 'row',
      gap: 10,
    },
    dashboardLineFooterItem: {
      flex: 1,
      minWidth: 0,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 15,
      padding: 10,
    },
    dashboardLineFooterValue: {
      marginTop: 5,
      color: colors.text,
      fontWeight: '900',
    },
    investmentCard: {
      marginTop: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 16,
      gap: 15,
    },
    investmentHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    investmentTitleBox: {
      flex: 1,
      minWidth: 0,
    },
    investmentTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    investmentTitle: {
      fontWeight: '900',
    },
    investmentDescription: {
      marginTop: 6,
      lineHeight: 18,
    },
    investmentOpenButton: {
      borderRadius: 999,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    investmentOpenText: {
      color: colors.text,
      fontWeight: '900',
    },
    investmentMain: {
      backgroundColor: colors.surfaceSoft,
      borderRadius: 20,
      padding: 14,
    },
    investmentMainValueBox: {
      minWidth: 0,
    },
    investmentMainValue: {
      marginTop: 7,
      marginBottom: 5,
      color: colors.investment,
      fontWeight: '900',
    },
    investmentMetricRow: {
      flexDirection: 'row',
      gap: 10,
    },
    investmentMetricItem: {
      flex: 1,
      minWidth: 0,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 18,
      padding: 13,
    },
    investmentMetricValue: {
      marginTop: 7,
      fontWeight: '900',
    },
    currentHoldingsSection: {
      marginTop: 2,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 14,
      gap: 10,
    },
    currentHoldingsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    currentHoldingsTitle: {
      color: colors.text,
      fontWeight: '900',
    },
    currentHoldingsList: {
      gap: 8,
    },
    currentHoldingChip: {
      minHeight: 48,
      borderRadius: 17,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    currentHoldingIcon: {
      width: 30,
      height: 30,
      borderRadius: 11,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    currentHoldingTextBox: {
      flex: 1,
      minWidth: 0,
    },
    currentHoldingSymbol: {
      color: colors.text,
      fontWeight: '900',
      marginBottom: 2,
    },
    currentHoldingName: {
      maxWidth: '100%',
    },
    currentHoldingValue: {
      maxWidth: 94,
      color: colors.text,
      fontWeight: '900',
      textAlign: 'right',
    },
    grid: {
      marginTop: 18,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    dashboardAlertCard: {
      marginTop: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    dashboardAlertIcon: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dashboardAlertTextBox: {
      flex: 1,
      minWidth: 0,
    },
    dashboardAlertTitle: {
      color: colors.text,
      fontWeight: '900',
    },
    dashboardAlertDescription: {
      marginTop: 4,
      lineHeight: 18,
    },
    progressCard: {
      marginTop: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 18,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 14,
    },
    progressTextBox: {
      flex: 1,
      minWidth: 0,
    },
    progressDescription: {
      marginTop: 6,
      lineHeight: 18,
    },
    progressPercent: {
      color: colors.saving,
    },
    progressTrack: {
      height: 10,
      borderRadius: 999,
      backgroundColor: colors.surfaceSoft,
      marginTop: 16,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: colors.saving,
    },
    sectionHeader: {
      marginTop: 28,
      marginBottom: 14,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    viewAllText: {
      color: colors.text,
      fontWeight: '900',
    },
    recentList: {
      gap: 10,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 18,
    },
    emptyDescription: {
      marginTop: 8,
      lineHeight: 22,
    },
    transactionRow: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
    },
    transactionIcon: {
      width: 44,
      height: 44,
      borderRadius: 15,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    transactionContent: {
      flex: 1,
    },
    transactionTitle: {
      fontWeight: '900',
    },
    transactionMeta: {
      marginTop: 4,
    },
    transactionAmountBox: {
      alignItems: 'flex-end',
      gap: 4,
      maxWidth: 132,
    },
    transactionAmount: {
      fontWeight: '900',
      textAlign: 'right',
    },
  });
}
