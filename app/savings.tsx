import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SavingGoalCard } from '../src/components/cards/SavingGoalCard';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { StatCard } from '../src/components/ui/StatCard';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useFinanceStore } from '../src/stores/useFinanceStore';
import { Currency, SavingGoal } from '../src/types/finance';
import { formatCurrency } from '../src/utils/currency';
import { formatCompactCurrency } from '../src/utils/formatCompactCurrency';
import { convertCurrencyAmount, ExchangeRates } from '../src/utils/currencyConversion';

type FilterValue = 'all' | 'active' | 'completed' | 'paused';

const filters: { label: string; value: FilterValue }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Paused', value: 'paused' },
];

function getSavingProgress(savingGoal: SavingGoal) {
  if (savingGoal.targetAmount <= 0) return 0;

  return Math.min((savingGoal.currentAmount / savingGoal.targetAmount) * 100, 100);
}

function getDeadlineSortValue(savingGoal: SavingGoal) {
  if (!savingGoal.deadline) return Number.MAX_SAFE_INTEGER;

  const date = new Date(savingGoal.deadline).getTime();

  return Number.isNaN(date) ? Number.MAX_SAFE_INTEGER : date;
}

function getSavingAmountInBaseCurrency(
  amount: number,
  savingGoal: SavingGoal,
  currencyBase: Currency,
  exchangeRates: ExchangeRates
) {
  return convertCurrencyAmount(
    amount,
    savingGoal.currency || currencyBase,
    currencyBase,
    exchangeRates
  );
}

export default function SavingsScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const accounts = useFinanceStore((state) => state.accounts);
  const savingGoals = useFinanceStore((state) => state.savingGoals);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);
  const exchangeRates = useFinanceStore((state) => state.exchangeRates);

  const [selectedFilter, setSelectedFilter] = useState<FilterValue>('all');

  const savingSummary = useMemo(() => {
    const totalSaved = savingGoals.reduce(
      (total, saving) =>
        total +
        getSavingAmountInBaseCurrency(
          saving.currentAmount,
          saving,
          defaultCurrency,
          exchangeRates
        ),
      0
    );
    const totalTarget = savingGoals.reduce(
      (total, saving) =>
        total +
        getSavingAmountInBaseCurrency(
          saving.targetAmount,
          saving,
          defaultCurrency,
          exchangeRates
        ),
      0
    );
    const completedGoals = savingGoals.filter((saving) => saving.status === 'completed').length;
    const activeGoals = savingGoals.filter((saving) => saving.status === 'active').length;
    const progress = totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : 0;
    const remaining = Math.max(totalTarget - totalSaved, 0);

    return { totalSaved, totalTarget, completedGoals, activeGoals, progress, remaining };
  }, [savingGoals, defaultCurrency, exchangeRates]);

  const sortedGoals = useMemo(() => {
    return [...savingGoals].sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;

      return getDeadlineSortValue(a) - getDeadlineSortValue(b);
    });
  }, [savingGoals, defaultCurrency, exchangeRates]);

  const filteredGoals = useMemo(() => {
    if (selectedFilter === 'all') return sortedGoals;

    return sortedGoals.filter((goal) => goal.status === selectedFilter);
  }, [sortedGoals, selectedFilter]);

  const bestProgress = useMemo(() => {
    if (savingGoals.length === 0) return 0;

    return Math.max(...savingGoals.map(getSavingProgress));
  }, [savingGoals, defaultCurrency, exchangeRates]);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.headerText}>
          <AppText variant="caption" muted>
            Finance OS Mobile
          </AppText>

          <AppText variant="title" style={styles.title}>
            Savings
          </AppText>
        </View>

        <Pressable onPress={() => router.push('/add-saving')} style={styles.addButton}>
          <Ionicons name="add-outline" size={24} color={colors.black} />
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroTextBox}>
            <AppText variant="caption" muted>
              Total Saved
            </AppText>

            <AppText variant="title" style={styles.totalSaved}>
              {formatCompactCurrency(savingSummary.totalSaved, defaultCurrency)}
            </AppText>

            <AppText variant="caption" muted style={styles.fullValue}>
              {formatCurrency(savingSummary.totalSaved, defaultCurrency)}
            </AppText>
          </View>

          <View style={styles.heroBadge}>
            <Ionicons name="sparkles-outline" size={15} color={colors.saving} />
            <AppText variant="caption" style={styles.heroBadgeText}>
              {savingSummary.activeGoals} active
            </AppText>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${savingSummary.progress}%` }]} />
        </View>

        <AppText variant="caption" muted style={styles.heroCaption}>
          {savingSummary.progress.toFixed(0)}% of all saving targets completed.
        </AppText>
      </View>

      <View style={styles.grid}>
        <StatCard label="Target" value={formatCompactCurrency(savingSummary.totalTarget, defaultCurrency)} tone="saving" />
        <StatCard label="Remaining" value={formatCompactCurrency(savingSummary.remaining, defaultCurrency)} />
        <StatCard label="Completed" value={`${savingSummary.completedGoals}`} tone="income" />
        <StatCard label="Best Goal" value={`${bestProgress.toFixed(0)}%`} tone="saving" />
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
        <AppText variant="subtitle">Saving Goals</AppText>
        <AppText variant="caption" muted>{filteredGoals.length} of {savingGoals.length}</AppText>
      </View>

      <View style={styles.list}>
        {savingGoals.length === 0 ? (
          <View style={styles.emptyCard}>
            <AppText variant="subtitle">No saving goals yet</AppText>
            <AppText variant="body" muted style={styles.emptyDescription}>
              Create your first saving goal and link it to a source wallet.
            </AppText>
          </View>
        ) : null}

        {filteredGoals.map((savingGoal) => (
          <SavingGoalCard
            key={savingGoal.id}
            savingGoal={savingGoal}
            accounts={accounts}
            displayCurrency={defaultCurrency}
            exchangeRates={exchangeRates}
            onPress={() =>
              router.push({
                pathname: '/add-saving',
                params: { savingGoalId: savingGoal.id },
              })
            }
            onDeposit={() =>
              router.push({
                pathname: '/saving-cash-event',
                params: { savingGoalId: savingGoal.id, mode: 'deposit' },
              })
            }
            onWithdrawal={() =>
              router.push({
                pathname: '/saving-cash-event',
                params: { savingGoalId: savingGoal.id, mode: 'withdrawal' },
              })
            }
          />
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
    addButton: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: colors.primary,
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
      padding: 22,
      marginBottom: 18,
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
    totalSaved: {
      marginTop: 8,
      fontSize: 34,
      lineHeight: 40,
      color: colors.saving,
    },
    fullValue: {
      marginTop: 4,
    },
    heroBadge: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 7,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    heroBadgeText: {
      color: colors.saving,
      fontWeight: '900',
    },
    progressTrack: {
      height: 10,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 999,
      marginTop: 18,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.saving,
      borderRadius: 999,
    },
    heroCaption: {
      marginTop: 10,
      lineHeight: 18,
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
      gap: 12,
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
