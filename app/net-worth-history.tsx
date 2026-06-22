import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useFinanceStore } from '../src/stores/useFinanceStore';
import { Currency, NetWorthSnapshot } from '../src/types/finance';
import { formatCurrency } from '../src/utils/currency';
import { convertCurrencyAmount } from '../src/utils/currencyConversion';
import { formatCompactCurrency } from '../src/utils/formatCompactCurrency';

function formatSnapshotDate(value: string) {
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

function getSortedSnapshots(items: NetWorthSnapshot[]) {
  return [...items].sort((firstItem, secondItem) => {
    return new Date(firstItem.date).getTime() - new Date(secondItem.date).getTime();
  });
}

function convertNetWorthSnapshotToCurrency(
  snapshot: NetWorthSnapshot,
  targetCurrency: Currency,
  exchangeRates: Record<Currency, number>
): NetWorthSnapshot {
  if (snapshot.currency === targetCurrency) {
    return snapshot;
  }

  return {
    ...snapshot,
    currency: targetCurrency,
    netWorth: convertCurrencyAmount(
      snapshot.netWorth,
      snapshot.currency,
      targetCurrency,
      exchangeRates
    ),
    cashValue: convertCurrencyAmount(
      snapshot.cashValue,
      snapshot.currency,
      targetCurrency,
      exchangeRates
    ),
    savingValue: convertCurrencyAmount(
      snapshot.savingValue,
      snapshot.currency,
      targetCurrency,
      exchangeRates
    ),
    investmentValue: convertCurrencyAmount(
      snapshot.investmentValue,
      snapshot.currency,
      targetCurrency,
      exchangeRates
    ),
    liabilityValue:
      typeof snapshot.liabilityValue === 'number'
        ? convertCurrencyAmount(
            snapshot.liabilityValue,
            snapshot.currency,
            targetCurrency,
            exchangeRates
          )
        : snapshot.liabilityValue,
  };
}



function getLatestSnapshot(items: NetWorthSnapshot[]) {
  const sortedItems = getSortedSnapshots(items);
  return sortedItems[sortedItems.length - 1];
}

function getPreviousSnapshot(items: NetWorthSnapshot[]) {
  const sortedItems = getSortedSnapshots(items);
  return sortedItems[sortedItems.length - 2];
}

function getChangeValue(items: NetWorthSnapshot[]) {
  const latest = getLatestSnapshot(items);
  const previous = getPreviousSnapshot(items);

  if (!latest || !previous) {
    return 0;
  }

  return latest.netWorth - previous.netWorth;
}

function getMaxSnapshotValue(items: NetWorthSnapshot[]) {
  return Math.max(...items.map((item) => item.netWorth), 1);
}

export default function NetWorthHistoryScreen() {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const styles = createStyles(colors);
  const lineChartWidth = Math.min(width - 64, 360);
  const lineChartHeight = 170;
  const [selectedNetWorthPointId, setSelectedNetWorthPointId] = useState<string | null>(null);
  const lineChartReveal = useRef(new Animated.Value(0)).current;

  const netWorthSnapshots = useFinanceStore((state) => state.netWorthSnapshots);
  const deleteNetWorthSnapshot = useFinanceStore((state) => state.deleteNetWorthSnapshot);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);
  const exchangeRates = useFinanceStore((state) => state.exchangeRates);

  const sortedSnapshots = getSortedSnapshots(netWorthSnapshots).map((snapshot) =>
    convertNetWorthSnapshotToCurrency(snapshot, defaultCurrency, exchangeRates)
  );
  const latestSnapshot = getLatestSnapshot(sortedSnapshots);
  const changeValue = getChangeValue(sortedSnapshots);
  const changePositive = changeValue >= 0;
  const maxValue = getMaxSnapshotValue(sortedSnapshots);
  const lineChartAnimationKey = sortedSnapshots
    .slice(-12)
    .map((item) => `${item.id}:${item.date}:${Math.round(item.netWorth * 100)}`)
    .join('|');

  useEffect(() => {
    lineChartReveal.stopAnimation();
    lineChartReveal.setValue(0);

    Animated.timing(lineChartReveal, {
      toValue: 1,
      duration: Math.min(1600, 560 + sortedSnapshots.slice(-12).length * 90),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [lineChartAnimationKey, lineChartReveal, sortedSnapshots.length]);

  function handleDelete(snapshot: NetWorthSnapshot) {
    Alert.alert(
      'Delete Snapshot',
      `Delete snapshot from ${formatSnapshotDate(snapshot.date)}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const result = deleteNetWorthSnapshot(snapshot.id);
            Alert.alert('Finance OS Mobile', result.message);
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
            Long-term wealth tracking
          </AppText>

          <AppText variant="title">Net Worth History</AppText>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons name="analytics-outline" size={26} color={colors.black} />
        </View>

        <View style={styles.heroTextBox}>
          <AppText variant="caption" style={styles.heroLabel}>
            Latest Net Worth
          </AppText>

          <AppText variant="title" style={styles.heroValue} numberOfLines={1}>
            {latestSnapshot
              ? formatCompactCurrency(latestSnapshot.netWorth, latestSnapshot.currency)
              : formatCompactCurrency(0, defaultCurrency)}
          </AppText>

          <AppText variant="caption" style={styles.heroSubValue} numberOfLines={1}>
            {latestSnapshot
              ? formatCurrency(latestSnapshot.netWorth, latestSnapshot.currency)
              : 'No snapshot saved yet'}
          </AppText>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.statBox}>
          <AppText variant="caption" muted>
            Snapshots
          </AppText>

          <AppText variant="title" style={styles.statValue}>
            {netWorthSnapshots.length}
          </AppText>
        </View>

        <View style={styles.statBox}>
          <AppText variant="caption" muted>
            Change
          </AppText>

          <AppText
            variant="title"
            style={[styles.statValue, { color: changePositive ? colors.income : colors.expense }]}
            numberOfLines={1}
          >
            {changePositive ? '+' : ''}
            {formatCompactCurrency(changeValue, latestSnapshot?.currency || defaultCurrency)}
          </AppText>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">History Chart</AppText>

        <AppText variant="caption" muted>
          Auto daily history
        </AppText>
      </View>

      {sortedSnapshots.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="analytics-outline" size={28} color={colors.textMuted} />

          <AppText variant="subtitle" style={styles.emptyTitle}>
            No snapshots yet
          </AppText>

          <AppText variant="body" muted style={styles.emptyText}>
            Open Dashboard and Finance OS will start saving daily net worth history automatically.
          </AppText>
        </View>
      ) : (
        <View style={styles.chartCard}>
          <View
            style={[
              styles.lineChartBody,
              {
                width: lineChartWidth,
                height: lineChartHeight,
              },
            ]}
          >
            {(() => {
              const chartItems = sortedSnapshots.slice(-12);
              const minValue = Math.min(...chartItems.map((item) => item.netWorth));
              const localMaxValue = Math.max(...chartItems.map((item) => item.netWorth));
              const chartRange = Math.max(localMaxValue - minValue, 1);
              const chartHorizontalPadding = 22;
              const chartVerticalPadding = 18;
              const chartPlotWidth = Math.max(
                lineChartWidth - chartHorizontalPadding * 2,
                1
              );
              const chartPlotHeight = Math.max(
                lineChartHeight - chartVerticalPadding * 2,
                1
              );
              const points = chartItems.map((snapshot, index) => {
                const x =
                  chartHorizontalPadding +
                  (chartItems.length === 1
                    ? 0
                    : (index / (chartItems.length - 1)) * chartPlotWidth);
                const normalized =
                  chartItems.length === 1
                    ? 0
                    : Math.min(Math.max((snapshot.netWorth - minValue) / chartRange, 0), 1);
                const y =
                  chartVerticalPadding + (1 - normalized) * chartPlotHeight;

                return {
                  ...snapshot,
                  x,
                  y,
                };
              });
              const selectedPoint =
                points.find((point) => point.id === selectedNetWorthPointId) || null;
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

                setSelectedNetWorthPointId(nearestPoint.id);
              };
              const tooltipWidth = 146;
              const tooltipLeft = selectedPoint
                ? Math.min(
                    Math.max(selectedPoint.x - tooltipWidth / 2, 8),
                    lineChartWidth - tooltipWidth - 8
                  )
                : 8;
              const tooltipTop = selectedPoint
                ? Math.min(Math.max(selectedPoint.y > 76 ? selectedPoint.y - 66 : selectedPoint.y + 16, 8), lineChartHeight - 64)
                : 8;

              return (
                <>
                  <View
                    style={[
                      styles.lineGuide,
                      {
                        left: chartHorizontalPadding,
                        width: chartPlotWidth,
                        top: chartVerticalPadding,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.lineGuide,
                      {
                        left: chartHorizontalPadding,
                        width: chartPlotWidth,
                        top: chartVerticalPadding + chartPlotHeight / 2,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.lineGuide,
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
                        styles.lineVerticalGuide,
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
                    const segmentCount = Math.max(points.length - 1, 1);
                    const segmentStart = index / segmentCount;
                    const segmentEnd = (index + 1) / segmentCount;
                    const segmentProgress = lineChartReveal.interpolate({
                      inputRange: [segmentStart, segmentEnd],
                      outputRange: [0, 1],
                      extrapolate: 'clamp',
                    });
                    const animatedWidth = segmentProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, length],
                    });
                    const animatedLeft = segmentProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [point.x, point.x + deltaX / 2 - length / 2],
                    });
                    const animatedTop = segmentProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [point.y, point.y + deltaY / 2],
                    });

                    return (
                      <Animated.View
                        key={`${point.id}-${nextPoint.id}`}
                        style={[
                          styles.lineSegment,
                          {
                            left: animatedLeft,
                            top: animatedTop,
                            width: animatedWidth,
                            opacity: segmentProgress,
                            transform: [{ rotateZ: `${angle}rad` }],
                          },
                        ]}
                      />
                    );
                  })}

                  {points.map((point, index) => {
                    const active = point.id === selectedNetWorthPointId;
                    const pointCount = Math.max(points.length - 1, 1);
                    const pointMoment = points.length === 1 ? 1 : index / pointCount;
                    const pointStart = index === 0 ? 0 : Math.max(pointMoment - 0.08, 0);
                    const pointEnd = index === 0 ? 0.08 : pointMoment;
                    const pointProgress = lineChartReveal.interpolate({
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
                        pointerEvents="none"
                        style={[
                          styles.linePointTouch,
                          {
                            left: point.x - 17,
                            top: point.y - 17,
                            opacity: pointProgress,
                            transform: [{ scale: pointScale }],
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.linePointDot,
                            active && styles.linePointDotActive,
                          ]}
                        />
                      </Animated.View>
                    );
                  })}

                  <Pressable
                    onPressIn={(event) => handleChartPress(event.nativeEvent.locationX)}
                    onLongPress={(event) => handleChartPress(event.nativeEvent.locationX)}
                    style={styles.lineChartTouchLayer}
                  />

                  {selectedPoint ? (
                    <Pressable
                      onPress={() => setSelectedNetWorthPointId(null)}
                      style={[
                        styles.lineChartTooltip,
                        {
                          left: tooltipLeft,
                          top: tooltipTop,
                          width: tooltipWidth,
                        },
                      ]}
                    >
                      <AppText
                        variant="caption"
                        style={styles.lineChartTooltipValue}
                        numberOfLines={1}
                      >
                        {formatCompactCurrency(
                          selectedPoint.netWorth,
                          selectedPoint.currency || defaultCurrency
                        )}
                      </AppText>

                      <AppText
                        variant="caption"
                        style={styles.lineChartTooltipDate}
                        numberOfLines={1}
                      >
                        {formatSnapshotDate(selectedPoint.date)}
                      </AppText>
                    </Pressable>
                  ) : null}
                </>
              );
            })()}
          </View>

          <View style={styles.lineChartLabels}>
            {sortedSnapshots.slice(-12).map((snapshot) => (
              <AppText key={snapshot.id} variant="caption" muted style={styles.chartLabel}>
                {new Intl.DateTimeFormat('en-US', { month: 'short' }).format(
                  new Date(snapshot.date)
                )}
              </AppText>
            ))}
          </View>

          <View style={styles.chartFooter}>
            <AppText variant="caption" muted>
              Current scale
            </AppText>

            <AppText variant="caption" style={styles.chartFooterValue}>
              {formatCompactCurrency(maxValue, latestSnapshot?.currency || defaultCurrency)}
            </AppText>
          </View>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Snapshots</AppText>

        <AppText variant="caption" muted>
          {netWorthSnapshots.length} record
        </AppText>
      </View>

      <View style={styles.snapshotList}>
        {[...netWorthSnapshots].map((snapshot) => (
          <View key={snapshot.id} style={styles.snapshotCard}>
            <View style={styles.snapshotTopRow}>
              <View style={styles.snapshotIcon}>
                <Ionicons name="wallet-outline" size={20} color={colors.saving} />
              </View>

              <View style={styles.snapshotTextBox}>
                <AppText variant="body" style={styles.snapshotValue} numberOfLines={1}>
                  {formatCurrency(snapshot.netWorth, snapshot.currency)}
                </AppText>

                <AppText variant="caption" muted>
                  {formatSnapshotDate(snapshot.date)}
                </AppText>
              </View>

              <Pressable onPress={() => handleDelete(snapshot)} style={styles.deleteButton}>
                <Ionicons name="trash-outline" size={18} color={colors.expense} />
              </Pressable>
            </View>

            <View style={styles.snapshotBreakdown}>
              <BreakdownItem
                colors={colors}
                label="Cash"
                value={formatCompactCurrency(snapshot.cashValue, snapshot.currency)}
              />
              <BreakdownItem
                colors={colors}
                label="Saving"
                value={formatCompactCurrency(snapshot.savingValue, snapshot.currency)}
              />
              <BreakdownItem
                colors={colors}
                label="Invest"
                value={formatCompactCurrency(snapshot.investmentValue, snapshot.currency)}
              />
            </View>

            {snapshot.note ? (
              <AppText variant="caption" muted style={styles.noteText}>
                {snapshot.note}
              </AppText>
            ) : null}
          </View>
        ))}
      </View>
    </Screen>
  );
}

function BreakdownItem({
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
    <View style={styles.breakdownItem}>
      <AppText variant="caption" muted>
        {label}
      </AppText>

      <AppText variant="caption" style={styles.breakdownValue} numberOfLines={1}>
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
    heroCard: {
      backgroundColor: colors.primary,
      borderRadius: 30,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    heroIcon: {
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
    heroValue: {
      marginTop: 6,
      color: colors.black,
    },
    heroSubValue: {
      marginTop: 4,
      color: 'rgba(0,0,0,0.62)',
      fontWeight: '800',
    },
    grid: {
      marginTop: 18,
      flexDirection: 'row',
      gap: 12,
    },
    statBox: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 15,
    },
    statValue: {
      marginTop: 8,
      fontWeight: '900',
    },
    sectionHeader: {
      marginTop: 28,
      marginBottom: 14,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 12,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 22,
      alignItems: 'center',
    },
    emptyTitle: {
      marginTop: 14,
      textAlign: 'center',
    },
    emptyText: {
      marginTop: 8,
      textAlign: 'center',
      lineHeight: 21,
    },
    chartCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 16,
    },
    lineChartBody: {
      alignSelf: 'center',
      position: 'relative',
      borderRadius: 22,
      backgroundColor: colors.surfaceSoft,
      overflow: 'hidden',
    },
    lineGuide: {
      position: 'absolute',
      height: 1,
      borderRadius: 999,
      backgroundColor: colors.border,
      opacity: 0.45,
    },
    lineVerticalGuide: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: 1,
      backgroundColor: colors.textMuted,
      opacity: 0.45,
      zIndex: 2,
    },
    lineSegment: {
      position: 'absolute',
      height: 3,
      borderRadius: 999,
      backgroundColor: colors.primary,
    },
    lineChartTouchLayer: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      zIndex: 5,
    },
    linePointTouch: {
      position: 'absolute',
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 4,
    },
    linePointDot: {
      width: 10,
      height: 10,
      borderRadius: 999,
      backgroundColor: colors.primary,
      borderWidth: 2,
      borderColor: colors.surface,
    },
    linePointDotActive: {
      width: 17,
      height: 17,
      borderWidth: 4,
      borderColor: colors.surface,
      shadowColor: colors.black,
      shadowOpacity: 0.16,
      shadowRadius: 8,
      elevation: 4,
    },
    lineChartTooltip: {
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
    lineChartTooltipValue: {
      color: colors.text,
      fontWeight: '900',
    },
    lineChartTooltipDate: {
      marginTop: 3,
      color: colors.textMuted,
      fontWeight: '800',
    },
    lineChartLabels: {
      marginTop: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 5,
    },
    chartLabel: {
      flex: 1,
      textAlign: 'center',
      fontSize: 10,
    },
    chartFooter: {
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    chartFooterValue: {
      color: colors.text,
      fontWeight: '900',
    },
    snapshotList: {
      gap: 12,
    },
    snapshotCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 15,
      gap: 14,
    },
    snapshotTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    snapshotIcon: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    snapshotTextBox: {
      flex: 1,
      minWidth: 0,
    },
    snapshotValue: {
      fontWeight: '900',
      marginBottom: 4,
    },
    deleteButton: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    snapshotBreakdown: {
      flexDirection: 'row',
      gap: 9,
    },
    breakdownItem: {
      flex: 1,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 16,
      padding: 11,
    },
    breakdownValue: {
      marginTop: 5,
      color: colors.text,
      fontWeight: '900',
    },
    noteText: {
      lineHeight: 18,
    },
  });
}
