import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createExchangeRateSnapshot } from '../utils/currencyConversion';
import { EMBEDDED_EXCHANGE_RATE_CONFIG } from '../config/exchangeRateConfig';
import {
  Account,
  AccountType,
  ActionResult,
  Budget,
  BudgetPeriod,
  Category,
  CategoryType,
  Currency,
  SavingGoal,
  Transaction,
  TransactionType,
  InvestmentHolding,
  InvestmentAssetType,
  InvestmentOrderType,
  InvestmentOrder,
  InvestmentPriceHistoryPoint,
  InvestmentPriceHistorySource,
  NetWorthSnapshot,
} from '../types/finance';

export type TradingPlatform = 'mt4' | 'mt5';

export type TradingAccountType =
  | 'cent'
  | 'standard'
  | 'ecn'
  | 'demo'
  | 'raw'
  | 'unknown';

export type TradingAccountSyncMode = 'manual' | 'statement_import' | 'auto_sync';

export type TradingAccount = {
  id: string;
  name: string;
  broker: string;
  server: string;
  accountNumber: string;
  linkedBrokerWalletAccountId: string | null;
  platform: TradingPlatform;
  accountType: TradingAccountType;
  leverage: number;
  currency: Currency;
  balance: number;
  equity: number;
  credit: number;
  margin: number;
  freeMargin: number;
  syncMode: TradingAccountSyncMode;
  lastSyncedAt: string | null;
  note?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
};

type AddTradingAccountPayload = {
  name: string;
  broker: string;
  server: string;
  accountNumber: string;
  linkedBrokerWalletAccountId?: string | null;
  platform: TradingPlatform;
  accountType: TradingAccountType;
  leverage: number;
  currency: Currency;
  balance: number;
  equity: number;
  credit?: number;
  margin?: number;
  freeMargin?: number;
  note?: string;
};

type UpdateTradingAccountPayload = AddTradingAccountPayload & {
  tradingAccountId: string;
};

export type TradingCashEventType = 'deposit' | 'withdrawal';

export type TradingCashEvent = {
  id: string;
  tradingAccountId: string;
  linkedBrokerWalletAccountId: string;
  eventType: TradingCashEventType;
  amount: number;
  currency: Currency;
  brokerWalletAmount: number;
  brokerWalletCurrency: Currency;
  tradingAccountRawAmount: number;
  tradingAccountRealAmount: number;
  tradingAccountCurrency: Currency;
  date: string;
  note?: string;
  createdAt: string;
};

type AddTradingCashEventPayload = {
  tradingAccountId: string;
  eventType: TradingCashEventType;
  amount: number;
  currency?: Currency;
  date?: string;
  note?: string;
};

export type TradingPlan = {
  id: string;
  tradingAccountId: string;
  dailyMaxLossPercent: number;
  dailyMaxLossAmount: number;
  dailyProfitTargetPercent: number;
  dailyProfitTargetAmount: number;
  maxTradesPerDay: number;
  riskPerTradePercent: number;
  minimumRewardRiskRatio: number;
  allowedPairs: string[];
  sessionStart: string;
  sessionEnd: string;
  ruleNotes: string;
  mentalChecklist: string[];
  createdAt: string;
  updatedAt?: string;
};

type UpsertTradingPlanPayload = {
  tradingAccountId: string;
  dailyMaxLossPercent: number;
  dailyMaxLossAmount: number;
  dailyProfitTargetPercent: number;
  dailyProfitTargetAmount: number;
  maxTradesPerDay: number;
  riskPerTradePercent: number;
  minimumRewardRiskRatio: number;
  allowedPairs: string[];
  sessionStart: string;
  sessionEnd: string;
  ruleNotes: string;
  mentalChecklist: string[];
};

export type TradingTradeDirection = 'buy' | 'sell';

export type TradingTradeStatus = 'open' | 'closed';

export type TradingTrade = {
  id: string;
  tradingAccountId: string;
  status: TradingTradeStatus;
  pair: string;
  direction: TradingTradeDirection;
  lotSize: number;
  entryPrice: number;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  openDate: string;
  closeDate: string | null;
  grossProfitLoss: number;
  commission: number;
  swap: number;
  netProfitLoss: number;
  currency: Currency;
  accountBalanceSnapshot: number;
  planRiskPercentSnapshot: number;
  planRiskLimitAmountSnapshot: number;
  riskAmount: number;
  rewardRiskRatio: number;
  setupTag: string;
  mistakeTags: string[];
  emotionBefore: string;
  emotionAfter: string;
  note?: string;
  createdAt: string;
  updatedAt?: string;
};

type AddTradingTradePayload = {
  tradingAccountId: string;
  status: TradingTradeStatus;
  pair: string;
  direction: TradingTradeDirection;
  lotSize: number;
  entryPrice: number;
  exitPrice?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  openDate?: string;
  closeDate?: string | null;
  grossProfitLoss?: number;
  commission?: number;
  swap?: number;
  riskAmount?: number;
  rewardRiskRatio?: number;
  setupTag?: string;
  mistakeTags?: string[];
  emotionBefore?: string;
  emotionAfter?: string;
  note?: string;
};

type UpdateTradingTradePayload = AddTradingTradePayload & {
  tradeId: string;
};

type AddAccountPayload = {
  name: string;
  type: AccountType;
  currency: Currency;
  initialBalance: number;
};

type UpdateAccountPayload = {
  accountId: string;
  name: string;
  type: AccountType;
  balance: number;
  note?: string;
};

type AddSavingGoalPayload = {
  name: string;
  targetAmount: number;
  linkedSourceAccountId: string;
  initialAmount: number;
  deadline?: string;
  note?: string;
};

type AddCategoryPayload = {
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
};

type AddBudgetPayload = {
  name: string;
  categoryId: string;
  period: BudgetPeriod;
  limitAmount: number;
  currency?: Currency;
  startDate?: string;
  endDate?: string;
};

type UpdateBudgetPayload = {
  budgetId: string;
  name: string;
  categoryId: string;
  period: BudgetPeriod;
  limitAmount: number;
  currency?: Currency;
  startDate?: string;
  endDate?: string;
};

type AddInvestmentHoldingPayload = {
  accountId: string;
  name: string;
  symbol: string;
  assetType: InvestmentAssetType;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  currency: Currency;
  note?: string;
};

type UpdateInvestmentHoldingPayload = {
  holdingId: string;
  accountId: string;
  name: string;
  symbol: string;
  assetType: InvestmentAssetType;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  currency: Currency;
  note?: string;
};

type UpdateInvestmentHoldingPricePayload = {
  holdingId: string;
  currentPrice: number;
  source?: InvestmentPriceHistorySource;
  provider?: string;
  recordedAt?: string;
};

type UpsertInvestmentPriceHistoryPointPayload = {
  holdingId: string;
  symbol: string;
  name: string;
  assetType: InvestmentAssetType;
  price: number;
  currency: Currency;
  source: InvestmentPriceHistorySource;
  provider?: string;
  recordedAt?: string;
};

type AddInvestmentOrderPayload = {
  holdingId: string;
  orderType: InvestmentOrderType;
  quantity: number;
  price: number;
  fee?: number;
  currency: Currency;
  date?: string;
  note?: string;
};

type BuyInvestmentAssetPayload = {
  accountId: string;
  name: string;
  symbol: string;
  assetType: InvestmentAssetType;
  quantity: number;
  price: number;
  fee: number;
  currency: Currency;
  note?: string;
  provider?: string;
  recordedAt?: string;
};

type AddCryptoIncomePayload = {
  accountId: string;
  holdingId?: string;
  title?: string;
  categoryId?: string;
  categoryName?: string;
  name: string;
  symbol: string;
  quantity: number;
  rate: number;
  rateCurrency: Currency;
  date?: string;
  note?: string;
  provider?: string;
};

type AddCryptoExpensePayload = {
  holdingId: string;
  title?: string;
  categoryId?: string;
  categoryName?: string;
  quantity: number;
  rate: number;
  rateCurrency: Currency;
  date?: string;
  note?: string;
  provider?: string;
};

type UpdateCryptoTransactionDetailsPayload = {
  transactionId: string;
  title: string;
  categoryId?: string;
  date: string;
  note?: string;
  quantity?: number;
};

type AddNetWorthSnapshotPayload = {
  date?: string;
  currency: Currency;
  netWorth: number;
  cashValue: number;
  savingValue: number;
  investmentValue: number;
  liabilityValue?: number;
  note?: string;
};

type AddIncomePayload = {
  accountId: string;
  title: string;
  amount: number;
  currency?: Currency;
  categoryId?: string;
  categoryName?: string;
  date?: string;
  note?: string;
};

type AddExpensePayload = {
  accountId: string;
  title: string;
  amount: number;
  currency?: Currency;
  categoryId?: string;
  categoryName?: string;
  date?: string;
  note?: string;
};

type TransferPayload = {
  fromAccountId: string;
  toAccountId: string;
  title: string;
  amount: number;
  currency?: Currency;
  date?: string;
  note?: string;
};

type UpdateTransactionPayload = {
  transactionId: string;
  title: string;
  amount: number;
  accountId: string;
  categoryId?: string;
  date: string;
  note?: string;
};

type FinanceStore = {
  defaultCurrency: Currency;
  exchangeRates: ExchangeRates;
  exchangeRateMode: ExchangeRateMode;
  exchangeRateLastUpdated: string | null;
  exchangeRateSourceUpdatedAt: string | null;
  exchangeRateNextUpdateAt: string | null;
  exchangeRateProvider: string | null;
  exchangeRateProviderMode: ExchangeRateProviderMode;
  exchangeRateApiKey: string;
  exchangeRateAutoRefreshIntervalMs: number;
  exchangeRateLiveStatus: ExchangeRateLiveStatus;
  exchangeRateLastError: string | null;
  exchangeRateDailyRequestCount: number;
  exchangeRateRequestCountDate: string | null;
  isRefreshingExchangeRates: boolean;
  accounts: Account[];
  transactions: Transaction[];
  savingGoals: SavingGoal[];
  budgets: Budget[];
  categories: Category[];
  investmentHoldings: InvestmentHolding[];
  investmentOrders: InvestmentOrder[];
  investmentPriceHistory: InvestmentPriceHistoryPoint[];
  netWorthSnapshots: NetWorthSnapshot[];
  tradingAccounts: TradingAccount[];
  tradingCashEvents: TradingCashEvent[];
  tradingPlans: TradingPlan[];
  tradingTrades: TradingTrade[];

  hasHydratedFinance: boolean;
  hydrateFinanceData: () => Promise<void>;
  getFinanceExportData: () => string;
  importFinanceData: (rawData: string) => ActionResult;
  setDefaultCurrency: (currency: Currency) => ActionResult;
  setExchangeRate: (currency: Currency, rate: number) => ActionResult;
  setExchangeRateMode: (mode: ExchangeRateMode) => ActionResult;
  setExchangeRateProviderMode: (mode: ExchangeRateProviderMode) => ActionResult;
  setExchangeRateApiKey: (apiKey: string) => ActionResult;
  refreshExchangeRates: () => Promise<ActionResult>;
  refreshExchangeRatesOnAppOpen: () => Promise<ActionResult>;
  refreshExchangeRatesIfStale: () => Promise<ActionResult>;
  lockExistingTransactionsWithCurrentRate: () => ActionResult;

  addAccount: (payload: AddAccountPayload) => ActionResult;
  addTradingAccount: (payload: AddTradingAccountPayload) => ActionResult;
  updateTradingAccount: (payload: UpdateTradingAccountPayload) => ActionResult;
  deleteTradingAccount: (tradingAccountId: string) => ActionResult;
  addTradingCashEvent: (payload: AddTradingCashEventPayload) => ActionResult;
  upsertTradingPlan: (payload: UpsertTradingPlanPayload) => ActionResult;
  deleteTradingPlan: (tradingAccountId: string) => ActionResult;
  addTradingTrade: (payload: AddTradingTradePayload) => ActionResult;
  updateTradingTrade: (payload: UpdateTradingTradePayload) => ActionResult;
  deleteTradingTrade: (tradeId: string) => ActionResult;

  updateAccount: (payload: UpdateAccountPayload) => ActionResult;
  deleteAccount: (accountId: string) => ActionResult;
  permanentlyDeleteAccount: (accountId: string) => ActionResult;
  addSavingGoal: (payload: AddSavingGoalPayload) => ActionResult;
  addCategory: (payload: AddCategoryPayload) => ActionResult;
  addBudget: (payload: AddBudgetPayload) => ActionResult;
  updateBudget: (payload: UpdateBudgetPayload) => ActionResult;
  deleteBudget: (budgetId: string) => ActionResult;
  addInvestmentHolding: (payload: AddInvestmentHoldingPayload) => ActionResult;
  updateInvestmentHolding: (payload: UpdateInvestmentHoldingPayload) => ActionResult;
  buyInvestmentAsset: (payload: BuyInvestmentAssetPayload) => ActionResult;
  addCryptoIncome: (payload: AddCryptoIncomePayload) => ActionResult;
  addCryptoExpense: (payload: AddCryptoExpensePayload) => ActionResult;
  deleteCryptoTransaction: (transactionId: string) => ActionResult;
  updateCryptoTransactionDetails: (payload: UpdateCryptoTransactionDetailsPayload) => ActionResult;
  updateInvestmentHoldingPrice: (payload: UpdateInvestmentHoldingPricePayload) => ActionResult;
  upsertInvestmentPriceHistoryPoint: (
    payload: UpsertInvestmentPriceHistoryPointPayload
  ) => ActionResult;
  backfillInvestmentPriceHistory: () => ActionResult;
  deleteInvestmentHolding: (holdingId: string) => ActionResult;
  addInvestmentOrder: (payload: AddInvestmentOrderPayload) => ActionResult;
  addNetWorthSnapshot: (payload: AddNetWorthSnapshotPayload) => ActionResult;
  upsertTodayNetWorthSnapshot: (payload: AddNetWorthSnapshotPayload) => ActionResult;
  deleteNetWorthSnapshot: (snapshotId: string) => ActionResult;
  addIncome: (payload: AddIncomePayload) => ActionResult;
  addExpense: (payload: AddExpensePayload) => ActionResult;
  deleteTransaction: (transactionId: string) => ActionResult;
  updateTransaction: (payload: UpdateTransactionPayload) => ActionResult;
  transfer: (payload: TransferPayload) => ActionResult;
  transferBalance: (payload: TransferPayload) => ActionResult;
  savingDeposit: (payload: TransferPayload) => ActionResult;
  savingWithdrawal: (payload: TransferPayload) => ActionResult;

  resetDemoData: () => void;
};

const initialAccounts: Account[] = [
  {
    id: 'acc-bca',
    name: 'BCA',
    type: 'bank',
    currency: 'IDR',
    balance: 1000000,
    isActive: true,
  },
  {
    id: 'acc-dana',
    name: 'DANA',
    type: 'e_wallet',
    currency: 'IDR',
    balance: 500000,
    isActive: true,
  },
  {
    id: 'acc-saving-laptop',
    name: 'Saving Laptop',
    type: 'saving',
    currency: 'IDR',
    balance: 500000,
    isActive: true,
  },
  {
    id: 'acc-investment',
    name: 'Investment Portfolio',
    type: 'broker',
    currency: 'IDR',
    balance: 1200000,
    isActive: true,
  },
];

const initialCategories: Category[] = [
  {
    id: 'cat-income-salary',
    name: 'Salary',
    type: 'income',
    icon: 'briefcase-outline',
    color: '#22C55E',
    isDefault: true,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cat-income-side-job',
    name: 'Side Job',
    type: 'income',
    icon: 'laptop-outline',
    color: '#38BDF8',
    isDefault: true,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cat-income-freelance',
    name: 'Freelance',
    type: 'income',
    icon: 'code-slash-outline',
    color: '#A855F7',
    isDefault: true,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cat-income-trading-profit',
    name: 'Trading Profit',
    type: 'income',
    icon: 'trending-up-outline',
    color: '#F59E0B',
    isDefault: true,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cat-income-other',
    name: 'Other Income',
    type: 'income',
    icon: 'add-circle-outline',
    color: '#D4D4D4',
    isDefault: true,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cat-expense-food',
    name: 'Food & Drink',
    type: 'expense',
    icon: 'fast-food-outline',
    color: '#EF4444',
    isDefault: true,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cat-expense-transport',
    name: 'Transport',
    type: 'expense',
    icon: 'car-outline',
    color: '#38BDF8',
    isDefault: true,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cat-expense-shopping',
    name: 'Shopping',
    type: 'expense',
    icon: 'bag-outline',
    color: '#A855F7',
    isDefault: true,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cat-expense-education',
    name: 'Education',
    type: 'expense',
    icon: 'school-outline',
    color: '#F59E0B',
    isDefault: true,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cat-expense-health',
    name: 'Health',
    type: 'expense',
    icon: 'medkit-outline',
    color: '#22C55E',
    isDefault: true,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cat-expense-bills',
    name: 'Bills',
    type: 'expense',
    icon: 'receipt-outline',
    color: '#F97316',
    isDefault: true,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cat-expense-other',
    name: 'Other Expense',
    type: 'expense',
    icon: 'ellipsis-horizontal-circle-outline',
    color: '#D4D4D4',
    isDefault: true,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

const initialSavingGoals: SavingGoal[] = [
  {
    id: 'saving-goal-laptop',
    name: 'Saving Laptop',
    targetAmount: 5000000,
    currentAmount: 500000,
    currency: 'IDR',
    savingAccountId: 'acc-saving-laptop',
    linkedSourceAccountId: 'acc-bca',
    deadline: '2026-12-31',
    status: 'active',
  },
];

const initialBudgets: Budget[] = [
  {
    id: 'budget-food',
    name: 'Food Budget',
    categoryId: 'cat-expense-food',
    categoryName: 'Food & Drink',
    period: 'monthly',
    limitAmount: 1000000,
    currency: 'IDR',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'budget-transport',
    name: 'Transport Budget',
    categoryId: 'cat-expense-transport',
    categoryName: 'Transport',
    period: 'monthly',
    limitAmount: 500000,
    currency: 'IDR',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

const initialTransactions: Transaction[] = [
  {
    id: 'trx-income-demo',
    type: 'income',
    title: 'Side Job',
    amount: 750000,
    currency: 'IDR',
    accountId: 'acc-bca',
    accountName: 'BCA',
    categoryId: 'cat-income-side-job',
    categoryName: 'Side Job',
    date: new Date().toISOString(),
  },
  {
    id: 'trx-expense-demo',
    type: 'expense',
    title: 'Coffee',
    amount: 25000,
    currency: 'IDR',
    accountId: 'acc-dana',
    accountName: 'DANA',
    categoryId: 'cat-expense-food',
    categoryName: 'Food & Drink',
    date: new Date().toISOString(),
  },
];

function getTradingPlanForAccountSnapshot(
  tradingPlans: TradingPlan[],
  tradingAccountId: string
) {
  return tradingPlans.find((plan) => plan.tradingAccountId === tradingAccountId);
}

function getTradingAccountRealBalanceSnapshot(account: TradingAccount) {
  if (account.accountType === 'cent') {
    return (account.balance || 0) / 100;
  }

  return account.balance || 0;
}

function getTradingPlanRiskLimitSnapshot(
  account: TradingAccount,
  plan: TradingPlan | undefined
) {
  const realBalance = getTradingAccountRealBalanceSnapshot(account);
  const riskPercent = plan?.riskPerTradePercent || 0;

  return {
    accountBalanceSnapshot: realBalance,
    planRiskPercentSnapshot: riskPercent,
    planRiskLimitAmountSnapshot: (realBalance * riskPercent) / 100,
  };
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getTodayISO() {
  return new Date().toISOString();
}

function getLocalDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getLocalMonthKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 7);
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');

  return `${year}-${month}`;
}

function getLocalYearKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 4);
  }

  return `${date.getFullYear()}`;
}

function createInvestmentPriceHistoryPoint(
  payload: UpsertInvestmentPriceHistoryPointPayload
): InvestmentPriceHistoryPoint {
  const recordedAt = payload.recordedAt || new Date().toISOString();

  return {
    id: `price-history-${payload.holdingId}-${getLocalDateKey(recordedAt)}`,
    holdingId: payload.holdingId,
    symbol: payload.symbol.trim().toUpperCase(),
    name: payload.name.trim(),
    assetType: payload.assetType,
    price: Math.max(payload.price || 0, 0),
    currency: payload.currency,
    source: payload.source,
    provider: payload.provider?.trim() || undefined,
    recordedAt,
    dayKey: getLocalDateKey(recordedAt),
    monthKey: getLocalMonthKey(recordedAt),
    yearKey: getLocalYearKey(recordedAt),
  };
}

