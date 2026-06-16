export type Currency = 'IDR' | 'USD' | 'EUR';

export type AccountType =
  | 'cash'
  | 'bank'
  | 'e_wallet'
  | 'broker'
  | 'crypto_wallet'
  | 'saving'
  | 'custom';

export type TransactionType =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'saving_deposit'
  | 'saving_withdrawal'
  | 'investment_buy'
  | 'investment_sell'
  | 'adjustment';

export type BudgetPeriod = 'weekly' | 'monthly' | 'custom';

export type CategoryType = 'income' | 'expense';

export type SavingGoalStatus = 'active' | 'completed' | 'paused' | 'cancelled';

export type InvestmentAssetType =
  | 'stock'
  | 'crypto'
  | 'fund'
  | 'etf'
  | 'bond'
  | 'other';

export type InvestmentOrderType = 'buy' | 'sell';

export type InvestmentPriceHistorySource =
  | 'initial'
  | 'manual'
  | 'sync'
  | 'order';

export type ExchangeRateSnapshot = Record<Currency, number>;

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  balance: number;
  icon?: string;
  color?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Transaction = {
  id: string;
  type: TransactionType;
  title: string;
  amount: number;
  currency: Currency;

  accountId?: string;
  fromAccountId?: string;
  toAccountId?: string;

  accountName: string;
  categoryName?: string;
  categoryId?: string;
  date: string;
  note?: string;

  baseCurrencyAtTransaction?: Currency;
  baseAmountAtTransaction?: number;
  exchangeRateSnapshot?: ExchangeRateSnapshot;
  accountCurrencyAtTransaction?: Currency;
  accountAmountAtTransaction?: number;
};

export type SavingGoal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: Currency;
  savingAccountId: string;
  linkedSourceAccountId: string;
  deadline?: string;
  status: SavingGoalStatus;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Budget = {
  id: string;
  name: string;
  categoryName: string;
  categoryId?: string;
  period: BudgetPeriod;
  limitAmount: number;
  currency: Currency;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type InvestmentHolding = {
  id: string;
  accountId: string;
  name: string;
  symbol: string;
  assetType: InvestmentAssetType;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  currency: Currency;
  note?: string;
  createdAt: string;
  updatedAt?: string;
};

export type InvestmentOrder = {
  id: string;
  holdingId: string;
  accountId: string;
  orderType: InvestmentOrderType;
  symbol: string;
  name: string;
  assetType: InvestmentAssetType;
  quantity: number;
  price: number;
  fee: number;
  grossAmount: number;
  totalAmount: number;
  realizedPnL: number;
  currency: Currency;
  date: string;
  note?: string;
  createdAt: string;
};

export type InvestmentPriceHistoryPoint = {
  id: string;
  holdingId: string;
  symbol: string;
  name: string;
  assetType: InvestmentAssetType;
  price: number;
  currency: Currency;
  source: InvestmentPriceHistorySource;
  provider?: string;
  recordedAt: string;
  dayKey: string;
  monthKey: string;
  yearKey: string;
};

export type NetWorthSnapshot = {
  id: string;
  date: string;
  currency: Currency;
  netWorth: number;
  cashValue: number;
  savingValue: number;
  investmentValue: number;
  liabilityValue?: number;
  note?: string;
  createdAt: string;
};

export type DashboardSummary = {
  availableBalance: number;
  totalSavings: number;
  totalInvestment: number;
  monthlyIncome: number;
  monthlyExpense: number;
  netWorth: number;
  currency: Currency;
};

export type ActionResult = {
  success: boolean;
  message: string;
};
