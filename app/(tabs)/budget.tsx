import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BudgetCard } from '../../src/components/cards/BudgetCard';
import { AppText } from '../../src/components/ui/AppText';
import { Screen } from '../../src/components/ui/Screen';
import { StatCard } from '../../src/components/ui/StatCard';
import { ThemeColors } from '../../src/constants/colors';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useFinanceStore } from '../../src/stores/useFinanceStore';
import { Budget, Transaction } from '../../src/types/finance';
import { formatCompactCurrency } from '../../src/utils/formatCompactCurrency';
import { convertCurrencyAmount, ExchangeRates } from '../../src/utils/currencyConversion';

type BudgetStatus = 'all' | 'on-track' | 'warning' | 'exceeded';
type AutomationTone = 'healthy' | 'watch' | 'limit';

type BudgetPeriodRange = {
  start: Date;
  end: Date;
};

type BudgetRow = {
  budget: Budget;
  usedAmount: number;
  percentage: number;
  projectedAmount: number;
  projectedPercentage: number;
  remainingAmount: number;
  safeDailySpend: number;
  daysLeft: number;
  daysElapsed: number;
  totalDays: number;
  periodRange: BudgetPeriodRange;
  status: BudgetStatus;
  automationTone: AutomationTone;
  automationTitle: string;
  automationMessage: string;
};

type FilterValue = BudgetStatus;

const filters: { label: string; value: FilterValue }[] = [
  { label: 'All', value: 'all' },
  { label: 'On Track', value: 'on-track' },
  { label: 'Warning', value: 'warning' },
  { label: 'Exceeded', value: 'exceeded' },
];

function normalizeDate(date: Date) {
  const copiedDate = new Date(date);

  copiedDate.setHours(0, 0, 0, 0);

  return copiedDate;
}

function getStartOfWeek(date: Date) {
  const copiedDate = normalizeDate(date);
  const day = copiedDate.getDay();
  const diff = day === 0 ? 6 : day - 1;

  copiedDate.setDate(copiedDate.getDate() - diff);

  return copiedDate;
}

function getEndOfWeek(date: Date) {
  const start = getStartOfWeek(date);
  const end = new Date(start);

  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return end;
}

function getStartOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function getEndOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function getBudgetPeriodRange(budget: Budget, now = new Date()): BudgetPeriodRange {
  if (budget.period === 'weekly') {
    return {
      start: getStartOfWeek(now),
      end: getEndOfWeek(now),
    };
  }

  if (budget.period === 'monthly') {
    return {
      start: getStartOfMonth(now),
      end: getEndOfMonth(now),
    };
  }

  const start = budget.startDate ? new Date(budget.startDate) : normalizeDate(now);
  const end = budget.endDate ? new Date(budget.endDate) : normalizeDate(now);

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return {
    start,
    end,
  };
}

function getDayDifference(start: Date, end: Date) {
  const startDate = normalizeDate(start);
  const endDate = normalizeDate(end);
  const diff = endDate.getTime() - startDate.getTime();

  return Math.max(Math.floor(diff / 86400000) + 1, 1);
}

function isTransactionInsideBudgetPeriod(transaction: Transaction, budget: Budget) {
  const transactionDate = new Date(transaction.date);
  const range = getBudgetPeriodRange(budget);

  return transactionDate >= range.start && transactionDate <= range.end;
}

function getBudgetUsedAmount(
  budget: Budget,
  transactions: Transaction[],
  exchangeRates: ExchangeRates
) {
  return transactions
    .filter((transaction) => transaction.type === 'expense')
    .filter((transaction) => {
      if (budget.categoryId && transaction.categoryId) {
        return transaction.categoryId === budget.categoryId;
      }

      return transaction.categoryName === budget.categoryName;
    })
    .filter((transaction) => isTransactionInsideBudgetPeriod(transaction, budget))
    .reduce(
      (total, transaction) =>
        total +
        convertCurrencyAmount(
          transaction.amount,
          transaction.currency || budget.currency,
          budget.currency,
          exchangeRates
        ),
      0
    );
}

function getBudgetStatus(percentage: number): BudgetStatus {
  if (percentage >= 100) return 'exceeded';
  if (percentage >= 85) return 'warning';

  return 'on-track';
}

function getBudgetHealth(totalUsed: number, totalLimit: number) {
  if (totalLimit <= 0) return 0;

  return Math.min((totalUsed / totalLimit) * 100, 999);
}

