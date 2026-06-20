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
import { Account, Currency } from '../src/types/finance';
import { formatCurrency } from '../src/utils/currency';
import { convertCurrencyAmount } from '../src/utils/currencyConversion';

const currencies: Currency[] = ['IDR', 'USD', 'EUR'];

function parseAmount(value: string) {
  const normalized = value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const amount = Number(normalized || 0);

  return Number.isFinite(amount) ? amount : 0;
}

function getModeLabel(mode: 'deposit' | 'withdrawal') {
  return mode === 'deposit' ? 'Deposit' : 'Withdrawal';
}

export default function SavingCashEventScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{
    savingGoalId?: string;
    mode?: string;
  }>();

  const mode: 'deposit' | 'withdrawal' =
    params.mode === 'withdrawal' ? 'withdrawal' : 'deposit';
  const savingGoalId =
    typeof params.savingGoalId === 'string' ? params.savingGoalId : '';

  const accounts = useFinanceStore((state) => state.accounts);
  const savingGoals = useFinanceStore((state) => state.savingGoals);
  const exchangeRates = useFinanceStore((state) => state.exchangeRates);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);
  const savingDeposit = useFinanceStore((state) => state.savingDeposit);
  const savingWithdrawal = useFinanceStore((state) => state.savingWithdrawal);

  const savingGoal = savingGoals.find((goal) => goal.id === savingGoalId);
  const savingAccount = accounts.find(
    (account) => account.id === savingGoal?.savingAccountId
  );

  const financeAccounts = useMemo(() => {
    return accounts.filter((account) => account.isActive && account.type !== 'saving');
  }, [accounts]);

  const defaultLinkedAccountId =
    mode === 'deposit'
      ? savingGoal?.linkedSourceAccountId || financeAccounts[0]?.id || ''
      : savingGoal?.linkedSourceAccountId || financeAccounts[0]?.id || '';

  const [linkedAccountId, setLinkedAccountId] = useState(defaultLinkedAccountId);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>(
    savingAccount?.currency || defaultCurrency
  );
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');

  const linkedAccount = financeAccounts.find((account) => account.id === linkedAccountId);
  const parsedAmount = parseAmount(amount);

  const linkedMovement = linkedAccount
    ? convertCurrencyAmount(parsedAmount, currency, linkedAccount.currency, exchangeRates)
    : 0;
  const savingMovement = savingAccount
    ? convertCurrencyAmount(parsedAmount, currency, savingAccount.currency, exchangeRates)
    : 0;

  const nextSavingAmount =
    mode === 'deposit'
      ? (savingGoal?.currentAmount || 0) + savingMovement
      : (savingGoal?.currentAmount || 0) - savingMovement;

  function handleSubmit() {
    if (!savingGoal || !savingAccount) {
      Alert.alert('Finance OS Mobile', 'Saving goal not found.');
      return;
    }

    if (!linkedAccount) {
      Alert.alert('Finance OS Mobile', 'Linked account not found.');
      return;
    }

    const payload = {
      fromAccountId: mode === 'deposit' ? linkedAccount.id : savingAccount.id,
      toAccountId: mode === 'deposit' ? savingAccount.id : linkedAccount.id,
      title: `Saving ${getModeLabel(mode)}: ${savingGoal.name}`,
      amount: parsedAmount,
      currency,
      date: date.trim() || undefined,
      note: note.trim() || undefined,
    };

    const result =
      mode === 'deposit'
        ? savingDeposit(payload)
        : savingWithdrawal(payload);

    Alert.alert('Finance OS Mobile', result.message);

    if (result.success) {
      router.back();
    }
  }

  if (!savingGoal || !savingAccount) {
    return (
      <Screen>
        <View style={styles.emptyCard}>
          <AppText variant="subtitle">Saving goal not found</AppText>

          <AppText variant="body" muted style={styles.emptyDescription}>
            Go back and select a valid saving goal.
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
            Savings
          </AppText>

          <AppText variant="title" style={styles.title}>
            {getModeLabel(mode)} Saving
          </AppText>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons
            name={mode === 'deposit' ? 'add-circle-outline' : 'remove-circle-outline'}
            size={22}
            color={colors.black}
          />
        </View>

        <View style={styles.heroText}>
          <AppText variant="caption" muted>
            Saving Goal
          </AppText>

          <AppText variant="subtitle" style={styles.goalName} numberOfLines={1}>
            {savingGoal.name}
          </AppText>

          <AppText variant="caption" muted numberOfLines={1}>
            Current: {formatCurrency(savingGoal.currentAmount, savingGoal.currency)}
          </AppText>
        </View>
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            {mode === 'deposit' ? 'Source Account' : 'Destination Account'}
          </AppText>

          <View style={styles.optionList}>
            {financeAccounts.map((account) => {
              const selected = linkedAccountId === account.id;

              return (
                <Pressable
                  key={account.id}
                  onPress={() => setLinkedAccountId(account.id)}
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

                  <View style={[styles.radioOuter, selected ? styles.radioOuterActive : null]}>
                    {selected ? <View style={styles.radioInner} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Input Currency
          </AppText>

          <View style={styles.currencyRow}>
            {currencies.map((item) => {
              const selected = currency === item;

              return (
                <Pressable
                  key={item}
                  onPress={() => setCurrency(item)}
                  style={[styles.currencyChip, selected ? styles.currencyChipActive : null]}
                >
                  <AppText
                    variant="caption"
                    style={[
                      styles.currencyChipText,
                      selected ? styles.currencyChipTextActive : null,
                    ]}
                  >
                    {item}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <NumericAmountInput
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          placeholder={currency === 'IDR' ? '500000' : '50'}
          currency={currency}
          icon={mode === 'deposit' ? 'add-circle-outline' : 'remove-circle-outline'}
          quickValues={currency === 'IDR' ? ['50000', '100000', '500000'] : ['10', '50', '100']}
          helperText="Input can use IDR, USD, or EUR. App will convert it to wallet currencies."
        />

        <View style={styles.previewCard}>
          <AppText variant="caption" muted style={styles.label}>
            Preview
          </AppText>

          <View style={styles.previewLine}>
            <AppText variant="caption" muted>
              Input amount
            </AppText>

            <AppText variant="caption" style={styles.previewValue}>
              {formatCurrency(parsedAmount, currency)}
            </AppText>
          </View>

          {linkedAccount ? (
            <View style={styles.previewLine}>
              <AppText variant="caption" muted>
                {mode === 'deposit' ? 'Source movement' : 'Destination movement'}
              </AppText>

              <AppText variant="caption" style={styles.previewValue}>
                {formatCurrency(linkedMovement, linkedAccount.currency)}
              </AppText>
            </View>
          ) : null}

          <View style={styles.previewLine}>
            <AppText variant="caption" muted>
              Saving movement
            </AppText>

            <AppText variant="caption" style={styles.previewValue}>
              {formatCurrency(savingMovement, savingAccount.currency)}
            </AppText>
          </View>

          <View style={styles.previewLine}>
            <AppText variant="caption" muted>
              Next saved amount
            </AppText>

            <AppText
              variant="caption"
              style={[
                styles.previewValue,
                nextSavingAmount < 0 ? styles.dangerText : null,
              ]}
            >
              {formatCurrency(Math.max(nextSavingAmount, 0), savingAccount.currency)}
            </AppText>
          </View>
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

        <Pressable
          onPress={handleSubmit}
          style={[
            styles.submitButton,
            mode === 'withdrawal' ? styles.withdrawSubmitButton : null,
          ]}
        >
          <AppText
            variant="body"
            style={[
              styles.submitText,
              mode === 'withdrawal' ? styles.withdrawSubmitText : null,
            ]}
          >
            Save {getModeLabel(mode)}
          </AppText>
        </Pressable>
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
      borderRadius: 24,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
      marginBottom: 18,
    },
    heroIcon: {
      width: 50,
      height: 50,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroText: {
      flex: 1,
      minWidth: 0,
    },
    goalName: {
      marginTop: 4,
      marginBottom: 4,
      color: colors.text,
    },
    form: {
      gap: 18,
    },
    field: {
      gap: 10,
    },
    label: {
      fontWeight: '900',
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
    currencyRow: {
      flexDirection: 'row',
      gap: 8,
    },
    currencyChip: {
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    currencyChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    currencyChipText: {
      color: colors.textMuted,
      fontWeight: '900',
    },
    currencyChipTextActive: {
      color: colors.black,
    },
    previewCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 15,
      gap: 10,
    },
    previewLine: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    previewValue: {
      color: colors.text,
      fontWeight: '900',
      textAlign: 'right',
      flexShrink: 1,
    },
    dangerText: {
      color: colors.expense,
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
    submitButton: {
      marginTop: 8,
      minHeight: 54,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    withdrawSubmitButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    submitText: {
      color: colors.black,
      fontWeight: '900',
    },
    withdrawSubmitText: {
      color: colors.text,
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