function upsertDailyInvestmentPriceHistoryPoint(
  history: InvestmentPriceHistoryPoint[],
  point: InvestmentPriceHistoryPoint
) {
  const existingIndex = history.findIndex(
    (item) => item.holdingId === point.holdingId && item.dayKey === point.dayKey
  );

  if (existingIndex < 0) {
    return [point, ...history];
  }

  return history.map((item, index) => (index === existingIndex ? point : item));
}

function isSameInvestmentAsset(
  holding: InvestmentHolding,
  payload: {
    accountId: string;
    symbol: string;
    assetType: InvestmentAssetType;
    currency: Currency;
  }
) {
  return (
    holding.accountId === payload.accountId &&
    holding.symbol.trim().toUpperCase() === payload.symbol.trim().toUpperCase() &&
    holding.assetType === payload.assetType &&
    holding.currency === payload.currency
  );
}

function backfillInvestmentPriceHistoryForHoldings(
  holdings: InvestmentHolding[],
  history: InvestmentPriceHistoryPoint[]
) {
  let nextHistory = Array.isArray(history) ? [...history] : [];

  holdings.forEach((holding) => {
    const alreadyHasHistory = nextHistory.some(
      (point) => point.holdingId === holding.id
    );

    if (alreadyHasHistory) {
      return;
    }

    const startingPrice =
      holding.currentPrice > 0
        ? holding.currentPrice
        : holding.averagePrice > 0
          ? holding.averagePrice
          : 0;

    if (startingPrice <= 0) {
      return;
    }

    const recordedAt =
      holding.createdAt || holding.updatedAt || new Date().toISOString();
    const initialPoint = createInvestmentPriceHistoryPoint({
      holdingId: holding.id,
      symbol: holding.symbol,
      name: holding.name,
      assetType: holding.assetType,
      price: startingPrice,
      currency: holding.currency,
      source: 'initial',
      recordedAt,
    });

    nextHistory = upsertDailyInvestmentPriceHistoryPoint(
      nextHistory,
      initialPoint
    );
  });

  return nextHistory.sort((firstPoint, secondPoint) => {
    return (
      new Date(secondPoint.recordedAt).getTime() -
      new Date(firstPoint.recordedAt).getTime()
    );
  });
}

function getSavingStatus(
  currentAmount: number,
  targetAmount: number
): SavingGoal['status'] {
  return currentAmount >= targetAmount ? 'completed' : 'active';
}

function getCategoryFallbackName(type: CategoryType | TransactionType) {
  return type === 'income' ? 'Other Income' : 'Other Expense';
}

const FINANCE_STORAGE_KEY = 'finance-os-mobile-finance-data';
const FINANCE_BACKUP_STORAGE_KEY = 'finance-os-mobile-finance-data-backup-v1';
const FINANCE_LEGACY_STORAGE_KEYS = ['finance-os-mobile-storage'];

const defaultExchangeRates: ExchangeRates = {
  IDR: 1,
  USD: 16000,
  EUR: 17500,
};

const DEFAULT_EXCHANGE_RATE_MODE: ExchangeRateMode = 'auto';
const DEFAULT_EXCHANGE_RATE_PROVIDER_MODE: ExchangeRateProviderMode = EMBEDDED_EXCHANGE_RATE_CONFIG.defaultProviderMode;
const OPEN_EXCHANGE_RATE_AUTO_REFRESH_INTERVAL_MS = EMBEDDED_EXCHANGE_RATE_CONFIG.openProviderRefreshIntervalMs;
const REALTIME_EXCHANGE_RATE_AUTO_REFRESH_INTERVAL_MS = EMBEDDED_EXCHANGE_RATE_CONFIG.realtimeRefreshIntervalMs;

export type ExchangeRates = Record<Currency, number>;
export type ExchangeRateMode = 'manual' | 'auto';
export type ExchangeRateProviderMode = 'open' | 'alpha_vantage_realtime';
export type ExchangeRateLiveStatus =
  | 'idle'
  | 'updating'
  | 'live'
  | 'rate_limited'
  | 'failed'
  | 'fallback';

type ExchangeRateFetchResult = {
  rates: ExchangeRates;
  provider: string;
  sourceUpdatedAt: string | null;
  nextUpdateAt: string | null;
};

type PersistedFinanceState = {
  defaultCurrency: Currency;
  exchangeRates: ExchangeRates;
  exchangeRateMode: ExchangeRateMode;
  exchangeRateLastUpdated: string | null;
  exchangeRateSourceUpdatedAt: string | null;
  exchangeRateNextUpdateAt: string | null;
  exchangeRateProvider: string | null;
  exchangeRateProviderMode: ExchangeRateProviderMode;
  exchangeRateApiKey: string;
  exchangeRateAutoRefreshIntervalMs: number;
  exchangeRateLiveStatus: ExchangeRateLiveStatus;
  exchangeRateLastError: string | null;
  exchangeRateDailyRequestCount: number;
  exchangeRateRequestCountDate: string | null;
  accounts: Account[];
  transactions: Transaction[];
  savingGoals: SavingGoal[];
  budgets: Budget[];
  categories: Category[];
  investmentHoldings: InvestmentHolding[];
  investmentOrders: InvestmentOrder[];
  investmentPriceHistory: InvestmentPriceHistoryPoint[];
  netWorthSnapshots: NetWorthSnapshot[];
  tradingAccounts: TradingAccount[];
  tradingCashEvents: TradingCashEvent[];
  tradingPlans: TradingPlan[];
  tradingTrades: TradingTrade[];
};

function getInitialFinanceState(): PersistedFinanceState {
  return {
    defaultCurrency: 'IDR',
    exchangeRates: defaultExchangeRates,
    exchangeRateMode: DEFAULT_EXCHANGE_RATE_MODE,
    exchangeRateLastUpdated: null,
    exchangeRateSourceUpdatedAt: null,
    exchangeRateNextUpdateAt: null,
    exchangeRateProvider: null,
    exchangeRateProviderMode: DEFAULT_EXCHANGE_RATE_PROVIDER_MODE,
    exchangeRateApiKey: EMBEDDED_EXCHANGE_RATE_CONFIG.alphaVantageApiKey,
    exchangeRateAutoRefreshIntervalMs: REALTIME_EXCHANGE_RATE_AUTO_REFRESH_INTERVAL_MS,
    exchangeRateLiveStatus: 'idle',
    exchangeRateLastError: null,
    exchangeRateDailyRequestCount: 0,
    exchangeRateRequestCountDate: null,
    accounts: initialAccounts,
    transactions: initialTransactions,
    savingGoals: initialSavingGoals,
    budgets: initialBudgets,
    categories: initialCategories,
    investmentHoldings: [],
    investmentOrders: [],
    investmentPriceHistory: [],
    netWorthSnapshots: [],
    tradingAccounts: [],
    tradingCashEvents: [],
    tradingPlans: [],
    tradingTrades: [],
  };
}

function getPersistableFinanceState(
  state: PersistedFinanceState
): PersistedFinanceState {
  return {
    defaultCurrency: state.defaultCurrency,
    exchangeRates: state.exchangeRates,
    exchangeRateMode: state.exchangeRateMode,
    exchangeRateLastUpdated: state.exchangeRateLastUpdated,
    exchangeRateSourceUpdatedAt: state.exchangeRateSourceUpdatedAt,
    exchangeRateNextUpdateAt: state.exchangeRateNextUpdateAt,
    exchangeRateProvider: state.exchangeRateProvider,
    exchangeRateProviderMode: state.exchangeRateProviderMode,
    exchangeRateApiKey: state.exchangeRateApiKey,
    exchangeRateAutoRefreshIntervalMs: state.exchangeRateAutoRefreshIntervalMs,
    exchangeRateLiveStatus: state.exchangeRateLiveStatus,
    exchangeRateLastError: state.exchangeRateLastError,
    exchangeRateDailyRequestCount: state.exchangeRateDailyRequestCount,
    exchangeRateRequestCountDate: state.exchangeRateRequestCountDate,
    accounts: state.accounts,
    transactions: state.transactions,
    savingGoals: state.savingGoals,
    budgets: state.budgets,
    categories: state.categories,
    investmentHoldings: state.investmentHoldings,
    investmentOrders: state.investmentOrders,
    investmentPriceHistory: state.investmentPriceHistory,
    netWorthSnapshots: state.netWorthSnapshots,
    tradingAccounts: state.tradingAccounts,
    tradingCashEvents: state.tradingCashEvents,
    tradingPlans: state.tradingPlans,
    tradingTrades: state.tradingTrades,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isCurrency(value: unknown): value is Currency {
  return value === 'IDR' || value === 'USD' || value === 'EUR';
}

function isExchangeRateMode(value: unknown): value is ExchangeRateMode {
  return value === 'manual' || value === 'auto';
}

function isExchangeRates(value: unknown): value is ExchangeRates {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.IDR === 'number' &&
    typeof value.USD === 'number' &&
    typeof value.EUR === 'number' &&
    value.IDR > 0 &&
    value.USD > 0 &&
    value.EUR > 0
  );
}

function normalizePersistedFinanceState(
  value: unknown
): PersistedFinanceState | null {
  if (!isRecord(value)) {
    return null;
  }

  const hasAnyKnownFinanceData =
    Array.isArray(value.accounts) ||
    Array.isArray(value.transactions) ||
    Array.isArray(value.savingGoals) ||
    Array.isArray(value.budgets) ||
    Array.isArray(value.categories) ||
    Array.isArray(value.investmentHoldings) ||
    Array.isArray(value.investmentOrders) ||
    Array.isArray(value.netWorthSnapshots) ||
    Array.isArray(value.tradingAccounts) ||
    Array.isArray(value.tradingCashEvents) ||
    Array.isArray(value.tradingPlans) ||
    Array.isArray(value.tradingTrades);

  if (!hasAnyKnownFinanceData) {
    return null;
  }

  return {
    defaultCurrency: isCurrency(value.defaultCurrency) ? value.defaultCurrency : 'IDR',
    exchangeRates: isExchangeRates(value.exchangeRates)
      ? value.exchangeRates
      : defaultExchangeRates,
    exchangeRateMode: 'auto',
    exchangeRateLastUpdated:
      typeof value.exchangeRateLastUpdated === 'string'
        ? value.exchangeRateLastUpdated
        : null,
    exchangeRateSourceUpdatedAt:
      typeof value.exchangeRateSourceUpdatedAt === 'string'
        ? value.exchangeRateSourceUpdatedAt
        : null,
    exchangeRateNextUpdateAt:
      typeof value.exchangeRateNextUpdateAt === 'string'
        ? value.exchangeRateNextUpdateAt
        : null,
    exchangeRateProvider:
      typeof value.exchangeRateProvider === 'string'
        ? value.exchangeRateProvider
        : null,
    exchangeRateProviderMode: 'alpha_vantage_realtime',
    exchangeRateApiKey:
      typeof value.exchangeRateApiKey === 'string' && value.exchangeRateApiKey.trim()
        ? value.exchangeRateApiKey
        : EMBEDDED_EXCHANGE_RATE_CONFIG.alphaVantageApiKey,
    exchangeRateAutoRefreshIntervalMs: REALTIME_EXCHANGE_RATE_AUTO_REFRESH_INTERVAL_MS,
    exchangeRateLiveStatus:
      value.exchangeRateLiveStatus === 'updating' ||
      value.exchangeRateLiveStatus === 'live' ||
      value.exchangeRateLiveStatus === 'rate_limited' ||
      value.exchangeRateLiveStatus === 'failed' ||
      value.exchangeRateLiveStatus === 'fallback'
        ? value.exchangeRateLiveStatus
        : 'idle',
    exchangeRateLastError:
      typeof value.exchangeRateLastError === 'string'
        ? value.exchangeRateLastError
        : null,
    exchangeRateDailyRequestCount:
      typeof value.exchangeRateDailyRequestCount === 'number' &&
      Number.isFinite(value.exchangeRateDailyRequestCount)
        ? value.exchangeRateDailyRequestCount
        : 0,
    exchangeRateRequestCountDate:
      typeof value.exchangeRateRequestCountDate === 'string'
        ? value.exchangeRateRequestCountDate
        : null,
    accounts: Array.isArray(value.accounts)
      ? (value.accounts as Account[])
      : initialAccounts,
    transactions: Array.isArray(value.transactions)
      ? (value.transactions as Transaction[])
      : [],
    savingGoals: Array.isArray(value.savingGoals)
      ? (value.savingGoals as SavingGoal[])
      : [],
    budgets: Array.isArray(value.budgets)
      ? (value.budgets as Budget[])
      : [],
    categories: Array.isArray(value.categories)
      ? (value.categories as Category[])
      : initialCategories,
    investmentHoldings: Array.isArray(value.investmentHoldings)
      ? (value.investmentHoldings as InvestmentHolding[])
      : [],
    investmentOrders: Array.isArray(value.investmentOrders)
      ? (value.investmentOrders as InvestmentOrder[])
      : [],
    investmentPriceHistory: backfillInvestmentPriceHistoryForHoldings(
      Array.isArray(value.investmentHoldings)
        ? (value.investmentHoldings as InvestmentHolding[])
        : [],
      Array.isArray(value.investmentPriceHistory)
        ? (value.investmentPriceHistory as InvestmentPriceHistoryPoint[])
        : []
    ),
    netWorthSnapshots: Array.isArray(value.netWorthSnapshots)
      ? (value.netWorthSnapshots as NetWorthSnapshot[])
      : [],
    tradingAccounts: Array.isArray(value.tradingAccounts)
      ? (value.tradingAccounts as TradingAccount[])
      : [],
    tradingCashEvents: Array.isArray(value.tradingCashEvents)
      ? (value.tradingCashEvents as TradingCashEvent[])
      : [],
    tradingPlans: Array.isArray(value.tradingPlans)
      ? (value.tradingPlans as TradingPlan[])
      : [],
    tradingTrades: Array.isArray(value.tradingTrades)
      ? (value.tradingTrades as TradingTrade[]).map((trade) => ({
          ...trade,
          accountBalanceSnapshot: trade.accountBalanceSnapshot || 0,
          planRiskPercentSnapshot: trade.planRiskPercentSnapshot || 0,
          planRiskLimitAmountSnapshot: trade.planRiskLimitAmountSnapshot || 0,
        }))
      : [],
  };
}

async function readNormalizedFinanceStateFromKey(storageKey: string) {
  try {
    const storedFinanceData = await AsyncStorage.getItem(storageKey);

    if (!storedFinanceData) {
      return null;
    }

    const parsedFinanceData = JSON.parse(storedFinanceData);
    const normalizedFinanceData = normalizePersistedFinanceState(parsedFinanceData);

    if (!normalizedFinanceData) {
      return null;
    }

    return {
      rawData: storedFinanceData,
      normalizedFinanceData,
    };
  } catch {
    return null;
  }
}

function scoreFinanceStateForRecovery(state: PersistedFinanceState) {
  return (
    state.tradingAccounts.length * 1000 +
    state.tradingTrades.length * 900 +
    state.tradingCashEvents.length * 800 +
    state.tradingPlans.length * 700 +
    state.investmentHoldings.length * 600 +
    state.investmentOrders.length * 500 +
    state.transactions.length * 50 +
    state.accounts.length * 40 +
    state.savingGoals.length * 30 +
    state.budgets.length * 20 +
    state.categories.length
  );
}

function saveFinanceState(state: PersistedFinanceState) {
  const nextPayload = JSON.stringify(getPersistableFinanceState(state));

  AsyncStorage.getItem(FINANCE_STORAGE_KEY)
    .then((currentPayload) => {
      if (currentPayload && currentPayload !== nextPayload) {
        return AsyncStorage.setItem(FINANCE_BACKUP_STORAGE_KEY, currentPayload);
      }

      return Promise.resolve();
    })
    .then(() => AsyncStorage.setItem(FINANCE_STORAGE_KEY, nextPayload))
    .catch(() => {
      // Keep the app usable even if local save fails.
    });
}


type FinanceExportFile = {
  app: 'Finance OS Mobile';
  version: 1;
  exportedAt: string;
  data: PersistedFinanceState;
};

function isFinanceExportFile(value: unknown): value is FinanceExportFile {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.app === 'Finance OS Mobile' &&
    value.version === 1 &&
    typeof value.exportedAt === 'string' &&
    Boolean(normalizePersistedFinanceState(value.data))
  );
}

function parseImportedFinanceData(rawData: string): PersistedFinanceState | null {
  try {
    const parsedData = JSON.parse(rawData);

    if (isFinanceExportFile(parsedData)) {
      return normalizePersistedFinanceState(parsedData.data);
    }

    return normalizePersistedFinanceState(parsedData);
  } catch {
    return null;
  }
}




function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getNormalizedRequestUsage(
  requestCountDate: string | null,
  dailyRequestCount: number
) {
  const todayKey = getTodayKey();

  if (requestCountDate !== todayKey) {
    return {
      requestCountDate: todayKey,
      dailyRequestCount: 0,
    };
  }

  return {
    requestCountDate: todayKey,
    dailyRequestCount: Math.max(dailyRequestCount || 0, 0),
  };
}

function isLikelyRateLimitMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes('limit') ||
    normalizedMessage.includes('frequency') ||
    normalizedMessage.includes('premium') ||
    normalizedMessage.includes('standard api rate')
  );
}

function getDailyRequestLimit() {
  return EMBEDDED_EXCHANGE_RATE_CONFIG.dailyRequestLimit || 25;
}

function getRequestsPerFullRefresh() {
  return EMBEDDED_EXCHANGE_RATE_CONFIG.requestsPerFullRefresh || 2;
}

function getIsoFromUnixTimestamp(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return new Date(value * 1000).toISOString();
}

function isExchangeRateStale(lastUpdated: string | null, intervalMs: number) {
  if (!lastUpdated) {
    return true;
  }

  const lastUpdatedTime = new Date(lastUpdated).getTime();

  if (Number.isNaN(lastUpdatedTime)) {
    return true;
  }

  return Date.now() - lastUpdatedTime >= intervalMs;
}


