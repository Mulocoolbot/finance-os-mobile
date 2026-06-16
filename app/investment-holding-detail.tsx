import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useFinanceStore } from '../src/stores/useFinanceStore';
import {
  Currency,
  InvestmentAssetType,
  InvestmentHolding,
  InvestmentOrder,
  InvestmentPriceHistoryPoint,
} from '../src/types/finance';
import { formatCurrency } from '../src/utils/currency';
import { convertCurrencyAmount } from '../src/utils/currencyConversion';
import { formatCompactCurrency } from '../src/utils/formatCompactCurrency';

function getAssetIcon(type: InvestmentAssetType) {
  if (type === 'crypto') return 'logo-bitcoin';
  if (type === 'stock') return 'business-outline';
  if (type === 'fund') return 'pie-chart-outline';
  if (type === 'etf') return 'layers-outline';
  if (type === 'bond') return 'shield-checkmark-outline';

  return 'diamond-outline';
}

function getAssetTypeLabel(type: InvestmentAssetType) {
  if (type === 'crypto') return 'Crypto';
  if (type === 'stock') return 'Stock';
  if (type === 'fund') return 'Fund';
  if (type === 'etf') return 'ETF';
  if (type === 'bond') return 'Bond';

  return 'Other';
}

function getHoldingCost(holding: InvestmentHolding) {
  return holding.quantity * holding.averagePrice;
}

function getHoldingValue(holding: InvestmentHolding) {
  return holding.quantity * holding.currentPrice;
}

function formatQuantity(value: number) {
  return value.toLocaleString('id-ID', {
    maximumFractionDigits: 8,
  });
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return '0.00%';
  }

  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatDate(value?: string) {
  if (!value) return 'Unknown';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatDateTime(value?: string) {
  if (!value) return 'Unknown';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Invalid time';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getOrderSignedLabel(order: InvestmentOrder) {
  return order.orderType === 'buy' ? 'Buy' : 'Sell';
}

function getOrderDisplayAmount(order: InvestmentOrder) {
  return order.totalAmount;
}

type PriceChartPeriod = 'daily' | 'monthly' | 'yearly';

type PriceChartItem = InvestmentPriceHistoryPoint & {
  label: string;
};

const priceChartPeriods: { label: string; value: PriceChartPeriod }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
];

function getPriceChartGroupKey(point: InvestmentPriceHistoryPoint, period: PriceChartPeriod) {
  if (period === 'yearly') return point.yearKey;
  if (period === 'monthly') return point.monthKey;

  return point.dayKey;
}

function formatPriceChartLabel(point: InvestmentPriceHistoryPoint, period: PriceChartPeriod) {
  const date = new Date(point.recordedAt);

  if (Number.isNaN(date.getTime())) {
    return point.dayKey;
  }

  if (period === 'yearly') {
    return point.yearKey;
  }

  if (period === 'monthly') {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      year: '2-digit',
    }).format(date);
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function buildPriceChartItems(
  history: InvestmentPriceHistoryPoint[],
  holdingId: string,
  period: PriceChartPeriod
): PriceChartItem[] {
  const sortedHistory = history
    .filter((point) => point.holdingId === holdingId)
    .sort((firstPoint, secondPoint) => {
      return new Date(firstPoint.recordedAt).getTime() - new Date(secondPoint.recordedAt).getTime();
    });
  const groupedHistory = new Map<string, InvestmentPriceHistoryPoint>();

  sortedHistory.forEach((point) => {
    groupedHistory.set(getPriceChartGroupKey(point, period), point);
  });

  const limit = period === 'daily' ? 30 : period === 'monthly' ? 12 : 8;

  return Array.from(groupedHistory.values())
    .slice(-limit)
    .map((point) => ({
      ...point,
      label: formatPriceChartLabel(point, period),
    }));
}

export default function InvestmentHoldingDetailScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ holdingId?: string }>();
  const { width } = useWindowDimensions();
  const priceChartWidth = Math.min(width - 64, 360);
  const priceChartHeight = 132;
  const [priceChartPeriod, setPriceChartPeriod] = useState<PriceChartPeriod>('daily');
  const [selectedPriceChartPointId, setSelectedPriceChartPointId] = useState<string | null>(null);

  const accounts = useFinanceStore((state) => state.accounts);
  const investmentHoldings = useFinanceStore((state) => state.investmentHoldings);
  const investmentOrders = useFinanceStore((state) => state.investmentOrders);
  const investmentPriceHistory = useFinanceStore((state) => state.investmentPriceHistory);
  const deleteInvestmentHolding = useFinanceStore((state) => state.deleteInvestmentHolding);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);
  const exchangeRates = useFinanceStore((state) => state.exchangeRates);

  const holding = investmentHoldings.find((item) => item.id === params.holdingId);

  if (!holding) {
    return (
      <Screen>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
          </Pressable>

          <AppText variant="title">Holding Not Found</AppText>
        </View>

        <View style={styles.emptyCard}>
          <Ionicons name="alert-circle-outline" size={28} color={colors.textMuted} />

          <AppText variant="body" muted style={styles.emptyText}>
            This holding may have been deleted.
          </AppText>
        </View>
      </Screen>
    );
  }

  const account = accounts.find((item) => item.id === holding.accountId);
  const costBasis = getHoldingCost(holding);
  const currentValue = getHoldingValue(holding);
  const unrealizedPnL = currentValue - costBasis;
  const unrealizedPnLPercent = costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0;
  const pnlPositive = unrealizedPnL >= 0;
  const priceDifference = holding.currentPrice - holding.averagePrice;
  const priceDifferencePercent =
    holding.averagePrice > 0 ? (priceDifference / holding.averagePrice) * 100 : 0;
  const priceDifferencePositive = priceDifference >= 0;

  const convertedValue = convertCurrencyAmount(
    currentValue,
    holding.currency,
    defaultCurrency,
    exchangeRates
  );
  const convertedCost = convertCurrencyAmount(
    costBasis,
    holding.currency,
    defaultCurrency,
    exchangeRates
  );
  const convertedPnL = convertCurrencyAmount(
    unrealizedPnL,
    holding.currency,
    defaultCurrency,
    exchangeRates
  );

  const portfolioValue = investmentHoldings.reduce((total, item) => {
    return (
      total +
      convertCurrencyAmount(
        getHoldingValue(item),
        item.currency,
        defaultCurrency,
        exchangeRates
      )
    );
  }, 0);
  const allocationPercent =
    portfolioValue > 0 ? (convertedValue / portfolioValue) * 100 : 0;

  const rankedHoldings = [...investmentHoldings]
    .map((item) => ({
      id: item.id,
      value: convertCurrencyAmount(
        getHoldingValue(item),
        item.currency,
        defaultCurrency,
        exchangeRates
      ),
    }))
    .sort((firstItem, secondItem) => secondItem.value - firstItem.value);
  const portfolioRank =
    rankedHoldings.findIndex((item) => item.id === holding.id) + 1 || 1;

  const priceChartItems = useMemo(() => {
    const chartItems = buildPriceChartItems(
      investmentPriceHistory,
      holding.id,
      priceChartPeriod
    );

    if (chartItems.length > 0) {
      return chartItems;
    }

    return [
      {
        id: `fallback-price-${holding.id}`,
        holdingId: holding.id,
        symbol: holding.symbol,
        name: holding.name,
        assetType: holding.assetType,
        price: holding.currentPrice,
        currency: holding.currency,
        source: 'manual' as const,
        recordedAt: holding.updatedAt || holding.createdAt,
        dayKey: 'current',
        monthKey: 'current',
        yearKey: 'current',
        label: 'Current',
      },
    ];
  }, [investmentPriceHistory, holding, priceChartPeriod]);
  const priceChartMax = Math.max(...priceChartItems.map((item) => item.price), holding.currentPrice, 1);
  const priceChartMin = Math.min(...priceChartItems.map((item) => item.price), holding.currentPrice);
  const latestPriceHistoryPoint = priceChartItems[priceChartItems.length - 1];
  const firstPriceHistoryPoint = priceChartItems[0];
  const priceChartChange = latestPriceHistoryPoint.price - firstPriceHistoryPoint.price;
  const priceChartChangePercent =
    firstPriceHistoryPoint.price > 0
      ? (priceChartChange / firstPriceHistoryPoint.price) * 100
      : 0;
  const priceChartChangePositive = priceChartChange >= 0;
  const priceChartHigh = Math.max(...priceChartItems.map((item) => item.price));
  const priceChartLow = Math.min(...priceChartItems.map((item) => item.price));
  const priceChartHasEnoughPoints = priceChartItems.length >= 2;
  const priceChartPeriodLabel =
    priceChartPeriod === 'daily'
      ? 'last 30 daily points'
      : priceChartPeriod === 'monthly'
        ? 'last 12 monthly points'
        : 'last 8 yearly points';

  const holdingOrders = investmentOrders
    .filter((order) => order.holdingId === holding.id)
    .sort((firstOrder, secondOrder) => {
      return new Date(secondOrder.date).getTime() - new Date(firstOrder.date).getTime();
    });
  const recentOrders = holdingOrders.slice(0, 6);
  const buyOrders = holdingOrders.filter((order) => order.orderType === 'buy');
  const sellOrders = holdingOrders.filter((order) => order.orderType === 'sell');
  const totalBuyValue = buyOrders.reduce((total, order) => {
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
  const totalSellValue = sellOrders.reduce((total, order) => {
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
  const convertedRealizedPnL = holdingOrders.reduce((total, order) => {
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
  const realizedPnlPositive = convertedRealizedPnL >= 0;

  function handleDelete() {
    const holdingToDelete = holding;

    if (!holdingToDelete) {
      Alert.alert('Finance OS Mobile', 'Investment holding not found.');
      return;
    }

    Alert.alert(
      'Delete Holding',
      `Delete ${holdingToDelete.symbol} from your portfolio?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const result = deleteInvestmentHolding(holdingToDelete.id);
            Alert.alert('Finance OS Mobile', result.message);

            if (result.success) {
              router.back();
            }
          },
        },
      ]
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.headerText}>
          <AppText variant="caption" muted>
            Holding detail
          </AppText>

          <AppText variant="title">Investment</AppText>
        </View>

        <Pressable
          onPress={() => router.push(`/edit-investment-holding?holdingId=${holding.id}`)}
          style={styles.headerActionButton}
        >
          <Ionicons name="settings-outline" size={20} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.assetIcon}>
            <Ionicons
              name={getAssetIcon(holding.assetType) as any}
              size={28}
              color={colors.black}
            />
          </View>

          <View style={styles.heroTextBox}>
            <AppText variant="caption" style={styles.heroLabel}>
              {getAssetTypeLabel(holding.assetType)} • {holding.currency}
            </AppText>

            <AppText variant="title" style={styles.symbol} numberOfLines={1}>
              {holding.symbol}
            </AppText>

            <AppText variant="caption" style={styles.assetName} numberOfLines={1}>
              {holding.name}
            </AppText>
          </View>
        </View>

        <View style={styles.heroValueBox}>
          <AppText variant="caption" style={styles.heroLabel}>
            Current Value • {defaultCurrency} base
          </AppText>

          <AppText variant="title" style={styles.heroValue} numberOfLines={1}>
            {formatCompactCurrency(convertedValue, defaultCurrency)}
          </AppText>

          <AppText variant="caption" style={styles.assetName} numberOfLines={1}>
            {formatCurrency(convertedValue, defaultCurrency)}
          </AppText>
        </View>
      </View>

      <View style={styles.quickActionRow}>
        <Pressable
          onPress={() => router.push(`/add-investment-order?holdingId=${holding.id}&type=buy`)}
          style={styles.buyButton}
        >
          <Ionicons name="arrow-down-outline" size={18} color={colors.income} />

          <AppText variant="body" style={styles.buyButtonText}>
            Buy
          </AppText>
        </Pressable>

        <Pressable
          onPress={() => router.push(`/add-investment-order?holdingId=${holding.id}&type=sell`)}
          style={styles.sellButton}
        >
          <Ionicons name="arrow-up-outline" size={18} color={colors.expense} />

          <AppText variant="body" style={styles.sellButtonText}>
            Sell
          </AppText>
        </Pressable>

        <Pressable
          onPress={() => router.push(`/update-investment-holding-price?holdingId=${holding.id}`)}
          style={styles.updateButton}
        >
          <Ionicons name="create-outline" size={18} color={colors.black} />

          <AppText variant="body" style={styles.updateButtonText}>
            Price
          </AppText>
        </Pressable>
      </View>

      {holding.assetType === 'crypto' ? (
        <View style={styles.cryptoActionCard}>
          <View style={styles.cryptoActionHeader}>
            <View style={styles.cryptoActionIcon}>
              <Ionicons name="logo-bitcoin" size={20} color={colors.black} />
            </View>

            <View style={styles.cryptoActionTextBox}>
              <AppText variant="body" style={styles.cryptoActionTitle}>
                Crypto Transaction
              </AppText>

              <AppText variant="caption" muted style={styles.cryptoActionDescription}>
                Receive crypto income or pay directly from this holding.
              </AppText>
            </View>
          </View>

          <View style={styles.cryptoActionRow}>
            <Pressable
              onPress={() => router.push(`/add-crypto-income?holdingId=${holding.id}`)}
              style={styles.cryptoIncomeButton}
            >
              <Ionicons name="arrow-down-circle-outline" size={17} color={colors.income} />

              <AppText variant="caption" style={styles.cryptoActionButtonText}>
                Receive
              </AppText>
            </Pressable>

            <Pressable
              onPress={() => router.push(`/add-crypto-expense?holdingId=${holding.id}`)}
              style={styles.cryptoExpenseButton}
            >
              <Ionicons name="arrow-up-circle-outline" size={17} color={colors.expense} />

              <AppText variant="caption" style={styles.cryptoActionButtonText}>
                Pay
              </AppText>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.priceHistoryCard}>
        <View style={styles.priceHistoryHeader}>
          <View style={styles.priceHistoryTitleBox}>
            <View style={styles.priceHistoryTitleRow}>
              <Ionicons name="analytics-outline" size={18} color={colors.text} />

              <AppText variant="body" style={styles.priceHistoryTitle}>
                Price Movement
              </AppText>
            </View>

            <AppText variant="caption" muted style={styles.priceHistoryDescription}>
              {priceChartPeriodLabel}. Same-day updates keep the latest saved price.
            </AppText>
          </View>

          <View style={styles.priceHistoryBadge}>
            <AppText
              variant="caption"
              style={[
                styles.priceHistoryBadgeText,
                { color: priceChartChangePositive ? colors.income : colors.expense },
              ]}
            >
              {formatPercent(priceChartChangePercent)}
            </AppText>
          </View>
        </View>

        <View style={styles.pricePeriodRow}>
          {priceChartPeriods.map((period) => {
            const active = priceChartPeriod === period.value;

            return (
              <Pressable
                key={period.value}
                onPress={() => setPriceChartPeriod(period.value)}
                style={[styles.pricePeriodChip, active && styles.pricePeriodChipActive]}
              >
                <AppText
                  variant="caption"
                  style={[
                    styles.pricePeriodChipText,
                    active && styles.pricePeriodChipTextActive,
                  ]}
                >
                  {period.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {!priceChartHasEnoughPoints ? (
          <View style={styles.priceHistoryHintCard}>
            <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />

            <AppText variant="caption" muted style={styles.priceHistoryHintText}>
              This asset has only one saved price point. Update price, sync price, or add a buy/sell order on another day to create movement.
            </AppText>
          </View>
        ) : null}

        <View
          style={[
            styles.priceLineChartBody,
            {
              width: priceChartWidth,
              height: priceChartHeight,
            },
          ]}
        >
          {(() => {
            const chartMin = priceChartMin;
            const chartMax = priceChartMax;
            const chartRange = Math.max(chartMax - chartMin, 1);
            const chartHorizontalPadding = 22;
            const chartVerticalPadding = 18;
            const chartPlotWidth = Math.max(
              priceChartWidth - chartHorizontalPadding * 2,
              1
            );
            const chartPlotHeight = Math.max(
              priceChartHeight - chartVerticalPadding * 2,
              1
            );
            const points = priceChartItems.map((point, index) => {
              const x =
                chartHorizontalPadding +
                (priceChartItems.length === 1
                  ? 0
                  : (index / (priceChartItems.length - 1)) * chartPlotWidth);
              const normalized =
                priceChartItems.length === 1
                  ? 0
                  : Math.min(Math.max((point.price - chartMin) / chartRange, 0), 1);
              const y =
                chartVerticalPadding + (1 - normalized) * chartPlotHeight;

              return {
                ...point,
                x,
                y,
              };
            });
            const selectedPoint =
              points.find((point) => point.id === selectedPriceChartPointId) || null;
            const handleChartPress = (touchX: number) => {
              if (points.length === 0) {
                return;
              }

              const nearestPoint = points.reduce((closestPoint, currentPoint) => {
                return Math.abs(currentPoint.x - touchX) <
                  Math.abs(closestPoint.x - touchX)
                  ? currentPoint
                  : closestPoint;
              }, points[0]);

              setSelectedPriceChartPointId(nearestPoint.id);
            };
            const tooltipWidth = 144;
            const tooltipLeft = selectedPoint
              ? Math.min(
                  Math.max(selectedPoint.x - tooltipWidth / 2, 8),
                  priceChartWidth - tooltipWidth - 8
                )
              : 8;
            const tooltipTop = selectedPoint
              ? Math.min(
                  Math.max(selectedPoint.y > 62 ? selectedPoint.y - 64 : selectedPoint.y + 16, 8),
                  priceChartHeight - 62
                )
              : 8;

            return (
              <>
                <View
                  style={[
                    styles.priceChartGridLine,
                    {
                      left: chartHorizontalPadding,
                      width: chartPlotWidth,
                      top: chartVerticalPadding,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.priceChartGridLine,
                    {
                      left: chartHorizontalPadding,
                      width: chartPlotWidth,
                      top: chartVerticalPadding + chartPlotHeight / 2,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.priceChartGridLine,
                    {
                      left: chartHorizontalPadding,
                      width: chartPlotWidth,
                      top: chartVerticalPadding + chartPlotHeight,
                    },
                  ]}
                />



                {selectedPoint ? (
                  <View
                    style={[
                      styles.priceLineVerticalGuide,
                      {
                        left: selectedPoint.x,
                      },
                    ]}
                  />
                ) : null}

                {points.slice(0, -1).map((point, index) => {
                  const nextPoint = points[index + 1];
                  const deltaX = nextPoint.x - point.x;
                  const deltaY = nextPoint.y - point.y;
                  const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                  const angle = Math.atan2(deltaY, deltaX);

                  return (
                    <View
                      key={`${point.id}-${nextPoint.id}`}
                      style={[
                        styles.priceLineSegment,
                        {
                          left: point.x + deltaX / 2 - length / 2,
                          top: point.y + deltaY / 2,
                          width: length,
                          transform: [{ rotateZ: `${angle}rad` }],
                        },
                      ]}
                    />
                  );
                })}

                {points.map((point) => {
                  const active = point.id === selectedPriceChartPointId;

                  return (
                    <View
                      key={point.id}
                      pointerEvents="none"
                      style={[
                        styles.priceLinePointTouch,
                        {
                          left: point.x - 17,
                          top: point.y - 17,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.priceLinePointDot,
                          active && styles.priceLinePointDotActive,
                        ]}
                      />
                    </View>
                  );
                })}

                <Pressable
                  onPressIn={(event) => handleChartPress(event.nativeEvent.locationX)}
                  onLongPress={(event) => handleChartPress(event.nativeEvent.locationX)}
                  style={styles.priceChartTouchLayer}
                />

                {selectedPoint ? (
                  <Pressable
                    onPress={() => setSelectedPriceChartPointId(null)}
                    style={[
                      styles.priceChartTooltip,
                      {
                        left: tooltipLeft,
                        top: tooltipTop,
                        width: tooltipWidth,
                      },
                    ]}
                  >
                    <AppText
                      variant="caption"
                      style={styles.priceChartTooltipValue}
                      numberOfLines={1}
                    >
                      {formatCompactCurrency(selectedPoint.price, holding.currency)}
                    </AppText>

                    <AppText
                      variant="caption"
                      style={styles.priceChartTooltipDate}
                      numberOfLines={1}
                    >
                      {selectedPoint.label || formatDate(selectedPoint.recordedAt)}
                    </AppText>
                  </Pressable>
                ) : null}
              </>
            );
          })()}
        </View>

        <View style={styles.priceHistoryStatsGrid}>
          <View style={styles.priceHistoryStatItem}>
            <AppText variant="caption" muted>
              Start
            </AppText>

            <AppText variant="caption" style={styles.priceHistoryFooterValue} numberOfLines={1}>
              {formatCompactCurrency(firstPriceHistoryPoint.price, holding.currency)}
            </AppText>
          </View>

          <View style={styles.priceHistoryStatItem}>
            <AppText variant="caption" muted>
              Latest
            </AppText>

            <AppText variant="caption" style={styles.priceHistoryFooterValue} numberOfLines={1}>
              {formatCompactCurrency(latestPriceHistoryPoint.price, holding.currency)}
            </AppText>
          </View>

          <View style={styles.priceHistoryStatItem}>
            <AppText variant="caption" muted>
              High
            </AppText>

            <AppText variant="caption" style={styles.priceHistoryFooterValue} numberOfLines={1}>
              {formatCompactCurrency(priceChartHigh, holding.currency)}
            </AppText>
          </View>

          <View style={styles.priceHistoryStatItem}>
            <AppText variant="caption" muted>
              Low
            </AppText>

            <AppText variant="caption" style={styles.priceHistoryFooterValue} numberOfLines={1}>
              {formatCompactCurrency(priceChartLow, holding.currency)}
            </AppText>
          </View>
        </View>

        <View style={styles.priceHistoryMetaCard}>
          <View style={styles.priceHistoryMetaItem}>
            <AppText variant="caption" muted>
              Net Change
            </AppText>

            <AppText
              variant="caption"
              style={[
                styles.priceHistoryMetaValue,
                { color: priceChartChangePositive ? colors.income : colors.expense },
              ]}
              numberOfLines={1}
            >
              {priceChartChangePositive ? '+' : ''}
              {formatCompactCurrency(priceChartChange, holding.currency)}
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.pnlStack}>
        <View style={styles.pnlCard}>
          <View style={styles.pnlTextBox}>
            <AppText variant="caption" muted>
              Unrealized P/L
            </AppText>

            <AppText
              variant="title"
              style={[styles.pnlValue, { color: pnlPositive ? colors.income : colors.expense }]}
              numberOfLines={1}
            >
              {pnlPositive ? '+' : ''}
              {formatCurrency(convertedPnL, defaultCurrency)}
            </AppText>

            <AppText variant="caption" muted style={styles.pnlSubText} numberOfLines={1}>
              {formatCompactCurrency(unrealizedPnL, holding.currency)} original currency
            </AppText>
          </View>

          <View style={styles.pnlBadge}>
            <AppText
              variant="caption"
              style={[
                styles.pnlBadgeText,
                { color: pnlPositive ? colors.income : colors.expense },
              ]}
            >
              {formatPercent(unrealizedPnLPercent)}
            </AppText>
          </View>
        </View>

        <View style={styles.pnlCard}>
          <View style={styles.pnlTextBox}>
            <AppText variant="caption" muted>
              Realized P/L
            </AppText>

            <AppText
              variant="title"
              style={[
                styles.pnlValue,
                { color: realizedPnlPositive ? colors.income : colors.expense },
              ]}
              numberOfLines={1}
            >
              {realizedPnlPositive ? '+' : ''}
              {formatCurrency(convertedRealizedPnL, defaultCurrency)}
            </AppText>

            <AppText variant="caption" muted style={styles.pnlSubText}>
              From {sellOrders.length} sell order{sellOrders.length === 1 ? '' : 's'}
            </AppText>
          </View>

          <View style={styles.pnlBadge}>
            <AppText
              variant="caption"
              style={[
                styles.pnlBadgeText,
                { color: realizedPnlPositive ? colors.income : colors.expense },
              ]}
            >
              Closed
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.snapshotCard}>
        <View style={styles.snapshotHeader}>
          <View>
            <AppText variant="subtitle">Price Snapshot</AppText>

            <AppText variant="caption" muted style={styles.snapshotSubText}>
              Average price vs current price
            </AppText>
          </View>

          <View style={styles.snapshotBadge}>
            <AppText
              variant="caption"
              style={[
                styles.snapshotBadgeText,
                { color: priceDifferencePositive ? colors.income : colors.expense },
              ]}
            >
              {formatPercent(priceDifferencePercent)}
            </AppText>
          </View>
        </View>

        <View style={styles.priceCompareRow}>
          <View style={styles.priceCompareItem}>
            <AppText variant="caption" muted>
              Average
            </AppText>

            <AppText variant="body" style={styles.priceCompareValue} numberOfLines={1}>
              {formatCompactCurrency(holding.averagePrice, holding.currency)}
            </AppText>

            <AppText variant="caption" muted numberOfLines={1}>
              {formatCurrency(holding.averagePrice, holding.currency)}
            </AppText>
          </View>

          <View style={styles.priceCompareArrow}>
            <Ionicons name="arrow-forward-outline" size={18} color={colors.textMuted} />
          </View>

          <View style={styles.priceCompareItem}>
            <AppText variant="caption" muted>
              Current
            </AppText>

            <AppText variant="body" style={styles.priceCompareValue} numberOfLines={1}>
              {formatCompactCurrency(holding.currentPrice, holding.currency)}
            </AppText>

            <AppText variant="caption" muted numberOfLines={1}>
              {formatCurrency(holding.currentPrice, holding.currency)}
            </AppText>
          </View>
        </View>

        <View style={styles.deltaCard}>
          <AppText variant="caption" muted>
            Difference per unit
          </AppText>

          <AppText
            variant="body"
            style={[
              styles.deltaValue,
              { color: priceDifferencePositive ? colors.income : colors.expense },
            ]}
            numberOfLines={1}
          >
            {priceDifferencePositive ? '+' : ''}
            {formatCurrency(priceDifference, holding.currency)}
          </AppText>
        </View>
      </View>

      <View style={styles.allocationCard}>
        <View style={styles.allocationHeader}>
          <View>
            <AppText variant="subtitle">Allocation</AppText>

            <AppText variant="caption" muted style={styles.snapshotSubText}>
              Position size inside portfolio
            </AppText>
          </View>

          <View style={styles.rankBadge}>
            <AppText variant="caption" style={styles.rankBadgeText}>
              #{portfolioRank}
            </AppText>
          </View>
        </View>

        <View style={styles.allocationTrack}>
          <View
            style={[
              styles.allocationFill,
              { width: `${Math.min(Math.max(allocationPercent, 0), 100)}%` },
            ]}
          />
        </View>

        <View style={styles.allocationFooter}>
          <AppText variant="caption" muted>
            Allocation
          </AppText>

          <AppText variant="body" style={styles.allocationPercent}>
            {allocationPercent.toFixed(2)}%
          </AppText>
        </View>
      </View>

      <View style={styles.grid}>
        <DetailMetric
          colors={colors}
          label="Quantity"
          value={formatQuantity(holding.quantity)}
        />
        <DetailMetric
          colors={colors}
          label="Cost Basis"
          value={formatCompactCurrency(convertedCost, defaultCurrency)}
          subValue={formatCurrency(convertedCost, defaultCurrency)}
        />
        <DetailMetric
          colors={colors}
          label="Market Value"
          value={formatCompactCurrency(convertedValue, defaultCurrency)}
          subValue={formatCurrency(convertedValue, defaultCurrency)}
        />
        <DetailMetric
          colors={colors}
          label="Original Value"
          value={formatCompactCurrency(currentValue, holding.currency)}
          subValue={formatCurrency(currentValue, holding.currency)}
        />
      </View>

      <View style={styles.orderStatsCard}>
        <View style={styles.orderStatsHeader}>
          <View>
            <AppText variant="subtitle">Order Stats</AppText>

            <AppText variant="caption" muted style={styles.snapshotSubText}>
              Buy and sell activity for this asset
            </AppText>
          </View>

          <AppText variant="caption" muted>
            {holdingOrders.length} order{holdingOrders.length === 1 ? '' : 's'}
          </AppText>
        </View>

        <View style={styles.orderStatsGrid}>
          <View style={styles.orderStatItem}>
            <AppText variant="caption" muted>
              Buy Orders
            </AppText>

            <AppText variant="body" style={[styles.orderStatValue, { color: colors.income }]}>
              {buyOrders.length}
            </AppText>

            <AppText variant="caption" muted numberOfLines={1}>
              {formatCompactCurrency(totalBuyValue, defaultCurrency)}
            </AppText>
          </View>

          <View style={styles.orderStatItem}>
            <AppText variant="caption" muted>
              Sell Orders
            </AppText>

            <AppText variant="body" style={[styles.orderStatValue, { color: colors.expense }]}>
              {sellOrders.length}
            </AppText>

            <AppText variant="caption" muted numberOfLines={1}>
              {formatCompactCurrency(totalSellValue, defaultCurrency)}
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.infoCard}>
        <InfoRow colors={colors} label="Account" value={account?.name || 'Investment account'} />
        <InfoRow colors={colors} label="Original Currency" value={holding.currency} />
        <InfoRow colors={colors} label="Created" value={formatDate(holding.createdAt)} />
        <InfoRow colors={colors} label="Last Updated" value={formatDateTime(holding.updatedAt)} />
      </View>

      {holding.note ? (
        <View style={styles.noteCard}>
          <AppText variant="caption" muted>
            Note
          </AppText>

          <AppText variant="body" style={styles.noteText}>
            {holding.note}
          </AppText>
        </View>
      ) : null}

      <View style={styles.ordersCard}>
        <View style={styles.ordersHeader}>
          <View>
            <AppText variant="subtitle">Recent Orders</AppText>

            <AppText variant="caption" muted style={styles.snapshotSubText}>
              Latest activity for {holding.symbol}
            </AppText>
          </View>

          <Pressable onPress={() => router.push('/investment-orders')} style={styles.ordersLink}>
            <AppText variant="caption" style={styles.ordersLinkText}>
              View All
            </AppText>
          </Pressable>
        </View>

        {recentOrders.length === 0 ? (
          <AppText variant="caption" muted style={styles.emptyOrdersText}>
            No buy/sell orders recorded yet.
          </AppText>
        ) : (
          <View style={styles.ordersList}>
            {recentOrders.map((order) => {
              const orderIsBuy = order.orderType === 'buy';
              const orderPnlPositive = order.realizedPnL >= 0;

              return (
                <View key={order.id} style={styles.orderRow}>
                  <View style={styles.orderIcon}>
                    <Ionicons
                      name={orderIsBuy ? 'arrow-down-outline' : 'arrow-up-outline'}
                      size={16}
                      color={orderIsBuy ? colors.income : colors.expense}
                    />
                  </View>

                  <View style={styles.orderTextBox}>
                    <AppText variant="caption" style={styles.orderTitle}>
                      {getOrderSignedLabel(order)} {order.symbol}
                    </AppText>

                    <AppText variant="caption" muted numberOfLines={1}>
                      {formatDate(order.date)} • {formatQuantity(order.quantity)} units
                    </AppText>

                    <AppText variant="caption" muted numberOfLines={1}>
                      Price {formatCompactCurrency(order.price, order.currency)}
                    </AppText>
                  </View>

                  <View style={styles.orderValueBox}>
                    <AppText variant="caption" style={styles.orderValue} numberOfLines={1}>
                      {formatCompactCurrency(getOrderDisplayAmount(order), order.currency)}
                    </AppText>

                    {!orderIsBuy ? (
                      <AppText
                        variant="caption"
                        style={[
                          styles.orderPnl,
                          { color: orderPnlPositive ? colors.income : colors.expense },
                        ]}
                        numberOfLines={1}
                      >
                        {orderPnlPositive ? '+' : ''}
                        {formatCompactCurrency(order.realizedPnL, order.currency)}
                      </AppText>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.dangerCard}>
        <View style={styles.dangerTextBox}>
          <AppText variant="body" style={styles.dangerTitle}>
            Danger Zone
          </AppText>

          <AppText variant="caption" muted style={styles.dangerDescription}>
            Manual holdings without order history can be deleted safely. Holdings with buy/sell history are protected.
          </AppText>
        </View>

        <Pressable onPress={handleDelete} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={18} color={colors.expense} />

          <AppText variant="body" style={styles.deleteButtonText}>
            Delete
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

function DetailMetric({
  colors,
  label,
  value,
  subValue,
}: {
  colors: ThemeColors;
  label: string;
  value: string;
  subValue?: string;
}) {
  const styles = createStyles(colors);

  return (
    <View style={styles.metricCard}>
      <AppText variant="caption" muted>
        {label}
      </AppText>

      <AppText variant="body" style={styles.metricValue} numberOfLines={1}>
        {value}
      </AppText>

      {subValue ? (
        <AppText variant="caption" muted style={styles.metricSubValue} numberOfLines={1}>
          {subValue}
        </AppText>
      ) : null}
    </View>
  );
}

function InfoRow({
  colors,
  label,
  value,
}: {
  colors: ThemeColors;
  label: string;
  value: string;
}) {
  const styles = createStyles(colors);

  return (
    <View style={styles.infoRow}>
      <AppText variant="caption" muted>
        {label}
      </AppText>

      <AppText variant="caption" style={styles.infoValue} numberOfLines={1}>
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
    headerText: {
      flex: 1,
      minWidth: 0,
    },
    headerActionButton: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 26,
      padding: 22,
      alignItems: 'center',
    },
    emptyText: {
      marginTop: 10,
      textAlign: 'center',
      lineHeight: 21,
    },
    heroCard: {
      backgroundColor: colors.primary,
      borderRadius: 30,
      padding: 20,
      gap: 20,
    },
    heroTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    assetIcon: {
      width: 58,
      height: 58,
      borderRadius: 21,
      backgroundColor: 'rgba(0,0,0,0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroTextBox: {
      flex: 1,
      minWidth: 0,
    },
    heroLabel: {
      color: 'rgba(0,0,0,0.62)',
      fontWeight: '900',
    },
    symbol: {
      marginTop: 4,
      color: colors.black,
    },
    assetName: {
      marginTop: 3,
      color: 'rgba(0,0,0,0.62)',
      fontWeight: '800',
    },
    heroValueBox: {
      backgroundColor: 'rgba(0,0,0,0.08)',
      borderRadius: 22,
      padding: 15,
    },
    heroValue: {
      marginTop: 6,
      color: colors.black,
    },
    quickActionRow: {
      marginTop: 16,
      flexDirection: 'row',
      gap: 10,
    },
    buyButton: {
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
      paddingHorizontal: 10,
    },
    buyButtonText: {
      color: colors.income,
      fontWeight: '900',
    },
    sellButton: {
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
      paddingHorizontal: 10,
    },
    sellButtonText: {
      color: colors.expense,
      fontWeight: '900',
    },
    updateButton: {
      flex: 1,
      minHeight: 52,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 10,
    },
    updateButtonText: {
      color: colors.black,
      fontWeight: '900',
    },
    cryptoActionCard: {
      marginTop: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 15,
      gap: 14,
    },
    cryptoActionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    cryptoActionIcon: {
      width: 42,
      height: 42,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cryptoActionTextBox: {
      flex: 1,
      minWidth: 0,
    },
    cryptoActionTitle: {
      color: colors.text,
      fontWeight: '900',
    },
    cryptoActionDescription: {
      marginTop: 4,
      lineHeight: 18,
    },
    cryptoActionRow: {
      flexDirection: 'row',
      gap: 10,
    },
    cryptoIncomeButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: 10,
    },
    cryptoExpenseButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: 10,
    },
    cryptoActionButtonText: {
      color: colors.text,
      fontWeight: '900',
    },
    priceHistoryCard: {
      marginTop: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 16,
      gap: 14,
    },
    priceHistoryHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    priceHistoryTitleBox: {
      flex: 1,
      minWidth: 0,
    },
    priceHistoryTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    priceHistoryTitle: {
      color: colors.text,
      fontWeight: '900',
    },
    priceHistoryDescription: {
      marginTop: 5,
      lineHeight: 18,
    },
    priceHistoryBadge: {
      borderRadius: 999,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    priceHistoryBadgeText: {
      fontWeight: '900',
    },
    pricePeriodRow: {
      flexDirection: 'row',
      gap: 8,
    },
    priceHistoryHintCard: {
      borderRadius: 17,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 11,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 9,
    },
    priceHistoryHintText: {
      flex: 1,
      lineHeight: 18,
    },
    pricePeriodChip: {
      flex: 1,
      minHeight: 38,
      borderRadius: 14,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pricePeriodChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    pricePeriodChipText: {
      color: colors.text,
      fontWeight: '900',
    },
    pricePeriodChipTextActive: {
      color: colors.black,
    },
    priceLineChartBody: {
      alignSelf: 'center',
      borderRadius: 20,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      position: 'relative',
    },
    priceLineSegment: {
      position: 'absolute',
      height: 3,
      borderRadius: 999,
      backgroundColor: colors.investment,
    },
    priceChartTouchLayer: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      zIndex: 5,
    },
    priceLinePointTouch: {
      position: 'absolute',
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 4,
    },
    priceLinePointDot: {
      width: 10,
      height: 10,
      borderRadius: 999,
      backgroundColor: colors.primary,
      borderWidth: 2,
      borderColor: colors.surface,
    },
    priceLinePointDotActive: {
      width: 17,
      height: 17,
      borderWidth: 4,
      borderColor: colors.surface,
      shadowColor: colors.black,
      shadowOpacity: 0.16,
      shadowRadius: 8,
      elevation: 4,
    },
    priceLineVerticalGuide: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: 1,
      backgroundColor: colors.textMuted,
      opacity: 0.45,
      zIndex: 2,
    },
    priceChartTooltip: {
      position: 'absolute',
      minHeight: 54,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 9,
      justifyContent: 'center',
      zIndex: 6,
      shadowColor: colors.black,
      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 5,
    },
    priceChartTooltipValue: {
      color: colors.text,
      fontWeight: '900',
    },
    priceChartTooltipDate: {
      marginTop: 3,
      color: colors.textMuted,
      fontWeight: '800',
    },
    priceChartGridLine: {
      position: 'absolute',
      height: 1,
      borderRadius: 999,
      backgroundColor: colors.border,
      opacity: 0.55,
    },
    priceHistoryStatsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 9,
    },
    priceHistoryStatItem: {
      width: '48%',
      minWidth: 0,
      borderRadius: 15,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
    },
    priceHistoryFooterValue: {
      marginTop: 5,
      color: colors.text,
      fontWeight: '900',
    },
    priceHistoryMetaCard: {
      borderRadius: 17,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 11,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    priceHistoryMetaItem: {
      flex: 1,
      minWidth: 0,
    },
    priceHistoryMetaValue: {
      marginTop: 5,
      color: colors.text,
      fontWeight: '900',
    },
    pnlStack: {
      marginTop: 18,
      gap: 10,
    },
    pnlCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    pnlTextBox: {
      flex: 1,
      minWidth: 0,
    },
    pnlValue: {
      marginTop: 6,
      fontWeight: '900',
    },
    pnlSubText: {
      marginTop: 5,
    },
    pnlBadge: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    pnlBadgeText: {
      fontWeight: '900',
    },
    snapshotCard: {
      marginTop: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 16,
      gap: 14,
    },
    snapshotHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    snapshotSubText: {
      marginTop: 4,
      lineHeight: 18,
    },
    snapshotBadge: {
      borderRadius: 999,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    snapshotBadgeText: {
      fontWeight: '900',
    },
    priceCompareRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 10,
    },
    priceCompareItem: {
      flex: 1,
      minWidth: 0,
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
    },
    priceCompareValue: {
      marginTop: 6,
      marginBottom: 4,
      color: colors.text,
      fontWeight: '900',
    },
    priceCompareArrow: {
      width: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deltaCard: {
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
    },
    deltaValue: {
      marginTop: 6,
      fontWeight: '900',
    },
    allocationCard: {
      marginTop: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 16,
      gap: 14,
    },
    allocationHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    rankBadge: {
      borderRadius: 999,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    rankBadgeText: {
      color: colors.text,
      fontWeight: '900',
    },
    allocationTrack: {
      height: 10,
      borderRadius: 999,
      backgroundColor: colors.surfaceSoft,
      overflow: 'hidden',
    },
    allocationFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: colors.investment,
    },
    allocationFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    allocationPercent: {
      color: colors.investment,
      fontWeight: '900',
    },
    grid: {
      marginTop: 18,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    metricCard: {
      width: '48%',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 14,
      minHeight: 94,
    },
    metricValue: {
      marginTop: 7,
      fontWeight: '900',
    },
    metricSubValue: {
      marginTop: 5,
    },
    orderStatsCard: {
      marginTop: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 16,
      gap: 14,
    },
    orderStatsHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    orderStatsGrid: {
      flexDirection: 'row',
      gap: 10,
    },
    orderStatItem: {
      flex: 1,
      minWidth: 0,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 12,
    },
    orderStatValue: {
      marginTop: 6,
      marginBottom: 4,
      fontWeight: '900',
    },
    infoCard: {
      marginTop: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 15,
      gap: 12,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    infoValue: {
      color: colors.text,
      fontWeight: '900',
      maxWidth: '60%',
      textAlign: 'right',
    },
    noteCard: {
      marginTop: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 15,
    },
    noteText: {
      marginTop: 8,
      lineHeight: 21,
    },
    ordersCard: {
      marginTop: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 15,
    },
    ordersHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 12,
    },
    ordersLink: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 11,
      paddingVertical: 7,
    },
    ordersLinkText: {
      color: colors.text,
      fontWeight: '900',
    },
    emptyOrdersText: {
      lineHeight: 18,
    },
    ordersList: {
      gap: 10,
    },
    orderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 16,
      padding: 11,
    },
    orderIcon: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    orderTextBox: {
      flex: 1,
      minWidth: 0,
    },
    orderTitle: {
      color: colors.text,
      fontWeight: '900',
      marginBottom: 3,
    },
    orderValueBox: {
      alignItems: 'flex-end',
      maxWidth: 105,
    },
    orderValue: {
      color: colors.text,
      fontWeight: '900',
    },
    orderPnl: {
      marginTop: 3,
      fontWeight: '900',
    },
    dangerCard: {
      marginTop: 18,
      marginBottom: 4,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 15,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    dangerTextBox: {
      flex: 1,
      minWidth: 0,
    },
    dangerTitle: {
      color: colors.text,
      fontWeight: '900',
    },
    dangerDescription: {
      marginTop: 4,
      lineHeight: 18,
    },
    deleteButton: {
      minHeight: 48,
      borderRadius: 17,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 7,
      paddingHorizontal: 13,
    },
    deleteButtonText: {
      color: colors.expense,
      fontWeight: '900',
    },
  });
}
