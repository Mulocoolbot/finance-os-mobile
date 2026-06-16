export type InvestmentAssetSearchProvider = 'binance' | 'coingecko';

export type InvestmentAssetSearchResult = {
  id: string;
  symbol: string;
  name: string;
  assetType: 'crypto' | 'stock' | 'fund' | 'etf' | 'bond' | 'other';
  currency: 'IDR' | 'USD' | 'EUR';
  provider: InvestmentAssetSearchProvider;
  market?: string;
};

const BINANCE_SPOT_INFO_URL = 'https://api.binance.com/api/v3/exchangeInfo';
const COINGECKO_SEARCH_URL = 'https://api.coingecko.com/api/v3/search';

let binanceSymbolCache:
  | {
      fetchedAt: number;
      results: InvestmentAssetSearchResult[];
    }
  | null = null;

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

function normalizeQuery(query: string) {
  return query.trim().toUpperCase();
}

function uniqueBySymbol(results: InvestmentAssetSearchResult[]) {
  const seen = new Set<string>();
  const uniqueResults: InvestmentAssetSearchResult[] = [];

  results.forEach((result) => {
    const key = `${result.symbol}-${result.provider}`;

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    uniqueResults.push(result);
  });

  return uniqueResults;
}

function rankResults(query: string, results: InvestmentAssetSearchResult[]) {
  const normalizedQuery = normalizeQuery(query);

  return [...results].sort((a, b) => {
    const aSymbol = a.symbol.toUpperCase();
    const bSymbol = b.symbol.toUpperCase();
    const aName = a.name.toUpperCase();
    const bName = b.name.toUpperCase();

    const aExact = aSymbol === normalizedQuery ? 0 : 1;
    const bExact = bSymbol === normalizedQuery ? 0 : 1;

    if (aExact !== bExact) return aExact - bExact;

    const aStarts = aSymbol.startsWith(normalizedQuery) || aName.startsWith(normalizedQuery) ? 0 : 1;
    const bStarts = bSymbol.startsWith(normalizedQuery) || bName.startsWith(normalizedQuery) ? 0 : 1;

    if (aStarts !== bStarts) return aStarts - bStarts;

    return aSymbol.localeCompare(bSymbol);
  });
}

async function fetchBinanceAssets() {
  const now = Date.now();

  if (binanceSymbolCache && now - binanceSymbolCache.fetchedAt < CACHE_TTL_MS) {
    return binanceSymbolCache.results;
  }

  const response = await fetch(BINANCE_SPOT_INFO_URL);

  if (!response.ok) {
    throw new Error('Unable to fetch Binance symbols.');
  }

  const payload = await response.json();
  const symbols = Array.isArray(payload?.symbols) ? payload.symbols : [];

  const results = symbols
    .filter((item: any) => {
      return (
        item?.status === 'TRADING' &&
        typeof item?.baseAsset === 'string' &&
        typeof item?.quoteAsset === 'string' &&
        ['USDT', 'USD', 'BUSD', 'FDUSD', 'USDC'].includes(item.quoteAsset)
      );
    })
    .map((item: any) => {
      const baseAsset = String(item.baseAsset).toUpperCase();
      const quoteAsset = String(item.quoteAsset).toUpperCase();

      return {
        id: `binance-${baseAsset}-${quoteAsset}`,
        symbol: baseAsset,
        name: baseAsset,
        assetType: 'crypto' as const,
        currency: 'USD' as const,
        provider: 'binance' as const,
        market: `${baseAsset}${quoteAsset}`,
      };
    });

  const uniqueResults = uniqueBySymbol(results);
  binanceSymbolCache = {
    fetchedAt: now,
    results: uniqueResults,
  };

  return uniqueResults;
}

async function searchBinanceCryptoAssets(query: string, limit: number) {
  const normalizedQuery = normalizeQuery(query);

  if (!normalizedQuery) {
    return [];
  }

  const assets = await fetchBinanceAssets();

  return rankResults(
    normalizedQuery,
    assets.filter((asset) => {
      const symbol = asset.symbol.toUpperCase();
      const name = asset.name.toUpperCase();
      const market = asset.market?.toUpperCase() || '';

      return (
        symbol.includes(normalizedQuery) ||
        name.includes(normalizedQuery) ||
        market.includes(normalizedQuery)
      );
    })
  ).slice(0, limit);
}

async function searchCoinGeckoCryptoAssets(query: string, limit: number) {
  const rawQuery = query.trim();

  if (rawQuery.length < 2) {
    return [];
  }

  const response = await fetch(`${COINGECKO_SEARCH_URL}?query=${encodeURIComponent(rawQuery)}`);

  if (!response.ok) {
    throw new Error('Unable to fetch CoinGecko search.');
  }

  const payload = await response.json();
  const coins = Array.isArray(payload?.coins) ? payload.coins : [];

  return coins.slice(0, limit).map((coin: any) => {
    const symbol = String(coin?.symbol || '').toUpperCase();
    const name = String(coin?.name || symbol);

    return {
      id: `coingecko-${String(coin?.id || symbol).toLowerCase()}`,
      symbol,
      name,
      assetType: 'crypto' as const,
      currency: 'USD' as const,
      provider: 'coingecko' as const,
      market: 'CoinGecko',
    };
  }).filter((asset: InvestmentAssetSearchResult) => Boolean(asset.symbol));
}

export async function searchInvestmentAssets(
  query: string,
  assetType: 'crypto' | 'stock' | 'fund' | 'etf' | 'bond' | 'other' = 'crypto',
  limit = 12
): Promise<InvestmentAssetSearchResult[]> {
  if (assetType !== 'crypto') {
    return [];
  }

  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2) {
    return [];
  }

  const results: InvestmentAssetSearchResult[] = [];

  try {
    results.push(...(await searchBinanceCryptoAssets(normalizedQuery, limit)));
  } catch {
    // Binance may be blocked or temporarily unavailable. Fall back to CoinGecko.
  }

  if (results.length < limit) {
    try {
      results.push(...(await searchCoinGeckoCryptoAssets(normalizedQuery, limit - results.length)));
    } catch {
      // Manual input remains available in the UI.
    }
  }

  return uniqueBySymbol(rankResults(normalizedQuery, results)).slice(0, limit);
}

export function getProviderLabel(provider: InvestmentAssetSearchProvider) {
  if (provider === 'binance') return 'Binance Provider';
  if (provider === 'coingecko') return 'CoinGecko Provider';

  return 'Provider';
}
