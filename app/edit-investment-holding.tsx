import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { NumericAmountInput } from '../src/components/ui/NumericAmountInput';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useAppToast } from '../src/components/ui/AppToast';
import { useFinanceStore } from '../src/stores/useFinanceStore';
import { Currency, InvestmentAssetType } from '../src/types/finance';

const currencies: Currency[] = ['IDR', 'USD', 'EUR'];

const assetTypes: {
  label: string;
  value: InvestmentAssetType;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { label: 'Stock', value: 'stock', icon: 'business-outline' },
  { label: 'Crypto', value: 'crypto', icon: 'logo-bitcoin' },
  { label: 'Fund', value: 'fund', icon: 'pie-chart-outline' },
  { label: 'ETF', value: 'etf', icon: 'layers-outline' },
  { label: 'Bond', value: 'bond', icon: 'shield-checkmark-outline' },
  { label: 'Other', value: 'other', icon: 'diamond-outline' },
];

function parseNumber(value: string) {
  const parsedValue = Number(value || 0);

  if (!Number.isFinite(parsedValue)) {
    return 0;
  }

  return parsedValue;
}

function formatInputNumber(value: number) {
  if (!Number.isFinite(value)) {
    return '';
  }

  return String(value);
}

export default function EditInvestmentHoldingScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const toast = useAppToast();
  const params = useLocalSearchParams<{ holdingId?: string }>();

  const accounts = useFinanceStore((state) => state.accounts);
  const investmentHoldings = useFinanceStore((state) => state.investmentHoldings);
  const investmentOrders = useFinanceStore((state) => state.investmentOrders);
  const updateInvestmentHolding = useFinanceStore(
    (state) => state.updateInvestmentHolding
  );

  const holding = investmentHoldings.find((item) => item.id === params.holdingId);
  const hasOrderHistory = investmentOrders.some(
    (order) => order.holdingId === holding?.id
  );

  const investmentAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          account.isActive &&
          (account.type === 'broker' || account.type === 'crypto_wallet')
      ),
    [accounts]
  );

  const [accountId, setAccountId] = useState('');
  const [assetType, setAssetType] = useState<InvestmentAssetType>('stock');
  const [currency, setCurrency] = useState<Currency>('IDR');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [averagePrice, setAveragePrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!holding) {
      return;
    }

    setAccountId(holding.accountId);
    setAssetType(holding.assetType);
    setCurrency(holding.currency);
    setName(holding.name);
    setSymbol(holding.symbol);
    setQuantity(formatInputNumber(holding.quantity));
    setAveragePrice(formatInputNumber(holding.averagePrice));
    setCurrentPrice(formatInputNumber(holding.currentPrice));
    setNote(holding.note || '');
  }, [holding?.id]);

  const selectedAccount = investmentAccounts.find((account) => account.id === accountId);

  function handleSubmit() {
    if (!holding) {
      toast.showWarning('Holding Missing', 'Investment holding not found.');
      return;
    }

    if (!selectedAccount) {
      toast.showWarning('Account Needed', 'Choose broker or crypto wallet account first.');
      return;
    }

    const result = updateInvestmentHolding({
      holdingId: holding.id,
      accountId: selectedAccount.id,
      name,
      symbol,
      assetType,
      quantity: parseNumber(quantity),
      averagePrice: parseNumber(averagePrice),
      currentPrice: parseNumber(currentPrice),
      currency,
      note,
    });

    if (!result.success) {
      toast.showError('Could Not Update Holding', result.message);
      return;
    }

    toast.showSuccess('Holding Updated', result.message);
    router.back();
  }

  if (!holding) {
    return (
      <Screen>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
          </Pressable>

          <View style={styles.headerText}>
            <AppText variant="caption" muted>
              Edit holding
            </AppText>

            <AppText variant="title">Not Found</AppText>
          </View>
        </View>

        <View style={styles.emptyCard}>
          <Ionicons name="alert-circle-outline" size={28} color={colors.textMuted} />

          <AppText variant="body" muted style={styles.emptyText}>
            This holding may have been deleted.
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
            Edit holding
          </AppText>

          <AppText variant="title">Manual Holding</AppText>
        </View>
      </View>

      {hasOrderHistory ? (
        <View style={styles.lockedCard}>
          <View style={styles.lockedIcon}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.black} />
          </View>

          <View style={styles.lockedTextBox}>
            <AppText variant="body" style={styles.lockedTitle}>
              Protected holding
            </AppText>

            <AppText variant="caption" muted style={styles.lockedDescription}>
              This holding has buy/sell history. Account, symbol, asset type, and currency are locked for data safety.
            </AppText>
          </View>
        </View>
      ) : null}

      <View style={styles.formCard}>
        <View style={styles.sectionMiniHeader}>
          <View>
            <AppText variant="caption" muted>
              Step 1
            </AppText>

            <AppText variant="subtitle" style={styles.sectionMiniTitle}>
              Account routing
            </AppText>
          </View>

          <AppText variant="caption" muted style={styles.sectionMiniHint}>
            Broker / Wallet
          </AppText>
        </View>

        <View style={styles.section}>
          <AppText variant="caption" muted style={styles.label}>
            Investment Account
          </AppText>

          <View style={styles.optionGrid}>
            {investmentAccounts.map((account) => {
              const active = account.id === accountId;

              return (
                <Pressable
                  key={account.id}
                  disabled={hasOrderHistory}
                  onPress={() => setAccountId(account.id)}
                  style={[
                    styles.optionChip,
                    active && styles.optionChipActive,
                    hasOrderHistory && styles.disabledOption,
                  ]}
                >
                  <Ionicons
                    name={
                      account.type === 'crypto_wallet'
                        ? 'logo-bitcoin'
                        : 'trending-up-outline'
                    }
                    size={17}
                    color={active ? colors.black : colors.text}
                  />

                  <View style={styles.optionTextBox}>
                    <AppText
                      variant="caption"
                      style={[styles.optionTitle, active && styles.optionTitleActive]}
                      numberOfLines={1}
                    >
                      {account.name}
                    </AppText>

                    <AppText
                      variant="caption"
                      style={[
                        styles.optionDescription,
                        active && styles.optionDescriptionActive,
                      ]}
                    >
                      {account.currency}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionMiniHeader}>
          <View>
            <AppText variant="caption" muted>
              Step 2
            </AppText>

            <AppText variant="subtitle" style={styles.sectionMiniTitle}>
              Asset identity
            </AppText>
          </View>

          <AppText variant="caption" muted style={styles.sectionMiniHint}>
            Type & symbol
          </AppText>
        </View>

        <View style={styles.section}>
          <AppText variant="caption" muted style={styles.label}>
            Asset Type
          </AppText>

          <View style={styles.optionGrid}>
            {assetTypes.map((item) => {
              const active = item.value === assetType;

              return (
                <Pressable
                  key={item.value}
                  disabled={hasOrderHistory}
                  onPress={() => setAssetType(item.value)}
                  style={[
                    styles.optionChip,
                    active && styles.optionChipActive,
                    hasOrderHistory && styles.disabledOption,
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={17}
                    color={active ? colors.black : colors.text}
                  />

                  <AppText
                    variant="caption"
                    style={[styles.optionTitle, active && styles.optionTitleActive]}
                  >
                    {item.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <AppText variant="caption" muted style={styles.label}>
            Asset Currency
          </AppText>

          <View style={styles.optionGrid}>
            {currencies.map((item) => {
              const active = item === currency;

              return (
                <Pressable
                  key={item}
                  disabled={hasOrderHistory}
                  onPress={() => setCurrency(item)}
                  style={[
                    styles.optionChip,
                    active && styles.optionChipActive,
                    hasOrderHistory && styles.disabledOption,
                  ]}
                >
                  <Ionicons
                    name="cash-outline"
                    size={17}
                    color={active ? colors.black : colors.text}
                  />

                  <AppText
                    variant="caption"
                    style={[styles.optionTitle, active && styles.optionTitleActive]}
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
            Asset Name
          </AppText>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Example: Bitcoin"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Symbol
          </AppText>

          <TextInput
            value={symbol}
            onChangeText={setSymbol}
            editable={!hasOrderHistory}
            placeholder="Example: BTC"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            style={[styles.input, hasOrderHistory && styles.disabledInput]}
          />
        </View>

        <View style={styles.sectionMiniHeader}>
          <View>
            <AppText variant="caption" muted>
              Step 3
            </AppText>

            <AppText variant="subtitle" style={styles.sectionMiniTitle}>
              Quantity & price
            </AppText>
          </View>

          <AppText variant="caption" muted style={styles.sectionMiniHint}>
            Valuation
          </AppText>
        </View>

        <NumericAmountInput
          label="Quantity"
          value={quantity}
          onChangeText={setQuantity}
          placeholder="0"
          icon="calculator-outline"
          quickValues={['1', '10', '100']}
          helperText="Edit this only for manual correction."
        />

        <NumericAmountInput
          label="Average Price"
          value={averagePrice}
          onChangeText={setAveragePrice}
          placeholder="0"
          currency={currency}
          icon="pricetag-outline"
          quickValues={currency === 'IDR' ? ['1000', '10000', '100000'] : ['1', '10', '100']}
          helperText="Average entry price per unit."
        />

        <NumericAmountInput
          label="Current Price"
          value={currentPrice}
          onChangeText={setCurrentPrice}
          placeholder="0"
          currency={currency}
          icon="pulse-outline"
          quickValues={currency === 'IDR' ? ['1000', '10000', '100000'] : ['1', '10', '100']}
          helperText="If changed, today's price history point will be updated."
        />

        <View style={styles.sectionMiniHeader}>
          <View>
            <AppText variant="caption" muted>
              Step 4
            </AppText>

            <AppText variant="subtitle" style={styles.sectionMiniTitle}>
              Note & save
            </AppText>
          </View>

          <AppText variant="caption" muted style={styles.sectionMiniHint}>
            Final
          </AppText>
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

        <Pressable onPress={handleSubmit} style={styles.submitButton}>
          <Ionicons name="checkmark-circle-outline" size={19} color={colors.black} />

          <AppText variant="body" style={styles.submitButtonText}>
            Save Changes
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
    lockedCard: {
      marginBottom: 16,
      borderRadius: 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      flexDirection: 'row',
      gap: 12,
    },
    lockedIcon: {
      width: 40,
      height: 40,
      borderRadius: 15,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
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
      marginTop: 4,
      lineHeight: 18,
    },
    formCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 28,
      padding: 16,
    },
    sectionMiniHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: 12,
      marginTop: 4,
      marginBottom: 12,
    },
    sectionMiniTitle: {
      marginTop: 3,
      color: colors.text,
    },
    sectionMiniHint: {
      fontWeight: '900',
    },
    section: {
      marginBottom: 18,
      gap: 10,
    },
    field: {
      marginBottom: 18,
      gap: 9,
    },
    label: {
      fontWeight: '900',
    },
    optionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    optionChip: {
      minHeight: 46,
      borderRadius: 17,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minWidth: '30%',
    },
    optionChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    disabledOption: {
      opacity: 0.58,
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
      marginTop: 2,
      color: colors.textMuted,
      fontSize: 10,
    },
    optionDescriptionActive: {
      color: 'rgba(0,0,0,0.62)',
    },
    input: {
      minHeight: 52,
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      color: colors.text,
      fontWeight: '800',
    },
    disabledInput: {
      opacity: 0.62,
    },
    noteInput: {
      minHeight: 96,
      paddingTop: 14,
      textAlignVertical: 'top',
    },
    submitButton: {
      minHeight: 56,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 18,
      marginTop: 6,
    },
    submitButtonText: {
      color: colors.black,
      fontWeight: '900',
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
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