function parseAlphaVantageExchangeRateResponse(data: any, fromCurrency: Currency, toCurrency: Currency) {
  const payload = data?.['Realtime Currency Exchange Rate'];

  if (!payload) {
    const note = typeof data?.Note === 'string' ? data.Note : null;
    const information = typeof data?.Information === 'string' ? data.Information : null;
    const message = note || information || `Invalid Alpha Vantage ${fromCurrency}/${toCurrency} response.`;

    throw new Error(message);
  }

  const rawRate = payload?.['5. Exchange Rate'];
  const rate = Number(rawRate);
  const lastRefreshed = payload?.['6. Last Refreshed'];

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Invalid Alpha Vantage ${fromCurrency}/${toCurrency} rate.`);
  }

  return {
    rate,
    lastRefreshed:
      typeof lastRefreshed === 'string'
        ? new Date(`${lastRefreshed.replace(' ', 'T')}Z`).toISOString()
        : new Date().toISOString(),
  };
}

async function fetchAlphaVantagePairRate(
  fromCurrency: Currency,
  toCurrency: Currency,
  apiKey: string
) {
  const endpoint = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${fromCurrency}&to_currency=${toCurrency}&apikey=${encodeURIComponent(
    apiKey
  )}`;
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${fromCurrency}/${toCurrency} from Alpha Vantage.`);
  }

  const data = await response.json();

  return parseAlphaVantageExchangeRateResponse(data, fromCurrency, toCurrency);
}

async function fetchAlphaVantageRealtimeRates(apiKey: string): Promise<ExchangeRateFetchResult> {
  const trimmedApiKey = apiKey.trim();

  if (!trimmedApiKey || trimmedApiKey === 'PASTE_YOUR_ALPHA_VANTAGE_API_KEY_HERE') {
    throw new Error('Alpha Vantage API key is required for realtime exchange rate.');
  }

  const [usdIdr, eurIdr] = await Promise.all([
    fetchAlphaVantagePairRate('USD', 'IDR', trimmedApiKey),
    fetchAlphaVantagePairRate('EUR', 'IDR', trimmedApiKey),
  ]);

  const sourceUpdatedAt =
    new Date(usdIdr.lastRefreshed).getTime() >= new Date(eurIdr.lastRefreshed).getTime()
      ? usdIdr.lastRefreshed
      : eurIdr.lastRefreshed;

  return {
    rates: {
      IDR: 1,
      USD: usdIdr.rate,
      EUR: eurIdr.rate,
    },
    provider: 'alpha_vantage_realtime',
    sourceUpdatedAt,
    nextUpdateAt: null,
  };
}

async function fetchOpenExchangeRateApiRates(): Promise<ExchangeRateFetchResult> {
  const response = await fetch('https://open.er-api.com/v6/latest/USD');

  if (!response.ok) {
    throw new Error('Failed to fetch exchange rates from Open ExchangeRate-API.');
  }

  const data = await response.json();
  const idrPerUsd = data?.rates?.IDR;
  const eurPerUsd = data?.rates?.EUR;

  if (
    typeof idrPerUsd !== 'number' ||
    typeof eurPerUsd !== 'number' ||
    !Number.isFinite(idrPerUsd) ||
    !Number.isFinite(eurPerUsd) ||
    idrPerUsd <= 0 ||
    eurPerUsd <= 0
  ) {
    throw new Error('Invalid Open ExchangeRate-API response.');
  }

  return {
    rates: {
      IDR: 1,
      USD: idrPerUsd,
      EUR: idrPerUsd / eurPerUsd,
    },
    provider: 'open.er-api.com',
    sourceUpdatedAt: getIsoFromUnixTimestamp(data?.time_last_update_unix),
    nextUpdateAt: getIsoFromUnixTimestamp(data?.time_next_update_unix),
  };
}

async function fetchFrankfurterRates(): Promise<ExchangeRateFetchResult> {
  const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=IDR,EUR');

  if (!response.ok) {
    throw new Error('Failed to fetch exchange rates from Frankfurter.');
  }

  const data = await response.json();
  const idrPerUsd = data?.rates?.IDR;
  const eurPerUsd = data?.rates?.EUR;

  if (
    typeof idrPerUsd !== 'number' ||
    typeof eurPerUsd !== 'number' ||
    !Number.isFinite(idrPerUsd) ||
    !Number.isFinite(eurPerUsd) ||
    idrPerUsd <= 0 ||
    eurPerUsd <= 0
  ) {
    throw new Error('Invalid Frankfurter response.');
  }

  return {
    rates: {
      IDR: 1,
      USD: idrPerUsd,
      EUR: idrPerUsd / eurPerUsd,
    },
    provider: 'frankfurter.app',
    sourceUpdatedAt: typeof data?.date === 'string' ? new Date(data.date).toISOString() : null,
    nextUpdateAt: null,
  };
}

async function fetchLatestExchangeRates(
  providerMode: ExchangeRateProviderMode,
  apiKey: string
): Promise<ExchangeRateFetchResult> {
  if (providerMode === 'alpha_vantage_realtime') {
    try {
      return await fetchAlphaVantageRealtimeRates(apiKey);
    } catch {
      try {
        return await fetchOpenExchangeRateApiRates();
      } catch {
        return fetchFrankfurterRates();
      }
    }
  }

  try {
    return await fetchOpenExchangeRateApiRates();
  } catch {
    return fetchFrankfurterRates();
  }
}


function convertAmountBetweenCurrencies(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  exchangeRates: ExchangeRates
) {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const fromRate = exchangeRates[fromCurrency] || 1;
  const toRate = exchangeRates[toCurrency] || 1;

  const amountInIdr = amount * fromRate;

  return amountInIdr / toRate;
}

function resolveTransactionCurrency(
  selectedCurrency: Currency | undefined,
  fallbackCurrency: Currency
) {
  return selectedCurrency || fallbackCurrency;
}



function buildHistoricalTransactionSnapshot(
  amount: number,
  transactionCurrency: Currency,
  baseCurrency: Currency,
  accountCurrency: Currency,
  exchangeRates: ExchangeRates
) {
  const exchangeRateSnapshot = createExchangeRateSnapshot(exchangeRates);
  const baseAmountAtTransaction = convertAmountBetweenCurrencies(
    amount,
    transactionCurrency,
    baseCurrency,
    exchangeRateSnapshot
  );
  const accountAmountAtTransaction = convertAmountBetweenCurrencies(
    amount,
    transactionCurrency,
    accountCurrency,
    exchangeRateSnapshot
  );

  return {
    baseCurrencyAtTransaction: baseCurrency,
    baseAmountAtTransaction,
    exchangeRateSnapshot,
    accountCurrencyAtTransaction: accountCurrency,
    accountAmountAtTransaction,
  };
}

function isTransactionLinkedToAccount(transaction: Transaction, accountId: string) {
  return (
    transaction.accountId === accountId ||
    transaction.fromAccountId === accountId ||
    transaction.toAccountId === accountId
  );
}

function isSavingGoalLinkedToAccount(savingGoal: SavingGoal, accountId: string) {
  return (
    savingGoal.savingAccountId === accountId ||
    savingGoal.linkedSourceAccountId === accountId
  );
}

function getEditableTransactionAccountAmount(
  transaction: Transaction,
  account: Account,
  exchangeRates: ExchangeRates
) {
  if (
    Number.isFinite(transaction.accountAmountAtTransaction) &&
    transaction.accountCurrencyAtTransaction === account.currency
  ) {
    return transaction.accountAmountAtTransaction || 0;
  }

  return convertAmountBetweenCurrencies(
    transaction.amount,
    transaction.currency || account.currency,
    account.currency,
    transaction.exchangeRateSnapshot || exchangeRates
  );
}

function getEditableTransactionDelta(type: TransactionType, accountAmount: number) {
  if (type === 'income') {
    return accountAmount;
  }

  if (type === 'expense') {
    return -accountAmount;
  }

  return 0;
}

function canEditTransactionDirectly(transaction: Transaction) {
  return transaction.type === 'income' || transaction.type === 'expense';
}


function createTradingAccount(payload: AddTradingAccountPayload): TradingAccount {
  const now = new Date().toISOString();

  return {
    id: `trading-account-${Date.now()}`,
    name: payload.name.trim(),
    broker: payload.broker.trim(),
    server: payload.server.trim(),
    accountNumber: payload.accountNumber.trim(),
    linkedBrokerWalletAccountId: payload.linkedBrokerWalletAccountId || null,
    platform: payload.platform,
    accountType: payload.accountType,
    leverage: payload.leverage,
    currency: payload.currency,
    balance: payload.balance,
    equity: payload.equity,
    credit: payload.credit || 0,
    margin: payload.margin || 0,
    freeMargin: payload.freeMargin || payload.equity,
    syncMode: 'manual',
    lastSyncedAt: null,
    note: payload.note?.trim() || undefined,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

function validateTradingAccountPayload(payload: AddTradingAccountPayload): string | null {
  if (!payload.name.trim()) {
    return 'Trading account name is required.';
  }

  if (!payload.broker.trim()) {
    return 'Broker name is required.';
  }

  if (!payload.server.trim()) {
    return 'Server is required.';
  }

  if (!payload.accountNumber.trim()) {
    return 'Account number is required.';
  }

  if (!Number.isFinite(payload.leverage) || payload.leverage <= 0) {
    return 'Leverage must be greater than 0.';
  }
  if (payload.accountType === 'cent' && payload.currency !== 'USD') {
    return 'Cent account only supports USD currency.';
  }


  if (!Number.isFinite(payload.balance) || payload.balance < 0) {
    return 'Balance must be 0 or greater.';
  }

  if (!Number.isFinite(payload.equity) || payload.equity < 0) {
    return 'Equity must be 0 or greater.';
  }

  return null;
}


type TransferEndpointKind = 'finance' | 'trading';

type TransferEndpoint = {
  id: string;
  rawId: string;
  kind: TransferEndpointKind;
  name: string;
  currency: Currency;
  balance: number;
};

function getTradingAccountTransferId(tradingAccountId: string) {
  return `trading:${tradingAccountId}`;
}

function resolveTransferEndpoint(
  endpointId: string,
  accounts: Account[],
  tradingAccounts: TradingAccount[],
  defaultCurrency: Currency
): TransferEndpoint | null {
  const normalizedId = endpointId.startsWith('finance:')
    ? endpointId.replace('finance:', '')
    : endpointId;

  const financeAccount = accounts.find((account) => account.id === normalizedId);

  if (financeAccount) {
    return {
      id: financeAccount.id,
      rawId: financeAccount.id,
      kind: 'finance',
      name: financeAccount.name,
      currency: financeAccount.currency || defaultCurrency,
      balance: financeAccount.balance,
    };
  }

  const tradingAccountId = endpointId.startsWith('trading:')
    ? endpointId.replace('trading:', '')
    : endpointId;

  const tradingAccount = tradingAccounts.find((account) => account.id === tradingAccountId);

  if (tradingAccount) {
    return {
      id: getTradingAccountTransferId(tradingAccount.id),
      rawId: tradingAccount.id,
      kind: 'trading',
      name: tradingAccount.name,
      currency: tradingAccount.currency || defaultCurrency,
      balance: tradingAccount.balance,
    };
  }

  return null;
}

function adjustTradingAccountBalance(
  tradingAccount: TradingAccount,
  amountDelta: number
): TradingAccount {
  return {
    ...tradingAccount,
    balance: tradingAccount.balance + amountDelta,
    equity: tradingAccount.equity + amountDelta,
    freeMargin: tradingAccount.freeMargin + amountDelta,
    updatedAt: new Date().toISOString(),
  };
}


function getTradingAccountRealAmount(account: TradingAccount, amount: number) {
  if (account.accountType === 'cent') {
    return amount / 100;
  }

  return amount;
}

function getTradingAccountDisplayCurrency(account: TradingAccount): Currency {
  if (account.accountType === 'cent') {
    return 'USD';
  }

  return account.currency;
}


function getTradingAccountRawAmountFromReal(
  account: TradingAccount,
  realAmount: number
) {
  if (account.accountType === 'cent') {
    return realAmount * 100;
  }

  return realAmount;
}

function getTradingAccountRealBalance(account: TradingAccount) {
  if (account.accountType === 'cent') {
    return account.balance / 100;
  }

  return account.balance;
}

function adjustTradingAccountByRawAmount(
  tradingAccount: TradingAccount,
  rawDelta: number
): TradingAccount {
  return {
    ...tradingAccount,
    balance: tradingAccount.balance + rawDelta,
    equity: tradingAccount.equity + rawDelta,
    freeMargin: tradingAccount.freeMargin + rawDelta,
    updatedAt: new Date().toISOString(),
  };
}

export const useFinanceStore = create<FinanceStore>((set, get) => {
  function setAndPersist(partial: Partial<PersistedFinanceState>) {
    set(partial);
    saveFinanceState(get());
  }

  return {
  defaultCurrency: 'IDR',
  exchangeRates: defaultExchangeRates,
  exchangeRateMode: DEFAULT_EXCHANGE_RATE_MODE,
  exchangeRateLastUpdated: null,
  exchangeRateSourceUpdatedAt: null,
  exchangeRateNextUpdateAt: null,
  exchangeRateProvider: null,
  exchangeRateProviderMode: DEFAULT_EXCHANGE_RATE_PROVIDER_MODE,
  exchangeRateApiKey: EMBEDDED_EXCHANGE_RATE_CONFIG.alphaVantageApiKey,
  exchangeRateAutoRefreshIntervalMs: REALTIME_EXCHANGE_RATE_AUTO_REFRESH_INTERVAL_MS,
  exchangeRateLiveStatus: 'idle',
  exchangeRateLastError: null,
  exchangeRateDailyRequestCount: 0,
  exchangeRateRequestCountDate: null,
  isRefreshingExchangeRates: false,
  accounts: initialAccounts,
  transactions: initialTransactions,
  savingGoals: initialSavingGoals,
  budgets: initialBudgets,
  categories: initialCategories,
  investmentHoldings: [],
  investmentOrders: [],
  investmentPriceHistory: [],
  netWorthSnapshots: [],
  tradingAccounts: [],
  tradingCashEvents: [],
  tradingPlans: [],
  tradingTrades: [],

  hasHydratedFinance: false,

  hydrateFinanceData: async () => {
    try {
      const storageKeysToTry = [
        FINANCE_STORAGE_KEY,
        FINANCE_BACKUP_STORAGE_KEY,
        ...FINANCE_LEGACY_STORAGE_KEYS,
      ];

      const candidates: Array<{
        storageKey: string;
        normalizedFinanceData: PersistedFinanceState;
        score: number;
      }> = [];

      for (const storageKey of storageKeysToTry) {
        const restoredFinanceData = await readNormalizedFinanceStateFromKey(storageKey);

        if (!restoredFinanceData) {
          continue;
        }

        candidates.push({
          storageKey,
          normalizedFinanceData: restoredFinanceData.normalizedFinanceData,
          score: scoreFinanceStateForRecovery(
            restoredFinanceData.normalizedFinanceData
          ),
        });
      }

      const bestCandidate = candidates.sort((left, right) => right.score - left.score)[0];

      if (bestCandidate) {
        set({
          ...bestCandidate.normalizedFinanceData,
          hasHydratedFinance: true,
        });

        await AsyncStorage.setItem(
          FINANCE_STORAGE_KEY,
          JSON.stringify(
            getPersistableFinanceState(bestCandidate.normalizedFinanceData)
          )
        );

        await AsyncStorage.setItem(
          FINANCE_BACKUP_STORAGE_KEY,
          JSON.stringify(
            getPersistableFinanceState(bestCandidate.normalizedFinanceData)
          )
        );

        return;
      }

      set({
        hasHydratedFinance: true,
      });
    } catch {
      set({
        hasHydratedFinance: true,
      });
    }
  },

  getFinanceExportData: () => {
    const exportFile: FinanceExportFile = {
      app: 'Finance OS Mobile',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: getPersistableFinanceState(get()),
    };

    return JSON.stringify(exportFile, null, 2);
  },

  importFinanceData: (rawData) => {
    const importedFinanceData = parseImportedFinanceData(rawData);

    if (!importedFinanceData) {
      return {
        success: false,
        message: 'Invalid backup file. Please paste a valid Finance OS Mobile backup JSON.',
      };
    }

    setAndPersist(importedFinanceData);

    return {
      success: true,
      message: 'Backup imported successfully.',
    };
  },

  setDefaultCurrency: (currency) => {
    setAndPersist({
      defaultCurrency: currency,
    });

    return {
      success: true,
      message: `Default currency changed to ${currency}.`,
    };
  },

  setExchangeRate: (currency, rate) => {
    if (currency === 'IDR') {
      return {
        success: false,
        message: 'IDR is the base currency and must stay at 1.',
      };
    }

    if (!Number.isFinite(rate) || rate <= 0) {
      return {
        success: false,
        message: 'Exchange rate must be greater than 0.',
      };
    }

    setAndPersist({
      exchangeRates: {
        ...get().exchangeRates,
        [currency]: rate,
      },
      exchangeRateLastUpdated: new Date().toISOString(),
      exchangeRateSourceUpdatedAt: new Date().toISOString(),
      exchangeRateNextUpdateAt: null,
      exchangeRateProvider: 'source-code-compatibility',
    });

    return {
      success: true,
      message: `${currency} exchange rate updated.`,
    };
  },

  setExchangeRateMode: () => {
    setAndPersist({
      exchangeRateMode: 'auto',
      exchangeRateProviderMode: 'alpha_vantage_realtime',
      exchangeRateApiKey: EMBEDDED_EXCHANGE_RATE_CONFIG.alphaVantageApiKey,
      exchangeRateAutoRefreshIntervalMs: REALTIME_EXCHANGE_RATE_AUTO_REFRESH_INTERVAL_MS,
    });

    return {
      success: true,
      message: 'Realtime exchange rate is always enabled.',
    };
  },

  setExchangeRateProviderMode: () => {
    setAndPersist({
      exchangeRateProviderMode: 'alpha_vantage_realtime',
      exchangeRateApiKey: EMBEDDED_EXCHANGE_RATE_CONFIG.alphaVantageApiKey,
      exchangeRateAutoRefreshIntervalMs: REALTIME_EXCHANGE_RATE_AUTO_REFRESH_INTERVAL_MS,
    });

    return {
      success: true,
      message: 'Realtime provider is fixed by the app.',
    };
  },

  setExchangeRateApiKey: () => {
    setAndPersist({
      exchangeRateApiKey: EMBEDDED_EXCHANGE_RATE_CONFIG.alphaVantageApiKey,
    });

    return {
      success: true,
      message: 'Exchange rate API key is integrated in source code.',
    };
  },

  refreshExchangeRates: async () => {
    if (get().isRefreshingExchangeRates) {
      return {
        success: true,
        message: 'Exchange rate update is already running.',
      };
    }

    const requestUsage = getNormalizedRequestUsage(
      get().exchangeRateRequestCountDate,
      get().exchangeRateDailyRequestCount
    );
    const nextRequestCount = requestUsage.dailyRequestCount + getRequestsPerFullRefresh();

    if (nextRequestCount > getDailyRequestLimit()) {
      setAndPersist({
        exchangeRateLiveStatus: 'rate_limited',
        exchangeRateLastError:
          'Daily API request limit guard is active. The app is using the last saved rate.',
        exchangeRateRequestCountDate: requestUsage.requestCountDate,
        exchangeRateDailyRequestCount: requestUsage.dailyRequestCount,
      });

      return {
        success: false,
        message:
          'Daily API request limit guard is active. The app will keep using the last saved rate.',
      };
    }

    set({
      isRefreshingExchangeRates: true,
      exchangeRateLiveStatus: 'updating',
      exchangeRateLastError: null,
    });

    try {
      const latestExchangeRateResult = await fetchLatestExchangeRates(
        'alpha_vantage_realtime',
        EMBEDDED_EXCHANGE_RATE_CONFIG.alphaVantageApiKey
      );
      const updatedAt = new Date().toISOString();

      setAndPersist({
        exchangeRates: latestExchangeRateResult.rates,
        exchangeRateLastUpdated: updatedAt,
        exchangeRateSourceUpdatedAt: latestExchangeRateResult.sourceUpdatedAt,
        exchangeRateNextUpdateAt: latestExchangeRateResult.nextUpdateAt,
        exchangeRateProvider: latestExchangeRateResult.provider,
        exchangeRateLiveStatus:
          latestExchangeRateResult.provider === 'alpha_vantage_realtime'
            ? 'live'
            : 'fallback',
        exchangeRateLastError: null,
        exchangeRateRequestCountDate: requestUsage.requestCountDate,
        exchangeRateDailyRequestCount: nextRequestCount,
      });

      return {
        success: true,
        message: `Exchange rate updated from ${latestExchangeRateResult.provider}.`,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to update exchange rate. The app will keep using the last saved rate.';
      const status = isLikelyRateLimitMessage(message) ? 'rate_limited' : 'failed';

      setAndPersist({
        exchangeRateLiveStatus: status,
        exchangeRateLastError: message,
        exchangeRateRequestCountDate: requestUsage.requestCountDate,
        exchangeRateDailyRequestCount: nextRequestCount,
      });

      return {
        success: false,
        message:
          status === 'rate_limited'
            ? 'API rate limit reached. The app will keep using the last saved rate.'
            : 'Unable to update exchange rate. The app will keep using the last saved rate.',
      };
    } finally {
      set({
        isRefreshingExchangeRates: false,
      });
    }
  },

  refreshExchangeRatesOnAppOpen: async () => {
    if (EMBEDDED_EXCHANGE_RATE_CONFIG.forceRefreshOnAppOpen) {
      return get().refreshExchangeRates();
    }

    return get().refreshExchangeRatesIfStale();
  },

  refreshExchangeRatesIfStale: async () => {
    const {
      exchangeRateLastUpdated,
      exchangeRateAutoRefreshIntervalMs,
      isRefreshingExchangeRates,
    } = get();

    if (isRefreshingExchangeRates) {
      return {
        success: true,
        message: 'Exchange rate update is already running.',
      };
    }

    if (
      !isExchangeRateStale(
        exchangeRateLastUpdated,
        exchangeRateAutoRefreshIntervalMs || OPEN_EXCHANGE_RATE_AUTO_REFRESH_INTERVAL_MS
      )
    ) {
      return {
        success: true,
        message: 'Exchange rate is still fresh.',
      };
    }

    return get().refreshExchangeRates();
  },


  lockExistingTransactionsWithCurrentRate: () => {
    const { transactions, accounts, defaultCurrency, exchangeRates } = get();

    const exchangeRateSnapshot = createExchangeRateSnapshot(exchangeRates);
    let lockedCount = 0;

    const lockedTransactions = transactions.map((transaction) => {
      if (
        transaction.exchangeRateSnapshot &&
        transaction.baseCurrencyAtTransaction &&
        typeof transaction.baseAmountAtTransaction === 'number'
      ) {
        return transaction;
      }

      const transactionCurrency = transaction.currency || defaultCurrency;
      const relatedAccount =
        accounts.find((account) => account.id === transaction.accountId) ||
        accounts.find((account) => account.id === transaction.fromAccountId) ||
        accounts.find((account) => account.id === transaction.toAccountId);

      const accountCurrency = relatedAccount?.currency || transactionCurrency;
      const baseAmountAtTransaction = convertAmountBetweenCurrencies(
        transaction.amount,
        transactionCurrency,
        defaultCurrency,
        exchangeRateSnapshot
      );
      const accountAmountAtTransaction = convertAmountBetweenCurrencies(
        transaction.amount,
        transactionCurrency,
        accountCurrency,
        exchangeRateSnapshot
      );

      lockedCount += 1;

      return {
        ...transaction,
        baseCurrencyAtTransaction: defaultCurrency,
        baseAmountAtTransaction,
        exchangeRateSnapshot,
        accountCurrencyAtTransaction: accountCurrency,
        accountAmountAtTransaction,
      };
    });

    if (lockedCount === 0) {
      return {
        success: true,
        message: 'All existing transactions are already rate-locked.',
      };
    }

    setAndPersist({
      transactions: lockedTransactions,
    });

    return {
      success: true,
      message: `${lockedCount} existing transaction(s) locked with the current exchange rate.`,
    };
  },


  addTradingAccount: (payload) => {
    const validationMessage = validateTradingAccountPayload(payload);

    if (validationMessage) {
      return {
        success: false,
        message: validationMessage,
      };
    }

    const tradingAccounts = get().tradingAccounts;
    const duplicateAccount = tradingAccounts.find(
      (account) =>
        account.accountNumber.trim() === payload.accountNumber.trim() &&
        account.broker.trim().toLowerCase() === payload.broker.trim().toLowerCase()
    );

    if (duplicateAccount) {
      return {
        success: false,
        message: 'This broker account number already exists.',
      };
    }

    const nextTradingAccount = createTradingAccount(payload);

    setAndPersist({
      tradingAccounts: [nextTradingAccount, ...tradingAccounts],
    });

    return {
      success: true,
      message: `${nextTradingAccount.name} added to Trading Journal.`,
    };
  },

  updateTradingAccount: (payload) => {
    const validationMessage = validateTradingAccountPayload(payload);

    if (validationMessage) {
      return {
        success: false,
        message: validationMessage,
      };
    }

    const tradingAccounts = get().tradingAccounts;
    const targetTradingAccount = tradingAccounts.find(
      (account) => account.id === payload.tradingAccountId
    );

    if (!targetTradingAccount) {
      return {
        success: false,
        message: 'Trading account not found.',
      };
    }

    const nextTradingAccount: TradingAccount = {
      ...targetTradingAccount,
      name: payload.name.trim(),
      broker: payload.broker.trim(),
      server: payload.server.trim(),
      accountNumber: payload.accountNumber.trim(),
      linkedBrokerWalletAccountId: payload.linkedBrokerWalletAccountId || null,
      platform: payload.platform,
      accountType: payload.accountType,
      leverage: payload.leverage,
      currency: payload.currency,
      balance: payload.balance,
      equity: payload.equity,
      credit: payload.credit || 0,
      margin: payload.margin || 0,
      freeMargin: payload.freeMargin || payload.equity,
      note: payload.note?.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    setAndPersist({
      tradingAccounts: tradingAccounts.map((account) =>
        account.id === payload.tradingAccountId ? nextTradingAccount : account
      ),
    });

    return {
      success: true,
      message: `${nextTradingAccount.name} updated.`,
    };
  },

  deleteTradingAccount: (tradingAccountId) => {
    const tradingAccounts = get().tradingAccounts;
    const targetTradingAccount = tradingAccounts.find(
      (account) => account.id === tradingAccountId
    );

    if (!targetTradingAccount) {
      return {
        success: false,
        message: 'Trading account not found.',
      };
    }

    setAndPersist({
      tradingAccounts: tradingAccounts.filter((account) => account.id !== tradingAccountId),
    });

    return {
      success: true,
      message: `${targetTradingAccount.name} removed from Trading Journal.`,
    };
  },


  addTradingCashEvent: (payload) => {
    const {
      accounts,
      tradingAccounts,
      tradingCashEvents,
      transactions,
      defaultCurrency,
      exchangeRates,
    } = get();

    if (payload.amount <= 0) {
      return {
        success: false,
        message: 'Amount must be greater than 0.',
      };
    }

    const tradingAccount = tradingAccounts.find(
      (account) => account.id === payload.tradingAccountId
    );

    if (!tradingAccount) {
      return {
        success: false,
        message: 'Trading account not found.',
      };
    }

    if (!tradingAccount.linkedBrokerWalletAccountId) {
      return {
        success: false,
        message: 'This trading account is not linked to a Broker Wallet.',
      };
    }

    const brokerWallet = accounts.find(
      (account) => account.id === tradingAccount.linkedBrokerWalletAccountId
    );

    if (!brokerWallet) {
      return {
        success: false,
        message: 'Linked Broker Wallet not found.',
      };
    }

    const eventCurrency = resolveTransactionCurrency(
      tradingAccount.accountType === 'cent' ? 'USD' : payload.currency,
      tradingAccount.accountType === 'cent' ? 'USD' : tradingAccount.currency
    );

    if (tradingAccount.accountType === 'cent' && eventCurrency !== 'USD') {
      return {
        success: false,
        message: 'Cent trading account deposit/withdrawal only supports USD.',
      };
    }

    const exchangeRateSnapshot = createExchangeRateSnapshot(exchangeRates);

    const brokerWalletAmount = convertAmountBetweenCurrencies(
      payload.amount,
      eventCurrency,
      brokerWallet.currency || defaultCurrency,
      exchangeRateSnapshot
    );

    const tradingRealAmount = convertAmountBetweenCurrencies(
      payload.amount,
      eventCurrency,
      tradingAccount.currency,
      exchangeRateSnapshot
    );

    const tradingRawAmount = getTradingAccountRawAmountFromReal(
      tradingAccount,
      tradingRealAmount
    );

    if (payload.eventType === 'deposit' && brokerWallet.balance < brokerWalletAmount) {
      return {
        success: false,
        message: 'Insufficient Broker Wallet balance.',
      };
    }

    if (
      payload.eventType === 'withdrawal' &&
      getTradingAccountRealBalance(tradingAccount) < tradingRealAmount
    ) {
      return {
        success: false,
        message: 'Insufficient Trading Account balance.',
      };
    }

    const now = new Date().toISOString();
    const directionMultiplier = payload.eventType === 'deposit' ? 1 : -1;

    const nextTradingAccount = adjustTradingAccountByRawAmount(
      tradingAccount,
      tradingRawAmount * directionMultiplier
    );

    const nextBrokerWalletBalance =
      payload.eventType === 'deposit'
        ? brokerWallet.balance - brokerWalletAmount
        : brokerWallet.balance + brokerWalletAmount;

    const eventTitle =
      payload.eventType === 'deposit'
        ? 'Trading Deposit'
        : 'Trading Withdrawal';

    const newTradingCashEvent: TradingCashEvent = {
      id: createId('trading-cash'),
      tradingAccountId: tradingAccount.id,
      linkedBrokerWalletAccountId: brokerWallet.id,
      eventType: payload.eventType,
      amount: payload.amount,
      currency: eventCurrency,
      brokerWalletAmount,
      brokerWalletCurrency: brokerWallet.currency || defaultCurrency,
      tradingAccountRawAmount: tradingRawAmount,
      tradingAccountRealAmount: tradingRealAmount,
      tradingAccountCurrency: tradingAccount.currency,
      date: payload.date || getTodayISO(),
      note: payload.note?.trim() || undefined,
      createdAt: now,
    };

    const historicalSnapshot = buildHistoricalTransactionSnapshot(
      payload.amount,
      eventCurrency,
      defaultCurrency,
      brokerWallet.currency || defaultCurrency,
      exchangeRates
    );

    const eventNoteParts = [
      `Trading account: ${tradingAccount.name}`,
      `Broker wallet: ${brokerWallet.name}`,
      tradingAccount.accountType === 'cent'
        ? `Cent raw movement: ${tradingRawAmount.toLocaleString('en-US', {
            maximumFractionDigits: 2,
          })} cents`
        : undefined,
      payload.note?.trim() ? `Note: ${payload.note.trim()}` : undefined,
    ].filter(Boolean);

    const newTransaction: Transaction = {
      id: createId('trx'),
      type: 'transfer',
      title: eventTitle,
      amount: payload.amount,
      currency: eventCurrency,
      ...historicalSnapshot,
      fromAccountId:
        payload.eventType === 'deposit'
          ? brokerWallet.id
          : `trading:${tradingAccount.id}`,
      toAccountId:
        payload.eventType === 'deposit'
          ? `trading:${tradingAccount.id}`
          : brokerWallet.id,
      accountName:
        payload.eventType === 'deposit'
          ? `${brokerWallet.name} → ${tradingAccount.name}`
          : `${tradingAccount.name} → ${brokerWallet.name}`,
      categoryName: eventTitle,
      date: payload.date || getTodayISO(),
      note: eventNoteParts.join('\n'),
    };

    setAndPersist({
      accounts: accounts.map((account) =>
        account.id === brokerWallet.id
          ? {
              ...account,
              balance: nextBrokerWalletBalance,
            }
          : account
      ),
      tradingAccounts: tradingAccounts.map((account) =>
        account.id === tradingAccount.id ? nextTradingAccount : account
      ),
      tradingCashEvents: [newTradingCashEvent, ...tradingCashEvents],
      transactions: [newTransaction, ...transactions],
    });

    return {
      success: true,
      message:
        payload.eventType === 'deposit'
          ? 'Trading deposit recorded successfully.'
          : 'Trading withdrawal recorded successfully.',
    };
  },


  addAccount: (payload) => {
    const { accounts } = get();

    const trimmedName = payload.name.trim();

    if (!trimmedName) {
      return {
        success: false,
        message: 'Account name is required.',
      };
    }

    if (payload.initialBalance < 0) {
      return {
        success: false,
        message: 'Initial balance cannot be negative.',
      };
    }

    const duplicateAccount = accounts.find(
      (account) => account.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicateAccount) {
      return {
        success: false,
        message: 'Account name already exists.',
      };
    }

    const now = new Date().toISOString();
    const newAccount: Account = {
      id: createId('acc'),
      name: trimmedName,
      type: payload.type,
      currency: payload.currency,
      balance: payload.initialBalance,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    setAndPersist({
      accounts: [newAccount, ...accounts],
    });

    return {
      success: true,
      message: 'Account created successfully.',
    };
  },

  upsertTradingPlan: (payload) => {
    const { tradingAccounts, tradingPlans } = get();

    const tradingAccount = tradingAccounts.find(
      (account) => account.id === payload.tradingAccountId
    );

    if (!tradingAccount) {
      return {
        success: false,
        message: 'Trading account not found.',
      };
    }

    if (payload.dailyMaxLossPercent < 0) {
      return { success: false, message: 'Daily max loss percentage cannot be negative.' };
    }

    if (payload.dailyMaxLossAmount < 0) {
      return { success: false, message: 'Daily max loss amount cannot be negative.' };
    }

    if (payload.dailyProfitTargetPercent < 0) {
      return { success: false, message: 'Daily profit target percentage cannot be negative.' };
    }

    if (payload.dailyProfitTargetAmount < 0) {
      return { success: false, message: 'Daily profit target cannot be negative.' };
    }

    if (!Number.isFinite(payload.maxTradesPerDay) || payload.maxTradesPerDay <= 0) {
      return { success: false, message: 'Max trades per day must be greater than 0.' };
    }

    if (payload.riskPerTradePercent < 0) {
      return { success: false, message: 'Risk per trade cannot be negative.' };
    }

    if (!Number.isFinite(payload.minimumRewardRiskRatio) || payload.minimumRewardRiskRatio <= 0) {
      return { success: false, message: 'Minimum RR must be greater than 0.' };
    }

    const now = new Date().toISOString();
    const existingPlan = tradingPlans.find(
      (plan) => plan.tradingAccountId === payload.tradingAccountId
    );

    const nextPlan: TradingPlan = {
      id: existingPlan?.id || createId('trading-plan'),
      tradingAccountId: payload.tradingAccountId,
      dailyMaxLossPercent: payload.dailyMaxLossPercent,
      dailyMaxLossAmount: payload.dailyMaxLossAmount,
      dailyProfitTargetPercent: payload.dailyProfitTargetPercent,
      dailyProfitTargetAmount: payload.dailyProfitTargetAmount,
      maxTradesPerDay: payload.maxTradesPerDay,
      riskPerTradePercent: payload.riskPerTradePercent,
      minimumRewardRiskRatio: payload.minimumRewardRiskRatio,
      allowedPairs: payload.allowedPairs.map((pair) => pair.trim().toUpperCase()).filter(Boolean),
      sessionStart: payload.sessionStart.trim(),
      sessionEnd: payload.sessionEnd.trim(),
      ruleNotes: payload.ruleNotes.trim(),
      mentalChecklist: payload.mentalChecklist.map((item) => item.trim()).filter(Boolean),
      createdAt: existingPlan?.createdAt || now,
      updatedAt: now,
    };

    setAndPersist({
      tradingPlans: existingPlan
        ? tradingPlans.map((plan) => (plan.id === existingPlan.id ? nextPlan : plan))
        : [nextPlan, ...tradingPlans],
    });

    return {
      success: true,
      message: existingPlan ? 'Trading plan updated successfully.' : 'Trading plan created successfully.',
    };
  },

  deleteTradingPlan: (tradingAccountId) => {
    const { tradingPlans } = get();
    const existingPlan = tradingPlans.find((plan) => plan.tradingAccountId === tradingAccountId);

    if (!existingPlan) {
      return { success: false, message: 'Trading plan not found.' };
    }

    setAndPersist({
      tradingPlans: tradingPlans.filter((plan) => plan.tradingAccountId !== tradingAccountId),
    });

    return { success: true, message: 'Trading plan deleted successfully.' };
  },


  addTradingTrade: (payload) => {
    const { tradingAccounts, tradingTrades, tradingPlans } = get();

    const tradingAccount = tradingAccounts.find(
      (account) => account.id === payload.tradingAccountId
    );

    if (!tradingAccount) {
      return { success: false, message: 'Trading account not found.' };
    }

    if (!payload.pair.trim()) {
      return { success: false, message: 'Pair is required.' };
    }

    if (!Number.isFinite(payload.lotSize) || payload.lotSize <= 0) {
      return { success: false, message: 'Lot size must be greater than 0.' };
    }

    if (!Number.isFinite(payload.entryPrice) || payload.entryPrice <= 0) {
      return { success: false, message: 'Entry price must be greater than 0.' };
    }

    const now = new Date().toISOString();
    const commission = payload.commission || 0;
    const swap = payload.swap || 0;
    const grossProfitLoss = payload.status === 'closed' ? payload.grossProfitLoss || 0 : 0;
    const netProfitLoss =
      payload.status === 'closed' ? grossProfitLoss - commission + swap : 0;
    const planSnapshot = getTradingPlanForAccountSnapshot(
      tradingPlans,
      tradingAccount.id
    );
    const riskSnapshot = getTradingPlanRiskLimitSnapshot(
      tradingAccount,
      planSnapshot
    );

    const newTrade: TradingTrade = {
      id: createId('trading-trade'),
      tradingAccountId: tradingAccount.id,
      status: payload.status,
      pair: payload.pair.trim().toUpperCase(),
      direction: payload.direction,
      lotSize: payload.lotSize,
      entryPrice: payload.entryPrice,
      exitPrice: payload.status === 'closed' ? payload.exitPrice || null : null,
      stopLoss: payload.stopLoss || null,
      takeProfit: payload.takeProfit || null,
      openDate: payload.openDate || getTodayISO(),
      closeDate: payload.status === 'closed' ? payload.closeDate || getTodayISO() : null,
      grossProfitLoss,
      commission,
      swap,
      netProfitLoss,
      currency: tradingAccount.currency,
      accountBalanceSnapshot: riskSnapshot.accountBalanceSnapshot,
      planRiskPercentSnapshot: riskSnapshot.planRiskPercentSnapshot,
      planRiskLimitAmountSnapshot: riskSnapshot.planRiskLimitAmountSnapshot,
      riskAmount: payload.riskAmount || 0,
      rewardRiskRatio: payload.rewardRiskRatio || 0,
      setupTag: payload.setupTag?.trim() || '',
      mistakeTags: (payload.mistakeTags || [])
        .map((tag) => tag.trim())
        .filter(Boolean),
      emotionBefore: payload.emotionBefore?.trim() || '',
      emotionAfter: payload.emotionAfter?.trim() || '',
      note: payload.note?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    const rawDelta =
      payload.status === 'closed'
        ? getTradingAccountRawAmountFromReal(tradingAccount, netProfitLoss)
        : 0;

    setAndPersist({
      tradingTrades: [newTrade, ...tradingTrades],
      tradingAccounts:
        payload.status === 'closed'
          ? tradingAccounts.map((account) =>
              account.id === tradingAccount.id
                ? adjustTradingAccountByRawAmount(account, rawDelta)
                : account
            )
          : tradingAccounts,
    });

    return {
      success: true,
      message:
        payload.status === 'closed'
          ? 'Closed trade recorded and balance updated.'
          : 'Open trade recorded successfully.',
    };
  },

  updateTradingTrade: (payload) => {
    const { tradingAccounts, tradingTrades, tradingPlans } = get();

    const existingTrade = tradingTrades.find((trade) => trade.id === payload.tradeId);

    if (!existingTrade) {
      return { success: false, message: 'Trade not found.' };
    }

    const tradingAccount = tradingAccounts.find(
      (account) => account.id === payload.tradingAccountId
    );

    if (!tradingAccount) {
      return { success: false, message: 'Trading account not found.' };
    }

    if (!payload.pair.trim()) {
      return { success: false, message: 'Pair is required.' };
    }

    if (!Number.isFinite(payload.lotSize) || payload.lotSize <= 0) {
      return { success: false, message: 'Lot size must be greater than 0.' };
    }

    if (!Number.isFinite(payload.entryPrice) || payload.entryPrice <= 0) {
      return { success: false, message: 'Entry price must be greater than 0.' };
    }

    const now = new Date().toISOString();
    const commission = payload.commission || 0;
    const swap = payload.swap || 0;
    const grossProfitLoss = payload.status === 'closed' ? payload.grossProfitLoss || 0 : 0;
    const netProfitLoss =
      payload.status === 'closed' ? grossProfitLoss - commission + swap : 0;
    const nextPlanSnapshot = getTradingPlanForAccountSnapshot(
      tradingPlans,
      tradingAccount.id
    );
    const nextRiskSnapshot = getTradingPlanRiskLimitSnapshot(
      tradingAccount,
      nextPlanSnapshot
    );

    const nextTrade: TradingTrade = {
      ...existingTrade,
      tradingAccountId: tradingAccount.id,
      status: payload.status,
      pair: payload.pair.trim().toUpperCase(),
      direction: payload.direction,
      lotSize: payload.lotSize,
      entryPrice: payload.entryPrice,
      exitPrice: payload.status === 'closed' ? payload.exitPrice || null : null,
      stopLoss: payload.stopLoss || null,
      takeProfit: payload.takeProfit || null,
      openDate: payload.openDate || existingTrade.openDate || getTodayISO(),
      closeDate: payload.status === 'closed' ? payload.closeDate || getTodayISO() : null,
      grossProfitLoss,
      commission,
      swap,
      netProfitLoss,
      currency: tradingAccount.currency,
      accountBalanceSnapshot: nextRiskSnapshot.accountBalanceSnapshot,
      planRiskPercentSnapshot: nextRiskSnapshot.planRiskPercentSnapshot,
      planRiskLimitAmountSnapshot: nextRiskSnapshot.planRiskLimitAmountSnapshot,
      riskAmount: payload.riskAmount || 0,
      rewardRiskRatio: payload.rewardRiskRatio || 0,
      setupTag: payload.setupTag?.trim() || '',
      mistakeTags: (payload.mistakeTags || [])
        .map((tag) => tag.trim())
        .filter(Boolean),
      emotionBefore: payload.emotionBefore?.trim() || '',
      emotionAfter: payload.emotionAfter?.trim() || '',
      note: payload.note?.trim() || undefined,
      updatedAt: now,
    };

    const rollbackOldRaw =
      existingTrade.status === 'closed'
        ? getTradingAccountRawAmountFromReal(tradingAccount, -existingTrade.netProfitLoss)
        : 0;
    const applyNewRaw =
      nextTrade.status === 'closed'
        ? getTradingAccountRawAmountFromReal(tradingAccount, nextTrade.netProfitLoss)
        : 0;
    const rawDelta = rollbackOldRaw + applyNewRaw;

    setAndPersist({
      tradingTrades: tradingTrades.map((trade) =>
        trade.id === existingTrade.id ? nextTrade : trade
      ),
      tradingAccounts:
        rawDelta !== 0
          ? tradingAccounts.map((account) =>
              account.id === tradingAccount.id
                ? adjustTradingAccountByRawAmount(account, rawDelta)
                : account
            )
          : tradingAccounts,
    });

    return {
      success: true,
      message: 'Trade updated successfully.',
    };
  },

  deleteTradingTrade: (tradeId) => {
    const { tradingAccounts, tradingTrades } = get();
    const targetTrade = tradingTrades.find((trade) => trade.id === tradeId);

    if (!targetTrade) {
      return { success: false, message: 'Trade not found.' };
    }

    const tradingAccount = tradingAccounts.find(
      (account) => account.id === targetTrade.tradingAccountId
    );

    const rawRollback =
      targetTrade.status === 'closed' && tradingAccount
        ? getTradingAccountRawAmountFromReal(tradingAccount, -targetTrade.netProfitLoss)
        : 0;

    setAndPersist({
      tradingTrades: tradingTrades.filter((trade) => trade.id !== tradeId),
      tradingAccounts:
        targetTrade.status === 'closed' && tradingAccount
          ? tradingAccounts.map((account) =>
              account.id === tradingAccount.id
                ? adjustTradingAccountByRawAmount(account, rawRollback)
                : account
            )
          : tradingAccounts,
    });

    return { success: true, message: 'Trade deleted successfully.' };
  },


  updateAccount: (payload) => {
    const { accounts, transactions, defaultCurrency, exchangeRates } = get();
    const targetAccount = accounts.find((account) => account.id === payload.accountId);
    const trimmedName = payload.name.trim();

    if (!targetAccount) {
      return {
        success: false,
        message: 'Account not found.',
      };
    }

    if (!trimmedName) {
      return {
        success: false,
        message: 'Account name is required.',
      };
    }

    if (!Number.isFinite(payload.balance) || payload.balance < 0) {
      return {
        success: false,
        message: 'Account balance must be 0 or greater.',
      };
    }

    const duplicateAccount = accounts.find(
      (account) =>
        account.id !== targetAccount.id &&
        account.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicateAccount) {
      return {
        success: false,
        message: 'Account name already exists.',
      };
    }

    const now = new Date().toISOString();
    const balanceDifference = payload.balance - targetAccount.balance;
    const shouldCreateAdjustment = Math.abs(balanceDifference) > 0.00000001;
    const renamedTransactions = transactions.map((transaction) =>
      transaction.accountId === targetAccount.id
        ? {
            ...transaction,
            accountName: trimmedName,
          }
        : transaction
    );
    const adjustmentTransactions: Transaction[] = [];

    if (shouldCreateAdjustment) {
      const adjustmentAmount = Math.abs(balanceDifference);
      const historicalSnapshot = buildHistoricalTransactionSnapshot(
        adjustmentAmount,
        targetAccount.currency,
        defaultCurrency,
        targetAccount.currency,
        exchangeRates
      );

      adjustmentTransactions.push({
        id: createId('trx'),
        type: 'adjustment',
        title:
          balanceDifference >= 0
            ? 'Balance adjustment increase'
            : 'Balance adjustment decrease',
        amount: adjustmentAmount,
        currency: targetAccount.currency,
        ...historicalSnapshot,
        accountId: targetAccount.id,
        accountName: trimmedName,
        categoryName: 'Balance Adjustment',
        date: now,
        note:
          payload.note?.trim() ||
          `Manual balance update from ${targetAccount.balance} to ${payload.balance}.`,
      });
    }

    setAndPersist({
      accounts: accounts.map((account) =>
        account.id === targetAccount.id
          ? {
              ...account,
              name: trimmedName,
              type: payload.type,
              balance: payload.balance,
              isActive: true,
              updatedAt: now,
            }
          : account
      ),
      transactions: [...adjustmentTransactions, ...renamedTransactions],
    });

    return {
      success: true,
      message: shouldCreateAdjustment
        ? 'Account updated and balance adjustment recorded.'
        : 'Account updated successfully.',
    };
  },

  deleteAccount: (accountId) => {
    const { accounts, transactions, savingGoals, investmentHoldings } = get();
    const targetAccount = accounts.find((account) => account.id === accountId);

    if (!targetAccount) {
      return {
        success: false,
        message: 'Account not found.',
      };
    }

    const hasLinkedTransactions = transactions.some((transaction) =>
      isTransactionLinkedToAccount(transaction, accountId)
    );
    const hasLinkedSavingGoals = savingGoals.some((savingGoal) =>
      isSavingGoalLinkedToAccount(savingGoal, accountId)
    );
    const hasLinkedInvestmentHoldings = investmentHoldings.some(
      (holding) => holding.accountId === accountId
    );
    const hasLinkedData =
      hasLinkedTransactions || hasLinkedSavingGoals || hasLinkedInvestmentHoldings;

    if (hasLinkedData) {
      setAndPersist({
        accounts: accounts.map((account) =>
          account.id === accountId
            ? {
                ...account,
                isActive: false,
                updatedAt: new Date().toISOString(),
              }
            : account
        ),
      });

      return {
        success: true,
        message:
          'Account has linked history, so it was archived instead of permanently deleted.',
      };
    }

    setAndPersist({
      accounts: accounts.filter((account) => account.id !== accountId),
    });

    return {
      success: true,
      message: 'Account deleted successfully.',
    };
  },

  permanentlyDeleteAccount: (accountId) => {
    const {
      accounts,
      transactions,
      savingGoals,
      investmentHoldings,
      investmentOrders,
      investmentPriceHistory,
    } = get();
    const targetAccount = accounts.find((account) => account.id === accountId);

    if (!targetAccount) {
      return {
        success: false,
        message: 'Account not found.',
      };
    }

    const holdingIdsToDelete = investmentHoldings
      .filter((holding) => holding.accountId === accountId)
      .map((holding) => holding.id);
    const holdingIdSet = new Set(holdingIdsToDelete);

    setAndPersist({
      accounts: accounts.filter((account) => account.id !== accountId),
      transactions: transactions.filter(
        (transaction) => !isTransactionLinkedToAccount(transaction, accountId)
      ),
      savingGoals: savingGoals.filter(
        (savingGoal) => !isSavingGoalLinkedToAccount(savingGoal, accountId)
      ),
      investmentHoldings: investmentHoldings.filter(
        (holding) => holding.accountId !== accountId
      ),
      investmentOrders: investmentOrders.filter(
        (order) => !holdingIdSet.has(order.holdingId)
      ),
      investmentPriceHistory: investmentPriceHistory.filter(
        (point) => !holdingIdSet.has(point.holdingId)
      ),
    });

    return {
      success: true,
      message:
        'Account permanently deleted with linked transactions, savings, investments, orders, and price history.',
    };
  },

  addSavingGoal: (payload) => {
    const { accounts, savingGoals, transactions } = get();

    const trimmedName = payload.name.trim();

    if (!trimmedName) {
      return {
        success: false,
        message: 'Saving name is required.',
      };
    }

    if (payload.targetAmount <= 0) {
      return {
        success: false,
        message: 'Target amount must be greater than 0.',
      };
    }

    if (payload.initialAmount < 0) {
      return {
        success: false,
        message: 'Initial amount cannot be negative.',
      };
    }

    if (payload.initialAmount > payload.targetAmount) {
      return {
        success: false,
        message: 'Initial amount cannot be greater than target amount.',
      };
    }

    const duplicateSaving = savingGoals.find(
      (saving) => saving.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicateSaving) {
      return {
        success: false,
        message: 'Saving goal name already exists.',
      };
    }

    const duplicateAccount = accounts.find(
      (account) => account.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicateAccount) {
      return {
        success: false,
        message: 'Account with this saving name already exists.',
      };
    }

    const sourceAccount = accounts.find(
      (account) => account.id === payload.linkedSourceAccountId
    );

    if (!sourceAccount) {
      return {
        success: false,
        message: 'Linked source account not found.',
      };
    }

    if (sourceAccount.type === 'saving') {
      return {
        success: false,
        message: 'Source account cannot be another saving wallet.',
      };
    }

    if (sourceAccount.balance < payload.initialAmount) {
      return {
        success: false,
        message: 'Insufficient source account balance.',
      };
    }

    const savingAccountId = createId('acc-saving');
    const savingGoalId = createId('saving-goal');

    const newSavingAccount: Account = {
      id: savingAccountId,
      name: trimmedName,
      type: 'saving',
      currency: sourceAccount.currency,
      balance: payload.initialAmount,
      isActive: true,
    };

    const newSavingGoal: SavingGoal = {
      id: savingGoalId,
      name: trimmedName,
      targetAmount: payload.targetAmount,
      currentAmount: payload.initialAmount,
      currency: sourceAccount.currency,
      savingAccountId,
      linkedSourceAccountId: sourceAccount.id,
      deadline: payload.deadline,
      status: getSavingStatus(payload.initialAmount, payload.targetAmount),
    };

    const initialTransaction: Transaction | null =
      payload.initialAmount > 0
        ? {
            id: createId('trx'),
            type: 'saving_deposit',
            title: `Initial Saving: ${trimmedName}`,
            amount: payload.initialAmount,
            currency: sourceAccount.currency,
            fromAccountId: sourceAccount.id,
            toAccountId: savingAccountId,
            accountName: `${sourceAccount.name} → ${trimmedName}`,
            categoryName: 'Saving Deposit',
            date: getTodayISO(),
            note: payload.note,
          }
        : null;

    setAndPersist({
      accounts: [
        newSavingAccount,
        ...accounts.map((account) =>
          account.id === sourceAccount.id
            ? {
                ...account,
                balance: account.balance - payload.initialAmount,
              }
            : account
        ),
      ],
      savingGoals: [newSavingGoal, ...savingGoals],
      transactions: initialTransaction
        ? [initialTransaction, ...transactions]
        : transactions,
    });

    return {
      success: true,
      message: 'Saving goal created successfully.',
    };
  },

  addCategory: (payload) => {
    const { categories } = get();

    const trimmedName = payload.name.trim();

    if (!trimmedName) {
      return {
        success: false,
        message: 'Category name is required.',
      };
    }

    const duplicateCategory = categories.find(
      (category) =>
        category.type === payload.type &&
        category.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicateCategory) {
      return {
        success: false,
        message: 'Category already exists.',
      };
    }

    const newCategory: Category = {
      id: createId('cat'),
      name: trimmedName,
      type: payload.type,
      icon: payload.icon || 'pricetag-outline',
      color: payload.color || '#D4D4D4',
      isDefault: false,
      isActive: true,
      createdAt: getTodayISO(),
    };

    setAndPersist({
      categories: [newCategory, ...categories],
    });

    return {
      success: true,
      message: 'Category created successfully.',
    };
  },

  addBudget: (payload) => {
    const { budgets, categories, defaultCurrency } = get();

    const trimmedName = payload.name.trim();

    if (!trimmedName) {
      return {
        success: false,
        message: 'Budget name is required.',
      };
    }

    if (payload.limitAmount <= 0) {
      return {
        success: false,
        message: 'Budget limit must be greater than 0.',
      };
    }

    if (payload.period === 'custom' && (!payload.startDate || !payload.endDate)) {
      return {
        success: false,
        message: 'Custom budget requires start date and end date.',
      };
    }

    const category = categories.find(
      (item) => item.id === payload.categoryId && item.type === 'expense'
    );

    if (!category) {
      return {
        success: false,
        message: 'Expense category not found.',
      };
    }

    const duplicateBudget = budgets.find(
      (budget) => budget.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicateBudget) {
      return {
        success: false,
        message: 'Budget name already exists.',
      };
    }

    const newBudget: Budget = {
      id: createId('budget'),
      name: trimmedName,
      categoryId: category.id,
      categoryName: category.name,
      period: payload.period,
      limitAmount: payload.limitAmount,
      currency: payload.currency || defaultCurrency,
      startDate: payload.period === 'custom' ? payload.startDate : undefined,
      endDate: payload.period === 'custom' ? payload.endDate : undefined,
      isActive: true,
      createdAt: getTodayISO(),
      updatedAt: getTodayISO(),
    };

    setAndPersist({
      budgets: [newBudget, ...budgets],
    });

    return {
      success: true,
      message: 'Budget created successfully.',
    };
  },

  updateBudget: (payload) => {
    const { budgets, categories, defaultCurrency } = get();
    const targetBudget = budgets.find((budget) => budget.id === payload.budgetId);
    const trimmedName = payload.name.trim();

    if (!targetBudget) {
      return {
        success: false,
        message: 'Budget not found.',
      };
    }

    if (!trimmedName) {
      return {
        success: false,
        message: 'Budget name is required.',
      };
    }

    if (!Number.isFinite(payload.limitAmount) || payload.limitAmount <= 0) {
      return {
        success: false,
        message: 'Budget limit must be greater than 0.',
      };
    }

    if (payload.period === 'custom' && (!payload.startDate || !payload.endDate)) {
      return {
        success: false,
        message: 'Custom budget requires start date and end date.',
      };
    }

    const category = categories.find(
      (item) => item.id === payload.categoryId && item.type === 'expense'
    );

    if (!category) {
      return {
        success: false,
        message: 'Expense category not found.',
      };
    }

    const duplicateBudget = budgets.find(
      (budget) =>
        budget.id !== targetBudget.id &&
        budget.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicateBudget) {
      return {
        success: false,
        message: 'Budget name already exists.',
      };
    }

    setAndPersist({
      budgets: budgets.map((budget) =>
        budget.id === targetBudget.id
          ? {
              ...budget,
              name: trimmedName,
              categoryId: category.id,
              categoryName: category.name,
              period: payload.period,
              limitAmount: payload.limitAmount,
              currency: payload.currency || budget.currency || defaultCurrency,
              startDate: payload.period === 'custom' ? payload.startDate : undefined,
              endDate: payload.period === 'custom' ? payload.endDate : undefined,
              isActive: true,
              updatedAt: getTodayISO(),
            }
          : budget
      ),
    });

    return {
      success: true,
      message: 'Budget updated successfully.',
    };
  },

  deleteBudget: (budgetId) => {
    const { budgets } = get();
    const targetBudget = budgets.find((budget) => budget.id === budgetId);

    if (!targetBudget) {
      return {
        success: false,
        message: 'Budget not found.',
      };
    }

    setAndPersist({
      budgets: budgets.filter((budget) => budget.id !== budgetId),
    });

    return {
      success: true,
      message: 'Budget deleted successfully.',
    };
  },

  addInvestmentHolding: (payload) => {
    const { accounts, investmentHoldings, investmentPriceHistory } = get();

    const account = accounts.find((item) => item.id === payload.accountId);

    if (!account) {
      return {
        success: false,
        message: 'Investment account not found.',
      };
    }

    if (account.type !== 'broker' && account.type !== 'crypto_wallet') {
      return {
        success: false,
        message: 'Investment holding must use a broker or crypto wallet account.',
      };
    }

    const trimmedName = payload.name.trim();
    const trimmedSymbol = payload.symbol.trim().toUpperCase();

    if (!trimmedName) {
      return {
        success: false,
        message: 'Asset name is required.',
      };
    }

    if (!trimmedSymbol) {
      return {
        success: false,
        message: 'Asset symbol is required.',
      };
    }

    if (payload.quantity <= 0) {
      return {
        success: false,
        message: 'Quantity must be greater than 0.',
      };
    }

    if (payload.averagePrice < 0 || payload.currentPrice < 0) {
      return {
        success: false,
        message: 'Price cannot be negative.',
      };
    }

    const duplicateHolding = investmentHoldings.find(
      (holding) =>
        holding.accountId === account.id &&
        holding.symbol.toLowerCase() === trimmedSymbol.toLowerCase()
    );

    if (duplicateHolding) {
      return {
        success: false,
        message: 'This asset already exists in the selected account.',
      };
    }

    const now = new Date().toISOString();

    const newHolding: InvestmentHolding = {
      id: createId('holding'),
      accountId: account.id,
      name: trimmedName,
      symbol: trimmedSymbol,
      assetType: payload.assetType,
      quantity: payload.quantity,
      averagePrice: payload.averagePrice,
      currentPrice: payload.currentPrice,
      currency: payload.currency,
      note: payload.note?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    const initialPriceHistoryPoint = createInvestmentPriceHistoryPoint({
      holdingId: newHolding.id,
      symbol: newHolding.symbol,
      name: newHolding.name,
      assetType: newHolding.assetType,
      price: newHolding.currentPrice,
      currency: newHolding.currency,
      source: 'initial',
      recordedAt: now,
    });

    setAndPersist({
      investmentHoldings: [newHolding, ...investmentHoldings],
      investmentPriceHistory: upsertDailyInvestmentPriceHistoryPoint(
        investmentPriceHistory,
        initialPriceHistoryPoint
      ),
    });

    return {
      success: true,
      message: 'Investment holding added successfully.',
    };
  },

  updateInvestmentHolding: (payload) => {
    const {
      accounts,
      investmentHoldings,
      investmentOrders,
      investmentPriceHistory,
    } = get();

    const targetHolding = investmentHoldings.find(
      (holding) => holding.id === payload.holdingId
    );

    if (!targetHolding) {
      return {
        success: false,
        message: 'Investment holding not found.',
      };
    }

    const account = accounts.find((item) => item.id === payload.accountId);

    if (!account) {
      return {
        success: false,
        message: 'Investment account not found.',
      };
    }

    if (account.type !== 'broker' && account.type !== 'crypto_wallet') {
      return {
        success: false,
        message: 'Investment holding must use a broker or crypto wallet account.',
      };
    }

    const trimmedName = payload.name.trim();
    const trimmedSymbol = payload.symbol.trim().toUpperCase();

    if (!trimmedName) {
      return {
        success: false,
        message: 'Asset name is required.',
      };
    }

    if (!trimmedSymbol) {
      return {
        success: false,
        message: 'Asset symbol is required.',
      };
    }

    if (!Number.isFinite(payload.quantity) || payload.quantity <= 0) {
      return {
        success: false,
        message: 'Quantity must be greater than 0.',
      };
    }

    if (
      !Number.isFinite(payload.averagePrice) ||
      !Number.isFinite(payload.currentPrice) ||
      payload.averagePrice < 0 ||
      payload.currentPrice < 0
    ) {
      return {
        success: false,
        message: 'Price cannot be negative.',
      };
    }

    const hasOrderHistory = investmentOrders.some(
      (order) => order.holdingId === payload.holdingId
    );
    const identityChanged =
      targetHolding.accountId !== payload.accountId ||
      targetHolding.symbol.trim().toUpperCase() !== trimmedSymbol ||
      targetHolding.assetType !== payload.assetType ||
      targetHolding.currency !== payload.currency;

    if (hasOrderHistory && identityChanged) {
      return {
        success: false,
        message:
          'This holding has buy/sell history. Account, symbol, asset type, and currency are locked for data safety.',
      };
    }

    const duplicateHolding = investmentHoldings.find(
      (holding) =>
        holding.id !== payload.holdingId &&
        holding.accountId === account.id &&
        holding.symbol.trim().toUpperCase() === trimmedSymbol &&
        holding.assetType === payload.assetType &&
        holding.currency === payload.currency
    );

    if (duplicateHolding) {
      return {
        success: false,
        message: 'This asset already exists in the selected account.',
      };
    }

    const now = new Date().toISOString();
    const priceChanged =
      Math.abs(targetHolding.currentPrice - payload.currentPrice) > 0.00000001 ||
      targetHolding.currency !== payload.currency;

    const updatedHolding: InvestmentHolding = {
      ...targetHolding,
      accountId: account.id,
      name: trimmedName,
      symbol: trimmedSymbol,
      assetType: payload.assetType,
      quantity: payload.quantity,
      averagePrice: payload.averagePrice,
      currentPrice: payload.currentPrice,
      currency: payload.currency,
      note: payload.note?.trim() || undefined,
      updatedAt: now,
    };

    const metadataSyncedPriceHistory = investmentPriceHistory.map((point) =>
      point.holdingId === payload.holdingId
        ? {
            ...point,
            symbol: updatedHolding.symbol,
            name: updatedHolding.name,
            assetType: updatedHolding.assetType,
            currency: updatedHolding.currency,
          }
        : point
    );

    const nextPriceHistory = priceChanged
      ? upsertDailyInvestmentPriceHistoryPoint(
          metadataSyncedPriceHistory,
          createInvestmentPriceHistoryPoint({
            holdingId: updatedHolding.id,
            symbol: updatedHolding.symbol,
            name: updatedHolding.name,
            assetType: updatedHolding.assetType,
            price: updatedHolding.currentPrice,
            currency: updatedHolding.currency,
            source: 'manual',
            provider: 'Manual edit',
            recordedAt: now,
          })
        )
      : metadataSyncedPriceHistory;

    setAndPersist({
      investmentHoldings: investmentHoldings.map((holding) =>
        holding.id === payload.holdingId ? updatedHolding : holding
      ),
      investmentPriceHistory: nextPriceHistory,
    });

    return {
      success: true,
      message: 'Investment holding updated successfully.',
    };
  },

  buyInvestmentAsset: (payload) => {
    const {
      accounts,
      investmentHoldings,
      investmentOrders,
      investmentPriceHistory,
      transactions,
      defaultCurrency,
      exchangeRates,
    } = get();
    const account = accounts.find((item) => item.id === payload.accountId);
    const trimmedName = payload.name.trim();
    const normalizedSymbol = payload.symbol.trim().toUpperCase();

    if (!account) {
      return {
        success: false,
        message: 'Investment account not found.',
      };
    }

    if (!trimmedName || !normalizedSymbol) {
      return {
        success: false,
        message: 'Asset name and symbol are required.',
      };
    }

    if (!Number.isFinite(payload.quantity) || payload.quantity <= 0) {
      return {
        success: false,
        message: 'Buy quantity must be greater than 0.',
      };
    }

    if (!Number.isFinite(payload.price) || payload.price <= 0) {
      return {
        success: false,
        message: 'Buy price must be greater than 0.',
      };
    }

    if (!Number.isFinite(payload.fee) || payload.fee < 0) {
      return {
        success: false,
        message: 'Fee cannot be negative.',
      };
    }

    const existingHolding = investmentHoldings.find((holding) =>
      isSameInvestmentAsset(holding, {
        accountId: payload.accountId,
        symbol: normalizedSymbol,
        assetType: payload.assetType,
        currency: payload.currency,
      })
    );
    const now = payload.recordedAt || new Date().toISOString();
    const grossAmount = payload.quantity * payload.price;
    const totalAmount = grossAmount + payload.fee;
    const accountImpactAmount = convertAmountBetweenCurrencies(
      totalAmount,
      payload.currency,
      account.currency,
      createExchangeRateSnapshot(exchangeRates)
    );

    if (account.balance - accountImpactAmount < -0.00000001) {
      return {
        success: false,
        message: `${account.name} balance is not enough for this buy order.`,
      };
    }

    const nextHoldingId = existingHolding?.id || createId('holding');
    const oldQuantity = existingHolding?.quantity || 0;
    const oldAveragePrice = existingHolding?.averagePrice || 0;
    const oldCostBasis = oldQuantity * oldAveragePrice;
    const nextQuantity = oldQuantity + payload.quantity;
    const nextAveragePrice =
      nextQuantity > 0 ? (oldCostBasis + totalAmount) / nextQuantity : payload.price;
    const nextHolding: InvestmentHolding = existingHolding
      ? {
          ...existingHolding,
          name: trimmedName,
          symbol: normalizedSymbol,
          quantity: nextQuantity,
          averagePrice: nextAveragePrice,
          currentPrice: payload.price,
          updatedAt: now,
        }
      : {
          id: nextHoldingId,
          accountId: account.id,
          name: trimmedName,
          symbol: normalizedSymbol,
          assetType: payload.assetType,
          quantity: payload.quantity,
          averagePrice: nextAveragePrice,
          currentPrice: payload.price,
          currency: payload.currency,
          note: payload.note?.trim() || undefined,
          createdAt: now,
          updatedAt: now,
        };
    const newInvestmentOrder: InvestmentOrder = {
      id: createId('inv-order'),
      holdingId: nextHoldingId,
      accountId: account.id,
      orderType: 'buy',
      symbol: normalizedSymbol,
      name: trimmedName,
      assetType: payload.assetType,
      quantity: payload.quantity,
      price: payload.price,
      fee: payload.fee,
      grossAmount,
      totalAmount,
      realizedPnL: 0,
      currency: payload.currency,
      date: now,
      note: payload.note?.trim() || undefined,
      createdAt: now,
    };
    const historicalSnapshot = buildHistoricalTransactionSnapshot(
      totalAmount,
      payload.currency,
      defaultCurrency,
      account.currency,
      exchangeRates
    );
    const newTransaction: Transaction = {
      id: createId('trx'),
      type: 'investment_buy',
      title: `Buy ${normalizedSymbol}`,
      amount: totalAmount,
      currency: payload.currency,
      ...historicalSnapshot,
      accountId: account.id,
      accountName: account.name,
      categoryName: 'Investment Buy',
      date: now,
      note: payload.note?.trim() || undefined,
    };
    const priceHistoryPoint = createInvestmentPriceHistoryPoint({
      holdingId: nextHoldingId,
      symbol: normalizedSymbol,
      name: trimmedName,
      assetType: payload.assetType,
      price: payload.price,
      currency: payload.currency,
      source: 'order',
      provider: payload.provider,
      recordedAt: now,
    });
    const nextHoldings = existingHolding
      ? investmentHoldings.map((holding) =>
          holding.id === existingHolding.id ? nextHolding : holding
        )
      : [nextHolding, ...investmentHoldings];

    setAndPersist({
      accounts: accounts.map((item) =>
        item.id === account.id
          ? {
              ...item,
              balance: item.balance - accountImpactAmount,
              updatedAt: now,
            }
          : item
      ),
      investmentHoldings: nextHoldings,
      investmentOrders: [newInvestmentOrder, ...investmentOrders],
      investmentPriceHistory: upsertDailyInvestmentPriceHistoryPoint(
        investmentPriceHistory,
        priceHistoryPoint
      ),
      transactions: [newTransaction, ...transactions],
    });

    return {
      success: true,
      message: existingHolding
        ? 'Asset buy added to existing holding.'
        : 'Asset bought and new holding created.',
    };
  },


  deleteCryptoTransaction: (transactionId) => {
    const {
      investmentHoldings,
      investmentOrders,
      transactions,
    } = get();

    const targetTransaction = transactions.find(
      (transaction) => transaction.id === transactionId
    );

    if (!targetTransaction) {
      return {
        success: false,
        message: 'Crypto transaction not found.',
      };
    }

    const isCryptoTransaction =
      targetTransaction.categoryName === 'Crypto Income' ||
      targetTransaction.categoryName === 'Crypto Payment' ||
      targetTransaction.title.toLowerCase().startsWith('crypto income') ||
      targetTransaction.title.toLowerCase().startsWith('crypto payment') ||
      targetTransaction.note?.includes('Crypto qty:') ||
      /[0-9.]+\s+[A-Z0-9]+\s+@\s+[0-9.]+\s+[A-Z]{3}/i.test(
        targetTransaction.note || ''
      );

    if (!isCryptoTransaction) {
      return {
        success: false,
        message: 'Only crypto transactions can be deleted here.',
      };
    }

    const structuredMatch = `${targetTransaction.title || ''} ${
      targetTransaction.note || ''
    }`.match(
      /Crypto qty:\s*([0-9.]+)\s+([A-Z0-9]+)\s+•\s+Rate:\s*([0-9.]+)\s+([A-Z]{3})/i
    );
    const legacyMatch = `${targetTransaction.title || ''} ${
      targetTransaction.note || ''
    }`.match(/([0-9.]+)\s+([A-Z0-9]+)\s+@\s+([0-9.]+)\s+([A-Z]{3})/i);
    const match = structuredMatch || legacyMatch;
    const symbolFromTitle = targetTransaction.title.match(
      /Crypto\s+(?:Income|Payment)\s+([A-Z0-9]+)/i
    );
    const quantity = Number(match?.[1] || 0);
    const symbol = (match?.[2] || symbolFromTitle?.[1] || '')
      .trim()
      .toUpperCase();
    const isPayment =
      targetTransaction.type === 'expense' ||
      targetTransaction.categoryName === 'Crypto Payment' ||
      targetTransaction.title.toLowerCase().startsWith('crypto payment') ||
      targetTransaction.note?.toLowerCase().includes('crypto payment');

    if (!symbol || !Number.isFinite(quantity) || quantity <= 0) {
      return {
        success: false,
        message:
          'Crypto metadata is incomplete. This transaction cannot be deleted safely.',
      };
    }

    const candidateOrders = investmentOrders.filter((order) => {
      const sameSymbol = order.symbol.trim().toUpperCase() === symbol;
      const sameType = isPayment
        ? order.orderType === 'sell'
        : order.orderType === 'buy';
      const sameAsset = order.assetType === 'crypto';
      const sameQuantity = Math.abs(order.quantity - quantity) < 0.00000001;
      const sameDate =
        new Date(order.date).toISOString().slice(0, 10) ===
        new Date(targetTransaction.date).toISOString().slice(0, 10);

      return sameSymbol && sameType && sameAsset && sameQuantity && sameDate;
    });

    const targetOrder =
      candidateOrders.find(
        (order) =>
          Math.abs(order.totalAmount - targetTransaction.amount) < 0.00000001 ||
          order.note?.includes(targetTransaction.note || '__no_note__')
      ) || candidateOrders[0];

    if (!targetOrder) {
      return {
        success: false,
        message:
          'Matching crypto order was not found. Delete blocked to protect holding data.',
      };
    }

    const holding = investmentHoldings.find(
      (item) => item.id === targetOrder.holdingId
    );

    if (!holding) {
      return {
        success: false,
        message:
          'Matching holding was not found. Delete blocked to protect portfolio data.',
      };
    }

    if (!isPayment && holding.quantity < targetOrder.quantity - 0.00000001) {
      return {
        success: false,
        message:
          'This crypto income cannot be deleted because current holding quantity is lower than the original income quantity.',
      };
    }

    const now = new Date().toISOString();
    const nextHolding: InvestmentHolding = isPayment
      ? {
          ...holding,
          quantity: holding.quantity + targetOrder.quantity,
          updatedAt: now,
        }
      : {
          ...holding,
          quantity: Math.max(holding.quantity - targetOrder.quantity, 0),
          updatedAt: now,
        };

    setAndPersist({
      investmentHoldings: investmentHoldings
        .map((item) => (item.id === holding.id ? nextHolding : item))
        .filter((item) => item.quantity > 0),
      investmentOrders: investmentOrders.filter(
        (order) => order.id !== targetOrder.id
      ),
      transactions: transactions.filter(
        (transaction) => transaction.id !== targetTransaction.id
      ),
    });

    return {
      success: true,
      message: isPayment
        ? 'Crypto payment deleted and holding quantity restored.'
        : 'Crypto income deleted and holding quantity rolled back.',
    };
  },


  updateCryptoTransactionDetails: (payload) => {
    const {
      categories,
      investmentHoldings,
      investmentOrders,
      transactions,
    } = get();

    const targetTransaction = transactions.find(
      (transaction) => transaction.id === payload.transactionId
    );

    if (!targetTransaction) {
      return {
        success: false,
        message: 'Crypto transaction not found.',
      };
    }

    const isCryptoTransaction =
      targetTransaction.categoryName === 'Crypto Income' ||
      targetTransaction.categoryName === 'Crypto Payment' ||
      targetTransaction.title.toLowerCase().startsWith('crypto income') ||
      targetTransaction.title.toLowerCase().startsWith('crypto payment') ||
      targetTransaction.note?.includes('Crypto qty:') ||
      /[0-9.]+\s+[A-Z0-9]+\s+@\s+[0-9.]+\s+[A-Z]{3}/i.test(
        targetTransaction.note || ''
      );

    if (!isCryptoTransaction) {
      return {
        success: false,
        message: 'Only crypto transactions can be edited here.',
      };
    }

    const trimmedTitle = payload.title.trim();

    if (!trimmedTitle) {
      return {
        success: false,
        message: 'Transaction title is required.',
      };
    }

    const isPayment =
      targetTransaction.type === 'expense' ||
      targetTransaction.categoryName === 'Crypto Payment' ||
      targetTransaction.title.toLowerCase().startsWith('crypto payment') ||
      targetTransaction.note?.toLowerCase().includes('crypto payment');
    const expectedCategoryType = isPayment ? 'expense' : 'income';
    const category = categories.find(
      (item) =>
        item.id === payload.categoryId && item.type === expectedCategoryType
    );

    const noteText = `${targetTransaction.title || ''} ${
      targetTransaction.note || ''
    }`;
    const structuredMatch = noteText.match(
      /Crypto qty:\s*([0-9.]+)\s+([A-Z0-9]+)\s+•\s+Rate:\s*([0-9.]+)\s+([A-Z]{3})\s+•\s+Source:\s*([^•]+)/i
    );
    const legacyMatch = noteText.match(
      /([0-9.]+)\s+([A-Z0-9]+)\s+@\s+([0-9.]+)\s+([A-Z]{3})/i
    );
    const match = structuredMatch || legacyMatch;
    const symbolFromTitle = targetTransaction.title.match(
      /Crypto\s+(?:Income|Payment)\s+([A-Z0-9]+)/i
    );

    if (!match && !symbolFromTitle?.[1]) {
      return {
        success: false,
        message:
          'Crypto metadata is incomplete. This transaction cannot be edited safely.',
      };
    }

    const oldQuantity = Number(match?.[1] || 0);
    const symbol = (match?.[2] || symbolFromTitle?.[1] || 'Crypto')
      .trim()
      .toUpperCase();
    const storedRate = Number(match?.[3] || 0);
    const rateCurrency = (match?.[4] || targetTransaction.currency || 'IDR')
      .trim()
      .toUpperCase() as Currency;
    const source = structuredMatch
      ? (match?.[5] || 'Manual').trim()
      : 'Manual / legacy';

    if (!Number.isFinite(oldQuantity) || oldQuantity <= 0) {
      return {
        success: false,
        message: 'Original crypto quantity is invalid.',
      };
    }

    const nextQuantity =
      payload.quantity !== undefined ? payload.quantity : oldQuantity;

    if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
      return {
        success: false,
        message: 'Crypto quantity must be greater than 0.',
      };
    }

    const safeRate =
      Number.isFinite(storedRate) && storedRate > 0
        ? storedRate
        : targetTransaction.amount / oldQuantity;

    if (!Number.isFinite(safeRate) || safeRate <= 0) {
      return {
        success: false,
        message: 'Stored crypto rate is invalid. Quantity cannot be edited safely.',
      };
    }

    const candidateOrders = investmentOrders.filter((order) => {
      const sameSymbol = order.symbol.trim().toUpperCase() === symbol;
      const sameType = isPayment
        ? order.orderType === 'sell'
        : order.orderType === 'buy';
      const sameAsset = order.assetType === 'crypto';
      const sameQuantity = Math.abs(order.quantity - oldQuantity) < 0.00000001;
      const sameDate =
        new Date(order.date).toISOString().slice(0, 10) ===
        new Date(targetTransaction.date).toISOString().slice(0, 10);

      return sameSymbol && sameType && sameAsset && sameQuantity && sameDate;
    });
    const matchingOrder =
      candidateOrders.find(
        (order) =>
          Math.abs(order.totalAmount - targetTransaction.amount) < 0.00000001 ||
          order.note?.includes(targetTransaction.note || '__no_note__')
      ) || candidateOrders[0];

    if (!matchingOrder) {
      return {
        success: false,
        message:
          'Matching crypto order was not found. Quantity edit is blocked to protect portfolio data.',
      };
    }

    const holding = investmentHoldings.find(
      (item) => item.id === matchingOrder.holdingId
    );

    if (!holding) {
      return {
        success: false,
        message:
          'Matching crypto holding was not found. Quantity edit is blocked.',
      };
    }

    const quantityDelta = nextQuantity - oldQuantity;
    let nextHolding = holding;
    let nextRealizedPnL = matchingOrder.realizedPnL;

    if (isPayment) {
      const nextHoldingQuantity = holding.quantity - quantityDelta;

      if (nextHoldingQuantity < -0.00000001) {
        return {
          success: false,
          message:
            'Crypto payment quantity is greater than available holding quantity.',
        };
      }

      const realizedPerUnit =
        oldQuantity > 0
          ? matchingOrder.realizedPnL / oldQuantity
          : matchingOrder.price - holding.averagePrice;

      nextRealizedPnL = realizedPerUnit * nextQuantity;
      nextHolding = {
        ...holding,
        quantity: Math.max(nextHoldingQuantity, 0),
        currentPrice: matchingOrder.price,
        updatedAt: new Date().toISOString(),
      };
    } else {
      const nextHoldingQuantity = holding.quantity + quantityDelta;

      if (nextHoldingQuantity < -0.00000001) {
        return {
          success: false,
          message:
            'Crypto income quantity cannot be reduced because current holding quantity is lower than the reduction amount.',
        };
      }

      const currentCost = holding.quantity * holding.averagePrice;
      const nextCost = currentCost + quantityDelta * matchingOrder.price;
      const nextAveragePrice =
        nextHoldingQuantity > 0
          ? Math.max(nextCost, 0) / nextHoldingQuantity
          : holding.averagePrice;

      nextHolding = {
        ...holding,
        quantity: Math.max(nextHoldingQuantity, 0),
        averagePrice: nextAveragePrice,
        currentPrice: matchingOrder.price,
        updatedAt: new Date().toISOString(),
      };
      nextRealizedPnL = 0;
    }

    const cleanUserNote = payload.note?.trim();
    const nextNote = `Crypto qty: ${nextQuantity} ${symbol} • Rate: ${safeRate} ${rateCurrency} • Source: ${source}${
      cleanUserNote ? ` • Note: ${cleanUserNote}` : ''
    }`;
    const nextAmount = nextQuantity * safeRate;
    const amountRatio = nextQuantity / oldQuantity;
    const nextGrossAmount = matchingOrder.grossAmount * amountRatio;
    const nextTotalAmount = matchingOrder.totalAmount * amountRatio;

    setAndPersist({
      investmentHoldings: investmentHoldings
        .map((item) => (item.id === holding.id ? nextHolding : item))
        .filter((item) => item.quantity > 0),
      transactions: transactions.map((transaction) =>
        transaction.id === targetTransaction.id
          ? {
              ...transaction,
              title: trimmedTitle,
              amount: nextAmount,
              currency: rateCurrency,
              categoryId: category?.id,
              categoryName:
                category?.name ||
                targetTransaction.categoryName ||
                (isPayment ? 'Crypto Payment' : 'Crypto Income'),
              date: payload.date || targetTransaction.date,
              note: nextNote,
            }
          : transaction
      ),
      investmentOrders: investmentOrders.map((order) =>
        order.id === matchingOrder.id
          ? {
              ...order,
              quantity: nextQuantity,
              grossAmount: nextGrossAmount,
              totalAmount: nextTotalAmount,
              realizedPnL: nextRealizedPnL,
              date: payload.date || order.date,
              note: nextNote,
            }
          : order
      ),
    });

    return {
      success: true,
      message: 'Crypto transaction updated safely.',
    };
  },

  addCryptoIncome: (payload) => {
    const {
      accounts,
      categories,
      investmentHoldings,
      investmentOrders,
      investmentPriceHistory,
      transactions,
      defaultCurrency,
      exchangeRates,
    } = get();

    const account = accounts.find((item) => item.id === payload.accountId);
    const trimmedSymbol = payload.symbol.trim().toUpperCase();
    const trimmedName = payload.name.trim() || trimmedSymbol;

    if (!account) {
      return {
        success: false,
        message: 'Crypto wallet or investment account not found.',
      };
    }

    if (account.type !== 'broker' && account.type !== 'crypto_wallet') {
      return {
        success: false,
        message: 'Crypto income must go to a broker or crypto wallet account.',
      };
    }

    if (!trimmedSymbol || !trimmedName) {
      return {
        success: false,
        message: 'Crypto asset name and symbol are required.',
      };
    }

    if (!Number.isFinite(payload.quantity) || payload.quantity <= 0) {
      return {
        success: false,
        message: 'Crypto quantity must be greater than 0.',
      };
    }

    if (!Number.isFinite(payload.rate) || payload.rate <= 0) {
      return {
        success: false,
        message: 'Crypto rate must be greater than 0.',
      };
    }

    const now = new Date().toISOString();
    const transactionDate = payload.date || now;
    const existingHolding =
      investmentHoldings.find((holding) => holding.id === payload.holdingId) ||
      investmentHoldings.find(
        (holding) =>
          holding.accountId === account.id &&
          holding.assetType === 'crypto' &&
          holding.symbol.trim().toUpperCase() === trimmedSymbol &&
          holding.currency === payload.rateCurrency
      );

    const holdingCurrency = existingHolding?.currency || payload.rateCurrency;
    const rateInHoldingCurrency = convertAmountBetweenCurrencies(
      payload.rate,
      payload.rateCurrency,
      holdingCurrency,
      exchangeRates
    );
    const oldQuantity = existingHolding?.quantity || 0;
    const oldAveragePrice = existingHolding?.averagePrice || 0;
    const nextQuantity = oldQuantity + payload.quantity;
    const nextAveragePrice =
      nextQuantity > 0
        ? (oldQuantity * oldAveragePrice + payload.quantity * rateInHoldingCurrency) /
          nextQuantity
        : rateInHoldingCurrency;
    const holdingId = existingHolding?.id || createId('holding');

    const nextHolding: InvestmentHolding = existingHolding
      ? {
          ...existingHolding,
          name: trimmedName,
          symbol: trimmedSymbol,
          quantity: nextQuantity,
          averagePrice: nextAveragePrice,
          currentPrice: rateInHoldingCurrency,
          updatedAt: now,
        }
      : {
          id: holdingId,
          accountId: account.id,
          name: trimmedName,
          symbol: trimmedSymbol,
          assetType: 'crypto',
          quantity: payload.quantity,
          averagePrice: rateInHoldingCurrency,
          currentPrice: rateInHoldingCurrency,
          currency: holdingCurrency,
          note: payload.note?.trim() || undefined,
          createdAt: now,
          updatedAt: now,
        };

    const category = categories.find(
      (item) => item.id === payload.categoryId && item.type === 'income'
    );
    const transactionTitle =
      payload.title?.trim() || `Crypto Income ${trimmedSymbol}`;
    const transactionAmount = payload.quantity * payload.rate;
    const historicalSnapshot = buildHistoricalTransactionSnapshot(
      transactionAmount,
      payload.rateCurrency,
      defaultCurrency,
      account.currency || defaultCurrency,
      exchangeRates
    );
    const newTransaction: Transaction = {
      id: createId('trx'),
      type: 'income',
      title: transactionTitle,
      amount: transactionAmount,
      currency: payload.rateCurrency,
      ...historicalSnapshot,
      accountId: account.id,
      accountName: account.name,
      categoryId: category?.id,
      categoryName:
        category?.name || payload.categoryName || 'Crypto Income',
      date: transactionDate,
      note:
        `Crypto qty: ${payload.quantity} ${trimmedSymbol} • Rate: ${payload.rate} ${
          payload.rateCurrency
        } • Source: ${payload.provider || 'Manual'}${
          payload.note?.trim() ? ` • Note: ${payload.note.trim()}` : ''
        }`,
    };
    const newInvestmentOrder: InvestmentOrder = {
      id: createId('inv-order'),
      holdingId,
      accountId: account.id,
      orderType: 'buy',
      symbol: trimmedSymbol,
      name: trimmedName,
      assetType: 'crypto',
      quantity: payload.quantity,
      price: rateInHoldingCurrency,
      fee: 0,
      grossAmount: payload.quantity * rateInHoldingCurrency,
      totalAmount: payload.quantity * rateInHoldingCurrency,
      realizedPnL: 0,
      currency: holdingCurrency,
      date: transactionDate,
      note:
        `Crypto income • ${payload.quantity} ${trimmedSymbol} @ ${payload.rate} ${
          payload.rateCurrency
        } • Source: ${payload.provider || 'Manual'}${
          payload.note?.trim() ? ` • Note: ${payload.note.trim()}` : ''
        }`,
      createdAt: now,
    };
    const priceHistoryPoint = createInvestmentPriceHistoryPoint({
      holdingId,
      symbol: trimmedSymbol,
      name: trimmedName,
      assetType: 'crypto',
      price: rateInHoldingCurrency,
      currency: holdingCurrency,
      source: payload.provider ? 'order' : 'manual',
      provider: payload.provider,
      recordedAt: transactionDate,
    });

    setAndPersist({
      investmentHoldings: existingHolding
        ? investmentHoldings.map((holding) =>
            holding.id === existingHolding.id ? nextHolding : holding
          )
        : [nextHolding, ...investmentHoldings],
      investmentOrders: [newInvestmentOrder, ...investmentOrders],
      investmentPriceHistory: upsertDailyInvestmentPriceHistoryPoint(
        investmentPriceHistory,
        priceHistoryPoint
      ),
      transactions: [newTransaction, ...transactions],
    });

    return {
      success: true,
      message: existingHolding
        ? 'Crypto income added to existing holding.'
        : 'Crypto income added as a new holding.',
    };
  },

  addCryptoExpense: (payload) => {
    const {
      accounts,
      categories,
      investmentHoldings,
      investmentOrders,
      investmentPriceHistory,
      transactions,
      defaultCurrency,
      exchangeRates,
    } = get();

    const holding = investmentHoldings.find((item) => item.id === payload.holdingId);

    if (!holding || holding.assetType !== 'crypto') {
      return {
        success: false,
        message: 'Crypto holding not found.',
      };
    }

    const account = accounts.find((item) => item.id === holding.accountId);

    if (!account) {
      return {
        success: false,
        message: 'Crypto wallet account not found.',
      };
    }

    if (!Number.isFinite(payload.quantity) || payload.quantity <= 0) {
      return {
        success: false,
        message: 'Crypto quantity must be greater than 0.',
      };
    }

    if (payload.quantity > holding.quantity) {
      return {
        success: false,
        message: 'Crypto quantity cannot be greater than current holding quantity.',
      };
    }

    if (!Number.isFinite(payload.rate) || payload.rate <= 0) {
      return {
        success: false,
        message: 'Crypto rate must be greater than 0.',
      };
    }

    const category = categories.find(
      (item) => item.id === payload.categoryId && item.type === 'expense'
    );
    const transactionTitle =
      payload.title?.trim() || `Crypto Payment ${holding.symbol}`;
    const now = new Date().toISOString();
    const transactionDate = payload.date || now;
    const rateInHoldingCurrency = convertAmountBetweenCurrencies(
      payload.rate,
      payload.rateCurrency,
      holding.currency,
      exchangeRates
    );
    const nextQuantity = Math.max(holding.quantity - payload.quantity, 0);
    const transactionAmount = payload.quantity * payload.rate;
    const realizedPnL =
      (rateInHoldingCurrency - holding.averagePrice) * payload.quantity;
    const historicalSnapshot = buildHistoricalTransactionSnapshot(
      transactionAmount,
      payload.rateCurrency,
      defaultCurrency,
      account.currency || defaultCurrency,
      exchangeRates
    );
    const nextHolding: InvestmentHolding = {
      ...holding,
      quantity: nextQuantity,
      currentPrice: rateInHoldingCurrency,
      updatedAt: now,
    };
    const newTransaction: Transaction = {
      id: createId('trx'),
      type: 'expense',
      title: transactionTitle,
      amount: transactionAmount,
      currency: payload.rateCurrency,
      ...historicalSnapshot,
      accountId: account.id,
      accountName: account.name,
      categoryId: category?.id,
      categoryName:
        category?.name || payload.categoryName || 'Crypto Payment',
      date: transactionDate,
      note:
        `Crypto qty: ${payload.quantity} ${holding.symbol} • Rate: ${payload.rate} ${
          payload.rateCurrency
        } • Source: ${payload.provider || 'Manual'}${
          payload.note?.trim() ? ` • Note: ${payload.note.trim()}` : ''
        }`,
    };
    const newInvestmentOrder: InvestmentOrder = {
      id: createId('inv-order'),
      holdingId: holding.id,
      accountId: account.id,
      orderType: 'sell',
      symbol: holding.symbol,
      name: holding.name,
      assetType: 'crypto',
      quantity: payload.quantity,
      price: rateInHoldingCurrency,
      fee: 0,
      grossAmount: payload.quantity * rateInHoldingCurrency,
      totalAmount: payload.quantity * rateInHoldingCurrency,
      realizedPnL,
      currency: holding.currency,
      date: transactionDate,
      note:
        `Crypto payment • ${payload.quantity} ${holding.symbol} @ ${payload.rate} ${
          payload.rateCurrency
        } • Source: ${payload.provider || 'Manual'}${
          payload.note?.trim() ? ` • Note: ${payload.note.trim()}` : ''
        }`,
      createdAt: now,
    };
    const priceHistoryPoint = createInvestmentPriceHistoryPoint({
      holdingId: holding.id,
      symbol: holding.symbol,
      name: holding.name,
      assetType: holding.assetType,
      price: rateInHoldingCurrency,
      currency: holding.currency,
      source: payload.provider ? 'order' : 'manual',
      provider: payload.provider,
      recordedAt: transactionDate,
    });

    setAndPersist({
      investmentHoldings: investmentHoldings.map((item) =>
        item.id === holding.id ? nextHolding : item
      ),
      investmentOrders: [newInvestmentOrder, ...investmentOrders],
      investmentPriceHistory: upsertDailyInvestmentPriceHistoryPoint(
        investmentPriceHistory,
        priceHistoryPoint
      ),
      transactions: [newTransaction, ...transactions],
    });

    return {
      success: true,
      message: 'Crypto payment recorded successfully.',
    };
  },

  updateInvestmentHoldingPrice: (payload) => {
    const { investmentHoldings, investmentPriceHistory } = get();

    if (payload.currentPrice < 0) {
      return {
        success: false,
        message: 'Current price cannot be negative.',
      };
    }

    const targetHolding = investmentHoldings.find(
      (holding) => holding.id === payload.holdingId
    );

    if (!targetHolding) {
      return {
        success: false,
        message: 'Investment holding not found.',
      };
    }

    const now = payload.recordedAt || new Date().toISOString();
    const priceHistoryPoint = createInvestmentPriceHistoryPoint({
      holdingId: targetHolding.id,
      symbol: targetHolding.symbol,
      name: targetHolding.name,
      assetType: targetHolding.assetType,
      price: payload.currentPrice,
      currency: targetHolding.currency,
      source: payload.source || 'manual',
      provider: payload.provider,
      recordedAt: now,
    });

    setAndPersist({
      investmentHoldings: investmentHoldings.map((holding) =>
        holding.id === payload.holdingId
          ? {
              ...holding,
              currentPrice: payload.currentPrice,
              updatedAt: now,
            }
          : holding
      ),
      investmentPriceHistory: upsertDailyInvestmentPriceHistoryPoint(
        investmentPriceHistory,
        priceHistoryPoint
      ),
    });

    return {
      success: true,
      message: 'Investment price updated successfully.',
    };
  },

  upsertInvestmentPriceHistoryPoint: (payload) => {
    const { investmentPriceHistory } = get();

    if (!Number.isFinite(payload.price) || payload.price < 0) {
      return {
        success: false,
        message: 'Investment price history value is invalid.',
      };
    }

    const priceHistoryPoint = createInvestmentPriceHistoryPoint(payload);

    setAndPersist({
      investmentPriceHistory: upsertDailyInvestmentPriceHistoryPoint(
        investmentPriceHistory,
        priceHistoryPoint
      ),
    });

    return {
      success: true,
      message: 'Investment price history saved successfully.',
    };
  },

  backfillInvestmentPriceHistory: () => {
    const { investmentHoldings, investmentPriceHistory } = get();
    const nextHistory = backfillInvestmentPriceHistoryForHoldings(
      investmentHoldings,
      investmentPriceHistory
    );

    if (nextHistory.length === investmentPriceHistory.length) {
      return {
        success: true,
        message: 'All holdings already have price history.',
      };
    }

    setAndPersist({
      investmentPriceHistory: nextHistory,
    });

    return {
      success: true,
      message: `Backfilled ${nextHistory.length - investmentPriceHistory.length} holding price histories.`,
    };
  },

  deleteInvestmentHolding: (holdingId) => {
    const { investmentHoldings, investmentOrders, investmentPriceHistory } = get();

    const holdingExists = investmentHoldings.some(
      (holding) => holding.id === holdingId
    );

    if (!holdingExists) {
      return {
        success: false,
        message: 'Investment holding not found.',
      };
    }

    const hasOrderHistory = investmentOrders.some(
      (order) => order.holdingId === holdingId
    );

    if (hasOrderHistory) {
      return {
        success: false,
        message:
          'This holding has buy/sell history, so it cannot be deleted safely. Keep it for records or sell the position down first.',
      };
    }

    setAndPersist({
      investmentHoldings: investmentHoldings.filter(
        (holding) => holding.id !== holdingId
      ),
      investmentPriceHistory: investmentPriceHistory.filter(
        (point) => point.holdingId !== holdingId
      ),
    });

    return {
      success: true,
      message: 'Investment holding deleted successfully.',
    };
  },

  addInvestmentOrder: (payload) => {
    const {
      accounts,
      investmentHoldings,
      investmentOrders,
      investmentPriceHistory,
      transactions,
      defaultCurrency,
      exchangeRates,
    } = get();

    const holding = investmentHoldings.find((item) => item.id === payload.holdingId);

    if (!holding) {
      return {
        success: false,
        message: 'Investment holding not found.',
      };
    }

    const account = accounts.find((item) => item.id === holding.accountId);

    if (!account) {
      return {
        success: false,
        message: 'Investment account not found.',
      };
    }

    if (payload.quantity <= 0) {
      return {
        success: false,
        message: 'Quantity must be greater than 0.',
      };
    }

    if (payload.price < 0) {
      return {
        success: false,
        message: 'Price cannot be negative.',
      };
    }

    const orderCurrency = payload.currency || holding.currency;
    const accountCurrency = account.currency || defaultCurrency;
    const fee = Math.max(payload.fee || 0, 0);
    const grossAmount = payload.quantity * payload.price;
    const totalAmount =
      payload.orderType === 'buy'
        ? grossAmount + fee
        : Math.max(grossAmount - fee, 0);

    const amountInAccountCurrency = convertAmountBetweenCurrencies(
      totalAmount,
      orderCurrency,
      accountCurrency,
      exchangeRates
    );

    const priceInHoldingCurrency = convertAmountBetweenCurrencies(
      payload.price,
      orderCurrency,
      holding.currency,
      exchangeRates
    );

    const feeInHoldingCurrency = convertAmountBetweenCurrencies(
      fee,
      orderCurrency,
      holding.currency,
      exchangeRates
    );

    const averagePriceInOrderCurrency = convertAmountBetweenCurrencies(
      holding.averagePrice,
      holding.currency,
      orderCurrency,
      exchangeRates
    );

    if (payload.orderType === 'buy' && account.balance < amountInAccountCurrency) {
      return {
        success: false,
        message: 'Account balance is not enough for this investment buy.',
      };
    }

    if (payload.orderType === 'sell' && payload.quantity > holding.quantity) {
      return {
        success: false,
        message: 'Sell quantity cannot be greater than current holding quantity.',
      };
    }

    const realizedPnL =
      payload.orderType === 'sell'
        ? (payload.price - averagePriceInOrderCurrency) * payload.quantity - fee
        : 0;

    const now = new Date().toISOString();
    const transactionDate = payload.date || now;
    const historicalSnapshot = buildHistoricalTransactionSnapshot(
      totalAmount,
      orderCurrency,
      defaultCurrency,
      accountCurrency,
      exchangeRates
    );

    let nextHolding = holding;

    if (payload.orderType === 'buy') {
      const oldCost = holding.quantity * holding.averagePrice;
      const additionalCost =
        payload.quantity * priceInHoldingCurrency + feeInHoldingCurrency;
      const nextQuantity = holding.quantity + payload.quantity;
      const nextAveragePrice =
        nextQuantity > 0 ? (oldCost + additionalCost) / nextQuantity : holding.averagePrice;

      nextHolding = {
        ...holding,
        quantity: nextQuantity,
        averagePrice: nextAveragePrice,
        currentPrice: priceInHoldingCurrency,
        updatedAt: now,
      };
    } else {
      const nextQuantity = Math.max(holding.quantity - payload.quantity, 0);

      nextHolding = {
        ...holding,
        quantity: nextQuantity,
        currentPrice: priceInHoldingCurrency,
        updatedAt: now,
      };
    }

    const nextAccountBalance =
      payload.orderType === 'buy'
        ? account.balance - amountInAccountCurrency
        : account.balance + amountInAccountCurrency;

    const newInvestmentOrder: InvestmentOrder = {
      id: createId('order'),
      holdingId: holding.id,
      accountId: account.id,
      orderType: payload.orderType,
      symbol: holding.symbol,
      name: holding.name,
      assetType: holding.assetType,
      quantity: payload.quantity,
      price: payload.price,
      fee,
      grossAmount,
      totalAmount,
      realizedPnL,
      currency: orderCurrency,
      date: transactionDate,
      note: payload.note?.trim() || undefined,
      createdAt: now,
    };

    const newTransaction: Transaction = {
      id: createId('trx'),
      type: payload.orderType === 'buy' ? 'investment_buy' : 'investment_sell',
      title: `${payload.orderType === 'buy' ? 'Buy' : 'Sell'} ${holding.symbol}`,
      amount: totalAmount,
      currency: orderCurrency,
      ...historicalSnapshot,
      accountId: account.id,
      accountName: account.name,
      categoryName: 'Investment',
      date: transactionDate,
      note:
        payload.note?.trim() ||
        `${payload.orderType === 'buy' ? 'Bought' : 'Sold'} ${payload.quantity} ${holding.symbol} @ ${payload.price} ${orderCurrency}`,
    };

    const orderPriceHistoryPoint = createInvestmentPriceHistoryPoint({
      holdingId: holding.id,
      symbol: holding.symbol,
      name: holding.name,
      assetType: holding.assetType,
      price: nextHolding.currentPrice,
      currency: holding.currency,
      source: 'order',
      recordedAt: transactionDate,
    });

    setAndPersist({
      accounts: accounts.map((item) =>
        item.id === account.id
          ? {
              ...item,
              balance: nextAccountBalance,
              updatedAt: now,
            }
          : item
      ),
      investmentHoldings: investmentHoldings
        .map((item) => (item.id === holding.id ? nextHolding : item))
        .filter((item) => item.quantity > 0),
      investmentOrders: [newInvestmentOrder, ...investmentOrders],
      investmentPriceHistory: upsertDailyInvestmentPriceHistoryPoint(
        investmentPriceHistory,
        orderPriceHistoryPoint
      ),
      transactions: [newTransaction, ...transactions],
    });

    return {
      success: true,
      message:
        payload.orderType === 'buy'
          ? 'Investment buy recorded successfully.'
          : 'Investment sell recorded successfully.',
    };
  },

  addNetWorthSnapshot: (payload) => {
    const { netWorthSnapshots } = get();

    if (!Number.isFinite(payload.netWorth) || payload.netWorth < 0) {
      return {
        success: false,
        message: 'Net worth value is invalid.',
      };
    }

    const now = new Date().toISOString();
    const snapshotDate = payload.date || now;

    const newSnapshot: NetWorthSnapshot = {
      id: createId('networth'),
      date: snapshotDate,
      currency: payload.currency,
      netWorth: payload.netWorth,
      cashValue: Math.max(payload.cashValue || 0, 0),
      savingValue: Math.max(payload.savingValue || 0, 0),
      investmentValue: Math.max(payload.investmentValue || 0, 0),
      liabilityValue: Math.max(payload.liabilityValue || 0, 0),
      note: payload.note?.trim() || undefined,
      createdAt: now,
    };

    setAndPersist({
      netWorthSnapshots: [newSnapshot, ...netWorthSnapshots],
    });

    return {
      success: true,
      message: 'Net worth snapshot saved successfully.',
    };
  },

  upsertTodayNetWorthSnapshot: (payload) => {
    const { netWorthSnapshots } = get();

    if (!Number.isFinite(payload.netWorth) || payload.netWorth < 0) {
      return {
        success: false,
        message: 'Net worth value is invalid.',
      };
    }

    const now = new Date().toISOString();
    const snapshotDate = payload.date || now;
    const todayKey = getLocalDateKey(snapshotDate);
    const existingSnapshot = netWorthSnapshots.find(
      (snapshot) => getLocalDateKey(snapshot.date) === todayKey
    );

    const nextSnapshot: NetWorthSnapshot = {
      id: existingSnapshot?.id || createId('networth'),
      date: snapshotDate,
      currency: payload.currency,
      netWorth: payload.netWorth,
      cashValue: Math.max(payload.cashValue || 0, 0),
      savingValue: Math.max(payload.savingValue || 0, 0),
      investmentValue: Math.max(payload.investmentValue || 0, 0),
      liabilityValue: Math.max(payload.liabilityValue || 0, 0),
      note: payload.note?.trim() || 'Auto daily net worth history',
      createdAt: existingSnapshot?.createdAt || now,
    };

    setAndPersist({
      netWorthSnapshots: existingSnapshot
        ? netWorthSnapshots.map((snapshot) =>
            snapshot.id === existingSnapshot.id ? nextSnapshot : snapshot
          )
        : [nextSnapshot, ...netWorthSnapshots],
    });

    return {
      success: true,
      message: existingSnapshot
        ? 'Today net worth history updated.'
        : 'Today net worth history saved.',
    };
  },

  deleteNetWorthSnapshot: (snapshotId) => {
    const { netWorthSnapshots } = get();

    const snapshotExists = netWorthSnapshots.some(
      (snapshot) => snapshot.id === snapshotId
    );

    if (!snapshotExists) {
      return {
        success: false,
        message: 'Net worth snapshot not found.',
      };
    }

    setAndPersist({
      netWorthSnapshots: netWorthSnapshots.filter(
        (snapshot) => snapshot.id !== snapshotId
      ),
    });

    return {
      success: true,
      message: 'Net worth snapshot deleted successfully.',
    };
  },

  addIncome: (payload) => {
    const { accounts, transactions, categories, defaultCurrency, exchangeRates } = get();

    if (payload.amount <= 0) {
      return {
        success: false,
        message: 'Amount must be greater than 0.',
      };
    }

    const account = accounts.find((item) => item.id === payload.accountId);

    if (!account) {
      return {
        success: false,
        message: 'Account not found.',
      };
    }

    const transactionCurrency = resolveTransactionCurrency(
      payload.currency,
      account.currency || defaultCurrency
    );

    const historicalSnapshot = buildHistoricalTransactionSnapshot(
      payload.amount,
      transactionCurrency,
      defaultCurrency,
      account.currency || defaultCurrency,
      exchangeRates
    );

    const accountAmount = historicalSnapshot.accountAmountAtTransaction;

    const category = categories.find(
      (item) => item.id === payload.categoryId && item.type === 'income'
    );


    const newTransaction: Transaction = {
      id: createId('trx'),
      type: 'income',
      title: payload.title || 'Income',
      amount: payload.amount,
      currency: transactionCurrency,
      ...historicalSnapshot,
      accountId: account.id,
      accountName: account.name,
      categoryId: category?.id,
      categoryName:
        category?.name || payload.categoryName || getCategoryFallbackName('income'),
      date: payload.date || getTodayISO(),
      note: payload.note,
    };

    setAndPersist({
      accounts: accounts.map((item) =>
        item.id === account.id
          ? { ...item, balance: item.balance + accountAmount }
          : item
      ),
      transactions: [newTransaction, ...transactions],
    });

    return {
      success: true,
      message: 'Income added successfully.',
    };
  },

  addExpense: (payload) => {
    const { accounts, transactions, categories, defaultCurrency, exchangeRates } = get();

    if (payload.amount <= 0) {
      return {
        success: false,
        message: 'Amount must be greater than 0.',
      };
    }

    const account = accounts.find((item) => item.id === payload.accountId);

    if (!account) {
      return {
        success: false,
        message: 'Account not found.',
      };
    }

    const transactionCurrency = resolveTransactionCurrency(
      payload.currency,
      account.currency || defaultCurrency
    );

    const historicalSnapshot = buildHistoricalTransactionSnapshot(
      payload.amount,
      transactionCurrency,
      defaultCurrency,
      account.currency || defaultCurrency,
      exchangeRates
    );

    const accountAmount = historicalSnapshot.accountAmountAtTransaction;

    if (account.balance < accountAmount) {
      return {
        success: false,
        message: 'Insufficient account balance.',
      };
    }

    const category = categories.find(
      (item) => item.id === payload.categoryId && item.type === 'expense'
    );


    const newTransaction: Transaction = {
      id: createId('trx'),
      type: 'expense',
      title: payload.title || 'Expense',
      amount: payload.amount,
      currency: transactionCurrency,
      ...historicalSnapshot,
      accountId: account.id,
      accountName: account.name,
      categoryId: category?.id,
      categoryName:
        category?.name || payload.categoryName || getCategoryFallbackName('expense'),
      date: payload.date || getTodayISO(),
      note: payload.note,
    };

    setAndPersist({
      accounts: accounts.map((item) =>
        item.id === account.id
          ? { ...item, balance: item.balance - accountAmount }
          : item
      ),
      transactions: [newTransaction, ...transactions],
    });

    return {
      success: true,
      message: 'Expense added successfully.',
    };
  },



  deleteTransaction: (transactionId) => {
    const { accounts, transactions, exchangeRates } = get();
    const targetTransaction = transactions.find(
      (transaction) => transaction.id === transactionId
    );

    if (!targetTransaction) {
      return {
        success: false,
        message: 'Transaction not found.',
      };
    }

    const isCryptoTransaction =
      targetTransaction.categoryName === 'Crypto Income' ||
      targetTransaction.categoryName === 'Crypto Payment' ||
      targetTransaction.title.toLowerCase().startsWith('crypto income') ||
      targetTransaction.title.toLowerCase().startsWith('crypto payment') ||
      targetTransaction.note?.includes('Crypto qty:') ||
      /[0-9.]+\s+[A-Z0-9]+\s+@\s+[0-9.]+\s+[A-Z]{3}/i.test(
        targetTransaction.note || ''
      );

    if (isCryptoTransaction) {
      return {
        success: false,
        message:
          'Crypto transactions must be deleted from Crypto Transaction Detail so holding quantity can be rolled back safely.',
      };
    }

    if (!canEditTransactionDirectly(targetTransaction)) {
      return {
        success: false,
        message:
          'Only normal income and expense transactions can be deleted directly.',
      };
    }

    const account = accounts.find(
      (item) => item.id === targetTransaction.accountId
    );

    if (!account) {
      return {
        success: false,
        message: 'Account not found.',
      };
    }

    const accountAmount = getEditableTransactionAccountAmount(
      targetTransaction,
      account,
      exchangeRates
    );
    const oldDelta = getEditableTransactionDelta(
      targetTransaction.type,
      accountAmount
    );
    const nextBalance = account.balance - oldDelta;

    if (nextBalance < -0.00000001) {
      return {
        success: false,
        message: `${account.name} balance would become negative after deleting this transaction.`,
      };
    }

    setAndPersist({
      accounts: accounts.map((item) =>
        item.id === account.id
          ? {
              ...item,
              balance: nextBalance,
              updatedAt: new Date().toISOString(),
            }
          : item
      ),
      transactions: transactions.filter(
        (transaction) => transaction.id !== targetTransaction.id
      ),
    });

    return {
      success: true,
      message: 'Transaction deleted successfully.',
    };
  },

  updateTransaction: (payload) => {
    const { accounts, transactions, categories, defaultCurrency, exchangeRates } = get();
    const targetTransaction = transactions.find(
      (transaction) => transaction.id === payload.transactionId
    );

    if (!targetTransaction) {
      return {
        success: false,
        message: 'Transaction not found.',
      };
    }

    if (!canEditTransactionDirectly(targetTransaction)) {
      return {
        success: false,
        message:
          'Only income and expense transactions can be edited directly. Transfer, saving, and investment transactions are managed by their own modules.',
      };
    }

    const trimmedTitle = payload.title.trim();

    if (!trimmedTitle) {
      return {
        success: false,
        message: 'Transaction name is required.',
      };
    }

    if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
      return {
        success: false,
        message: 'Amount must be greater than 0.',
      };
    }

    const oldAccount = accounts.find(
      (account) => account.id === targetTransaction.accountId
    );
    const nextAccount = accounts.find((account) => account.id === payload.accountId);

    if (!oldAccount || !nextAccount) {
      return {
        success: false,
        message: 'Account not found.',
      };
    }

    const transactionCurrency = resolveTransactionCurrency(
      targetTransaction.currency,
      nextAccount.currency || defaultCurrency
    );
    const nextSnapshot = buildHistoricalTransactionSnapshot(
      payload.amount,
      transactionCurrency,
      defaultCurrency,
      nextAccount.currency || defaultCurrency,
      exchangeRates
    );
    const oldAccountAmount = getEditableTransactionAccountAmount(
      targetTransaction,
      oldAccount,
      exchangeRates
    );
    const nextAccountAmount = nextSnapshot.accountAmountAtTransaction;
    const oldDelta = getEditableTransactionDelta(
      targetTransaction.type,
      oldAccountAmount
    );
    const nextDelta = getEditableTransactionDelta(
      targetTransaction.type,
      nextAccountAmount
    );
    const balanceDeltaByAccountId: Record<string, number> = {
      [oldAccount.id]: -oldDelta,
    };

    balanceDeltaByAccountId[nextAccount.id] =
      (balanceDeltaByAccountId[nextAccount.id] || 0) + nextDelta;

    const nextAccounts = accounts.map((account) => {
      const balanceDelta = balanceDeltaByAccountId[account.id] || 0;

      return {
        ...account,
        balance: account.balance + balanceDelta,
        updatedAt:
          balanceDelta !== 0 ? new Date().toISOString() : account.updatedAt,
      };
    });
    const negativeAccount = nextAccounts.find((account) => account.balance < -0.00000001);

    if (negativeAccount) {
      return {
        success: false,
        message: `${negativeAccount.name} balance would become negative after this edit.`,
      };
    }

    const category = categories.find(
      (item) =>
        item.id === payload.categoryId && item.type === targetTransaction.type
    );
    const nextTransaction: Transaction = {
      ...targetTransaction,
      title: trimmedTitle,
      amount: payload.amount,
      currency: transactionCurrency,
      ...nextSnapshot,
      accountId: nextAccount.id,
      accountName: nextAccount.name,
      categoryId: category?.id,
      categoryName:
        category?.name ||
        targetTransaction.categoryName ||
        getCategoryFallbackName(
          targetTransaction.type === 'income' ? 'income' : 'expense'
        ),
      date: payload.date || targetTransaction.date,
      note: payload.note?.trim() || undefined,
    };

    setAndPersist({
      accounts: nextAccounts,
      transactions: transactions.map((transaction) =>
        transaction.id === targetTransaction.id ? nextTransaction : transaction
      ),
    });

    return {
      success: true,
      message: 'Transaction updated successfully.',
    };
  },


  transferBalance: (payload) => {
    const { accounts, tradingAccounts, transactions, defaultCurrency, exchangeRates } = get();

    if (payload.amount <= 0) {
      return {
        success: false,
        message: 'Amount must be greater than 0.',
      };
    }

    if (payload.fromAccountId === payload.toAccountId) {
      return {
        success: false,
        message: 'Source and destination account cannot be the same.',
      };
    }

    const fromEndpoint = resolveTransferEndpoint(
      payload.fromAccountId,
      accounts,
      tradingAccounts,
      defaultCurrency
    );

    const toEndpoint = resolveTransferEndpoint(
      payload.toAccountId,
      accounts,
      tradingAccounts,
      defaultCurrency
    );

    if (!fromEndpoint || !toEndpoint) {
      return {
        success: false,
        message: 'Source or destination account not found.',
      };
    }
    const fromTradingAccount = tradingAccounts.find(
      (account) => fromEndpoint.kind === 'trading' && account.id === fromEndpoint.rawId
    );
    const toTradingAccount = tradingAccounts.find(
      (account) => toEndpoint.kind === 'trading' && account.id === toEndpoint.rawId
    );

    if (fromTradingAccount?.accountType === 'cent' || toTradingAccount?.accountType === 'cent') {
      return {
        success: false,
        message: 'Cent trading account transfer will be handled by Trading Deposit/Withdrawal sync phase.',
      };
    }


    const transactionCurrency = resolveTransactionCurrency(
      payload.currency,
      fromEndpoint.currency || defaultCurrency
    );

    const historicalSnapshot = buildHistoricalTransactionSnapshot(
      payload.amount,
      transactionCurrency,
      defaultCurrency,
      fromEndpoint.currency || defaultCurrency,
      exchangeRates
    );

    const sourceAmount = historicalSnapshot.accountAmountAtTransaction;

    const destinationAmount = convertAmountBetweenCurrencies(
      payload.amount,
      transactionCurrency,
      toEndpoint.currency || defaultCurrency,
      historicalSnapshot.exchangeRateSnapshot
    );

    if (fromEndpoint.balance < sourceAmount) {
      return {
        success: false,
        message: 'Insufficient source account balance.',
      };
    }

    const nextAccounts = accounts.map((account) => {
      if (fromEndpoint.kind === 'finance' && account.id === fromEndpoint.rawId) {
        return {
          ...account,
          balance: account.balance - sourceAmount,
        };
      }

      if (toEndpoint.kind === 'finance' && account.id === toEndpoint.rawId) {
        return {
          ...account,
          balance: account.balance + destinationAmount,
        };
      }

      return account;
    });

    const nextTradingAccounts = tradingAccounts.map((account) => {
      if (fromEndpoint.kind === 'trading' && account.id === fromEndpoint.rawId) {
        return adjustTradingAccountBalance(account, -sourceAmount);
      }

      if (toEndpoint.kind === 'trading' && account.id === toEndpoint.rawId) {
        return adjustTradingAccountBalance(account, destinationAmount);
      }

      return account;
    });

    const transferNoteParts = [
      payload.note,
      `Balance transfer: ${fromEndpoint.kind} → ${toEndpoint.kind}`,
    ].filter(Boolean);

    const newTransaction: Transaction = {
      id: createId('trx'),
      type: 'transfer',
      title: payload.title || 'Balance Transfer',
      amount: payload.amount,
      currency: transactionCurrency,
      ...historicalSnapshot,
      fromAccountId: fromEndpoint.id,
      toAccountId: toEndpoint.id,
      accountName: `${fromEndpoint.name} → ${toEndpoint.name}`,
      categoryName: 'Transfer',
      date: payload.date || getTodayISO(),
      note: transferNoteParts.join('\n'),
    };

    setAndPersist({
      accounts: nextAccounts,
      tradingAccounts: nextTradingAccounts,
      transactions: [newTransaction, ...transactions],
    });

    return {
      success: true,
      message: 'Balance transfer completed successfully.',
    };
  },

  transfer: (payload) => {
    const { accounts, transactions, defaultCurrency, exchangeRates } = get();

    if (payload.amount <= 0) {
      return {
        success: false,
        message: 'Amount must be greater than 0.',
      };
    }

    if (payload.fromAccountId === payload.toAccountId) {
      return {
        success: false,
        message: 'Source and destination account cannot be the same.',
      };
    }

    const fromAccount = accounts.find(
      (item) => item.id === payload.fromAccountId
    );

    const toAccount = accounts.find((item) => item.id === payload.toAccountId);

    if (!fromAccount || !toAccount) {
      return {
        success: false,
        message: 'Account not found.',
      };
    }

    const transactionCurrency = resolveTransactionCurrency(
      payload.currency,
      fromAccount.currency || defaultCurrency
    );

    const historicalSnapshot = buildHistoricalTransactionSnapshot(
      payload.amount,
      transactionCurrency,
      defaultCurrency,
      fromAccount.currency || defaultCurrency,
      exchangeRates
    );

    const sourceAmount = historicalSnapshot.accountAmountAtTransaction;

    const destinationAmount = convertAmountBetweenCurrencies(
      payload.amount,
      transactionCurrency,
      toAccount.currency || defaultCurrency,
      historicalSnapshot.exchangeRateSnapshot
    );

    if (fromAccount.balance < sourceAmount) {
      return {
        success: false,
        message: 'Insufficient source account balance.',
      };
    }


    const newTransaction: Transaction = {
      id: createId('trx'),
      type: 'transfer',
      title: payload.title,
      amount: payload.amount,
      currency: transactionCurrency,
      ...historicalSnapshot,
      fromAccountId: fromAccount.id,
      toAccountId: toAccount.id,
      accountName: `${fromAccount.name} → ${toAccount.name}`,
      categoryName: 'Transfer',
      date: payload.date || getTodayISO(),
      note: payload.note,
    };

    setAndPersist({
      accounts: accounts.map((account) => {
        if (account.id === fromAccount.id) {
          return {
            ...account,
            balance: account.balance - sourceAmount,
          };
        }

        if (account.id === toAccount.id) {
          return {
            ...account,
            balance: account.balance + destinationAmount,
          };
        }

        return account;
      }),
      transactions: [newTransaction, ...transactions],
    });

    return {
      success: true,
      message: 'Transfer completed successfully.',
    };
  },

  savingDeposit: (payload) => {
    const { accounts, transactions, defaultCurrency, savingGoals, exchangeRates } = get();

    if (payload.amount <= 0) {
      return {
        success: false,
        message: 'Amount must be greater than 0.',
      };
    }

    const sourceAccount = accounts.find(
      (item) => item.id === payload.fromAccountId
    );

    const savingAccount = accounts.find(
      (item) => item.id === payload.toAccountId
    );

    if (!sourceAccount || !savingAccount) {
      return {
        success: false,
        message: 'Account not found.',
      };
    }

    if (savingAccount.type !== 'saving') {
      return {
        success: false,
        message: 'Destination account must be a saving account.',
      };
    }

    const transactionCurrency = resolveTransactionCurrency(
      payload.currency,
      sourceAccount.currency || defaultCurrency
    );

    const historicalSnapshot = buildHistoricalTransactionSnapshot(
      payload.amount,
      transactionCurrency,
      defaultCurrency,
      sourceAccount.currency || defaultCurrency,
      exchangeRates
    );

    const sourceAmount = historicalSnapshot.accountAmountAtTransaction;

    const savingAmount = convertAmountBetweenCurrencies(
      payload.amount,
      transactionCurrency,
      savingAccount.currency || defaultCurrency,
      historicalSnapshot.exchangeRateSnapshot
    );

    if (sourceAccount.balance < sourceAmount) {
      return {
        success: false,
        message: 'Insufficient source account balance.',
      };
    }

    const newSavingBalance = savingAccount.balance + savingAmount;


    const newTransaction: Transaction = {
      id: createId('trx'),
      type: 'saving_deposit',
      title: payload.title,
      amount: payload.amount,
      currency: transactionCurrency,
      ...historicalSnapshot,
      fromAccountId: sourceAccount.id,
      toAccountId: savingAccount.id,
      accountName: `${sourceAccount.name} → ${savingAccount.name}`,
      categoryName: 'Saving Deposit',
      date: payload.date || getTodayISO(),
      note: payload.note,
    };

    setAndPersist({
      accounts: accounts.map((account) => {
        if (account.id === sourceAccount.id) {
          return {
            ...account,
            balance: account.balance - sourceAmount,
          };
        }

        if (account.id === savingAccount.id) {
          return {
            ...account,
            balance: newSavingBalance,
          };
        }

        return account;
      }),

      savingGoals: savingGoals.map((savingGoal) => {
        if (savingGoal.savingAccountId !== savingAccount.id) {
          return savingGoal;
        }

        return {
          ...savingGoal,
          currentAmount: newSavingBalance,
          status: getSavingStatus(newSavingBalance, savingGoal.targetAmount),
        };
      }),

      transactions: [newTransaction, ...transactions],
    });

    return {
      success: true,
      message: 'Saving deposit completed successfully.',
    };
  },

  savingWithdrawal: (payload) => {
    const { accounts, transactions, defaultCurrency, savingGoals, exchangeRates } = get();

    if (payload.amount <= 0) {
      return {
        success: false,
        message: 'Amount must be greater than 0.',
      };
    }

    const savingAccount = accounts.find(
      (item) => item.id === payload.fromAccountId
    );

    const destinationAccount = accounts.find(
      (item) => item.id === payload.toAccountId
    );

    if (!savingAccount || !destinationAccount) {
      return {
        success: false,
        message: 'Account not found.',
      };
    }

    if (savingAccount.type !== 'saving') {
      return {
        success: false,
        message: 'Source account must be a saving account.',
      };
    }

    const transactionCurrency = resolveTransactionCurrency(
      payload.currency,
      savingAccount.currency || defaultCurrency
    );

    const historicalSnapshot = buildHistoricalTransactionSnapshot(
      payload.amount,
      transactionCurrency,
      defaultCurrency,
      savingAccount.currency || defaultCurrency,
      exchangeRates
    );

    const savingAmount = historicalSnapshot.accountAmountAtTransaction;

    const destinationAmount = convertAmountBetweenCurrencies(
      payload.amount,
      transactionCurrency,
      destinationAccount.currency || defaultCurrency,
      historicalSnapshot.exchangeRateSnapshot
    );

    if (savingAccount.balance < savingAmount) {
      return {
        success: false,
        message: 'Insufficient saving balance.',
      };
    }

    const newSavingBalance = savingAccount.balance - savingAmount;


    const newTransaction: Transaction = {
      id: createId('trx'),
      type: 'saving_withdrawal',
      title: payload.title,
      amount: payload.amount,
      currency: transactionCurrency,
      ...historicalSnapshot,
      fromAccountId: savingAccount.id,
      toAccountId: destinationAccount.id,
      accountName: `${savingAccount.name} → ${destinationAccount.name}`,
      categoryName: 'Saving Withdrawal',
      date: payload.date || getTodayISO(),
      note: payload.note,
    };

    setAndPersist({
      accounts: accounts.map((account) => {
        if (account.id === savingAccount.id) {
          return {
            ...account,
            balance: newSavingBalance,
          };
        }

        if (account.id === destinationAccount.id) {
          return {
            ...account,
            balance: account.balance + destinationAmount,
          };
        }

        return account;
      }),

      savingGoals: savingGoals.map((savingGoal) => {
        if (savingGoal.savingAccountId !== savingAccount.id) {
          return savingGoal;
        }

        return {
          ...savingGoal,
          currentAmount: newSavingBalance,
          status: getSavingStatus(newSavingBalance, savingGoal.targetAmount),
        };
      }),

      transactions: [newTransaction, ...transactions],
    });

    return {
      success: true,
      message: 'Saving withdrawal completed successfully.',
    };
  },

  resetDemoData: () => {
    setAndPersist(getInitialFinanceState());
  },
  };
});
