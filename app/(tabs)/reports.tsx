import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '../../src/components/ui/AppText';
import { Screen } from '../../src/components/ui/Screen';
import { StatCard } from '../../src/components/ui/StatCard';
import { ThemeColors } from '../../src/constants/colors';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useFinanceStore } from '../../src/stores/useFinanceStore';
import type { TradingAccount, TradingPlan, TradingTrade } from '../../src/stores/useFinanceStore';
import { Currency, InvestmentHolding, InvestmentOrder, Transaction } from '../../src/types/finance';
import { formatCurrency } from '../../src/utils/currency';
import { convertCurrencyAmount } from '../../src/utils/currencyConversion';

type ReportMode = 'monthly' | 'yearly';

type CategorySummary = {
  name: string;
  amount: number;
  percentage: number;
};

type DailySummary = {
  label: string;
  income: number;
  expense: number;
  net: number;
};

type MonthlySummary = {
  label: string;
  income: number;
  expense: number;
  net: number;
};

type TradingAccountReport = {
  accountId: string;
  accountName: string;
  broker: string;
  currency: Currency;
  closedTrades: number;
  openTrades: number;
  wins: number;
  losses: number;
  netProfitLoss: number;
  convertedNetProfitLoss: number;
  winRate: number;
  averageRR: number;
  issueCount: number;
};

type TradingAISummary = {
  closedTrades: number;
  openTrades: number;
  wins: number;
  losses: number;
  netProfitLoss: number;
  winRate: number;
  averageRR: number;
  issueCount: number;
  accountReports: TradingAccountReport[];
  insights: string[];
};

function formatCompactCurrency(amount: number, currency: Currency) {
  if (currency !== 'IDR') {
    return formatCurrency(amount, currency);
  }

  const sign = amount < 0 ? '-' : '';
  const absoluteAmount = Math.abs(amount);

  if (absoluteAmount >= 1000000000) {
    const value = absoluteAmount / 1000000000;
    const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);

    return `${sign}Rp ${formatted.replace('.', ',')} M`;
  }

  if (absoluteAmount >= 1000000) {
    const value = absoluteAmount / 1000000;
    const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);

    return `${sign}Rp ${formatted.replace('.', ',')} jt`;
  }

  if (absoluteAmount >= 1000) {
    const value = Math.round(absoluteAmount / 1000);

    return `${sign}Rp ${value.toLocaleString('id-ID')} rb`;
  }

  return formatCurrency(amount, currency);
}

function getMonthLabel(date: Date) {
  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function getShortMonthLabel(date: Date) {
  return new Intl.DateTimeFormat('id-ID', {
    month: 'short',
  }).format(date);
}

function isSameMonth(dateValue: string, selectedDate: Date) {
  const date = new Date(dateValue);

  return (
    date.getMonth() === selectedDate.getMonth() &&
    date.getFullYear() === selectedDate.getFullYear()
  );
}

function isSameYear(dateValue: string, selectedYear: number) {
  const date = new Date(dateValue);

  return date.getFullYear() === selectedYear;
}

function getDaysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getTransactionSign(type: Transaction['type']) {
  if (type === 'income') {
    return 1;
  }

  if (type === 'expense') {
    return -1;
  }

  return 0;
}

function getTransactionTypeLabel(type: Transaction['type']) {
  if (type === 'income') return 'Income';
  if (type === 'expense') return 'Expense';
  if (type === 'transfer') return 'Transfer';
  if (type === 'saving_deposit') return 'Saving Deposit';
  if (type === 'saving_withdrawal') return 'Saving Withdrawal';
  if (type === 'investment_buy') return 'Investment Buy';
  if (type === 'investment_sell') return 'Investment Sell';

  return 'Transaction';
}

function getTransactionIcon(type: Transaction['type']) {
  if (type === 'income') return 'arrow-down-circle-outline';
  if (type === 'expense') return 'arrow-up-circle-outline';
  if (type === 'transfer') return 'swap-horizontal-outline';
  if (type === 'saving_deposit') return 'add-circle-outline';
  if (type === 'saving_withdrawal') return 'remove-circle-outline';
  if (type === 'investment_buy') return 'trending-up-outline';
  if (type === 'investment_sell') return 'cash-outline';

  return 'receipt-outline';
}

function getTransactionAmountColor(type: Transaction['type'], colors: ThemeColors) {
  if (type === 'income' || type === 'saving_deposit' || type === 'investment_sell') {
    return colors.income;
  }

  if (type === 'expense' || type === 'saving_withdrawal' || type === 'investment_buy') {
    return colors.expense;
  }

  return colors.text;
}

function getTransactionPrefix(type: Transaction['type']) {
  if (type === 'income' || type === 'saving_withdrawal' || type === 'investment_sell') {
    return '+';
  }

  if (type === 'expense' || type === 'saving_deposit' || type === 'investment_buy') {
    return '-';
  }

  return '';
}

function buildCategoryBreakdown(transactions: Transaction[]) {
  const expenseTransactions = transactions.filter(
    (transaction) => transaction.type === 'expense'
  );

  const totalExpense = expenseTransactions.reduce(
    (total, transaction) => total + transaction.amount,
    0
  );

  const categoryMap = expenseTransactions.reduce<Record<string, number>>(
    (acc, transaction) => {
      const categoryName = transaction.categoryName || 'Uncategorized';

      acc[categoryName] = (acc[categoryName] || 0) + transaction.amount;

      return acc;
    },
    {}
  );

  return Object.entries(categoryMap)
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);
}

function buildDailySummaries(transactions: Transaction[], selectedDate: Date) {
  const daysInMonth = getDaysInMonth(selectedDate);

  const summaries: DailySummary[] = Array.from({ length: daysInMonth }).map(
    (_, index) => ({
      label: `${index + 1}`,
      income: 0,
      expense: 0,
      net: 0,
    })
  );

  transactions.forEach((transaction) => {
    const date = new Date(transaction.date);
    const dayIndex = date.getDate() - 1;

    if (!summaries[dayIndex]) {
      return;
    }

    if (transaction.type === 'income') {
      summaries[dayIndex].income += transaction.amount;
    }

    if (transaction.type === 'expense') {
      summaries[dayIndex].expense += transaction.amount;
    }

    summaries[dayIndex].net += transaction.amount * getTransactionSign(transaction.type);
  });

  return summaries;
}

function buildMonthlySummaries(transactions: Transaction[], selectedYear: number) {
  const summaries: MonthlySummary[] = Array.from({ length: 12 }).map((_, index) => {
    const date = new Date(selectedYear, index, 1);

    return {
      label: getShortMonthLabel(date),
      income: 0,
      expense: 0,
      net: 0,
    };
  });

  transactions.forEach((transaction) => {
    const date = new Date(transaction.date);
    const monthIndex = date.getMonth();

    if (!summaries[monthIndex]) {
      return;
    }

    if (transaction.type === 'income') {
      summaries[monthIndex].income += transaction.amount;
    }

    if (transaction.type === 'expense') {
      summaries[monthIndex].expense += transaction.amount;
    }

    summaries[monthIndex].net += transaction.amount * getTransactionSign(transaction.type);
  });

  return summaries;
}

function getSummary(transactions: Transaction[]) {
  const income = transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((total, transaction) => total + transaction.amount, 0);

  const expense = transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((total, transaction) => total + transaction.amount, 0);

  const net = income - expense;

  const savingFlow = transactions
    .filter(
      (transaction) =>
        transaction.type === 'saving_deposit' ||
        transaction.type === 'saving_withdrawal'
    )
    .reduce((total, transaction) => {
      if (transaction.type === 'saving_deposit') {
        return total + transaction.amount;
      }

      return total - transaction.amount;
    }, 0);

  const transactionCount = transactions.length;
  const expenseCount = transactions.filter(
    (transaction) => transaction.type === 'expense'
  ).length;
  const averageExpense = expenseCount > 0 ? expense / expenseCount : 0;

  return {
    income,
    expense,
    net,
    savingFlow,
    transactionCount,
    averageExpense,
  };
}

function getHoldingCost(holding: InvestmentHolding) {
  return holding.quantity * holding.averagePrice;
}

function getHoldingValue(holding: InvestmentHolding) {
  return holding.quantity * holding.currentPrice;
}

function filterOrdersByPeriod(
  orders: InvestmentOrder[],
  reportMode: ReportMode,
  selectedMonth: Date,
  selectedYear: number
) {
  if (reportMode === 'monthly') {
    return orders.filter((order) => isSameMonth(order.date, selectedMonth));
  }

  return orders.filter((order) => isSameYear(order.date, selectedYear));
}

