import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useFinanceStore } from '../src/stores/useFinanceStore';
import { Currency, Transaction } from '../src/types/finance';
import { formatCurrency } from '../src/utils/currency';

function getCryptoMeta(transaction?: Transaction) {
  if (!transaction) {
    return {
      quantity: '-',
      symbol: 'Crypto',
      rate: '-',
      currency: 'IDR' as Currency,
      source: 'Unknown',
    };
  }

  const rawText = `${transaction.title || ''} ${transaction.note || ''}`;
  const structuredMatch = rawText.match(
    /Crypto qty:\s*([0-9.]+)\s+([A-Z0-9]+)\s+•\s+Rate:\s*([0-9.]+)\s+([A-Z]{3})\s+•\s+Source:\s*([^•]+)/i
  );
  const legacyMatch = rawText.match(
    /([0-9.]+)\s+([A-Z0-9]+)\s+@\s+([0-9.]+)\s+([A-Z]{3})/i
  );
  const match = structuredMatch || legacyMatch;
  const symbolFromTitle = transaction.title.match(
    /Crypto\s+(?:Income|Payment)\s+([A-Z0-9]+)/i
  );

  if (!match) {
    return {
      quantity: '-',
      symbol: symbolFromTitle?.[1] || 'Crypto',
      rate: '-',
      currency: transaction.currency || 'IDR',
      source: transaction.note?.includes('Source:')
        ? transaction.note.split('Source:')[1]?.split('•')[0]?.trim() || 'Manual'
        : 'Manual / fallback',
    };
  }

  return {
    quantity: match[1] || '-',
    symbol: (match[2] || symbolFromTitle?.[1] || 'Crypto').toUpperCase(),
    rate: match[3] || '-',
    currency: ((match[4] || transaction.currency || 'IDR') as Currency),
    source: structuredMatch ? (match[5] || 'Manual').trim() : 'Manual / legacy',
  };
}

