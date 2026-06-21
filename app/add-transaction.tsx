import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { NumericAmountInput } from '../src/components/ui/NumericAmountInput';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useAppToast } from '../src/components/ui/AppToast';
import { useFinanceStore } from '../src/stores/useFinanceStore';
import { Account, Category, Currency, TransactionType } from '../src/types/finance';
import { formatCurrency } from '../src/utils/currency';

type TransactionMode = Extract<
  TransactionType,
  'income' | 'expense' | 'transfer' | 'saving_deposit' | 'saving_withdrawal'
>;

const modeOptions: {
  label: string;
  value: TransactionMode;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { label: 'Income', value: 'income', icon: 'arrow-down-outline' },
  { label: 'Expense', value: 'expense', icon: 'arrow-up-outline' },
  { label: 'Transfer', value: 'transfer', icon: 'swap-horizontal-outline' },
  { label: 'Saving In', value: 'saving_deposit', icon: 'sparkles-outline' },
  { label: 'Saving Out', value: 'saving_withdrawal', icon: 'return-down-back-outline' },
];

const currencyOptions: Currency[] = ['IDR', 'USD', 'EUR'];

const weekLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseAmount(value: string) {
  return Number(value.replace(/[^0-9.]/g, '') || 0);
}

function getDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getMonthLabel(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(value);
}

function getLongDateLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function startOfMonth(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getCalendarCells(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ key: string; day?: number; dateKey?: string }> = [];

  for (let index = 0; index < firstDay; index += 1) {
    cells.push({ key: `empty-${index}` });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, month, day);

    cells.push({
      key: getDateKey(date),
      day,
      dateKey: getDateKey(date),
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: `tail-${cells.length}` });
  }

  return cells;
}

function getModeTone(colors: ThemeColors, mode: TransactionMode) {
  if (mode === 'income') return colors.income;
  if (mode === 'expense') return colors.expense;
  if (mode === 'saving_deposit' || mode === 'saving_withdrawal') return colors.saving;

  return colors.transfer;
}