function getInvestmentSummary(
  holdings: InvestmentHolding[],
  orders: InvestmentOrder[],
  defaultCurrency: Currency,
  exchangeRates: Record<Currency, number>
) {
  const portfolioValue = holdings.reduce((total, holding) => {
    return (
      total +
      convertCurrencyAmount(
        getHoldingValue(holding),
        holding.currency,
        defaultCurrency,
        exchangeRates
      )
    );
  }, 0);

  const costBasis = holdings.reduce((total, holding) => {
    return (
      total +
      convertCurrencyAmount(
        getHoldingCost(holding),
        holding.currency,
        defaultCurrency,
        exchangeRates
      )
    );
  }, 0);

  const unrealizedPnL = portfolioValue - costBasis;

  const buyValue = orders
    .filter((order) => order.orderType === 'buy')
    .reduce((total, order) => {
      return (
        total +
        convertCurrencyAmount(
          order.totalAmount,
          order.currency,
          defaultCurrency,
          exchangeRates
        )
      );
    }, 0);

  const sellValue = orders
    .filter((order) => order.orderType === 'sell')
    .reduce((total, order) => {
      return (
        total +
        convertCurrencyAmount(
          order.totalAmount,
          order.currency,
          defaultCurrency,
          exchangeRates
        )
      );
    }, 0);

  const realizedPnL = orders
    .filter((order) => order.orderType === 'sell')
    .reduce((total, order) => {
      return (
        total +
        convertCurrencyAmount(
          order.realizedPnL,
          order.currency,
          defaultCurrency,
          exchangeRates
        )
      );
    }, 0);

  return {
    portfolioValue,
    costBasis,
    unrealizedPnL,
    realizedPnL,
    buyValue,
    sellValue,
    orderCount: orders.length,
    buyOrderCount: orders.filter((order) => order.orderType === 'buy').length,
    sellOrderCount: orders.filter((order) => order.orderType === 'sell').length,
    holdingCount: holdings.length,
  };
}

type InvestmentPerformanceSummary = {
  label: string;
  buyValue: number;
  sellValue: number;
  realizedPnL: number;
};

type CryptoAssetSummary = {
  symbol: string;
  name: string;
  quantity: number;
  currentValue: number;
  incomeValue: number;
  paymentValue: number;
  realizedPnL: number;
};

function getCryptoReportSummary(
  holdings: InvestmentHolding[],
  orders: InvestmentOrder[],
  defaultCurrency: Currency,
  exchangeRates: Record<Currency, number>
) {
  const cryptoHoldings = holdings.filter((holding) => holding.assetType === 'crypto');
  const cryptoOrders = orders.filter((order) => order.assetType === 'crypto');
  const cryptoIncomeOrders = cryptoOrders.filter((order) => order.orderType === 'buy');
  const cryptoPaymentOrders = cryptoOrders.filter((order) => order.orderType === 'sell');

  const holdingValue = cryptoHoldings.reduce((total, holding) => {
    return (
      total +
      convertCurrencyAmount(
        getHoldingValue(holding),
        holding.currency,
        defaultCurrency,
        exchangeRates
      )
    );
  }, 0);

  const costBasis = cryptoHoldings.reduce((total, holding) => {
    return (
      total +
      convertCurrencyAmount(
        getHoldingCost(holding),
        holding.currency,
        defaultCurrency,
        exchangeRates
      )
    );
  }, 0);

  const incomeValue = cryptoIncomeOrders.reduce((total, order) => {
    return (
      total +
      convertCurrencyAmount(
        order.totalAmount,
        order.currency,
        defaultCurrency,
        exchangeRates
      )
    );
  }, 0);

  const paymentValue = cryptoPaymentOrders.reduce((total, order) => {
    return (
      total +
      convertCurrencyAmount(
        order.totalAmount,
        order.currency,
        defaultCurrency,
        exchangeRates
      )
    );
  }, 0);

  const realizedPnL = cryptoPaymentOrders.reduce((total, order) => {
    return (
      total +
      convertCurrencyAmount(
        order.realizedPnL,
        order.currency,
        defaultCurrency,
        exchangeRates
      )
    );
  }, 0);

  const assetMap = new Map<string, CryptoAssetSummary>();

  cryptoHoldings.forEach((holding) => {
    const key = holding.symbol.trim().toUpperCase();
    const currentValue = convertCurrencyAmount(
      getHoldingValue(holding),
      holding.currency,
      defaultCurrency,
      exchangeRates
    );

    assetMap.set(key, {
      symbol: key,
      name: holding.name,
      quantity: holding.quantity,
      currentValue,
      incomeValue: 0,
      paymentValue: 0,
      realizedPnL: 0,
    });
  });

  cryptoOrders.forEach((order) => {
    const key = order.symbol.trim().toUpperCase();
    const currentItem =
      assetMap.get(key) || {
        symbol: key,
        name: order.name,
        quantity: 0,
        currentValue: 0,
        incomeValue: 0,
        paymentValue: 0,
        realizedPnL: 0,
      };
    const orderValue = convertCurrencyAmount(
      order.totalAmount,
      order.currency,
      defaultCurrency,
      exchangeRates
    );
    const orderPnl = convertCurrencyAmount(
      order.realizedPnL,
      order.currency,
      defaultCurrency,
      exchangeRates
    );

    assetMap.set(key, {
      ...currentItem,
      incomeValue:
        currentItem.incomeValue + (order.orderType === 'buy' ? orderValue : 0),
      paymentValue:
        currentItem.paymentValue + (order.orderType === 'sell' ? orderValue : 0),
      realizedPnL: currentItem.realizedPnL + orderPnl,
    });
  });

  const assetSummaries = Array.from(assetMap.values()).sort(
    (firstItem, secondItem) => secondItem.currentValue - firstItem.currentValue
  );

  return {
    holdingValue,
    costBasis,
    unrealizedPnL: holdingValue - costBasis,
    incomeValue,
    paymentValue,
    netFlow: incomeValue - paymentValue,
    realizedPnL,
    holdingCount: cryptoHoldings.length,
    incomeCount: cryptoIncomeOrders.length,
    paymentCount: cryptoPaymentOrders.length,
    assetSummaries,
  };
}

function getInvestmentPerformanceSummaries(
  orders: InvestmentOrder[],
  selectedYear: number,
  defaultCurrency: Currency,
  exchangeRates: Record<Currency, number>
): InvestmentPerformanceSummary[] {
  return Array.from({ length: 12 }).map((_, monthIndex) => {
    const monthOrders = orders.filter((order) => {
      const date = new Date(order.date);

      return (
        !Number.isNaN(date.getTime()) &&
        date.getFullYear() === selectedYear &&
        date.getMonth() === monthIndex
      );
    });

    const buyValue = monthOrders
      .filter((order) => order.orderType === 'buy')
      .reduce((total, order) => {
        return (
          total +
          convertCurrencyAmount(
            order.totalAmount,
            order.currency,
            defaultCurrency,
            exchangeRates
          )
        );
      }, 0);

    const sellValue = monthOrders
      .filter((order) => order.orderType === 'sell')
      .reduce((total, order) => {
        return (
          total +
          convertCurrencyAmount(
            order.totalAmount,
            order.currency,
            defaultCurrency,
            exchangeRates
          )
        );
      }, 0);

    const realizedPnL = monthOrders
      .filter((order) => order.orderType === 'sell')
      .reduce((total, order) => {
        return (
          total +
          convertCurrencyAmount(
            order.realizedPnL,
            order.currency,
            defaultCurrency,
            exchangeRates
          )
        );
      }, 0);

    const monthLabel = new Intl.DateTimeFormat('en-US', {
      month: 'short',
    }).format(new Date(selectedYear, monthIndex, 1));

    return {
      label: monthLabel,
      buyValue,
      sellValue,
      realizedPnL,
    };
  });
}

function getMaxInvestmentPerformanceValue(items: InvestmentPerformanceSummary[]) {
  const values = items.flatMap((item) => [
    item.buyValue,
    item.sellValue,
    Math.abs(item.realizedPnL),
  ]);

  return Math.max(...values, 1);
}

