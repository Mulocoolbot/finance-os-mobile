import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { NumericAmountInput } from '../src/components/ui/NumericAmountInput';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useAppToast } from '../src/components/ui/AppToast';
import { useFinanceStore } from '../src/stores/useFinanceStore';
import { Account, Category, Transaction } from '../src/types/finance';
import { formatCurrency } from '../src/utils/currency';

function parseAmount(value: string) {
  const normalized = value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const amount = Number(normalized || 0);

  return Number.isFinite(amount) ? amount : 0;
}

function canEditDirectly(transaction: Transaction) {
  return transaction.type === 'income' || transaction.type === 'expense';
}

export default function EditTransactionScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const toast = useAppToast();
  const params = useLocalSearchParams<{ transactionId?: string }>();
  const transactionId =
    typeof params.transactionId === 'string' ? params.transactionId : '';

  const accounts = useFinanceStore((state) => state.accounts);
  const categories = useFinanceStore((state) => state.categories);
  const transaction = useFinanceStore((state) =>
    state.transactions.find((item) => item.id === transactionId)
  );
  const updateTransaction = useFinanceStore((state) => state.updateTransaction);

  const availableAccounts = useMemo(() => {
    return accounts.filter((account) => account.isActive && account.type !== 'saving');
  }, [accounts]);

  const availableCategories = useMemo(() => {
    if (!transaction) {
      return [];
    }

    return categories.filter(
      (category) => category.isActive && category.type === transaction.type
    );
  }, [categories, transaction]);

  const [title, setTitle] = useState(transaction?.title || '');
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '');
  const [accountId, setAccountId] = useState(transaction?.accountId || '');
  const [categoryId, setCategoryId] = useState(transaction?.categoryId || '');
  const [date, setDate] = useState(transaction?.date || '');
  const [note, setNote] = useState(transaction?.note || '');

  const selectedAccount = availableAccounts.find((account) => account.id === accountId);
  const currency = selectedAccount?.currency || transaction?.currency || 'IDR';

  function handleSubmit() {
    if (!transaction) {
      toast.showWarning('Transaction Missing', 'Transaction not found.');
      return;
    }

    if (!canEditDirectly(transaction)) {
      toast.showWarning(
        'Cannot Edit Directly',
        'Only normal income and expense transactions can be edited directly.'
      );
      return;
    }

    const result = updateTransaction({
      transactionId: transaction.id,
      title,
      amount: parseAmount(amount),
      accountId,
      categoryId,
      date,
      note,
    });

    if (!result.success) {
      toast.showError('Could Not Update Transaction', result.message);
      return;
    }

    toast.showSuccess('Transaction Updated', result.message);
    router.back();
  }

  if (!transaction) {
    return (
      <Screen>
        <View style={styles.emptyCard}>
          <AppText variant="subtitle">Transaction not found</AppText>

          <AppText variant="body" muted style={styles.emptyDescription}>
            This transaction may have been deleted.
          </AppText>

          <Pressable onPress={() => router.back()} style={styles.submitButton}>
            <AppText variant="body" style={styles.submitText}>
              Go Back
            </AppText>
          </Pressable>
        </View>
      </Screen>
    );
  }

  if (!canEditDirectly(transaction)) {
    return (
      <Screen>
        <View style={styles.emptyCard}>
          <AppText variant="subtitle">Managed transaction</AppText>

          <AppText variant="body" muted style={styles.emptyDescription}>
            Transfer, saving, investment, and crypto transactions are managed by their own modules for balance safety.
          </AppText>

          <Pressable onPress={() => router.back()} style={styles.submitButton}>
            <AppText variant="body" style={styles.submitText}>
              Go Back
            </AppText>
          </Pressable>
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
            Transaction
          </AppText>

          <AppText variant="title" style={styles.title}>
            Edit Transaction
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
              Transaction identity
            </AppText>
          </View>

          <AppText variant="caption" muted style={styles.sectionMiniHint}>
            Title
          </AppText>
        </View>

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Title
          </AppText>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Transaction title"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </View>

        <View style={styles.sectionMiniHeader}>
          <View>
            <AppText variant="caption" muted>
              Step 2
            </AppText>

            <AppText variant="subtitle" style={styles.sectionMiniTitle}>
              Amount impact
            </AppText>
          </View>

          <AppText variant="caption" muted style={styles.sectionMiniHint}>
            Balance-safe
          </AppText>
        </View>

        <NumericAmountInput
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          placeholder={currency === 'IDR' ? '50000' : '50'}
          currency={currency}
          icon={transaction.type === 'income' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
          quickValues={currency === 'IDR' ? ['50000', '100000', '500000'] : ['10', '50', '100']}
          helperText="Editing will roll back the old balance impact and apply the new one."
        />

        <View style={styles.sectionMiniHeader}>
          <View>
            <AppText variant="caption" muted>
              Step 3
            </AppText>

            <AppText variant="subtitle" style={styles.sectionMiniTitle}>
              Account & category
            </AppText>
          </View>

          <AppText variant="caption" muted style={styles.sectionMiniHint}>
            Routing
          </AppText>
        </View>

        <AccountPicker
          accounts={availableAccounts}
          selectedAccountId={accountId}
          onSelect={setAccountId}
          colors={colors}
        />

        <CategoryPicker
          categories={availableCategories}
          selectedCategoryId={categoryId}
          onSelect={setCategoryId}
          colors={colors}
        />

        <View style={styles.sectionMiniHeader}>
          <View>
            <AppText variant="caption" muted>
              Step 4
            </AppText>

            <AppText variant="subtitle" style={styles.sectionMiniTitle}>
              Date, note & save
            </AppText>
          </View>

          <AppText variant="caption" muted style={styles.sectionMiniHint}>
            Final
          </AppText>
        </View>

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Date
          </AppText>

          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
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
            Update Transaction
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

function AccountPicker({
  accounts,
  selectedAccountId,
  onSelect,
  colors,
}: {
  accounts: Account[];
  selectedAccountId: string;
  onSelect: (accountId: string) => void;
  colors: ThemeColors;
}) {
  const styles = createStyles(colors);

  return (
    <View style={styles.field}>
      <AppText variant="caption" muted style={styles.label}>
        Account
      </AppText>

      <View style={styles.optionList}>
        {accounts.map((account) => {
          const selected = selectedAccountId === account.id;

          return (
            <Pressable
              key={account.id}
              onPress={() => onSelect(account.id)}
              style={[styles.optionCard, selected ? styles.optionCardActive : null]}
            >
              <View style={styles.optionTextBox}>
                <AppText
                  variant="body"
                  style={[styles.optionTitle, selected ? styles.optionTitleActive : null]}
                  numberOfLines={1}
                >
                  {account.name}
                </AppText>

                <AppText
                  variant="caption"
                  muted={!selected}
                  style={selected ? styles.optionDescriptionActive : undefined}
                  numberOfLines={1}
                >
                  {formatCurrency(account.balance, account.currency)}
                </AppText>
              </View>
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
  selectedCategoryId?: string;
  onSelect: (categoryId: string) => void;
  colors: ThemeColors;
}) {
  const styles = createStyles(colors);

  return (
    <View style={styles.field}>
      <AppText variant="caption" muted style={styles.label}>
        Category
      </AppText>

      <View style={styles.chipGrid}>
        {categories.map((category) => {
          const selected = selectedCategoryId === category.id;

          return (
            <Pressable
              key={category.id}
              onPress={() => onSelect(category.id)}
              style={[styles.categoryChip, selected ? styles.categoryChipActive : null]}
            >
              <Ionicons
                name={(category.icon || 'pricetag-outline') as any}
                size={15}
                color={selected ? colors.black : category.color || colors.text}
              />

              <AppText
                variant="caption"
                style={[
                  styles.categoryChipText,
                  selected ? styles.categoryChipTextActive : null,
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
    form: {
      gap: 18,
    },
    sectionMiniHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: 12,
      marginTop: 4,
      marginBottom: -4,
    },
    sectionMiniTitle: {
      marginTop: 3,
      color: colors.text,
    },
    sectionMiniHint: {
      fontWeight: '900',
    },
    field: {
      gap: 10,
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
      paddingHorizontal: 16,
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    textArea: {
      minHeight: 96,
      paddingTop: 14,
      textAlignVertical: 'top',
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
    optionDescriptionActive: {
      color: colors.black,
      opacity: 0.75,
    },
    chipGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    categoryChip: {
      maxWidth: '48%',
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 11,
      paddingVertical: 9,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    categoryChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    categoryChipText: {
      color: colors.textMuted,
      fontWeight: '900',
      flexShrink: 1,
    },
    categoryChipTextActive: {
      color: colors.black,
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
    emptyCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 18,
    },
    emptyDescription: {
      marginTop: 8,
      marginBottom: 16,
      lineHeight: 22,
    },
  });
}
