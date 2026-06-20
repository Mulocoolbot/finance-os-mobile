import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { StatCard } from '../src/components/ui/StatCard';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import {
  TradingAccount,
  TradingTrade,
  useFinanceStore,
} from '../src/stores/useFinanceStore';
import { Currency } from '../src/types/finance';
import { formatCurrency } from '../src/utils/currency';
import { convertCurrencyAmount } from '../src/utils/currencyConversion';

type PeriodFilter = 'week' | 'month' | 'year' | 'all';

type PoolBucket = {
  id: string;
  label: string;
  description: string;
  percent: number;
  icon: keyof typeof Ionicons.glyphMap;
};

const periodFilters: {
  label: string;
  value: PeriodFilter;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { label: 'This week', value: 'week', icon: 'calendar-outline' },
  { label: 'This month', value: 'month', icon: 'calendar-number-outline' },
  { label: 'This year', value: 'year', icon: 'calendar-clear-outline' },
  { label: 'All time', value: 'all', icon: 'infinite-outline' },
];

const defaultBuckets: PoolBucket[] = [
  {
    id: 'reinvest',
    label: 'Reinvest',
    description: 'Compound trading capital or keep inside account.',
    percent: 40,
    icon: 'trending-up-outline',
  },
  {
    id: 'withdraw',
    label: 'Withdraw',
    description: 'Cash out profit for personal/liquid use.',
    percent: 35,
    icon: 'cash-outline',
  },
  {
    id: 'reserve',
    label: 'Reserve',
    description: 'Save for emergency buffer or capital protection.',
    percent: 20,
    icon: 'shield-checkmark-outline',
  },
  {
    id: 'other',
    label: 'Other',
    description: 'Flexible pool for fees, tools, or small spending.',
    percent: 5,
    icon: 'apps-outline',
  },
];

function parsePercent(value: string) {
  const parsedValue = Number(value.replace(/[^0-9.]/g, '') || 0);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function getTradingAccountRealAmount(account: TradingAccount | undefined, amount: number) {
  if (account?.accountType === 'cent') {
    return amount / 100;
  }

  return amount;
}

function isTradeInPeriod(trade: TradingTrade, period: PeriodFilter) {
  if (trade.status !== 'closed' || !trade.closeDate) {
    return false;
  }

  if (period === 'all') {
    return true;
  }

  const now = new Date();
  const closeDate = new Date(trade.closeDate);

  if (Number.isNaN(closeDate.getTime())) {
    return false;
  }

  if (period === 'week') {
    const start = new Date(now);
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;

    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - diff);

    return closeDate >= start;
  }

  if (period === 'month') {
    return closeDate.getFullYear() === now.getFullYear() && closeDate.getMonth() === now.getMonth();
  }

  if (period === 'year') {
    return closeDate.getFullYear() === now.getFullYear();
  }

  return true;
}

function convertTradePnL(
  trade: TradingTrade,
  account: TradingAccount | undefined,
  targetCurrency: Currency,
  exchangeRates: Record<Currency, number>
) {
  const realAmount = getTradingAccountRealAmount(account, trade.netProfitLoss);

  return convertCurrencyAmount(realAmount, trade.currency, targetCurrency, exchangeRates);
}

function getPoolStatus(netProfit: number) {
  if (netProfit > 0) {
    return {
      title: 'Profit available',
      message: 'You can split realized profit into your pool plan.',
      icon: 'checkmark-circle-outline' as keyof typeof Ionicons.glyphMap,
    };
  }

  if (netProfit < 0) {
    return {
      title: 'No distribution',
      message: 'This period is negative. Focus on recovery and risk control before withdrawing.',
      icon: 'alert-circle-outline' as keyof typeof Ionicons.glyphMap,
    };
  }

  return {
    title: 'No closed profit yet',
    message: 'Close trades in the selected period to generate a pool plan.',
    icon: 'time-outline' as keyof typeof Ionicons.glyphMap,
  };
}

