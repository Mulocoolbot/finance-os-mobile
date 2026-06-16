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

type BudgetRow = {
  budget: Budget;
  usedAmount: number;
  percentage: number;
  status: 'all' | 'on-track' | 'warning' | 'exceeded';
};

type FilterValue = 'all' | 'on-track' | 'warning' | 'exceeded';

const filters: { label: string; value: FilterValue }[] = [
  { label: 'All', value: 'all' },
  { label: 'On Track', value: 'on-track' },
  { label: 'Warning', value: 'warning' },
  { label: 'Exceeded', value: 'exceeded' },
];

function getStartOfWeek(date: Date) {
  const copiedDate = new Date(date);
  const day = copiedDate.getDay();
  const diff = copiedDate.getDate() - day + (day === 0 ? -6 : 1);

  copiedDate.setDate(diff);
  copiedDate.setHours(0, 0, 0, 0);

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

function isTransactionInsideBudgetPeriod(transaction: Transaction, budget: Budget) {
  const transactionDate = new Date(transaction.date);
  const now = new Date();

  if (budget.period === 'weekly') {
    return transactionDate >= getStartOfWeek(now) && transactionDate <= getEndOfWeek(now);
  }

  if (budget.period === 'monthly') {
    return transactionDate >= getStartOfMonth(now) && transactionDate <= getEndOfMonth(now);
  }

  if (budget.period === 'custom') {
    if (!budget.startDate || !budget.endDate) return false;

    const startDate = new Date(budget.startDate);
    const endDate = new Date(budget.endDate);

    endDate.setHours(23, 59, 59, 999);

    return transactionDate >= startDate && transactionDate <= endDate;
  }

  return false;
}

function getBudgetUsedAmount(
  budget: Budget,
  transactions: Transaction[],
  exchangeRates: ExchangeRates
) {
  return transactions
    .filter((transaction) => transaction.type === 'expense')
    .filter((transaction) => {
      if (budget.categoryId && transaction.categoryId) return transaction.categoryId === budget.categoryId;

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

function getBudgetStatus(percentage: number): BudgetRow['status'] {
  if (percentage >= 100) return 'exceeded';
  if (percentage >= 85) return 'warning';

  return 'on-track';
}

function getBudgetHealth(totalUsed: number, totalLimit: number) {
  if (totalLimit <= 0) return 0;

  return Math.min((totalUsed / totalLimit) * 100, 999);
}

export default function BudgetScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const budgets = useFinanceStore((state) => state.budgets);
  const transactions = useFinanceStore((state) => state.transactions);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);
  const exchangeRates = useFinanceStore((state) => state.exchangeRates);

  const [selectedFilter, setSelectedFilter] = useState<FilterValue>('all');

  const budgetRows = useMemo(() => {
    return budgets
      .filter((budget) => budget.isActive)
      .map((budget) => {
        const usedAmount = getBudgetUsedAmount(budget, transactions, exchangeRates);
        const percentage = budget.limitAmount > 0 ? (usedAmount / budget.limitAmount) * 100 : 0;

        return {
          budget,
          usedAmount,
          percentage,
          status: getBudgetStatus(percentage),
        };
      })
      .sort((a, b) => b.percentage - a.percentage);
  }, [budgets, transactions, exchangeRates]);

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
    const warningCount = budgetRows.filter((row) => row.status === 'warning').length;
    const exceededCount = budgetRows.filter((row) => row.status === 'exceeded').length;
    const remaining = totalLimit - totalUsed;
    const health = getBudgetHealth(totalUsed, totalLimit);

    return { totalLimit, totalUsed, warningCount, exceededCount, remaining, health };
  }, [budgetRows, defaultCurrency, exchangeRates]);

  const healthColor = budgetSummary.health >= 100 ? colors.expense : budgetSummary.health >= 85 ? colors.investment : colors.income;

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
              name={budgetSummary.health >= 100 ? 'alert-circle-outline' : budgetSummary.health >= 85 ? 'warning-outline' : 'checkmark-circle-outline'}
              size={15}
              color={healthColor}
            />

            <AppText variant="caption" style={[styles.heroBadgeText, { color: healthColor }]}>
              {budgetSummary.health >= 100 ? 'Exceeded' : budgetSummary.health >= 85 ? 'Warning' : 'Healthy'}
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
        <StatCard label="Total Limit" value={formatCompactCurrency(budgetSummary.totalLimit, defaultCurrency)} />
        <StatCard label="Used" value={formatCompactCurrency(budgetSummary.totalUsed, defaultCurrency)} tone="expense" />
        <StatCard label="Remaining" value={formatCompactCurrency(budgetSummary.remaining, defaultCurrency)} tone={budgetSummary.remaining >= 0 ? 'income' : 'expense'} />
        <StatCard label="Alerts" value={`${budgetSummary.warningCount + budgetSummary.exceededCount}`} tone={budgetSummary.exceededCount > 0 || budgetSummary.warningCount > 0 ? 'expense' : 'income'} />
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
              <AppText variant="caption" style={[styles.filterText, isActive && styles.filterTextActive]}>
                {filter.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Active Budgets</AppText>
        <AppText variant="caption" muted>{filteredRows.length} of {budgetRows.length}</AppText>
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
          <View key={row.budget.id} style={styles.budgetEditWrapper}>
            <BudgetCard
              budget={row.budget}
              usedAmount={row.usedAmount}
              displayCurrency={defaultCurrency}
              exchangeRates={exchangeRates}
            />

            <Pressable
              onPress={() => router.push(`/edit-budget?budgetId=${row.budget.id}`)}
              style={styles.budgetEditAction}
            >
              <Ionicons name="create-outline" size={15} color={colors.text} />

              <AppText variant="caption" style={styles.budgetEditActionText}>
                Edit Budget
              </AppText>
            </Pressable>
          </View>
        ))}
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
    budgetEditWrapper: {
      gap: 8,
    },
    budgetEditAction: {
      alignSelf: 'flex-end',
      minHeight: 36,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      marginRight: 4,
    },
    budgetEditActionText: {
      color: colors.text,
      fontWeight: '900',
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