export default function AddTransactionScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const toast = useAppToast();

  const accounts = useFinanceStore((state) => state.accounts);
  const categories = useFinanceStore((state) => state.categories);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);
  const addIncome = useFinanceStore((state) => state.addIncome);
  const addExpense = useFinanceStore((state) => state.addExpense);
  const transfer = useFinanceStore((state) => state.transfer);
  const savingDeposit = useFinanceStore((state) => state.savingDeposit);
  const savingWithdrawal = useFinanceStore((state) => state.savingWithdrawal);

  const activeAccounts = useMemo(() => {
    return accounts.filter((account) => account.isActive);
  }, [accounts]);

  const normalAccounts = useMemo(() => {
    return activeAccounts.filter((account) => account.type !== 'saving');
  }, [activeAccounts]);

  const savingAccounts = useMemo(() => {
    return activeAccounts.filter((account) => account.type === 'saving');
  }, [activeAccounts]);

  const incomeCategories = useMemo(() => {
    return categories.filter((category) => category.isActive && category.type === 'income');
  }, [categories]);

  const expenseCategories = useMemo(() => {
    return categories.filter((category) => category.isActive && category.type === 'expense');
  }, [categories]);

  const [mode, setMode] = useState<TransactionMode>('expense');
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedDate, setSelectedDate] = useState(getDateKey(new Date()));
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()));
  const [note, setNote] = useState('');

  const [accountId, setAccountId] = useState(activeAccounts[0]?.id || '');
  const [fromAccountId, setFromAccountId] = useState(normalAccounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(normalAccounts[1]?.id || normalAccounts[0]?.id || '');

  const [incomeCategoryId, setIncomeCategoryId] = useState(incomeCategories[0]?.id || '');
  const [expenseCategoryId, setExpenseCategoryId] = useState(expenseCategories[0]?.id || '');

  const calendarCells = useMemo(() => getCalendarCells(calendarMonth), [calendarMonth]);

  function moveCalendarMonth(direction: -1 | 1) {
    setCalendarMonth((currentMonth) => {
      return new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + direction,
        1
      );
    });
  }

  function getTransactionTitle() {
    if (title.trim()) return title.trim();
    if (mode === 'income') return 'Income';
    if (mode === 'expense') return 'Expense';
    if (mode === 'transfer') return 'Transfer';
    if (mode === 'saving_deposit') return 'Saving Deposit';

    return 'Saving Withdrawal';
  }

  function handleResult(result: { success: boolean; message: string }) {
    if (!result.success) {
      toast.showError('Could Not Save', result.message);
      return;
    }

    toast.showSuccess('Saved', result.message);
    router.back();
  }

  function handleSubmit() {
    const parsedAmount = parseAmount(amount);
    const payloadDate = selectedDate;
    const payloadNote = note.trim() || undefined;

    const effectiveAccountId = accountId || activeAccounts[0]?.id || '';
    const effectiveIncomeCategoryId = incomeCategoryId || incomeCategories[0]?.id || '';
    const effectiveExpenseCategoryId = expenseCategoryId || expenseCategories[0]?.id || '';

    const effectiveFromNormal = fromAccountId || normalAccounts[0]?.id || '';
    const effectiveToNormal = toAccountId || normalAccounts[1]?.id || normalAccounts[0]?.id || '';
    const effectiveSaving = savingAccounts[0]?.id || '';

    if (mode === 'income') {
      handleResult(
        addIncome({
          accountId: effectiveAccountId,
          title: getTransactionTitle(),
          amount: parsedAmount,
          currency,
          categoryId: effectiveIncomeCategoryId,
          date: payloadDate,
          note: payloadNote,
        })
      );
      return;
    }

    if (mode === 'expense') {
      handleResult(
        addExpense({
          accountId: effectiveAccountId,
          title: getTransactionTitle(),
          amount: parsedAmount,
          currency,
          categoryId: effectiveExpenseCategoryId,
          date: payloadDate,
          note: payloadNote,
        })
      );
      return;
    }

    if (mode === 'transfer') {
      handleResult(
        transfer({
          fromAccountId: effectiveFromNormal,
          toAccountId: effectiveToNormal,
          title: getTransactionTitle(),
          amount: parsedAmount,
          currency,
          date: payloadDate,
          note: payloadNote,
        })
      );
      return;
    }

    if (mode === 'saving_deposit') {
      handleResult(
        savingDeposit({
          fromAccountId: effectiveFromNormal,
          toAccountId: toAccountId || effectiveSaving,
          title: getTransactionTitle(),
          amount: parsedAmount,
          currency,
          date: payloadDate,
          note: payloadNote,
        })
      );
      return;
    }

    handleResult(
      savingWithdrawal({
        fromAccountId: fromAccountId || effectiveSaving,
        toAccountId: effectiveToNormal,
        title: getTransactionTitle(),
        amount: parsedAmount,
        currency,
        date: payloadDate,
        note: payloadNote,
      })
    );
  }

  const showSingleAccount = mode === 'income' || mode === 'expense';
  const showCategory = mode === 'income' || mode === 'expense';
  const categoryList = mode === 'income' ? incomeCategories : expenseCategories;
  const selectedCategoryId = mode === 'income' ? incomeCategoryId : expenseCategoryId;

  const sourceAccounts = mode === 'saving_withdrawal' ? savingAccounts : normalAccounts;
  const destinationAccounts = mode === 'saving_deposit' ? savingAccounts : normalAccounts;
  const selectedModeOption = modeOptions.find((item) => item.value === mode);
  const previewAmount = parseAmount(amount);
  const currentModeTone = getModeTone(colors, mode);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.headerText}>
          <AppText variant="caption" muted>
            Transactions
          </AppText>

          <AppText variant="title" style={styles.title}>
            Add Transaction
          </AppText>
        </View>
      </View>

      <View style={styles.previewCard}>
        <View style={[styles.previewIcon, { borderColor: currentModeTone }]}>
          <Ionicons
            name={selectedModeOption?.icon || 'receipt-outline'}
            size={22}
            color={currentModeTone}
          />
        </View>

        <View style={styles.previewTextBox}>
          <AppText variant="caption" muted>
            Transaction Preview
          </AppText>

          <AppText variant="subtitle" style={styles.previewTitle} numberOfLines={1}>
            {getTransactionTitle()}
          </AppText>

          <AppText variant="caption" muted style={styles.previewDescription}>
            {selectedModeOption?.label || 'Transaction'} · {getLongDateLabel(selectedDate)}
          </AppText>
        </View>

        <View style={styles.previewAmountBox}>
          <AppText variant="caption" muted>
            Amount
          </AppText>

          <AppText
            variant="body"
            style={[styles.previewAmount, { color: previewAmount > 0 ? currentModeTone : colors.textMuted }]}
            numberOfLines={1}
          >
            {previewAmount > 0 ? formatCurrency(previewAmount, currency) : '—'}
          </AppText>
        </View>
      </View>

      <View style={styles.form}>
        <View style={styles.sectionMiniHeader}>
          <View>
            <AppText variant="caption" muted>
              Step 1
            </AppText>

            <AppText variant="subtitle" style={styles.sectionMiniTitle}>
              Transaction type
            </AppText>
          </View>

          <AppText variant="caption" muted style={styles.sectionMiniHint}>
            Choose flow
          </AppText>
        </View>

        <View style={styles.modeGrid}>
          {modeOptions.map((item) => {
            const selected = mode === item.value;
            const tone = getModeTone(colors, item.value);

            return (
              <Pressable
                key={item.value}
                onPress={() => setMode(item.value)}
                style={[styles.modeCard, selected && styles.modeCardActive]}
              >
                <Ionicons
                  name={item.icon}
                  size={21}
                  color={selected ? colors.black : tone}
                />

                <AppText
                  variant="caption"
                  style={[styles.modeText, selected && styles.modeTextActive]}
                >
                  {item.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.cryptoShortcutCard}>
          <View style={styles.cryptoShortcutHeader}>
            <View>
              <AppText variant="caption" muted>
                Crypto transaction
              </AppText>

              <AppText variant="body" style={styles.cryptoShortcutTitle}>
                Use crypto as income or payment
              </AppText>
            </View>

            <Ionicons name="logo-bitcoin" size={22} color={colors.text} />
          </View>

          <View style={styles.cryptoShortcutRow}>
            <Pressable
              onPress={() => router.push('/add-crypto-income')}
              style={styles.cryptoShortcutButton}
            >
              <Ionicons name="arrow-down-circle-outline" size={17} color={colors.income} />

              <AppText variant="caption" style={styles.cryptoShortcutButtonText}>
                Crypto Income
              </AppText>
            </Pressable>

            <Pressable
              onPress={() => router.push('/add-crypto-expense')}
              style={styles.cryptoShortcutButton}
            >
              <Ionicons name="arrow-up-circle-outline" size={17} color={colors.expense} />

              <AppText variant="caption" style={styles.cryptoShortcutButtonText}>
                Crypto Payment
              </AppText>
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionMiniHeader}>
          <View>
            <AppText variant="caption" muted>
              Step 2
            </AppText>

            <AppText variant="subtitle" style={styles.sectionMiniTitle}>
              Transaction details
            </AppText>
          </View>

          <AppText variant="caption" muted style={styles.sectionMiniHint}>
            Amount & currency
          </AppText>
        </View>

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Title
          </AppText>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Optional title"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </View>

        <NumericAmountInput
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          placeholder="50000"
          currency={currency}
          icon="cash-outline"
          quickValues={currency === 'IDR' ? ['50000', '100000', '250000'] : ['10', '50', '100']}
          helperText="Choose the transaction currency below. If it differs from the account currency, the app uses the saved exchange rate."
        />

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Transaction Currency
          </AppText>

          <View style={styles.currencyRow}>
            {currencyOptions.map((item) => {
              const selected = currency === item;

              return (
                <Pressable
                  key={item}
                  onPress={() => setCurrency(item)}
                  style={[styles.currencyPill, selected && styles.currencyPillActive]}
                >
                  <AppText
                    variant="caption"
                    style={[styles.currencyText, selected && styles.currencyTextActive]}
                  >
                    {item}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.currencyInfo}>
            <Ionicons name="information-circle-outline" size={17} color={colors.textMuted} />

            <AppText variant="caption" muted style={styles.currencyInfoText}>
              The transaction is saved in this currency. Account balance is adjusted using the saved exchange rate when currencies differ.
            </AppText>
          </View>
        </View>

        {showSingleAccount ? (
          <AccountPicker
            label="Account"
            accounts={activeAccounts}
            selectedAccountId={accountId}
            onSelect={setAccountId}
            colors={colors}
          />
        ) : (
          <>
            <AccountPicker
              label="From Account"
              accounts={sourceAccounts}
              selectedAccountId={fromAccountId}
              onSelect={setFromAccountId}
              colors={colors}
            />

            <AccountPicker
              label="To Account"
              accounts={destinationAccounts}
              selectedAccountId={toAccountId}
              onSelect={setToAccountId}
              colors={colors}
            />
          </>
        )}

        {showCategory ? (
          <CategoryPicker
            categories={categoryList}
            selectedCategoryId={selectedCategoryId}
            onSelect={mode === 'income' ? setIncomeCategoryId : setExpenseCategoryId}
            colors={colors}
          />
        ) : null}

        <View style={styles.sectionMiniHeader}>
          <View>
            <AppText variant="caption" muted>
              Step 3
            </AppText>

            <AppText variant="subtitle" style={styles.sectionMiniTitle}>
              Date & note
            </AppText>
          </View>

          <AppText variant="caption" muted style={styles.sectionMiniHint}>
            Final detail
          </AppText>
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Pressable onPress={() => moveCalendarMonth(-1)} style={styles.calendarArrow}>
              <Ionicons name="chevron-back-outline" size={18} color={colors.text} />
            </Pressable>

            <View style={styles.calendarTitleBox}>
              <AppText variant="caption" muted>
                Transaction Date
              </AppText>

              <AppText variant="subtitle" style={styles.calendarTitle}>
                {getMonthLabel(calendarMonth)}
              </AppText>
            </View>

            <Pressable onPress={() => moveCalendarMonth(1)} style={styles.calendarArrow}>
              <Ionicons name="chevron-forward-outline" size={18} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {weekLabels.map((label) => (
              <AppText key={label} variant="caption" muted style={styles.weekLabel}>
                {label}
              </AppText>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarCells.map((cell) => {
              if (!cell.day || !cell.dateKey) {
                return <View key={cell.key} style={styles.dayCell} />;
              }

              const selected = cell.dateKey === selectedDate;
              const today = cell.dateKey === getDateKey(new Date());

              return (
                <Pressable
                  key={cell.key}
                  onPress={() => setSelectedDate(cell.dateKey || selectedDate)}
                  style={[
                    styles.dayCell,
                    styles.dayButton,
                    today && styles.dayToday,
                    selected && styles.daySelected,
                  ]}
                >
                  <AppText
                    variant="caption"
                    style={[
                      styles.dayText,
                      selected && styles.dayTextSelected,
                    ]}
                  >
                    {cell.day}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.selectedDateCard}>
            <Ionicons name="calendar-outline" size={17} color={colors.text} />

            <AppText variant="caption" style={styles.selectedDateText}>
              {getLongDateLabel(selectedDate)}
            </AppText>
          </View>
        </View>

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Note
          </AppText>

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Optional note"
            placeholderTextColor={colors.textMuted}
            multiline
            style={[styles.input, styles.textArea]}
          />
        </View>

        <Pressable onPress={handleSubmit} style={styles.submitButton}>
          <Ionicons name="checkmark-circle-outline" size={19} color={colors.black} />

          <AppText variant="body" style={styles.submitText}>
            Save Transaction
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

function AccountPicker({
  label,
  accounts,
  selectedAccountId,
  onSelect,
  colors,
}: {
  label: string;
  accounts: Account[];
  selectedAccountId: string;
  onSelect: (accountId: string) => void;
  colors: ThemeColors;
}) {
  const styles = createStyles(colors);

  return (
    <View style={styles.field}>
      <AppText variant="caption" muted style={styles.label}>
        {label}
      </AppText>

      {accounts.length === 0 ? (
        <View style={styles.emptyBox}>
          <AppText variant="caption" muted>
            No accounts available.
          </AppText>
        </View>
      ) : null}

      <View style={styles.optionList}>
        {accounts.map((account) => {
          const selected = selectedAccountId === account.id;

          return (
            <Pressable
              key={account.id}
              onPress={() => onSelect(account.id)}
              style={[styles.optionCard, selected && styles.optionCardActive]}
            >
              <View style={styles.optionTextBox}>
                <AppText
                  variant="body"
                  style={[styles.optionTitle, selected && styles.optionTitleActive]}
                >
                  {account.name}
                </AppText>

                <AppText
                  variant="caption"
                  muted={!selected}
                  style={[styles.optionDescription, selected && styles.optionDescriptionActive]}
                >
                  {formatCurrency(account.balance, account.currency)}
                </AppText>
              </View>

              <Radio selected={selected} colors={colors} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function CategoryPicker({
  categories,
  selectedCategoryId,
  onSelect,
  colors,
}: {
  categories: Category[];
  selectedCategoryId: string;
  onSelect: (categoryId: string) => void;
  colors: ThemeColors;
}) {
  const styles = createStyles(colors);

  return (
    <View style={styles.field}>
      <AppText variant="caption" muted style={styles.label}>
        Category
      </AppText>

      {categories.length === 0 ? (
        <View style={styles.emptyBox}>
          <AppText variant="caption" muted>
            No categories available.
          </AppText>
        </View>
      ) : null}

      <View style={styles.optionList}>
        {categories.map((category) => {
          const selected = selectedCategoryId === category.id;

          return (
            <Pressable
              key={category.id}
              onPress={() => onSelect(category.id)}
              style={[styles.optionCard, selected && styles.optionCardActive]}
            >
              <View style={styles.optionTextBox}>
                <AppText
                  variant="body"
                  style={[styles.optionTitle, selected && styles.optionTitleActive]}
                >
                  {category.name}
                </AppText>

                <AppText
                  variant="caption"
                  muted={!selected}
                  style={[styles.optionDescription, selected && styles.optionDescriptionActive]}
                >
                  {category.type === 'income' ? 'Income' : 'Expense'} category
                </AppText>
              </View>

              <Radio selected={selected} colors={colors} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Radio({ selected, colors }: { selected: boolean; colors: ThemeColors }) {
  const styles = createStyles(colors);

  return (
    <View style={[styles.radioOuter, selected && styles.radioOuterActive]}>
      {selected ? <View style={styles.radioInner} /> : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    cryptoShortcutCard: {
      marginBottom: 18,
      borderRadius: 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 12,
    },
    cryptoShortcutHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    cryptoShortcutTitle: {
      marginTop: 3,
      color: colors.text,
      fontWeight: '900',
    },
    cryptoShortcutRow: {
      flexDirection: 'row',
      gap: 10,
    },
    cryptoShortcutButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },
    cryptoShortcutButtonText: {
      color: colors.text,
      fontWeight: '900',
    },
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
    previewCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 18,
    },
    previewIcon: {
      width: 46,
      height: 46,
      borderRadius: 17,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewTextBox: {
      flex: 1,
      minWidth: 0,
    },
    previewTitle: {
      marginTop: 4,
      color: colors.text,
    },
    previewDescription: {
      marginTop: 3,
      lineHeight: 18,
    },
    previewAmountBox: {
      alignItems: 'flex-end',
      maxWidth: 132,
      gap: 4,
    },
    previewAmount: {
      fontWeight: '900',
      textAlign: 'right',
    },
    form: {
      gap: 18,
    },
    sectionMiniHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: 12,
      marginTop: 2,
      marginBottom: -4,
    },
    sectionMiniTitle: {
      marginTop: 3,
      color: colors.text,
    },
    sectionMiniHint: {
      fontWeight: '900',
    },
    modeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    modeCard: {
      flexBasis: '30%',
      flexGrow: 1,
      minHeight: 78,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: 8,
    },
    modeCardActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    modeText: {
      color: colors.textMuted,
      fontWeight: '900',
      textAlign: 'center',
    },
    modeTextActive: {
      color: colors.black,
    },
    field: {
      gap: 10,
    },
    label: {
      fontWeight: '900',
    },
    calendarCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 15,
      gap: 12,
      marginBottom: 18,
    },
    calendarHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    calendarArrow: {
      width: 38,
      height: 38,
      borderRadius: 14,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    calendarTitleBox: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
    },
    calendarTitle: {
      marginTop: 3,
    },
    weekRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    weekLabel: {
      width: '13%',
      textAlign: 'center',
      fontWeight: '900',
    },
    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    dayCell: {
      width: '13%',
      height: 46,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    dayButton: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dayToday: {
      borderColor: colors.primary,
    },
    daySelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    dayText: {
      color: colors.text,
      fontWeight: '900',
      textAlign: 'center',
      includeFontPadding: false,
    },
    dayTextSelected: {
      color: colors.black,
    },
    selectedDateCard: {
      minHeight: 42,
      borderRadius: 15,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    selectedDateText: {
      color: colors.text,
      fontWeight: '900',
    },
    input: {
      minHeight: 52,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    textArea: {
      minHeight: 100,
      paddingTop: 14,
      textAlignVertical: 'top',
    },
    currencyRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    currencyPill: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    currencyPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    currencyText: {
      color: colors.textMuted,
      fontWeight: '900',
    },
    currencyTextActive: {
      color: colors.black,
    },
    currencyInfo: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 12,
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-start',
    },
    currencyInfoText: {
      flex: 1,
      lineHeight: 18,
    },
    optionList: {
      gap: 10,
    },
    optionCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 15,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
    },
    optionCardActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    optionTextBox: {
      flex: 1,
      minWidth: 0,
    },
    optionTitle: {
      fontWeight: '900',
    },
    optionTitleActive: {
      color: colors.black,
    },
    optionDescription: {
      marginTop: 4,
      lineHeight: 18,
    },
    optionDescriptionActive: {
      color: 'rgba(0,0,0,0.68)',
    },
    emptyBox: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 14,
    },
    radioOuter: {
      width: 22,
      height: 22,
      borderRadius: 999,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOuterActive: {
      borderColor: colors.black,
    },
    radioInner: {
      width: 10,
      height: 10,
      borderRadius: 999,
      backgroundColor: colors.black,
    },
    submitButton: {
      marginTop: 8,
      minHeight: 54,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    submitText: {
      color: colors.black,
      fontWeight: '900',
    },
  });
}
