import { Currency, InvestmentHolding } from '../types/finance';
import { convertCurrencyAmount } from '../utils/currencyConversion';

type ExchangeRates = Record<Currency, number>;

export type InvestmentPriceSyncResult = {
  holdingId: string;
  symbol: string;
  currentPrice: number;
  provider: string;
  sourceUpdatedAt: string;
};

const COINGECKO_ID_MAP: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  ADA: 'cardano',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  LINK: 'chainlink',
  LTC: 'litecoin',
  BCH: 'bitcoin-cash',
  TRX: 'tron',
  UNI: 'uniswap',
  AAVE: 'aave',
  ATOM: 'cosmos',
  NEAR: 'near',
  FIL: 'filecoin',
  ETC: 'ethereum-classic',
  XLM: 'stellar',
  HBAR: 'hedera-hashgraph',
  ICP: 'internet-computer',
  ARB: 'arbitrum',
  OP: 'optimism',
  SUI: 'sui',
  SEI: 'sei-network',
  INJ: 'injective-protocol',
  RENDER: 'render-token',
  FET: 'fetch-ai',
  WLD: 'worldcoin-wld',
  PEPE: 'pepe',
  SHIB: 'shiba-inu',
};

function normalizeCryptoSymbol(symbol: string) {
  return symbol
    .trim()
    .toUpperCase()
    .replace('/USD', '')
    .replace('-USD', '')
    .replace('/USDT', '')
    .replace('-USDT', '')
    .replace('USDT', '')
    .replace('USDC', '')
    .replace('BUSD', '')
    .replace('IDR', '');
}

function normalizeStooqSymbol(symbol: string) {
  const trimmedSymbol = symbol.trim().toLowerCase();

  if (!trimmedSymbol) {
    return trimmedSymbol;
  }

  if (
    trimmedSymbol.includes('.') ||
    trimmedSymbol.startsWith('^') ||
    trimmedSymbol.includes('/')
  ) {
    return trimmedSymbol;
  }

  return `${trimmedSymbol}.us`;
}

function normalizeYahooSymbol(symbol: string) {
  const trimmedSymbol = symbol.trim();

  if (!trimmedSymbol) {
    return trimmedSymbol;
  }

  const lowerSymbol = trimmedSymbol.toLowerCase();

  if (lowerSymbol.endsWith('.us')) {
    return trimmedSymbol.slice(0, -3).toUpperCase();
  }

  return trimmedSymbol.toUpperCase();
}

function inferStooqQuoteCurrency(stooqSymbol: string): Currency {
  const normalizedSymbol = stooqSymbol.toLowerCase();

  if (
    normalizedSymbol.endsWith('.de') ||
    normalizedSymbol.endsWith('.fr') ||
    normalizedSymbol.endsWith('.nl') ||
    normalizedSymbol.endsWith('.mi') ||
    normalizedSymbol.endsWith('.mc') ||
    normalizedSymbol.endsWith('.ls') ||
    normalizedSymbol.endsWith('.at')
  ) {
    return 'EUR';
  }

  if (
    normalizedSymbol.endsWith('.id') ||
    normalizedSymbol.endsWith('.jk') ||
    normalizedSymbol.endsWith('.jkx')
  ) {
    return 'IDR';
  }

  return 'USD';
}

function getBinanceSymbolCandidates(symbol: string, currency: Currency) {
  const baseSymbol = normalizeCryptoSymbol(symbol);
  const candidates = [
    `${baseSymbol}${currency === 'EUR' ? 'EUR' : 'USDT'}`,
    `${baseSymbol}USDT`,
    `${baseSymbol}USDC`,
    `${baseSymbol}BUSD`,
  ];

  return Array.from(new Set(candidates));
}

async function fetchWithTimeout(url: string, provider: string, timeoutMs = 9000) {
  const controller =
    typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeout = setTimeout(() => {
    controller?.abort();
  }, timeoutMs);

  try {
    const response = await fetch(
      url,
      controller
        ? {
            signal: controller.signal,
          }
        : undefined
    );

    return response;
  } catch {
    throw new Error(`${provider} network request failed.`);
  } finally {
    clearTimeout(timeout);
  }
}

