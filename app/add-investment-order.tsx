import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { NumericAmountInput } from '../src/components/ui/NumericAmountInput';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useFinanceStore } from '../src/stores/useFinanceStore';
import { Currency, InvestmentHolding, InvestmentOrderType } from '../src/types/finance';
import { formatCurrency } from '../src/utils/currency';
import { convertCurrencyAmount } from '../src/utils/currencyConversion';
import { formatCompactCurrency } from '../src/utils/formatCompactCurrency';

function parseNumber(value: string) {
  const parsedValue = Number(value || 0);

  if (!Number.isFinite(parsedValue)) {
    return 0;
  }

  return parsedValue;
}

function getHoldingValue(holding: InvestmentHolding) {
  return holding.quantity * holding.currentPrice;
}

const currencies: Currency[] = ['IDR', 'USD', 'EUR'];

function formatQuantity(value: number) {
  return value.toLocaleString('id-ID', {
    maximumFractionDigits: 8,
  });
}

function formatQuantityInput(value: number) {
  if (!Number.isFinite(value)) {
    return '0';
  }

  const fixedValue = value.toFixed(8);
  return fixedValue.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

export default function AddInvestmentOrderScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ holdingId?: string; type?: InvestmentOrderType }>();

  const accounts = useFinanceStore((state) => state.accounts);
  const investmentHoldings = useFinanceStore((state) => state.investmentHoldings);
  const addInvestmentOrder = useFinanceStore((state) => state.addInvestmentOrder);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);
  const exchangeRates = useFinanceStore((state) => state.exchangeRates);

  const holding = investmentHoldings.find((item) => item.id === params.holdingId);
  const account = accounts.find((item) => item.id === holding?.accountId);

  const [orderType, setOrderType] = useState<InvestmentOrderType>(
    params.type === 'sell' ? 'sell' : 'buy'
  );
  const [orderInputMode, setOrderInputMode] = useState<'amount' | 'quantity'>('quantity');
  const [orderAmount, setOrderAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [orderCurrency, setOrderCurrency] = useState<Currency>(
    holding ? holding.currency : defaultCurrency
  );
  const [price, setPrice] = useState(holding ? String(holding.currentPrice) : '');
  const [fee, setFee] = useState('');
  const [note, setNote] = useState('');

  const preview = useMemo(() => {
    if (!holding || !account) {
      return {
        grossAmount: 0,
        totalAmount: 0,
        convertedTotal: 0,
        convertedRealizedPnL: 0,
        accountImpactAmount: 0,
        nextQuantity: 0,
        nextAveragePrice: 0,
      };
    }

    const parsedOrderAmount = parseNumber(orderAmount);
    const parsedInputQuantity = parseNumber(quantity);
    const parsedPrice = parseNumber(price);
    const parsedFee = parseNumber(fee);
    const parsedQuantity =
      orderInputMode === 'amount'
        ? parsedPrice > 0
          ? parsedOrderAmount / parsedPrice
          : 0
        : parsedInputQuantity;
    const grossAmount =
      orderInputMode === 'amount' ? parsedOrderAmount : parsedQuantity * parsedPrice;
    const totalAmount =
      orderType === 'buy'
        ? grossAmount + parsedFee
        : Math.max(grossAmount - parsedFee, 0);

    const convertedTotal = convertCurrencyAmount(
      totalAmount,
      orderCurrency,
      defaultCurrency,
      exchangeRates
    );

    const accountImpactAmount = convertCurrencyAmount(
      totalAmount,
      orderCurrency,
      account.currency,
      exchangeRates
    );

    const priceInHoldingCurrency = convertCurrencyAmount(
      parsedPrice,
      orderCurrency,
      holding.currency,
      exchangeRates
    );

    const feeInHoldingCurrency = convertCurrencyAmount(
      parsedFee,
      orderCurrency,
      holding.currency,
      exchangeRates
    );

    const averagePriceInOrderCurrency = convertCurrencyAmount(
      holding.averagePrice,
      holding.currency,
      orderCurrency,
      exchangeRates
    );

    let nextQuantity = holding.quantity;
    let nextAveragePrice = holding.averagePrice;

    if (orderType === 'buy') {
      const oldCost = holding.quantity * holding.averagePrice;
      const additionalCost =
        parsedQuantity * priceInHoldingCurrency + feeInHoldingCurrency;

      nextQuantity = holding.quantity + parsedQuantity;
      nextAveragePrice =
        nextQuantity > 0 ? (oldCost + additionalCost) / nextQuantity : holding.averagePrice;
    } else {
      nextQuantity = Math.max(holding.quantity - parsedQuantity, 0);
    }

    const realizedPnL =
      orderType === 'sell'
        ? (parsedPrice - averagePriceInOrderCurrency) * parsedQuantity - parsedFee
        : 0;
    const convertedRealizedPnL = convertCurrencyAmount(
      realizedPnL,
      orderCurrency,
      defaultCurrency,
      exchangeRates
    );

    return {
      grossAmount,
      totalAmount,
      convertedTotal,
      convertedRealizedPnL,
      accountImpactAmount,
      nextQuantity,
      nextAveragePrice,
    };
  }, [
    holding,
    account,
    orderType,
    orderInputMode,
    orderAmount,
    orderCurrency,
    quantity,
    price,
    fee,
    defaultCurrency,
    exchangeRates,
  ]);

  function handleSubmit() {
    if (!holding) {
      Alert.alert('Finance OS Mobile', 'Investment holding not found.');
      return;
    }

    const parsedPrice = parseNumber(price);
    const submitQuantity =
      orderInputMode === 'amount'
        ? parsedPrice > 0
          ? parseNumber(orderAmount) / parsedPrice
          : 0
        : parseNumber(quantity);

    const result = addInvestmentOrder({
      holdingId: holding.id,
      orderType,
      quantity: submitQuantity,
      price: parsedPrice,
      fee: parseNumber(fee),
      currency: orderCurrency,
      note,
    });

    Alert.alert('Finance OS Mobile', result.message);

    if (result.success) {
      router.back();
    }
  }

  if (!holding || !account) {
    return (
      <Screen>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
          </Pressable>

          <AppText variant="title">Holding Not Found</AppText>
        </View>

        <View style={styles.emptyCard}>
          <Ionicons name="alert-circle-outline" size={28} color={colors.textMuted} />

          <AppText variant="body" muted style={styles.emptyText}>
            This holding may have been deleted.
          </AppText>
        </View>
      </Screen>
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
            Investment order
          </AppText>

          <AppText variant="title">{orderType === 'buy' ? 'Buy Asset' : 'Sell Asset'}</AppText>
        </View>
      </View>

      <View style={styles.assetCard}>
        <View style={styles.assetIcon}>
          <Ionicons name="trending-up-outline" size={24} color={colors.investment} />
        </View>

        <View style={styles.assetTextBox}>
          <AppText variant="subtitle" style={styles.assetSymbol}>
            {holding.symbol}
          </AppText>

          <AppText variant="caption" muted numberOfLines={1}>
            {holding.name} • {account.name}
          </AppText>
        </View>

        <View style={styles.assetValueBox}>
          <AppText variant="caption" muted>
            Holding
          </AppText>

          <AppText variant="caption" style={styles.assetValue}>
            {formatCompactCurrency(
              convertCurrencyAmount(
                getHoldingValue(holding),
                holding.currency,
                defaultCurrency,
                exchangeRates
              ),
              defaultCurrency
            )}
          </AppText>
        </View>
      </View>

      <View style={styles.typeSwitch}>
        <Pressable
          onPress={() => setOrderType('buy')}
          style={[styles.typeButton, orderType === 'buy' && styles.typeButtonActive]}
        >
          <Ionicons
            name="arrow-down-circle-outline"
            size={17}
            color={orderType === 'buy' ? colors.black : colors.text}
          />

          <AppText
            variant="caption"
            style={[styles.typeButtonText, orderType === 'buy' && styles.typeButtonTextActive]}
          >
            Buy
          </AppText>
        </Pressable>

        <Pressable
          onPress={() => setOrderType('sell')}
          style={[styles.typeButton, orderType === 'sell' && styles.typeButtonActive]}
        >
          <Ionicons
            name="arrow-up-circle-outline"
            size={17}
            color={orderType === 'sell' ? colors.black : colors.text}
          />

          <AppText
            variant="caption"
            style={[styles.typeButtonText, orderType === 'sell' && styles.typeButtonTextActive]}
          >
            Sell
          </AppText>
        </Pressable>
      </View>

      <View style={styles.section}>
        <AppText variant="caption" muted style={styles.label}>
          Order Currency
        </AppText>

        <View style={styles.currencyRow}>
          {currencies.map((item) => {
            const active = item === orderCurrency;

            return (
              <Pressable
                key={item}
                onPress={() => setOrderCurrency(item)}
                style={[styles.currencyChip, active && styles.currencyChipActive]}
              >
                <Ionicons
                  name="cash-outline"
                  size={16}
                  color={active ? colors.black : colors.text}
                />

                <AppText
                  variant="caption"
                  style={[styles.currencyChipText, active && styles.currencyChipTextActive]}
                >
                  {item}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <AppText variant="caption" muted>
          Account currency: {account.currency}. Asset currency: {holding.currency}. Conversion is automatic.
        </AppText>
      </View>

      <View style={styles.modeCard}>
        <AppText variant="caption" muted style={styles.label}>
          Order Mode
        </AppText>

        <View style={styles.modeRow}>
          <Pressable
            onPress={() => setOrderInputMode('amount')}
            style={[styles.modeChip, orderInputMode === 'amount' && styles.modeChipActive]}
          >
            <Ionicons
              name="cash-outline"
              size={16}
              color={orderInputMode === 'amount' ? colors.black : colors.text}
            />

            <AppText
              variant="caption"
              style={[
                styles.modeChipText,
                orderInputMode === 'amount' && styles.modeChipTextActive,
              ]}
            >
              By Amount
            </AppText>
          </Pressable>

          <Pressable
            onPress={() => setOrderInputMode('quantity')}
            style={[styles.modeChip, orderInputMode === 'quantity' && styles.modeChipActive]}
          >
            <Ionicons
              name="layers-outline"
              size={16}
              color={orderInputMode === 'quantity' ? colors.black : colors.text}
            />

            <AppText
              variant="caption"
              style={[
                styles.modeChipText,
                orderInputMode === 'quantity' && styles.modeChipTextActive,
              ]}
            >
              By Quantity
            </AppText>
          </Pressable>
        </View>

        <AppText variant="caption" muted style={styles.modeDescription}>
          {orderInputMode === 'amount'
            ? orderType === 'buy'
              ? 'Input money amount to buy. Quantity is calculated from price.'
              : 'Input money amount to sell. Quantity is calculated from price.'
            : 'Input exact asset quantity for this order.'}
        </AppText>
      </View>

      {orderInputMode === 'amount' ? (
        <NumericAmountInput
          label={orderType === 'buy' ? 'Buy Amount' : 'Sell Amount'}
          value={orderAmount}
          onChangeText={setOrderAmount}
          placeholder="0"
          currency={orderCurrency}
          icon="cash-outline"
          quickValues={orderCurrency === 'IDR' ? ['50000', '100000', '500000', '1000000'] : ['10', '50', '100', '500']}
          helperText={
            orderType === 'buy'
              ? 'Amount of money used to buy this asset, before fee.'
              : 'Gross amount of money you want to sell, before fee.'
          }
          previewLabel={orderType === 'buy' ? 'Buy Amount' : 'Sell Amount'}
          allowDecimal
        />
      ) : (
        <NumericAmountInput
          label="Quantity"
          value={quantity}
          onChangeText={setQuantity}
          placeholder="0"
          icon="calculator-outline"
          quickValues={orderType === 'sell' ? [] : ['1', '10', '100']}
          helperText={`Current quantity: ${formatQuantity(holding.quantity)}`}
          previewLabel="Order Quantity"
          allowDecimal
        />
      )}

      {orderType === 'sell' ? (
        <View style={styles.sellQuickCard}>
          <AppText variant="caption" muted style={styles.sellQuickLabel}>
            Quick sell quantity
          </AppText>

          <View style={styles.sellQuickRow}>
            <Pressable
              onPress={() => setQuantity(formatQuantityInput(holding.quantity))}
              style={styles.sellQuickChip}
            >
              <AppText variant="caption" style={styles.sellQuickText}>
                All
              </AppText>

              <AppText variant="caption" muted numberOfLines={1}>
                {formatQuantity(holding.quantity)}
              </AppText>
            </Pressable>

            <Pressable
              onPress={() => setQuantity(formatQuantityInput(holding.quantity / 2))}
              style={styles.sellQuickChip}
            >
              <AppText variant="caption" style={styles.sellQuickText}>
                1/2
              </AppText>

              <AppText variant="caption" muted numberOfLines={1}>
                {formatQuantity(holding.quantity / 2)}
              </AppText>
            </Pressable>

            <Pressable
              onPress={() => setQuantity(formatQuantityInput(holding.quantity / 4))}
              style={styles.sellQuickChip}
            >
              <AppText variant="caption" style={styles.sellQuickText}>
                1/4
              </AppText>

              <AppText variant="caption" muted numberOfLines={1}>
                {formatQuantity(holding.quantity / 4)}
              </AppText>
            </Pressable>
          </View>
        </View>
      ) : null}

      <NumericAmountInput
        label="Price Per Unit"
        value={price}
        onChangeText={setPrice}
        placeholder="0"
        currency={orderCurrency}
        icon="pricetag-outline"
        quickValues={orderCurrency === 'IDR' ? ['1000', '10000', '100000'] : ['1', '10', '100']}
        helperText="Order price per unit."
      />

      <NumericAmountInput
        label="Fee"
        value={fee}
        onChangeText={setFee}
        placeholder="0"
        currency={orderCurrency}
        icon="receipt-outline"
        quickValues={orderCurrency === 'IDR' ? ['0', '1000', '5000'] : ['0', '1', '5']}
        helperText="Broker/exchange fee. Use 0 if there is no fee."
      />

      <View style={styles.previewCard}>
        <View style={styles.previewHeader}>
          <AppText variant="subtitle">Preview</AppText>

          <AppText variant="caption" muted>
            {defaultCurrency} base
          </AppText>
        </View>

        <View style={styles.previewGrid}>
          <View style={styles.previewItem}>
            <AppText variant="caption" muted>
              Total
            </AppText>

            <AppText variant="body" style={styles.previewValue}>
              {formatCompactCurrency(preview.convertedTotal, defaultCurrency)}
            </AppText>

            <AppText variant="caption" muted numberOfLines={1}>
              {formatCurrency(preview.convertedTotal, defaultCurrency)}
            </AppText>
          </View>

          <View style={styles.previewItem}>
            <AppText variant="caption" muted>
              {orderType === 'sell' ? 'Realized P/L' : 'Next Quantity'}
            </AppText>

            <AppText
              variant="body"
              style={[
                styles.previewValue,
                orderType === 'sell' && {
                  color: preview.convertedRealizedPnL >= 0 ? colors.income : colors.expense,
                },
              ]}
            >
              {orderType === 'sell'
                ? `${preview.convertedRealizedPnL >= 0 ? '+' : ''}${formatCompactCurrency(
                    preview.convertedRealizedPnL,
                    defaultCurrency
                  )}`
                : formatQuantity(preview.nextQuantity)}
            </AppText>

            <AppText variant="caption" muted>
              {orderType === 'sell'
                ? 'Closed profit/loss'
                : `Avg ${formatCompactCurrency(preview.nextAveragePrice, holding.currency)}`}
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.accountImpactCard}>
        <View style={styles.accountImpactIcon}>
          <Ionicons
            name={orderType === 'buy' ? 'remove-outline' : 'add-outline'}
            size={20}
            color={orderType === 'buy' ? colors.expense : colors.income}
          />
        </View>

        <View style={styles.accountImpactTextBox}>
          <AppText variant="caption" muted>
            Account Impact
          </AppText>

          <AppText variant="body" style={styles.accountImpactTitle} numberOfLines={1}>
            {account.name}
          </AppText>

          <AppText variant="caption" muted numberOfLines={2}>
            Order {formatCurrency(preview.totalAmount, orderCurrency)} will be converted to{' '}
            {account.currency}.
          </AppText>
        </View>

        <View style={styles.accountImpactValueBox}>
          <AppText
            variant="subtitle"
            style={[
              styles.accountImpactValue,
              { color: orderType === 'buy' ? colors.expense : colors.income },
            ]}
            numberOfLines={1}
          >
            {orderType === 'buy' ? '-' : '+'}
            {formatCompactCurrency(preview.accountImpactAmount, account.currency)}
          </AppText>

          <AppText variant="caption" muted numberOfLines={1}>
            {account.currency}
          </AppText>
        </View>
      </View>

      <View style={styles.field}>
        <AppText variant="caption" muted style={styles.label}>
          Note
        </AppText>

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Optional order note"
          placeholderTextColor={colors.textMuted}
          multiline
          style={[styles.input, styles.noteInput]}
        />
      </View>

      <Pressable onPress={handleSubmit} style={styles.submitButton}>
        <AppText variant="body" style={styles.submitButtonText}>
          Save {orderType === 'buy' ? 'Buy' : 'Sell'} Order
        </AppText>
      </Pressable>
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
    assetCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
      marginBottom: 16,
    },
    assetIcon: {
      width: 50,
      height: 50,
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    assetTextBox: {
      flex: 1,
      minWidth: 0,
    },
    assetSymbol: {
      fontWeight: '900',
      marginBottom: 4,
    },
    assetValueBox: {
      alignItems: 'flex-end',
      maxWidth: 110,
    },
    assetValue: {
      marginTop: 4,
      fontWeight: '900',
      color: colors.investment,
    },
    typeSwitch: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 18,
    },
    typeButton: {
      flex: 1,
      minHeight: 52,
      borderRadius: 17,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    typeButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    typeButtonText: {
      color: colors.text,
      fontWeight: '900',
    },
    typeButtonTextActive: {
      color: colors.black,
    },
    section: {
      marginBottom: 18,
      gap: 10,
    },
    currencyRow: {
      flexDirection: 'row',
      gap: 9,
    },
    currencyChip: {
      flex: 1,
      minHeight: 48,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 7,
    },
    currencyChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    currencyChipText: {
      color: colors.text,
      fontWeight: '900',
    },
    currencyChipTextActive: {
      color: colors.black,
    },
    modeCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 14,
      gap: 11,
      marginBottom: 18,
    },
    modeRow: {
      flexDirection: 'row',
      gap: 10,
    },
    modeChip: {
      flex: 1,
      minHeight: 44,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: 10,
    },
    modeChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    modeChipText: {
      color: colors.text,
      fontWeight: '900',
    },
    modeChipTextActive: {
      color: colors.black,
    },
    modeDescription: {
      lineHeight: 18,
    },
    sellQuickCard: {
      marginTop: -8,
      marginBottom: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 13,
      gap: 10,
    },
    sellQuickLabel: {
      fontWeight: '900',
    },
    sellQuickRow: {
      flexDirection: 'row',
      gap: 9,
    },
    sellQuickChip: {
      flex: 1,
      minHeight: 54,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    sellQuickText: {
      color: colors.text,
      fontWeight: '900',
      marginBottom: 4,
    },
    previewCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 16,
      gap: 14,
      marginTop: 18,
      marginBottom: 18,
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 12,
    },
    previewGrid: {
      flexDirection: 'row',
      gap: 10,
    },
    previewItem: {
      flex: 1,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 13,
    },
    previewValue: {
      marginTop: 6,
      marginBottom: 4,
      fontWeight: '900',
    },
    accountImpactCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 15,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 18,
    },
    accountImpactIcon: {
      width: 42,
      height: 42,
      borderRadius: 15,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    accountImpactTextBox: {
      flex: 1,
      minWidth: 0,
    },
    accountImpactTitle: {
      marginTop: 4,
      marginBottom: 4,
      fontWeight: '900',
    },
    accountImpactValueBox: {
      alignItems: 'flex-end',
      maxWidth: 130,
    },
    accountImpactValue: {
      fontWeight: '900',
    },
    field: {
      marginBottom: 18,
      gap: 9,
    },
    label: {
      fontWeight: '900',
    },
    input: {
      minHeight: 56,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      paddingHorizontal: 15,
      paddingVertical: 12,
      fontSize: 15,
      fontWeight: '800',
    },
    noteInput: {
      minHeight: 92,
      textAlignVertical: 'top',
    },
    submitButton: {
      minHeight: 56,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
      marginTop: 6,
    },
    submitButtonText: {
      color: colors.black,
      fontWeight: '900',
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
      marginTop: 12,
      textAlign: 'center',
      lineHeight: 21,
    },
  });
}