function getPeriodLabel(budget: Budget) {
  if (budget.period === 'weekly') return 'Weekly auto reset';
  if (budget.period === 'monthly') return 'Monthly auto reset';

  return 'Custom range';
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
  });
}

function getBudgetAutomation(row: {
  budget: Budget;
  percentage: number;
  projectedPercentage: number;
  remainingAmount: number;
  daysLeft: number;
}) {
  if (row.percentage >= 100) {
    return {
      automationTone: 'limit' as AutomationTone,
      automationTitle: 'Limit exceeded',
      automationMessage: 'Budget is over limit. Pause spending in this category or increase the limit intentionally.',
    };
  }

  if (row.projectedPercentage >= 100) {
    return {
      automationTone: 'watch' as AutomationTone,
      automationTitle: 'Projected to exceed',
      automationMessage: 'Your current pace may exceed the budget before the period resets.',
    };
  }

  if (row.percentage >= 85) {
    return {
      automationTone: 'watch' as AutomationTone,
      automationTitle: 'Near limit',
      automationMessage: `Only ${row.daysLeft} day${row.daysLeft === 1 ? '' : 's'} left. Keep spending controlled.`,
    };
  }

  return {
    automationTone: 'healthy' as AutomationTone,
    automationTitle: 'Auto tracking',
    automationMessage:
      row.budget.period === 'custom'
        ? 'Custom budget is tracking within its selected date range.'
        : 'Budget progress resets automatically based on the active period.',
  };
}

function getNextResetText(rows: BudgetRow[]) {
  const activeResetRows = rows.filter((row) => row.budget.period !== 'custom');

  if (activeResetRows.length === 0) {
    return 'Custom only';
  }

  const nearestRow = [...activeResetRows].sort(
    (a, b) => a.periodRange.end.getTime() - b.periodRange.end.getTime()
  )[0];

  return `${nearestRow.budget.name} • ${formatShortDate(nearestRow.periodRange.end)}`;
}

function getAutomationToneColor(tone: AutomationTone, colors: ThemeColors) {
  if (tone === 'limit') return colors.expense;
  if (tone === 'watch') return colors.investment;

  return colors.income;
}

function getAutomationToneIcon(tone: AutomationTone): keyof typeof Ionicons.glyphMap {
  if (tone === 'limit') return 'alert-circle-outline';
  if (tone === 'watch') return 'warning-outline';

  return 'sparkles-outline';
}

