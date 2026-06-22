import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { AnimatedPressable } from '../src/components/ui/AnimatedPressable';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import {
  TradingAccount,
  TradingCashEvent,
  TradingPlan,
  TradingTrade,
  useFinanceStore,
} from '../src/stores/useFinanceStore';
import { Account, Currency } from '../src/types/finance';
import { formatCurrency } from '../src/utils/currency';
import { convertCurrencyAmount } from '../src/utils/currencyConversion';

type PeriodFilter = 'daily' | 'weekly' | 'monthly' | 'yearly';

type GrowthPoint = {
  id: string;
  label: string;
  value: number;
  periodKey: string;
};


type TradeReport = {
  periodKey: string;
  label: string;
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  wins: number;
  losses: number;
  netProfitLoss: number;
  winRate: number;
  averageRR: number;
  violationCount: number;
  warningCount: number;
  checks: string[];
};

type AITradingSummary = {
  period: PeriodFilter;
  label: string;
  periodKey: string;
  periodLabel: string;
  isReady: boolean;
  status: 'waiting' | 'good' | 'warning' | 'danger';
  headline: string;
  summary: string;
  focus: string;
  netProfitLoss: number;
  winRate: number;
  closedTrades: number;
  violationCount: number;
  actionItems: string[];
};

const periodFilters: { label: string; value: PeriodFilter }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
];

function getAccountTypeLabel(accountType: TradingAccount['accountType']) {
  if (accountType === 'cent') return 'Cent';
  if (accountType === 'standard') return 'Standard';
  if (accountType === 'ecn') return 'ECN';
  if (accountType === 'demo') return 'Demo';
  if (accountType === 'raw') return 'Raw';

  return 'Unknown';
}

function getPlatformLabel(platform: TradingAccount['platform']) {
  return platform === 'mt5' ? 'MT5' : 'MT4';
}

function isCentAccount(account: TradingAccount) {
  return account.accountType === 'cent';
}

function getRealTradingAmount(account: TradingAccount, rawAmount: number) {
  if (isCentAccount(account)) {
    return rawAmount / 100;
  }

  return rawAmount;
}

function formatCentRawAmount(rawAmount: number) {
  return `${rawAmount.toLocaleString('en-US', {
    maximumFractionDigits: 2,
  })} USC`;
}

function formatTradingBalance(account: TradingAccount, rawAmount: number) {
  if (isCentAccount(account)) {
    return formatCentRawAmount(rawAmount);
  }

  return formatCurrency(rawAmount, account.currency);
}

function formatTradingRealValue(account: TradingAccount, rawAmount: number) {
  return formatCurrency(getRealTradingAmount(account, rawAmount), account.currency);
}

function getLinkedBrokerWallet(account: TradingAccount, accounts: Account[]) {
  if (!account.linkedBrokerWalletAccountId) {
    return null;
  }

  return accounts.find((item) => item.id === account.linkedBrokerWalletAccountId) || null;
}

function getDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}

function getStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getPeriodKey(dateValue: string, period: PeriodFilter) {
  const date = getDate(dateValue);
  const year = date.getFullYear();

  if (period === 'daily') {
    return date.toISOString().slice(0, 10);
  }

  if (period === 'weekly') {
    const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = tempDate.getUTCDay() || 7;
    tempDate.setUTCDate(tempDate.getUTCDate() + 4 - day);
    const weekYearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((Number(tempDate) - Number(weekYearStart)) / 86400000 + 1) / 7);

    return `${tempDate.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }

  if (period === 'monthly') {
    return `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  return `${year}`;
}

function getCompletedPeriodKey(period: PeriodFilter) {
  const now = new Date();

  if (period === 'daily') {
    const yesterday = getStartOfDay(now);
    yesterday.setDate(yesterday.getDate() - 1);

    return yesterday.toISOString().slice(0, 10);
  }

  if (period === 'weekly') {
    const lastWeek = new Date(now);
    lastWeek.setDate(lastWeek.getDate() - 7);

    return getPeriodKey(lastWeek.toISOString(), 'weekly');
  }

  if (period === 'monthly') {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    return getPeriodKey(lastMonth.toISOString(), 'monthly');
  }

  return `${now.getFullYear() - 1}`;
}

function getPeriodLabel(periodKey: string, period: PeriodFilter) {
  if (period === 'daily') {
    const date = getDate(periodKey);

    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
    }).format(date);
  }

  if (period === 'weekly') {
    return periodKey.replace('-', ' ');
  }

  if (period === 'monthly') {
    const [year, month] = periodKey.split('-');

    return new Intl.DateTimeFormat('id-ID', {
      month: 'short',
      year: 'numeric',
    }).format(new Date(Number(year), Number(month) - 1, 1));
  }

  return periodKey;
}

function getEventDirection(eventType: TradingCashEvent['eventType']) {
  return eventType === 'deposit' ? 1 : -1;
}

function summarizeEvents(
  events: TradingCashEvent[],
  account: TradingAccount,
  period: PeriodFilter
) {
  const groupedEvents = events.reduce<Record<string, TradingCashEvent[]>>((acc, event) => {
    const key = getPeriodKey(event.date, period);

    if (!acc[key]) {
      acc[key] = [];
    }

    acc[key].push(event);

    return acc;
  }, {});

  return Object.entries(groupedEvents)
    .sort(([left], [right]) => (left > right ? 1 : -1))
    .map(([periodKey, items]) => {
      const deposit = items
        .filter((event) => event.eventType === 'deposit')
        .reduce((total, event) => total + event.tradingAccountRealAmount, 0);
      const withdrawal = items
        .filter((event) => event.eventType === 'withdrawal')
        .reduce((total, event) => total + event.tradingAccountRealAmount, 0);
      const net = deposit - withdrawal;

      return {
        periodKey,
        label: getPeriodLabel(periodKey, period),
        deposit,
        withdrawal,
        net,
        count: items.length,
        currency: account.currency,
      };
    });
}

function buildGrowthPoints(
  events: TradingCashEvent[],
  account: TradingAccount,
  period: PeriodFilter,
  currentRealBalance: number
): GrowthPoint[] {
  const sortedEvents = [...events].sort((left, right) => {
    return Number(getDate(left.date)) - Number(getDate(right.date));
  });

  if (sortedEvents.length === 0) {
    return [
      {
        id: 'current-balance',
        label: new Intl.DateTimeFormat('id-ID', {
          day: '2-digit',
          month: 'short',
        }).format(new Date()),
        periodKey: 'current',
        value: currentRealBalance,
      },
    ];
  }

  const groupedMovements = sortedEvents.reduce<Record<string, number>>((acc, event) => {
    const key = getPeriodKey(event.date, period);
    const movement = event.tradingAccountRealAmount * getEventDirection(event.eventType);

    acc[key] = (acc[key] || 0) + movement;

    return acc;
  }, {});

  const sortedPeriodKeys = Object.keys(groupedMovements).sort();
  const totalMovement = Object.values(groupedMovements).reduce(
    (total, movement) => total + movement,
    0
  );
  let runningBalance = currentRealBalance - totalMovement;

  const points = sortedPeriodKeys.map((periodKey) => {
    runningBalance += groupedMovements[periodKey] || 0;

    return {
      id: periodKey,
      label: getPeriodLabel(periodKey, period),
      periodKey,
      value: runningBalance,
    };
  });

  const latestCurrentLabel = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
  }).format(new Date());

  const latestPoint = points[points.length - 1];

  if (latestPoint && Math.abs(latestPoint.value - currentRealBalance) < 0.000001) {
    return points;
  }

  return [
    ...points,
    {
      id: 'current-balance',
      label: latestCurrentLabel,
      periodKey: 'current',
      value: currentRealBalance,
    },
  ];
}

function getChartRange(points: GrowthPoint[]) {
  if (points.length === 0) {
    return {
      min: 0,
      max: 1,
    };
  }

  const values = points.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  if (minValue === maxValue) {
    const padding = Math.max(Math.abs(minValue) * 0.08, 1);

    return {
      min: minValue - padding,
      max: maxValue + padding,
    };
  }

  const padding = Math.max((maxValue - minValue) * 0.06, 0.000001);

  return {
    min: minValue - padding,
    max: maxValue + padding,
  };
}

