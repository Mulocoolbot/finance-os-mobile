import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { ThemeColors } from '../../constants/colors';
import { useThemeColors } from '../../hooks/useThemeColors';
import { Budget, Currency } from '../../types/finance';
import { formatCurrency } from '../../utils/currency';
import { convertCurrencyAmount, ExchangeRates } from '../../utils/currencyConversion';
import { formatCompactCurrency } from '../../utils/formatCompactCurrency';
import { AppText } from '../ui/AppText';

type BudgetCardProps = {
  budget: Budget;
  usedAmount: number;
  displayCurrency?: Currency;
  exchangeRates?: ExchangeRates;
};

const fallbackExchangeRates: ExchangeRates = {
  IDR: 1,
  USD: 1,
  EUR: 1,
};

function getPeriodLabel(period: Budget['period']) {
  if (period === 'weekly') return 'Weekly';
  if (period === 'monthly') return 'Monthly';

  return 'Custom';
}

function getBudgetStatus(colors: ThemeColors, percentage: number) {
  if (percentage >= 100) {
    return {
      label: 'Exceeded',
      color: colors.expense,
      icon: 'alert-circle-outline',
    };
  }

  if (percentage >= 85) {
    return {
      label: 'Warning',
      color: colors.investment,
      icon: 'warning-outline',
    };
  }

  return {
    label: 'On Track',
    color: colors.income,
    icon: 'checkmark-circle-outline',
  };
}

export function BudgetCard({
  budget,
  usedAmount,
  displayCurrency,
  exchangeRates,
}: BudgetCardProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const currencyBase = displayCurrency || budget.currency;
  const rates = exchangeRates || fallbackExchangeRates;

  const percentage = budget.limitAmount > 0 ? (usedAmount / budget.limitAmount) * 100 : 0;
  const cappedPercentage = Math.min(percentage, 100);
  const remaining = budget.limitAmount - usedAmount;
  const status = getBudgetStatus(colors, percentage);

  const convertedUsedAmount = convertCurrencyAmount(
    usedAmount,
    budget.currency,
    currencyBase,
    rates
  );
  const convertedLimitAmount = convertCurrencyAmount(
    budget.limitAmount,
    budget.currency,
    currencyBase,
    rates
  );
  const convertedRemaining = convertedLimitAmount - convertedUsedAmount;
  const hasConvertedDisplay = budget.currency !== currencyBase;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { borderColor: status.color }]}>
          <Ionicons name="wallet-outline" size={22} color={status.color} />
        </View>

        <View style={styles.titleBox}>
          <AppText variant="body" style={styles.name} numberOfLines={1}>
            {budget.name}
          </AppText>

          <AppText variant="caption" muted numberOfLines={1}>
            {budget.categoryName} • {getPeriodLabel(budget.period)} • Original {budget.currency}
          </AppText>
        </View>

        <View style={styles.statusBadge}>
          <Ionicons name={status.icon as any} size={14} color={status.color} />

          <AppText variant="caption" style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </AppText>
        </View>
      </View>

      <View style={styles.amountPanel}>
        <View style={styles.amountItem}>
          <AppText variant="caption" muted>
            Used • {currencyBase} base
          </AppText>

          <AppText variant="subtitle" style={styles.usedAmount} numberOfLines={1}>
            {formatCompactCurrency(convertedUsedAmount, currencyBase)}
          </AppText>

          <AppText variant="caption" muted style={styles.fullAmount} numberOfLines={1}>
            {formatCurrency(convertedUsedAmount, currencyBase)}
          </AppText>
        </View>

        <View style={styles.amountItemRight}>
          <AppText variant="caption" muted>
            Limit
          </AppText>

          <AppText variant="body" style={styles.limitAmount} numberOfLines={1}>
            {formatCompactCurrency(convertedLimitAmount, currencyBase)}
          </AppText>

          <AppText variant="caption" muted style={styles.fullAmount} numberOfLines={1}>
            {formatCurrency(convertedLimitAmount, currencyBase)}
          </AppText>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${cappedPercentage}%`,
              backgroundColor: status.color,
            },
          ]}
        />
      </View>

      <View style={styles.footer}>
        <AppText variant="caption" muted>
          {percentage.toFixed(0)}% used
        </AppText>

        <AppText
          variant="caption"
          style={[
            styles.remainingText,
            {
              color: convertedRemaining >= 0 ? colors.textMuted : colors.expense,
            },
          ]}
        >
          {convertedRemaining >= 0 ? 'Remaining' : 'Over'}:{' '}
          {formatCompactCurrency(Math.abs(convertedRemaining), currencyBase)}
        </AppText>
      </View>

      {hasConvertedDisplay ? (
        <AppText variant="caption" muted style={styles.originalText} numberOfLines={2}>
          Original: {formatCompactCurrency(usedAmount, budget.currency)} used from{' '}
          {formatCompactCurrency(budget.limitAmount, budget.currency)}
        </AppText>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
    },
    iconBox: {
      width: 48,
      height: 48,
      borderRadius: 17,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleBox: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      fontWeight: '900',
      marginBottom: 4,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 6,
    },
    statusText: {
      fontWeight: '900',
    },
    amountPanel: {
      marginTop: 18,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 18,
      padding: 14,
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    amountItem: {
      flex: 1,
      minWidth: 0,
    },
    amountItemRight: {
      flex: 1,
      minWidth: 0,
      alignItems: 'flex-end',
    },
    usedAmount: {
      marginTop: 5,
      fontWeight: '900',
    },
    limitAmount: {
      marginTop: 5,
      fontWeight: '900',
    },
    fullAmount: {
      marginTop: 3,
      maxWidth: '100%',
    },
    progressTrack: {
      height: 10,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 999,
      marginTop: 16,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
    },
    footer: {
      marginTop: 11,
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    remainingText: {
      fontWeight: '800',
    },
    originalText: {
      marginTop: 10,
      lineHeight: 18,
    },
  });
}
