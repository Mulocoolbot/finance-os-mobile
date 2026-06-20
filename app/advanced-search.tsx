import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useFinanceStore } from '../src/stores/useFinanceStore';
import { Account, Category, Transaction } from '../src/types/finance';
import { formatCurrency } from '../src/utils/currency';

type TransactionTypeFilter = 'all' | Transaction['type'];
type PeriodFilter = 'all' | 'today' | 'week' | 'month' | 'year';
type SortMode = 'newest' | 'oldest' | 'highest' | 'lowest';

const transactionTypeFilters: {
  label: string;
  value: TransactionTypeFilter;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { label: 'All', value: 'all', icon: 'apps-outline' },
  { label: 'Income', value: 'income', icon: 'arrow-down-circle-outline' },
  { label: 'Expense', value: 'expense', icon: 'arrow-up-circle-outline' },
  { label: 'Transfer', value: 'transfer', icon: 'swap-horizontal-outline' },
  { label: 'Saving+', value: 'saving_deposit', icon: 'sparkles-outline' },
  { label: 'Saving-', value: 'saving_withdrawal', icon: 'return-up-back-outline' },
  { label: 'Buy', value: 'investment_buy', icon: 'trending-up-outline' },
  { label: 'Sell', value: 'investment_sell', icon: 'cash-outline' },
  { label: 'Adjust', value: 'adjustment', icon: 'construct-outline' },
];

const periodFilters: {
  label: string;
  value: PeriodFilter;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { label: 'All time', value: 'all', icon: 'infinite-outline' },
  { label: 'Today', value: 'today', icon: 'today-outline' },
  { label: 'This week', value: 'week', icon: 'calendar-outline' },
  { label: 'This month', value: 'month', icon: 'calendar-number-outline' },
  { label: 'This year', value: 'year', icon: 'calendar-clear-outline' },
];

const sortModes: {
  label: string;
  value: SortMode;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { label: 'Newest', value: 'newest', icon: 'arrow-down-outline' },
  { label: 'Oldest', value: 'oldest', icon: 'arrow-up-outline' },
  { label: 'Highest', value: 'highest', icon: 'bar-chart-outline' },
  { label: 'Lowest', value: 'lowest', icon: 'remove-outline' },
];

function parseDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getStartOfWeek(date: Date) {
  const nextDate = new Date(date);
  const day = nextDate.getDay();
  const diff = day === 0 ? 6 : day - 1;

  nextDate.setHours(0, 0, 0, 0);
  nextDate.setDate(nextDate.getDate() - diff);

  return nextDate;
}

function matchesPeriod(transaction: Transaction, period: PeriodFilter) {
  if (period === 'all') return true;

  const now = new Date();
  const date = parseDate(transaction.date);

  if (period === 'today') {
    return isSameDay(date, now);
  }

  if (period === 'week') {
    const startOfWeek = getStartOfWeek(now);
    const nextDate = new Date(date);
    nextDate.setHours(0, 0, 0, 0);

    return nextDate >= startOfWeek;
  }

  if (period === 'month') {
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }

  if (period === 'year') {
    return date.getFullYear() === now.getFullYear();
  }

  return true;
}

function getTransactionTypeLabel(type: Transaction['type']) {
  if (type === 'income') return 'Income';
  if (type === 'expense') return 'Expense';
  if (type === 'transfer') return 'Transfer';
  if (type === 'saving_deposit') return 'Saving Deposit';
  if (type === 'saving_withdrawal') return 'Saving Withdrawal';
  if (type === 'investment_buy') return 'Investment Buy';
  if (type === 'investment_sell') return 'Investment Sell';
  if (type === 'adjustment') return 'Adjustment';

  return 'Transaction';
}

function getTransactionIcon(type: Transaction['type']): keyof typeof Ionicons.glyphMap {
  if (type === 'income') return 'arrow-down-circle-outline';
  if (type === 'expense') return 'arrow-up-circle-outline';
  if (type === 'transfer') return 'swap-horizontal-outline';
  if (type === 'saving_deposit' || type === 'saving_withdrawal') return 'sparkles-outline';
  if (type === 'investment_buy' || type === 'investment_sell') return 'trending-up-outline';
  if (type === 'adjustment') return 'construct-outline';

  return 'receipt-outline';
}

