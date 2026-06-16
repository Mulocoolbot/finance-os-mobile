import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { NumericAmountInput } from '../src/components/ui/NumericAmountInput';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useFinanceStore } from '../src/stores/useFinanceStore';
import { Account, Category, Transaction, TransactionType } from '../src/types/finance';
import { formatCurrency } from '../src/utils/currency';

const weekLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseAmount(value: string) {
  return Number(value.replace(/[^0-9.]/g, '') || 0);
}

function formatAmountInput(value: number) {
  if (!Number.isFinite(value)) {
    return '0';
  }

  return String(value);
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

function startOfMonth(value: string) {
  const date = new Date(value);

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

function getTransactionTone(colors: ThemeColors, type: TransactionType) {
  if (type === 'income') return colors.income;
  if (type === 'expense') return colors.expense;
  if (type === 'saving_deposit' || type === 'saving_withdrawal') return colors.saving;
  if (type === 'investment_buy' || type === 'investment_sell') return colors.investment;

  return colors.transfer;
}

function getTransactionLabel(type: TransactionType) {
  if (type === 'income') return 'Income';
  if (type === 'expense') return 'Expense';
  if (type === 'transfer') return 'Transfer';
  if (type === 'saving_deposit') return 'Saving Deposit';
  if (type === 'saving_withdrawal') return 'Saving Withdrawal';
  if (type === 'investment_buy') return 'Investment Buy';
  if (type === 'investment_sell') return 'Investment Sell';

  return 'Adjustment';
}

function isCryptoTransaction(transaction: Transaction) {
  const noteText = transaction.note || '';
  const titleText = transaction.title.toLowerCase();

  return (
    transaction.categoryName === 'Crypto Income' ||
    transaction.categoryName === 'Crypto Payment' ||
    titleText.startsWith('crypto income') ||
    titleText.startsWith('crypto payment') ||
    noteText.includes('Crypto qty:') ||
    /[0-9.]+\s+[A-Z0-9]+\s+@\s+[0-9.]+\s+[A-Z]{3}/i.test(noteText)
  );
}

function canEditTransaction(transaction: Transaction) {
  return (
    (transaction.type === 'income' || transaction.type === 'expense') &&
    !isCryptoTransaction(transaction)
  );
}

export default function EditTransactionScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ transactionId?: string }>();

  const transactions = useFinanceStore((state) => state.transactions);
  const accounts = useFinanceStore((state) => state.accounts);
  const categories = useFinanceStore((state) => state.categories);
  const updateTransaction = useFinanceStore((state) => state.updateTransaction);
  const deleteTransaction = useFinanceStore((state) => state.deleteTransaction);

  const transaction = transactions.find((item) => item.id === params.transactionId);

  const [title, setTitle] = useState(transaction?.title || '');
  const [amount, setAmount] = useState(formatAmountInput(transaction?.amount || 0));
  const [accountId, setAccountId] = useState(transaction?.accountId || '');
  const [categoryId, setCategoryId] = useState(transaction?.categoryId || '');
  const [selectedDate, setSelectedDate] = useState(getDateKey(transaction?.date || new Date()));
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(transaction?.date || new Date().toISOString()));
  const [note, setNote] = useState(transaction?.note || '');

  const editable = transaction ? canEditTransaction(transaction) : false;
  const tone = transaction ? getTransactionTone(colors, transaction.type) : colors.text;
  const activeAccounts = useMemo(() => {
    const currentAccount = accounts.find((account) => account.id === transaction?.accountId);
    const filteredAccounts = accounts.filter((account) => account.isActive);

    if (currentAccount && !filteredAccounts.some((account) => account.id === currentAccount.id)) {
      return [currentAccount, ...filteredAccounts];
    }

    return filteredAccounts;
  }, [accounts, transaction?.accountId]);

  const categoryList = useMemo(() => {
    if (!transaction || !editable) {
      return [];
    }

    return categories.filter(
      (category) => category.isActive && category.type === transaction.type
    );
  }, [categories, transaction, editable]);

  const selectedAccount = activeAccounts.find((account) => account.id === accountId);
  const selectedCategory = categoryList.find((category) => category.id === categoryId);
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

  function handleSave() {
    if (!transaction) {
      Alert.alert('Finance OS Mobile', 'Transaction not found.');
      return;
    }

    if (!editable) {
      Alert.alert(
        'Locked Transaction',
        'Only normal income and expense transactions can be edited directly. Crypto, transfer, saving, and investment transactions are managed by their own modules.'
      );
      return;
    }

    const result = updateTransaction({
      transactionId: transaction.id,
      title,
      amount: parseAmount(amount),
      accountId: accountId || activeAccounts[0]?.id || '',
      categoryId: categoryId || categoryList[0]?.id,
      date: selectedDate,
      note,
    });

    Alert.alert('Finance OS Mobile', result.message);

    if (result.success) {
      router.back();
    }
  }

  function handleDelete() {
    if (!transaction) {
      Alert.alert('Finance OS Mobile', 'Transaction not found.');
      return;
    }

    if (!editable) {
      Alert.alert(
        'Locked Transaction',
        'This transaction cannot be deleted from the normal edit screen.'
      );
      return;
    }

    Alert.alert(
      'Delete transaction?',
      'This will remove the transaction and rollback the related account balance. This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const result = deleteTransaction(transaction.id);

            Alert.alert('Finance OS Mobile', result.message);

            if (result.success) {
              router.back();
            }
          },
        },
      ]
    );
  }

  if (!transaction) {
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

            <AppText variant="title">Transaction Not Found</AppText>
          </View>
        </View>

        <View style={styles.emptyCard}>
          <Ionicons name="alert-circle-outline" size={28} color={colors.textMuted} />

          <AppText variant="body" muted style={styles.emptyText}>
            This transaction may have been deleted.
          </AppText>
        </View>
      </Screen>
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
            Transactions
          </AppText>

          <AppText variant="title">Edit Transaction</AppText>
        </View>
      </View>

      <View style={[styles.heroCard, { borderColor: tone }]}>
        <View style={[styles.heroIcon, { borderColor: tone }]}>
          <Ionicons
            name={transaction.type === 'income' ? 'arrow-down-outline' : 'arrow-up-outline'}
            size={24}
            color={tone}
          />
        </View>

        <View style={styles.heroTextBox}>
          <AppText variant="caption" muted>
            {getTransactionLabel(transaction.type)}
          </AppText>

          <AppText variant="subtitle" style={styles.heroTitle} numberOfLines={1}>
            {transaction.title}
          </AppText>

          <AppText variant="caption" muted style={styles.heroDate}>
            {getLongDateLabel(transaction.date)}
          </AppText>
        </View>
      </View>

      {!editable ? (
        <View style={styles.lockedCard}>
          <Ionicons name="lock-closed-outline" size={22} color={colors.textMuted} />

          <View style={styles.lockedTextBox}>
            <AppText variant="body" style={styles.lockedTitle}>
              Transaction Locked
            </AppText>

            <AppText variant="caption" muted style={styles.lockedDescription}>
              This transaction is generated by another module or protected as a crypto transaction. Editing/deleting it directly can break balance or portfolio history.
            </AppText>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.field}>
            <AppText variant="caption" muted style={styles.label}>
              Transaction Name
            </AppText>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Transaction name"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>

          <NumericAmountInput
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            currency={transaction.currency}
            icon="calculator-outline"
            quickValues={
              transaction.currency === 'IDR'
                ? ['50000', '100000', '500000', '1000000']
                : ['10', '50', '100', '500']
            }
            helperText={`Currency follows the original transaction: ${transaction.currency}.`}
            previewLabel="Transaction Amount"
            allowDecimal
          />

          <View style={styles.field}>
            <AppText variant="caption" muted style={styles.label}>
              Account
            </AppText>

            <View style={styles.optionList}>
              {activeAccounts.map((account: Account) => {
                const selected = account.id === accountId;

                return (
                  <Pressable
                    key={account.id}
                    onPress={() => setAccountId(account.id)}
                    style={[styles.optionCard, selected && styles.optionCardActive]}
                  >
                    <View style={[styles.optionIcon, selected && styles.optionIconActive]}>
                      <Ionicons
                        name="wallet-outline"
                        size={18}
                        color={selected ? colors.black : colors.text}
                      />
                    </View>

                    <View style={styles.optionTextBox}>
                      <AppText
                        variant="body"
                        style={[styles.optionTitle, selected && styles.optionTitleActive]}
                        numberOfLines={1}
                      >
                        {account.name}
                      </AppText>

                      <AppText variant="caption" muted={!selected} numberOfLines={1}>
                        {account.currency} • {formatCurrency(account.balance, account.currency)}
                      </AppText>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <AppText variant="caption" muted style={styles.label}>
              Category
            </AppText>

            <View style={styles.categoryGrid}>
              {categoryList.map((category: Category) => {
                const selected = category.id === categoryId;

                return (
                  <Pressable
                    key={category.id}
                    onPress={() => setCategoryId(category.id)}
                    style={[styles.categoryChip, selected && styles.categoryChipActive]}
                  >
                    <AppText
                      variant="caption"
                      style={[
                        styles.categoryChipText,
                        selected && styles.categoryChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {category.name}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
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
              style={[styles.input, styles.noteInput]}
            />
          </View>

          <View style={styles.previewCard}>
            <View>
              <AppText variant="caption" muted>
                Preview
              </AppText>

              <AppText variant="subtitle" style={styles.previewTitle}>
                {formatCurrency(parseAmount(amount), transaction.currency)}
              </AppText>
            </View>

            <AppText variant="caption" muted style={styles.previewDescription}>
              {selectedAccount?.name || 'Selected account'} • {selectedCategory?.name || transaction.categoryName || 'No category'} • {getLongDateLabel(selectedDate)}
            </AppText>
          </View>

          <Pressable onPress={handleSave} style={styles.saveButton}>
            <AppText variant="body" style={styles.saveButtonText}>
              Save Transaction Changes
            </AppText>
          </Pressable>

          <Pressable onPress={handleDelete} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={18} color={colors.white} />

            <AppText variant="body" style={styles.deleteButtonText}>
              Delete Transaction
            </AppText>
          </Pressable>
        </>
      )}
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
    heroCard: {
      borderWidth: 1,
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 15,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 18,
    },
    heroIcon: {
      width: 48,
      height: 48,
      borderRadius: 17,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroTextBox: {
      flex: 1,
      minWidth: 0,
    },
    heroTitle: {
      marginTop: 4,
      color: colors.text,
    },
    heroDate: {
      marginTop: 4,
    },
    lockedCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    lockedTextBox: {
      flex: 1,
      minWidth: 0,
    },
    lockedTitle: {
      color: colors.text,
      fontWeight: '900',
    },
    lockedDescription: {
      marginTop: 6,
      lineHeight: 19,
    },
    field: {
      gap: 9,
      marginBottom: 18,
    },
    label: {
      fontWeight: '900',
    },
    input: {
      minHeight: 52,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      paddingHorizontal: 15,
      fontSize: 15,
      fontWeight: '800',
    },
    noteInput: {
      minHeight: 90,
      textAlignVertical: 'top',
      paddingTop: 14,
    },
    helperText: {
      lineHeight: 18,
    },
    optionList: {
      gap: 10,
    },
    optionCard: {
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
    },
    optionCardActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    optionIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionIconActive: {
      backgroundColor: 'rgba(0,0,0,0.08)',
    },
    optionTextBox: {
      flex: 1,
      minWidth: 0,
    },
    optionTitle: {
      color: colors.text,
      fontWeight: '900',
      marginBottom: 3,
    },
    optionTitleActive: {
      color: colors.black,
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 9,
    },
    categoryChip: {
      minHeight: 38,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    categoryChipText: {
      color: colors.text,
      fontWeight: '900',
    },
    categoryChipTextActive: {
      color: colors.black,
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
    previewCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 15,
      marginBottom: 18,
    },
    previewTitle: {
      marginTop: 5,
      fontWeight: '900',
    },
    previewDescription: {
      marginTop: 10,
      lineHeight: 18,
    },
    saveButton: {
      minHeight: 56,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
    },
    saveButtonText: {
      color: colors.black,
      fontWeight: '900',
    },
    deleteButton: {
      minHeight: 54,
      borderRadius: 18,
      backgroundColor: colors.expense,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
      marginTop: 12,
    },
    deleteButtonText: {
      color: colors.white,
      fontWeight: '900',
    },
    emptyCard: {
      borderRadius: 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 22,
      alignItems: 'center',
    },
    emptyText: {
      marginTop: 10,
      textAlign: 'center',
      lineHeight: 21,
    },
  });
}
