import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { Currency, InvestmentAssetType } from '../src/types/finance';

type SearchProvider = 'coingecko' | 'yahoo' | 'manual';

type AssetSearchResult = {
  id: string;
  name: string;
  symbol: string;
  assetType: InvestmentAssetType;
  currency: Currency;
  provider: SearchProvider;
  market?: string;
  exchange?: string;
};

type YahooQuoteResult = {
  symbol?: string;
  shortname?: string;
  longname?: string;
  quoteType?: string;
  exchDisp?: string;
  exchange?: string;
  currency?: string;
};

const searchableAssetTypes: {
  label: string;
  value: InvestmentAssetType;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { label: 'Crypto', value: 'crypto', icon: 'logo-bitcoin' },
  { label: 'Stock', value: 'stock', icon: 'business-outline' },
  { label: 'ETF', value: 'etf', icon: 'layers-outline' },
  { label: 'Fund', value: 'fund', icon: 'pie-chart-outline' },
];

function normalizeCurrency(value?: string): Currency {
  const normalizedValue = value?.toUpperCase();

  if (normalizedValue === 'IDR') return 'IDR';
  if (normalizedValue === 'EUR') return 'EUR';

  return 'USD';
}

function normalizeAssetType(value?: string): InvestmentAssetType {
  if (
    value === 'crypto' ||
    value === 'stock' ||
    value === 'etf' ||
    value === 'fund'
  ) {
    return value;
  }

  return 'crypto';
}

function getYahooAssetType(quoteType?: string): InvestmentAssetType | null {
  const normalizedType = quoteType?.toUpperCase();

  if (normalizedType === 'EQUITY') return 'stock';
  if (normalizedType === 'ETF') return 'etf';
  if (normalizedType === 'MUTUALFUND') return 'fund';

  return null;
}

function getProviderLabel(provider: SearchProvider) {
  if (provider === 'coingecko') return 'CoinGecko';
  return 'Yahoo Finance';
}

function getHelperText(assetType: InvestmentAssetType) {
  if (assetType === 'crypto') {
    return 'Remote search from CoinGecko. Pick result to fill name and symbol.';
  }

  if (assetType === 'stock') {
    return 'Remote stock search from Yahoo Finance.';
  }

  if (assetType === 'etf') {
    return 'Remote ETF search from Yahoo Finance.';
  }

  return 'Remote fund search from Yahoo Finance.';
}

async function fetchJson(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Remote provider is unavailable.');
  }

  return response.json();
}

async function searchCrypto(query: string): Promise<AssetSearchResult[]> {
  const data = await fetchJson(
    `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`
  );
  const coins = Array.isArray(data?.coins) ? data.coins : [];

  return coins.slice(0, 15).map((coin: any) => {
    const symbol =
      typeof coin?.symbol === 'string' ? coin.symbol.toUpperCase() : '';
    const name = typeof coin?.name === 'string' ? coin.name : symbol;
    const id = typeof coin?.id === 'string' ? coin.id : symbol.toLowerCase();

    return {
      id: `coingecko-${id}`,
      name,
      symbol,
      assetType: 'crypto',
      currency: 'USD',
      provider: 'coingecko',
      market: id,
      exchange: 'CoinGecko',
    };
  }).filter((item: AssetSearchResult) => Boolean(item.symbol && item.name));
}

async function searchYahoo(
  query: string,
  assetType: InvestmentAssetType
): Promise<AssetSearchResult[]> {
  const data = await fetchJson(
    `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
      query
    )}&quotesCount=18&newsCount=0`
  );
  const quotes = Array.isArray(data?.quotes)
    ? (data.quotes as YahooQuoteResult[])
    : [];

  const results: AssetSearchResult[] = [];

  quotes.forEach((quote) => {
    const symbol = quote.symbol?.trim();
    const detectedType = getYahooAssetType(quote.quoteType);

    if (!symbol || !detectedType || detectedType !== assetType) {
      return;
    }

    results.push({
      id: `yahoo-${detectedType}-${symbol.toLowerCase()}`,
      name: quote.longname || quote.shortname || symbol,
      symbol,
      assetType: detectedType,
      currency: normalizeCurrency(quote.currency),
      provider: 'yahoo',
      market: symbol,
      exchange: quote.exchDisp || quote.exchange || 'Yahoo Finance',
    });
  });

  return results.slice(0, 15);
}

async function searchAssets(
  query: string,
  assetType: InvestmentAssetType
): Promise<AssetSearchResult[]> {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 2) {
    return [];
  }

  if (assetType === 'crypto') {
    return searchCrypto(trimmedQuery);
  }

  return searchYahoo(trimmedQuery, assetType);
}

