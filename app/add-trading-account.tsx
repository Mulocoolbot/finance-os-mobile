import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import {
  TradingAccountType,
  TradingPlatform,
  useFinanceStore,
} from '../src/stores/useFinanceStore';
import { Currency } from '../src/types/finance';

const platforms: { label: string; value: TradingPlatform }[] = [
  { label: 'MT4', value: 'mt4' },
  { label: 'MT5', value: 'mt5' },
];

const accountTypes: { label: string; value: TradingAccountType }[] = [
  { label: 'Cent', value: 'cent' },
  { label: 'Standard', value: 'standard' },
  { label: 'ECN', value: 'ecn' },
  { label: 'Demo', value: 'demo' },
  { label: 'Raw', value: 'raw' },
  { label: 'Unknown', value: 'unknown' },
];

const currencies: Currency[] = ['IDR', 'USD', 'EUR'];

function getCurrencyOptions(accountType: TradingAccountType): { label: string; value: Currency }[] {
  const availableCurrencies: Currency[] = accountType === 'cent' ? ['USD'] : currencies;

  return availableCurrencies.map((item) => ({
    label: item,
    value: item,
  }));
}

function parseNumber(value: string) {
  const normalizedValue = value.replace(/,/g, '.').trim();
  const numericValue = Number(normalizedValue);

  return Number.isFinite(numericValue) ? numericValue : 0;
}

export default function AddTradingAccountScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const addTradingAccount = useFinanceStore((state) => state.addTradingAccount);
  const accounts = useFinanceStore((state) => state.accounts);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);

  const [name, setName] = useState('');
  const [broker, setBroker] = useState('');
  const [server, setServer] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const brokerWalletAccounts = useMemo(() => {
    return accounts.filter(
      (account) =>
        account.isActive &&
        (account.type === 'broker' || account.type === 'custom' || account.type === 'bank')
    );
  }, [accounts]);
  const [linkedBrokerWalletAccountId, setLinkedBrokerWalletAccountId] = useState('');
  const [platform, setPlatform] = useState<TradingPlatform>('mt5');
  const [accountType, setAccountType] = useState<TradingAccountType>('standard');
  const [leverage, setLeverage] = useState('500');
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [balance, setBalance] = useState('0');
  const [equity, setEquity] = useState('0');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!linkedBrokerWalletAccountId && brokerWalletAccounts[0]?.id) {
      setLinkedBrokerWalletAccountId(brokerWalletAccounts[0].id);
    }
  }, [brokerWalletAccounts, linkedBrokerWalletAccountId]);

  useEffect(() => {
    if (accountType === 'cent') {
      setCurrency('USD');
    }
  }, [accountType]);

  const realBalancePreview = useMemo(() => {
    const rawBalance = parseNumber(balance);

    if (accountType === 'cent') {
      return rawBalance / 100;
    }

    return rawBalance;
  }, [accountType, balance]);

  const floatingPreview = useMemo(() => {
    const rawFloating = parseNumber(equity) - parseNumber(balance);

    if (accountType === 'cent') {
      return rawFloating / 100;
    }

    return rawFloating;
  }, [accountType, balance, equity]);

  function handleSave() {
    const result = addTradingAccount({
      name,
      broker,
      server,
      accountNumber,
      linkedBrokerWalletAccountId,
      platform,
      accountType,
      leverage: parseNumber(leverage),
      currency,
      balance: parseNumber(balance),
      equity: parseNumber(equity),
      note,
    });

    Alert.alert('Finance OS Mobile', result.message);

    if (result.success) {
      router.back();
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.headerText}>
          <AppText variant="caption" muted>
            Trading Journal
          </AppText>

          <AppText variant="title">Add Trading Account</AppText>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoIcon}>
          <Ionicons name="information-circle-outline" size={20} color={colors.black} />
        </View>

        <View style={styles.infoTextBox}>
          <AppText variant="body" style={styles.infoTitle}>
            Manual setup first
          </AppText>

          <AppText variant="caption" muted style={styles.infoDescription}>
            Later this data can be filled automatically from MT4/MT5 import or connector sync.
          </AppText>
        </View>
      </View>

      <View style={styles.formCard}>
        <TextField
          label="Account Name"
          value={name}
          onChangeText={setName}
          placeholder="Example: XM Gold Scalping"
          colors={colors}
        />

        <TextField
          label="Broker"
          value={broker}
          onChangeText={setBroker}
          placeholder="Example: Exness, FBS, XM"
          colors={colors}
        />

        <TextField
          label="Server"
          value={server}
          onChangeText={setServer}
          placeholder="Example: Exness-MT5Real12"
          colors={colors}
        />

        <TextField
          label="Account Number"
          value={accountNumber}
          onChangeText={setAccountNumber}
          placeholder="Example: 12345678"
          keyboardType="number-pad"
          colors={colors}
        />

        <ChipGroup
          label="Linked Broker Wallet"
          items={
            brokerWalletAccounts.length > 0
              ? brokerWalletAccounts.map((account) => ({
                  label: `${account.name} (${account.currency})`,
                  value: account.id,
                }))
              : [{ label: 'No broker wallet found', value: '' }]
          }
          value={linkedBrokerWalletAccountId}
          onChange={setLinkedBrokerWalletAccountId}
          colors={colors}
        />

        <ChipGroup
          label="Platform"
          items={platforms}
          value={platform}
          onChange={setPlatform}
          colors={colors}
        />

        <ChipGroup
          label="Account Type"
          items={accountTypes}
          value={accountType}
          onChange={setAccountType}
          colors={colors}
        />

        {accountType === 'cent' ? (
          <View style={styles.centInfoCard}>
            <Ionicons name="information-circle-outline" size={18} color={colors.text} />

            <AppText variant="caption" muted style={styles.centInfoText}>
              Cent account is locked to USD. Snapshot real value uses cent balance ÷ 100.
            </AppText>
          </View>
        ) : null}

        <ChipGroup
          label="Currency"
          items={getCurrencyOptions(accountType)}
          value={currency}
          onChange={setCurrency}
          colors={colors}
        />

        <TextField
          label="Leverage"
          value={leverage}
          onChangeText={setLeverage}
          placeholder="Example: 500"
          keyboardType="decimal-pad"
          prefix="1:"
          colors={colors}
        />

        <TextField
          label="Balance"
          value={balance}
          onChangeText={setBalance}
          placeholder="0"
          keyboardType="decimal-pad"
          colors={colors}
        />

        <TextField
          label="Equity"
          value={equity}
          onChangeText={setEquity}
          placeholder="0"
          keyboardType="decimal-pad"
          colors={colors}
        />

        <View style={styles.previewCard}>
          <AppText variant="caption" muted>
            Real Balance Preview
          </AppText>

          <AppText variant="subtitle" style={styles.previewValue}>
            {realBalancePreview.toLocaleString('en-US', {
              maximumFractionDigits: 2,
            })}{' '}
            {currency}
          </AppText>

          <AppText variant="caption" muted style={styles.previewSubLabel}>
            Floating P/L Preview
          </AppText>

          <AppText
            variant="body"
            style={[styles.previewValue, { color: floatingPreview >= 0 ? colors.income : colors.expense }]}
          >
            {floatingPreview.toLocaleString('en-US', {
              maximumFractionDigits: 2,
            })}{' '}
            {currency}
          </AppText>
        </View>

        <TextField
          label="Note"
          value={note}
          onChangeText={setNote}
          placeholder="Strategy, broker note, or account purpose"
          multiline
          colors={colors}
        />
      </View>

      <Pressable onPress={handleSave} style={styles.saveButton}>
        <Ionicons name="save-outline" size={18} color={colors.black} />

        <AppText variant="body" style={styles.saveButtonText}>
          Save Trading Account
        </AppText>
      </Pressable>
    </Screen>
  );
}

