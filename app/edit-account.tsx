import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useFinanceStore } from '../src/stores/useFinanceStore';
import { AccountType } from '../src/types/finance';
import { formatCurrency } from '../src/utils/currency';
import { formatCompactCurrency } from '../src/utils/formatCompactCurrency';

const accountTypeOptions: {
  label: string;
  value: AccountType;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}[] = [
  {
    label: 'Cash',
    value: 'cash',
    icon: 'cash-outline',
    description: 'Physical cash balance.',
  },
  {
    label: 'Bank',
    value: 'bank',
    icon: 'business-outline',
    description: 'Bank account or debit balance.',
  },
  {
    label: 'E-Wallet',
    value: 'e_wallet',
    icon: 'phone-portrait-outline',
    description: 'Digital wallet account.',
  },
  {
    label: 'Saving',
    value: 'saving',
    icon: 'sparkles-outline',
    description: 'Saving or separated money pocket.',
  },
  {
    label: 'Broker',
    value: 'broker',
    icon: 'trending-up-outline',
    description: 'Investment account.',
  },
  {
    label: 'Crypto Wallet',
    value: 'crypto_wallet',
    icon: 'logo-bitcoin',
    description: 'Crypto wallet or exchange.',
  },
  {
    label: 'Custom',
    value: 'custom',
    icon: 'wallet-outline',
    description: 'Other account type.',
  },
];

function parseAmount(value: string) {
  return Number(value.replace(/[^0-9.]/g, '') || 0);
}

function formatAmountInput(value: number) {
  if (!Number.isFinite(value)) {
    return '0';
  }

  return String(value);
}

function getAccountTypeLabel(type: AccountType) {
  const option = accountTypeOptions.find((item) => item.value === type);
  return option?.label || 'Account';
}

