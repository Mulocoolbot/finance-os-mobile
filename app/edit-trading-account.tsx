import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import {
  TradingAccount,
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

function stringifyNumber(value: number) {
  if (!Number.isFinite(value)) {
    return '0';
  }

  return `${value}`;
}

function getRealAmount(accountType: TradingAccountType, value: string) {
  const rawValue = parseNumber(value);

  if (accountType === 'cent') {
    return rawValue / 100;
  }

  return rawValue;
}

export default function EditTradingAccountScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ tradingAccountId?: string }>();

  const accounts = useFinanceStore((state) => state.accounts);
  const tradingAccounts = useFinanceStore((state) => state.tradingAccounts);
  const updateTradingAccount = useFinanceStore((state) => state.updateTradingAccount);
  const deleteTradingAccount = useFinanceStore((state) => state.deleteTradingAccount);

  const tradingAccount = tradingAccounts.find(
    (account) => account.id === params.tradingAccountId
  );

  const brokerWalletAccounts = useMemo(() => {
    return accounts.filter(
      (account) =>
        account.isActive &&
        (account.type === 'broker' || account.type === 'custom' || account.type === 'bank')
    );
  }, [accounts]);

  const [name, setName] = useState(tradingAccount?.name || '');
  const [broker, setBroker] = useState(tradingAccount?.broker || '');
  const [server, setServer] = useState(tradingAccount?.server || '');
  const [accountNumber, setAccountNumber] = useState(tradingAccount?.accountNumber || '');
  const [linkedBrokerWalletAccountId, setLinkedBrokerWalletAccountId] = useState(
    tradingAccount?.linkedBrokerWalletAccountId || ''
  );
  const [platform, setPlatform] = useState<TradingPlatform>(tradingAccount?.platform || 'mt5');
  const [accountType, setAccountType] = useState<TradingAccountType>(
    tradingAccount?.accountType || 'standard'
  );
  const [leverage, setLeverage] = useState(stringifyNumber(tradingAccount?.leverage || 500));
  const [currency, setCurrency] = useState<Currency>(tradingAccount?.currency || 'USD');
  const [balance, setBalance] = useState(stringifyNumber(tradingAccount?.balance || 0));
  const [equity, setEquity] = useState(stringifyNumber(tradingAccount?.equity || 0));
  const [note, setNote] = useState(tradingAccount?.note || '');

  useEffect(() => {
    if (accountType === 'cent') {
      setCurrency('USD');
    }
  }, [accountType]);

  const realBalancePreview = useMemo(() => {
    return getRealAmount(accountType, balance);
  }, [accountType, balance]);

  const floatingPreview = useMemo(() => {
    const rawFloating = parseNumber(equity) - parseNumber(balance);

    if (accountType === 'cent') {
      return rawFloating / 100;
    }

    return rawFloating;
  }, [accountType, balance, equity]);

  if (!tradingAccount) {
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

            <AppText variant="title">Not Found</AppText>
          </View>
        </View>

        <View style={styles.emptyCard}>
          <Ionicons name="alert-circle-outline" size={30} color={colors.textMuted} />

          <AppText variant="body" muted style={styles.emptyDescription}>
            This trading account may have been deleted.
          </AppText>
        </View>
      </Screen>
    );
  }

  function handleSave() {
    if (!tradingAccount) return;

    const result = updateTradingAccount({
      tradingAccountId: tradingAccount.id,
      name,
      broker,
      server,
      accountNumber,
      linkedBrokerWalletAccountId: linkedBrokerWalletAccountId || null,
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

  function handleDelete() {
    if (!tradingAccount) return;

    Alert.alert(
      'Delete trading account?',
      'This will remove the trading account from Trading Journal. It will not delete the linked Broker Wallet account.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const result = deleteTradingAccount(tradingAccount.id);

            Alert.alert('Finance OS Mobile', result.message);

            if (result.success) {
              router.back();
            }
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
            Trading Journal
          </AppText>

          <AppText variant="title">Edit Trading Account</AppText>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoIcon}>
          <Ionicons name="link-outline" size={20} color={colors.black} />
        </View>

        <View style={styles.infoTextBox}>
          <AppText variant="body" style={styles.infoTitle}>
            Manage linked broker wallet
          </AppText>

          <AppText variant="caption" muted style={styles.infoDescription}>
            You can relink this trading account to another Broker Wallet or unlink it for now.
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
          items={[
            { label: 'Unlinked', value: '' },
            ...brokerWalletAccounts.map((account) => ({
              label: `${account.name} (${account.currency})`,
              value: account.id,
            })),
          ]}
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
          Save Changes
        </AppText>
      </Pressable>

      <Pressable onPress={handleDelete} style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={18} color={colors.white} />

        <AppText variant="body" style={styles.deleteButtonText}>
          Delete Trading Account
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
              key={item.value || 'unlinked'}
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
    emptyCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 22,
      alignItems: 'center',
    },
    emptyDescription: {
      marginTop: 10,
      textAlign: 'center',
      lineHeight: 21,
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
      marginBottom: 12,
    },
    saveButtonText: {
      color: colors.black,
      fontWeight: '900',
    },
    deleteButton: {
      minHeight: 56,
      borderRadius: 20,
      backgroundColor: colors.expense,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 9,
      paddingHorizontal: 18,
      marginBottom: 8,
    },
    deleteButtonText: {
      color: colors.white,
      fontWeight: '900',
    },
  });
}
