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
import {
  getProviderLabel,
  searchInvestmentAssets,
  type InvestmentAssetSearchResult,
} from '../src/services/investmentAssetSearch';
import { useFinanceStore } from '../src/stores/useFinanceStore';
import { Account, Category, Currency, InvestmentHolding } from '../src/types/finance';
import { formatCurrency } from '../src/utils/currency';

const currencies: Currency[] = ['IDR', 'USD', 'EUR'];

function parseNumber(value: string) {
  const parsedValue = Number(value || 0);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function getCryptoWalletSupportError({
  account,
  symbol,
}: {
  account: Account;
  symbol: string;
}) {
  if (account.type !== 'crypto_wallet') {
    return null;
  }

  const normalizedSymbol = symbol.trim().toUpperCase();
  const enabledSymbols = account.supportedCryptoSymbols || [];

  if (enabledSymbols.length > 0 && !enabledSymbols.includes(normalizedSymbol)) {
    return `${normalizedSymbol || 'This crypto'} is not enabled for ${account.name}. Open Crypto Wallets and select it from API/provider first.`;
  }

  return null;
}

function makeTempCryptoHolding({
  accountId,
  name,
  symbol,
  currency,
  rate,
}: {
  accountId: string;
  name: string;
  symbol: string;
  currency: Currency;
  rate: number;
}): InvestmentHolding {
  const now = new Date().toISOString();

  return {
    id: 'crypto-income-preview',
    accountId,
    name: name || symbol,
    symbol,
    assetType: 'crypto',
    quantity: 0,
    averagePrice: rate || 0,
    currentPrice: rate || 0,
    currency,
    createdAt: now,
    updatedAt: now,
  };
}

export default function AddCryptoIncomeScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ holdingId?: string }>();

  const accounts = useFinanceStore((state) => state.accounts);
  const categories = useFinanceStore((state) => state.categories);
  const holdings = useFinanceStore((state) => state.investmentHoldings);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);
  const exchangeRates = useFinanceStore((state) => state.exchangeRates);
  const addCryptoIncome = useFinanceStore((state) => state.addCryptoIncome);

  const cryptoAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          account.isActive &&
          (account.type === 'broker' || account.type === 'crypto_wallet')
      ),
    [accounts]
  );
  const cryptoHoldings = useMemo(
    () => holdings.filter((holding) => holding.assetType === 'crypto'),
    [holdings]
  );
  const incomeCategories = useMemo(
    () => categories.filter((category) => category.isActive && category.type === 'income'),
    [categories]
  );

  const [accountId, setAccountId] = useState(cryptoAccounts[0]?.id || '');
  const [holdingId, setHoldingId] = useState(params.holdingId || '');
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [assetSearchResults, setAssetSearchResults] = useState<InvestmentAssetSearchResult[]>([]);
  const [assetSearchStatus, setAssetSearchStatus] = useState(
    'Search crypto asset from provider by name or symbol.'
  );
  const [isSearchingAssets, setIsSearchingAssets] = useState(false);
  const [selectedSearchAssetId, setSelectedSearchAssetId] = useState('');
  const [title, setTitle] = useState('');
  const [incomeCategoryId, setIncomeCategoryId] = useState(incomeCategories[0]?.id || '');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [rateCurrency, setRateCurrency] = useState<Currency>(defaultCurrency);
  const [rate, setRate] = useState('');
  const [rateProvider, setRateProvider] = useState('');
  const [rateStatus, setRateStatus] = useState('Input crypto symbol. Rate will be detected automatically when available.');
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [note, setNote] = useState('');

  const selectedAccount = cryptoAccounts.find((account) => account.id === accountId);
  const selectedHolding = cryptoHoldings.find((holding) => holding.id === holdingId);
  const parsedQuantity = parseNumber(quantity);
  const parsedRate = parseNumber(rate);
  const estimatedValue = parsedQuantity * parsedRate;

  useEffect(() => {
    if (!params.holdingId) {
      return;
    }

    const targetHolding = cryptoHoldings.find(
      (holding) => holding.id === params.holdingId
    );

    if (!targetHolding) {
      return;
    }

    setHoldingId(targetHolding.id);
  }, [params.holdingId, cryptoHoldings]);

  useEffect(() => {
    if (!selectedHolding) return;

    setAccountId(selectedHolding.accountId);
    setName(selectedHolding.name);
    setSymbol(selectedHolding.symbol);
    setRateCurrency(selectedHolding.currency);
    setSelectedSearchAssetId('');
    setAssetSearchQuery('');
    setAssetSearchResults([]);
    setAssetSearchStatus('Using existing crypto holding.');
  }, [selectedHolding?.id]);

  useEffect(() => {
    if (holdingId) {
      setIsSearchingAssets(false);
      return;
    }

    const query = assetSearchQuery.trim();

    if (query.length < 2) {
      setAssetSearchResults([]);
      setIsSearchingAssets(false);
      setAssetSearchStatus('Type at least 2 characters to search crypto asset.');
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setIsSearchingAssets(true);
      setAssetSearchStatus('Searching crypto provider...');

      try {
        const results = await searchInvestmentAssets(query, 'crypto', 14);

        if (cancelled) return;

        setAssetSearchResults(results);
        setAssetSearchStatus(
          results.length > 0
            ? `${results.length} crypto asset${results.length > 1 ? 's' : ''} found.`
            : 'No crypto asset found from provider. You can still type symbol manually.'
        );
      } catch {
        if (cancelled) return;

        setAssetSearchResults([]);
        setAssetSearchStatus('Unable to search provider. Manual input still works.');
      } finally {
        if (!cancelled) {
          setIsSearchingAssets(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [assetSearchQuery, holdingId]);

  function handleSelectSearchAsset(asset: InvestmentAssetSearchResult) {
    const normalizedSymbol = asset.symbol.trim().toUpperCase();

    setHoldingId('');
    setSelectedSearchAssetId(asset.id);
    setName(asset.name);
    setSymbol(normalizedSymbol);
    setRateCurrency(asset.currency);
    setAssetSearchQuery(`${normalizedSymbol} - ${asset.name}`);
    setAssetSearchResults([]);
    setAssetSearchStatus(
      `${asset.name} selected from ${getProviderLabel(asset.provider)}. Choose account and input quantity.`
    );
  }

  useEffect(() => {
    const normalizedSymbol = symbol.trim().toUpperCase();

    if (!selectedAccount || !normalizedSymbol) {
      setIsFetchingRate(false);
      setRateProvider('');
      setRateStatus('Input crypto symbol. Rate will be detected automatically when available.');
      return;
    }

    const tempHolding = makeTempCryptoHolding({
      accountId: selectedAccount.id,
      name: name.trim() || normalizedSymbol,
      symbol: normalizedSymbol,
      currency: rateCurrency,
      rate: parsedRate,
    });

    if (!isPriceSyncSupportedHolding(tempHolding)) {
      setIsFetchingRate(false);
      setRateProvider('');
      setRateStatus('Realtime rate is not available for this crypto. Please input rate manually.');
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setIsFetchingRate(true);
      setRateStatus('Detecting actual crypto rate...');

      try {
        const result = await fetchInvestmentPriceForHolding(tempHolding, exchangeRates);

        if (cancelled) return;

        setRate(String(result.currentPrice));
        setRateProvider(result.provider);
        setRateStatus(`Actual crypto rate detected from ${result.provider}.`);
      } catch (error) {
        if (cancelled) return;

        setRateProvider('');
        setRateStatus(
          error instanceof Error
            ? `${error.message} You can input rate manually.`
            : 'Unable to detect crypto rate. You can input rate manually.'
        );
      } finally {
        if (!cancelled) setIsFetchingRate(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [selectedAccount?.id, name, symbol, rateCurrency, exchangeRates]);

  function handleSubmit() {
    if (!selectedAccount) {
      Alert.alert('Finance OS Mobile', 'Create/select crypto wallet or broker account first.');
      return;
    }

    const supportError = getCryptoWalletSupportError({
      account: selectedAccount,
      symbol: selectedHolding?.symbol || symbol,
    });

    if (supportError) {
      Alert.alert('Finance OS Mobile', supportError);
      return;
    }

    const result = addCryptoIncome({
      accountId: selectedAccount.id,
      holdingId: selectedHolding?.id,
      title: title.trim() || `Crypto Income ${symbol.trim().toUpperCase()}`,
      categoryId: incomeCategoryId || incomeCategories[0]?.id,
      name: name.trim() || symbol.trim().toUpperCase(),
      symbol,
      quantity: parsedQuantity,
      rate: parsedRate,
      rateCurrency,
      note,
      provider: rateProvider || undefined,
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
          <AppText variant="caption" muted>Crypto transaction</AppText>
          <AppText variant="title">Crypto Income</AppText>
        </View>
      </View>

      <View style={styles.sectionMiniHeader}>
        <View>
          <AppText variant="caption" muted>
            Step 1
          </AppText>

          <AppText variant="subtitle" style={styles.sectionMiniTitle}>
            Crypto source
          </AppText>
        </View>

        <AppText variant="caption" muted style={styles.sectionMiniHint}>
          Existing / New
        </AppText>
      </View>

      <View style={styles.card}>
        <AppText variant="caption" muted style={styles.label}>Add to Existing Holding</AppText>

        <View style={styles.optionGrid}>
          <Pressable
            onPress={() => {
              setHoldingId('');
              setSelectedSearchAssetId('');
              setAssetSearchStatus('Search or type crypto asset manually.');
            }}
            style={[styles.optionChip, !holdingId && styles.optionChipActive]}
          >
            <Ionicons name="add-circle-outline" size={16} color={!holdingId ? colors.black : colors.text} />
            <AppText variant="caption" style={[styles.optionText, !holdingId && styles.optionTextActive]}>
              New
            </AppText>
          </Pressable>

          {cryptoHoldings.slice(0, 8).map((holding) => {
            const active = holding.id === holdingId;

            return (
              <Pressable
                key={holding.id}
                onPress={() => {
                  setHoldingId(holding.id);
                  setSelectedSearchAssetId('');
                }}
                style={[styles.optionChip, active && styles.optionChipActive]}
              >
                <Ionicons name="logo-bitcoin" size={16} color={active ? colors.black : colors.text} />
                <AppText variant="caption" style={[styles.optionText, active && styles.optionTextActive]} numberOfLines={1}>
                  {holding.symbol}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.searchHeader}>
          <View style={styles.searchTitleBox}>
            <AppText variant="caption" muted style={styles.label}>Search Crypto Asset</AppText>
            <AppText variant="caption" muted style={styles.searchDescription}>
              Search remote provider. Selected asset will be saved as new holding.
            </AppText>
          </View>

          {selectedSearchAssetId ? (
            <View style={styles.selectedAssetBadge}>
              <Ionicons name="checkmark-circle-outline" size={15} color={colors.black} />
              <AppText variant="caption" style={styles.selectedAssetBadgeText}>Selected</AppText>
            </View>
          ) : null}
        </View>

        <View style={styles.searchInputBox}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            value={assetSearchQuery}
            onChangeText={(value) => {
              setAssetSearchQuery(value);
              setSelectedSearchAssetId('');
              if (holdingId) {
                setHoldingId('');
              }
            }}
            placeholder="Search BTC, ETH, SOL, DOGE..."
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            style={styles.searchInput}
          />
        </View>

        <View style={styles.searchStatusCard}>
          <Ionicons
            name={isSearchingAssets ? 'sync-outline' : selectedSearchAssetId ? 'checkmark-circle-outline' : 'information-circle-outline'}
            size={17}
            color={selectedSearchAssetId ? colors.black : colors.textMuted}
          />
          <AppText
            variant="caption"
            muted={!selectedSearchAssetId}
            style={[styles.searchStatusText, selectedSearchAssetId && styles.searchStatusTextActive]}
          >
            {isSearchingAssets ? 'Searching...' : assetSearchStatus}
          </AppText>
        </View>

        {assetSearchResults.length > 0 ? (
          <View style={styles.assetResultList}>
            {assetSearchResults.map((asset) => (
              <Pressable
                key={asset.id}
                onPress={() => handleSelectSearchAsset(asset)}
                style={styles.assetResultCard}
              >
                <View style={styles.assetResultIcon}>
                  <Ionicons name="logo-bitcoin" size={18} color={colors.text} />
                </View>

                <View style={styles.assetResultTextBox}>
                  <AppText variant="body" style={styles.assetResultName} numberOfLines={1}>
                    {asset.symbol} • {asset.name}
                  </AppText>

                  <AppText variant="caption" muted numberOfLines={1}>
                    {getProviderLabel(asset.provider)}{asset.market ? ` • ${asset.market}` : ''} • {asset.currency}
                  </AppText>
                </View>

                <Ionicons name="chevron-forward-outline" size={17} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <AppText variant="caption" muted style={styles.label}>Crypto Wallet / Broker</AppText>

        <View style={styles.optionGrid}>
          {cryptoAccounts.map((account) => {
            const active = account.id === accountId;

            return (
              <Pressable
                key={account.id}
                onPress={() => setAccountId(account.id)}
                style={[styles.optionChip, active && styles.optionChipActive]}
              >
                <Ionicons name={account.type === 'crypto_wallet' ? 'logo-bitcoin' : 'trending-up-outline'} size={16} color={active ? colors.black : colors.text} />
                <AppText variant="caption" style={[styles.optionText, active && styles.optionTextActive]} numberOfLines={1}>
                  {account.name}
                </AppText>
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
            Transaction detail
          </AppText>
        </View>

        <AppText variant="caption" muted style={styles.sectionMiniHint}>
          Title & category
        </AppText>
      </View>

      <View style={styles.card}>
        <View style={styles.fieldInner}>
          <AppText variant="caption" muted style={styles.label}>Transaction Title</AppText>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Example: Airdrop reward"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </View>

        <View style={styles.fieldInner}>
          <AppText variant="caption" muted style={styles.label}>Income Category</AppText>

          <CategoryPicker
            categories={incomeCategories}
            selectedCategoryId={incomeCategoryId}
            onSelect={setIncomeCategoryId}
            colors={colors}
          />
        </View>
      </View>

      <View style={styles.sectionMiniHeader}>
        <View>
          <AppText variant="caption" muted>
            Step 3
          </AppText>

          <AppText variant="subtitle" style={styles.sectionMiniTitle}>
            Asset, quantity & rate
          </AppText>
        </View>

        <AppText variant="caption" muted style={styles.sectionMiniHint}>
          Value input
        </AppText>
      </View>

      <View style={styles.card}>
        <View style={styles.inputGrid}>
          <View style={styles.inputHalf}>
            <AppText variant="caption" muted style={styles.label}>Crypto Name</AppText>
            <TextInput
              value={name}
              onChangeText={(value) => {
                setName(value);
                setSelectedSearchAssetId('');
              }}
              placeholder="Bitcoin"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>

          <View style={styles.inputHalf}>
            <AppText variant="caption" muted style={styles.label}>Symbol</AppText>
            <TextInput
              value={symbol}
              onChangeText={(value) => {
                setSymbol(value.toUpperCase());
                setSelectedSearchAssetId('');
              }}
              placeholder="BTC"
              autoCapitalize="characters"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>
        </View>

        <NumericAmountInput
          label="Crypto Quantity"
          value={quantity}
          onChangeText={setQuantity}
          placeholder="0"
          icon="calculator-outline"
          quickValues={['0.001', '0.01', '0.1', '1']}
          helperText="Amount of crypto received."
          allowDecimal
        />

        <View style={styles.currencyRow}>
          {currencies.map((currency) => {
            const active = currency === rateCurrency;

            return (
              <Pressable
                key={currency}
                onPress={() => setRateCurrency(currency)}
                style={[styles.currencyChip, active && styles.currencyChipActive]}
              >
                <AppText variant="caption" style={[styles.currencyText, active && styles.currencyTextActive]}>
                  {currency}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.rateStatusCard}>
          <View style={styles.rateStatusIcon}>
            <Ionicons name={isFetchingRate ? 'sync-outline' : rateProvider ? 'flash-outline' : 'create-outline'} size={17} color={rateProvider ? colors.black : colors.text} />
          </View>

          <View style={styles.rateStatusTextBox}>
            <AppText variant="caption" muted>Rate per 1 {symbol.trim() || 'crypto'}</AppText>
            <AppText variant="body" style={styles.rateStatusTitle}>
              {isFetchingRate ? 'Detecting rate...' : rateProvider ? 'Realtime rate detected' : 'Manual fallback available'}
            </AppText>
            <AppText variant="caption" muted style={styles.rateStatusText}>{rateStatus}</AppText>
          </View>
        </View>

        <NumericAmountInput
          label={`Rate per 1 ${symbol.trim() || 'crypto'}`}
          value={rate}
          onChangeText={setRate}
          placeholder="0"
          currency={rateCurrency}
          icon="pricetag-outline"
          quickValues={rateCurrency === 'IDR' ? ['1000', '10000', '100000'] : ['1', '10', '100']}
          helperText="Auto-filled when supported. Input manually if unavailable."
          allowDecimal
        />
      </View>

      <View style={styles.sectionMiniHeader}>
        <View>
          <AppText variant="caption" muted>
            Step 4
          </AppText>

          <AppText variant="subtitle" style={styles.sectionMiniTitle}>
            Preview & save
          </AppText>
        </View>

        <AppText variant="caption" muted style={styles.sectionMiniHint}>
          Check value
        </AppText>
      </View>

      <View style={styles.previewCard}>
        <View style={styles.previewHeader}>
          <View>
            <AppText variant="caption" muted>Estimated Value</AppText>

            <AppText variant="title" style={styles.previewValue} numberOfLines={1}>
              {formatCurrency(estimatedValue, rateCurrency)}
            </AppText>
          </View>

          <View style={styles.previewIcon}>
            <Ionicons name="arrow-down-circle-outline" size={22} color={colors.black} />
          </View>
        </View>

        <AppText variant="caption" style={styles.previewDescription} numberOfLines={1}>
          {quantity || '0'} {symbol.trim().toUpperCase() || 'CRYPTO'} · {rateCurrency}
        </AppText>
      </View>

      <View style={styles.field}>
        <AppText variant="caption" muted style={styles.label}>Note</AppText>
        <TextInput value={note} onChangeText={setNote} placeholder="Optional note" placeholderTextColor={colors.textMuted} multiline style={[styles.input, styles.noteInput]} />
      </View>

      <Pressable onPress={handleSubmit} style={styles.submitButton}>
        <Ionicons name="checkmark-circle-outline" size={19} color={colors.black} />

        <AppText variant="body" style={styles.submitText}>Save Crypto Income</AppText>
      </Pressable>
    </Screen>
  );
}


function CategoryPicker({
  categories,
  selectedCategoryId,
  onSelect,
  colors,
}: {
  categories: Category[];
  selectedCategoryId: string;
  onSelect: (categoryId: string) => void;
  colors: ThemeColors;
}) {
  const styles = createStyles(colors);

  if (categories.length === 0) {
    return (
      <View style={styles.emptyCategoryBox}>
        <AppText variant="caption" muted>
          No categories available.
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.categoryList}>
      {categories.map((category) => {
        const active = category.id === selectedCategoryId;
        const categoryDescription =
          category.type === 'income'
            ? 'Income category'
            : 'Expense category';

        return (
          <Pressable
            key={category.id}
            onPress={() => onSelect(category.id)}
            style={[styles.categoryCard, active && styles.categoryCardActive]}
          >
            <View style={styles.categoryTextBox}>
              <AppText
                variant="body"
                style={[styles.categoryName, active && styles.categoryNameActive]}
                numberOfLines={1}
              >
                {category.name}
              </AppText>

              <AppText
                variant="caption"
                muted={!active}
                style={[styles.categoryDescription, active && styles.categoryDescriptionActive]}
                numberOfLines={1}
              >
                {categoryDescription}
              </AppText>
            </View>

            <View style={[styles.categoryRadio, active && styles.categoryRadioActive]}>
              {active ? <View style={styles.categoryRadioDot} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}


function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: { marginBottom: 22, flexDirection: 'row', alignItems: 'center', gap: 14 },
    backButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    headerText: { flex: 1, minWidth: 0 },
    card: { marginBottom: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 14, gap: 12 },
    sectionMiniHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginTop: 4, marginBottom: 10 },
    sectionMiniTitle: { marginTop: 3, color: colors.text },
    sectionMiniHint: { fontWeight: '900' },
    label: { fontWeight: '900' },
    optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
    optionChip: { minHeight: 42, maxWidth: '48%', borderRadius: 15, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 7 },
    optionChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    optionText: { color: colors.text, fontWeight: '900' },
    optionTextActive: { color: colors.black },
    searchHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    searchTitleBox: { flex: 1, minWidth: 0 },
    searchDescription: { marginTop: 4, lineHeight: 17 },
    selectedAssetBadge: { minHeight: 30, borderRadius: 999, backgroundColor: colors.primary, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
    selectedAssetBadgeText: { color: colors.black, fontWeight: '900' },
    searchInputBox: { minHeight: 52, borderRadius: 18, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
    searchInput: { flex: 1, color: colors.text, fontWeight: '800', fontSize: 15, paddingVertical: 10 },
    searchStatusCard: { borderRadius: 16, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
    searchStatusText: { flex: 1, lineHeight: 17 },
    searchStatusTextActive: { color: colors.black, fontWeight: '900' },
    assetResultList: { gap: 9 },
    assetResultCard: { minHeight: 62, borderRadius: 18, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
    assetResultIcon: { width: 38, height: 38, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    assetResultTextBox: { flex: 1, minWidth: 0 },
    assetResultName: { color: colors.text, fontWeight: '900' },
    categoryList: { gap: 9 },
    categoryCard: { minHeight: 58, borderRadius: 18, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
    categoryCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    categoryTextBox: { flex: 1, minWidth: 0 },
    categoryName: { color: colors.text, fontWeight: '900' },
    categoryNameActive: { color: colors.black },
    categoryDescription: { marginTop: 3, lineHeight: 16 },
    categoryDescriptionActive: { color: 'rgba(0,0,0,0.62)' },
    categoryRadio: { width: 22, height: 22, borderRadius: 999, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    categoryRadioActive: { borderColor: colors.black },
    categoryRadioDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: colors.black },
    emptyCategoryBox: { minHeight: 42, borderRadius: 15, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, justifyContent: 'center' },
    fieldInner: { gap: 8 },
    inputGrid: { flexDirection: 'row', gap: 10 },
    inputHalf: { flex: 1, gap: 8 },
    input: { minHeight: 54, borderRadius: 18, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontWeight: '800' },
    noteInput: { minHeight: 92, textAlignVertical: 'top' },
    currencyRow: { flexDirection: 'row', gap: 9 },
    currencyChip: { minHeight: 40, borderRadius: 14, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
    currencyChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    currencyText: { color: colors.text, fontWeight: '900' },
    currencyTextActive: { color: colors.black },
    rateStatusCard: { borderRadius: 18, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border, padding: 12, flexDirection: 'row', gap: 10 },
    rateStatusIcon: { width: 38, height: 38, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    rateStatusTextBox: { flex: 1, minWidth: 0 },
    rateStatusTitle: { marginTop: 2, color: colors.text, fontWeight: '900' },
    rateStatusText: { marginTop: 4, lineHeight: 18 },
    previewCard: { marginBottom: 16, backgroundColor: colors.primary, borderRadius: 24, padding: 18, gap: 8 },
    previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    previewIcon: { width: 42, height: 42, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center' },
    previewValue: { marginTop: 6, color: colors.black },
    previewDescription: { color: 'rgba(0,0,0,0.62)', fontWeight: '900' },
    field: { marginBottom: 18, gap: 9 },
    submitButton: { minHeight: 56, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 18 },
    submitText: { color: colors.black, fontWeight: '900' },
  });
}