function parseStooqQuoteCsv(text: string) {
  const rows = text
    .trim()
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  if (rows.length === 0) {
    throw new Error('Stooq quote is empty.');
  }

  const headerIndex = rows.findIndex((row) => row.toLowerCase().startsWith('symbol,'));
  const dataRow =
    headerIndex >= 0 ? rows[headerIndex + 1] : rows[rows.length - 1];

  if (!dataRow) {
    throw new Error('Stooq quote data is not available.');
  }

  const values = dataRow.split(',').map((item) => item.trim());

  if (values.length < 7) {
    throw new Error('Stooq quote format is invalid.');
  }

  const date = values[1];
  const close = Number(values[6]);

  if (!Number.isFinite(close) || close <= 0) {
    throw new Error('Stooq quote price is invalid.');
  }

  return {
    price: close,
    sourceUpdatedAt: date ? new Date(date).toISOString() : new Date().toISOString(),
  };
}

function parseYahooChartPrice(data: any) {
  const result = data?.chart?.result?.[0];

  if (!result) {
    throw new Error('Yahoo quote is not available.');
  }

  const metaPrice = Number(result?.meta?.regularMarketPrice);

  if (Number.isFinite(metaPrice) && metaPrice > 0) {
    return {
      price: metaPrice,
      sourceUpdatedAt: new Date().toISOString(),
    };
  }

  const closeValues = result?.indicators?.quote?.[0]?.close;
  const latestClose = Array.isArray(closeValues)
    ? [...closeValues].reverse().find((value) => Number.isFinite(Number(value)))
    : null;
  const price = Number(latestClose);

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('Yahoo quote price is invalid.');
  }

  return {
    price,
    sourceUpdatedAt: new Date().toISOString(),
  };
}

async function searchCoinGeckoId(symbol: string) {
  const response = await fetchWithTimeout(
    `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`,
    'CoinGecko'
  );

  if (!response.ok) {
    throw new Error('CoinGecko search is not available.');
  }

  const data = await response.json();
  const coins = Array.isArray(data?.coins) ? data.coins : [];
  const normalizedSymbol = symbol.toLowerCase();
  const exactMatch = coins.find((coin: any) => {
    return typeof coin?.symbol === 'string' && coin.symbol.toLowerCase() === normalizedSymbol;
  });
  const fallbackMatch = coins[0];

  return typeof exactMatch?.id === 'string'
    ? exactMatch.id
    : typeof fallbackMatch?.id === 'string'
      ? fallbackMatch.id
      : null;
}

async function fetchCoinGeckoCryptoPrice(
  holding: InvestmentHolding
): Promise<InvestmentPriceSyncResult> {
  const normalizedSymbol = normalizeCryptoSymbol(holding.symbol);
  const mappedCoinId = COINGECKO_ID_MAP[normalizedSymbol];
  const coinId = mappedCoinId || (await searchCoinGeckoId(normalizedSymbol));

  if (!coinId) {
    throw new Error(`CoinGecko mapping is not available for ${normalizedSymbol}.`);
  }

  const vsCurrency = holding.currency.toLowerCase();
  const response = await fetchWithTimeout(
    `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
      coinId
    )}&vs_currencies=${encodeURIComponent(vsCurrency)}`,
    'CoinGecko'
  );

  if (!response.ok) {
    throw new Error('CoinGecko quote is not available.');
  }

  const data = await response.json();
  const price = Number(data?.[coinId]?.[vsCurrency]);

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('CoinGecko quote price is invalid.');
  }

  return {
    holdingId: holding.id,
    symbol: holding.symbol,
    currentPrice: price,
    provider: 'CoinGecko',
    sourceUpdatedAt: new Date().toISOString(),
  };
}

