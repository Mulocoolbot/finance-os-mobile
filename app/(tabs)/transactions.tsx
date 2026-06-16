import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../../src/components/ui/AppText';
import { Screen } from '../../src/components/ui/Screen';
import { StatCard } from '../../src/components/ui/StatCard';
import { ThemeColors } from '../../src/constants/colors';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useFinanceStore } from '../../src/stores/useFinanceStore';
import { Currency, Transaction, TransactionType } from '../../src/types/finance';
import { formatCurrency } from '../../src/utils/currency';
import { formatCompactCurrency } from '../../src/utils/formatCompactCurrency';
import { convertCurrencyAmount, ExchangeRates, getTransactionHistoricalAmountInCurrency } from '../../src/utils/currencyConversion';

type FilterValue = 'all' | 'income' | 'expense' | 'transfer' | 'saving';

const filters: { label: string; value: FilterValue }[] = [
  { label: 'All', value: 'all' },
  { label: 'Income', value: 'income' },
  { label: 'Expense', value: 'expense' },
  { label: 'Transfer', value: 'transfer' },
  { label: 'Saving', value: 'saving' },
];

function isCurrentMonth(dateValue: string) {
  const date = new Date(dateValue);
  const now = new Date();

  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function getDateLabel(dateValue: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateValue));
}

function getDateKey(dateValue: string) {
  return new Date(dateValue).toISOString().slice(0, 10);
}

function getTransactionTone(colors: ThemeColors, type: TransactionType) {
  if (type === 'income') return colors.income;
  if (type === 'expense') return colors.expense;
  if (type === 'saving_deposit' || type === 'saving_withdrawal') return colors.saving;
  if (type === 'investment_buy' || type === 'investment_sell') return colors.investment;

  return colors.transfer;
}

function getTransactionIcon(type: TransactionType) {
  if (type === 'income') return 'arrow-down-outline';
  if (type === 'expense') return 'arrow-up-outline';
  if (type === 'transfer') return 'swap-horizontal-outline';
  if (type === 'saving_deposit') return 'sparkles-outline';
  if (type === 'saving_withdrawal') return 'return-down-back-outline';
  if (type === 'investment_buy' || type === 'investment_sell') return 'trending-up-outline';

  return 'ellipse-outline';
}

function getTransactionSign(type: TransactionType) {
  if (type === 'income') return '+';
  if (type === 'expense') return '-';

  return '';
}

function matchFilter(transaction: Transaction, filter: FilterValue) {
  if (filter === 'all') return true;
  if (filter === 'saving') {
    return transaction.type === 'saving_deposit' || transaction.type === 'saving_withdrawal';
  }

  return transaction.type === filter;
}

function getTransactionAmountInBaseCurrency(
  transaction: Transaction,
  currencyBase: Currency,
  exchangeRates: ExchangeRates
) {
  return getTransactionHistoricalAmountInCurrency(
    transaction,
    currencyBase,
    exchangeRates
  );
}