export default function CryptoTransactionDetailScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ transactionId?: string }>();

  const transactions = useFinanceStore((state) => state.transactions);
  const deleteCryptoTransaction = useFinanceStore(
    (state) => state.deleteCryptoTransaction
  );
  const transaction = transactions.find((item) => item.id === params.transactionId);
  const meta = getCryptoMeta(transaction);

  if (!transaction) {
    return (
      <Screen>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
          </Pressable>

          <View style={styles.headerText}>
            <AppText variant="caption" muted>
              Crypto Transaction
            </AppText>

            <AppText variant="title">Not Found</AppText>
          </View>
        </View>

        <View style={styles.emptyCard}>
          <Ionicons name="alert-circle-outline" size={30} color={colors.textMuted} />

          <AppText variant="body" muted style={styles.emptyText}>
            This crypto transaction may have been deleted.
          </AppText>
        </View>
      </Screen>
    );
  }

  const isPayment =
    transaction.type === 'expense' ||
    transaction.categoryName === 'Crypto Payment' ||
    transaction.title.toLowerCase().startsWith('crypto payment') ||
    transaction.note?.toLowerCase().includes('crypto payment');
  const tone = isPayment ? colors.expense : colors.income;

  const handleDelete = () => {
    Alert.alert(
      'Delete crypto transaction?',
      'This will rollback the related crypto holding quantity and remove the matching investment order. This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const result = deleteCryptoTransaction(transaction.id);

            Alert.alert('Finance OS Mobile', result.message);

            if (result.success) {
              router.back();
            }
          },
        },
      ]
    );
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.headerText}>
          <AppText variant="caption" muted>
            Crypto Transaction
          </AppText>

          <AppText variant="title" numberOfLines={1}>
            {transaction.title}
          </AppText>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={[styles.heroIcon, { borderColor: tone }]}>
          <Ionicons name="logo-bitcoin" size={26} color={tone} />
        </View>

        <View style={styles.heroTextBox}>
          <AppText variant="caption" muted>
            {isPayment ? 'Crypto Payment' : 'Crypto Income'}
          </AppText>

          <AppText variant="title" style={[styles.heroValue, { color: tone }]} numberOfLines={1}>
            {formatCurrency(transaction.amount, transaction.currency || meta.currency)}
          </AppText>

          <AppText variant="caption" muted style={styles.heroDescription}>
            {transaction.categoryName || 'Crypto Transaction'} • {meta.source}
          </AppText>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.infoCard}>
          <AppText variant="caption" muted>
            Quantity
          </AppText>

          <AppText variant="body" style={styles.infoValue} numberOfLines={1}>
            {meta.quantity} {meta.symbol}
          </AppText>
        </View>

        <View style={styles.infoCard}>
          <AppText variant="caption" muted>
            Rate
          </AppText>

          <AppText variant="body" style={styles.infoValue} numberOfLines={1}>
            {meta.rate} {meta.currency}
          </AppText>
        </View>
      </View>

      <View style={styles.safetyCard}>
        <View style={styles.safetyIcon}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.black} />
        </View>

        <View style={styles.safetyTextBox}>
          <AppText variant="body" style={styles.safetyTitle}>
            Protected crypto transaction
          </AppText>

          <AppText variant="caption" muted style={styles.safetyDescription}>
            Delete rollback is now protected for holding quantity, matching
            investment order, and transaction history. Normal edit remains disabled
            until edit rollback is fully safe.
          </AppText>
        </View>
      </View>

      <Pressable
        onPress={() => router.push(`/edit-crypto-transaction?transactionId=${transaction.id}`)}
        style={styles.editButton}
      >
        <Ionicons name="create-outline" size={18} color={colors.black} />

        <AppText variant="body" style={styles.editButtonText}>
          Edit Basic Details
        </AppText>
      </Pressable>

      <Pressable onPress={handleDelete} style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={18} color={colors.white} />

        <AppText variant="body" style={styles.deleteButtonText}>
          Delete Crypto Transaction
        </AppText>
      </Pressable>

      <View style={styles.nextStepCard}>
        <Ionicons name="create-outline" size={18} color={colors.textMuted} />

        <AppText variant="caption" muted style={styles.nextStepText}>
          Edit crypto transaction will be added after delete rollback is fully tested.
        </AppText>
      </View>
    </Screen>
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
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 26,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 16,
    },
    heroIcon: {
      width: 56,
      height: 56,
      borderRadius: 20,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroTextBox: {
      flex: 1,
      minWidth: 0,
    },
    heroValue: {
      marginTop: 5,
      fontWeight: '900',
    },
    heroDescription: {
      marginTop: 4,
      lineHeight: 18,
    },
    infoGrid: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    infoCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 14,
    },
    infoValue: {
      marginTop: 7,
      color: colors.text,
      fontWeight: '900',
    },
    safetyCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 14,
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    safetyIcon: {
      width: 42,
      height: 42,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    safetyTextBox: {
      flex: 1,
      minWidth: 0,
    },
    safetyTitle: {
      color: colors.text,
      fontWeight: '900',
    },
    safetyDescription: {
      marginTop: 5,
      lineHeight: 19,
    },
    editButton: {
      minHeight: 54,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    editButtonText: {
      color: colors.black,
      fontWeight: '900',
    },
    deleteButton: {
      minHeight: 54,
      borderRadius: 18,
      backgroundColor: colors.expense,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      flexDirection: 'row',
      gap: 8,
    },
    deleteButtonText: {
      color: colors.white,
      fontWeight: '900',
    },
    nextStepCard: {
      marginTop: 12,
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    nextStepText: {
      flex: 1,
      lineHeight: 18,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 22,
      alignItems: 'center',
    },
    emptyText: {
      marginTop: 10,
      textAlign: 'center',
      lineHeight: 21,
    },
  });
}
