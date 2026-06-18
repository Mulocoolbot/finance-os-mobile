import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { TradingTrade, useFinanceStore } from '../src/stores/useFinanceStore';
import { formatCurrency } from '../src/utils/currency';

function getDate(value: string | null | undefined) {
  if (!value) {
    return new Date();
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}

function formatDate(value: string | null | undefined) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(getDate(value));
}

function formatDateTime(value: string | null | undefined) {
  const date = getDate(value);

  return `${new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)} • ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`;
}

function getTradeDate(trade: TradingTrade) {
  return trade.closeDate || trade.openDate;
}

export default function TradingTradeDetailScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ tradeId?: string }>();

  const tradingTrades = useFinanceStore((state) => state.tradingTrades);
  const tradingAccounts = useFinanceStore((state) => state.tradingAccounts);
  const deleteTradingTrade = useFinanceStore((state) => state.deleteTradingTrade);

  const trade = tradingTrades.find((item) => item.id === params.tradeId);
  const tradingAccount = tradingAccounts.find(
    (account) => account.id === trade?.tradingAccountId
  );

  function handleDelete() {
    if (!trade) {
      return;
    }

    Alert.alert(
      'Delete trade?',
      trade.status === 'closed'
        ? 'This closed trade will be deleted and its P/L will be rolled back from the account balance.'
        : 'This open trade will be deleted.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const result = deleteTradingTrade(trade.id);

            Alert.alert('Finance OS Mobile', result.message);

            if (result.success) {
              router.back();
            }
          },
        },
      ]
    );
  }

  if (!trade) {
    return (
      <Screen>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
          </Pressable>

          <View style={styles.headerText}>
            <AppText variant="caption" muted>
              Trade Detail
            </AppText>

            <AppText variant="title">Not Found</AppText>
          </View>
        </View>

        <View style={styles.emptyCard}>
          <Ionicons name="alert-circle-outline" size={30} color={colors.textMuted} />

          <AppText variant="body" muted style={styles.emptyDescription}>
            This trade may have been deleted.
          </AppText>
        </View>
      </Screen>
    );
  }

  const profitColor = trade.netProfitLoss >= 0 ? colors.income : colors.expense;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.headerText}>
          <AppText variant="caption" muted>
            Trade Detail
          </AppText>

          <AppText variant="title" numberOfLines={1}>
            {trade.pair} • {trade.direction.toUpperCase()}
          </AppText>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View>
            <AppText variant="caption" muted>
              Net P/L
            </AppText>

            <AppText variant="title" style={[styles.heroValue, { color: profitColor }]}>
              {formatCurrency(trade.netProfitLoss, trade.currency)}
            </AppText>
          </View>

          <View style={styles.statusBadge}>
            <AppText variant="caption" style={styles.statusBadgeText}>
              {trade.status.toUpperCase()}
            </AppText>
          </View>
        </View>

        <AppText variant="caption" muted style={styles.heroDescription}>
          {tradingAccount?.name || 'Unknown account'} • {formatDate(getTradeDate(trade))}
        </AppText>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() =>
            router.push(`/add-trading-trade?tradeId=${trade.id}` as any)
          }
          style={styles.editButton}
        >
          <Ionicons name="create-outline" size={18} color={colors.black} />

          <AppText variant="body" style={styles.editButtonText}>
            Edit Trade
          </AppText>
        </Pressable>

        <Pressable onPress={handleDelete} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={18} color={colors.white} />

          <AppText variant="body" style={styles.deleteButtonText}>
            Delete
          </AppText>
        </Pressable>
      </View>

      <View style={styles.sectionCard}>
        <InfoLine label="Pair" value={trade.pair} colors={colors} />
        <InfoLine label="Direction" value={trade.direction.toUpperCase()} colors={colors} />
        <InfoLine label="Lot Size" value={`${trade.lotSize}`} colors={colors} />
        <InfoLine label="Open Date" value={formatDateTime(trade.openDate)} colors={colors} />
        <InfoLine
          label="Close Date"
          value={trade.closeDate ? formatDateTime(trade.closeDate) : 'Still open'}
          colors={colors}
        />
      </View>

      <View style={styles.sectionCard}>
        <InfoLine label="Entry Price" value={`${trade.entryPrice}`} colors={colors} />
        <InfoLine label="Exit Price" value={trade.exitPrice ? `${trade.exitPrice}` : '-'} colors={colors} />
        <InfoLine label="Stop Loss" value={trade.stopLoss ? `${trade.stopLoss}` : '-'} colors={colors} />
        <InfoLine label="Take Profit" value={trade.takeProfit ? `${trade.takeProfit}` : '-'} colors={colors} />
      </View>

      <View style={styles.sectionCard}>
        <InfoLine
          label="Gross P/L"
          value={formatCurrency(trade.grossProfitLoss, trade.currency)}
          colors={colors}
        />
        <InfoLine
          label="Commission"
          value={formatCurrency(trade.commission, trade.currency)}
          colors={colors}
        />
        <InfoLine
          label="Swap"
          value={formatCurrency(trade.swap, trade.currency)}
          colors={colors}
        />
        <InfoLine
          label="Risk Amount"
          value={formatCurrency(trade.riskAmount, trade.currency)}
          colors={colors}
        />
        <InfoLine
          label="Plan Risk Snapshot"
          value={
            trade.planRiskLimitAmountSnapshot
              ? `${trade.planRiskPercentSnapshot}% / ${formatCurrency(
                  trade.planRiskLimitAmountSnapshot,
                  trade.currency
                )}`
              : 'No snapshot'
          }
          colors={colors}
        />
        <InfoLine
          label="Balance Snapshot"
          value={
            trade.accountBalanceSnapshot
              ? formatCurrency(trade.accountBalanceSnapshot, trade.currency)
              : 'No snapshot'
          }
          colors={colors}
        />
        <InfoLine label="RR" value={`1:${trade.rewardRiskRatio || 0}`} colors={colors} />
      </View>

      <View style={styles.sectionCard}>
        <InfoLine label="Setup" value={trade.setupTag || 'No setup'} colors={colors} />
        <InfoLine
          label="Mistakes"
          value={trade.mistakeTags.length ? trade.mistakeTags.join(', ') : 'No mistake tag'}
          colors={colors}
        />
        <InfoLine label="Emotion Before" value={trade.emotionBefore || '-'} colors={colors} />
        <InfoLine label="Emotion After" value={trade.emotionAfter || '-'} colors={colors} />
      </View>

      {trade.note ? (
        <View style={styles.noteCard}>
          <AppText variant="caption" muted>
            Note
          </AppText>

          <AppText variant="body" style={styles.noteText}>
            {trade.note}
          </AppText>
        </View>
      ) : null}
    </Screen>
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

      <AppText variant="body" style={styles.infoValue} numberOfLines={2}>
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
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 26,
      padding: 16,
      gap: 8,
      marginBottom: 16,
    },
    heroTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      alignItems: 'flex-start',
    },
    heroValue: {
      marginTop: 5,
    },
    heroDescription: {
      lineHeight: 18,
    },
    statusBadge: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    statusBadgeText: {
      color: colors.text,
      fontWeight: '900',
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    editButton: {
      flex: 1,
      minHeight: 52,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    editButtonText: {
      color: colors.black,
      fontWeight: '900',
    },
    deleteButton: {
      flex: 1,
      minHeight: 52,
      borderRadius: 18,
      backgroundColor: colors.expense,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    deleteButtonText: {
      color: colors.white,
      fontWeight: '900',
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 15,
      gap: 12,
      marginBottom: 14,
    },
    infoLine: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 10,
      gap: 4,
    },
    infoValue: {
      color: colors.text,
      fontWeight: '900',
    },
    noteCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 15,
      gap: 7,
      marginBottom: 8,
    },
    noteText: {
      color: colors.text,
      lineHeight: 21,
      fontWeight: '700',
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 22,
      alignItems: 'center',
    },
    emptyDescription: {
      marginTop: 10,
      textAlign: 'center',
      lineHeight: 21,
    },
  });
}
