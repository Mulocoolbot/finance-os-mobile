import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { NumericAmountInput } from '../src/components/ui/NumericAmountInput';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { fetchInvestmentPriceForHolding, isPriceSyncSupportedHolding } from '../src/services/investmentPriceSync';
import { useFinanceStore } from '../src/stores/useFinanceStore';
import { Currency, InvestmentAssetType, InvestmentHolding } from '../src/types/finance';

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

function isCurrency(value: unknown): value is Currency {
  return value === 'IDR' || value === 'USD' || value === 'EUR';
}

function isInvestmentAssetType(value: unknown): value is InvestmentAssetType {
  return (
    value === 'stock' ||
    value === 'crypto' ||
    value === 'fund' ||
    value === 'etf' ||
    value === 'bond' ||
    value === 'other'
  );
}

export default function AddInvestmentHoldingScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const pickedAsset = useLocalSearchParams<{
    pickedName?: string;
    pickedSymbol?: string;
    pickedAssetType?: string;
    pickedCurrency?: string;
  }>();

  const accounts = useFinanceStore((state) => state.accounts);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);
  const exchangeRates = useFinanceStore((state) => state.exchangeRates);
  const addInvestmentHolding = useFinanceStore((state) => state.addInvestmentHolding);

  const investmentAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          account.isActive &&
          (account.type === 'broker' || account.type === 'crypto_wallet')
      ),
    [accounts]
  );

  const [accountId, setAccountId] = useState(investmentAccounts[0]?.id || '');
  const [assetType, setAssetType] = useState<InvestmentAssetType>('stock');
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [averagePrice, setAveragePrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [isFetchingCurrentPrice, setIsFetchingCurrentPrice] = useState(false);
  const [currentPriceStatus, setCurrentPriceStatus] = useState(
    'Input or pick an asset. Current price will be detected automatically when available.'
  );
  const [currentPriceProvider, setCurrentPriceProvider] = useState('');
  const [note, setNote] = useState('');

  const selectedAccount = investmentAccounts.find((account) => account.id === accountId);

  useEffect(() => {
    if (typeof pickedAsset.pickedName === 'string' && pickedAsset.pickedName.trim()) {
      setName(pickedAsset.pickedName);
    }

    if (typeof pickedAsset.pickedSymbol === 'string' && pickedAsset.pickedSymbol.trim()) {
      setSymbol(pickedAsset.pickedSymbol.toUpperCase());
    }

    if (isInvestmentAssetType(pickedAsset.pickedAssetType)) {
      setAssetType(pickedAsset.pickedAssetType);
    }

    if (isCurrency(pickedAsset.pickedCurrency)) {
      setCurrency(pickedAsset.pickedCurrency);
    }
  }, [
    pickedAsset.pickedName,
    pickedAsset.pickedSymbol,
    pickedAsset.pickedAssetType,
    pickedAsset.pickedCurrency,
  ]);

  function handleOpenAssetPicker() {
    router.push({
      pathname: '/investment-asset-picker',
      params: {
        assetType,
        currency,
      },
    });
  }

  function buildPreviewHolding(): InvestmentHolding {
    const now = new Date().toISOString();
    const normalizedSymbol = symbol.trim().toUpperCase();

    return {
      id: 'manual-holding-preview',
      accountId: selectedAccount?.id || 'manual-account-preview',
      name: name.trim() || normalizedSymbol || 'Manual Asset',
      symbol: normalizedSymbol,
      assetType,
      quantity: parseNumber(quantity),
      averagePrice: parseNumber(averagePrice),
      currentPrice: parseNumber(currentPrice),
      currency,
      note: note.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
  }


  useEffect(() => {
    const normalizedSymbol = symbol.trim().toUpperCase();

    if (!selectedAccount || !normalizedSymbol) {
      setIsFetchingCurrentPrice(false);
      setCurrentPriceProvider('');
      setCurrentPriceStatus(
        'Input or pick an asset. Current price will be detected automatically when available.'
      );
      return;
    }

    const previewHolding = buildPreviewHolding();

    if (!isPriceSyncSupportedHolding(previewHolding)) {
      setIsFetchingCurrentPrice(false);
      setCurrentPriceProvider('');
      setCurrentPriceStatus(
        'Realtime current price is not available for this asset type. Please input price manually.'
      );
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setIsFetchingCurrentPrice(true);
      setCurrentPriceStatus('Detecting actual current price...');

      try {
        const result = await fetchInvestmentPriceForHolding(previewHolding, exchangeRates);

        if (cancelled) {
          return;
        }

        setCurrentPrice(String(result.currentPrice));
        setCurrentPriceProvider(result.provider);
        setCurrentPriceStatus(`Actual current price detected from ${result.provider}.`);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setCurrentPriceProvider('');
        setCurrentPriceStatus(
          error instanceof Error
            ? `${error.message} You can still input it manually.`
            : 'Unable to detect current price. You can still input it manually.'
        );
      } finally {
        if (!cancelled) {
          setIsFetchingCurrentPrice(false);
        }
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [
    selectedAccount?.id,
    name,
    symbol,
    assetType,
    currency,
    exchangeRates,
  ]);

  function handleSubmit() {
    if (!selectedAccount) {
      Alert.alert('Finance OS Mobile', 'Create a broker or crypto wallet account first.');
      return;
    }

    const result = addInvestmentHolding({
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
            Portfolio asset
          </AppText>

          <AppText variant="title">Add Holding</AppText>
        </View>
      </View>

      {investmentAccounts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="wallet-outline" size={28} color={colors.textMuted} />

          <AppText variant="subtitle" style={styles.emptyTitle}>
            No investment account
          </AppText>

          <AppText variant="body" muted style={styles.emptyText}>
            Create an account with type Broker or Crypto Wallet before adding holdings.
          </AppText>

          <Pressable onPress={() => router.push('/add-account')} style={styles.submitButton}>
            <AppText variant="body" style={styles.submitButtonText}>
              Add Account
            </AppText>
          </Pressable>
        </View>
      ) : (
        <>
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
                    onPress={() => setAccountId(account.id)}
                    style={[styles.optionChip, active && styles.optionChipActive]}
                  >
                    <Ionicons
                      name={account.type === 'crypto_wallet' ? 'logo-bitcoin' : 'trending-up-outline'}
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
                    onPress={() => setAssetType(item.value)}
                    style={[styles.optionChip, active && styles.optionChipActive]}
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

          <View style={styles.pickerCard}>
            <View style={styles.pickerIcon}>
              <Ionicons name="search-outline" size={19} color={colors.text} />
            </View>

            <View style={styles.pickerTextBox}>
              <AppText variant="body" style={styles.pickerTitle}>
                Search Asset
              </AppText>

              <AppText variant="caption" muted style={styles.pickerDescription}>
                Search crypto, stock, ETF, or fund from remote provider. Manual input stays available.
              </AppText>
            </View>

            <Pressable onPress={handleOpenAssetPicker} style={styles.pickerButton}>
              <Ionicons name="open-outline" size={17} color={colors.black} />
            </Pressable>
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
                    onPress={() => setCurrency(item)}
                    style={[styles.optionChip, active && styles.optionChipActive]}
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

            <AppText variant="caption" muted>
              Price currency for this asset. It can be different from the account currency.
            </AppText>
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
              placeholder="Example: BTC"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              style={styles.input}
            />
          </View>

          <NumericAmountInput
            label="Quantity"
            value={quantity}
            onChangeText={setQuantity}
            placeholder="0"
            icon="calculator-outline"
            quickValues={['1', '10', '100']}
            helperText="Use decimal quantity for crypto or fractional assets."
          />

          <NumericAmountInput
            label="Average Price"
            value={averagePrice}
            onChangeText={setAveragePrice}
            placeholder="0"
            currency={currency}
            icon="pricetag-outline"
            quickValues={currency === 'IDR' ? ['1000', '10000', '100000'] : ['1', '10', '100']}
            helperText="Your original average entry price per unit. Current market price can be fetched below."
          />

          <View style={styles.currentPriceCard}>
            <View style={styles.currentPriceHeader}>
              <View style={styles.currentPriceIcon}>
                <Ionicons
                  name={
                    isFetchingCurrentPrice
                      ? 'sync-outline'
                      : currentPriceProvider
                        ? 'flash-outline'
                        : 'create-outline'
                  }
                  size={18}
                  color={currentPriceProvider ? colors.black : colors.text}
                />
              </View>

              <View style={styles.currentPriceTitleBox}>
                <AppText variant="caption" muted>
                  Current Price
                </AppText>

                <AppText variant="body" style={styles.currentPriceTitle}>
                  {isFetchingCurrentPrice
                    ? 'Detecting price...'
                    : currentPriceProvider
                      ? 'Realtime price detected'
                      : 'Manual fallback available'}
                </AppText>
              </View>
            </View>

            <NumericAmountInput
              label="Current Price"
              value={currentPrice}
              onChangeText={setCurrentPrice}
              placeholder="0"
              currency={currency}
              icon="pulse-outline"
              quickValues={currency === 'IDR' ? ['1000', '10000', '100000'] : ['1', '10', '100']}
              helperText="Auto-filled when supported. You can edit manually if unavailable."
              previewLabel="Current Market Price"
              allowDecimal
            />

            <AppText variant="caption" muted style={styles.currentPriceStatus}>
              {currentPriceStatus}
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
            <AppText variant="body" style={styles.submitButtonText}>
              Save Holding
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
    currentPriceCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 14,
      gap: 12,
    },
    currentPriceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    currentPriceIcon: {
      width: 42,
      height: 42,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    currentPriceTitleBox: {
      flex: 1,
      minWidth: 0,
    },
    currentPriceTitle: {
      marginTop: 3,
      color: colors.text,
      fontWeight: '900',
    },
    currentPriceStatus: {
      lineHeight: 18,
    },
    disabledButton: {
      opacity: 0.45,
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
    pickerCard: {
      marginBottom: 18,
      borderRadius: 22,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    pickerIcon: {
      width: 42,
      height: 42,
      borderRadius: 15,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pickerTextBox: {
      flex: 1,
      minWidth: 0,
    },
    pickerTitle: {
      fontWeight: '900',
      color: colors.text,
    },
    pickerDescription: {
      marginTop: 4,
      lineHeight: 18,
    },
    pickerButton: {
      width: 42,
      height: 42,
      borderRadius: 15,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    input: {
      minHeight: 56,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      paddingHorizontal: 15,
      paddingVertical: 12,
      fontSize: 15,
      fontWeight: '800',
    },
    noteInput: {
      minHeight: 92,
      textAlignVertical: 'top',
    },
    optionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 9,
    },
    optionChip: {
      minHeight: 54,
      borderRadius: 17,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 13,
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
    submitButton: {
      minHeight: 56,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
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
    emptyTitle: {
      marginTop: 14,
      textAlign: 'center',
    },
    emptyText: {
      marginTop: 8,
      textAlign: 'center',
      lineHeight: 21,
    },
  });
}