export default function EditAccountScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ accountId?: string }>();

  const accounts = useFinanceStore((state) => state.accounts);
  const transactions = useFinanceStore((state) => state.transactions);
  const savingGoals = useFinanceStore((state) => state.savingGoals);
  const investmentHoldings = useFinanceStore((state) => state.investmentHoldings);
  const updateAccount = useFinanceStore((state) => state.updateAccount);
  const deleteAccount = useFinanceStore((state) => state.deleteAccount);
  const permanentlyDeleteAccount = useFinanceStore(
    (state) => state.permanentlyDeleteAccount
  );

  const account = accounts.find((item) => item.id === params.accountId);

  const [name, setName] = useState(account?.name || '');
  const [type, setType] = useState<AccountType>(account?.type || 'bank');
  const [balance, setBalance] = useState(formatAmountInput(account?.balance || 0));
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!account) {
      return;
    }

    setName(account.name);
    setType(account.type);
    setBalance(formatAmountInput(account.balance));
  }, [account?.id]);

  const parsedBalance = parseAmount(balance);
  const balanceDifference = parsedBalance - (account?.balance || 0);
  const isIncrease = balanceDifference >= 0;

  const usage = useMemo(() => {
    if (!account) {
      return {
        transactionCount: 0,
        savingCount: 0,
        investmentCount: 0,
        hasLinkedData: false,
      };
    }

    const transactionCount = transactions.filter((transaction) => {
      return (
        transaction.accountId === account.id ||
        transaction.fromAccountId === account.id ||
        transaction.toAccountId === account.id
      );
    }).length;
    const savingCount = savingGoals.filter((savingGoal) => {
      return (
        savingGoal.savingAccountId === account.id ||
        savingGoal.linkedSourceAccountId === account.id
      );
    }).length;
    const investmentCount = investmentHoldings.filter((holding) => {
      return holding.accountId === account.id;
    }).length;

    return {
      transactionCount,
      savingCount,
      investmentCount,
      hasLinkedData: transactionCount > 0 || savingCount > 0 || investmentCount > 0,
    };
  }, [account, transactions, savingGoals, investmentHoldings]);

  function handleSave() {
    if (!account) {
      Alert.alert('Finance OS Mobile', 'Account not found.');
      return;
    }

    const result = updateAccount({
      accountId: account.id,
      name,
      type,
      balance: parsedBalance,
      note,
    });

    Alert.alert('Finance OS Mobile', result.message);

    if (result.success) {
      router.back();
    }
  }

  function handleDelete() {
    if (!account) {
      Alert.alert('Finance OS Mobile', 'Account not found.');
      return;
    }

    Alert.alert(
      usage.hasLinkedData ? 'Archive Account' : 'Delete Account',
      usage.hasLinkedData
        ? `${account.name} has linked history. It will be archived instead of permanently deleted.`
        : `Delete ${account.name}? This cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: usage.hasLinkedData ? 'Archive' : 'Delete',
          style: 'destructive',
          onPress: () => {
            const result = deleteAccount(account.id);

            Alert.alert('Finance OS Mobile', result.message);

            if (result.success) {
              router.back();
            }
          },
        },
      ]
    );
  }

  function handlePermanentDelete() {
    if (!account) {
      Alert.alert('Finance OS Mobile', 'Account not found.');
      return;
    }

    Alert.alert(
      'Delete Permanently',
      usage.hasLinkedData
        ? `This will permanently delete ${account.name} and all linked transactions, savings, investment holdings, investment orders, and price history. This cannot be undone.`
        : `This will permanently delete ${account.name}. This cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: () => {
            const result = permanentlyDeleteAccount(account.id);

            Alert.alert('Finance OS Mobile', result.message);

            if (result.success) {
              router.back();
            }
          },
        },
      ]
    );
  }

  if (!account) {
    return (
      <Screen>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
          </Pressable>

          <View style={styles.headerText}>
            <AppText variant="caption" muted>
              Accounts
            </AppText>

            <AppText variant="title">Account Not Found</AppText>
          </View>
        </View>

        <View style={styles.emptyCard}>
          <Ionicons name="alert-circle-outline" size={28} color={colors.textMuted} />

          <AppText variant="body" muted style={styles.emptyText}>
            This account may have been deleted.
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
            Accounts
          </AppText>

          <AppText variant="title">Edit Account</AppText>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons name="wallet-outline" size={25} color={colors.black} />
        </View>

        <View style={styles.heroTextBox}>
          <AppText variant="caption" style={styles.heroLabel}>
            {getAccountTypeLabel(account.type)} • {account.currency}
          </AppText>

          <AppText variant="title" style={styles.heroTitle} numberOfLines={1}>
            {account.name}
          </AppText>

          <AppText variant="caption" style={styles.heroSubText} numberOfLines={1}>
            Current balance: {formatCompactCurrency(account.balance, account.currency)}
          </AppText>
        </View>
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Account Name
          </AppText>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Example: BCA Main Account"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Account Type
          </AppText>

          <View style={styles.optionList}>
            {accountTypeOptions.map((item) => {
              const selected = type === item.value;

              return (
                <Pressable
                  key={item.value}
                  onPress={() => setType(item.value)}
                  style={[styles.optionCard, selected && styles.optionCardActive]}
                >
                  <View style={[styles.optionIcon, selected && styles.optionIconActive]}>
                    <Ionicons
                      name={item.icon}
                      size={19}
                      color={selected ? colors.black : colors.text}
                    />
                  </View>

                  <View style={styles.optionTextBox}>
                    <AppText
                      variant="body"
                      style={[styles.optionTitle, selected && styles.optionTitleActive]}
                    >
                      {item.label}
                    </AppText>

                    <AppText
                      variant="caption"
                      muted={!selected}
                      style={styles.optionDescription}
                    >
                      {item.description}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Currency
          </AppText>

          <View style={styles.lockedCurrencyCard}>
            <View style={styles.lockedCurrencyIcon}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.text} />
            </View>

            <View style={styles.lockedCurrencyTextBox}>
              <AppText variant="body" style={styles.lockedCurrencyTitle}>
                {account.currency}
              </AppText>

              <AppText variant="caption" muted style={styles.lockedCurrencyDescription}>
                Currency is locked to keep old transactions safe.
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Account Balance
          </AppText>

          <TextInput
            value={balance}
            onChangeText={setBalance}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <AppText variant="caption" muted style={styles.helperText}>
            This will set the account balance directly.
          </AppText>
        </View>

        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <View>
              <AppText variant="caption" muted>
                Balance Preview
              </AppText>

              <AppText variant="subtitle" style={styles.previewTitle}>
                {formatCurrency(parsedBalance, account.currency)}
              </AppText>
            </View>

            <View style={styles.previewBadge}>
              <AppText
                variant="caption"
                style={[
                  styles.previewBadgeText,
                  { color: isIncrease ? colors.income : colors.expense },
                ]}
              >
                {balanceDifference === 0
                  ? 'No Change'
                  : `${isIncrease ? '+' : '-'}${formatCompactCurrency(
                      Math.abs(balanceDifference),
                      account.currency
                    )}`}
              </AppText>
            </View>
          </View>

          {balanceDifference !== 0 ? (
            <AppText variant="caption" muted style={styles.previewDescription}>
              A balance adjustment transaction will be recorded so the manual change has history.
            </AppText>
          ) : (
            <AppText variant="caption" muted style={styles.previewDescription}>
              No balance adjustment transaction will be created.
            </AppText>
          )}
        </View>

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Adjustment Note
          </AppText>

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Optional note for balance adjustment"
            placeholderTextColor={colors.textMuted}
            multiline
            style={[styles.input, styles.noteInput]}
          />
        </View>

        <Pressable onPress={handleSave} style={styles.saveButton}>
          <AppText variant="body" style={styles.saveButtonText}>
            Save Account Changes
          </AppText>
        </Pressable>

        <View style={styles.dangerCard}>
          <View style={styles.dangerTextBox}>
            <AppText variant="body" style={styles.dangerTitle}>
              Account Removal
            </AppText>

            <AppText variant="caption" muted style={styles.dangerDescription}>
              {usage.hasLinkedData
                ? `Linked data: ${usage.transactionCount} transaction(s), ${usage.savingCount} saving(s), ${usage.investmentCount} investment holding(s). Archive keeps history. Delete Permanently removes linked data too.`
                : 'This account has no linked records. You can archive or permanently delete it.'}
            </AppText>
          </View>

          <View style={styles.removalActionStack}>
            <Pressable onPress={handleDelete} style={styles.archiveButton}>
              <Ionicons name="archive-outline" size={17} color={colors.text} />

              <AppText variant="body" style={styles.archiveButtonText}>
                {usage.hasLinkedData ? 'Archive' : 'Safe Delete'}
              </AppText>
            </Pressable>

            <Pressable onPress={handlePermanentDelete} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={17} color={colors.expense} />

              <AppText variant="body" style={styles.deleteButtonText}>
                Delete Permanently
              </AppText>
            </Pressable>
          </View>
        </View>
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
    heroCard: {
      backgroundColor: colors.primary,
      borderRadius: 28,
      padding: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 18,
    },
    heroIcon: {
      width: 54,
      height: 54,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroTextBox: {
      flex: 1,
      minWidth: 0,
    },
    heroLabel: {
      color: 'rgba(0,0,0,0.62)',
      fontWeight: '900',
    },
    heroTitle: {
      marginTop: 4,
      color: colors.black,
    },
    heroSubText: {
      marginTop: 4,
      color: 'rgba(0,0,0,0.62)',
      fontWeight: '800',
    },
    form: {
      gap: 18,
    },
    field: {
      gap: 9,
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
      minHeight: 92,
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
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    optionCardActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    optionIcon: {
      width: 42,
      height: 42,
      borderRadius: 15,
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
    },
    optionTitleActive: {
      color: colors.black,
    },
    optionDescription: {
      marginTop: 4,
      lineHeight: 18,
    },
    lockedCurrencyCard: {
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    lockedCurrencyIcon: {
      width: 42,
      height: 42,
      borderRadius: 15,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    lockedCurrencyTextBox: {
      flex: 1,
      minWidth: 0,
    },
    lockedCurrencyTitle: {
      color: colors.text,
      fontWeight: '900',
    },
    lockedCurrencyDescription: {
      marginTop: 4,
      lineHeight: 18,
    },
    previewCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 15,
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    previewTitle: {
      marginTop: 5,
      fontWeight: '900',
    },
    previewBadge: {
      borderRadius: 999,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 11,
      paddingVertical: 7,
    },
    previewBadgeText: {
      fontWeight: '900',
    },
    previewDescription: {
      marginTop: 12,
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
    dangerCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 15,
      gap: 14,
    },
    dangerTextBox: {
      minWidth: 0,
    },
    dangerTitle: {
      color: colors.text,
      fontWeight: '900',
    },
    dangerDescription: {
      marginTop: 4,
      lineHeight: 18,
    },
    removalActionStack: {
      gap: 10,
    },
    archiveButton: {
      minHeight: 46,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },
    archiveButtonText: {
      color: colors.text,
      fontWeight: '900',
    },
    deleteButton: {
      minHeight: 46,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.expense,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },
    deleteButtonText: {
      color: colors.expense,
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