export default function TradingProfitPoolScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const tradingAccounts = useFinanceStore((state) => state.tradingAccounts);
  const tradingTrades = useFinanceStore((state) => state.tradingTrades);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);
  const exchangeRates = useFinanceStore((state) => state.exchangeRates);

  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('week');
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [bucketPercents, setBucketPercents] = useState(() =>
    defaultBuckets.reduce<Record<string, string>>((acc, bucket) => {
      acc[bucket.id] = String(bucket.percent);

      return acc;
    }, {})
  );

  const selectedAccount =
    selectedAccountId === 'all'
      ? undefined
      : tradingAccounts.find((account) => account.id === selectedAccountId);

  const filteredTrades = useMemo(() => {
    return tradingTrades.filter((trade) => {
      const matchesAccount =
        selectedAccountId === 'all' || trade.tradingAccountId === selectedAccountId;

      return matchesAccount && isTradeInPeriod(trade, periodFilter);
    });
  }, [periodFilter, selectedAccountId, tradingTrades]);

  const poolSummary = useMemo(() => {
    const wins = filteredTrades.filter((trade) => trade.netProfitLoss > 0).length;
    const losses = filteredTrades.filter((trade) => trade.netProfitLoss < 0).length;
    const netProfit = filteredTrades.reduce((total, trade) => {
      const account = tradingAccounts.find((item) => item.id === trade.tradingAccountId);

      return total + convertTradePnL(trade, account, defaultCurrency, exchangeRates);
    }, 0);
    const grossProfit = filteredTrades
      .filter((trade) => trade.netProfitLoss > 0)
      .reduce((total, trade) => {
        const account = tradingAccounts.find((item) => item.id === trade.tradingAccountId);

        return total + convertTradePnL(trade, account, defaultCurrency, exchangeRates);
      }, 0);
    const grossLoss = Math.abs(
      filteredTrades
        .filter((trade) => trade.netProfitLoss < 0)
        .reduce((total, trade) => {
          const account = tradingAccounts.find((item) => item.id === trade.tradingAccountId);

          return total + convertTradePnL(trade, account, defaultCurrency, exchangeRates);
        }, 0)
    );
    const winRate = filteredTrades.length > 0 ? (wins / filteredTrades.length) * 100 : 0;

    return {
      closedTrades: filteredTrades.length,
      wins,
      losses,
      winRate,
      netProfit,
      grossProfit,
      grossLoss,
    };
  }, [defaultCurrency, exchangeRates, filteredTrades, tradingAccounts]);

  const distributionBase = Math.max(poolSummary.netProfit, 0);
  const totalPercent = defaultBuckets.reduce(
    (total, bucket) => total + parsePercent(bucketPercents[bucket.id] || '0'),
    0
  );
  const status = getPoolStatus(poolSummary.netProfit);

  function resetPercents() {
    setBucketPercents(
      defaultBuckets.reduce<Record<string, string>>((acc, bucket) => {
        acc[bucket.id] = String(bucket.percent);

        return acc;
      }, {})
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.headerText}>
          <AppText variant="caption" muted>
            Trading Journal
          </AppText>

          <AppText variant="title" style={styles.title}>
            Profit Pool
          </AppText>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroTextBox}>
            <AppText variant="caption" muted>
              Realized Net Profit
            </AppText>

            <AppText
              variant="title"
              style={[
                styles.heroValue,
                { color: poolSummary.netProfit >= 0 ? colors.income : colors.expense },
              ]}
            >
              {formatCurrency(poolSummary.netProfit, defaultCurrency)}
            </AppText>

            <AppText variant="caption" muted style={styles.heroDescription}>
              Based on closed trades in the selected period.
            </AppText>
          </View>

          <View style={styles.statusBadge}>
            <Ionicons
              name={status.icon}
              size={15}
              color={poolSummary.netProfit > 0 ? colors.income : poolSummary.netProfit < 0 ? colors.expense : colors.textMuted}
            />

            <AppText
              variant="caption"
              style={[
                styles.statusBadgeText,
                {
                  color:
                    poolSummary.netProfit > 0
                      ? colors.income
                      : poolSummary.netProfit < 0
                        ? colors.expense
                        : colors.textMuted,
                },
              ]}
            >
              {status.title}
            </AppText>
          </View>
        </View>

        <AppText variant="body" muted style={styles.statusMessage}>
          {status.message}
        </AppText>
      </View>

      <View style={styles.filterSection}>
        <AppText variant="subtitle">Period</AppText>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {periodFilters.map((filter) => {
              const active = periodFilter === filter.value;

              return (
                <Pressable
                  key={filter.value}
                  onPress={() => setPeriodFilter(filter.value)}
                  style={[styles.filterChip, active ? styles.filterChipActive : null]}
                >
                  <Ionicons
                    name={filter.icon}
                    size={15}
                    color={active ? colors.black : colors.textMuted}
                  />

                  <AppText
                    variant="caption"
                    style={[styles.filterChipText, active ? styles.filterChipTextActive : null]}
                  >
                    {filter.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View style={styles.filterSection}>
        <AppText variant="subtitle">Trading Account</AppText>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            <Pressable
              onPress={() => setSelectedAccountId('all')}
              style={[styles.filterChip, selectedAccountId === 'all' ? styles.filterChipActive : null]}
            >
              <Ionicons
                name="apps-outline"
                size={15}
                color={selectedAccountId === 'all' ? colors.black : colors.textMuted}
              />

              <AppText
                variant="caption"
                style={[
                  styles.filterChipText,
                  selectedAccountId === 'all' ? styles.filterChipTextActive : null,
                ]}
              >
                All accounts
              </AppText>
            </Pressable>

            {tradingAccounts.map((account) => {
              const active = selectedAccountId === account.id;

              return (
                <Pressable
                  key={account.id}
                  onPress={() => setSelectedAccountId(account.id)}
                  style={[styles.filterChip, active ? styles.filterChipActive : null]}
                >
                  <Ionicons
                    name="desktop-outline"
                    size={15}
                    color={active ? colors.black : colors.textMuted}
                  />

                  <AppText
                    variant="caption"
                    style={[styles.filterChipText, active ? styles.filterChipTextActive : null]}
                    numberOfLines={1}
                  >
                    {account.name}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View style={styles.metricGrid}>
        <StatCard label="Closed Trades" value={`${poolSummary.closedTrades}`} />
        <StatCard label="Win Rate" value={`${poolSummary.winRate.toFixed(0)}%`} />
        <StatCard
          label="Gross Profit"
          value={formatCurrency(poolSummary.grossProfit, defaultCurrency)}
          tone="income"
        />
        <StatCard
          label="Gross Loss"
          value={formatCurrency(poolSummary.grossLoss, defaultCurrency)}
          tone={poolSummary.grossLoss > 0 ? 'expense' : undefined}
        />
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Pool Split</AppText>

        <Pressable onPress={resetPercents} style={styles.resetButton}>
          <Ionicons name="refresh-outline" size={15} color={colors.text} />

          <AppText variant="caption" style={styles.resetButtonText}>
            Reset
          </AppText>
        </Pressable>
      </View>

      <View style={styles.totalPercentCard}>
        <AppText variant="caption" muted>
          Total allocation
        </AppText>

        <AppText
          variant="subtitle"
          style={[
            styles.totalPercentValue,
            { color: Math.abs(totalPercent - 100) < 0.0001 ? colors.income : colors.investment },
          ]}
        >
          {totalPercent.toFixed(totalPercent % 1 === 0 ? 0 : 1)}%
        </AppText>

        <AppText variant="caption" muted style={styles.totalPercentHint}>
          {Math.abs(totalPercent - 100) < 0.0001
            ? 'Allocation is balanced.'
            : 'Try to keep total allocation at 100%.'}
        </AppText>
      </View>

      <View style={styles.bucketList}>
        {defaultBuckets.map((bucket) => {
          const percent = parsePercent(bucketPercents[bucket.id] || '0');
          const amount = distributionBase * (percent / 100);

          return (
            <View key={bucket.id} style={styles.bucketCard}>
              <View style={styles.bucketHeader}>
                <View style={styles.bucketIcon}>
                  <Ionicons name={bucket.icon} size={20} color={colors.text} />
                </View>

                <View style={styles.bucketTitleBox}>
                  <AppText variant="body" style={styles.bucketTitle}>
                    {bucket.label}
                  </AppText>

                  <AppText variant="caption" muted style={styles.bucketDescription}>
                    {bucket.description}
                  </AppText>
                </View>

                <View style={styles.percentInputBox}>
                  <TextInput
                    value={bucketPercents[bucket.id] || ''}
                    onChangeText={(value) =>
                      setBucketPercents((current) => ({
                        ...current,
                        [bucket.id]: value,
                      }))
                    }
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    style={styles.percentInput}
                  />

                  <AppText variant="caption" muted>
                    %
                  </AppText>
                </View>
              </View>

              <View style={styles.bucketAmountBox}>
                <AppText variant="caption" muted>
                  Pool amount
                </AppText>

                <AppText variant="subtitle" style={styles.bucketAmount}>
                  {formatCurrency(amount, defaultCurrency)}
                </AppText>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.noteCard}>
        <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />

        <AppText variant="caption" muted style={styles.noteText}>
          This is a journal planner. It does not move money automatically. Use Trading Cash Flow or normal account transactions when you actually withdraw or transfer profit.
        </AppText>
      </View>
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: {
      marginBottom: 22,
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
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      marginTop: 4,
    },
    heroCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 28,
      padding: 18,
      gap: 12,
    },
    heroTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 14,
      alignItems: 'flex-start',
    },
    heroTextBox: {
      flex: 1,
      minWidth: 0,
    },
    heroValue: {
      marginTop: 7,
      fontSize: 29,
      lineHeight: 35,
    },
    heroDescription: {
      marginTop: 4,
      lineHeight: 18,
    },
    statusBadge: {
      borderRadius: 999,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 7,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statusBadgeText: {
      fontWeight: '900',
    },
    statusMessage: {
      lineHeight: 22,
    },
    filterSection: {
      marginTop: 20,
      gap: 10,
    },
    chipRow: {
      flexDirection: 'row',
      gap: 9,
      paddingRight: 8,
    },
    filterChip: {
      minHeight: 40,
      maxWidth: 170,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterChipText: {
      color: colors.textMuted,
      fontWeight: '900',
    },
    filterChipTextActive: {
      color: colors.black,
    },
    metricGrid: {
      marginTop: 20,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    sectionHeader: {
      marginTop: 26,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    resetButton: {
      minHeight: 34,
      borderRadius: 13,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    resetButtonText: {
      color: colors.text,
      fontWeight: '900',
    },
    totalPercentCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 14,
    },
    totalPercentValue: {
      marginTop: 5,
    },
    totalPercentHint: {
      marginTop: 5,
      lineHeight: 18,
    },
    bucketList: {
      marginTop: 12,
      gap: 12,
    },
    bucketCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 14,
      gap: 13,
    },
    bucketHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
    },
    bucketIcon: {
      width: 42,
      height: 42,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bucketTitleBox: {
      flex: 1,
      minWidth: 0,
    },
    bucketTitle: {
      color: colors.text,
      fontWeight: '900',
    },
    bucketDescription: {
      marginTop: 4,
      lineHeight: 18,
    },
    percentInputBox: {
      minWidth: 70,
      minHeight: 42,
      borderRadius: 15,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 9,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
    },
    percentInput: {
      minWidth: 32,
      color: colors.text,
      textAlign: 'center',
      fontWeight: '900',
      fontSize: 15,
      paddingVertical: 0,
    },
    bucketAmountBox: {
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
    },
    bucketAmount: {
      marginTop: 5,
    },
    noteCard: {
      marginTop: 18,
      marginBottom: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 13,
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
    },
    noteText: {
      flex: 1,
      lineHeight: 19,
    },
  });
}
