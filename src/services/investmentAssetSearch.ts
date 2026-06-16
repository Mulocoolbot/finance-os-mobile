import { Currency, InvestmentAssetType } from '../types/finance';

export type InvestmentAssetSearchProvider = 'binance' | 'yahoo' | 'manual';

export type InvestmentAssetSearchResult = {
  id: string;
  name: string;
  symbol: string;
  assetType: InvestmentAssetType;
  currency: Currency;
  provider: InvestmentAssetSearchProvider;
  market?: string;
  exchange?: string;
  description?: string;
};

type BinanceExchangeSymbol = {
  symbol?: string;
  status?: string;
  baseAsset?: string;
  quoteAsset?: string;
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

let binanceCatalogCache: InvestmentAssetSearchResult[] | null = null;
let binanceCatalogPromise: Promise<InvestmentAssetSearchResult[]> | null = null;

function normalizeCurrency(value?: string): Currency {
  const normalizedValue = value?.toUpperCase();

  if (normalizedValue === 'IDR') return 'IDR';
  if (normalizedValue === 'EUR') return 'EUR';

  return 'USD';
}

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

function getAssetTypeFromYahooQuote(
  quoteType?: string,
  fallback: InvestmentAssetType = 'stock'
): InvestmentAssetType {
  const normalizedType = quoteType?.toUpperCase();

  if (normalizedType === 'ETF') return 'etf';
  if (normalizedType === 'MUTUALFUND') return 'fund';
  if (normalizedType === 'EQUITY') return 'stock';

  return fallback;
}

function assetMatchesQuery(item: InvestmentAssetSearchResult, query: string) {
  const normalizedQuery = normalizeQuery(query);

  if (!normalizedQuery) {
    return true;
  }

  return (
    item.name.toLowerCase().includes(normalizedQuery) ||
    item.symbol.toLowerCase().includes(normalizedQuery) ||
    item.market?.toLowerCase().includes(normalizedQuery) ||
    item.exchange?.toLowerCase().includes(normalizedQuery)
  );
}

function sortResults(items: InvestmentAssetSearchResult[], query: string) {
  const normalizedQuery = normalizeQuery(query);

  return [...items].sort((firstItem, secondItem) => {
    const firstExact = firstItem.symbol.toLowerCase() === normalizedQuery ? 0 : 1;
    const secondExact = secondItem.symbol.toLowerCase() === normalizedQuery ? 0 : 1;

    if (firstExact !== secondExact) {
      return firstExact - secondExact;
    }

    return firstItem.symbol.localeCompare(secondItem.symbol);
  });
}

function uniqueResults(items: InvestmentAssetSearchResult[]) {
  const seen = new Set<string>();
  const results: InvestmentAssetSearchResult[] = [];

  items.forEach((item) => {
    const key = `${item.provider}-${item.assetType}-${item.symbol.toLowerCase()}`;

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    results.push(item);
  });

  return results;
}

async function fetchWithTimeout(url: string, timeoutMs = 9000) {
  const controller =
    typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeout = setTimeout(() => {
    controller?.abort();
  }, timeoutMs);

  try {
    return await fetch(
      url,
      controller
        ? {
            signal: controller.signal,
          }
        : undefined
    );
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeBinanceCatalog(
  symbols: BinanceExchangeSymbol[]
): InvestmentAssetSearchResult[] {
  const byBaseAsset = new Map<string, InvestmentAssetSearchResult>();

  symbols.forEach((symbolItem) => {
    const baseAsset = symbolItem.baseAsset?.trim().toUpperCase();
    const quoteAsset = symbolItem.quoteAsset?.trim().toUpperCase();
    const marketSymbol = symbolItem.symbol?.trim().toUpperCase();

    if (
      symbolItem.status !== 'TRADING' ||
      !baseAsset ||
      !quoteAsset ||
      !marketSymbol ||
      !['USDT', 'USDC', 'BUSD', 'EUR'].includes(quoteAsset)
    ) {
      return;
    }

    if (byBaseAsset.has(baseAsset) && quoteAsset !== 'USDT') {
      return;
    }

    byBaseAsset.set(baseAsset, {
      id: `binance-crypto-${baseAsset.toLowerCase()}`,
      name: baseAsset,
      symbol: baseAsset,
      assetType: 'crypto',
      currency: quoteAsset === 'EUR' ? 'EUR' : 'USD',
      provider: 'binance',
      market: marketSymbol,
      exchange: 'Binance',
      description: `${baseAsset}/${quoteAsset}`,
    });
  });

  return Array.from(byBaseAsset.values());
}

async function getBinanceCatalog() {
  if (binanceCatalogCache) {
    return binanceCatalogCache;
  }

  if (binanceCatalogPromise) {
    return binanceCatalogPromise;
  }

  binanceCatalogPromise = fetchWithTimeout(
    'https://api.binance.com/api/v3/exchangeInfo'
  )
    .then(async (response) => {
      if (!response.ok) {
        throw new Error('Unable to load Binance asset catalog.');
      }

      const data = await response.json();
      const symbols = Array.isArray(data?.symbols)
        ? (data.symbols as BinanceExchangeSymbol[])
        : [];

      binanceCatalogCache = normalizeBinanceCatalog(symbols);
      return binanceCatalogCache;
    })
    .finally(() => {
      binanceCatalogPromise = null;
    });

  return binanceCatalogPromise;
}

async function searchCryptoFromBinance(query: string, limit: number) {
  const catalog = await getBinanceCatalog();

  return sortResults(
    catalog.filter((item) => assetMatchesQuery(item, query)),
    query
  ).slice(0, limit);
}

async function searchYahooAssets(
  query: string,
  assetType: InvestmentAssetType,
  limit: number
): Promise<InvestmentAssetSearchResult[]> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
    normalizedQuery
  )}&quotesCount=${limit}&newsCount=0`;
  const response = await fetchWithTimeout(url);

  if (!response.ok) {
    throw new Error('Unable to search Yahoo Finance assets.');
  }

  const data = await response.json();
  const quotes = Array.isArray(data?.quotes)
    ? (data.quotes as YahooQuoteResult[])
    : [];
  const results: InvestmentAssetSearchResult[] = [];

  quotes.forEach((quote) => {
    const symbol = quote.symbol?.trim();

    if (!symbol) {
      return;
    }

    const detectedType = getAssetTypeFromYahooQuote(quote.quoteType, assetType);

    if (
      (assetType === 'stock' || assetType === 'etf' || assetType === 'fund') &&
      detectedType !== assetType &&
      quote.quoteType
    ) {
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
      description: quote.quoteType,
    });
  });

  return uniqueResults(results).slice(0, limit);
}

export async function searchInvestmentAssets(
  query: string,
  assetType: InvestmentAssetType,
  limit = 12
): Promise<InvestmentAssetSearchResult[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  try {
    if (assetType === 'crypto') {
      return await searchCryptoFromBinance(trimmedQuery, limit);
    }

    if (assetType === 'stock' || assetType === 'etf' || assetType === 'fund') {
      return await searchYahooAssets(trimmedQuery, assetType, limit);
    }

    return [];
  } catch {
    return [];
  }
}

export function getProviderLabel(provider: InvestmentAssetSearchResult['provider']) {
  if (provider === 'binance') return 'Binance';
  if (provider === 'yahoo') return 'Yahoo Finance';

  return 'Manual';
}

export function getAssetSearchHelperText(assetType: InvestmentAssetType) {
  if (assetType === 'crypto') {
    return 'Search crypto from Binance remote catalog. Results are cached after first load.';
  }

  if (assetType === 'stock' || assetType === 'etf' || assetType === 'fund') {
    return 'Search stock, ETF, or fund from Yahoo Finance remote search.';
  }

  return 'This asset type is mostly manual. Price sync may not be available.';
}