async function fetchBinanceCryptoPrice(
  holding: InvestmentHolding,
  exchangeRates: ExchangeRates
): Promise<InvestmentPriceSyncResult> {
  const candidates = getBinanceSymbolCandidates(holding.symbol, holding.currency);
  let latestError: Error | null = null;

  for (const binanceSymbol of candidates) {
    try {
      const response = await fetchWithTimeout(
        `https://api.binance.com/api/v3/ticker/price?symbol=${encodeURIComponent(
          binanceSymbol
        )}`,
        'Binance'
      );

      if (!response.ok) {
        throw new Error(`Binance quote is not available for ${binanceSymbol}.`);
      }

      const data = await response.json();
      const marketPrice = Number(data?.price);

      if (!Number.isFinite(marketPrice) || marketPrice <= 0) {
        throw new Error(`Binance quote is invalid for ${binanceSymbol}.`);
      }

      const marketCurrency: Currency = binanceSymbol.endsWith('EUR') ? 'EUR' : 'USD';
      const currentPrice = convertCurrencyAmount(
        marketPrice,
        marketCurrency,
        holding.currency,
        exchangeRates
      );

      return {
        holdingId: holding.id,
        symbol: holding.symbol,
        currentPrice,
        provider: 'Binance',
        sourceUpdatedAt: new Date().toISOString(),
      };
    } catch (error) {
      latestError =
        error instanceof Error
          ? error
          : new Error(`Binance quote failed for ${binanceSymbol}.`);
    }
  }

  throw latestError || new Error('Binance quote is not available.');
}

async function fetchYahooStockPrice(
  holding: InvestmentHolding,
  exchangeRates: ExchangeRates
): Promise<InvestmentPriceSyncResult> {
  const yahooSymbol = normalizeYahooSymbol(holding.symbol);

  if (!yahooSymbol) {
    throw new Error('Yahoo symbol is empty.');
  }

  const response = await fetchWithTimeout(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      yahooSymbol
    )}?range=1d&interval=1d`,
    'Yahoo'
  );

  if (!response.ok) {
    throw new Error(`Yahoo quote is not available for ${yahooSymbol}.`);
  }

  const data = await response.json();
  const parsed = parseYahooChartPrice(data);
  const quoteCurrency: Currency = holding.currency === 'EUR' ? 'EUR' : 'USD';
  const currentPrice = convertCurrencyAmount(
    parsed.price,
    quoteCurrency,
    holding.currency,
    exchangeRates
  );

  return {
    holdingId: holding.id,
    symbol: holding.symbol,
    currentPrice,
    provider: 'Yahoo',
    sourceUpdatedAt: parsed.sourceUpdatedAt,
  };
}

async function fetchStooqStockPrice(
  holding: InvestmentHolding,
  exchangeRates: ExchangeRates
): Promise<InvestmentPriceSyncResult> {
  const stooqSymbol = normalizeStooqSymbol(holding.symbol);

  if (!stooqSymbol) {
    throw new Error('Stooq symbol is empty.');
  }

  const response = await fetchWithTimeout(
    `https://stooq.com/q/l/?s=${encodeURIComponent(stooqSymbol)}&f=sd2t2ohlcv&e=csv`,
    'Stooq'
  );

  if (!response.ok) {
    throw new Error(`Stooq quote is not available for ${stooqSymbol}.`);
  }

  const text = await response.text();
  const parsed = parseStooqQuoteCsv(text);
  const quoteCurrency = inferStooqQuoteCurrency(stooqSymbol);
  const currentPrice = convertCurrencyAmount(
    parsed.price,
    quoteCurrency,
    holding.currency,
    exchangeRates
  );

  return {
    holdingId: holding.id,
    symbol: holding.symbol,
    currentPrice,
    provider: 'Stooq',
    sourceUpdatedAt: parsed.sourceUpdatedAt,
  };
}

export function isPriceSyncSupportedHolding(holding: InvestmentHolding) {
  return (
    holding.assetType === 'crypto' ||
    holding.assetType === 'stock' ||
    holding.assetType === 'etf' ||
    holding.assetType === 'fund'
  );
}

export async function fetchInvestmentPriceForHolding(
  holding: InvestmentHolding,
  exchangeRates: ExchangeRates
): Promise<InvestmentPriceSyncResult> {
  if (holding.assetType === 'crypto') {
    try {
      return await fetchCoinGeckoCryptoPrice(holding);
    } catch {
      return fetchBinanceCryptoPrice(holding, exchangeRates);
    }
  }

  try {
    return await fetchYahooStockPrice(holding, exchangeRates);
  } catch {
    return fetchStooqStockPrice(holding, exchangeRates);
  }
}