function shiftMonth(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getInsightText(summary: ReturnType<typeof getSummary>, currency: Currency) {
  if (summary.transactionCount === 0) {
    return 'No transactions found for this period yet.';
  }

  if (summary.net >= 0) {
    return `Positive cashflow: ${formatCompactCurrency(summary.net, currency)} left after expenses.`;
  }

  return `Negative cashflow: spending is ${formatCompactCurrency(Math.abs(summary.net), currency)} above income.`;
}

function getSafeDate(value: string | null | undefined) {
  if (!value) {
    return new Date();
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}

function getTradeReportDate(trade: TradingTrade) {
  return trade.closeDate || trade.openDate;
}

function isTradeInReportPeriod(
  trade: TradingTrade,
  reportMode: ReportMode,
  selectedMonth: Date,
  selectedYear: number
) {
  const date = getSafeDate(getTradeReportDate(trade));

  if (reportMode === 'monthly') {
    return (
      date.getMonth() === selectedMonth.getMonth() &&
      date.getFullYear() === selectedMonth.getFullYear()
    );
  }

  return date.getFullYear() === selectedYear;
}

function getTradingAccountRealBalance(account: TradingAccount) {
  if (account.accountType === 'cent') {
    return (account.balance || 0) / 100;
  }

  return account.balance || 0;
}

function getTradeDayKey(trade: TradingTrade) {
  return getSafeDate(getTradeReportDate(trade)).toISOString().slice(0, 10);
}

function getTradingPlanIssueCount(
  trades: TradingTrade[],
  account: TradingAccount,
  plan: TradingPlan | undefined
) {
  if (!plan) {
    return trades.length > 0 ? 1 : 0;
  }

  let issueCount = 0;
  const tradesByDay = trades.reduce<Record<string, TradingTrade[]>>((acc, trade) => {
    const key = getTradeDayKey(trade);

    if (!acc[key]) {
      acc[key] = [];
    }

    acc[key].push(trade);

    return acc;
  }, {});

  Object.values(tradesByDay).forEach((dailyTrades) => {
    if (dailyTrades.length > plan.maxTradesPerDay) {
      issueCount += 1;
    }

    const dailyNet = dailyTrades
      .filter((trade) => trade.status === 'closed')
      .reduce((total, trade) => total + trade.netProfitLoss, 0);

    if (dailyNet <= -Math.abs(plan.dailyMaxLossAmount)) {
      issueCount += 1;
    }
  });

  trades.forEach((trade) => {
    if (
      plan.allowedPairs.length > 0 &&
      !plan.allowedPairs.some(
        (pair) => pair.toUpperCase() === trade.pair.toUpperCase()
      )
    ) {
      issueCount += 1;
    }

    const fallbackRiskLimit =
      (getTradingAccountRealBalance(account) * plan.riskPerTradePercent) / 100;
    const lockedRiskLimit =
      trade.planRiskLimitAmountSnapshot > 0
        ? trade.planRiskLimitAmountSnapshot
        : fallbackRiskLimit;

    if (lockedRiskLimit > 0 && trade.riskAmount > lockedRiskLimit) {
      issueCount += 1;
    }

    if (
      trade.status === 'closed' &&
      trade.rewardRiskRatio > 0 &&
      trade.rewardRiskRatio < plan.minimumRewardRiskRatio
    ) {
      issueCount += 1;
    }
  });

  return issueCount;
}

function buildTradingAIReports(
  accounts: TradingAccount[],
  trades: TradingTrade[],
  plans: TradingPlan[],
  reportMode: ReportMode,
  selectedMonth: Date,
  selectedYear: number,
  defaultCurrency: Currency,
  exchangeRates: Record<Currency, number>
): TradingAISummary {
  const periodTrades = trades.filter((trade) =>
    isTradeInReportPeriod(trade, reportMode, selectedMonth, selectedYear)
  );
  const closedTrades = periodTrades.filter((trade) => trade.status === 'closed');
  const wins = closedTrades.filter((trade) => trade.netProfitLoss > 0).length;
  const losses = closedTrades.filter((trade) => trade.netProfitLoss < 0).length;
  const netProfitLoss = closedTrades.reduce((total, trade) => {
    return (
      total +
      convertCurrencyAmount(
        trade.netProfitLoss,
        trade.currency,
        defaultCurrency,
        exchangeRates
      )
    );
  }, 0);
  const averageRR =
    closedTrades.length > 0
      ? closedTrades.reduce((total, trade) => total + trade.rewardRiskRatio, 0) /
        closedTrades.length
      : 0;
  const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;

  const accountReports = accounts
    .map((account) => {
      const accountTrades = periodTrades.filter(
        (trade) => trade.tradingAccountId === account.id
      );
      const accountClosedTrades = accountTrades.filter(
        (trade) => trade.status === 'closed'
      );
      const accountWins = accountClosedTrades.filter(
        (trade) => trade.netProfitLoss > 0
      ).length;
      const accountLosses = accountClosedTrades.filter(
        (trade) => trade.netProfitLoss < 0
      ).length;
      const accountNetProfitLoss = accountClosedTrades.reduce(
        (total, trade) => total + trade.netProfitLoss,
        0
      );
      const convertedNetProfitLoss = convertCurrencyAmount(
        accountNetProfitLoss,
        account.currency,
        defaultCurrency,
        exchangeRates
      );
      const accountAverageRR =
        accountClosedTrades.length > 0
          ? accountClosedTrades.reduce(
              (total, trade) => total + trade.rewardRiskRatio,
              0
            ) / accountClosedTrades.length
          : 0;
      const accountWinRate =
        accountClosedTrades.length > 0
          ? (accountWins / accountClosedTrades.length) * 100
          : 0;
      const plan = plans.find((item) => item.tradingAccountId === account.id);
      const issueCount = getTradingPlanIssueCount(accountTrades, account, plan);

      return {
        accountId: account.id,
        accountName: account.name,
        broker: account.broker,
        currency: account.currency,
        closedTrades: accountClosedTrades.length,
        openTrades: accountTrades.filter((trade) => trade.status === 'open').length,
        wins: accountWins,
        losses: accountLosses,
        netProfitLoss: accountNetProfitLoss,
        convertedNetProfitLoss,
        winRate: accountWinRate,
        averageRR: accountAverageRR,
        issueCount,
      };
    })
    .filter((item) => item.closedTrades > 0 || item.openTrades > 0 || item.issueCount > 0)
    .sort(
      (firstItem, secondItem) =>
        Math.abs(secondItem.convertedNetProfitLoss) -
        Math.abs(firstItem.convertedNetProfitLoss)
    );

  const issueCount = accountReports.reduce(
    (total, item) => total + item.issueCount,
    0
  );

  const insights: string[] = [];

  if (closedTrades.length === 0) {
    insights.push('No closed trading data in this selected period yet.');
  } else if (netProfitLoss >= 0 && issueCount === 0) {
    insights.push('Trading performance is positive and no major plan issue is detected.');
  } else if (netProfitLoss >= 0 && issueCount > 0) {
    insights.push('Trading is profitable, but discipline needs review because plan issues exist.');
  } else {
    insights.push('Trading result is negative. Review risk, setup quality, and execution discipline.');
  }

  if (winRate < 40 && closedTrades.length >= 3) {
    insights.push('Win rate is weak; consider reducing frequency and waiting for stronger confirmations.');
  }

  if (averageRR > 0 && averageRR < 1.5) {
    insights.push('Average RR is low; check whether entries are too late or targets are too close.');
  }

  if (issueCount > 0) {
    insights.push(`${issueCount} plan issue${issueCount === 1 ? '' : 's'} detected across trading accounts.`);
  }

  return {
    closedTrades: closedTrades.length,
    openTrades: periodTrades.filter((trade) => trade.status === 'open').length,
    wins,
    losses,
    netProfitLoss,
    winRate,
    averageRR,
    issueCount,
    accountReports,
    insights: insights.slice(0, 4),
  };
}

export default function ReportsScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const transactions = useFinanceStore((state) => state.transactions);
  const investmentHoldings = useFinanceStore((state) => state.investmentHoldings);
  const investmentOrders = useFinanceStore((state) => state.investmentOrders);
  const tradingAccounts = useFinanceStore((state) => state.tradingAccounts);
  const tradingTrades = useFinanceStore((state) => state.tradingTrades);
  const tradingPlans = useFinanceStore((state) => state.tradingPlans);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);
  const exchangeRates = useFinanceStore((state) => state.exchangeRates);

  const [reportMode, setReportMode] = useState<ReportMode>('monthly');
  const [selectedTradingAccountId, setSelectedTradingAccountId] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();

    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  const periodTransactions = useMemo(() => {
    if (reportMode === 'monthly') {
      return transactions.filter((transaction) =>
        isSameMonth(transaction.date, selectedMonth)
      );
    }

    return transactions.filter((transaction) =>
      isSameYear(transaction.date, selectedYear)
    );
  }, [transactions, reportMode, selectedMonth, selectedYear]);

  const periodInvestmentOrders = useMemo(() => {
    return filterOrdersByPeriod(
      investmentOrders,
      reportMode,
      selectedMonth,
      selectedYear
    );
  }, [investmentOrders, reportMode, selectedMonth, selectedYear]);

  const recentPeriodTransactions = useMemo(() => {
    return [...periodTransactions]
      .sort((first, second) => {
        return new Date(second.date).getTime() - new Date(first.date).getTime();
      })
      .slice(0, 12);
  }, [periodTransactions]);

  const summary = useMemo(() => {
    return getSummary(periodTransactions);
  }, [periodTransactions]);

  const investmentSummary = useMemo(() => {
    return getInvestmentSummary(
      investmentHoldings,
      periodInvestmentOrders,
      defaultCurrency,
      exchangeRates
    );
  }, [
    investmentHoldings,
    periodInvestmentOrders,
    defaultCurrency,
    exchangeRates,
  ]);

  const investmentPerformanceSummaries = useMemo(() => {
    return getInvestmentPerformanceSummaries(
      investmentOrders,
      selectedYear,
      defaultCurrency,
      exchangeRates
    );
  }, [investmentOrders, selectedYear, defaultCurrency, exchangeRates]);

  const maxInvestmentPerformanceValue = useMemo(() => {
    return getMaxInvestmentPerformanceValue(investmentPerformanceSummaries);
  }, [investmentPerformanceSummaries]);

  const cryptoReportSummary = useMemo(() => {
    return getCryptoReportSummary(
      investmentHoldings,
      periodInvestmentOrders,
      defaultCurrency,
      exchangeRates
    );
  }, [
    investmentHoldings,
    periodInvestmentOrders,
    defaultCurrency,
    exchangeRates,
  ]);

  const filteredTradingAccounts = useMemo(() => {
    if (selectedTradingAccountId === 'all') {
      return tradingAccounts;
    }

    return tradingAccounts.filter((account) => account.id === selectedTradingAccountId);
  }, [selectedTradingAccountId, tradingAccounts]);

  const filteredTradingTrades = useMemo(() => {
    if (selectedTradingAccountId === 'all') {
      return tradingTrades;
    }

    return tradingTrades.filter((trade) => trade.tradingAccountId === selectedTradingAccountId);
  }, [selectedTradingAccountId, tradingTrades]);

  const filteredTradingPlans = useMemo(() => {
    if (selectedTradingAccountId === 'all') {
      return tradingPlans;
    }

    return tradingPlans.filter((plan) => plan.tradingAccountId === selectedTradingAccountId);
  }, [selectedTradingAccountId, tradingPlans]);

  const selectedTradingAccount = useMemo(() => {
    if (selectedTradingAccountId === 'all') {
      return null;
    }

    return tradingAccounts.find((account) => account.id === selectedTradingAccountId) ?? null;
  }, [selectedTradingAccountId, tradingAccounts]);

  const selectedTradingAccountHasPlan = useMemo(() => {
    if (!selectedTradingAccount) {
      return true;
    }

    return tradingPlans.some((plan) => plan.tradingAccountId === selectedTradingAccount.id);
  }, [selectedTradingAccount, tradingPlans]);

  const selectedTradingAccountHasActivity = useMemo(() => {
    if (!selectedTradingAccount) {
      return false;
    }

    return tradingTrades.some((trade) => trade.tradingAccountId === selectedTradingAccount.id);
  }, [selectedTradingAccount, tradingTrades]);

  const tradingAISummary = useMemo(() => {
    return buildTradingAIReports(
      filteredTradingAccounts,
      filteredTradingTrades,
      filteredTradingPlans,
      reportMode,
      selectedMonth,
      selectedYear,
      defaultCurrency,
      exchangeRates
    );
  }, [
    filteredTradingAccounts,
    filteredTradingTrades,
    filteredTradingPlans,
    reportMode,
    selectedMonth,
    selectedYear,
    defaultCurrency,
    exchangeRates,
  ]);

  const unrealizedPnlPositive = investmentSummary.unrealizedPnL >= 0;
  const realizedPnlPositive = investmentSummary.realizedPnL >= 0;
  const cryptoUnrealizedPositive = cryptoReportSummary.unrealizedPnL >= 0;
  const cryptoRealizedPositive = cryptoReportSummary.realizedPnL >= 0;
  const cryptoNetFlowPositive = cryptoReportSummary.netFlow >= 0;

  const categoryBreakdown = useMemo(() => {
    return buildCategoryBreakdown(periodTransactions);
  }, [periodTransactions]);

  const dailySummaries = useMemo(() => {
    return buildDailySummaries(periodTransactions, selectedMonth);
  }, [periodTransactions, selectedMonth]);

  const monthlySummaries = useMemo(() => {
    return buildMonthlySummaries(periodTransactions, selectedYear);
  }, [periodTransactions, selectedYear]);

  const maxDailyValue = useMemo(() => {
    return Math.max(...dailySummaries.map((item) => Math.max(item.income, item.expense)), 1);
  }, [dailySummaries]);

  const maxMonthlyValue = useMemo(() => {
    return Math.max(...monthlySummaries.map((item) => Math.max(item.income, item.expense)), 1);
  }, [monthlySummaries]);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="caption" muted>
            Performance Review
          </AppText>

          <AppText variant="title" style={styles.title}>
            Reports
          </AppText>
        </View>
      </View>

      <View style={styles.segment}>
        <Pressable
          onPress={() => setReportMode('monthly')}
          style={[styles.segmentButton, reportMode === 'monthly' && styles.segmentButtonActive]}
        >
          <AppText
            variant="caption"
            style={[
              styles.segmentText,
              reportMode === 'monthly' && styles.segmentTextActive,
            ]}
          >
            Monthly
          </AppText>
        </Pressable>

        <Pressable
          onPress={() => setReportMode('yearly')}
          style={[styles.segmentButton, reportMode === 'yearly' && styles.segmentButtonActive]}
        >
          <AppText
            variant="caption"
            style={[
              styles.segmentText,
              reportMode === 'yearly' && styles.segmentTextActive,
            ]}
          >
            Yearly
          </AppText>
        </Pressable>
      </View>

      <View style={styles.periodCard}>
        <Pressable
          onPress={() => {
            if (reportMode === 'monthly') {
              setSelectedMonth((current) => shiftMonth(current, -1));
            } else {
              setSelectedYear((current) => current - 1);
            }
          }}
          style={styles.periodButton}
        >
          <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.periodTextBox}>
          <AppText variant="caption" muted>
            Selected Period
          </AppText>

          <AppText variant="subtitle" style={styles.periodTitle}>
            {reportMode === 'monthly'
              ? getMonthLabel(selectedMonth)
              : `${selectedYear}`}
          </AppText>
        </View>

        <Pressable
          onPress={() => {
            if (reportMode === 'monthly') {
              setSelectedMonth((current) => shiftMonth(current, 1));
            } else {
              setSelectedYear((current) => current + 1);
            }
          }}
          style={styles.periodButton}
        >
          <Ionicons name="chevron-forward-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.reportControlCard}>
        <View style={styles.reportControlHeader}>
          <View style={styles.reportControlTextBox}>
            <AppText variant="caption" muted>
              Report Center
            </AppText>

            <AppText variant="subtitle" style={styles.reportControlTitle}>
              Period overview
            </AppText>

            <AppText variant="caption" muted style={styles.reportControlDescription}>
              Cashflow, investments, crypto, and trading are summarized for this selected period.
            </AppText>
          </View>

          <Pressable
            onPress={() => router.push('/advanced-search')}
            style={styles.reportSearchButton}
          >
            <Ionicons name="search-outline" size={18} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.reportOverviewGrid}>
          <View style={styles.reportOverviewItem}>
            <AppText variant="caption" muted>
              Cash Records
            </AppText>

            <AppText variant="subtitle" style={styles.reportOverviewValue}>
              {periodTransactions.length}
            </AppText>
          </View>

          <View style={styles.reportOverviewItem}>
            <AppText variant="caption" muted>
              Orders
            </AppText>

            <AppText variant="subtitle" style={styles.reportOverviewValue}>
              {periodInvestmentOrders.length}
            </AppText>
          </View>

          <View style={styles.reportOverviewItem}>
            <AppText variant="caption" muted>
              Closed Trades
            </AppText>

            <AppText variant="subtitle" style={styles.reportOverviewValue}>
              {tradingAISummary.closedTrades}
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroTextBox}>
            <AppText variant="caption" muted>
              Net Cashflow
            </AppText>

            <AppText
              variant="title"
              style={[
                styles.heroValue,
                {
                  color: summary.net >= 0 ? colors.income : colors.expense,
                },
              ]}
            >
              {formatCompactCurrency(summary.net, defaultCurrency)}
            </AppText>

            <AppText variant="caption" muted style={styles.heroDescription}>
              {getInsightText(summary, defaultCurrency)}
            </AppText>
          </View>

          <View style={styles.heroBadge}>
            <Ionicons name="receipt-outline" size={15} color={colors.text} />

            <AppText variant="caption" style={styles.heroBadgeText}>
              {summary.transactionCount} trx
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.grid}>
        <StatCard
          label="Income"
          value={formatCompactCurrency(summary.income, defaultCurrency)}
          tone="income"
        />

        <StatCard
          label="Expense"
          value={formatCompactCurrency(summary.expense, defaultCurrency)}
          tone="expense"
        />

        <StatCard
          label="Avg Expense"
          value={formatCompactCurrency(summary.averageExpense, defaultCurrency)}
        />

        <StatCard
          label="Saving Flow"
          value={formatCompactCurrency(summary.savingFlow, defaultCurrency)}
          tone={summary.savingFlow >= 0 ? 'saving' : 'expense'}
        />
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Transaction Activity</AppText>

        <AppText variant="caption" muted>
          {periodTransactions.length} records
        </AppText>
      </View>

      <View style={styles.transactionListCard}>
        {recentPeriodTransactions.length === 0 ? (
          <View style={styles.emptyBox}>
            <AppText variant="body" style={styles.emptyTitle}>
              No transactions in this period
            </AppText>

            <AppText variant="caption" muted style={styles.emptyDescription}>
              Income, expense, transfer, saving, and investment activity will appear here.
            </AppText>
          </View>
        ) : null}

        {recentPeriodTransactions.map((transaction) => (
          <TransactionActivityRow
            key={transaction.id}
            transaction={transaction}
            colors={colors}
            styles={styles}
            onPress={() =>
              router.push({
                pathname: '/transaction-detail',
                params: { transactionId: transaction.id },
              })
            }
          />
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Trading AI Summary</AppText>

        <Pressable
          onPress={() => router.push('/trading-ai-performance')}
          style={styles.sectionActionButton}
        >
          <Ionicons name="sparkles-outline" size={14} color={colors.text} />

          <AppText variant="caption" style={styles.sectionActionText}>
            Open AI Coach
          </AppText>
        </Pressable>
      </View>

      <View style={styles.tradingFilterCard}>
        <AppText variant="caption" muted style={styles.tradingFilterLabel}>
          Trading Account Filter
        </AppText>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tradingFilterRow}>
            <Pressable
              onPress={() => setSelectedTradingAccountId('all')}
              style={[
                styles.tradingFilterChip,
                selectedTradingAccountId === 'all' ? styles.tradingFilterChipActive : null,
              ]}
            >
              <AppText
                variant="caption"
                style={[
                  styles.tradingFilterChipText,
                  selectedTradingAccountId === 'all'
                    ? styles.tradingFilterChipTextActive
                    : null,
                ]}
              >
                All Accounts
              </AppText>
            </Pressable>

            {tradingAccounts.map((account) => {
              const active = selectedTradingAccountId === account.id;

              return (
                <Pressable
                  key={account.id}
                  onPress={() => setSelectedTradingAccountId(account.id)}
                  style={[
                    styles.tradingFilterChip,
                    active ? styles.tradingFilterChipActive : null,
                  ]}
                >
                  <AppText
                    variant="caption"
                    style={[
                      styles.tradingFilterChipText,
                      active ? styles.tradingFilterChipTextActive : null,
                    ]}
                    numberOfLines={1}
                  >
                    {account.name}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {!selectedTradingAccountHasPlan && selectedTradingAccountHasActivity ? (
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/trading-plan',
              params: { tradingAccountId: selectedTradingAccount?.id ?? '' },
            })
          }
          style={styles.tradingWarningCard}
        >
          <Ionicons name="warning-outline" size={18} color={colors.expense} />

          <View style={styles.tradingWarningTextBox}>
            <AppText variant="body" style={styles.tradingWarningTitle}>
              Trading plan missing
            </AppText>

            <AppText variant="caption" muted style={styles.tradingWarningDescription}>
              This account has trading activity but no active trading plan. Tap here to create one.
            </AppText>
          </View>

          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}

      <View style={styles.tradingHeroCard}>
        <View style={styles.tradingHeroIcon}>
          <Ionicons
            name={tradingAISummary.issueCount > 0 ? 'alert-circle-outline' : 'sparkles-outline'}
            size={24}
            color={colors.black}
          />
        </View>

        <View style={styles.tradingHeroTextBox}>
          <AppText variant="caption" style={styles.tradingHeroLabel}>
            Trading Net P/L • {defaultCurrency} base
          </AppText>

          <AppText
            variant="title"
            style={[
              styles.tradingHeroValue,
              {
                color:
                  tradingAISummary.netProfitLoss >= 0
                    ? colors.income
                    : colors.expense,
              },
            ]}
            numberOfLines={1}
          >
            {tradingAISummary.netProfitLoss >= 0 ? '+' : ''}
            {formatCompactCurrency(tradingAISummary.netProfitLoss, defaultCurrency)}
          </AppText>

          <AppText variant="caption" style={styles.tradingHeroDescription} numberOfLines={2}>
            {tradingAISummary.winRate.toFixed(1)}% win rate • average RR 1:
            {tradingAISummary.averageRR.toFixed(2)} • {tradingAISummary.issueCount} issue
            {tradingAISummary.issueCount === 1 ? '' : 's'}
          </AppText>
        </View>
      </View>

      <View style={styles.grid}>
        <StatCard
          label="Closed Trades"
          value={`${tradingAISummary.closedTrades}`}
          tone="transfer"
        />

        <StatCard
          label="Open Trades"
          value={`${tradingAISummary.openTrades}`}
          tone="saving"
        />

        <StatCard
          label="Wins / Losses"
          value={`${tradingAISummary.wins} / ${tradingAISummary.losses}`}
          tone={tradingAISummary.wins >= tradingAISummary.losses ? 'income' : 'expense'}
        />

        <StatCard
          label="Plan Issues"
          value={`${tradingAISummary.issueCount}`}
          tone={tradingAISummary.issueCount > 0 ? 'expense' : 'income'}
        />
      </View>

      <View style={styles.tradingInsightCard}>
        <View style={styles.tradingInsightHeader}>
          <Ionicons name="analytics-outline" size={17} color={colors.text} />

          <AppText variant="body" style={styles.tradingInsightTitle}>
            AI-style Insight
          </AppText>
        </View>

        {tradingAISummary.insights.map((insight, index) => (
          <View key={`trading-insight-${index}`} style={styles.tradingInsightRow}>
            <Ionicons
              name={index === 0 ? 'sparkles-outline' : 'ellipse-outline'}
              size={15}
              color={colors.textMuted}
            />

            <AppText variant="caption" muted style={styles.tradingInsightText}>
              {insight}
            </AppText>
          </View>
        ))}
      </View>

      <View style={styles.tradingAccountList}>
        {tradingAISummary.accountReports.length === 0 ? (
          <View style={styles.emptyBox}>
            <AppText variant="body" style={styles.emptyTitle}>
              No trading activity
            </AppText>

            <AppText variant="caption" muted style={styles.emptyDescription}>
              Trading account reports will appear here after you record trades in this period.
            </AppText>
          </View>
        ) : null}

        {tradingAISummary.accountReports.map((accountReport) => (
          <TradingAccountReportRow
            key={accountReport.accountId}
            report={accountReport}
            defaultCurrency={defaultCurrency}
            styles={styles}
            colors={colors}
            onPress={() =>
              router.push({
                pathname: '/trading-account-detail',
                params: { tradingAccountId: accountReport.accountId },
              })
            }
          />
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Investment Report</AppText>

        <AppText variant="caption" muted>
          Portfolio & orders
        </AppText>
      </View>

      <View style={styles.investmentHeroCard}>
        <View style={styles.investmentHeroIcon}>
          <Ionicons name="trending-up-outline" size={24} color={colors.black} />
        </View>

        <View style={styles.investmentHeroTextBox}>
          <AppText variant="caption" style={styles.investmentHeroLabel}>
            Portfolio Value • {defaultCurrency} base
          </AppText>

          <AppText variant="title" style={styles.investmentHeroValue} numberOfLines={1}>
            {formatCompactCurrency(investmentSummary.portfolioValue, defaultCurrency)}
          </AppText>

          <AppText variant="caption" style={styles.investmentHeroDescription} numberOfLines={2}>
            {investmentSummary.holdingCount} holdings • {investmentSummary.orderCount} orders in selected period
          </AppText>
        </View>
      </View>

      <View style={styles.grid}>
        <StatCard
          label="Unrealized P/L"
          value={`${unrealizedPnlPositive ? '+' : ''}${formatCompactCurrency(
            investmentSummary.unrealizedPnL,
            defaultCurrency
          )}`}
          tone={unrealizedPnlPositive ? 'income' : 'expense'}
        />

        <StatCard
          label="Realized P/L"
          value={`${realizedPnlPositive ? '+' : ''}${formatCompactCurrency(
            investmentSummary.realizedPnL,
            defaultCurrency
          )}`}
          tone={realizedPnlPositive ? 'income' : 'expense'}
        />

        <StatCard
          label="Buy Value"
          value={formatCompactCurrency(investmentSummary.buyValue, defaultCurrency)}
          tone="transfer"
        />

        <StatCard
          label="Sell Value"
          value={formatCompactCurrency(investmentSummary.sellValue, defaultCurrency)}
          tone="saving"
        />

        <StatCard
          label="Buy Orders"
          value={`${investmentSummary.buyOrderCount}`}
          tone="income"
        />

        <StatCard
          label="Sell Orders"
          value={`${investmentSummary.sellOrderCount}`}
          tone="expense"
        />
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Crypto Report</AppText>

        <AppText variant="caption" muted>
          {cryptoReportSummary.incomeCount + cryptoReportSummary.paymentCount} crypto trx
        </AppText>
      </View>

      <View style={styles.cryptoHeroCard}>
        <View style={styles.cryptoHeroIcon}>
          <Ionicons name="logo-bitcoin" size={24} color={colors.black} />
        </View>

        <View style={styles.cryptoHeroTextBox}>
          <AppText variant="caption" style={styles.cryptoHeroLabel}>
            Crypto Holdings • {defaultCurrency} base
          </AppText>

          <AppText variant="title" style={styles.cryptoHeroValue} numberOfLines={1}>
            {formatCompactCurrency(cryptoReportSummary.holdingValue, defaultCurrency)}
          </AppText>

          <AppText variant="caption" style={styles.cryptoHeroDescription} numberOfLines={2}>
            {cryptoReportSummary.holdingCount} crypto assets • net flow{' '}
            {formatCompactCurrency(cryptoReportSummary.netFlow, defaultCurrency)}
          </AppText>
        </View>
      </View>

      <View style={styles.grid}>
        <StatCard
          label="Crypto Income"
          value={formatCompactCurrency(cryptoReportSummary.incomeValue, defaultCurrency)}
          tone="income"
        />

        <StatCard
          label="Crypto Payment"
          value={formatCompactCurrency(cryptoReportSummary.paymentValue, defaultCurrency)}
          tone="expense"
        />

        <StatCard
          label="Crypto Net Flow"
          value={`${cryptoNetFlowPositive ? '+' : ''}${formatCompactCurrency(
            cryptoReportSummary.netFlow,
            defaultCurrency
          )}`}
          tone={cryptoNetFlowPositive ? 'income' : 'expense'}
        />

        <StatCard
          label="Crypto Realized P/L"
          value={`${cryptoRealizedPositive ? '+' : ''}${formatCompactCurrency(
            cryptoReportSummary.realizedPnL,
            defaultCurrency
          )}`}
          tone={cryptoRealizedPositive ? 'income' : 'expense'}
        />

        <StatCard
          label="Crypto Unrealized P/L"
          value={`${cryptoUnrealizedPositive ? '+' : ''}${formatCompactCurrency(
            cryptoReportSummary.unrealizedPnL,
            defaultCurrency
          )}`}
          tone={cryptoUnrealizedPositive ? 'income' : 'expense'}
        />
      </View>

      <View style={styles.cryptoBreakdownCard}>
        {cryptoReportSummary.assetSummaries.length === 0 ? (
          <View style={styles.emptyBox}>
            <AppText variant="body" style={styles.emptyTitle}>
              No crypto activity
            </AppText>

            <AppText variant="caption" muted style={styles.emptyDescription}>
              Crypto income, payments, and holdings will appear here once recorded.
            </AppText>
          </View>
        ) : null}

        {cryptoReportSummary.assetSummaries.map((asset) => (
          <CryptoAssetRow
            key={asset.symbol}
            asset={asset}
            currency={defaultCurrency}
            styles={styles}
          />
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Investment Performance</AppText>

        <AppText variant="caption" muted>
          {selectedYear}
        </AppText>
      </View>

      <View style={styles.chartCard}>
        <InvestmentPerformanceChart
          data={investmentPerformanceSummaries}
          maxValue={maxInvestmentPerformanceValue}
          currency={defaultCurrency}
          styles={styles}
          colors={colors}
        />
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">
          {reportMode === 'monthly' ? 'Daily Trend' : 'Monthly Trend'}
        </AppText>

        <AppText variant="caption" muted>
          Income vs Expense
        </AppText>
      </View>

      <View style={styles.chartCard}>
        {reportMode === 'monthly' ? (
          <DailyTrendChart
            data={dailySummaries}
            maxValue={maxDailyValue}
            styles={styles}
          />
        ) : (
          <MonthlyTrendChart
            data={monthlySummaries}
            maxValue={maxMonthlyValue}
            styles={styles}
          />
        )}
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Expense Breakdown</AppText>

        <AppText variant="caption" muted>
          Top categories
        </AppText>
      </View>

      <View style={styles.breakdownCard}>
        {categoryBreakdown.length === 0 ? (
          <View style={styles.emptyBox}>
            <AppText variant="body" style={styles.emptyTitle}>
              No expense data
            </AppText>

            <AppText variant="caption" muted style={styles.emptyDescription}>
              Expense categories will appear once you add spending in this period.
            </AppText>
          </View>
        ) : null}

        {categoryBreakdown.map((category) => (
          <CategoryRow
            key={category.name}
            category={category}
            currency={defaultCurrency}
            styles={styles}
          />
        ))}
      </View>
    </Screen>
  );
}

function TransactionActivityRow({
  transaction,
  colors,
  styles,
  onPress,
}: {
  transaction: Transaction;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
}) {
  const amountColor = getTransactionAmountColor(transaction.type, colors);
  const prefix = getTransactionPrefix(transaction.type);

  return (
    <Pressable onPress={onPress} style={styles.transactionRow}>
      <View style={styles.transactionIconBox}>
        <Ionicons
          name={getTransactionIcon(transaction.type) as any}
          size={19}
          color={amountColor}
        />
      </View>

      <View style={styles.transactionTextBox}>
        <AppText variant="body" style={styles.transactionTitle} numberOfLines={1}>
          {transaction.title}
        </AppText>

        <AppText variant="caption" muted numberOfLines={1}>
          {getTransactionTypeLabel(transaction.type)} • {transaction.accountName} •{' '}
          {new Date(transaction.date).toLocaleDateString('id-ID')}
        </AppText>
      </View>

      <View style={styles.transactionAmountBox}>
        <AppText
          variant="body"
          style={[styles.transactionAmount, { color: amountColor }]}
          numberOfLines={1}
        >
          {prefix}
          {formatCompactCurrency(transaction.amount, transaction.currency)}
        </AppText>

        <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

function TradingAccountReportRow({
  report,
  defaultCurrency,
  styles,
  colors,
  onPress,
}: {
  report: TradingAccountReport;
  defaultCurrency: Currency;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
  onPress: () => void;
}) {
  const pnlPositive = report.convertedNetProfitLoss >= 0;

  return (
    <Pressable onPress={onPress} style={styles.tradingAccountRow}>
      <View style={styles.tradingAccountTop}>
        <View style={styles.tradingAccountNameBox}>
          <AppText variant="body" style={styles.tradingAccountName} numberOfLines={1}>
            {report.accountName}
          </AppText>

          <AppText variant="caption" muted numberOfLines={1}>
            {report.broker || 'No broker'} • {report.closedTrades} closed • {report.openTrades} open
          </AppText>
        </View>

        <AppText
          variant="body"
          style={[
            styles.tradingAccountAmount,
            pnlPositive ? styles.positiveText : styles.negativeText,
          ]}
          numberOfLines={1}
        >
          {pnlPositive ? '+' : ''}
          {formatCompactCurrency(report.convertedNetProfitLoss, defaultCurrency)}
        </AppText>
      </View>

      <View style={styles.tradingAccountMetrics}>
        <View style={styles.tradingAccountMetric}>
          <AppText variant="caption" muted>
            Win Rate
          </AppText>

          <AppText variant="caption" style={styles.tradingAccountMetricValue}>
            {report.winRate.toFixed(1)}%
          </AppText>
        </View>

        <View style={styles.tradingAccountMetric}>
          <AppText variant="caption" muted>
            Avg RR
          </AppText>

          <AppText variant="caption" style={styles.tradingAccountMetricValue}>
            1:{report.averageRR.toFixed(2)}
          </AppText>
        </View>

        <View style={styles.tradingAccountMetric}>
          <AppText variant="caption" muted>
            Issues
          </AppText>

          <AppText
            variant="caption"
            style={[
              styles.tradingAccountMetricValue,
              report.issueCount > 0 ? styles.negativeText : styles.positiveText,
            ]}
          >
            {report.issueCount}
          </AppText>
        </View>
      </View>
      <View style={styles.tradingAccountOpenHint}>
        <AppText variant="caption" muted>
          Tap to open account detail
        </AppText>

        <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

function InvestmentPerformanceChart({
  data,
  maxValue,
  currency,
  styles,
  colors,
}: {
  data: InvestmentPerformanceSummary[];
  maxValue: number;
  currency: Currency;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  const compactData = data.map((item) => ({
    ...item,
    buyHeight: Math.max((item.buyValue / maxValue) * 100, item.buyValue > 0 ? 8 : 0),
    sellHeight: Math.max((item.sellValue / maxValue) * 100, item.sellValue > 0 ? 8 : 0),
    pnlHeight: Math.max(
      (Math.abs(item.realizedPnL) / maxValue) * 100,
      item.realizedPnL !== 0 ? 8 : 0
    ),
  }));
  const chartReveal = useRef(new Animated.Value(0)).current;
  const animationKey = compactData
    .map((item) => `${item.label}:${item.buyValue}:${item.sellValue}:${item.realizedPnL}`)
    .join('|');

  useEffect(() => {
    chartReveal.stopAnimation();
    chartReveal.setValue(0);

    Animated.timing(chartReveal, {
      toValue: 1,
      duration: Math.min(1400, 460 + compactData.length * 70),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animationKey, chartReveal, compactData.length]);

  return (
    <View>
      <View style={styles.investmentLegendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
          <AppText variant="caption" muted>
            Buy
          </AppText>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.saving }]} />
          <AppText variant="caption" muted>
            Sell
          </AppText>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.investment }]} />
          <AppText variant="caption" muted>
            Realized P/L
          </AppText>
        </View>
      </View>

      <View style={styles.investmentChartBody}>
        {compactData.map((item, index) => {
          const itemStart = compactData.length <= 1 ? 0 : index / compactData.length;
          const itemEnd = compactData.length <= 1 ? 1 : (index + 1) / compactData.length;
          const itemReveal = chartReveal.interpolate({
            inputRange: [itemStart, itemEnd],
            outputRange: [0, 1],
            extrapolate: 'clamp',
          });
          const buyAnimatedHeight = itemReveal.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', `${item.buyHeight}%`],
          });
          const sellAnimatedHeight = itemReveal.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', `${item.sellHeight}%`],
          });
          const pnlAnimatedHeight = itemReveal.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', `${item.pnlHeight}%`],
          });

          return (
            <View key={item.label} style={styles.investmentChartItem}>
              <View style={styles.investmentBarGroup}>
                <Animated.View
                  style={[
                    styles.investmentBar,
                    {
                      height: buyAnimatedHeight as any,
                      backgroundColor: colors.income,
                    },
                  ]}
                />

                <Animated.View
                  style={[
                    styles.investmentBar,
                    {
                      height: sellAnimatedHeight as any,
                      backgroundColor: colors.saving,
                    },
                  ]}
                />

                <Animated.View
                  style={[
                    styles.investmentBar,
                    {
                      height: pnlAnimatedHeight as any,
                      backgroundColor:
                        item.realizedPnL >= 0 ? colors.investment : colors.expense,
                    },
                  ]}
                />
              </View>

              <AppText variant="caption" muted style={styles.chartLabel}>
                {item.label}
              </AppText>
            </View>
          );
        })}
      </View>

      <View style={styles.investmentChartFooter}>
        <AppText variant="caption" muted>
          Max scale
        </AppText>

        <AppText variant="caption" style={styles.investmentChartFooterValue}>
          {formatCompactCurrency(maxValue, currency)}
        </AppText>
      </View>
    </View>
  );
}

function CryptoAssetRow({
  asset,
  currency,
  styles,
}: {
  asset: CryptoAssetSummary;
  currency: Currency;
  styles: ReturnType<typeof createStyles>;
}) {
  const realizedPositive = asset.realizedPnL >= 0;

  return (
    <View style={styles.cryptoAssetRow}>
      <View style={styles.cryptoAssetTop}>
        <View style={styles.cryptoAssetNameBox}>
          <AppText variant="body" style={styles.cryptoAssetSymbol} numberOfLines={1}>
            {asset.symbol}
          </AppText>

          <AppText variant="caption" muted numberOfLines={1}>
            {asset.name} • Qty {asset.quantity.toLocaleString('id-ID', {
              maximumFractionDigits: 8,
            })}
          </AppText>
        </View>

        <AppText variant="body" style={styles.cryptoAssetValue} numberOfLines={1}>
          {formatCompactCurrency(asset.currentValue, currency)}
        </AppText>
      </View>

      <View style={styles.cryptoAssetMetrics}>
        <View style={styles.cryptoAssetMetric}>
          <AppText variant="caption" muted>
            Income
          </AppText>

          <AppText variant="caption" style={styles.cryptoAssetMetricValue} numberOfLines={1}>
            {formatCompactCurrency(asset.incomeValue, currency)}
          </AppText>
        </View>

        <View style={styles.cryptoAssetMetric}>
          <AppText variant="caption" muted>
            Payment
          </AppText>

          <AppText variant="caption" style={styles.cryptoAssetMetricValue} numberOfLines={1}>
            {formatCompactCurrency(asset.paymentValue, currency)}
          </AppText>
        </View>

        <View style={styles.cryptoAssetMetric}>
          <AppText variant="caption" muted>
            Realized P/L
          </AppText>

          <AppText
            variant="caption"
            style={[
              styles.cryptoAssetMetricValue,
              realizedPositive ? styles.positiveText : styles.negativeText,
            ]}
            numberOfLines={1}
          >
            {realizedPositive ? '+' : ''}
            {formatCompactCurrency(asset.realizedPnL, currency)}
          </AppText>
        </View>
      </View>
    </View>
  );
}

function DailyTrendChart({
  data,
  maxValue,
  styles,
}: {
  data: DailySummary[];
  maxValue: number;
  styles: ReturnType<typeof createStyles>;
}) {
  const compactData = data.filter((_, index) => {
    return index === 0 || index === data.length - 1 || (index + 1) % 5 === 0;
  });
  const chartReveal = useRef(new Animated.Value(0)).current;
  const animationKey = compactData
    .map((item) => `${item.label}:${item.income}:${item.expense}`)
    .join('|');

  useEffect(() => {
    chartReveal.stopAnimation();
    chartReveal.setValue(0);

    Animated.timing(chartReveal, {
      toValue: 1,
      duration: Math.min(1300, 440 + compactData.length * 70),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animationKey, chartReveal, compactData.length]);

  return (
    <View style={styles.chart}>
      {compactData.map((item, index) => {
        const itemStart = compactData.length <= 1 ? 0 : index / compactData.length;
        const itemEnd = compactData.length <= 1 ? 1 : (index + 1) / compactData.length;
        const itemReveal = chartReveal.interpolate({
          inputRange: [itemStart, itemEnd],
          outputRange: [0, 1],
          extrapolate: 'clamp',
        });
        const incomeHeight = Math.max((item.income / maxValue) * 100, item.income > 0 ? 8 : 0);
        const expenseHeight = Math.max((item.expense / maxValue) * 100, item.expense > 0 ? 8 : 0);
        const incomeAnimatedHeight = itemReveal.interpolate({
          inputRange: [0, 1],
          outputRange: ['0%', `${incomeHeight}%`],
        });
        const expenseAnimatedHeight = itemReveal.interpolate({
          inputRange: [0, 1],
          outputRange: ['0%', `${expenseHeight}%`],
        });

        return (
          <View key={item.label} style={styles.chartItem}>
            <View style={styles.barColumn}>
              <Animated.View
                style={[
                  styles.incomeBar,
                  {
                    height: incomeAnimatedHeight as any,
                  },
                ]}
              />

              <Animated.View
                style={[
                  styles.expenseBar,
                  {
                    height: expenseAnimatedHeight as any,
                  },
                ]}
              />
            </View>

            <AppText variant="caption" muted style={styles.chartLabel}>
              {item.label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

function MonthlyTrendChart({
  data,
  maxValue,
  styles,
}: {
  data: MonthlySummary[];
  maxValue: number;
  styles: ReturnType<typeof createStyles>;
}) {
  const chartReveal = useRef(new Animated.Value(0)).current;
  const animationKey = data.map((item) => `${item.label}:${item.income}:${item.expense}`).join('|');

  useEffect(() => {
    chartReveal.stopAnimation();
    chartReveal.setValue(0);

    Animated.timing(chartReveal, {
      toValue: 1,
      duration: Math.min(1300, 440 + data.length * 70),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animationKey, chartReveal, data.length]);

  return (
    <View style={styles.chart}>
      {data.map((item, index) => {
        const itemStart = data.length <= 1 ? 0 : index / data.length;
        const itemEnd = data.length <= 1 ? 1 : (index + 1) / data.length;
        const itemReveal = chartReveal.interpolate({
          inputRange: [itemStart, itemEnd],
          outputRange: [0, 1],
          extrapolate: 'clamp',
        });
        const incomeHeight = Math.max((item.income / maxValue) * 100, item.income > 0 ? 8 : 0);
        const expenseHeight = Math.max((item.expense / maxValue) * 100, item.expense > 0 ? 8 : 0);
        const incomeAnimatedHeight = itemReveal.interpolate({
          inputRange: [0, 1],
          outputRange: ['0%', `${incomeHeight}%`],
        });
        const expenseAnimatedHeight = itemReveal.interpolate({
          inputRange: [0, 1],
          outputRange: ['0%', `${expenseHeight}%`],
        });

        return (
          <View key={item.label} style={styles.chartItem}>
            <View style={styles.barColumn}>
              <Animated.View
                style={[
                  styles.incomeBar,
                  {
                    height: incomeAnimatedHeight as any,
                  },
                ]}
              />

              <Animated.View
                style={[
                  styles.expenseBar,
                  {
                    height: expenseAnimatedHeight as any,
                  },
                ]}
              />
            </View>

            <AppText variant="caption" muted style={styles.chartLabel}>
              {item.label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

function CategoryRow({
  category,
  currency,
  styles,
}: {
  category: CategorySummary;
  currency: Currency;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.categoryRow}>
      <View style={styles.categoryTop}>
        <View style={styles.categoryNameBox}>
          <AppText variant="body" style={styles.categoryName} numberOfLines={1}>
            {category.name}
          </AppText>

          <AppText variant="caption" muted>
            {category.percentage.toFixed(0)}% of expenses
          </AppText>
        </View>

        <AppText variant="body" style={styles.categoryAmount} numberOfLines={1}>
          {formatCompactCurrency(category.amount, currency)}
        </AppText>
      </View>

      <View style={styles.categoryTrack}>
        <View
          style={[
            styles.categoryFill,
            {
              width: `${Math.min(category.percentage, 100)}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  header: {
    marginBottom: 18,
  },
  headerText: {
    minWidth: 0,
  },
  title: {
    marginTop: 4,
  },
  segment: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 5,
    flexDirection: 'row',
    marginBottom: 14,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    color: colors.textMuted,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: colors.black,
  },
  periodCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  periodButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTextBox: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  periodTitle: {
    marginTop: 4,
    fontWeight: '900',
    textAlign: 'center',
  },
  reportControlCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
  },
  reportControlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  reportControlTextBox: {
    flex: 1,
    minWidth: 0,
  },
  reportControlTitle: {
    marginTop: 4,
  },
  reportControlDescription: {
    marginTop: 5,
    lineHeight: 18,
  },
  reportSearchButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportOverviewGrid: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  reportOverviewItem: {
    flex: 1,
    minHeight: 64,
    borderRadius: 16,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    justifyContent: 'center',
  },
  reportOverviewValue: {
    marginTop: 5,
    color: colors.text,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 28,
    padding: 22,
    marginBottom: 18,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
  },
  heroTextBox: {
    flex: 1,
    minWidth: 0,
  },
  heroValue: {
    marginTop: 8,
    fontSize: 34,
    lineHeight: 40,
  },
  heroDescription: {
    marginTop: 4,
    lineHeight: 18,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  heroBadgeText: {
    fontWeight: '900',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sectionHeader: {
    marginTop: 28,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionActionButton: {
    minHeight: 34,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionActionText: {
    color: colors.text,
    fontWeight: '900',
  },
  transactionListCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 14,
    gap: 10,
    marginBottom: 14,
  },
  transactionRow: {
    borderRadius: 19,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  transactionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionTextBox: {
    flex: 1,
    minWidth: 0,
  },
  transactionTitle: {
    color: colors.text,
    fontWeight: '900',
  },
  transactionAmountBox: {
    alignItems: 'flex-end',
    gap: 4,
    maxWidth: 132,
  },
  transactionAmount: {
    fontWeight: '900',
    textAlign: 'right',
  },
  tradingFilterCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: 14,
    gap: 10,
    marginBottom: 14,
  },
  tradingFilterLabel: {
    fontWeight: '900',
  },
  tradingFilterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tradingFilterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 180,
  },
  tradingFilterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tradingFilterChipText: {
    color: colors.textMuted,
    fontWeight: '900',
  },
  tradingFilterChipTextActive: {
    color: colors.black,
  },
  tradingWarningCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.expense,
    borderRadius: 22,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 14,
  },
  tradingWarningTextBox: {
    flex: 1,
    minWidth: 0,
  },
  tradingWarningTitle: {
    color: colors.expense,
    fontWeight: '900',
  },
  tradingWarningDescription: {
    marginTop: 3,
    lineHeight: 18,
  },
  tradingHeroCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 26,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  tradingHeroIcon: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tradingHeroTextBox: {
    flex: 1,
    minWidth: 0,
  },
  tradingHeroLabel: {
    color: colors.textMuted,
    fontWeight: '900',
  },
  tradingHeroValue: {
    marginTop: 5,
    fontWeight: '900',
  },
  tradingHeroDescription: {
    marginTop: 4,
    color: colors.textMuted,
    fontWeight: '800',
  },
  tradingInsightCard: {
    marginTop: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: 14,
    gap: 9,
  },
  tradingInsightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  tradingInsightTitle: {
    color: colors.text,
    fontWeight: '900',
  },
  tradingInsightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tradingInsightText: {
    flex: 1,
    lineHeight: 18,
  },
  tradingAccountList: {
    marginTop: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 15,
    gap: 12,
  },
  tradingAccountRow: {
    borderRadius: 19,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    gap: 12,
  },
  tradingAccountTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  tradingAccountNameBox: {
    flex: 1,
    minWidth: 0,
  },
  tradingAccountName: {
    color: colors.text,
    fontWeight: '900',
  },
  tradingAccountAmount: {
    fontWeight: '900',
    maxWidth: 132,
    textAlign: 'right',
  },
  tradingAccountMetrics: {
    flexDirection: 'row',
    gap: 8,
  },
  tradingAccountOpenHint: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 9,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tradingAccountMetric: {
    flex: 1,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  tradingAccountMetricValue: {
    marginTop: 4,
    color: colors.text,
    fontWeight: '900',
  },
  investmentHeroCard: {
    backgroundColor: colors.primary,
    borderRadius: 26,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  investmentHeroIcon: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  investmentHeroTextBox: {
    flex: 1,
    minWidth: 0,
  },
  investmentHeroLabel: {
    color: 'rgba(0,0,0,0.62)',
    fontWeight: '900',
  },
  investmentHeroValue: {
    marginTop: 5,
    color: colors.black,
    fontWeight: '900',
  },
  investmentHeroDescription: {
    marginTop: 4,
    color: 'rgba(0,0,0,0.62)',
    fontWeight: '800',
  },
  cryptoHeroCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 26,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  cryptoHeroIcon: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cryptoHeroTextBox: {
    flex: 1,
    minWidth: 0,
  },
  cryptoHeroLabel: {
    color: colors.textMuted,
    fontWeight: '900',
  },
  cryptoHeroValue: {
    marginTop: 5,
    color: colors.text,
    fontWeight: '900',
  },
  cryptoHeroDescription: {
    marginTop: 4,
    color: colors.textMuted,
    fontWeight: '800',
  },
  cryptoBreakdownCard: {
    marginTop: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 15,
    gap: 12,
  },
  cryptoAssetRow: {
    borderRadius: 19,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    gap: 12,
  },
  cryptoAssetTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  cryptoAssetNameBox: {
    flex: 1,
    minWidth: 0,
  },
  cryptoAssetSymbol: {
    color: colors.text,
    fontWeight: '900',
  },
  cryptoAssetValue: {
    color: colors.text,
    fontWeight: '900',
    maxWidth: 132,
    textAlign: 'right',
  },
  cryptoAssetMetrics: {
    flexDirection: 'row',
    gap: 8,
  },
  cryptoAssetMetric: {
    flex: 1,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  cryptoAssetMetricValue: {
    marginTop: 4,
    color: colors.text,
    fontWeight: '900',
  },
  positiveText: {
    color: colors.income,
  },
  negativeText: {
    color: colors.expense,
  },
  investmentLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },
  investmentChartBody: {
    height: 170,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
  },
  investmentChartItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  investmentBarGroup: {
    height: 128,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
  },
  investmentBar: {
    width: 7,
    minHeight: 0,
    borderRadius: 999,
  },
  investmentChartFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  investmentChartFooterValue: {
    color: colors.text,
    fontWeight: '900',
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: 16,
  },
  chart: {
    height: 180,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 7,
  },
  chartItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  barColumn: {
    height: 142,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
  },
  incomeBar: {
    width: 7,
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    backgroundColor: colors.income,
  },
  expenseBar: {
    width: 7,
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    backgroundColor: colors.expense,
  },
  chartLabel: {
    fontSize: 9,
  },
  breakdownCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: 16,
    gap: 16,
  },
  emptyBox: {
    paddingVertical: 8,
  },
  emptyTitle: {
    fontWeight: '900',
  },
  emptyDescription: {
    marginTop: 6,
    lineHeight: 18,
  },
  categoryRow: {
    gap: 10,
  },
  categoryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  categoryNameBox: {
    flex: 1,
    minWidth: 0,
  },
  categoryName: {
    fontWeight: '900',
    marginBottom: 4,
  },
  categoryAmount: {
    fontWeight: '900',
  },
  categoryTrack: {
    height: 9,
    borderRadius: 999,
    backgroundColor: colors.surfaceSoft,
    overflow: 'hidden',
  },
  categoryFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.expense,
  },
  });
}
