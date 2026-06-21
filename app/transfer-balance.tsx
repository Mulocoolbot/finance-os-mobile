import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useAppToast } from '../src/components/ui/AppToast';
import { useFinanceStore } from '../src/stores/useFinanceStore';
import { Account, Currency } from '../src/types/finance';
import { formatCurrency } from '../src/utils/currency';

type TransferOption = {
  id: string;
  name: string;
  description: string;
  currency: Currency;
  balance: number;
  kind: 'finance' | 'trading';
};

const currencies: Currency[] = ['IDR', 'USD', 'EUR'];

function parseNumber(value: string) {
  const normalizedValue = value.replace(/,/g, '.').trim();
  const numericValue = Number(normalizedValue);

  return Number.isFinite(numericValue) ? numericValue : 0;
}

function createFinanceOption(account: Account): TransferOption {
  return {
    id: account.id,
    name: account.name,
    description: `${account.type.replace('_', ' ')} • Finance Account`,
    currency: account.currency,
    balance: account.balance,
    kind: 'finance',
  };
}

export default function TransferBalanceScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const toast = useAppToast();

  const accounts = useFinanceStore((state) => state.accounts);
  const transferBalance = useFinanceStore((state) => state.transferBalance);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);

  const options = useMemo(() => {
    return accounts
      .filter((account) => account.isActive)
      .map(createFinanceOption);
  }, [accounts]);

  const [fromAccountId, setFromAccountId] = useState(options[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(options[1]?.id || '');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [note, setNote] = useState('');

  const fromOption = options.find((option) => option.id === fromAccountId);
  const toOption = options.find((option) => option.id === toAccountId);

  function handleTransfer() {
    const result = transferBalance({
      fromAccountId,
      toAccountId,
      title: 'Balance Transfer',
      amount: parseNumber(amount),
      currency,
      note,
    });

    if (!result.success) {
      toast.showError('Could Not Transfer', result.message);
      return;
    }

    toast.showSuccess('Transfer Saved', result.message);
    router.back();
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

          <AppText variant="title">Transfer Balance</AppText>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoIcon}>
          <Ionicons name="swap-horizontal-outline" size={20} color={colors.black} />
        </View>

        <View style={styles.infoTextBox}>
          <AppText variant="body" style={styles.infoTitle}>
            Unified transfer
          </AppText>

          <AppText variant="caption" muted style={styles.infoDescription}>
            Move balance between Finance accounts. For trading funds, transfer to the linked Broker Wallet account first.
          </AppText>
        </View>
      </View>

      <View style={styles.formCard}>
        <AccountPicker
          label="From"
          options={options}
          selectedId={fromAccountId}
          onSelect={setFromAccountId}
          colors={colors}
        />

        <AccountPicker
          label="To"
          options={options}
          selectedId={toAccountId}
          onSelect={setToAccountId}
          colors={colors}
        />

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Currency
          </AppText>

          <View style={styles.chipRow}>
            {currencies.map((item) => {
              const active = currency === item;

              return (
                <Pressable
                  key={item}
                  onPress={() => setCurrency(item)}
                  style={[styles.chip, active ? styles.chipActive : null]}
                >
                  <AppText
                    variant="caption"
                    style={[styles.chipText, active ? styles.chipTextActive : null]}
                  >
                    {item}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Amount
          </AppText>

          <View style={styles.inputBox}>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.previewCard}>
          <AppText variant="caption" muted>
            Transfer Preview
          </AppText>

          <AppText variant="body" style={styles.previewText}>
            {fromOption?.name || 'Source'} → {toOption?.name || 'Destination'}
          </AppText>

          <AppText variant="caption" muted style={styles.previewDescription}>
            Amount: {formatCurrency(parseNumber(amount), currency)}
          </AppText>
        </View>

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Note
          </AppText>

          <View style={[styles.inputBox, styles.noteInputBox]}>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Optional transfer note"
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
              style={[styles.input, styles.noteInput]}
            />
          </View>
        </View>
      </View>

      <Pressable onPress={handleTransfer} style={styles.saveButton}>
        <Ionicons name="swap-horizontal-outline" size={18} color={colors.black} />

        <AppText variant="body" style={styles.saveButtonText}>
          Transfer Balance
        </AppText>
      </Pressable>
    </Screen>
  );
}

function AccountPicker({
  label,
  options,
  selectedId,
  onSelect,
  colors,
}: {
  label: string;
  options: TransferOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  colors: ThemeColors;
}) {
  const styles = createStyles(colors);

  return (
    <View style={styles.field}>
      <AppText variant="caption" muted style={styles.label}>
        {label}
      </AppText>

      <View style={styles.optionList}>
        {options.map((option) => {
          const active = option.id === selectedId;

          return (
            <Pressable
              key={option.id}
              onPress={() => onSelect(option.id)}
              style={[styles.optionCard, active ? styles.optionCardActive : null]}
            >
              <View style={styles.optionIcon}>
                <Ionicons
                  name="wallet-outline"
                  size={18}
                  color={active ? colors.black : colors.text}
                />
              </View>

              <View style={styles.optionTextBox}>
                <AppText
                  variant="body"
                  style={[styles.optionTitle, active ? styles.optionTextActive : null]}
                  numberOfLines={1}
                >
                  {option.name}
                </AppText>

                <AppText
                  variant="caption"
                  muted={!active}
                  style={active ? styles.optionDescriptionActive : styles.optionDescription}
                  numberOfLines={1}
                >
                  {option.description}
                </AppText>

                <AppText
                  variant="caption"
                  muted={!active}
                  style={active ? styles.optionDescriptionActive : styles.optionDescription}
                  numberOfLines={1}
                >
                  Balance {formatCurrency(option.balance, option.currency)}
                </AppText>
              </View>
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
    infoCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 14,
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    infoIcon: {
      width: 42,
      height: 42,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoTextBox: {
      flex: 1,
      minWidth: 0,
    },
    infoTitle: {
      color: colors.text,
      fontWeight: '900',
    },
    infoDescription: {
      marginTop: 5,
      lineHeight: 18,
    },
    formCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 16,
      gap: 16,
      marginBottom: 16,
    },
    field: {
      gap: 8,
    },
    label: {
      fontWeight: '900',
    },
    optionList: {
      gap: 9,
    },
    optionCard: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 12,
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
    },
    optionCardActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    optionIcon: {
      width: 36,
      height: 36,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionTextBox: {
      flex: 1,
      minWidth: 0,
    },
    optionTitle: {
      color: colors.text,
      fontWeight: '900',
    },
    optionTextActive: {
      color: colors.black,
    },
    optionDescription: {
      marginTop: 3,
    },
    optionDescriptionActive: {
      color: colors.black,
      marginTop: 3,
      opacity: 0.78,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      minHeight: 38,
      borderRadius: 999,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      color: colors.textMuted,
      fontWeight: '900',
    },
    chipTextActive: {
      color: colors.black,
    },
    inputBox: {
      minHeight: 52,
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 13,
      justifyContent: 'center',
    },
    input: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '900',
      paddingVertical: 10,
      outlineStyle: 'none' as any,
    },
    noteInputBox: {
      minHeight: 92,
      justifyContent: 'flex-start',
      paddingTop: 10,
    },
    noteInput: {
      minHeight: 70,
      fontSize: 14,
      lineHeight: 19,
    },
    previewCard: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 13,
      gap: 5,
    },
    previewText: {
      color: colors.text,
      fontWeight: '900',
    },
    previewDescription: {
      lineHeight: 18,
    },
    saveButton: {
      minHeight: 56,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 9,
      paddingHorizontal: 18,
      marginBottom: 8,
    },
    saveButtonText: {
      color: colors.black,
      fontWeight: '900',
    },
  });
}