function getLatestValue(points: GrowthPoint[]) {
  if (points.length === 0) {
    return 0;
  }

  return points[points.length - 1].value;
}

function getMinutesFromTime(value: string | undefined) {
  if (!value) {
    return null;
  }

  const [hourText, minuteText] = value.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  return hour * 60 + minute;
}

function getMinutesFromDateValue(value: string | null | undefined) {
  if (!value || !value.includes('T')) {
    return null;
  }

  const date = getDate(value);

  return date.getHours() * 60 + date.getMinutes();
}

function isWithinTradingSession(
  tradeDateValue: string | null | undefined,
  sessionStart: string,
  sessionEnd: string
) {
  const tradeMinutes = getMinutesFromDateValue(tradeDateValue);
  const startMinutes = getMinutesFromTime(sessionStart);
  const endMinutes = getMinutesFromTime(sessionEnd);

  if (
    tradeMinutes === null ||
    startMinutes === null ||
    endMinutes === null
  ) {
    return null;
  }

  if (startMinutes <= endMinutes) {
    return tradeMinutes >= startMinutes && tradeMinutes <= endMinutes;
  }

  return tradeMinutes >= startMinutes || tradeMinutes <= endMinutes;
}

function getTradeDayKey(trade: TradingTrade) {
  return getPeriodKey(getTradeDate(trade), 'daily');
}

function buildTradeReports(
  trades: TradingTrade[],
  plan: TradingPlan | undefined,
  account: TradingAccount,
  period: PeriodFilter,
  currentRealBalance: number
): TradeReport[] {
  const groupedTrades = trades.reduce<Record<string, TradingTrade[]>>((acc, trade) => {
    const key = getPeriodKey(getTradeDate(trade), period);

    if (!acc[key]) {
      acc[key] = [];
    }

    acc[key].push(trade);

    return acc;
  }, {});

  return Object.entries(groupedTrades)
    .sort(([left], [right]) => (left < right ? 1 : -1))
    .map(([periodKey, items]) => {
      const closedTrades = items.filter((trade) => trade.status === 'closed');
      const wins = closedTrades.filter((trade) => trade.netProfitLoss > 0).length;
      const losses = closedTrades.filter((trade) => trade.netProfitLoss < 0).length;
      const netProfitLoss = closedTrades.reduce(
        (total, trade) => total + trade.netProfitLoss,
        0
      );
      const averageRR =
        closedTrades.length > 0
          ? closedTrades.reduce((total, trade) => total + trade.rewardRiskRatio, 0) /
            closedTrades.length
          : 0;
      const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;
      const checks: string[] = [];
      let violationCount = 0;
      let warningCount = 0;

      if (!plan) {
        checks.push('Trading plan has not been created yet.');
        warningCount += 1;
      } else {
        const dailyTrades = items.reduce<Record<string, TradingTrade[]>>((acc, trade) => {
          const dayKey = getTradeDayKey(trade);

          if (!acc[dayKey]) {
            acc[dayKey] = [];
          }

          acc[dayKey].push(trade);

          return acc;
        }, {});

        Object.entries(dailyTrades).forEach(([dayKey, dayTrades]) => {
          if (dayTrades.length > plan.maxTradesPerDay) {
            violationCount += 1;
            checks.push(
              `${dayKey}: max trades exceeded (${dayTrades.length}/${plan.maxTradesPerDay}).`
            );
          }

          const dailyNet = dayTrades
            .filter((trade) => trade.status === 'closed')
            .reduce((total, trade) => total + trade.netProfitLoss, 0);

          if (dailyNet <= -Math.abs(plan.dailyMaxLossAmount)) {
            violationCount += 1;
            checks.push(
              `${dayKey}: daily max loss hit (${formatCurrency(dailyNet, account.currency)}).`
            );
          }

          if (
            plan.dailyProfitTargetAmount > 0 &&
            dailyNet >= plan.dailyProfitTargetAmount
          ) {
            checks.push(
              `${dayKey}: daily profit target reached (${formatCurrency(
                dailyNet,
                account.currency
              )}).`
            );
          }
        });

        items.forEach((trade) => {
          if (
            plan.allowedPairs.length > 0 &&
            !plan.allowedPairs.some(
              (pair) => pair.toUpperCase() === trade.pair.toUpperCase()
            )
          ) {
            violationCount += 1;
            checks.push(`${trade.pair}: pair is outside allowed plan pairs.`);
          }

          const maxRiskAmount =
            trade.planRiskLimitAmountSnapshot > 0
              ? trade.planRiskLimitAmountSnapshot
              : (currentRealBalance * plan.riskPerTradePercent) / 100;

          if (trade.riskAmount > maxRiskAmount && maxRiskAmount > 0) {
            violationCount += 1;
            checks.push(
              `${trade.pair}: risk exceeds locked plan snapshot (${formatCurrency(
                trade.riskAmount,
                account.currency
              )} > ${formatCurrency(maxRiskAmount, account.currency)}).`
            );
          }

          if (!trade.planRiskLimitAmountSnapshot) {
            warningCount += 1;
            checks.push(`${trade.pair}: risk snapshot missing; using current balance fallback.`);
          }

          if (
            trade.status === 'closed' &&
            trade.rewardRiskRatio > 0 &&
            trade.rewardRiskRatio < plan.minimumRewardRiskRatio
          ) {
            violationCount += 1;
            checks.push(
              `${trade.pair}: RR below plan (1:${trade.rewardRiskRatio} < 1:${plan.minimumRewardRiskRatio}).`
            );
          }

          const sessionCheck = isWithinTradingSession(
            trade.openDate,
            plan.sessionStart,
            plan.sessionEnd
          );

          if (sessionCheck === false) {
            violationCount += 1;
            checks.push(`${trade.pair}: entry was outside trading session.`);
          }

          if (sessionCheck === null) {
            warningCount += 1;
            checks.push(`${trade.pair}: session check needs open time data.`);
          }
        });

        if (checks.length === 0) {
          checks.push('No plan violation detected for this period.');
        }
      }

      return {
        periodKey,
        label: getPeriodLabel(periodKey, period),
        totalTrades: items.length,
        closedTrades: closedTrades.length,
        openTrades: items.filter((trade) => trade.status === 'open').length,
        wins,
        losses,
        netProfitLoss,
        winRate,
        averageRR,
        violationCount,
        warningCount,
        checks: checks.slice(0, 5),
      };
    });
}

function summarizeCompliance(reports: TradeReport[]) {
  return reports.reduce(
    (summary, report) => {
      return {
        reports: summary.reports + 1,
        trades: summary.trades + report.totalTrades,
        violations: summary.violations + report.violationCount,
        warnings: summary.warnings + report.warningCount,
      };
    },
    {
      reports: 0,
      trades: 0,
      violations: 0,
      warnings: 0,
    }
  );
}

function getAIStatus(report: TradeReport | undefined, hasPlan: boolean) {
  if (!report || report.closedTrades === 0) {
    return 'waiting' as const;
  }

  if (!hasPlan || report.violationCount > 0) {
    return 'danger' as const;
  }

  if (report.warningCount > 0 || report.netProfitLoss < 0) {
    return 'warning' as const;
  }

  return 'good' as const;
}

function getAIStatusLabel(status: AITradingSummary['status']) {
  if (status === 'good') return 'Good';
  if (status === 'warning') return 'Review';
  if (status === 'danger') return 'Issue';

  return 'Waiting';
}

function getAIStatusIcon(status: AITradingSummary['status']) {
  if (status === 'good') return 'checkmark-circle-outline';
  if (status === 'warning') return 'warning-outline';
  if (status === 'danger') return 'alert-circle-outline';

  return 'time-outline';
}

function getAIStatusColor(status: AITradingSummary['status'], colors: ThemeColors) {
  if (status === 'good') return colors.income;
  if (status === 'warning') return colors.investment;
  if (status === 'danger') return colors.expense;

  return colors.textMuted;
}

