import { DimensionValue, StyleSheet, View } from 'react-native';
import { colors } from '../../constants/colors';
import { Currency } from '../../types/finance';
import { formatCurrency } from '../../utils/currency';
import { AppText } from '../ui/AppText';

type BarChartRow = {
  label: string;
  income?: number;
  expense?: number;
  value?: number;
};

type SimpleBarChartProps = {
  title: string;
  description?: string;
  data: BarChartRow[];
  currency: Currency;
  mode: 'incomeExpense' | 'single';
  singleLabel?: string;
};

function toPercentWidth(value: number): DimensionValue {
  return `${Math.min(Math.max(value, 0), 100)}%` as DimensionValue;
}

export function SimpleBarChart({
  title,
  description,
  data,
  currency,
  mode,
  singleLabel = 'Value',
}: SimpleBarChartProps) {
  const maxValue = Math.max(
    1,
    ...data.map((item) => {
      if (mode === 'incomeExpense') {
        return Math.max(item.income || 0, item.expense || 0);
      }

      return item.value || 0;
    })
  );

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

      <View style={styles.rows}>
        {data.length === 0 ? (
          <View style={styles.emptyBox}>
            <AppText variant="caption" muted>
              No report data available yet.
            </AppText>
          </View>
        ) : null}

        {data.map((item) => {
          const incomeWidth = toPercentWidth(((item.income || 0) / maxValue) * 100);
          const expenseWidth = toPercentWidth(((item.expense || 0) / maxValue) * 100);
          const valueWidth = toPercentWidth(((item.value || 0) / maxValue) * 100);

          return (
            <View key={item.label} style={styles.row}>
              <View style={styles.rowHeader}>
                <AppText variant="caption" style={styles.rowLabel}>
                  {item.label}
                </AppText>

                {mode === 'single' ? (
                  <AppText variant="caption" muted>
                    {formatCurrency(item.value || 0, currency)}
                  </AppText>
                ) : null}
              </View>

              {mode === 'incomeExpense' ? (
                <View style={styles.groupedBars}>
                  <View style={styles.barLine}>
                    <View style={styles.barLabelBox}>
                      <AppText variant="caption" style={styles.incomeLabel}>
                        Income
                      </AppText>
                    </View>

                    <View style={styles.track}>
                      <View
                        style={[
                          styles.barFill,
                          styles.incomeFill,
                          { width: incomeWidth },
                        ]}
                      />
                    </View>

                    <AppText variant="caption" muted style={styles.amountLabel}>
                      {formatCurrency(item.income || 0, currency)}
                    </AppText>
                  </View>

                  <View style={styles.barLine}>
                    <View style={styles.barLabelBox}>
                      <AppText variant="caption" style={styles.expenseLabel}>
                        Expense
                      </AppText>
                    </View>

                    <View style={styles.track}>
                      <View
                        style={[
                          styles.barFill,
                          styles.expenseFill,
                          { width: expenseWidth },
                        ]}
                      />
                    </View>

                    <AppText variant="caption" muted style={styles.amountLabel}>
                      {formatCurrency(item.expense || 0, currency)}
                    </AppText>
                  </View>
                </View>
              ) : (
                <View style={styles.barLine}>
                  <View style={styles.barLabelBox}>
                    <AppText variant="caption" muted>
                      {singleLabel}
                    </AppText>
                  </View>

                  <View style={styles.track}>
                    <View
                      style={[
                        styles.barFill,
                        styles.singleFill,
                        { width: valueWidth },
                      ]}
                    />
                  </View>
                </View>
              )}
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
  rows: {
    gap: 18,
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
  rowLabel: {
    fontWeight: '800',
  },
  groupedBars: {
    gap: 8,
  },
  barLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barLabelBox: {
    width: 58,
  },
  incomeLabel: {
    color: colors.income,
    fontWeight: '800',
  },
  expenseLabel: {
    color: colors.expense,
    fontWeight: '800',
  },
  track: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.surfaceSoft,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  incomeFill: {
    backgroundColor: colors.income,
  },
  expenseFill: {
    backgroundColor: colors.expense,
  },
  singleFill: {
    backgroundColor: colors.saving,
  },
  amountLabel: {
    width: 92,
    textAlign: 'right',
  },
});
