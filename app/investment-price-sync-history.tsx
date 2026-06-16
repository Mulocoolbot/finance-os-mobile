import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import {
  clearInvestmentPriceSyncHistory,
  InvestmentPriceSyncHistoryItem,
  loadInvestmentPriceSyncHistory,
} from '../src/services/investmentPriceSyncHistory';
import { formatCompactCurrency } from '../src/utils/formatCompactCurrency';

function formatSyncDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getStatusIcon(status: string) {
  if (status === 'success') return 'checkmark-circle-outline';
  if (status === 'failed') return 'close-circle-outline';

  return 'remove-circle-outline';
}

function getStatusLabel(status: string) {
  if (status === 'success') return 'Updated';
  if (status === 'failed') return 'Failed';

  return 'Skipped';
}

export default function InvestmentPriceSyncHistoryScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [historyItems, setHistoryItems] = useState<InvestmentPriceSyncHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadHistory() {
    setIsLoading(true);

    const items = await loadInvestmentPriceSyncHistory();

    setHistoryItems(items);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadHistory();
  }, []);

  function handleClearHistory() {
    Alert.alert(
      'Clear Sync History',
      'Delete all price sync history from this device?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearInvestmentPriceSyncHistory();
            setHistoryItems([]);
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
            Manual price sync
          </AppText>

          <AppText variant="title">Sync History</AppText>
        </View>

        <Pressable
          onPress={handleClearHistory}
          disabled={historyItems.length === 0}
          style={[styles.clearButton, historyItems.length === 0 && styles.disabledButton]}
        >
          <Ionicons name="trash-outline" size={20} color={colors.expense} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.emptyCard}>
          <Ionicons name="sync-outline" size={24} color={colors.textMuted} />

          <AppText variant="body" muted style={styles.emptyText}>
            Loading sync history...
          </AppText>
        </View>
      ) : historyItems.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="time-outline" size={24} color={colors.textMuted} />

          <AppText variant="subtitle" style={styles.emptyTitle}>
            No sync history yet
          </AppText>

          <AppText variant="body" muted style={styles.emptyText}>
            Run manual Sync Prices from Investments to see detailed results here.
          </AppText>
        </View>
      ) : (
        <View style={styles.historyList}>
          {historyItems.map((item) => (
            <View key={item.id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <View style={styles.historyIcon}>
                  <Ionicons name="cloud-done-outline" size={19} color={colors.investment} />
                </View>

                <View style={styles.historyTitleBox}>
                  <AppText variant="body" style={styles.historyTitle}>
                    {formatSyncDate(item.syncedAt)}
                  </AppText>

                  <AppText variant="caption" muted numberOfLines={2}>
                    {item.summary}
                  </AppText>
                </View>
              </View>

              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <AppText variant="caption" muted>
                    Updated
                  </AppText>

                  <AppText variant="body" style={[styles.summaryValue, { color: colors.income }]}>
                    {item.successCount}
                  </AppText>
                </View>

                <View style={styles.summaryItem}>
                  <AppText variant="caption" muted>
                    Failed
                  </AppText>

                  <AppText variant="body" style={[styles.summaryValue, { color: colors.expense }]}>
                    {item.failedCount}
                  </AppText>
                </View>

                <View style={styles.summaryItem}>
                  <AppText variant="caption" muted>
                    Skipped
                  </AppText>

                  <AppText variant="body" style={styles.summaryValue}>
                    {item.skippedCount}
                  </AppText>
                </View>
              </View>

              <View style={styles.providerRow}>
                <Ionicons name="link-outline" size={15} color={colors.textMuted} />

                <AppText variant="caption" muted numberOfLines={1} style={styles.providerText}>
                  {item.providers.length > 0 ? item.providers.join(', ') : 'No provider used'}
                </AppText>
              </View>

              <View style={styles.detailList}>
                {item.details.map((detail) => {
                  const statusColor =
                    detail.status === 'success'
                      ? colors.income
                      : detail.status === 'failed'
                        ? colors.expense
                        : colors.textMuted;

                  return (
                    <View key={`${item.id}-${detail.holdingId}-${detail.status}`} style={styles.detailRow}>
                      <View style={styles.detailIcon}>
                        <Ionicons
                          name={getStatusIcon(detail.status) as any}
                          size={17}
                          color={statusColor}
                        />
                      </View>

                      <View style={styles.detailTextBox}>
                        <View style={styles.detailTopRow}>
                          <AppText variant="caption" style={styles.detailSymbol} numberOfLines={1}>
                            {detail.symbol}
                          </AppText>

                          <AppText variant="caption" style={[styles.detailStatus, { color: statusColor }]}>
                            {getStatusLabel(detail.status)}
                          </AppText>
                        </View>

                        <AppText variant="caption" muted numberOfLines={1}>
                          {detail.name} • {detail.assetType.toUpperCase()} • {detail.provider || 'Manual'}
                        </AppText>

                        <AppText variant="caption" muted numberOfLines={2} style={styles.detailMessage}>
                          {detail.status === 'success'
                            ? `${formatCompactCurrency(detail.oldPrice, detail.currency)} → ${formatCompactCurrency(
                                detail.newPrice,
                                detail.currency
                              )}`
                            : detail.message || 'Last/manual price is kept.'}
                        </AppText>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      )}
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
    clearButton: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    disabledButton: {
      opacity: 0.45,
    },
    emptyCard: {
      minHeight: 190,
      borderRadius: 26,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: {
      marginTop: 12,
      textAlign: 'center',
    },
    emptyText: {
      marginTop: 8,
      textAlign: 'center',
      lineHeight: 21,
    },
    historyList: {
      gap: 14,
    },
    historyCard: {
      borderRadius: 26,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 14,
    },
    historyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    historyIcon: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    historyTitleBox: {
      flex: 1,
      minWidth: 0,
    },
    historyTitle: {
      color: colors.text,
      fontWeight: '900',
      marginBottom: 4,
    },
    summaryGrid: {
      flexDirection: 'row',
      gap: 10,
    },
    summaryItem: {
      flex: 1,
      minWidth: 0,
      borderRadius: 17,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 11,
    },
    summaryValue: {
      marginTop: 5,
      color: colors.text,
      fontWeight: '900',
    },
    providerRow: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    providerText: {
      flex: 1,
      minWidth: 0,
    },
    detailList: {
      gap: 9,
    },
    detailRow: {
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 11,
      flexDirection: 'row',
      gap: 10,
    },
    detailIcon: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailTextBox: {
      flex: 1,
      minWidth: 0,
    },
    detailTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 3,
    },
    detailSymbol: {
      color: colors.text,
      fontWeight: '900',
      flex: 1,
    },
    detailStatus: {
      fontWeight: '900',
    },
    detailMessage: {
      marginTop: 4,
      lineHeight: 18,
    },
  });
}