function buildAIActionItems(report: TradeReport | undefined, plan: TradingPlan | undefined) {
  if (!report) {
    return [
      'Wait until the period closes and at least one closed trade is recorded.',
      'Keep recording trades with setup, risk, RR, mistakes, and emotion notes.',
    ];
  }

  const items: string[] = [];

  if (!plan) {
    items.push('Create a trading plan before relying on AI discipline analysis.');
  }

  if (report.violationCount > 0) {
    const issueChecks = report.checks.filter(
      (check) =>
        !check.includes('No plan violation') &&
        !check.includes('target reached')
    );

    items.push(...issueChecks.slice(0, 3));
  }

  if (report.closedTrades === 0) {
    items.push('No closed trade yet in this period, so performance analysis is waiting.');
  }

  if (report.netProfitLoss < 0) {
    items.push('Review losing trades and identify whether the loss came from setup, risk, or execution.');
  }

  if (report.averageRR > 0 && plan && report.averageRR < plan.minimumRewardRiskRatio) {
    items.push('Improve trade selection because average RR is below the trading plan.');
  }

  if (report.winRate < 40 && report.closedTrades >= 3) {
    items.push('Win rate is weak; reduce frequency and wait for higher-quality setups.');
  }

  if (items.length === 0) {
    items.push('Maintain discipline. Keep documenting setup, risk, and emotions for every trade.');
    items.push('Repeat the same risk structure and avoid increasing lot size after wins.');
  }

  return items.slice(0, 4);
}

function buildAITradingSummaries(
  trades: TradingTrade[],
  plan: TradingPlan | undefined,
  account: TradingAccount,
  currentRealBalance: number
): AITradingSummary[] {
  return periodFilters.map((periodItem) => {
    const periodKey = getCompletedPeriodKey(periodItem.value);
    const periodReports = buildTradeReports(
      trades,
      plan,
      account,
      periodItem.value,
      currentRealBalance
    );
    const report = periodReports.find((item) => item.periodKey === periodKey);
    const status = getAIStatus(report, Boolean(plan));
    const periodLabel = getPeriodLabel(periodKey, periodItem.value);

    if (!report || report.closedTrades === 0) {
      return {
        period: periodItem.value,
        label: periodItem.label,
        periodKey,
        periodLabel,
        isReady: false,
        status,
        headline: `${periodItem.label} summary is waiting`,
        summary:
          periodItem.value === 'daily'
            ? 'Daily summary only analyzes yesterday after the date changes and at least one closed trade exists.'
            : `${periodItem.label} summary only analyzes the last closed ${periodItem.label.toLowerCase()} period after closed trades exist.`,
        focus: 'Keep recording trades consistently so this period can be analyzed later.',
        netProfitLoss: 0,
        winRate: 0,
        closedTrades: 0,
        violationCount: 0,
        actionItems: buildAIActionItems(report, plan),
      };
    }

    const profitText =
      report.netProfitLoss > 0
        ? 'profitable'
        : report.netProfitLoss < 0
          ? 'negative'
          : 'flat';
    const disciplineText =
      !plan
        ? 'because no trading plan is active yet'
        : report.violationCount > 0
          ? `with ${report.violationCount} plan issue${report.violationCount === 1 ? '' : 's'}`
          : 'with no major plan violation';
    const headline =
      status === 'good'
        ? `${periodItem.label} was disciplined and profitable`
        : status === 'warning'
          ? `${periodItem.label} needs review`
          : status === 'danger'
            ? `${periodItem.label} has discipline issues`
            : `${periodItem.label} summary is waiting`;

    return {
      period: periodItem.value,
      label: periodItem.label,
      periodKey,
      periodLabel,
      isReady: true,
      status,
      headline,
      summary: `${periodLabel} closed with ${report.closedTrades} closed trade${
        report.closedTrades === 1 ? '' : 's'
      }, ${report.winRate.toFixed(1)}% win rate, and ${formatCurrency(
        report.netProfitLoss,
        account.currency
      )} net P/L. The period was ${profitText} ${disciplineText}.`,
      focus:
        report.violationCount > 0
          ? 'Focus on rule compliance before increasing trade frequency.'
          : report.netProfitLoss < 0
            ? 'Focus on execution quality and reduce trades with weak confirmation.'
            : 'Focus on repeating the same discipline and protecting gains.',
      netProfitLoss: report.netProfitLoss,
      winRate: report.winRate,
      closedTrades: report.closedTrades,
      violationCount: report.violationCount,
      actionItems: buildAIActionItems(report, plan),
    };
  });
}

function getTradeDate(trade: TradingTrade) {
  return trade.closeDate || trade.openDate;
}

function getClosedTrades(trades: TradingTrade[]) {
  return trades.filter((trade) => trade.status === 'closed');
}

function summarizeTradingPerformance(trades: TradingTrade[]) {
  const closedTrades = getClosedTrades(trades);
  const wins = closedTrades.filter((trade) => trade.netProfitLoss > 0).length;
  const losses = closedTrades.filter((trade) => trade.netProfitLoss < 0).length;
  const breakeven = closedTrades.filter((trade) => trade.netProfitLoss === 0).length;
  const netProfitLoss = closedTrades.reduce(
    (total, trade) => total + trade.netProfitLoss,
    0
  );
  const totalRisk = closedTrades.reduce((total, trade) => total + trade.riskAmount, 0);
  const averageRR =
    closedTrades.length > 0
      ? closedTrades.reduce((total, trade) => total + trade.rewardRiskRatio, 0) /
        closedTrades.length
      : 0;
  const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;

  return {
    totalTrades: trades.length,
    closedTrades: closedTrades.length,
    openTrades: trades.filter((trade) => trade.status === 'open').length,
    wins,
    losses,
    breakeven,
    winRate,
    netProfitLoss,
    totalRisk,
    averageRR,
  };
}

function formatPeriodName(period: PeriodFilter) {
  if (period === 'daily') return 'Daily';
  if (period === 'weekly') return 'Weekly';
  if (period === 'monthly') return 'Monthly';

  return 'Yearly';
}


function getTradingPlanRiskLimit(plan: TradingPlan | undefined, accountCurrency: Currency) {
  if (!plan) {
    return 'No plan';
  }

  const percentPart = `${plan.dailyMaxLossPercent}%`;
  const amountPart = formatCurrency(plan.dailyMaxLossAmount, accountCurrency);

  return `${percentPart} / ${amountPart}`;
}

function getTradingPlanPairs(plan: TradingPlan | undefined) {
  if (!plan || plan.allowedPairs.length === 0) {
    return 'No pairs set';
  }

  return plan.allowedPairs.join(', ');
}

