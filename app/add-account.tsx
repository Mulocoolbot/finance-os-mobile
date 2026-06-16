import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { NumericAmountInput } from '../src/components/ui/NumericAmountInput';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useFinanceStore } from '../src/stores/useFinanceStore';
import { AccountType, Currency } from '../src/types/finance';

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
    description: 'Main bank account.',
  },
  {
    label: 'E-Wallet',
    value: 'e_wallet',
    icon: 'phone-portrait-outline',
    description: 'Digital wallet account.',
  },
  {
    label: 'Broker',
    value: 'broker',
    icon: 'trending-up-outline',
    description: 'Investment or stock account.',
  },
  {
    label: 'Crypto Wallet',
    value: 'crypto_wallet',
    icon: 'logo-bitcoin',
    description: 'Crypto wallet or exchange balance.',
  },
  {
    label: 'Custom',
    value: 'custom',
    icon: 'wallet-outline',
    description: 'Other account type.',
  },
];

const currencyOptions: Currency[] = ['IDR', 'USD', 'EUR'];

function parseAmount(value: string) {
  return Number(value.replace(/[^0-9.]/g, '') || 0);
}

export default function AddAccountScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const addAccount = useFinanceStore((state) => state.addAccount);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [initialBalance, setInitialBalance] = useState('');

  function handleSubmit() {
    const result = addAccount({
      name,
      type,
      currency,
      initialBalance: parseAmount(initialBalance),
    });

    if (!result.success) {
      Alert.alert('Finance OS Mobile', result.message);
      return;
    }

    Alert.alert('Finance OS Mobile', result.message);
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

          <AppText variant="title" style={styles.title}>
            Add Account
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
                      size={21}
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
                      style={[styles.optionDescription, selected && styles.optionDescriptionActive]}
                    >
                      {item.description}
                    </AppText>
                  </View>

                  <Radio selected={selected} colors={colors} />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Currency
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
        </View>

        <NumericAmountInput
          label="Initial Balance"
          value={initialBalance}
          onChangeText={setInitialBalance}
          placeholder="1000000"
          currency={currency}
          icon="wallet-outline"
          quickValues={currency === 'IDR' ? ['100000', '500000', '1000000'] : ['100', '500', '1000']}
          helperText="This value becomes the starting balance for the selected account currency."
        />

        <Pressable onPress={handleSubmit} style={styles.submitButton}>
          <AppText variant="body" style={styles.submitText}>
            Save Account
          </AppText>
        </Pressable>
      </View>
    </Screen>
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
    optionIcon: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionIconActive: {
      backgroundColor: 'rgba(0,0,0,0.08)',
      borderColor: 'rgba(0,0,0,0.12)',
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
    },
    submitText: {
      color: colors.black,
      fontWeight: '900',
    },
  });
}