export default function InvestmentAssetPickerScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ assetType?: string; currency?: string; returnTo?: string }>();

  const initialAssetType = useMemo(
    () => normalizeAssetType(params.assetType),
    [params.assetType]
  );

  const [assetType, setAssetType] = useState<InvestmentAssetType>(initialAssetType);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AssetSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    if (query.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      setErrorMessage('');
      return () => {
        isMounted = false;
      };
    }

    const timer = setTimeout(() => {
      setIsSearching(true);
      setErrorMessage('');

      searchAssets(query, assetType)
        .then((items) => {
          if (!isMounted) return;

          setResults(items);
          setErrorMessage(
            items.length === 0
              ? 'No remote result found. You can still fill asset manually.'
              : ''
          );
        })
        .catch(() => {
          if (!isMounted) return;

          setResults([]);
          setErrorMessage(
            'Remote search failed. Check connection or fill asset manually.'
          );
        })
        .finally(() => {
          if (isMounted) {
            setIsSearching(false);
          }
        });
    }, assetType === 'crypto' ? 550 : 650);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [assetType, query]);

  function handleSelectAsset(asset: AssetSearchResult) {
    router.replace({
      pathname:
        params.returnTo === 'buy-investment-asset'
          ? '/buy-investment-asset'
          : '/add-investment-holding',
      params: {
        pickedName: asset.name,
        pickedSymbol: asset.symbol,
        pickedAssetType: asset.assetType,
        pickedCurrency: asset.currency,
        pickedProvider: asset.provider,
      },
    });
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.headerText}>
          <AppText variant="caption" muted>
            Remote asset lookup
          </AppText>

          <AppText variant="title">Asset Picker</AppText>
        </View>
      </View>

      <View style={styles.typeGrid}>
        {searchableAssetTypes.map((item) => {
          const active = item.value === assetType;

          return (
            <Pressable
              key={item.value}
              onPress={() => {
                setAssetType(item.value);
                setResults([]);
                setErrorMessage('');
              }}
              style={[styles.typeChip, active && styles.typeChipActive]}
            >
              <Ionicons
                name={item.icon}
                size={16}
                color={active ? colors.black : colors.text}
              />

              <AppText
                variant="caption"
                style={[styles.typeText, active && styles.typeTextActive]}
              >
                {item.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} />

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={
            assetType === 'crypto'
              ? 'Search BTC, ETH, SOL...'
              : 'Search AAPL, TSLA, VOO...'
          }
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          style={styles.searchInput}
        />
      </View>

      <AppText variant="caption" muted style={styles.helperText}>
        {getHelperText(assetType)}
      </AppText>

      <View style={styles.statusCard}>
        <Ionicons
          name={isSearching ? 'sync-outline' : 'cloud-outline'}
          size={18}
          color={colors.text}
        />

        <AppText variant="caption" muted style={styles.statusText}>
          {isSearching
            ? 'Searching remote provider...'
            : query.trim().length < 2
              ? 'Type at least 2 characters to search.'
              : errorMessage || 'Tap an asset result to auto-fill Add Holding.'}
        </AppText>
      </View>

      <View style={styles.resultList}>
        {results.map((asset) => (
          <Pressable
            key={asset.id}
            onPress={() => handleSelectAsset(asset)}
            style={styles.resultCard}
          >
            <View style={styles.resultIcon}>
              <Ionicons
                name={asset.assetType === 'crypto' ? 'logo-bitcoin' : 'trending-up-outline'}
                size={18}
                color={colors.text}
              />
            </View>

            <View style={styles.resultTextBox}>
              <AppText variant="body" style={styles.resultTitle} numberOfLines={1}>
                {asset.symbol} • {asset.name}
              </AppText>

              <AppText variant="caption" muted numberOfLines={1}>
                {getProviderLabel(asset.provider)} • {asset.exchange || asset.market} • {asset.currency}
              </AppText>
            </View>

            <Ionicons name="add-circle-outline" size={21} color={colors.textMuted} />
          </Pressable>
        ))}
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
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 9,
      marginBottom: 16,
    },
    typeChip: {
      minHeight: 44,
      borderRadius: 15,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 13,
      paddingVertical: 9,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    typeChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    typeText: {
      color: colors.text,
      fontWeight: '900',
    },
    typeTextActive: {
      color: colors.black,
    },
    searchBox: {
      minHeight: 58,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 15,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
      paddingVertical: 12,
    },
    helperText: {
      marginTop: 10,
      lineHeight: 18,
    },
    statusCard: {
      marginTop: 16,
      minHeight: 52,
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 13,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    statusText: {
      flex: 1,
      lineHeight: 18,
    },
    resultList: {
      marginTop: 16,
      gap: 10,
    },
    resultCard: {
      minHeight: 68,
      borderRadius: 21,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 13,
      paddingVertical: 11,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
    },
    resultIcon: {
      width: 42,
      height: 42,
      borderRadius: 15,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resultTextBox: {
      flex: 1,
      minWidth: 0,
    },
    resultTitle: {
      color: colors.text,
      fontWeight: '900',
      marginBottom: 4,
    },
  });
}