function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline = false,
  prefix,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  multiline?: boolean;
  prefix?: string;
  colors: ThemeColors;
}) {
  const styles = createStyles(colors);

  return (
    <View style={styles.field}>
      <AppText variant="caption" muted style={styles.label}>
        {label}
      </AppText>

      <View style={[styles.inputBox, multiline ? styles.inputBoxMultiline : null]}>
        {prefix ? (
          <AppText variant="body" style={styles.inputPrefix}>
            {prefix}
          </AppText>
        ) : null}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType || 'default'}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={[styles.input, multiline ? styles.inputMultiline : null]}
        />
      </View>
    </View>
  );
}

function ChipGroup<T extends string>({
  label,
  items,
  value,
  onChange,
  colors,
}: {
  label: string;
  items: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  colors: ThemeColors;
}) {
  const styles = createStyles(colors);

  return (
    <View style={styles.field}>
      <AppText variant="caption" muted style={styles.label}>
        {label}
      </AppText>

      <View style={styles.chipRow}>
        {items.map((item) => {
          const active = item.value === value;

          return (
            <Pressable
              key={item.value}
              onPress={() => onChange(item.value)}
              style={[styles.chip, active ? styles.chipActive : null]}
            >
              <AppText
                variant="caption"
                style={[styles.chipText, active ? styles.chipTextActive : null]}
              >
                {item.label}
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
      gap: 15,
      marginBottom: 16,
    },
    field: {
      gap: 8,
    },
    label: {
      fontWeight: '900',
    },
    inputBox: {
      minHeight: 52,
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    inputBoxMultiline: {
      minHeight: 96,
      alignItems: 'flex-start',
      paddingTop: 12,
    },
    inputPrefix: {
      color: colors.text,
      fontWeight: '900',
    },
    input: {
      flex: 1,
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
      paddingVertical: 10,
      outlineStyle: 'none' as any,
    },
    inputMultiline: {
      minHeight: 72,
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
    centInfoCard: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 12,
      flexDirection: 'row',
      gap: 9,
      alignItems: 'flex-start',
    },
    centInfoText: {
      flex: 1,
      lineHeight: 18,
    },
    previewCard: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 13,
      gap: 5,
    },
    previewSubLabel: {
      marginTop: 8,
    },
    previewValue: {
      fontWeight: '900',
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
