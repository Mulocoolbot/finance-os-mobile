import { useEffect, useMemo, useRef } from 'react';
import { Animated, DimensionValue, Easing, StyleSheet, View } from 'react-native';
import { colors } from '../../constants/colors';
import { Currency } from '../../types/finance';
import { formatCurrency } from '../../utils/currency';
import { AppText } from '../ui/AppText';

type CategoryBreakdownItem = {
  categoryName: string;
  amount: number;
};

type CategoryBreakdownChartProps = {
  title: string;
  description?: string;
  data: CategoryBreakdownItem[];
  currency: Currency;
};

function toPercentWidth(value: number): DimensionValue {
  return `${Math.min(Math.max(value, 0), 100)}%` as DimensionValue;
}

export function CategoryBreakdownChart({
  title,
  description,
  data,
  currency,
}: CategoryBreakdownChartProps) {
  const barReveal = useRef(new Animated.Value(0)).current;
  const animationKey = useMemo(() => {
    return data.map((item) => `${item.categoryName}:${item.amount}`).join('|');
  }, [data]);

  useEffect(() => {
    barReveal.stopAnimation();
    barReveal.setValue(0);

    Animated.timing(barReveal, {
      toValue: 1,
      duration: Math.min(1200, 420 + data.length * 80),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animationKey, barReveal, data.length]);

  const total = data.reduce((sum, item) => sum + item.amount, 0);
  const maxValue = Math.max(1, ...data.map((item) => item.amount));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <AppText variant="subtitle">{title}</AppText>

        {description ? (
          <AppText variant="caption" muted style={styles.description}>
            {description}
          </AppText>
        ) : null}
      </View>

      <View style={styles.totalBox}>
        <AppText variant="caption" muted>
          Total
        </AppText>

        <AppText variant="title" style={styles.totalAmount}>
          {formatCurrency(total, currency)}
        </AppText>
      </View>

      <View style={styles.rows}>
        {data.length === 0 ? (
          <View style={styles.emptyBox}>
            <AppText variant="caption" muted>
              No category data available yet.
            </AppText>
          </View>
        ) : null}

        {data.map((item) => {
          const percentage = total > 0 ? (item.amount / total) * 100 : 0;
          const width = toPercentWidth((item.amount / maxValue) * 100);
          const itemIndex = data.indexOf(item);
          const rowStart = data.length <= 1 ? 0 : itemIndex / data.length;
          const rowEnd = data.length <= 1 ? 1 : (itemIndex + 1) / data.length;
          const rowReveal = barReveal.interpolate({
            inputRange: [rowStart, rowEnd],
            outputRange: [0, 1],
            extrapolate: 'clamp',
          });
          const animatedWidth = rowReveal.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', width as string],
          });

          return (
            <View key={item.categoryName} style={styles.row}>
              <View style={styles.rowHeader}>
                <AppText variant="caption" style={styles.categoryName}>
                  {item.categoryName}
                </AppText>

                <AppText variant="caption" muted>
                  {percentage.toFixed(0)}%
                </AppText>
              </View>

              <View style={styles.barLine}>
                <View style={styles.track}>
                  <Animated.View style={[styles.fill, { width: animatedWidth as any }]} />
                </View>

                <AppText variant="caption" muted style={styles.amountLabel}>
                  {formatCurrency(item.amount, currency)}
                </AppText>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 18,
  },
  header: {
    marginBottom: 16,
  },
  description: {
    marginTop: 6,
    lineHeight: 18,
  },
  totalBox: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },
  totalAmount: {
    marginTop: 6,
    color: colors.expense,
  },
  rows: {
    gap: 14,
  },
  emptyBox: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
  },
  row: {
    gap: 8,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  categoryName: {
    fontWeight: '800',
  },
  barLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  track: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.surfaceSoft,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.expense,
  },
  amountLabel: {
    width: 92,
    textAlign: 'right',
  },
});
