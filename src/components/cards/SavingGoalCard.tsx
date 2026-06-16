import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { ThemeColors } from '../../constants/colors';
import { useThemeColors } from '../../hooks/useThemeColors';
import { Account, Currency, SavingGoal } from '../../types/finance';
import { formatCurrency } from '../../utils/currency';
import { convertCurrencyAmount, ExchangeRates } from '../../utils/currencyConversion';
import { formatCompactCurrency } from '../../utils/formatCompactCurrency';
import { AppText } from '../ui/AppText';

type SavingGoalCardProps = {
  savingGoal: SavingGoal;
  accounts: Account[];
  displayCurrency?: Currency;
  exchangeRates?: ExchangeRates;
};

const fallbackExchangeRates: ExchangeRates = {
  IDR: 1,
  USD: 1,
  EUR: 1,
};

function getProgress(currentAmount: number, targetAmount: number) {
  if (targetAmount <= 0) return 0;

  return Math.min((currentAmount / targetAmount) * 100, 100);
}

function getStatusMeta(colors: ThemeColors, status: SavingGoal['status']) {
  if (status === 'completed') {
    return {
      label: 'Completed',
      color: colors.income,
      icon: 'checkmark-circle-outline',
    };
  }

  if (status === 'paused') {
    return {
      label: 'Paused',
      color: colors.textMuted,
      icon: 'pause-circle-outline',
    };
  }

  if (status === 'cancelled') {
    return {
      label: 'Cancelled',
      color: colors.expense,
      icon: 'close-circle-outline',
    };
  }

  return {
    label: 'Active',
    color: colors.saving,
    icon: 'sparkles-outline',
  };
}

function getDeadlineText(deadline?: string) {
  if (!deadline) return 'No deadline';

  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffMs = deadlineDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (Number.isNaN(diffDays)) return 'Invalid deadline';
  if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
  if (diffDays === 0) return 'Due today';

  return `${diffDays} days left`;
}

export function SavingGoalCard({
  savingGoal,
  accounts,
  displayCurrency,
  exchangeRates,
}: SavingGoalCardProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const savingAccount = accounts.find((account) => account.id === savingGoal.savingAccountId);
  const sourceAccount = accounts.find((account) => account.id === savingGoal.linkedSourceAccountId);

  const currencyBase = displayCurrency || savingGoal.currency;
  const rates = exchangeRates || fallbackExchangeRates;

  const progress = getProgress(savingGoal.currentAmount, savingGoal.targetAmount);
  const remainingAmount = Math.max(savingGoal.targetAmount - savingGoal.currentAmount, 0);
  const statusMeta = getStatusMeta(colors, savingGoal.status);

  const convertedCurrentAmount = convertCurrencyAmount(
    savingGoal.currentAmount,
    savingGoal.currency,
    currencyBase,
    rates
  );

  const convertedTargetAmount = convertCurrencyAmount(
    savingGoal.targetAmount,
    savingGoal.currency,
    currencyBase,
    rates
  );

  const convertedRemainingAmount = convertCurrencyAmount(
    remainingAmount,
    savingGoal.currency,
    currencyBase,
    rates
  );

  const hasConvertedDisplay = savingGoal.currency !== currencyBase;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { borderColor: statusMeta.color }]}>
          <Ionicons name="sparkles-outline" size={22} color={statusMeta.color} />
        </View>

        <View style={styles.titleBox}>
          <AppText variant="body" style={styles.name} numberOfLines={1}>
            {savingGoal.name}
          </AppText>

          <AppText variant="caption" muted numberOfLines={1}>
            {savingAccount?.name || 'Saving account'} • {getDeadlineText(savingGoal.deadline)} • Original {savingGoal.currency}
          </AppText>
        </View>

        <View style={styles.statusBadge}>
          <Ionicons name={statusMeta.icon as any} size={14} color={statusMeta.color} />

          <AppText variant="caption" style={[styles.statusText, { color: statusMeta.color }]}>
            {statusMeta.label}
          </AppText>
        </View>
      </View>

      <View style={styles.amountPanel}>
        <View style={styles.amountItem}>
          <AppText variant="caption" muted>
            Saved • {currencyBase} base
          </AppText>

          <AppText variant="subtitle" style={styles.savedAmount} numberOfLines={1}>
            {formatCompactCurrency(convertedCurrentAmount, currencyBase)}
          </AppText>

          <AppText variant="caption" muted style={styles.fullAmount} numberOfLines={1}>
            {formatCurrency(convertedCurrentAmount, currencyBase)}
          </AppText>
        </View>

        <View style={styles.amountItemRight}>
          <AppText variant="caption" muted>
            Target
          </AppText>

          <AppText variant="body" style={styles.targetAmount} numberOfLines={1}>
            {formatCompactCurrency(convertedTargetAmount, currencyBase)}
          </AppText>

          <AppText variant="caption" muted style={styles.fullAmount} numberOfLines={1}>
            {formatCurrency(convertedTargetAmount, currencyBase)}
          </AppText>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progress}%`,
              backgroundColor: statusMeta.color,
            },
          ]}
        />
      </View>

      <View style={styles.footer}>
        <AppText variant="caption" muted>
          {progress.toFixed(0)}% completed
        </AppText>

        <AppText variant="caption" style={styles.remainingText}>
          Remaining: {formatCompactCurrency(convertedRemainingAmount, currencyBase)}
        </AppText>
      </View>

      {hasConvertedDisplay ? (
        <AppText variant="caption" muted style={styles.originalText} numberOfLines={2}>
          Original: {formatCompactCurrency(savingGoal.currentAmount, savingGoal.currency)} saved from{' '}
          {formatCompactCurrency(savingGoal.targetAmount, savingGoal.currency)}
        </AppText>
      ) : null}

      <View style={styles.accountInfo}>
        <Ionicons name="link-outline" size={15} color={colors.textMuted} />

        <AppText variant="caption" muted numberOfLines={1} style={styles.accountText}>
          Source: {sourceAccount?.name || 'Unknown source account'}
        </AppText>
      </View>
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
    savedAmount: {
      marginTop: 5,
      fontWeight: '900',
    },
    targetAmount: {
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
      color: colors.saving,
      fontWeight: '800',
    },
    originalText: {
      marginTop: 10,
      lineHeight: 18,
    },
    accountInfo: {
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    accountText: {
      flex: 1,
    },
  });
}
