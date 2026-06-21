import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { NumericAmountInput } from '../src/components/ui/NumericAmountInput';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useAppToast } from '../src/components/ui/AppToast';
import { useFinanceStore } from '../src/stores/useFinanceStore';
import { InvestmentHolding } from '../src/types/finance';
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

function getHoldingCost(holding: InvestmentHolding) {
  return holding.quantity * holding.averagePrice;
}

function getHoldingValue(holding: InvestmentHolding, currentPrice?: number) {
  return holding.quantity * (typeof currentPrice === 'number' ? currentPrice : holding.currentPrice);
}

export default function UpdateInvestmentHoldingPriceScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const toast = useAppToast();
  const params = useLocalSearchParams<{ holdingId?: string }>();

  const accounts = useFinanceStore((state) => state.accounts);
  const investmentHoldings = useFinanceStore((state) => state.investmentHoldings);
  const updateInvestmentHoldingPrice = useFinanceStore(
    (state) => state.updateInvestmentHoldingPrice
  );
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);
  const exchangeRates = useFinanceStore((state) => state.exchangeRates);

  const holding = investmentHoldings.find((item) => item.id === params.holdingId);
  const account = accounts.find((item) => item.id === holding?.accountId);

  const [currentPrice, setCurrentPrice] = useState(
    holding ? String(holding.currentPrice) : ''
  );

  const preview = useMemo(() => {
    if (!holding) {
      return {
        currentValue: 0,
        pnl: 0,
        pnlPercent: 0,
        convertedValue: 0,
      };
    }

    const nextPrice = parseNumber(currentPrice);
    const currentValue = getHoldingValue(holding, nextPrice);
    const costValue = getHoldingCost(holding);
    const pnl = currentValue - costValue;
    const pnlPercent = costValue > 0 ? (pnl / costValue) * 100 : 0;
    const convertedValue = convertCurrencyAmount(
      currentValue,
      holding.currency,
      defaultCurrency,
      exchangeRates
    );

    return {
      currentValue,
      pnl,
      pnlPercent,
      convertedValue,
    };
  }, [holding, currentPrice, defaultCurrency, exchangeRates]);

  function handleSave() {
    if (!holding) {
      toast.showWarning('Holding Missing', 'Investment holding not found.');
      return;
    }

    const result = updateInvestmentHoldingPrice({
      holdingId: holding.id,
      currentPrice: parseNumber(currentPrice),
    });

    if (!result.success) {
      toast.showError('Could Not Update Price', result.message);
      return;
    }

    toast.showSuccess('Price Updated', result.message);
    router.back();
  }

  if (!holding) {
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
            This holding may have been deleted or moved.
          </AppText>
        </View>
      </Screen>
    );
  }

  const pnlPositive = preview.pnl >= 0;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.headerText}>
          <AppText variant="caption" muted>
            Update market price
          </AppText>

          <AppText variant="title">Update Price</AppText>
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
            {holding.name} • {account?.name || 'Investment account'}
          </AppText>
        </View>
      </View>

      <NumericAmountInput
        label="Current Price"
        value={currentPrice}
        onChangeText={setCurrentPrice}
        placeholder="0"
        currency={holding.currency}
        icon="pulse-outline"
        quickValues={holding.currency === 'IDR' ? ['1000', '10000', '100000'] : ['1', '10', '100']}
        helperText="Update the latest market price per unit. This changes unrealized P/L only."
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
              New Value
            </AppText>

            <AppText variant="body" style={styles.previewValue}>
              {formatCompactCurrency(preview.convertedValue, defaultCurrency)}
            </AppText>

            <AppText variant="caption" muted numberOfLines={1}>
              {formatCurrency(preview.convertedValue, defaultCurrency)}
            </AppText>
          </View>

          <View style={styles.previewItem}>
            <AppText variant="caption" muted>
              Unrealized P/L
            </AppText>

            <AppText
              variant="body"
              style={[
                styles.previewValue,
                { color: pnlPositive ? colors.income : colors.expense },
              ]}
            >
              {pnlPositive ? '+' : ''}
              {formatCompactCurrency(preview.pnl, holding.currency)}
            </AppText>

            <AppText variant="caption" muted>
              {preview.pnlPercent.toFixed(2)}%
            </AppText>
          </View>
        </View>
      </View>

      <Pressable onPress={handleSave} style={styles.submitButton}>
        <AppText variant="body" style={styles.submitButtonText}>
          Save Current Price
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
      marginBottom: 18,
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
    previewCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 16,
      gap: 14,
      marginTop: 18,
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
    submitButton: {
      minHeight: 56,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
      marginTop: 18,
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
