import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import {
  TradingAccount,
  TradingCashEvent,
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

type SummaryReadiness = {
  period: PeriodFilter;
  label: string;
  periodKey: string;
  isReady: boolean;
  deposit: number;
  withdrawal: number;
  net: number;
  eventCount: number;
  reason: string;
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

function buildSummaryReadiness(
  events: TradingCashEvent[],
  account: TradingAccount
): SummaryReadiness[] {
  return periodFilters.map((periodItem) => {
    const periodKey = getCompletedPeriodKey(periodItem.value);
    const eventsInPeriod = events.filter(
      (event) => getPeriodKey(event.date, periodItem.value) === periodKey
    );
    const deposit = eventsInPeriod
      .filter((event) => event.eventType === 'deposit')
      .reduce((total, event) => total + event.tradingAccountRealAmount, 0);
    const withdrawal = eventsInPeriod
      .filter((event) => event.eventType === 'withdrawal')
      .reduce((total, event) => total + event.tradingAccountRealAmount, 0);
    const net = deposit - withdrawal;
    const hasClosedPeriodData = eventsInPeriod.length > 0;

    return {
      period: periodItem.value,
      label: periodItem.label,
      periodKey,
      isReady: hasClosedPeriodData,
      deposit,
      withdrawal,
      net,
      eventCount: eventsInPeriod.length,
      reason: hasClosedPeriodData
        ? 'Closed-period data is available. AI summary will become deeper after Trading Plan and Trade History are added.'
        : 'Waiting for closed-period data. Daily summary uses yesterday only after the date changes.',
    };
  });
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

function formatPeriodName(period: PeriodFilter) {
  if (period === 'daily') return 'Daily';
  if (period === 'weekly') return 'Weekly';
  if (period === 'monthly') return 'Monthly';

  return 'Yearly';
}

export default function TradingAccountDetailScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ tradingAccountId?: string }>();

  const accounts = useFinanceStore((state) => state.accounts);
  const tradingAccounts = useFinanceStore((state) => state.tradingAccounts);
  const tradingCashEvents = useFinanceStore((state) => state.tradingCashEvents);
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

  const realBalance = tradingAccount
    ? getRealTradingAmount(tradingAccount, tradingAccount.balance)
    : 0;
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

  const summaryReadiness = useMemo(() => {
    if (!tradingAccount) {
      return [];
    }

    return buildSummaryReadiness(accountEvents, tradingAccount);
  }, [accountEvents, tradingAccount]);

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
            Trading Account Journal
          </AppText>

          <AppText variant="title" numberOfLines={1}>
            {tradingAccount.name}
          </AppText>
        </View>

        <Pressable
          onPress={() => router.push(`/edit-trading-account?tradingAccountId=${tradingAccount.id}` as any)}
          style={styles.editButton}
        >
          <Ionicons name="create-outline" size={18} color={colors.black} />
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroTextBox}>
            <AppText variant="caption" muted>
              Account Growth • {periodLabel}
            </AppText>

            <AppText variant="title" style={styles.heroValue}>
              {formatCurrency(realBalance, tradingAccount.currency)}
            </AppText>

            <AppText variant="caption" muted style={styles.heroSubValue}>
              Latest chart value {formatCurrency(latestGrowthValue, tradingAccount.currency)}
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

      <View style={styles.actionRow}>
        <Pressable
          onPress={() =>
            router.push(`/trading-cash-event?tradingAccountId=${tradingAccount.id}&eventType=deposit` as any)
          }
          style={styles.primaryAction}
        >
          <Ionicons name="arrow-down-outline" size={17} color={colors.black} />

          <AppText variant="body" style={styles.primaryActionText}>
            Deposit
          </AppText>
        </Pressable>

        <Pressable
          onPress={() =>
            router.push(`/trading-cash-event?tradingAccountId=${tradingAccount.id}&eventType=withdrawal` as any)
          }
          style={styles.secondaryAction}
        >
          <Ionicons name="arrow-up-outline" size={17} color={colors.text} />

          <AppText variant="body" style={styles.secondaryActionText}>
            Withdraw
          </AppText>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Report Period</AppText>
        <AppText variant="caption" muted>
          {periodReports.length} group{periodReports.length === 1 ? '' : 's'}
        </AppText>
      </View>

      <View style={styles.periodRow}>
        {periodFilters.map((item) => {
          const active = period === item.value;

          return (
            <Pressable
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
            </Pressable>
          );
        })}
      </View>

      <View style={styles.reportList}>
        {periodReports.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="bar-chart-outline" size={30} color={colors.textMuted} />

            <AppText variant="body" muted style={styles.emptyDescription}>
              No deposit or withdrawal report yet for this account.
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
        <AppText variant="subtitle">AI Summary Center</AppText>
        <AppText variant="caption" muted>
          readiness
        </AppText>
      </View>

      <View style={styles.summaryList}>
        {summaryReadiness.map((summary) => (
          <View key={`${summary.period}-${summary.periodKey}`} style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View>
                <AppText variant="caption" muted>
                  {summary.label} Summary
                </AppText>

                <AppText variant="body" style={styles.summaryTitle}>
                  {getPeriodLabel(summary.periodKey, summary.period)}
                </AppText>
              </View>

              <View style={[styles.summaryBadge, summary.isReady ? styles.summaryBadgeReady : null]}>
                <AppText
                  variant="caption"
                  style={[styles.summaryBadgeText, summary.isReady ? styles.summaryBadgeTextReady : null]}
                >
                  {summary.isReady ? 'Ready' : 'Waiting'}
                </AppText>
              </View>
            </View>

            <AppText variant="caption" muted style={styles.summaryDescription}>
              {summary.reason}
            </AppText>

            {summary.isReady ? (
              <View style={styles.summaryMetricRow}>
                <ReportMetric
                  label="Deposit"
                  value={formatCurrency(summary.deposit, tradingAccount.currency)}
                  color={colors.income}
                  colors={colors}
                />

                <ReportMetric
                  label="Withdrawal"
                  value={formatCurrency(summary.withdrawal, tradingAccount.currency)}
                  color={colors.expense}
                  colors={colors}
                />

                <ReportMetric
                  label="Net"
                  value={formatCurrency(summary.net, tradingAccount.currency)}
                  color={summary.net >= 0 ? colors.income : colors.expense}
                  colors={colors}
                />
              </View>
            ) : null}

            <View style={styles.aiNoteCard}>
              <Ionicons name="sparkles-outline" size={16} color={colors.textMuted} />

              <AppText variant="caption" muted style={styles.aiNoteText}>
                Next phase: Trading Plan + Trade History will let AI analyze discipline, mistakes, rule violations, and account development.
              </AppText>
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

        {segments.map((segment) => (
          <View
            key={segment.key}
            style={[
              styles.chartLineSegment,
              {
                width: segment.width,
                left: segment.left,
                top: segment.top,
                transform: [{ rotateZ: `${segment.angle}deg` }],
              },
            ]}
          />
        ))}

        {chartPoints.map((point) => {
          const selected = point.id === selectedPoint?.id;

          return (
            <Pressable
              key={point.id}
              onPress={() =>
                setSelectedPointId((currentPointId) =>
                  currentPointId === point.id ? null : point.id
                )
              }
              style={[
                styles.chartDotTouch,
                {
                  left: point.x - 16,
                  top: point.y - 16,
                },
              ]}
            >
              <View style={[styles.chartDot, selected ? styles.chartDotSelected : null]} />
            </Pressable>
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
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 28,
      padding: 16,
      marginBottom: 16,
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
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
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
      borderColor: colors.border,
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
      borderColor: colors.border,
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
      borderColor: colors.border,
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
      borderColor: colors.border,
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
      borderColor: colors.border,
      borderRadius: 24,
      padding: 15,
      gap: 12,
      marginBottom: 16,
    },
    infoLine: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 11,
      gap: 4,
    },
    infoLineValue: {
      color: colors.text,
      fontWeight: '900',
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 18,
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
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    secondaryActionText: {
      color: colors.text,
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
      borderColor: colors.border,
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
      borderColor: colors.border,
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
      borderColor: colors.border,
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
      borderColor: colors.border,
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
      borderColor: colors.border,
      borderRadius: 22,
      padding: 14,
      gap: 12,
    },
    summaryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
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
      borderColor: colors.border,
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
    summaryMetricRow: {
      flexDirection: 'row',
      gap: 8,
    },
    aiNoteCard: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
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
    eventList: {
      gap: 10,
      marginBottom: 8,
    },
    eventCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
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
      borderColor: colors.border,
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
      borderColor: colors.border,
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
