import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useFinanceStore } from '../src/stores/useFinanceStore';
import { Transaction } from '../src/types/finance';
import { formatCurrency } from '../src/utils/currency';

function getTransactionTypeLabel(type: Transaction['type']) {
  if (type === 'income') return 'Income';
  if (type === 'expense') return 'Expense';
  if (type === 'transfer') return 'Transfer';
  if (type === 'saving_deposit') return 'Saving Deposit';
  if (type === 'saving_withdrawal') return 'Saving Withdrawal';
  if (type === 'investment_buy') return 'Investment Buy';
  if (type === 'investment_sell') return 'Investment Sell';

  return 'Transaction';
}

function canEditDirectly(transaction: Transaction) {
  return transaction.type === 'income' || transaction.type === 'expense';
}

function getAmountColor(type: Transaction['type'], colors: ThemeColors) {
  if (type === 'income' || type === 'saving_withdrawal' || type === 'investment_sell') {
    return colors.income;
  }

  if (type === 'expense' || type === 'saving_deposit' || type === 'investment_buy') {
    return colors.expense;
  }

  return colors.text;
}

function getAmountPrefix(type: Transaction['type']) {
  if (type === 'income' || type === 'saving_withdrawal' || type === 'investment_sell') {
    return '+';
  }

  if (type === 'expense' || type === 'saving_deposit' || type === 'investment_buy') {
    return '-';
  }

  return '';
}

export default function TransactionDetailScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ transactionId?: string }>();
  const transactionId =
    typeof params.transactionId === 'string' ? params.transactionId : '';

  const transaction = useFinanceStore((state) =>
    state.transactions.find((item) => item.id === transactionId)
  );
  const deleteTransaction = useFinanceStore((state) => state.deleteTransaction);

  function handleDelete() {
    if (!transaction) {
      return;
    }

    Alert.alert(
      'Delete Transaction',
      canEditDirectly(transaction)
        ? 'This will delete the transaction and roll back the account balance. Continue?'
        : 'This transaction is managed by another module. Direct delete may be blocked for safety. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const result = deleteTransaction(transaction.id);

            Alert.alert('Finance OS Mobile', result.message);

            if (result.success) {
              router.back();
            }
          },
        },
      ]
    );
  }

  if (!transaction) {
    return (
      <Screen>
        <View style={styles.emptyCard}>
          <AppText variant="subtitle">Transaction not found</AppText>

          <AppText variant="body" muted style={styles.emptyDescription}>
            This transaction may have been deleted.
          </AppText>

          <Pressable onPress={() => router.back()} style={styles.primaryButton}>
            <AppText variant="body" style={styles.primaryButtonText}>
              Go Back
            </AppText>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const amountColor = getAmountColor(transaction.type, colors);
  const editable = canEditDirectly(transaction);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.headerText}>
          <AppText variant="caption" muted>
            Transaction Detail
          </AppText>

          <AppText variant="title" style={styles.title}>
            {getTransactionTypeLabel(transaction.type)}
          </AppText>
        </View>
      </View>

      <View style={styles.heroCard}>
        <AppText variant="caption" muted>
          Amount
        </AppText>

        <AppText
          variant="title"
          style={[styles.amountValue, { color: amountColor }]}
          numberOfLines={1}
        >
          {getAmountPrefix(transaction.type)}
          {formatCurrency(transaction.amount, transaction.currency)}
        </AppText>

        <AppText variant="body" style={styles.transactionTitle}>
          {transaction.title}
        </AppText>

        <AppText variant="caption" muted style={styles.managedText}>
          {editable
            ? 'This transaction can be edited directly.'
            : 'This transaction is managed by transfer/saving/investment/crypto flow.'}
        </AppText>
      </View>

      <View style={styles.detailCard}>
        <DetailRow label="Account" value={transaction.accountName} styles={styles} />
        <DetailRow label="Category" value={transaction.categoryName || 'Uncategorized'} styles={styles} />
        <DetailRow
          label="Date"
          value={new Date(transaction.date).toLocaleDateString('id-ID')}
          styles={styles}
        />
        <DetailRow label="Type" value={getTransactionTypeLabel(transaction.type)} styles={styles} />
        {transaction.note ? (
          <DetailRow label="Note" value={transaction.note} styles={styles} multiline />
        ) : null}
      </View>

      <View style={styles.actionRow}>
        {editable ? (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/edit-transaction',
                params: { transactionId: transaction.id },
              })
            }
            style={styles.primaryButton}
          >
            <Ionicons name="create-outline" size={18} color={colors.black} />

            <AppText variant="body" style={styles.primaryButtonText}>
              Edit
            </AppText>
          </Pressable>
        ) : null}

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

function DetailRow({
  label,
  value,
  styles,
  multiline,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
  multiline?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <AppText variant="caption" muted>
        {label}
      </AppText>

      <AppText
        variant="body"
        style={styles.detailValue}
        numberOfLines={multiline ? undefined : 1}
      >
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
    title: {
      marginTop: 4,
    },
    heroCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 26,
      padding: 18,
      gap: 8,
      marginBottom: 14,
    },
    amountValue: {
      fontWeight: '900',
    },
    transactionTitle: {
      color: colors.text,
      fontWeight: '900',
    },
    managedText: {
      lineHeight: 18,
    },
    detailCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 15,
      gap: 12,
    },
    detailRow: {
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      gap: 5,
    },
    detailValue: {
      color: colors.text,
      fontWeight: '900',
    },
    actionRow: {
      marginTop: 16,
      flexDirection: 'row',
      gap: 10,
    },
    primaryButton: {
      flex: 1,
      minHeight: 54,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    primaryButtonText: {
      color: colors.black,
      fontWeight: '900',
    },
    deleteButton: {
      flex: 1,
      minHeight: 54,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.expense,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    deleteButtonText: {
      color: colors.expense,
      fontWeight: '900',
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 18,
    },
    emptyDescription: {
      marginTop: 8,
      marginBottom: 16,
      lineHeight: 22,
    },
  });
}
