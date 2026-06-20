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
import { Account, SavingGoal } from '../src/types/finance';
import { formatCurrency } from '../src/utils/currency';

function parseAmount(value: string) {
  return Number(value.replace(/[^0-9.]/g, '') || 0);
}

const savingStatusOptions: { label: string; value: SavingGoal['status'] }[] = [
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Paused', value: 'paused' },
  { label: 'Cancelled', value: 'cancelled' },
];

export default function AddSavingScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ savingGoalId?: string }>();
  const savingGoalId =
    typeof params.savingGoalId === 'string' ? params.savingGoalId : '';

  const accounts = useFinanceStore((state) => state.accounts);
  const savingGoals = useFinanceStore((state) => state.savingGoals);
  const addSavingGoal = useFinanceStore((state) => state.addSavingGoal);
  const updateSavingGoal = useFinanceStore((state) => state.updateSavingGoal);
  const deleteSavingGoal = useFinanceStore((state) => state.deleteSavingGoal);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);

  const existingSavingGoal = savingGoals.find((saving) => saving.id === savingGoalId);
  const isEditMode = Boolean(existingSavingGoal);

  const sourceAccounts = useMemo(() => {
    return accounts.filter((account) => account.isActive && account.type !== 'saving');
  }, [accounts]);

  const [name, setName] = useState(existingSavingGoal?.name || '');
  const [targetAmount, setTargetAmount] = useState(
    existingSavingGoal ? String(existingSavingGoal.targetAmount) : ''
  );
  const [initialAmount, setInitialAmount] = useState(
    existingSavingGoal ? String(existingSavingGoal.currentAmount) : ''
  );
  const [linkedSourceAccountId, setLinkedSourceAccountId] = useState(
    existingSavingGoal?.linkedSourceAccountId || sourceAccounts[0]?.id || ''
  );
  const [deadline, setDeadline] = useState(existingSavingGoal?.deadline || '');
  const [note, setNote] = useState(existingSavingGoal?.note || '');
  const [status, setStatus] = useState<SavingGoal['status']>(
    existingSavingGoal?.status || 'active'
  );

  const selectedSourceAccount = sourceAccounts.find(
    (account) => account.id === linkedSourceAccountId
  );
  const savingCurrency =
    selectedSourceAccount?.currency || existingSavingGoal?.currency || defaultCurrency;

  function handleSubmit() {
    const effectiveSourceId = linkedSourceAccountId || sourceAccounts[0]?.id || '';

    if (isEditMode && !existingSavingGoal) {
      Alert.alert('Finance OS Mobile', 'Saving goal not found.');
      return;
    }

    const result =
      isEditMode && existingSavingGoal
        ? updateSavingGoal({
            savingGoalId: existingSavingGoal.id,
            name,
            targetAmount: parseAmount(targetAmount),
            currentAmount: parseAmount(initialAmount),
            linkedSourceAccountId: effectiveSourceId,
            deadline: deadline.trim() || undefined,
            note: note.trim() || undefined,
            status,
          })
        : addSavingGoal({
            name,
            targetAmount: parseAmount(targetAmount),
            linkedSourceAccountId: effectiveSourceId,
            initialAmount: parseAmount(initialAmount),
            deadline: deadline.trim() || undefined,
            note: note.trim() || undefined,
          });

    if (!result.success) {
      Alert.alert('Finance OS Mobile', result.message);
      return;
    }

    Alert.alert('Finance OS Mobile', result.message);
    router.back();
  }

  function handleDelete() {
    if (!isEditMode || !existingSavingGoal) {
      Alert.alert('Finance OS Mobile', 'Saving goal not found.');
      return;
    }

    Alert.alert(
      'Delete Saving Goal',
      existingSavingGoal.currentAmount > 0
        ? 'This will delete the saving goal and return the saved amount to the linked source account. Continue?'
        : 'This will permanently delete the saving goal. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const result = deleteSavingGoal(existingSavingGoal.id);

            if (!result.success) {
              Alert.alert('Finance OS Mobile', result.message);
              return;
            }

            Alert.alert('Finance OS Mobile', result.message);
            router.back();
          },
        },
      ]
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
            {isEditMode ? 'Edit Saving Goal' : 'Add Saving Goal'}
          </AppText>
        </View>
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Goal Name
          </AppText>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Example: New Laptop"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </View>

        <NumericAmountInput
          label="Target Amount"
          value={targetAmount}
          onChangeText={setTargetAmount}
          placeholder="5000000"
          currency={savingCurrency}
          icon="flag-outline"
          quickValues={savingCurrency === 'IDR' ? ['1000000', '5000000', '10000000'] : ['100', '500', '1000']}
          helperText="Target follows the selected source account currency."
        />

        <NumericAmountInput
          label={isEditMode ? "Current Saved Amount" : "Initial Amount"}
          value={initialAmount}
          onChangeText={setInitialAmount}
          placeholder="500000"
          currency={savingCurrency}
          icon="sparkles-outline"
          quickValues={savingCurrency === 'IDR' ? ['100000', '500000', '1000000'] : ['50', '100', '250']}
          helperText={isEditMode ? "Edit adjusts the saving wallet balance as correction, not a new transaction." : "Initial amount will be moved from the selected source account into the saving goal."}
        />

        <SourceAccountPicker
          accounts={sourceAccounts}
          selectedAccountId={linkedSourceAccountId}
          onSelect={setLinkedSourceAccountId}
          colors={colors}
        />

        {isEditMode ? (
          <StatusPicker
            status={status}
            onChange={setStatus}
            colors={colors}
          />
        ) : null}

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Deadline
          </AppText>

          <TextInput
            value={deadline}
            onChangeText={setDeadline}
            placeholder="Example: 2026-12-31"
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

        {isEditMode ? (
          <Pressable onPress={handleDelete} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={18} color={colors.expense} />

            <AppText variant="body" style={styles.deleteText}>
              Delete Saving Goal
            </AppText>
          </Pressable>
        ) : null}

        <Pressable onPress={handleSubmit} style={styles.submitButton}>
          <AppText variant="body" style={styles.submitText}>
            {isEditMode ? 'Update Goal' : 'Save Goal'}
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

