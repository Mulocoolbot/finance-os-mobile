import AsyncStorage from '@react-native-async-storage/async-storage';
import { Currency, InvestmentAssetType } from '../types/finance';

export type InvestmentPriceSyncDetailStatus = 'success' | 'failed' | 'skipped';

export type InvestmentPriceSyncHistoryDetail = {
  holdingId: string;
  symbol: string;
  name: string;
  assetType: InvestmentAssetType;
  currency: Currency;
  status: InvestmentPriceSyncDetailStatus;
  oldPrice: number;
  newPrice: number;
  provider?: string;
  message?: string;
  sourceUpdatedAt?: string;
};

export type InvestmentPriceSyncHistoryItem = {
  id: string;
  syncedAt: string;
  summary: string;
  totalCount: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  providers: string[];
  details: InvestmentPriceSyncHistoryDetail[];
};

const PRICE_SYNC_HISTORY_STORAGE_KEY = 'finance_os_mobile_price_sync_history_v1';
const MAX_PRICE_SYNC_HISTORY_ITEMS = 20;

function isValidDetailStatus(value: unknown): value is InvestmentPriceSyncDetailStatus {
  return value === 'success' || value === 'failed' || value === 'skipped';
}

function isValidHistoryDetail(value: any): value is InvestmentPriceSyncHistoryDetail {
  return (
    value &&
    typeof value.holdingId === 'string' &&
    typeof value.symbol === 'string' &&
    typeof value.name === 'string' &&
    typeof value.assetType === 'string' &&
    (value.currency === 'IDR' || value.currency === 'USD' || value.currency === 'EUR') &&
    isValidDetailStatus(value.status) &&
    typeof value.oldPrice === 'number' &&
    typeof value.newPrice === 'number'
  );
}

function isValidHistoryItem(value: any): value is InvestmentPriceSyncHistoryItem {
  return (
    value &&
    typeof value.id === 'string' &&
    typeof value.syncedAt === 'string' &&
    typeof value.summary === 'string' &&
    typeof value.totalCount === 'number' &&
    typeof value.successCount === 'number' &&
    typeof value.failedCount === 'number' &&
    typeof value.skippedCount === 'number' &&
    Array.isArray(value.providers) &&
    Array.isArray(value.details) &&
    value.details.every(isValidHistoryDetail)
  );
}

export async function loadInvestmentPriceSyncHistory() {
  try {
    const rawValue = await AsyncStorage.getItem(PRICE_SYNC_HISTORY_STORAGE_KEY);
    const parsedValue = rawValue ? JSON.parse(rawValue) : [];

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(isValidHistoryItem);
  } catch {
    return [];
  }
}

export async function saveInvestmentPriceSyncHistory(
  historyItems: InvestmentPriceSyncHistoryItem[]
) {
  try {
    await AsyncStorage.setItem(
      PRICE_SYNC_HISTORY_STORAGE_KEY,
      JSON.stringify(historyItems.slice(0, MAX_PRICE_SYNC_HISTORY_ITEMS))
    );
  } catch {
    // Price sync history is non-critical. Never block the portfolio flow.
  }
}

export async function addInvestmentPriceSyncHistory(
  item: Omit<InvestmentPriceSyncHistoryItem, 'id' | 'syncedAt'>
) {
  const currentHistory = await loadInvestmentPriceSyncHistory();
  const nextItem: InvestmentPriceSyncHistoryItem = {
    ...item,
    id: `price-sync-${Date.now()}`,
    syncedAt: new Date().toISOString(),
  };
  const nextHistory = [nextItem, ...currentHistory].slice(
    0,
    MAX_PRICE_SYNC_HISTORY_ITEMS
  );

  await saveInvestmentPriceSyncHistory(nextHistory);
  return nextItem;
}

export async function clearInvestmentPriceSyncHistory() {
  try {
    await AsyncStorage.removeItem(PRICE_SYNC_HISTORY_STORAGE_KEY);
  } catch {
    // Non-critical local storage failure.
  }
}