export default function BudgetScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const budgets = useFinanceStore((state) => state.budgets);
  const transactions = useFinanceStore((state) => state.transactions);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);
  const exchangeRates = useFinanceStore((state) => state.exchangeRates);

  const [selectedFilter, setSelectedFilter] = useState<FilterValue>('all');

  const allBudgetRows = useMemo(() => {
    const now = new Date();

    return budgets
      .map((budget) => {
        const periodRange = getBudgetPeriodRange(budget, now);
        const usedAmount = getBudgetUsedAmount(budget, transactions, exchangeRates);
        const percentage = budget.limitAmount > 0 ? (usedAmount / budget.limitAmount) * 100 : 0;
        const remainingAmount = budget.limitAmount - usedAmount;
        const totalDays = getDayDifference(periodRange.start, periodRange.end);
        const daysElapsed = Math.min(getDayDifference(periodRange.start, now), totalDays);
        const daysLeft = Math.max(getDayDifference(now, periodRange.end), 1);
        const projectedAmount =
          daysElapsed > 0 ? (usedAmount / daysElapsed) * totalDays : usedAmount;
        const projectedPercentage =
          budget.limitAmount > 0 ? (projectedAmount / budget.limitAmount) * 100 : 0;
        const safeDailySpend = Math.max(remainingAmount, 0) / daysLeft;
        const automation = getBudgetAutomation({
          budget,
          percentage,
          projectedPercentage,
          remainingAmount,
          daysLeft,
        });

        return {
          budget,
          usedAmount,
          percentage,
          projectedAmount,
          projectedPercentage,
          remainingAmount,
          safeDailySpend,
          daysLeft,
          daysElapsed,
          totalDays,
          periodRange,
          status: getBudgetStatus(percentage),
          ...automation,
        };
      })
      .sort((a, b) => b.percentage - a.percentage);
  }, [budgets, transactions, exchangeRates]);

  const budgetRows = useMemo(() => {
    return allBudgetRows.filter((row) => row.budget.isActive !== false);
  }, [allBudgetRows]);

  const archivedBudgetRows = useMemo(() => {
    return allBudgetRows.filter((row) => row.budget.isActive === false);
  }, [allBudgetRows]);

  const filteredRows = useMemo(() => {
    if (selectedFilter === 'all') return budgetRows;

    return budgetRows.filter((row) => row.status === selectedFilter);
  }, [budgetRows, selectedFilter]);

  const budgetSummary = useMemo(() => {
    const totalLimit = budgetRows.reduce(
      (total, row) =>
        total +
        convertCurrencyAmount(
          row.budget.limitAmount,
          row.budget.currency,
          defaultCurrency,
          exchangeRates
        ),
      0
    );
    const totalUsed = budgetRows.reduce(
      (total, row) =>
        total +
        convertCurrencyAmount(
          row.usedAmount,
          row.budget.currency,
          defaultCurrency,
          exchangeRates
        ),
      0
    );
    const totalProjected = budgetRows.reduce(
      (total, row) =>
        total +
        convertCurrencyAmount(
          row.projectedAmount,
          row.budget.currency,
          defaultCurrency,
          exchangeRates
        ),
      0
    );
    const warningCount = budgetRows.filter((row) => row.status === 'warning').length;
    const exceededCount = budgetRows.filter((row) => row.status === 'exceeded').length;
    const projectedExceededCount = budgetRows.filter(
      (row) => row.projectedPercentage >= 100 && row.percentage < 100
    ).length;
    const remaining = totalLimit - totalUsed;
    const health = getBudgetHealth(totalUsed, totalLimit);
    const projectedHealth = getBudgetHealth(totalProjected, totalLimit);
    const nextReset = getNextResetText(budgetRows);

    return {
      totalLimit,
      totalUsed,
      totalProjected,
      warningCount,
      exceededCount,
      projectedExceededCount,
      remaining,
      health,
      projectedHealth,
      nextReset,
    };
  }, [budgetRows, defaultCurrency, exchangeRates]);

  const healthColor =
    budgetSummary.health >= 100
      ? colors.expense
      : budgetSummary.health >= 85
        ? colors.investment
        : colors.income;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="caption" muted>
            Spending Control
          </AppText>

          <AppText variant="title" style={styles.title}>
            Budget
          </AppText>
        </View>

        <Pressable onPress={() => router.push('/add-budget')} style={styles.addButton}>
          <Ionicons name="add-outline" size={24} color={colors.black} />
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroTextBox}>
            <AppText variant="caption" muted>
              Budget Usage
            </AppText>

            <AppText variant="title" style={[styles.heroValue, { color: healthColor }]}>
              {budgetSummary.health.toFixed(0)}%
            </AppText>

            <AppText variant="caption" muted style={styles.heroDescription}>
              {formatCompactCurrency(budgetSummary.totalUsed, defaultCurrency)} used from{' '}
              {formatCompactCurrency(budgetSummary.totalLimit, defaultCurrency)}
            </AppText>
          </View>

          <View style={styles.heroBadge}>
            <Ionicons
              name={
                budgetSummary.health >= 100
                  ? 'alert-circle-outline'
                  : budgetSummary.health >= 85
                    ? 'warning-outline'
                    : 'checkmark-circle-outline'
              }
              size={15}
              color={healthColor}
            />

            <AppText variant="caption" style={[styles.heroBadgeText, { color: healthColor }]}>
              {budgetSummary.health >= 100
                ? 'Exceeded'
                : budgetSummary.health >= 85
                  ? 'Warning'
                  : 'Healthy'}
            </AppText>
          </View>
        </View>

        <View style={styles.heroProgressTrack}>
          <View
            style={[
              styles.heroProgressFill,
              {
                width: `${Math.min(budgetSummary.health, 100)}%`,
                backgroundColor: healthColor,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.grid}>
        <StatCard
          label="Total Limit"
          value={formatCompactCurrency(budgetSummary.totalLimit, defaultCurrency)}
        />
        <StatCard
          label="Used"
          value={formatCompactCurrency(budgetSummary.totalUsed, defaultCurrency)}
          tone="expense"
        />
        <StatCard
          label="Remaining"
          value={formatCompactCurrency(budgetSummary.remaining, defaultCurrency)}
          tone={budgetSummary.remaining >= 0 ? 'income' : 'expense'}
        />
        <StatCard
          label="Alerts"
          value={`${budgetSummary.warningCount + budgetSummary.exceededCount}`}
          tone={
            budgetSummary.exceededCount > 0 || budgetSummary.warningCount > 0
              ? 'expense'
              : 'income'
          }
        />
      </View>

      <View style={styles.automationCard}>
        <View style={styles.automationHeader}>
          <View>
            <AppText variant="caption" muted>
              Budget Automation
            </AppText>

            <AppText variant="subtitle" style={styles.automationTitle}>
              Auto period tracking
            </AppText>
          </View>

          <View style={styles.automationIcon}>
            <Ionicons name="repeat-outline" size={20} color={colors.text} />
          </View>
        </View>

        <View style={styles.automationGrid}>
          <View style={styles.automationMetric}>
            <AppText variant="caption" muted>
              Next reset
            </AppText>

            <AppText variant="caption" style={styles.automationValue} numberOfLines={2}>
              {budgetSummary.nextReset}
            </AppText>
          </View>

          <View style={styles.automationMetric}>
            <AppText variant="caption" muted>
              Projected usage
            </AppText>

            <AppText
              variant="caption"
              style={[
                styles.automationValue,
                {
                  color:
                    budgetSummary.projectedHealth >= 100
                      ? colors.expense
                      : budgetSummary.projectedHealth >= 85
                        ? colors.investment
                        : colors.text,
                },
              ]}
            >
              {budgetSummary.projectedHealth.toFixed(0)}%
            </AppText>
          </View>

          <View style={styles.automationMetric}>
            <AppText variant="caption" muted>
              Projected alerts
            </AppText>

            <AppText
              variant="caption"
              style={[
                styles.automationValue,
                {
                  color:
                    budgetSummary.projectedExceededCount > 0
                      ? colors.expense
                      : colors.text,
                },
              ]}
            >
              {budgetSummary.projectedExceededCount}
            </AppText>
          </View>
        </View>

        <AppText variant="caption" muted style={styles.automationDescription}>
          Weekly and monthly budgets reset by active period automatically. Custom budgets use the
          selected start/end date range.
        </AppText>
      </View>

      <View style={styles.filterRow}>
        {filters.map((filter) => {
          const isActive = selectedFilter === filter.value;

          return (
            <Pressable
              key={filter.value}
              onPress={() => setSelectedFilter(filter.value)}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
            >
              <AppText
                variant="caption"
                style={[styles.filterText, isActive && styles.filterTextActive]}
              >
                {filter.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Active Budgets</AppText>
        <AppText variant="caption" muted>
          {filteredRows.length} of {budgetRows.length}
        </AppText>
      </View>

      <View style={styles.list}>
        {budgetRows.length === 0 ? (
          <View style={styles.emptyCard}>
            <AppText variant="subtitle">No budgets yet</AppText>
            <AppText variant="body" muted style={styles.emptyDescription}>
              Create your first budget to monitor category spending.
            </AppText>
          </View>
        ) : null}

        {filteredRows.map((row) => (
          <BudgetRowItem key={row.budget.id} row={row} colors={colors} exchangeRates={exchangeRates} defaultCurrency={defaultCurrency} />
        ))}
      </View>

      {archivedBudgetRows.length > 0 ? (
        <>
          <View style={styles.sectionHeader}>
            <AppText variant="subtitle">Archived Budgets</AppText>
            <AppText variant="caption" muted>
              {archivedBudgetRows.length} inactive
            </AppText>
          </View>

          <View style={styles.list}>
            {archivedBudgetRows.map((row) => (
              <BudgetCard
                key={row.budget.id}
                budget={row.budget}
                usedAmount={row.usedAmount}
                displayCurrency={defaultCurrency}
                exchangeRates={exchangeRates}
                onPress={() => router.push(`/edit-budget?budgetId=${row.budget.id}`)}
              />
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function BudgetRowItem({
  row,
  colors,
  exchangeRates,
  defaultCurrency,
}: {
  row: BudgetRow;
  colors: ThemeColors;
  exchangeRates: ExchangeRates;
  defaultCurrency: Budget['currency'];
}) {
  const styles = createStyles(colors);
  const toneColor = getAutomationToneColor(row.automationTone, colors);

  return (
    <View style={styles.budgetAutomationWrapper}>
      <BudgetCard
        budget={row.budget}
        usedAmount={row.usedAmount}
        displayCurrency={defaultCurrency}
        exchangeRates={exchangeRates}
        onPress={() => router.push(`/edit-budget?budgetId=${row.budget.id}`)}
      />

      <View style={styles.budgetAutomationPanel}>
        <View style={styles.budgetAutomationTop}>
          <View style={[styles.budgetAutomationIcon, { borderColor: toneColor }]}>
            <Ionicons name={getAutomationToneIcon(row.automationTone)} size={17} color={toneColor} />
          </View>

          <View style={styles.budgetAutomationTextBox}>
            <AppText variant="body" style={[styles.budgetAutomationTitle, { color: toneColor }]}>
              {row.automationTitle}
            </AppText>

            <AppText variant="caption" muted style={styles.budgetAutomationMessage}>
              {row.automationMessage}
            </AppText>
          </View>
        </View>

        <View style={styles.budgetAutomationStats}>
          <MiniMetric label="Period" value={`${formatShortDate(row.periodRange.start)} - ${formatShortDate(row.periodRange.end)}`} colors={colors} />
          <MiniMetric label="Days left" value={`${row.daysLeft}`} colors={colors} />
          <MiniMetric
            label="Safe / day"
            value={formatCompactCurrency(row.safeDailySpend, row.budget.currency)}
            colors={colors}
          />
          <MiniMetric
            label="Projected"
            value={`${Math.min(row.projectedPercentage, 999).toFixed(0)}%`}
            colors={colors}
            valueColor={row.projectedPercentage >= 100 ? colors.expense : row.projectedPercentage >= 85 ? colors.investment : colors.text}
          />
        </View>

        <AppText variant="caption" muted style={styles.autoResetHint}>
          {getPeriodLabel(row.budget)} • Current progress is calculated from this active period only.
        </AppText>
      </View>
    </View>
  );
}

function MiniMetric({
  label,
  value,
  colors,
  valueColor,
}: {
  label: string;
  value: string;
  colors: ThemeColors;
  valueColor?: string;
}) {
  const styles = createStyles(colors);

  return (
    <View style={styles.miniMetric}>
      <AppText variant="caption" muted numberOfLines={1}>
        {label}
      </AppText>

      <AppText
        variant="caption"
        style={[styles.miniMetricValue, valueColor ? { color: valueColor } : null]}
        numberOfLines={2}
      >
        {value}
      </AppText>
    </View>
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
    headerText: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      marginTop: 4,
    },
    addButton: {
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
      borderRadius: 28,
      padding: 22,
      marginBottom: 18,
    },
    heroTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 14,
    },
    heroTextBox: {
      flex: 1,
      minWidth: 0,
    },
    heroValue: {
      marginTop: 8,
      fontSize: 34,
      lineHeight: 40,
    },
    heroDescription: {
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
      fontWeight: '900',
    },
    heroProgressTrack: {
      height: 10,
      borderRadius: 999,
      backgroundColor: colors.surfaceSoft,
      marginTop: 18,
      overflow: 'hidden',
    },
    heroProgressFill: {
      height: '100%',
      borderRadius: 999,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    automationCard: {
      marginTop: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 16,
    },
    automationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      alignItems: 'center',
    },
    automationTitle: {
      marginTop: 4,
    },
    automationIcon: {
      width: 42,
      height: 42,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    automationGrid: {
      marginTop: 14,
      flexDirection: 'row',
      gap: 10,
    },
    automationMetric: {
      flex: 1,
      minHeight: 64,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
      justifyContent: 'center',
    },
    automationValue: {
      marginTop: 5,
      color: colors.text,
      fontWeight: '900',
      lineHeight: 16,
    },
    automationDescription: {
      marginTop: 12,
      lineHeight: 19,
    },
    filterRow: {
      marginTop: 20,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    filterPill: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    filterPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterText: {
      color: colors.textMuted,
      fontWeight: '900',
    },
    filterTextActive: {
      color: colors.black,
    },
    sectionHeader: {
      marginTop: 28,
      marginBottom: 14,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 12,
    },
    list: {
      gap: 16,
    },
    budgetAutomationWrapper: {
      gap: 8,
    },
    budgetAutomationPanel: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 13,
      marginTop: -2,
    },
    budgetAutomationTop: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
    },
    budgetAutomationIcon: {
      width: 36,
      height: 36,
      borderRadius: 14,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    budgetAutomationTextBox: {
      flex: 1,
      minWidth: 0,
    },
    budgetAutomationTitle: {
      fontWeight: '900',
    },
    budgetAutomationMessage: {
      marginTop: 4,
      lineHeight: 18,
    },
    budgetAutomationStats: {
      marginTop: 12,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    miniMetric: {
      flexGrow: 1,
      flexBasis: '47%',
      borderRadius: 14,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
    },
    miniMetricValue: {
      marginTop: 4,
      color: colors.text,
      fontWeight: '900',
      lineHeight: 16,
    },
    autoResetHint: {
      marginTop: 10,
      lineHeight: 18,
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
  });
}
