import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { StatCard } from '../src/components/ui/StatCard';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useFinanceStore } from '../src/stores/useFinanceStore';
import { InvestmentOrder } from '../src/types/finance';
import { formatCurrency } from '../src/utils/currency';
import { convertCurrencyAmount } from '../src/utils/currencyConversion';
import { formatCompactCurrency } from '../src/utils/formatCompactCurrency';

function formatOrderDate(value: string) {
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

function formatQuantity(value: number) {
  return value.toLocaleString('id-ID', {
    maximumFractionDigits: 8,
  });
}

function formatOrderTypeLabel(order: InvestmentOrder) {
  return order.orderType === 'buy' ? 'Buy Order' : 'Sell Order';
}

function getSearchableOrderText(order: InvestmentOrder) {
  return [
    order.symbol,
    order.name,
    order.assetType,
    order.orderType,
    order.currency,
    order.note || '',
  ]
    .join(' ')
    .toLowerCase();
}

function getOrderTone(order: InvestmentOrder, colors: ThemeColors) {
  if (order.orderType === 'buy') return colors.income;
  return colors.expense;
}

type OrderFilter = 'all' | 'buy' | 'sell' | 'profit' | 'loss';

const orderFilters: {
  label: string;
  value: OrderFilter;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { label: 'All', value: 'all', icon: 'apps-outline' },
  { label: 'Buy', value: 'buy', icon: 'arrow-down-outline' },
  { label: 'Sell', value: 'sell', icon: 'arrow-up-outline' },
  { label: 'Profit', value: 'profit', icon: 'trending-up-outline' },
  { label: 'Loss', value: 'loss', icon: 'trending-down-outline' },
];

function filterOrders(orders: InvestmentOrder[], filter: OrderFilter) {
  if (filter === 'buy') {
    return orders.filter((order) => order.orderType === 'buy');
  }

  if (filter === 'sell') {
    return orders.filter((order) => order.orderType === 'sell');
  }

  if (filter === 'profit') {
    return orders.filter((order) => order.orderType === 'sell' && order.realizedPnL > 0);
  }

  if (filter === 'loss') {
    return orders.filter((order) => order.orderType === 'sell' && order.realizedPnL < 0);
  }

  return orders;
}

export default function InvestmentOrdersScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const investmentOrders = useFinanceStore((state) => state.investmentOrders);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);
  const exchangeRates = useFinanceStore((state) => state.exchangeRates);
  const [activeFilter, setActiveFilter] = useState<OrderFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filteredByType = filterOrders(investmentOrders, activeFilter);

    if (!normalizedQuery) {
      return filteredByType;
    }

    return filteredByType.filter((order) => {
      return getSearchableOrderText(order).includes(normalizedQuery);
    });
  }, [investmentOrders, activeFilter, searchQuery]);

  const summary = useMemo(() => {
    const buyOrders = filteredOrders.filter((order) => order.orderType === 'buy');
    const sellOrders = filteredOrders.filter((order) => order.orderType === 'sell');

    const buyValue = buyOrders.reduce((total, order) => {
      return (
        total +
        convertCurrencyAmount(
          order.totalAmount,
          order.currency,
          defaultCurrency,
          exchangeRates
        )
      );
    }, 0);

    const sellValue = sellOrders.reduce((total, order) => {
      return (
        total +
        convertCurrencyAmount(
          order.totalAmount,
          order.currency,
          defaultCurrency,
          exchangeRates
        )
      );
    }, 0);

    const realizedPnL = sellOrders.reduce((total, order) => {
      return (
        total +
        convertCurrencyAmount(
          order.realizedPnL,
          order.currency,
          defaultCurrency,
          exchangeRates
        )
      );
    }, 0);

    return {
      buyCount: buyOrders.length,
      sellCount: sellOrders.length,
      buyValue,
      sellValue,
      realizedPnL,
    };
  }, [filteredOrders, defaultCurrency, exchangeRates]);

  const realizedPositive = summary.realizedPnL >= 0;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.headerText}>
          <AppText variant="caption" muted>
            Buy / sell records
          </AppText>

          <AppText variant="title">Order History</AppText>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons name="receipt-outline" size={26} color={colors.black} />
        </View>

        <View style={styles.heroTextBox}>
          <AppText variant="caption" style={styles.heroLabel}>
            Realized P/L • {defaultCurrency} base
          </AppText>

          <AppText
            variant="title"
            style={[
              styles.heroValue,
              { color: realizedPositive ? colors.black : colors.expense },
            ]}
            numberOfLines={1}
          >
            {realizedPositive ? '+' : ''}
            {formatCompactCurrency(summary.realizedPnL, defaultCurrency)}
          </AppText>

          <AppText variant="caption" style={styles.heroSubValue} numberOfLines={1}>
            {formatCurrency(summary.realizedPnL, defaultCurrency)}
          </AppText>
        </View>
      </View>

      <View style={styles.grid}>
        <StatCard label="Buy Orders" value={`${summary.buyCount}`} tone="income" />
        <StatCard label="Sell Orders" value={`${summary.sellCount}`} tone="expense" />
        <StatCard
          label="Buy Value"
          value={formatCompactCurrency(summary.buyValue, defaultCurrency)}
          tone="transfer"
        />
        <StatCard
          label="Sell Value"
          value={formatCompactCurrency(summary.sellValue, defaultCurrency)}
          tone="saving"
        />
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Orders</AppText>

        <AppText variant="caption" muted>
          {filteredOrders.length} of {investmentOrders.length} record
        </AppText>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={19} color={colors.textMuted} />

        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search symbol, name, note..."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          style={styles.searchInput}
        />

        {searchQuery.trim() ? (
          <Pressable
            onPress={() => {
              setSearchQuery('');
              setExpandedOrderId(null);
            }}
            style={styles.clearSearchButton}
          >
            <Ionicons name="close-outline" size={17} color={colors.text} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filterRow}>
        {orderFilters.map((filter) => {
          const active = activeFilter === filter.value;

          return (
            <Pressable
              key={filter.value}
              onPress={() => {
                setActiveFilter(filter.value);
                setExpandedOrderId(null);
              }}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Ionicons
                name={filter.icon}
                size={15}
                color={active ? colors.black : colors.text}
              />

              <AppText
                variant="caption"
                style={[styles.filterText, active && styles.filterTextActive]}
              >
                {filter.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {investmentOrders.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="receipt-outline" size={28} color={colors.textMuted} />

          <AppText variant="subtitle" style={styles.emptyTitle}>
            No investment orders yet
          </AppText>

          <AppText variant="body" muted style={styles.emptyText}>
            Buy and sell orders will appear here after you record investment activity.
          </AppText>
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="filter-outline" size={28} color={colors.textMuted} />

          <AppText variant="subtitle" style={styles.emptyTitle}>
            No matching orders
          </AppText>

          <AppText variant="body" muted style={styles.emptyText}>
            Try another filter or clear the search keyword.
          </AppText>
        </View>
      ) : (
        <View style={styles.orderList}>
          {filteredOrders.map((order) => {
            const tone = getOrderTone(order, colors);
            const orderIsBuy = order.orderType === 'buy';
            const realizedPnlPositive = order.realizedPnL >= 0;
            const convertedTotal = convertCurrencyAmount(
              order.totalAmount,
              order.currency,
              defaultCurrency,
              exchangeRates
            );

            return (
              <Pressable
                key={order.id}
                onPress={() =>
                  setExpandedOrderId((currentId) =>
                    currentId === order.id ? null : order.id
                  )
                }
                style={[
                  styles.orderCard,
                  expandedOrderId === order.id && styles.orderCardExpanded,
                ]}
              >
                <View style={styles.orderHeader}>
                  <View style={styles.orderIcon}>
                    <Ionicons
                      name={orderIsBuy ? 'arrow-down-outline' : 'arrow-up-outline'}
                      size={22}
                      color={tone}
                    />
                  </View>

                  <View style={styles.orderTitleBox}>
                    <AppText variant="body" style={styles.orderTitle} numberOfLines={1}>
                      {formatOrderTypeLabel(order)} • {order.symbol}
                    </AppText>

                    <AppText variant="caption" muted numberOfLines={1}>
                      {order.name} • {formatOrderDate(order.date)}
                    </AppText>
                  </View>

                  <View style={styles.orderValueBox}>
                    <AppText variant="body" style={styles.orderTotal} numberOfLines={1}>
                      {formatCompactCurrency(convertedTotal, defaultCurrency)}
                    </AppText>

                    <AppText variant="caption" muted numberOfLines={1}>
                      {defaultCurrency} base
                    </AppText>

                    <Ionicons
                      name={expandedOrderId === order.id ? 'chevron-up-outline' : 'chevron-down-outline'}
                      size={16}
                      color={colors.textMuted}
                      style={styles.expandIcon}
                    />
                  </View>
                </View>

                <View style={styles.metricRow}>
                  <Metric colors={colors} label="Qty" value={formatQuantity(order.quantity)} />
                  <Metric
                    colors={colors}
                    label="Price"
                    value={formatCompactCurrency(order.price, order.currency)}
                  />
                  <Metric
                    colors={colors}
                    label="Fee"
                    value={formatCompactCurrency(order.fee, order.currency)}
                  />
                </View>

                {!orderIsBuy ? (
                  <View style={styles.pnlRow}>
                    <AppText variant="caption" muted>
                      Realized P/L
                    </AppText>

                    <AppText
                      variant="caption"
                      style={[
                        styles.pnlValue,
                        { color: realizedPnlPositive ? colors.income : colors.expense },
                      ]}
                    >
                      {realizedPnlPositive ? '+' : ''}
                      {formatCurrency(order.realizedPnL, order.currency)}
                    </AppText>
                  </View>
                ) : null}

                {expandedOrderId === order.id ? (
                  <View style={styles.expandedDetailCard}>
                    <View style={styles.expandedDetailHeader}>
                      <AppText variant="caption" style={styles.expandedDetailTitle}>
                        Order Detail
                      </AppText>

                      <AppText variant="caption" muted>
                        {order.currency} original
                      </AppText>
                    </View>

                    <View style={styles.expandedDetailGrid}>
                      <DetailItem
                        colors={colors}
                        label="Original Total"
                        value={formatCurrency(order.totalAmount, order.currency)}
                      />
                      <DetailItem
                        colors={colors}
                        label="Gross"
                        value={formatCurrency(order.grossAmount, order.currency)}
                      />
                      <DetailItem
                        colors={colors}
                        label="Fee"
                        value={formatCurrency(order.fee, order.currency)}
                      />
                      <DetailItem
                        colors={colors}
                        label="Price"
                        value={formatCurrency(order.price, order.currency)}
                      />
                    </View>

                    {order.note ? (
                      <View style={styles.expandedNoteBox}>
                        <AppText variant="caption" muted>
                          Note
                        </AppText>

                        <AppText variant="caption" style={styles.expandedNoteText}>
                          {order.note}
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                ) : order.note ? (
                  <AppText variant="caption" muted style={styles.noteText} numberOfLines={2}>
                    {order.note}
                  </AppText>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function Metric({
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
    <View style={styles.metricItem}>
      <AppText variant="caption" muted>
        {label}
      </AppText>

      <AppText variant="caption" style={styles.metricValue} numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

function DetailItem({
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
    <View style={styles.detailItem}>
      <AppText variant="caption" muted numberOfLines={1}>
        {label}
      </AppText>

      <AppText variant="caption" style={styles.detailValue} numberOfLines={1}>
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
    },
    heroSubValue: {
      marginTop: 4,
      color: 'rgba(0,0,0,0.62)',
      fontWeight: '800',
    },
    grid: {
      marginTop: 18,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
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
    searchBox: {
      minHeight: 52,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
      paddingVertical: 12,
    },
    clearSearchButton: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 9,
      marginBottom: 14,
    },
    filterChip: {
      minHeight: 38,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterText: {
      color: colors.text,
      fontWeight: '900',
    },
    filterTextActive: {
      color: colors.black,
    },
    orderList: {
      gap: 12,
    },
    orderCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 15,
      gap: 14,
    },
    orderCardExpanded: {
      borderColor: colors.investment,
      backgroundColor: colors.surface,
    },
    orderHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    orderIcon: {
      width: 46,
      height: 46,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    orderTitleBox: {
      flex: 1,
      minWidth: 0,
    },
    orderTitle: {
      fontWeight: '900',
      marginBottom: 4,
    },
    orderValueBox: {
      alignItems: 'flex-end',
      maxWidth: 125,
    },
    orderTotal: {
      fontWeight: '900',
      color: colors.investment,
    },
    expandIcon: {
      marginTop: 4,
    },
    metricRow: {
      flexDirection: 'row',
      gap: 9,
    },
    metricItem: {
      flex: 1,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 16,
      padding: 11,
    },
    metricValue: {
      marginTop: 5,
      color: colors.text,
      fontWeight: '900',
    },
    pnlRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
    },
    pnlValue: {
      fontWeight: '900',
    },
    noteText: {
      lineHeight: 18,
    },
    expandedDetailCard: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
      gap: 12,
    },
    expandedDetailHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    expandedDetailTitle: {
      color: colors.text,
      fontWeight: '900',
    },
    expandedDetailGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 9,
    },
    detailItem: {
      width: '48%',
      minHeight: 58,
      borderRadius: 15,
      backgroundColor: colors.surfaceSoft,
      padding: 10,
      justifyContent: 'center',
    },
    detailValue: {
      marginTop: 5,
      color: colors.text,
      fontWeight: '900',
    },
    expandedNoteBox: {
      borderRadius: 15,
      backgroundColor: colors.surfaceSoft,
      padding: 11,
    },
    expandedNoteText: {
      marginTop: 5,
      color: colors.text,
      lineHeight: 18,
    },
  });
}