function StatusPicker({
  status,
  onChange,
  colors,
}: {
  status: SavingGoal['status'];
  onChange: (status: SavingGoal['status']) => void;
  colors: ThemeColors;
}) {
  const styles = createStyles(colors);

  return (
    <View style={styles.field}>
      <AppText variant="caption" muted style={styles.label}>
        Status
      </AppText>

      <View style={styles.statusGrid}>
        {savingStatusOptions.map((option) => {
          const selected = status === option.value;

          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[styles.statusChip, selected ? styles.statusChipActive : null]}
            >
              <AppText
                variant="caption"
                style={[
                  styles.statusChipText,
                  selected ? styles.statusChipTextActive : null,
                ]}
              >
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function SourceAccountPicker({
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
        Source Account
      </AppText>

      {accounts.length === 0 ? (
        <View style={styles.emptyBox}>
          <AppText variant="caption" muted>
            No source accounts available.
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
      minHeight: 100,
      paddingTop: 14,
      textAlignVertical: 'top',
    },
    optionList: {
      gap: 10,
    },
    statusGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    statusChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    statusChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    statusChipText: {
      color: colors.textMuted,
      fontWeight: '900',
    },
    statusChipTextActive: {
      color: colors.black,
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
    deleteButton: {
      marginTop: 4,
      minHeight: 54,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.expense,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    deleteText: {
      color: colors.expense,
      fontWeight: '900',
    },
    submitButton: {
      marginTop: 8,
      minHeight: 54,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitText: {
      color: colors.black,
      fontWeight: '900',
    },
  });
}