function getTransactionAmountColor(type: Transaction['type'], colors: ThemeColors) {
  if (type === 'income' || type === 'saving_withdrawal' || type === 'investment_sell') {
    return colors.income;
  }

  if (type === 'expense' || type === 'saving_deposit' || type === 'investment_buy') {
    return colors.expense;
  }

  return colors.text;
}

function getAmountPrefix(type: Transaction['type']) {
  if (type === 'income' || type === 'saving_withdrawal' || type === 'investment_sell') {
    return '+';
  }

  if (type === 'expense' || type === 'saving_deposit' || type === 'investment_buy') {
    return '-';
  }

  return '';
}

function formatDate(value: string) {
  const date = parseDate(value);

  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function isAccountLinked(transaction: Transaction, accountId: string) {
  return (
    transaction.accountId === accountId ||
    transaction.fromAccountId === accountId ||
    transaction.toAccountId === accountId
  );
}

function isCategoryLinked(transaction: Transaction, categoryId: string) {
  return transaction.categoryId === categoryId;
}

function getSearchableText(transaction: Transaction) {
  return [
    transaction.title,
    transaction.accountName,
    transaction.categoryName,
    transaction.note,
    transaction.currency,
    transaction.type,
    getTransactionTypeLabel(transaction.type),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getTransactionSortAmount(transaction: Transaction) {
  return Math.abs(transaction.baseAmountAtTransaction || transaction.amount || 0);
}

export default function AdvancedSearchScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const accounts = useFinanceStore((state) => state.accounts);
  const categories = useFinanceStore((state) => state.categories);
  const transactions = useFinanceStore((state) => state.transactions);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [accountFilter, setAccountFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return transactions
      .filter((transaction) => {
        const matchesQuery =
          normalizedQuery.length === 0 ||
          getSearchableText(transaction).includes(normalizedQuery);

        const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
        const matchesDate = matchesPeriod(transaction, periodFilter);
        const matchesAccount =
          accountFilter === 'all' || isAccountLinked(transaction, accountFilter);
        const matchesCategory =
          categoryFilter === 'all' || isCategoryLinked(transaction, categoryFilter);

        return matchesQuery && matchesType && matchesDate && matchesAccount && matchesCategory;
      })
      .sort((a, b) => {
        if (sortMode === 'oldest') return parseDate(a.date).getTime() - parseDate(b.date).getTime();
        if (sortMode === 'highest') return getTransactionSortAmount(b) - getTransactionSortAmount(a);
        if (sortMode === 'lowest') return getTransactionSortAmount(a) - getTransactionSortAmount(b);

        return parseDate(b.date).getTime() - parseDate(a.date).getTime();
      });
  }, [accountFilter, categoryFilter, periodFilter, query, sortMode, transactions, typeFilter]);

  const summary = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, transaction) => {
        const value = Math.abs(transaction.baseAmountAtTransaction || transaction.amount || 0);

        if (
          transaction.type === 'income' ||
          transaction.type === 'saving_withdrawal' ||
          transaction.type === 'investment_sell'
        ) {
          acc.inflow += value;
        } else if (
          transaction.type === 'expense' ||
          transaction.type === 'saving_deposit' ||
          transaction.type === 'investment_buy'
        ) {
          acc.outflow += value;
        }

        acc.total += value;

        return acc;
      },
      {
        total: 0,
        inflow: 0,
        outflow: 0,
      }
    );
  }, [filteredTransactions]);

  function resetFilters() {
    setQuery('');
    setTypeFilter('all');
    setPeriodFilter('all');
    setSortMode('newest');
    setAccountFilter('all');
    setCategoryFilter('all');
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.headerText}>
          <AppText variant="caption" muted>
            Search & filter
          </AppText>

          <AppText variant="title" style={styles.title}>
            Advanced Search
          </AppText>
        </View>
      </View>

      <View style={styles.searchCard}>
        <View style={styles.searchInputRow}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search title, account, category, note..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />

          {query ? (
            <Pressable onPress={() => setQuery('')} style={styles.clearButton}>
              <Ionicons name="close-outline" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.summaryRow}>
          <SummaryPill label="Results" value={String(filteredTransactions.length)} colors={colors} />
          <SummaryPill
            label="Inflow"
            value={formatCurrency(summary.inflow, defaultCurrency)}
            colors={colors}
          />
          <SummaryPill
            label="Outflow"
            value={formatCurrency(summary.outflow, defaultCurrency)}
            colors={colors}
          />
        </View>
      </View>

      <FilterSection title="Type" caption={typeFilter === 'all' ? 'All transactions' : getTransactionTypeLabel(typeFilter)}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {transactionTypeFilters.map((item) => (
              <FilterChip
                key={item.value}
                label={item.label}
                icon={item.icon}
                active={typeFilter === item.value}
                colors={colors}
                onPress={() => setTypeFilter(item.value)}
              />
            ))}
          </View>
        </ScrollView>
      </FilterSection>

      <FilterSection title="Period" caption="Quick date range">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {periodFilters.map((item) => (
              <FilterChip
                key={item.value}
                label={item.label}
                icon={item.icon}
                active={periodFilter === item.value}
                colors={colors}
                onPress={() => setPeriodFilter(item.value)}
              />
            ))}
          </View>
        </ScrollView>
      </FilterSection>

      <FilterSection title="Account" caption="Linked account">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            <FilterChip
              label="All accounts"
              icon="wallet-outline"
              active={accountFilter === 'all'}
              colors={colors}
              onPress={() => setAccountFilter('all')}
            />

            {accounts.map((account) => (
              <FilterChip
                key={account.id}
                label={account.name}
                icon={getAccountIcon(account)}
                active={accountFilter === account.id}
                colors={colors}
                onPress={() => setAccountFilter(account.id)}
              />
            ))}
          </View>
        </ScrollView>
      </FilterSection>

      <FilterSection title="Category" caption="Income / expense category">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            <FilterChip
              label="All categories"
              icon="pricetags-outline"
              active={categoryFilter === 'all'}
              colors={colors}
              onPress={() => setCategoryFilter('all')}
            />

            {categories.map((category) => (
              <FilterChip
                key={category.id}
                label={category.name}
                icon={getCategoryIcon(category)}
                active={categoryFilter === category.id}
                colors={colors}
                onPress={() => setCategoryFilter(category.id)}
              />
            ))}
          </View>
        </ScrollView>
      </FilterSection>

      <FilterSection title="Sort" caption="Result order">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {sortModes.map((item) => (
              <FilterChip
                key={item.value}
                label={item.label}
                icon={item.icon}
                active={sortMode === item.value}
                colors={colors}
                onPress={() => setSortMode(item.value)}
              />
            ))}
          </View>
        </ScrollView>
      </FilterSection>

      <View style={styles.actionRow}>
        <Pressable onPress={resetFilters} style={styles.resetButton}>
          <Ionicons name="refresh-outline" size={17} color={colors.text} />

          <AppText variant="body" style={styles.resetButtonText}>
            Reset Filters
          </AppText>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Search Results</AppText>

        <AppText variant="caption" muted>
          {filteredTransactions.length} item{filteredTransactions.length === 1 ? '' : 's'}
        </AppText>
      </View>

      <View style={styles.resultList}>
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="search-outline" size={28} color={colors.textMuted} />

            <AppText variant="subtitle" style={styles.emptyTitle}>
              No matching transaction
            </AppText>

            <AppText variant="body" muted style={styles.emptyDescription}>
              Try changing the keyword, period, account, category, or transaction type.
            </AppText>
          </View>
        ) : null}

        {filteredTransactions.slice(0, 120).map((transaction) => (
          <TransactionResultRow
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

        {filteredTransactions.length > 120 ? (
          <View style={styles.limitNotice}>
            <AppText variant="caption" muted style={styles.limitNoticeText}>
              Showing first 120 results. Use filters or search keywords to narrow it down.
            </AppText>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

function getAccountIcon(account: Account): keyof typeof Ionicons.glyphMap {
  if (account.type === 'cash') return 'cash-outline';
  if (account.type === 'bank') return 'business-outline';
  if (account.type === 'e_wallet') return 'phone-portrait-outline';
  if (account.type === 'saving') return 'sparkles-outline';
  if (account.type === 'broker') return 'trending-up-outline';
  if (account.type === 'crypto_wallet') return 'logo-bitcoin';

  return 'wallet-outline';
}

function getCategoryIcon(category: Category): keyof typeof Ionicons.glyphMap {
  return (category.icon as keyof typeof Ionicons.glyphMap) || 'pricetag-outline';
}

function FilterSection({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <View style={stylesPlaceholder.sectionShell}>
      <View style={stylesPlaceholder.sectionHeaderStatic}>
        <AppText variant="subtitle">{title}</AppText>

        <AppText variant="caption" muted>
          {caption}
        </AppText>
      </View>

      {children}
    </View>
  );
}

function FilterChip({
  label,
  icon,
  active,
  colors,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  colors: ThemeColors;
  onPress: () => void;
}) {
  const chipStyles = createStyles(colors);

  return (
    <Pressable onPress={onPress} style={[chipStyles.filterChip, active ? chipStyles.filterChipActive : null]}>
      <Ionicons name={icon} size={15} color={active ? colors.black : colors.textMuted} />

      <AppText
        variant="caption"
        style={[chipStyles.filterChipText, active ? chipStyles.filterChipTextActive : null]}
        numberOfLines={1}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function SummaryPill({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ThemeColors;
}) {
  const pillStyles = createStyles(colors);

  return (
    <View style={pillStyles.summaryPill}>
      <AppText variant="caption" muted>
        {label}
      </AppText>

      <AppText variant="caption" style={pillStyles.summaryPillValue} numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

function TransactionResultRow({
  transaction,
  colors,
  onPress,
}: {
  transaction: Transaction;
  colors: ThemeColors;
  onPress: () => void;
}) {
  const rowStyles = createStyles(colors);
  const amountColor = getTransactionAmountColor(transaction.type, colors);

  return (
    <Pressable onPress={onPress} style={rowStyles.transactionRow}>
      <View style={rowStyles.transactionIcon}>
        <Ionicons name={getTransactionIcon(transaction.type)} size={20} color={amountColor} />
      </View>

      <View style={rowStyles.transactionInfo}>
        <AppText variant="body" style={rowStyles.transactionTitle} numberOfLines={1}>
          {transaction.title}
        </AppText>

        <AppText variant="caption" muted numberOfLines={1}>
          {getTransactionTypeLabel(transaction.type)} • {transaction.accountName}
        </AppText>

        <AppText variant="caption" muted numberOfLines={1}>
          {transaction.categoryName || 'No category'} • {formatDate(transaction.date)}
        </AppText>
      </View>

      <View style={rowStyles.amountBox}>
        <AppText variant="caption" style={[rowStyles.transactionAmount, { color: amountColor }]}>
          {getAmountPrefix(transaction.type)}
          {formatCurrency(transaction.amount, transaction.currency)}
        </AppText>

        {transaction.baseAmountAtTransaction ? (
          <AppText variant="caption" muted numberOfLines={1}>
            Base {formatCurrency(transaction.baseAmountAtTransaction, transaction.baseCurrencyAtTransaction || transaction.currency)}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const stylesPlaceholder = StyleSheet.create({
  sectionShell: {
    marginTop: 18,
  },
  sectionHeaderStatic: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
});

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
    searchCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 16,
      gap: 14,
    },
    searchInputRow: {
      minHeight: 54,
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    searchInput: {
      flex: 1,
      minWidth: 0,
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    clearButton: {
      width: 30,
      height: 30,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: 9,
    },
    summaryPill: {
      flex: 1,
      minHeight: 54,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
      justifyContent: 'center',
    },
    summaryPillValue: {
      marginTop: 4,
      color: colors.text,
      fontWeight: '900',
    },
    chipRow: {
      flexDirection: 'row',
      gap: 9,
      paddingRight: 8,
    },
    filterChip: {
      minHeight: 40,
      maxWidth: 160,
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
    actionRow: {
      marginTop: 16,
      flexDirection: 'row',
    },
    resetButton: {
      minHeight: 44,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    resetButtonText: {
      color: colors.text,
      fontWeight: '900',
    },
    sectionHeader: {
      marginTop: 24,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 12,
    },
    resultList: {
      gap: 10,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 18,
      alignItems: 'flex-start',
    },
    emptyTitle: {
      marginTop: 12,
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
      padding: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    transactionIcon: {
      width: 42,
      height: 42,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    transactionInfo: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },
    transactionTitle: {
      color: colors.text,
      fontWeight: '900',
    },
    amountBox: {
      maxWidth: 132,
      alignItems: 'flex-end',
      gap: 3,
    },
    transactionAmount: {
      fontWeight: '900',
    },
    limitNotice: {
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
    },
    limitNoticeText: {
      lineHeight: 18,
    },
  });
}