export default function TradingAccountDetailScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ tradingAccountId?: string }>();

  const accounts = useFinanceStore((state) => state.accounts);
  const tradingAccounts = useFinanceStore((state) => state.tradingAccounts);
  const tradingCashEvents = useFinanceStore((state) => state.tradingCashEvents);
  const tradingPlans = useFinanceStore((state) => state.tradingPlans);
  const tradingTrades = useFinanceStore((state) => state.tradingTrades);
  const exchangeRates = useFinanceStore((state) => state.exchangeRates);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);

  const [period, setPeriod] = useState<PeriodFilter>('daily');

  const tradingAccount = tradingAccounts.find(
    (account) => account.id === params.tradingAccountId
  );

  const accountEvents = useMemo(() => {
    if (!tradingAccount) {
      return [];
    }

    return tradingCashEvents
      .filter((event) => event.tradingAccountId === tradingAccount.id)
      .sort((left, right) => Number(getDate(right.date)) - Number(getDate(left.date)));
  }, [tradingAccount, tradingCashEvents]);

  const tradingPlan = tradingAccount
    ? tradingPlans.find((plan) => plan.tradingAccountId === tradingAccount.id)
    : undefined;

  const realBalance = tradingAccount
    ? getRealTradingAmount(tradingAccount, tradingAccount.balance)
    : 0;

  const accountTrades = useMemo(() => {
    if (!tradingAccount) {
      return [];
    }

    return tradingTrades
      .filter((trade) => trade.tradingAccountId === tradingAccount.id)
      .sort((left, right) => Number(getDate(getTradeDate(right))) - Number(getDate(getTradeDate(left))));
  }, [tradingAccount, tradingTrades]);

  const tradingPerformance = useMemo(() => {
    return summarizeTradingPerformance(accountTrades);
  }, [accountTrades]);

  const tradeReports = useMemo(() => {
    if (!tradingAccount) {
      return [];
    }

    return buildTradeReports(
      accountTrades,
      tradingPlan,
      tradingAccount,
      period,
      realBalance
    );
  }, [accountTrades, period, realBalance, tradingAccount, tradingPlan]);

  const complianceSummary = useMemo(() => {
    return summarizeCompliance(tradeReports);
  }, [tradeReports]);

  const aiSummaries = useMemo(() => {
    if (!tradingAccount) {
      return [];
    }

    return buildAITradingSummaries(
      accountTrades,
      tradingPlan,
      tradingAccount,
      realBalance
    );
  }, [accountTrades, realBalance, tradingAccount, tradingPlan]);

  const realEquity = tradingAccount
    ? getRealTradingAmount(tradingAccount, tradingAccount.equity)
    : 0;
  const floatingPnL = realEquity - realBalance;

  const periodReports = useMemo(() => {
    if (!tradingAccount) {
      return [];
    }

    return summarizeEvents(accountEvents, tradingAccount, period);
  }, [accountEvents, period, tradingAccount]);

  const growthPoints = useMemo(() => {
    if (!tradingAccount) {
      return [];
    }

    return buildGrowthPoints(accountEvents, tradingAccount, period, realBalance);
  }, [accountEvents, period, realBalance, tradingAccount]);

  if (!tradingAccount) {
    return (
      <Screen>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
          </Pressable>

          <View style={styles.headerText}>
            <AppText variant="caption" muted>
              Trading Journal
            </AppText>

            <AppText variant="title">Not Found</AppText>
          </View>
        </View>

        <View style={styles.emptyCard}>
          <Ionicons name="alert-circle-outline" size={30} color={colors.textMuted} />

          <AppText variant="body" muted style={styles.emptyDescription}>
            This trading account may have been deleted.
          </AppText>
        </View>
      </Screen>
    );
  }

  const brokerWallet = getLinkedBrokerWallet(tradingAccount, accounts);
  const baseBalance = convertCurrencyAmount(
    realBalance,
    tradingAccount.currency,
    defaultCurrency,
    exchangeRates
  );
  const latestGrowthValue = getLatestValue(growthPoints);
  const periodLabel = formatPeriodName(period);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.headerText}>
          <AppText variant="caption" muted>
            Account
          </AppText>

          <AppText variant="title" numberOfLines={1}>
            {tradingAccount.name}
          </AppText>
        </View>

        <AnimatedPressable
          onPress={() => router.push(`/edit-trading-account?tradingAccountId=${tradingAccount.id}` as any)}
          style={styles.editButton}
        >
          <Ionicons name="create-outline" size={18} color={colors.black} />
        </AnimatedPressable>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroTextBox}>
            <AppText variant="caption" muted>
              Growth • {periodLabel}
            </AppText>

            <AppText variant="title" style={styles.heroValue}>
              {formatCurrency(realBalance, tradingAccount.currency)}
            </AppText>

            <AppText variant="caption" muted style={styles.heroSubValue}>
              Latest {formatCurrency(latestGrowthValue, tradingAccount.currency)}
            </AppText>
          </View>

          <View style={styles.typeBadge}>
            <AppText variant="caption" style={styles.typeBadgeText}>
              {getAccountTypeLabel(tradingAccount.accountType)}
            </AppText>
          </View>
        </View>

        <GrowthLineChart points={growthPoints} colors={colors} currency={tradingAccount.currency} />
      </View>

      <View style={styles.grid}>
        <MetricCard
          label={isCentAccount(tradingAccount) ? 'Cent Balance' : 'Balance'}
          value={formatTradingBalance(tradingAccount, tradingAccount.balance)}
          subValue={isCentAccount(tradingAccount) ? formatTradingRealValue(tradingAccount, tradingAccount.balance) : undefined}
          icon="wallet-outline"
          colors={colors}
        />

        <MetricCard
          label={isCentAccount(tradingAccount) ? 'Cent Equity' : 'Equity'}
          value={formatTradingBalance(tradingAccount, tradingAccount.equity)}
          subValue={isCentAccount(tradingAccount) ? formatTradingRealValue(tradingAccount, tradingAccount.equity) : undefined}
          icon="pulse-outline"
          colors={colors}
        />

        <MetricCard
          label="Floating P/L"
          value={formatCurrency(floatingPnL, tradingAccount.currency)}
          icon="analytics-outline"
          colors={colors}
          tone={floatingPnL >= 0 ? colors.income : colors.expense}
        />

        <MetricCard
          label={`Base ${defaultCurrency}`}
          value={formatCurrency(baseBalance, defaultCurrency)}
          icon="cash-outline"
          colors={colors}
        />
      </View>

      <View style={styles.profileCard}>
        <InfoLine label="Broker" value={tradingAccount.broker} colors={colors} />
        <InfoLine label="Server" value={tradingAccount.server} colors={colors} />
        <InfoLine label="Platform" value={getPlatformLabel(tradingAccount.platform)} colors={colors} />
        <InfoLine label="Leverage" value={`1:${tradingAccount.leverage}`} colors={colors} />
        <InfoLine
          label="Linked Wallet"
          value={brokerWallet ? brokerWallet.name : 'No linked wallet'}
          colors={colors}
        />
      </View>

      <View style={styles.planCard}>
        <View style={styles.planHeader}>
          <View style={styles.planIcon}>
            <Ionicons name="document-text-outline" size={18} color={colors.text} />
          </View>

          <View style={styles.planHeaderText}>
            <AppText variant="caption" muted>
              Trading Plan
            </AppText>

            <AppText variant="body" style={styles.planTitle}>
              {tradingPlan ? 'Plan active' : 'No trading plan yet'}
            </AppText>
          </View>

          <AnimatedPressable
            onPress={() =>
              router.push(`/trading-plan?tradingAccountId=${tradingAccount.id}` as any)
            }
            style={styles.planAction}
          >
            <AppText variant="caption" style={styles.planActionText}>
              {tradingPlan ? 'Edit' : 'Create'}
            </AppText>
          </AnimatedPressable>
        </View>

        <View style={styles.planMetricGrid}>
          <PlanMetric
            label="Max Loss"
            value={getTradingPlanRiskLimit(tradingPlan, tradingAccount.currency)}
            colors={colors}
          />

          <PlanMetric
            label="Target"
            value={
              tradingPlan
                ? `${tradingPlan.dailyProfitTargetPercent || 0}% / ${formatCurrency(
                    tradingPlan.dailyProfitTargetAmount,
                    tradingAccount.currency
                  )}`
                : 'No plan'
            }
            colors={colors}
          />

          <PlanMetric
            label="Risk"
            value={tradingPlan ? `${tradingPlan.riskPerTradePercent}%` : 'No plan'}
            colors={colors}
          />

          <PlanMetric
            label="Max Trades"
            value={tradingPlan ? `${tradingPlan.maxTradesPerDay} / day` : 'No plan'}
            colors={colors}
          />

          <PlanMetric
            label="Min RR"
            value={tradingPlan ? `1:${tradingPlan.minimumRewardRiskRatio}` : 'No plan'}
            colors={colors}
          />
        </View>

        <View style={styles.planNoteBox}>
          <AppText variant="caption" muted>
            Pairs
          </AppText>

          <AppText variant="caption" style={styles.planNoteText} numberOfLines={2}>
            {getTradingPlanPairs(tradingPlan)}
          </AppText>
        </View>
      </View>

      <View style={styles.actionRow}>
        <AnimatedPressable
          containerStyle={styles.actionButtonMotion}
          onPress={() =>
            router.push(`/trading-cash-event?tradingAccountId=${tradingAccount.id}&eventType=deposit` as any)
          }
          style={styles.primaryAction}
        >
          <Ionicons name="arrow-down-outline" size={17} color={colors.black} />

          <AppText variant="body" style={styles.primaryActionText}>
            Deposit
          </AppText>
        </AnimatedPressable>

        <AnimatedPressable
          containerStyle={styles.actionButtonMotion}
          onPress={() =>
            router.push(`/trading-cash-event?tradingAccountId=${tradingAccount.id}&eventType=withdrawal` as any)
          }
          style={styles.secondaryAction}
        >
          <Ionicons name="arrow-up-outline" size={17} color={colors.text} />

          <AppText variant="body" style={styles.secondaryActionText}>
            Withdraw
          </AppText>
        </AnimatedPressable>
      </View>

      <View style={styles.tradeActionCard}>
        <View style={styles.tradeActionTextBox}>
          <AppText variant="caption" muted>
            Trades
          </AppText>

          <AppText variant="body" style={styles.tradeActionTitle}>
            Add position result
          </AppText>
        </View>

        <AnimatedPressable
          onPress={() =>
            router.push(`/add-trading-trade?tradingAccountId=${tradingAccount.id}` as any)
          }
          style={styles.tradeActionButton}
        >
          <Ionicons name="add-outline" size={18} color={colors.black} />

          <AppText variant="caption" style={styles.tradeActionButtonText}>
            Add Trade
          </AppText>
        </AnimatedPressable>
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Cash Reports</AppText>
        <AppText variant="caption" muted>
          {periodReports.length} group{periodReports.length === 1 ? '' : 's'}
        </AppText>
      </View>

      <View style={styles.periodRow}>
        {periodFilters.map((item) => {
          const active = period === item.value;

          return (
            <AnimatedPressable
              key={item.value}
              onPress={() => setPeriod(item.value)}
              style={[styles.periodChip, active ? styles.periodChipActive : null]}
            >
              <AppText
                variant="caption"
                style={[styles.periodChipText, active ? styles.periodChipTextActive : null]}
              >
                {item.label}
              </AppText>
            </AnimatedPressable>
          );
        })}
      </View>

      <View style={styles.reportList}>
        {periodReports.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="bar-chart-outline" size={30} color={colors.textMuted} />

            <AppText variant="body" muted style={styles.emptyDescription}>
              No cash report yet.
            </AppText>
          </View>
        ) : null}

        {periodReports.map((report) => (
          <View key={report.periodKey} style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <View>
                <AppText variant="caption" muted>
                  Period
                </AppText>

                <AppText variant="body" style={styles.reportTitle}>
                  {report.label}
                </AppText>
              </View>

              <View style={styles.reportCount}>
                <AppText variant="caption" style={styles.reportCountText}>
                  {report.count} event{report.count === 1 ? '' : 's'}
                </AppText>
              </View>
            </View>

            <View style={styles.reportGrid}>
              <ReportMetric
                label="Deposit"
                value={formatCurrency(report.deposit, tradingAccount.currency)}
                color={colors.income}
                colors={colors}
              />

              <ReportMetric
                label="Withdrawal"
                value={formatCurrency(report.withdrawal, tradingAccount.currency)}
                color={colors.expense}
                colors={colors}
              />

              <ReportMetric
                label="Net"
                value={formatCurrency(report.net, tradingAccount.currency)}
                color={report.net >= 0 ? colors.income : colors.expense}
                colors={colors}
              />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Performance</AppText>
        <AppText variant="caption" muted>
          {tradingPerformance.closedTrades} closed
        </AppText>
      </View>

      <View style={styles.tradeMetricGrid}>
        <TradeMetric
          label="Net P/L"
          value={formatCurrency(tradingPerformance.netProfitLoss, tradingAccount.currency)}
          color={tradingPerformance.netProfitLoss >= 0 ? colors.income : colors.expense}
          colors={colors}
        />

        <TradeMetric
          label="Win Rate"
          value={`${tradingPerformance.winRate.toFixed(1)}%`}
          color={colors.text}
          colors={colors}
        />

        <TradeMetric
          label="Average RR"
          value={`1:${tradingPerformance.averageRR.toFixed(2)}`}
          color={colors.text}
          colors={colors}
        />

        <TradeMetric
          label="Open Trades"
          value={`${tradingPerformance.openTrades}`}
          color={colors.text}
          colors={colors}
        />
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Compliance</AppText>
        <AppText variant="caption" muted>
          {period}
        </AppText>
      </View>

      <View style={styles.complianceHeroCard}>
        <View style={styles.complianceHeroIcon}>
          <Ionicons
            name={complianceSummary.violations > 0 ? 'alert-circle-outline' : 'shield-checkmark-outline'}
            size={22}
            color={complianceSummary.violations > 0 ? colors.expense : colors.income}
          />
        </View>

        <View style={styles.complianceHeroText}>
          <AppText variant="body" style={styles.complianceHeroTitle}>
            {tradingPlan
              ? complianceSummary.violations > 0
                ? `${complianceSummary.violations} violation detected`
                : 'No major violation detected'
              : 'Trading plan needed'}
          </AppText>

          <AppText variant="caption" muted style={styles.complianceHeroDescription}>
            {tradingPlan
              ? `${complianceSummary.trades} trades checked • ${complianceSummary.warnings} warnings`
              : 'Create a trading plan first to enable full rule checks.'}
          </AppText>
        </View>
      </View>

      <View style={styles.complianceReportList}>
        {tradeReports.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="analytics-outline" size={30} color={colors.textMuted} />

            <AppText variant="body" muted style={styles.emptyDescription}>
              No trade report yet for this period filter.
            </AppText>
          </View>
        ) : null}

        {tradeReports.map((report) => (
          <View key={report.periodKey} style={styles.complianceReportCard}>
            <View style={styles.complianceReportHeader}>
              <View style={styles.complianceReportTitleBox}>
                <AppText variant="caption" muted>
                  {report.label}
                </AppText>

                <AppText variant="body" style={styles.complianceReportTitle}>
                  {report.totalTrades} trade{report.totalTrades === 1 ? '' : 's'} •{' '}
                  {report.closedTrades} closed
                </AppText>
              </View>

              <View
                style={[
                  styles.complianceBadge,
                  report.violationCount > 0 ? styles.complianceBadgeDanger : null,
                ]}
              >
                <AppText
                  variant="caption"
                  style={[
                    styles.complianceBadgeText,
                    report.violationCount > 0 ? styles.complianceBadgeTextDanger : null,
                  ]}
                >
                  {report.violationCount > 0
                    ? `${report.violationCount} issue`
                    : 'OK'}
                </AppText>
              </View>
            </View>

            <View style={styles.complianceMetricRow}>
              <ReportMetric
                label="Net P/L"
                value={formatCurrency(report.netProfitLoss, tradingAccount.currency)}
                color={report.netProfitLoss >= 0 ? colors.income : colors.expense}
                colors={colors}
              />

              <ReportMetric
                label="Win Rate"
                value={`${report.winRate.toFixed(1)}%`}
                color={colors.text}
                colors={colors}
              />

              <ReportMetric
                label="Avg RR"
                value={`1:${report.averageRR.toFixed(2)}`}
                color={colors.text}
                colors={colors}
              />
            </View>

            <View style={styles.checkList}>
              {report.checks.map((check, index) => (
                <View key={`${report.periodKey}-${index}`} style={styles.checkItem}>
                  <Ionicons
                    name={check.includes('No plan violation') || check.includes('target reached') ? 'checkmark-circle-outline' : 'ellipse-outline'}
                    size={15}
                    color={
                      check.includes('No plan violation') || check.includes('target reached')
                        ? colors.income
                        : colors.textMuted
                    }
                  />

                  <AppText variant="caption" muted style={styles.checkText}>
                    {check}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Trades</AppText>
        <AppText variant="caption" muted>
          {accountTrades.length} trade{accountTrades.length === 1 ? '' : 's'}
        </AppText>
      </View>

      <View style={styles.tradeList}>
        {accountTrades.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="clipboard-outline" size={30} color={colors.textMuted} />

            <AppText variant="body" muted style={styles.emptyDescription}>
              No trade history yet. Add your first trade result to start account analysis.
            </AppText>
          </View>
        ) : null}

        {accountTrades.map((trade) => (
          <Pressable
            key={trade.id}
            onPress={() => router.push(`/trading-trade-detail?tradeId=${trade.id}` as any)}
            style={styles.tradeCard}
          >
            <View style={styles.tradeIcon}>
              <Ionicons
                name={trade.direction === 'buy' ? 'trending-up-outline' : 'trending-down-outline'}
                size={18}
                color={trade.netProfitLoss >= 0 ? colors.income : colors.expense}
              />
            </View>

            <View style={styles.tradeTextBox}>
              <AppText variant="body" style={styles.tradeTitle}>
                {trade.pair} • {trade.direction.toUpperCase()}
              </AppText>

              <AppText variant="caption" muted style={styles.tradeDescription}>
                {trade.status.toUpperCase()} • Lot {trade.lotSize} • Risk{' '}
                {formatCurrency(trade.riskAmount, trade.currency)} • RR 1:
                {trade.rewardRiskRatio || 0}
              </AppText>

              <AppText variant="caption" muted style={styles.tradeDescription}>
                {new Intl.DateTimeFormat('id-ID', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }).format(getDate(getTradeDate(trade)))}
              </AppText>
            </View>

            <View style={styles.tradeAmountBox}>
              <AppText
                variant="caption"
                style={[
                  styles.tradeAmount,
                  { color: trade.netProfitLoss >= 0 ? colors.income : colors.expense },
                ]}
                numberOfLines={1}
              >
                {formatCurrency(trade.netProfitLoss, trade.currency)}
              </AppText>

              <AppText variant="caption" muted numberOfLines={1}>
                {trade.setupTag || 'No setup'}
              </AppText>
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">AI Summary Center</AppText>
        <AppText variant="caption" muted>
          local
        </AppText>
      </View>

      <View style={styles.summaryList}>
        {aiSummaries.map((summary) => (
          <View key={`${summary.period}-${summary.periodKey}`} style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryTitleBox}>
                <AppText variant="caption" muted>
                  {summary.label} AI Summary
                </AppText>

                <AppText variant="body" style={styles.summaryTitle} numberOfLines={2}>
                  {summary.periodLabel}
                </AppText>
              </View>

              <View style={styles.summaryStatusBox}>
                <Ionicons
                  name={getAIStatusIcon(summary.status)}
                  size={16}
                  color={getAIStatusColor(summary.status, colors)}
                />

                <AppText
                  variant="caption"
                  style={[
                    styles.summaryStatusText,
                    { color: getAIStatusColor(summary.status, colors) },
                  ]}
                >
                  {getAIStatusLabel(summary.status)}
                </AppText>
              </View>
            </View>

            <AppText variant="body" style={styles.aiHeadline}>
              {summary.headline}
            </AppText>

            <AppText variant="caption" muted style={styles.summaryDescription}>
              {summary.summary}
            </AppText>

            {summary.isReady ? (
              <View style={styles.summaryMetricRow}>
                <ReportMetric
                  label="Net P/L"
                  value={formatCurrency(summary.netProfitLoss, tradingAccount.currency)}
                  color={summary.netProfitLoss >= 0 ? colors.income : colors.expense}
                  colors={colors}
                />

                <ReportMetric
                  label="Win Rate"
                  value={`${summary.winRate.toFixed(1)}%`}
                  color={colors.text}
                  colors={colors}
                />

                <ReportMetric
                  label="Issues"
                  value={`${summary.violationCount}`}
                  color={summary.violationCount > 0 ? colors.expense : colors.income}
                  colors={colors}
                />
              </View>
            ) : null}

            <View style={styles.aiFocusCard}>
              <Ionicons name="sparkles-outline" size={16} color={colors.textMuted} />

              <AppText variant="caption" muted style={styles.aiNoteText}>
                {summary.focus}
              </AppText>
            </View>

            <View style={styles.aiActionList}>
              {summary.actionItems.map((item, index) => (
                <View key={`${summary.periodKey}-ai-${index}`} style={styles.aiActionItem}>
                  <View style={styles.aiActionBullet}>
                    <AppText variant="caption" style={styles.aiActionBulletText}>
                      {index + 1}
                    </AppText>
                  </View>

                  <AppText variant="caption" muted style={styles.aiActionText}>
                    {item}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Cash Event History</AppText>
        <AppText variant="caption" muted>
          {accountEvents.length} event{accountEvents.length === 1 ? '' : 's'}
        </AppText>
      </View>

      <View style={styles.eventList}>
        {accountEvents.map((event) => (
          <View key={event.id} style={styles.eventCard}>
            <View style={styles.eventIcon}>
              <Ionicons
                name={event.eventType === 'deposit' ? 'arrow-down-outline' : 'arrow-up-outline'}
                size={18}
                color={event.eventType === 'deposit' ? colors.income : colors.expense}
              />
            </View>

            <View style={styles.eventTextBox}>
              <AppText variant="body" style={styles.eventTitle}>
                {event.eventType === 'deposit' ? 'Deposit' : 'Withdrawal'}
              </AppText>

              <AppText variant="caption" muted style={styles.eventDescription}>
                {new Intl.DateTimeFormat('id-ID', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }).format(getDate(event.date))}
              </AppText>

              {event.note ? (
                <AppText variant="caption" muted style={styles.eventDescription} numberOfLines={2}>
                  {event.note}
                </AppText>
              ) : null}
            </View>

            <View style={styles.eventAmountBox}>
              <AppText
                variant="caption"
                style={[
                  styles.eventAmount,
                  { color: event.eventType === 'deposit' ? colors.income : colors.expense },
                ]}
                numberOfLines={1}
              >
                {event.eventType === 'deposit' ? '+' : '-'}
                {formatCurrency(event.tradingAccountRealAmount, event.tradingAccountCurrency)}
              </AppText>

              {isCentAccount(tradingAccount) ? (
                <AppText variant="caption" muted numberOfLines={1}>
                  raw {formatCentRawAmount(event.tradingAccountRawAmount)}
                </AppText>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

function GrowthLineChart({
  points,
  colors,
  currency,
}: {
  points: GrowthPoint[];
  colors: ThemeColors;
  currency: Currency;
}) {
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();
  const chartWidth = Math.min(width - 84, 360);
  const chartHeight = 150;
  const lineReveal = useRef(new Animated.Value(0)).current;
  const animationKey = points
    .map((point) => `${point.periodKey}:${point.label}:${Math.round(point.value * 100)}`)
    .join('|');

  useEffect(() => {
    lineReveal.stopAnimation();
    lineReveal.setValue(0);

    Animated.timing(lineReveal, {
      toValue: 1,
      duration: Math.min(1500, 520 + points.length * 85),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animationKey, lineReveal, points.length]);

  const chartPaddingX = 22;
  const chartPaddingY = 20;
  const plotWidth = Math.max(chartWidth - chartPaddingX * 2, 1);
  const plotHeight = Math.max(chartHeight - chartPaddingY * 2, 1);
  const range = getChartRange(points);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  const chartPoints = points.map((point, index) => {
    const x =
      chartPaddingX +
      (points.length <= 1 ? 0 : (index / (points.length - 1)) * plotWidth);
    const normalizedY = Math.min(
      Math.max((point.value - range.min) / Math.max(range.max - range.min, 0.000001), 0),
      1
    );
    const y = chartPaddingY + (1 - normalizedY) * plotHeight;

    return {
      ...point,
      x,
      y,
    };
  });

  const segments = chartPoints.slice(1).map((point, index) => {
    const previousPoint = chartPoints[index];
    const dx = point.x - previousPoint.x;
    const dy = point.y - previousPoint.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    return {
      key: `${previousPoint.id}-${point.id}`,
      left: previousPoint.x,
      top: previousPoint.y,
      width: length,
      angle,
    };
  });

  const selectedPoint = selectedPointId
    ? chartPoints.find((point) => point.id === selectedPointId) || null
    : null;

  const tooltipWidth = 126;
  const tooltipLeft = selectedPoint
    ? Math.min(Math.max(selectedPoint.x - tooltipWidth / 2, 8), chartWidth - tooltipWidth - 8)
    : 8;
  const tooltipTop = selectedPoint
    ? Math.min(Math.max(selectedPoint.y - 64, 8), chartHeight - 60)
    : 8;

  return (
    <View style={styles.chartCard}>
      <View
        style={[
          styles.chartBody,
          {
            width: chartWidth,
            height: chartHeight,
          },
        ]}
      >
        {[0.2, 0.5, 0.8].map((ratio) => (
          <View
            key={`${ratio}`}
            style={[
              styles.chartGridLine,
              {
                left: chartPaddingX,
                right: chartPaddingX,
                top: chartPaddingY + plotHeight * ratio,
              },
            ]}
          />
        ))}

        {segments.map((segment, index) => {
          const segmentCount = Math.max(segments.length, 1);
          const segmentStart = index / segmentCount;
          const segmentEnd = (index + 1) / segmentCount;
          const segmentProgress = lineReveal.interpolate({
            inputRange: [segmentStart, segmentEnd],
            outputRange: [0, 1],
            extrapolate: 'clamp',
          });
          const animatedWidth = segmentProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, segment.width],
          });

          return (
            <Animated.View
              key={segment.key}
              style={[
                styles.chartLineSegment,
                {
                  width: animatedWidth,
                  left: segment.left,
                  top: segment.top,
                  opacity: segmentProgress,
                  transform: [{ rotateZ: `${segment.angle}deg` }],
                },
              ]}
            />
          );
        })}

        {chartPoints.map((point, index) => {
          const selected = point.id === selectedPoint?.id;
          const pointCount = Math.max(chartPoints.length - 1, 1);
          const pointMoment = chartPoints.length === 1 ? 1 : index / pointCount;
          const pointStart = index === 0 ? 0 : Math.max(pointMoment - 0.08, 0);
          const pointEnd = index === 0 ? 0.08 : pointMoment;
          const pointProgress = lineReveal.interpolate({
            inputRange: [pointStart, pointEnd],
            outputRange: [0, 1],
            extrapolate: 'clamp',
          });
          const pointScale = pointProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.65, 1],
          });

          return (
            <Animated.View
              key={point.id}
              style={[
                styles.chartDotTouch,
                {
                  left: point.x - 16,
                  top: point.y - 16,
                  opacity: pointProgress,
                  transform: [{ scale: pointScale }],
                },
              ]}
            >
              <Pressable
                onPress={() =>
                  setSelectedPointId((currentPointId) =>
                    currentPointId === point.id ? null : point.id
                  )
                }
                style={styles.chartDotButton}
              >
                <View style={[styles.chartDot, selected ? styles.chartDotSelected : null]} />
              </Pressable>
            </Animated.View>
          );
        })}

        {selectedPoint ? (
          <Pressable
            onPress={() => setSelectedPointId(null)}
            style={[
              styles.chartTooltip,
              {
                left: tooltipLeft,
                top: tooltipTop,
              },
            ]}
          >
            <AppText variant="caption" style={styles.chartTooltipValue} numberOfLines={1}>
              {formatCurrency(selectedPoint.value, currency)}
            </AppText>

            <AppText variant="caption" style={styles.chartTooltipDate} numberOfLines={1}>
              {selectedPoint.label}
            </AppText>
          </Pressable>
        ) : null}

        {points.length === 0 ? (
          <View style={styles.chartEmpty}>
            <AppText variant="caption" muted>
              No growth data yet
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.chartFooter}>
        <View style={styles.chartFooterPill}>
          <AppText variant="caption" muted>
            Points
          </AppText>

          <AppText variant="caption" style={styles.chartFooterValue}>
            {points.length}
          </AppText>
        </View>

        <View style={styles.chartFooterPill}>
          <AppText variant="caption" muted>
            Latest
          </AppText>

          <AppText variant="caption" style={styles.chartFooterValue}>
            {points[points.length - 1]?.label || 'Now'}
          </AppText>
        </View>

        <View style={styles.chartFooterPill}>
          <AppText variant="caption" muted>
            Max
          </AppText>

          <AppText variant="caption" style={styles.chartFooterValue} numberOfLines={1}>
            {formatCurrency(Math.max(...points.map((point) => point.value), 0), currency)}
          </AppText>
        </View>
      </View>
    </View>
  );
}

function MetricCard({
  label,
  value,
  subValue,
  icon,
  colors,
  tone,
}: {
  label: string;
  value: string;
  subValue?: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: ThemeColors;
  tone?: string;
}) {
  const styles = createStyles(colors);

  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIcon}>
        <Ionicons name={icon} size={18} color={tone || colors.textMuted} />
      </View>

      <AppText variant="caption" muted>
        {label}
      </AppText>

      <AppText variant="body" style={[styles.metricValue, tone ? { color: tone } : null]} numberOfLines={1}>
        {value}
      </AppText>

      {subValue ? (
        <AppText variant="caption" muted numberOfLines={1}>
          real {subValue}
        </AppText>
      ) : null}
    </View>
  );
}

function InfoLine({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ThemeColors;
}) {
  const styles = createStyles(colors);

  return (
    <View style={styles.infoLine}>
      <AppText variant="caption" muted>
        {label}
      </AppText>

      <AppText variant="body" style={styles.infoLineValue} numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

function TradeMetric({
  label,
  value,
  color,
  colors,
}: {
  label: string;
  value: string;
  color: string;
  colors: ThemeColors;
}) {
  const styles = createStyles(colors);

  return (
    <View style={styles.tradeMetric}>
      <AppText variant="caption" muted>
        {label}
      </AppText>

      <AppText variant="caption" style={[styles.tradeMetricValue, { color }]} numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

function PlanMetric({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ThemeColors;
}) {
  const styles = createStyles(colors);

  return (
    <View style={styles.planMetric}>
      <AppText variant="caption" muted>
        {label}
      </AppText>

      <AppText variant="caption" style={styles.planMetricValue} numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

function ReportMetric({
  label,
  value,
  color,
  colors,
}: {
  label: string;
  value: string;
  color: string;
  colors: ThemeColors;
}) {
  const styles = createStyles(colors);

  return (
    <View style={styles.reportMetric}>
      <AppText variant="caption" muted>
        {label}
      </AppText>

      <AppText variant="caption" style={[styles.reportMetricValue, { color }]} numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: {
      marginBottom: 18,
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
      borderColor: colors.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editButton: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: {
      flex: 1,
      minWidth: 0,
    },
    heroCard: {
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 28,
      padding: 15,
      marginBottom: 14,
      shadowColor: colors.shadow,
      shadowOpacity: 0.14,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 2,
      gap: 14,
    },
    heroTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 14,
      alignItems: 'flex-start',
    },
    heroTextBox: {
      flex: 1,
      minWidth: 0,
    },
    heroValue: {
      marginTop: 7,
      fontSize: 28,
      lineHeight: 34,
    },
    heroSubValue: {
      marginTop: 4,
    },
    typeBadge: {
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    typeBadgeText: {
      color: colors.text,
      fontWeight: '900',
    },
    chartCard: {
      backgroundColor: colors.surfaceSoft,
      borderRadius: 24,
      padding: 12,
      gap: 12,
      overflow: 'hidden',
    },
    chartBody: {
      alignSelf: 'center',
      borderRadius: 22,
      backgroundColor: 'transparent',
      overflow: 'hidden',
      position: 'relative',
    },
    chartGridLine: {
      position: 'absolute',
      height: 1,
      borderRadius: 999,
      backgroundColor: colors.border,
      opacity: 0.45,
    },
    chartLineSegment: {
      position: 'absolute',
      height: 4,
      borderRadius: 99,
      backgroundColor: colors.primary,
      transformOrigin: '0px 2px' as any,
    },
    chartDotTouch: {
      position: 'absolute',
      width: 28,
      height: 28,
    },
    chartDotButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chartDot: {
      width: 11,
      height: 11,
      borderRadius: 99,
      backgroundColor: colors.primary,
      borderWidth: 3,
      borderColor: colors.surface,
    },
    chartDotSelected: {
      width: 15,
      height: 15,
      borderColor: colors.text,
    },
    chartTooltip: {
      position: 'absolute',
      minHeight: 54,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      paddingHorizontal: 12,
      paddingVertical: 9,
      justifyContent: 'center',
    },
    chartTooltipValue: {
      color: colors.text,
      fontWeight: '900',
    },
    chartTooltipDate: {
      marginTop: 3,
      color: colors.textMuted,
      fontWeight: '800',
    },
    chartEmpty: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chartFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
    },
    chartFooterPill: {
      flex: 1,
      minWidth: 0,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 9,
      gap: 3,
    },
    chartFooterValue: {
      color: colors.text,
      fontWeight: '900',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 16,
    },
    metricCard: {
      flexGrow: 1,
      flexBasis: '47%',
      minWidth: 140,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 22,
      padding: 14,
      gap: 7,
    },
    metricIcon: {
      width: 34,
      height: 34,
      borderRadius: 13,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
    metricValue: {
      color: colors.text,
      fontWeight: '900',
      fontSize: 13,
    },
    profileCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 24,
      padding: 15,
      gap: 12,
      marginBottom: 16,
    },
    infoLine: {
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSoft,
      paddingBottom: 11,
      gap: 4,
    },
    infoLineValue: {
      color: colors.text,
      fontWeight: '900',
    },
    planCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 24,
      padding: 15,
      gap: 14,
      marginBottom: 16,
    },
    planHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
    },
    planIcon: {
      width: 38,
      height: 38,
      borderRadius: 15,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    planHeaderText: {
      flex: 1,
      minWidth: 0,
    },
    planTitle: {
      color: colors.text,
      fontWeight: '900',
      marginTop: 2,
    },
    planAction: {
      minHeight: 34,
      borderRadius: 999,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    planActionText: {
      color: colors.black,
      fontWeight: '900',
    },
    planMetricGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    planMetric: {
      flexGrow: 1,
      flexBasis: '47%',
      minWidth: 130,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 16,
      padding: 10,
      gap: 4,
    },
    planMetricValue: {
      color: colors.text,
      fontWeight: '900',
    },
    planNoteBox: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 16,
      padding: 10,
      gap: 4,
    },
    planNoteText: {
      color: colors.text,
      fontWeight: '900',
      lineHeight: 18,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 14,
    },
    actionButtonMotion: {
      flex: 1,
    },
    primaryAction: {
      flex: 1,
      minHeight: 52,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    primaryActionText: {
      color: colors.black,
      fontWeight: '900',
    },
    secondaryAction: {
      flex: 1,
      minHeight: 52,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    secondaryActionText: {
      color: colors.text,
      fontWeight: '900',
    },
    tradeActionCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 22,
      padding: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 18,
    },
    tradeActionTextBox: {
      flex: 1,
      minWidth: 0,
    },
    tradeActionTitle: {
      color: colors.text,
      fontWeight: '900',
      marginTop: 3,
    },
    tradeActionButton: {
      minHeight: 40,
      borderRadius: 15,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: 12,
    },
    tradeActionButtonText: {
      color: colors.black,
      fontWeight: '900',
    },
    tradeMetricGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 18,
    },
    tradeMetric: {
      flexGrow: 1,
      flexBasis: '47%',
      minWidth: 130,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 18,
      padding: 12,
      gap: 4,
    },
    tradeMetricValue: {
      fontWeight: '900',
    },
    complianceHeroCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 24,
      padding: 14,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
      marginBottom: 12,
    },
    complianceHeroIcon: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    complianceHeroText: {
      flex: 1,
      minWidth: 0,
    },
    complianceHeroTitle: {
      color: colors.text,
      fontWeight: '900',
    },
    complianceHeroDescription: {
      marginTop: 4,
      lineHeight: 18,
    },
    complianceReportList: {
      gap: 12,
      marginBottom: 18,
    },
    complianceReportCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 24,
      padding: 14,
      gap: 12,
    },
    complianceReportHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    complianceReportTitleBox: {
      flex: 1,
      minWidth: 0,
    },
    complianceReportTitle: {
      color: colors.text,
      fontWeight: '900',
      marginTop: 3,
    },
    complianceBadge: {
      borderRadius: 999,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    complianceBadgeDanger: {
      borderColor: colors.expense,
      backgroundColor: colors.surfaceSoft,
    },
    complianceBadgeText: {
      color: colors.text,
      fontWeight: '900',
    },
    complianceBadgeTextDanger: {
      color: colors.expense,
    },
    complianceMetricRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    checkList: {
      gap: 8,
    },
    checkItem: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-start',
    },
    checkText: {
      flex: 1,
      lineHeight: 18,
    },
    tradeList: {
      gap: 10,
      marginBottom: 18,
    },
    tradeCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 22,
      padding: 13,
      flexDirection: 'row',
      gap: 11,
      alignItems: 'center',
    },
    tradeIcon: {
      width: 42,
      height: 42,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tradeTextBox: {
      flex: 1,
      minWidth: 0,
    },
    tradeTitle: {
      color: colors.text,
      fontWeight: '900',
    },
    tradeDescription: {
      marginTop: 3,
      lineHeight: 18,
    },
    tradeAmountBox: {
      maxWidth: 120,
      alignItems: 'flex-end',
    },
    tradeAmount: {
      fontWeight: '900',
    },
    sectionHeader: {
      marginTop: 8,
      marginBottom: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: 12,
    },
    periodRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 14,
    },
    periodChip: {
      minHeight: 38,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      paddingHorizontal: 12,
      justifyContent: 'center',
    },
    periodChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    periodChipText: {
      color: colors.textMuted,
      fontWeight: '900',
    },
    periodChipTextActive: {
      color: colors.black,
    },
    reportList: {
      gap: 10,
      marginBottom: 18,
    },
    reportCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 22,
      padding: 14,
      gap: 12,
    },
    reportHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    reportTitle: {
      color: colors.text,
      fontWeight: '900',
      marginTop: 3,
    },
    reportCount: {
      borderRadius: 999,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      paddingHorizontal: 9,
      paddingVertical: 5,
      alignSelf: 'flex-start',
    },
    reportCountText: {
      color: colors.text,
      fontWeight: '900',
      fontSize: 10,
    },
    reportGrid: {
      flexDirection: 'row',
      gap: 8,
    },
    reportMetric: {
      flex: 1,
      minWidth: 0,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      padding: 10,
      gap: 4,
    },
    reportMetricValue: {
      fontWeight: '900',
    },
    summaryList: {
      gap: 10,
      marginBottom: 18,
    },
    summaryCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 22,
      padding: 14,
      gap: 12,
    },
    summaryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    summaryTitleBox: {
      flex: 1,
      minWidth: 0,
    },
    summaryStatusBox: {
      borderRadius: 999,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      paddingHorizontal: 9,
      paddingVertical: 5,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      gap: 5,
      alignItems: 'center',
    },
    summaryStatusText: {
      fontWeight: '900',
    },
    summaryTitle: {
      color: colors.text,
      fontWeight: '900',
      marginTop: 3,
    },
    summaryBadge: {
      borderRadius: 999,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      paddingHorizontal: 9,
      paddingVertical: 5,
      alignSelf: 'flex-start',
    },
    summaryBadgeReady: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    summaryBadgeText: {
      color: colors.textMuted,
      fontWeight: '900',
      fontSize: 10,
    },
    summaryBadgeTextReady: {
      color: colors.black,
    },
    summaryDescription: {
      lineHeight: 18,
    },
    aiHeadline: {
      color: colors.text,
      fontWeight: '900',
      lineHeight: 21,
    },
    summaryMetricRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    aiFocusCard: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 16,
      padding: 10,
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-start',
    },
    aiNoteCard: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 16,
      padding: 10,
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-start',
    },
    aiNoteText: {
      flex: 1,
      lineHeight: 18,
    },
    aiActionList: {
      gap: 8,
    },
    aiActionItem: {
      flexDirection: 'row',
      gap: 9,
      alignItems: 'flex-start',
    },
    aiActionBullet: {
      width: 22,
      height: 22,
      borderRadius: 999,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    aiActionBulletText: {
      color: colors.text,
      fontWeight: '900',
      fontSize: 10,
    },
    aiActionText: {
      flex: 1,
      lineHeight: 18,
    },
    eventList: {
      gap: 10,
      marginBottom: 8,
    },
    eventCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 22,
      padding: 13,
      flexDirection: 'row',
      gap: 11,
      alignItems: 'center',
    },
    eventIcon: {
      width: 42,
      height: 42,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    eventTextBox: {
      flex: 1,
      minWidth: 0,
    },
    eventTitle: {
      color: colors.text,
      fontWeight: '900',
    },
    eventDescription: {
      marginTop: 3,
      lineHeight: 18,
    },
    eventAmountBox: {
      maxWidth: 120,
      alignItems: 'flex-end',
    },
    eventAmount: {
      fontWeight: '900',
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 22,
      padding: 20,
      alignItems: 'center',
    },
    emptyDescription: {
      marginTop: 10,
      textAlign: 'center',
      lineHeight: 21,
    },
  });
}
