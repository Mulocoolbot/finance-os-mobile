import { StyleSheet, View } from 'react-native';
import { colors } from '../../constants/colors';
import { Transaction } from '../../types/finance';
import { formatCurrency } from '../../utils/currency';
import { formatShortDate } from '../../utils/date';
import { AppText } from '../ui/AppText';

type RecentTransactionCardProps = {
  transaction: Transaction;
};

export function RecentTransactionCard({
  transaction,
}: RecentTransactionCardProps) {
  const isExpense = transaction.type === 'expense';
  const isIncome = transaction.type === 'income';
  const isSaving =
    transaction.type === 'saving_deposit' ||
    transaction.type === 'saving_withdrawal';

  const amountColor = isIncome
    ? colors.income
    : isExpense
      ? colors.expense
      : isSaving
        ? colors.saving
        : colors.transfer;

  const prefix = isIncome ? '+' : isExpense ? '-' : '';

  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <AppText variant="body" style={styles.title}>
          {transaction.title}
        </AppText>
        <AppText variant="caption" muted>
          {transaction.accountName} • {formatShortDate(transaction.date)}
        </AppText>
      </View>

      <AppText variant="body" style={[styles.amount, { color: amountColor }]}>
        {prefix}
        {formatCurrency(transaction.amount, transaction.currency)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  left: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
    marginBottom: 4,
  },
  amount: {
    fontWeight: '800',
  },
});