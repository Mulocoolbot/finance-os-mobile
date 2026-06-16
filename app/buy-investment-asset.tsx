import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { NumericAmountInput } from '../src/components/ui/NumericAmountInput';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { fetchInvestmentPriceForHolding } from '../src/services/investmentPriceSync';
import { useFinanceStore } from '../src/stores/useFinanceStore';
import { Currency, InvestmentAssetType, InvestmentHolding } from '../src/types/finance';
import { formatCurrency } from '../src/utils/currency';
import { convertCurrencyAmount } from '../src/utils/currencyConversion';
import { formatCompactCurrency } from '../src/utils/formatCompactCurrency';

const assetTypes: { label: string; value: InvestmentAssetType; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Crypto', value: 'crypto', icon: 'logo-bitcoin' },
  { label: 'Stock', value: 'stock', icon: 'business-outline' },
  { label: 'ETF', value: 'etf', icon: 'layers-outline' },
  { label: 'Fund', value: 'fund', icon: 'pie-chart-outline' },
  { label: 'Bond', value: 'bond', icon: 'shield-checkmark-outline' },
  { label: 'Other', value: 'other', icon: 'diamond-outline' },
];

const currencyOptions: Currency[] = ['IDR', 'USD', 'EUR'];

function parseAmount(value: string) {
  return Number(value.replace(/[^0-9.]/g, '') || 0);
}

function makeTempHolding({
  accountId,
  name,
  symbol,
  assetType,
  price,
  currency,
}: {
  accountId: string;
  name: string;
  symbol: string;
  assetType: InvestmentAssetType;
  price: number;
  currency: Currency;
}): InvestmentHolding {
  const now = new Date().toISOString();

  return {
    id: 'temp-buy-asset',
    accountId,
    name: name || symbol,
    symbol,
    assetType,
    quantity: 0,
    averagePrice: price || 0,
    currentPrice: price || 0,
    currency,
    createdAt: now,
    updatedAt: now,
  };
}

