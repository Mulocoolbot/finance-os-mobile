import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { StatCard } from '../src/components/ui/StatCard';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import {
  TradingAccount,
  TradingPlan,
  TradingTrade,
  useFinanceStore,
} from '../src/stores/useFinanceStore';
import { Currency } from '../src/types/finance';
import { formatCurrency } from '../src/utils/currency';
import { convertCurrencyAmount } from '../src/utils/currencyConversion';

type PeriodFilter = 'week' | 'month' | 'year' | 'all';

type InsightTone = 'good' | 'warning' | 'danger' | 'neutral';

type InsightItem = {
  title: string;
  message: string;
  tone: InsightTone;
  icon: keyof typeof Ionicons.glyphMap;
};

type ActionItem = {
  title: string;
  message: string;
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

function getTradingAccountRealAmount(account: TradingAccount | undefined, amount: number) {
  if (account?.accountType === 'cent') {
    return amount / 100;
  }

  return amount;
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

function getAverage(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function getTopMistakes(trades: TradingTrade[]) {
  const mistakeMap = trades.reduce<Record<string, number>>((acc, trade) => {
    trade.mistakeTags.forEach((tag) => {
      const normalizedTag = tag.trim();

      if (!normalizedTag) {
        return;
      }

      acc[normalizedTag] = (acc[normalizedTag] || 0) + 1;
    });

    return acc;
  }, {});

  return Object.entries(mistakeMap)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([tag, count]) => ({ tag, count }));
}

function getTradesByDay(trades: TradingTrade[]) {
  return trades.reduce<Record<string, TradingTrade[]>>((acc, trade) => {
    const dateKey = (trade.closeDate || trade.openDate).slice(0, 10);

    acc[dateKey] = [...(acc[dateKey] || []), trade];

    return acc;
  }, {});
}

function getSessionMinutes(value: string) {
  const [hour, minute] = value.split(':').map((item) => Number(item));

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  return hour * 60 + minute;
}

function getTradeMinutes(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getHours() * 60 + date.getMinutes();
}

function isTradeInsideSession(trade: TradingTrade, plan: TradingPlan | undefined) {
  if (!plan?.sessionStart || !plan?.sessionEnd) {
    return true;
  }

  const tradeMinutes = getTradeMinutes(trade.openDate);
  const sessionStart = getSessionMinutes(plan.sessionStart);
  const sessionEnd = getSessionMinutes(plan.sessionEnd);

  if (tradeMinutes === null || sessionStart === null || sessionEnd === null) {
    return true;
  }

  if (sessionStart <= sessionEnd) {
    return tradeMinutes >= sessionStart && tradeMinutes <= sessionEnd;
  }

  return tradeMinutes >= sessionStart || tradeMinutes <= sessionEnd;
}

function buildPerformanceSummary({
  trades,
  tradingAccounts,
  tradingPlans,
  defaultCurrency,
  exchangeRates,
}: {
  trades: TradingTrade[];
  tradingAccounts: TradingAccount[];
  tradingPlans: TradingPlan[];
  defaultCurrency: Currency;
  exchangeRates: Record<Currency, number>;
}) {
  const wins = trades.filter((trade) => trade.netProfitLoss > 0);
  const losses = trades.filter((trade) => trade.netProfitLoss < 0);
  const breakevens = trades.filter((trade) => trade.netProfitLoss === 0);
  const netProfit = trades.reduce((total, trade) => {
    const account = tradingAccounts.find((item) => item.id === trade.tradingAccountId);

    return total + convertTradePnL(trade, account, defaultCurrency, exchangeRates);
  }, 0);
  const grossProfit = wins.reduce((total, trade) => {
    const account = tradingAccounts.find((item) => item.id === trade.tradingAccountId);

    return total + convertTradePnL(trade, account, defaultCurrency, exchangeRates);
  }, 0);
  const grossLoss = Math.abs(
    losses.reduce((total, trade) => {
      const account = tradingAccounts.find((item) => item.id === trade.tradingAccountId);

      return total + convertTradePnL(trade, account, defaultCurrency, exchangeRates);
    }, 0)
  );
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
  const averageRR = getAverage(trades.map((trade) => trade.rewardRiskRatio).filter((value) => value > 0));
  const averageRisk = getAverage(trades.map((trade) => trade.riskAmount).filter((value) => value > 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;
  const topMistakes = getTopMistakes(trades);
  const tradesByDay = getTradesByDay(trades);
  const maxTradesInDay = Object.values(tradesByDay).reduce(
    (max, dayTrades) => Math.max(max, dayTrades.length),
    0
  );
  const planViolations = trades.filter((trade) => {
    const plan = tradingPlans.find((item) => item.tradingAccountId === trade.tradingAccountId);
    const riskViolation =
      plan && plan.riskPerTradePercent > 0
        ? trade.planRiskLimitAmountSnapshot > 0 &&
          trade.riskAmount > trade.planRiskLimitAmountSnapshot
        : false;
    const rrViolation =
      plan && plan.minimumRewardRiskRatio > 0
        ? trade.rewardRiskRatio > 0 && trade.rewardRiskRatio < plan.minimumRewardRiskRatio
        : false;
    const sessionViolation = !isTradeInsideSession(trade, plan);

    return riskViolation || rrViolation || sessionViolation;
  });

  return {
    closedTrades: trades.length,
    wins: wins.length,
    losses: losses.length,
    breakevens: breakevens.length,
    netProfit,
    grossProfit,
    grossLoss,
    winRate,
    averageRR,
    averageRisk,
    profitFactor,
    topMistakes,
    maxTradesInDay,
    planViolationCount: planViolations.length,
  };
}

function buildInsights(summary: ReturnType<typeof buildPerformanceSummary>): InsightItem[] {
  const insights: InsightItem[] = [];

  if (summary.closedTrades === 0) {
    return [
      {
        title: 'No data yet',
        message: 'Close a few trades first so the AI coach can read your performance pattern.',
        tone: 'neutral',
        icon: 'time-outline',
      },
    ];
  }

  if (summary.netProfit > 0) {
    insights.push({
      title: 'Positive expectancy',
      message: 'Your selected period is net profitable. Protect the process and avoid increasing lot size too fast.',
      tone: 'good',
      icon: 'trending-up-outline',
    });
  } else if (summary.netProfit < 0) {
    insights.push({
      title: 'Negative period',
      message: 'Your selected period is still negative. Focus on risk control, setup quality, and reducing avoidable mistakes.',
      tone: 'danger',
      icon: 'alert-circle-outline',
    });
  } else {
    insights.push({
      title: 'Flat performance',
      message: 'Your net result is around breakeven. Review trade quality and execution consistency.',
      tone: 'neutral',
      icon: 'remove-circle-outline',
    });
  }

  if (summary.winRate >= 55 && summary.averageRR >= 1.5) {
    insights.push({
      title: 'Strong balance',
      message: 'Win rate and average RR look balanced. This is a healthy structure if risk remains controlled.',
      tone: 'good',
      icon: 'shield-checkmark-outline',
    });
  } else if (summary.winRate < 45 && summary.averageRR < 1.5) {
    insights.push({
      title: 'Weak win/RR profile',
      message: 'Win rate and RR are both low. Avoid forcing entries and prioritize setups with cleaner reward potential.',
      tone: 'danger',
      icon: 'warning-outline',
    });
  } else if (summary.averageRR < 1.5) {
    insights.push({
      title: 'RR needs work',
      message: 'Average RR is below the ideal level. Check whether TP is too close or SL is too wide.',
      tone: 'warning',
      icon: 'git-compare-outline',
    });
  }

  if (summary.planViolationCount > 0) {
    insights.push({
      title: 'Plan discipline issue',
      message: `${summary.planViolationCount} trade(s) show possible plan violation from risk, RR, or session timing.`,
      tone: 'warning',
      icon: 'clipboard-outline',
    });
  }

  if (summary.maxTradesInDay >= 5) {
    insights.push({
      title: 'Overtrade risk',
      message: `You reached ${summary.maxTradesInDay} trades in one day. Watch for revenge trading or decision fatigue.`,
      tone: 'warning',
      icon: 'flash-outline',
    });
  }

  if (summary.topMistakes.length > 0) {
    insights.push({
      title: 'Repeated mistakes',
      message: `Most repeated: ${summary.topMistakes.map((item) => `${item.tag} (${item.count})`).join(', ')}.`,
      tone: 'warning',
      icon: 'repeat-outline',
    });
  }

  return insights.slice(0, 6);
}

function buildActionPlan(summary: ReturnType<typeof buildPerformanceSummary>): ActionItem[] {
  if (summary.closedTrades === 0) {
    return [
      {
        title: 'Record closed trades',
        message: 'Add at least 5-10 closed trades to make the analysis more useful.',
        icon: 'add-circle-outline',
      },
    ];
  }

  const actions: ActionItem[] = [];

  if (summary.netProfit < 0) {
    actions.push({
      title: 'Lower execution risk',
      message: 'Trade smaller until the next 5-10 trades show better consistency.',
      icon: 'trending-down-outline',
    });
  }

  if (summary.averageRR < 1.5) {
    actions.push({
      title: 'Improve RR filter',
      message: 'Before entry, reject trades where realistic TP cannot give at least 1:1.5 RR.',
      icon: 'git-compare-outline',
    });
  }

  if (summary.planViolationCount > 0) {
    actions.push({
      title: 'Respect trading plan',
      message: 'Review session, risk, and minimum RR rules before opening another position.',
      icon: 'shield-checkmark-outline',
    });
  }

  if (summary.topMistakes.length > 0) {
    actions.push({
      title: 'Fix one mistake first',
      message: `Focus only on reducing "${summary.topMistakes[0].tag}" in the next trading session.`,
      icon: 'construct-outline',
    });
  }

  if (actions.length === 0) {
    actions.push({
      title: 'Maintain discipline',
      message: 'Keep the same risk, avoid overconfidence, and review after each session.',
      icon: 'checkmark-circle-outline',
    });
  }

  return actions.slice(0, 4);
}

function getInsightColor(tone: InsightTone, colors: ThemeColors) {
  if (tone === 'good') return colors.income;
  if (tone === 'warning') return colors.investment;
  if (tone === 'danger') return colors.expense;

  return colors.textMuted;
}

export default function TradingAiPerformanceScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const tradingAccounts = useFinanceStore((state) => state.tradingAccounts);
  const tradingTrades = useFinanceStore((state) => state.tradingTrades);
  const tradingPlans = useFinanceStore((state) => state.tradingPlans);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);
  const exchangeRates = useFinanceStore((state) => state.exchangeRates);

  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month');
  const [selectedAccountId, setSelectedAccountId] = useState('all');

  const filteredTrades = useMemo(() => {
    return tradingTrades.filter((trade) => {
      const matchesAccount =
        selectedAccountId === 'all' || trade.tradingAccountId === selectedAccountId;

      return matchesAccount && isTradeInPeriod(trade, periodFilter);
    });
  }, [periodFilter, selectedAccountId, tradingTrades]);

  const summary = useMemo(
    () =>
      buildPerformanceSummary({
        trades: filteredTrades,
        tradingAccounts,
        tradingPlans,
        defaultCurrency,
        exchangeRates,
      }),
    [defaultCurrency, exchangeRates, filteredTrades, tradingAccounts, tradingPlans]
  );

  const insights = useMemo(() => buildInsights(summary), [summary]);
  const actionPlan = useMemo(() => buildActionPlan(summary), [summary]);

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
            AI Performance
          </AppText>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroTextBox}>
            <AppText variant="caption" muted>
              AI Trading Coach
            </AppText>

            <AppText
              variant="title"
              style={[
                styles.heroValue,
                { color: summary.netProfit >= 0 ? colors.income : colors.expense },
              ]}
            >
              {formatCurrency(summary.netProfit, defaultCurrency)}
            </AppText>

            <AppText variant="caption" muted style={styles.heroDescription}>
              Local AI-style analysis from closed trades, plan rules, RR, risk, and mistakes.
            </AppText>
          </View>

          <View style={styles.heroIcon}>
            <Ionicons name="sparkles-outline" size={22} color={colors.text} />
          </View>
        </View>
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
        <StatCard label="Closed" value={`${summary.closedTrades}`} />
        <StatCard label="Win Rate" value={`${summary.winRate.toFixed(0)}%`} />
        <StatCard label="Avg RR" value={summary.averageRR.toFixed(2)} />
        <StatCard
          label="Plan Issues"
          value={`${summary.planViolationCount}`}
          tone={summary.planViolationCount > 0 ? 'expense' : 'income'}
        />
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">AI Insights</AppText>

        <AppText variant="caption" muted>
          {insights.length} signal{insights.length === 1 ? '' : 's'}
        </AppText>
      </View>

      <View style={styles.cardList}>
        {insights.map((insight) => {
          const color = getInsightColor(insight.tone, colors);

          return (
            <View key={`${insight.title}-${insight.message}`} style={styles.insightCard}>
              <View style={[styles.insightIcon, { borderColor: color }]}>
                <Ionicons name={insight.icon} size={20} color={color} />
              </View>

              <View style={styles.insightTextBox}>
                <AppText variant="body" style={[styles.insightTitle, { color }]}>
                  {insight.title}
                </AppText>

                <AppText variant="caption" muted style={styles.insightMessage}>
                  {insight.message}
                </AppText>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Next Action Plan</AppText>

        <AppText variant="caption" muted>
          Coach
        </AppText>
      </View>

      <View style={styles.actionList}>
        {actionPlan.map((action, index) => (
          <View key={`${action.title}-${index}`} style={styles.actionCard}>
            <View style={styles.actionNumber}>
              <AppText variant="caption" style={styles.actionNumberText}>
                {index + 1}
              </AppText>
            </View>

            <View style={styles.actionTextBox}>
              <View style={styles.actionTitleRow}>
                <Ionicons name={action.icon} size={16} color={colors.text} />

                <AppText variant="body" style={styles.actionTitle}>
                  {action.title}
                </AppText>
              </View>

              <AppText variant="caption" muted style={styles.actionMessage}>
                {action.message}
              </AppText>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.noteCard}>
        <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />

        <AppText variant="caption" muted style={styles.noteText}>
          This phase uses local analysis, not external AI API yet. Real cloud AI can be added after database/auth so API keys and user data stay safer.
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
    heroIcon: {
      width: 44,
      height: 44,
      borderRadius: 17,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
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
    cardList: {
      gap: 12,
    },
    insightCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 14,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
    },
    insightIcon: {
      width: 42,
      height: 42,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    insightTextBox: {
      flex: 1,
      minWidth: 0,
    },
    insightTitle: {
      fontWeight: '900',
    },
    insightMessage: {
      marginTop: 5,
      lineHeight: 19,
    },
    actionList: {
      gap: 12,
    },
    actionCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 14,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
    },
    actionNumber: {
      width: 32,
      height: 32,
      borderRadius: 13,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionNumberText: {
      color: colors.black,
      fontWeight: '900',
    },
    actionTextBox: {
      flex: 1,
      minWidth: 0,
    },
    actionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    actionTitle: {
      color: colors.text,
      fontWeight: '900',
    },
    actionMessage: {
      marginTop: 5,
      lineHeight: 19,
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