export default function TransactionsScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const transactions = useFinanceStore((state) => state.transactions);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);
  const exchangeRates = useFinanceStore((state) => state.exchangeRates);

  const [selectedFilter, setSelectedFilter] = useState<FilterValue>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const monthlyTransactions = useMemo(() => {
    return transactions.filter((transaction) => isCurrentMonth(transaction.date));
  }, [transactions]);

  const monthlySummary = useMemo(() => {
    const income = monthlyTransactions
      .filter((transaction) => transaction.type === 'income')
      .reduce(
        (total, transaction) =>
          total +
          getTransactionAmountInBaseCurrency(
            transaction,
            defaultCurrency,
            exchangeRates
          ),
        0
      );

    const expense = monthlyTransactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce(
        (total, transaction) =>
          total +
          getTransactionAmountInBaseCurrency(
            transaction,
            defaultCurrency,
            exchangeRates
          ),
        0
      );

    return {
      income,
      expense,
      net: income - expense,
      count: monthlyTransactions.length,
    };
  }, [monthlyTransactions, defaultCurrency, exchangeRates]);

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return transactions
      .filter((transaction) => matchFilter(transaction, selectedFilter))
      .filter((transaction) => {
        if (!query) return true;

        return [
          transaction.title,
          transaction.categoryName,
          transaction.accountName,
          transaction.note,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedFilter, searchQuery]);

  const groupedTransactions = useMemo(() => {
    return filteredTransactions.reduce<Record<string, Transaction[]>>((acc, transaction) => {
      const key = getDateKey(transaction.date);

      if (!acc[key]) acc[key] = [];

      acc[key].push(transaction);

      return acc;
    }, {});
  }, [filteredTransactions]);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="caption" muted>
            Money Movement
          </AppText>

          <AppText variant="title" style={styles.title}>
            Transactions
          </AppText>
        </View>

        <Pressable onPress={() => router.push('/add-transaction')} style={styles.addButton}>
          <Ionicons name="add-outline" size={24} color={colors.black} />
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroTextBox}>
            <AppText variant="caption" muted>
              This Month Net Flow
            </AppText>

            <AppText
              variant="title"
              style={[
                styles.heroValue,
                {
                  color: monthlySummary.net >= 0 ? colors.income : colors.expense,
                },
              ]}
            >
              {formatCompactCurrency(monthlySummary.net, defaultCurrency)}
            </AppText>

            <AppText variant="caption" muted style={styles.heroCaption}>
              {monthlySummary.count} transactions recorded this month.
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.grid}>
        <StatCard label="Income" value={formatCompactCurrency(monthlySummary.income, defaultCurrency)} tone="income" />
        <StatCard label="Expense" value={formatCompactCurrency(monthlySummary.expense, defaultCurrency)} tone="expense" />
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search transactions..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
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
        <AppText variant="subtitle">Activity</AppText>
        <AppText variant="caption" muted>{filteredTransactions.length} items</AppText>
      </View>

      <View style={styles.list}>
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <AppText variant="subtitle">No transactions found</AppText>
            <AppText variant="body" muted style={styles.emptyDescription}>
              Add a transaction or change your filter.
            </AppText>
          </View>
        ) : null}

        {Object.entries(groupedTransactions).map(([dateKey, items]) => (
          <View key={dateKey} style={styles.group}>
            <AppText variant="caption" muted style={styles.groupDate}>
              {getDateLabel(dateKey)}
            </AppText>

            <View style={styles.groupList}>
              {items.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  colors={colors}
                  currencyBase={defaultCurrency}
                  exchangeRates={exchangeRates}
                  onPress={() => router.push(`/edit-transaction?transactionId=${transaction.id}`)}
                />
              ))}
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

function TransactionRow({
  transaction,
  colors,
  currencyBase,
  exchangeRates,
  onPress,
}: {
  transaction: Transaction;
  colors: ThemeColors;
  currencyBase: Currency;
  exchangeRates: ExchangeRates;
  onPress: () => void;
}) {
  const styles = createStyles(colors);
  const tone = getTransactionTone(colors, transaction.type);
  const sign = getTransactionSign(transaction.type);
  const transactionCurrency = transaction.currency || currencyBase;
  const convertedAmount = getTransactionAmountInBaseCurrency(
    transaction,
    currencyBase,
    exchangeRates
  );
  const hasConvertedDisplay = transactionCurrency !== currencyBase;
  const rateSource = transaction.exchangeRateSnapshot || exchangeRates;
  const lockedRate = convertCurrencyAmount(1, transactionCurrency, currencyBase, rateSource);
  const rateSourceLabel = transaction.exchangeRateSnapshot ? 'Locked rate' : 'Current fallback rate';
  const rateLabel = hasConvertedDisplay
    ? `${rateSourceLabel}: 1 ${transactionCurrency} ≈ ${formatCompactCurrency(
        lockedRate,
        currencyBase
      )}`
    : null;

  return (
    <Pressable onPress={onPress} style={styles.transactionRow}>
      <View style={[styles.transactionIcon, { borderColor: tone }]}>
        <Ionicons name={getTransactionIcon(transaction.type) as any} size={20} color={tone} />
      </View>

      <View style={styles.transactionContent}>
        <AppText variant="body" style={styles.transactionTitle} numberOfLines={1}>
          {transaction.title}
        </AppText>

        <AppText variant="caption" muted numberOfLines={1} style={styles.transactionMeta}>
          {transaction.categoryName || transaction.accountName || 'Transaction'}
        </AppText>
      </View>

      <View style={styles.transactionAmountBox}>
        <AppText variant="body" style={[styles.transactionAmount, { color: tone }]} numberOfLines={1}>
          {sign}
          {formatCurrency(transaction.amount, transactionCurrency)}
        </AppText>

        {hasConvertedDisplay ? (
          <>
            <AppText variant="caption" muted style={styles.transactionBaseAmount} numberOfLines={1}>
              Base: {sign}
              {formatCompactCurrency(convertedAmount, currencyBase)}
            </AppText>

            {rateLabel ? (
              <AppText variant="caption" muted style={styles.transactionRateNote} numberOfLines={1}>
                {rateLabel}
              </AppText>
            ) : null}
          </>
        ) : null}
      </View>

      <Ionicons name="chevron-forward-outline" size={16} color={colors.textMuted} />
    </Pressable>
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
      gap: 14,
      alignItems: 'flex-start',
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
    heroCaption: {
      marginTop: 4,
      lineHeight: 18,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    searchBox: {
      marginTop: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      paddingHorizontal: 14,
      minHeight: 50,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
      outlineStyle: 'none' as any,
    },
    filterRow: {
      marginTop: 14,
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
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: 12,
    },
    list: {
      gap: 18,
    },
    group: {
      gap: 10,
    },
    groupDate: {
      fontWeight: '900',
    },
    groupList: {
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
      minWidth: 0,
    },
    transactionTitle: {
      fontWeight: '900',
    },
    transactionMeta: {
      marginTop: 4,
    },
    transactionAmountBox: {
      alignItems: 'flex-end',
      maxWidth: 150,
      minWidth: 96,
    },
    transactionAmount: {
      fontWeight: '900',
      textAlign: 'right',
      maxWidth: 150,
    },
    transactionBaseAmount: {
      marginTop: 4,
      textAlign: 'right',
      maxWidth: 150,
    },
    transactionRateNote: {
      marginTop: 3,
      textAlign: 'right',
      maxWidth: 150,
      fontSize: 10,
      lineHeight: 13,
    },
  });
}