export default function BuyInvestmentAssetScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{
    pickedName?: string;
    pickedSymbol?: string;
    pickedAssetType?: InvestmentAssetType;
    pickedCurrency?: Currency;
    pickedProvider?: string;
  }>();

  const accounts = useFinanceStore((state) => state.accounts);
  const investmentHoldings = useFinanceStore((state) => state.investmentHoldings);
  const exchangeRates = useFinanceStore((state) => state.exchangeRates);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);
  const buyInvestmentAsset = useFinanceStore((state) => state.buyInvestmentAsset);

  const investmentAccounts = useMemo(() => {
    return accounts.filter(
      (account) =>
        account.isActive &&
        ['broker', 'crypto_wallet', 'bank', 'e_wallet', 'cash', 'custom'].includes(account.type)
    );
  }, [accounts]);

  const [accountId, setAccountId] = useState(investmentAccounts[0]?.id || '');
  const [name, setName] = useState(params.pickedName || '');
  const [symbol, setSymbol] = useState(params.pickedSymbol || '');
  const [assetType, setAssetType] = useState<InvestmentAssetType>(
    params.pickedAssetType || 'crypto'
  );
  const [currency, setCurrency] = useState<Currency>(params.pickedCurrency || defaultCurrency);
  const [buyMode, setBuyMode] = useState<'amount' | 'quantity'>('amount');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [fee, setFee] = useState('0');
  const [note, setNote] = useState('');
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [priceStatus, setPriceStatus] = useState('Pick an asset, then fetch live price or input buy price manually.');
  const [priceProvider, setPriceProvider] = useState(params.pickedProvider || '');

  useEffect(() => {
    if (params.pickedName) setName(params.pickedName);
    if (params.pickedSymbol) setSymbol(params.pickedSymbol.toUpperCase());
    if (params.pickedAssetType) setAssetType(params.pickedAssetType);
    if (params.pickedCurrency) setCurrency(params.pickedCurrency);
    if (params.pickedProvider) setPriceProvider(params.pickedProvider);
  }, [
    params.pickedName,
    params.pickedSymbol,
    params.pickedAssetType,
    params.pickedCurrency,
    params.pickedProvider,
  ]);

  const selectedAccount = investmentAccounts.find((account) => account.id === accountId);
  const parsedInvestmentAmount = parseAmount(investmentAmount);
  const parsedInputQuantity = parseAmount(quantity);
  const parsedPrice = parseAmount(price);
  const parsedFee = parseAmount(fee);
  const parsedQuantity =
    buyMode === 'amount'
      ? parsedPrice > 0
        ? parsedInvestmentAmount / parsedPrice
        : 0
      : parsedInputQuantity;
  const grossAmount =
    buyMode === 'amount' ? parsedInvestmentAmount : parsedQuantity * parsedPrice;
  const totalAmount = grossAmount + parsedFee;
  const accountImpact = selectedAccount
    ? convertCurrencyAmount(totalAmount, currency, selectedAccount.currency, exchangeRates)
    : 0;
  const existingHolding = investmentHoldings.find((holding) => {
    return (
      Boolean(selectedAccount) &&
      holding.accountId === selectedAccount?.id &&
      holding.symbol.toUpperCase() === symbol.trim().toUpperCase() &&
      holding.assetType === assetType &&
      holding.currency === currency
    );
  });
  const nextQuantity = (existingHolding?.quantity || 0) + parsedQuantity;
  const nextAveragePrice =
    nextQuantity > 0
      ? ((existingHolding?.quantity || 0) * (existingHolding?.averagePrice || 0) +
          totalAmount) /
        nextQuantity
      : parsedPrice;
  const canSubmit =
    Boolean(selectedAccount) &&
    name.trim().length > 0 &&
    symbol.trim().length > 0 &&
    parsedQuantity > 0 &&
    parsedPrice > 0 &&
    grossAmount > 0 &&
    parsedFee >= 0;

  async function handleFetchPrice() {
    if (!selectedAccount) {
      Alert.alert('Finance OS Mobile', 'Choose an account first.');
      return;
    }

    const normalizedSymbol = symbol.trim().toUpperCase();

    if (!normalizedSymbol) {
      Alert.alert('Finance OS Mobile', 'Input or pick asset symbol first.');
      return;
    }

    setIsFetchingPrice(true);
    setPriceStatus('Fetching live price...');

    try {
      const tempHolding = makeTempHolding({
        accountId: selectedAccount.id,
        name: name.trim() || normalizedSymbol,
        symbol: normalizedSymbol,
        assetType,
        price: parsedPrice || 0,
        currency,
      });
      const result = await fetchInvestmentPriceForHolding(tempHolding, exchangeRates);

      setPrice(String(result.currentPrice));
      setPriceProvider(result.provider);
      setPriceStatus(`Live price loaded from ${result.provider}.`);
    } catch (error) {
      setPriceStatus(
        error instanceof Error
          ? error.message
          : 'Unable to fetch live price. You can input buy price manually.'
      );
    } finally {
      setIsFetchingPrice(false);
    }
  }

  function handleSubmit() {
    if (!canSubmit || !selectedAccount) {
      Alert.alert('Check Buy Order', 'Please complete account, asset, quantity, and buy price.');
      return;
    }

    const result = buyInvestmentAsset({
      accountId: selectedAccount.id,
      name,
      symbol,
      assetType,
      quantity: parsedQuantity,
      price: parsedPrice,
      fee: parsedFee,
      currency,
      note,
      provider: priceProvider || undefined,
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
            Investments
          </AppText>

          <AppText variant="title">Buy Asset</AppText>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={21} color={colors.investment} />

        <AppText variant="caption" muted style={styles.infoText}>
          Buy asset creates a holding automatically. Entry price, buy order, and price history are saved together.
        </AppText>
      </View>

      <View style={styles.field}>
        <AppText variant="caption" muted style={styles.label}>
          Account
        </AppText>

        <View style={styles.optionList}>
          {investmentAccounts.map((account) => {
            const selected = account.id === accountId;

            return (
              <Pressable
                key={account.id}
                onPress={() => setAccountId(account.id)}
                style={[styles.optionCard, selected && styles.optionCardActive]}
              >
                <View style={[styles.optionIcon, selected && styles.optionIconActive]}>
                  <Ionicons
                    name="wallet-outline"
                    size={18}
                    color={selected ? colors.black : colors.text}
                  />
                </View>

                <View style={styles.optionTextBox}>
                  <AppText
                    variant="body"
                    style={[styles.optionTitle, selected && styles.optionTitleActive]}
                    numberOfLines={1}
                  >
                    {account.name}
                  </AppText>

                  <AppText variant="caption" muted={!selected} numberOfLines={1}>
                    {account.currency} • {formatCompactCurrency(account.balance, account.currency)}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.assetCard}>
        <View style={styles.assetCardHeader}>
          <View style={styles.assetCardTitleBox}>
            <AppText variant="caption" muted>
              Asset
            </AppText>

            <AppText variant="subtitle" style={styles.assetTitle} numberOfLines={1}>
              {symbol.trim() || 'No asset selected'}
            </AppText>
          </View>

          <Pressable
            onPress={() =>
              router.push({
                pathname: '/investment-asset-picker',
                params: {
                  assetType,
                  returnTo: 'buy-investment-asset',
                },
              })
            }
            style={styles.searchButton}
          >
            <Ionicons name="search-outline" size={16} color={colors.black} />

            <AppText variant="caption" style={styles.searchButtonText}>
              Search
            </AppText>
          </Pressable>
        </View>

        <View style={styles.fieldInner}>
          <AppText variant="caption" muted style={styles.label}>
            Asset Type
          </AppText>

          <View style={styles.typeGrid}>
            {assetTypes.map((item) => {
              const selected = item.value === assetType;

              return (
                <Pressable
                  key={item.value}
                  onPress={() => setAssetType(item.value)}
                  style={[styles.typeChip, selected && styles.typeChipActive]}
                >
                  <Ionicons
                    name={item.icon}
                    size={15}
                    color={selected ? colors.black : colors.text}
                  />

                  <AppText
                    variant="caption"
                    style={[styles.typeChipText, selected && styles.typeChipTextActive]}
                  >
                    {item.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.inputGrid}>
          <View style={styles.inputHalf}>
            <AppText variant="caption" muted style={styles.label}>
              Name
            </AppText>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Bitcoin"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>

          <View style={styles.inputHalf}>
            <AppText variant="caption" muted style={styles.label}>
              Symbol
            </AppText>

            <TextInput
              value={symbol}
              onChangeText={(value) => setSymbol(value.toUpperCase())}
              placeholder="BTC"
              autoCapitalize="characters"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.fieldInner}>
          <AppText variant="caption" muted style={styles.label}>
            Currency
          </AppText>

          <View style={styles.currencyRow}>
            {currencyOptions.map((item) => {
              const selected = item === currency;

              return (
                <Pressable
                  key={item}
                  onPress={() => setCurrency(item)}
                  style={[styles.currencyChip, selected && styles.currencyChipActive]}
                >
                  <AppText
                    variant="caption"
                    style={[styles.currencyChipText, selected && styles.currencyChipTextActive]}
                  >
                    {item}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          onPress={handleFetchPrice}
          disabled={isFetchingPrice}
          style={[styles.fetchPriceButton, isFetchingPrice && styles.disabledButton]}
        >
          <Ionicons name="cloud-download-outline" size={17} color={colors.black} />

          <AppText variant="body" style={styles.fetchPriceButtonText}>
            {isFetchingPrice ? 'Fetching Price...' : 'Use Live Price'}
          </AppText>
        </Pressable>

        <AppText variant="caption" muted style={styles.statusText}>
          {priceStatus}
        </AppText>
      </View>

      <View style={styles.modeCard}>
        <AppText variant="caption" muted style={styles.label}>
          Buy Mode
        </AppText>

        <View style={styles.modeRow}>
          <Pressable
            onPress={() => setBuyMode('amount')}
            style={[styles.modeChip, buyMode === 'amount' && styles.modeChipActive]}
          >
            <Ionicons
              name="cash-outline"
              size={16}
              color={buyMode === 'amount' ? colors.black : colors.text}
            />

            <AppText
              variant="caption"
              style={[styles.modeChipText, buyMode === 'amount' && styles.modeChipTextActive]}
            >
              By Amount
            </AppText>
          </Pressable>

          <Pressable
            onPress={() => setBuyMode('quantity')}
            style={[styles.modeChip, buyMode === 'quantity' && styles.modeChipActive]}
          >
            <Ionicons
              name="layers-outline"
              size={16}
              color={buyMode === 'quantity' ? colors.black : colors.text}
            />

            <AppText
              variant="caption"
              style={[styles.modeChipText, buyMode === 'quantity' && styles.modeChipTextActive]}
            >
              By Quantity
            </AppText>
          </Pressable>
        </View>

        <AppText variant="caption" muted style={styles.modeDescription}>
          {buyMode === 'amount'
            ? 'Input how much money you want to spend. Quantity is calculated from buy price.'
            : 'Input exact quantity. Total cost is calculated from quantity × buy price.'}
        </AppText>
      </View>

      {buyMode === 'amount' ? (
        <NumericAmountInput
          label="Investment Amount"
          value={investmentAmount}
          onChangeText={setInvestmentAmount}
          placeholder="0"
          currency={currency}
          icon="cash-outline"
          quickValues={
            currency === 'IDR'
              ? ['50000', '100000', '500000', '1000000']
              : ['10', '50', '100', '500']
          }
          helperText="Amount of money used to buy this asset, before fee."
          previewLabel="Investment Amount"
          allowDecimal
        />
      ) : (
        <View style={styles.quantityCard}>
          <View style={styles.quantityHeader}>
            <View style={styles.quantityIcon}>
              <Ionicons name="layers-outline" size={18} color={colors.text} />
            </View>

            <View style={styles.quantityTitleBox}>
              <AppText variant="caption" muted>
                Quantity
              </AppText>

              <AppText variant="body" style={styles.quantityAssetLabel} numberOfLines={1}>
                {symbol.trim() || 'Asset'} units
              </AppText>
            </View>
          </View>

          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            style={styles.quantityInput}
          />

          <View style={styles.quantityQuickRow}>
            {['0.001', '0.01', '0.1', '1'].map((item) => (
              <Pressable
                key={item}
                onPress={() => setQuantity(item)}
                style={styles.quantityQuickChip}
              >
                <AppText variant="caption" style={styles.quantityQuickText}>
                  {item}
                </AppText>
              </Pressable>
            ))}
          </View>

          <View style={styles.quantityPreview}>
            <AppText variant="caption" muted>
              Buy Quantity
            </AppText>

            <AppText variant="subtitle" style={styles.quantityPreviewValue} numberOfLines={1}>
              {quantity || '0'} {symbol.trim() || 'unit'}
            </AppText>
          </View>

          <AppText variant="caption" muted style={styles.quantityHelper}>
            Input exact asset unit amount. This field is not money/currency.
          </AppText>
        </View>
      )}

      <NumericAmountInput
        label="Buy Price"
        value={price}
        onChangeText={setPrice}
        placeholder="0"
        currency={currency}
        icon="pricetag-outline"
        quickValues={
          currency === 'IDR'
            ? ['1000', '10000', '100000', '1000000']
            : ['1', '10', '100', '1000']
        }
        helperText="This becomes your entry price. Live price can be fetched above."
        previewLabel="Entry Price"
        allowDecimal
      />

      <NumericAmountInput
        label="Fee"
        value={fee}
        onChangeText={setFee}
        placeholder="0"
        currency={currency}
        icon="receipt-outline"
        quickValues={currency === 'IDR' ? ['0', '1000', '5000'] : ['0', '1', '5']}
        helperText="Broker/exchange fee. Use 0 if there is no fee."
        previewLabel="Order Fee"
        allowDecimal
      />

      <View style={styles.previewCard}>
        <View style={styles.previewHeader}>
          <View style={styles.previewTitleBox}>
            <AppText variant="caption" muted>
              Buy Preview
            </AppText>

            <AppText variant="title" style={styles.previewValue} numberOfLines={1}>
              {formatCurrency(totalAmount, currency)}
            </AppText>
          </View>

          <View style={styles.previewBadge}>
            <AppText variant="caption" style={styles.previewBadgeText}>
              {existingHolding ? 'Add Position' : 'New Holding'}
            </AppText>
          </View>
        </View>

        <View style={styles.previewGrid}>
          <PreviewItem
            colors={colors}
            label={buyMode === 'amount' ? 'Amount Used' : 'Gross'}
            value={formatCurrency(grossAmount, currency)}
          />
          <PreviewItem
            colors={colors}
            label="Account Impact"
            value={
              selectedAccount
                ? `-${formatCurrency(accountImpact, selectedAccount.currency)}`
                : '-'
            }
          />
          <PreviewItem
            colors={colors}
            label={buyMode === 'amount' ? 'Auto Qty' : 'Next Qty'}
            value={String(Number.isFinite(nextQuantity) ? nextQuantity : 0)}
          />
          <PreviewItem
            colors={colors}
            label="Auto Avg Price"
            value={formatCurrency(nextAveragePrice || 0, currency)}
          />
        </View>

        <AppText variant="caption" muted style={styles.avgExplanation}>
          Avg price is calculated automatically from total buy cost divided by total quantity.
        </AppText>
      </View>

      <View style={styles.field}>
        <AppText variant="caption" muted style={styles.label}>
          Note
        </AppText>

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Optional buy note"
          placeholderTextColor={colors.textMuted}
          multiline
          style={[styles.input, styles.noteInput]}
        />
      </View>

      <Pressable
        onPress={handleSubmit}
        disabled={!canSubmit}
        style={[styles.submitButton, !canSubmit && styles.disabledButton]}
      >
        <AppText variant="body" style={styles.submitButtonText}>
          Buy Asset
        </AppText>
      </Pressable>
    </Screen>
  );
}

function PreviewItem({
  colors,
  label,
  value,
}: {
  colors: ThemeColors;
  label: string;
  value: string;
}) {
  const styles = createStyles(colors);

  return (
    <View style={styles.previewItem}>
      <AppText variant="caption" muted>
        {label}
      </AppText>

      <AppText variant="caption" style={styles.previewItemValue} numberOfLines={1}>
        {value}
      </AppText>
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
      borderRadius: 20,
      padding: 13,
      flexDirection: 'row',
      gap: 10,
      marginBottom: 18,
    },
    infoText: {
      flex: 1,
      lineHeight: 18,
    },
    field: {
      gap: 9,
      marginBottom: 18,
    },
    fieldInner: {
      gap: 9,
    },
    label: {
      fontWeight: '900',
    },
    optionList: {
      gap: 10,
    },
    optionCard: {
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
    },
    optionCardActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    optionIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
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
      marginBottom: 3,
    },
    optionTitleActive: {
      color: colors.black,
    },
    assetCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 15,
      gap: 14,
      marginBottom: 18,
    },
    modeCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 14,
      gap: 11,
      marginBottom: 18,
    },
    modeRow: {
      flexDirection: 'row',
      gap: 10,
    },
    modeChip: {
      flex: 1,
      minHeight: 44,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: 10,
    },
    modeChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    modeChipText: {
      color: colors.text,
      fontWeight: '900',
    },
    modeChipTextActive: {
      color: colors.black,
    },
    modeDescription: {
      lineHeight: 18,
    },
    assetCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    assetCardTitleBox: {
      flex: 1,
      minWidth: 0,
    },
    assetTitle: {
      marginTop: 4,
      color: colors.text,
    },
    searchButton: {
      minHeight: 40,
      borderRadius: 15,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    searchButtonText: {
      color: colors.black,
      fontWeight: '900',
    },
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    typeChip: {
      minHeight: 38,
      borderRadius: 14,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 11,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    typeChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    typeChipText: {
      color: colors.text,
      fontWeight: '900',
    },
    typeChipTextActive: {
      color: colors.black,
    },
    inputGrid: {
      flexDirection: 'row',
      gap: 10,
    },
    inputHalf: {
      flex: 1,
      gap: 9,
    },
    input: {
      minHeight: 52,
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      paddingHorizontal: 15,
      fontSize: 15,
      fontWeight: '800',
    },
    noteInput: {
      minHeight: 88,
      textAlignVertical: 'top',
      paddingTop: 14,
    },
    currencyRow: {
      flexDirection: 'row',
      gap: 9,
    },
    currencyChip: {
      minHeight: 40,
      borderRadius: 14,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    currencyChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    currencyChipText: {
      color: colors.text,
      fontWeight: '900',
    },
    currencyChipTextActive: {
      color: colors.black,
    },
    fetchPriceButton: {
      minHeight: 48,
      borderRadius: 17,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 14,
    },
    fetchPriceButtonText: {
      color: colors.black,
      fontWeight: '900',
    },
    disabledButton: {
      opacity: 0.45,
    },
    statusText: {
      lineHeight: 18,
    },
    quantityCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 15,
      gap: 12,
      marginBottom: 18,
    },
    quantityHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    quantityIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quantityTitleBox: {
      flex: 1,
      minWidth: 0,
    },
    quantityAssetLabel: {
      marginTop: 3,
      color: colors.text,
      fontWeight: '900',
    },
    quantityInput: {
      minHeight: 56,
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      paddingHorizontal: 15,
      fontSize: 22,
      fontWeight: '900',
    },
    quantityQuickRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    quantityQuickChip: {
      minHeight: 36,
      borderRadius: 13,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quantityQuickText: {
      color: colors.text,
      fontWeight: '900',
    },
    quantityPreview: {
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
    },
    quantityPreviewValue: {
      marginTop: 4,
      color: colors.text,
      fontWeight: '900',
    },
    quantityHelper: {
      lineHeight: 18,
    },
    previewCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 16,
      gap: 14,
      marginTop: 2,
      marginBottom: 18,
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    previewTitleBox: {
      flex: 1,
      minWidth: 0,
    },
    previewValue: {
      marginTop: 5,
      color: colors.text,
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
      color: colors.investment,
      fontWeight: '900',
    },
    previewGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 9,
    },
    previewItem: {
      width: '48%',
      borderRadius: 15,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
    },
    previewItemValue: {
      marginTop: 5,
      color: colors.text,
      fontWeight: '900',
    },
    avgExplanation: {
      lineHeight: 18,
    },
    submitButton: {
      minHeight: 56,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
    },
    submitButtonText: {
      color: colors.black,
      fontWeight: '900',
    },
  });
}
