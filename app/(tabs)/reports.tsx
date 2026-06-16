import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../src/components/ui/AppText';
import { Screen } from '../../src/components/ui/Screen';
import { StatCard } from '../../src/components/ui/StatCard';
import { ThemeColors } from '../../src/constants/colors';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useFinanceStore } from '../../src/stores/useFinanceStore';
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

export default function ReportsScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const transactions = useFinanceStore((state) => state.transactions);
  const investmentHoldings = useFinanceStore((state) => state.investmentHoldings);
  const investmentOrders = useFinanceStore((state) => state.investmentOrders);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);
  const exchangeRates = useFinanceStore((state) => state.exchangeRates);

  const [reportMode, setReportMode] = useState<ReportMode>('monthly');
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

  const unrealizedPnlPositive = investmentSummary.unrealizedPnL >= 0;
  const realizedPnlPositive = investmentSummary.realizedPnL >= 0;

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
        {compactData.map((item) => (
          <View key={item.label} style={styles.investmentChartItem}>
            <View style={styles.investmentBarGroup}>
              <View
                style={[
                  styles.investmentBar,
                  {
                    height: `${item.buyHeight}%`,
                    backgroundColor: colors.income,
                  },
                ]}
              />

              <View
                style={[
                  styles.investmentBar,
                  {
                    height: `${item.sellHeight}%`,
                    backgroundColor: colors.saving,
                  },
                ]}
              />

              <View
                style={[
                  styles.investmentBar,
                  {
                    height: `${item.pnlHeight}%`,
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
        ))}
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

  return (
    <View style={styles.chart}>
      {compactData.map((item) => (
        <View key={item.label} style={styles.chartItem}>
          <View style={styles.barColumn}>
            <View
              style={[
                styles.incomeBar,
                {
                  height: `${Math.max((item.income / maxValue) * 100, item.income > 0 ? 8 : 0)}%`,
                },
              ]}
            />

            <View
              style={[
                styles.expenseBar,
                {
                  height: `${Math.max((item.expense / maxValue) * 100, item.expense > 0 ? 8 : 0)}%`,
                },
              ]}
            />
          </View>

          <AppText variant="caption" muted style={styles.chartLabel}>
            {item.label}
          </AppText>
        </View>
      ))}
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
  return (
    <View style={styles.chart}>
      {data.map((item) => (
        <View key={item.label} style={styles.chartItem}>
          <View style={styles.barColumn}>
            <View
              style={[
                styles.incomeBar,
                {
                  height: `${Math.max((item.income / maxValue) * 100, item.income > 0 ? 8 : 0)}%`,
                },
              ]}
            />

            <View
              style={[
                styles.expenseBar,
                {
                  height: `${Math.max((item.expense / maxValue) * 100, item.expense > 0 ? 8 : 0)}%`,
                },
              ]}
            />
          </View>

          <AppText variant="caption" muted style={styles.chartLabel}>
            {item.label}
          </AppText>
        </View>
      ))}
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
