import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { NumericAmountInput } from '../src/components/ui/NumericAmountInput';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { fetchInvestmentPriceForHolding, isPriceSyncSupportedHolding } from '../src/services/investmentPriceSync';
import { useFinanceStore } from '../src/stores/useFinanceStore';
import { Category, Currency } from '../src/types/finance';
import { formatCurrency } from '../src/utils/currency';

const currencies: Currency[] = ['IDR', 'USD', 'EUR'];

function parseNumber(value: string) {
  const parsedValue = Number(value || 0);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function formatQuantity(value: number) {
  return value.toLocaleString('id-ID', { maximumFractionDigits: 8 });
}

export default function AddCryptoExpenseScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ holdingId?: string }>();

  const categories = useFinanceStore((state) => state.categories);
  const holdings = useFinanceStore((state) => state.investmentHoldings);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);
  const exchangeRates = useFinanceStore((state) => state.exchangeRates);
  const addCryptoExpense = useFinanceStore((state) => state.addCryptoExpense);

  const cryptoHoldings = useMemo(
    () => holdings.filter((holding) => holding.assetType === 'crypto' && holding.quantity > 0),
    [holdings]
  );
  const expenseCategories = useMemo(
    () => categories.filter((category) => category.isActive && category.type === 'expense'),
    [categories]
  );

  const [holdingId, setHoldingId] = useState(params.holdingId || cryptoHoldings[0]?.id || '');
  const [title, setTitle] = useState('');
  const [expenseCategoryId, setExpenseCategoryId] = useState(expenseCategories[0]?.id || '');
  const [quantity, setQuantity] = useState('');
  const [rateCurrency, setRateCurrency] = useState<Currency>(defaultCurrency);
  const [rate, setRate] = useState('');
  const [rateProvider, setRateProvider] = useState('');
  const [rateStatus, setRateStatus] = useState('Choose crypto holding. Rate will be detected automatically when available.');
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [note, setNote] = useState('');

  const selectedHolding = cryptoHoldings.find((holding) => holding.id === holdingId);
  const parsedQuantity = parseNumber(quantity);
  const parsedRate = parseNumber(rate);
  const estimatedValue = parsedQuantity * parsedRate;

  useEffect(() => {
    if (!params.holdingId) {
      return;
    }

    const targetHolding = cryptoHoldings.find(
      (holding) => holding.id === params.holdingId
    );

    if (!targetHolding) {
      return;
    }

    setHoldingId(targetHolding.id);
  }, [params.holdingId, cryptoHoldings]);

  useEffect(() => {
    if (!selectedHolding) return;
    setRateCurrency(selectedHolding.currency);
  }, [selectedHolding?.id]);

  useEffect(() => {
    if (!selectedHolding) {
      setIsFetchingRate(false);
      setRateProvider('');
      setRateStatus('Choose crypto holding. Rate will be detected automatically when available.');
      return;
    }

    if (!isPriceSyncSupportedHolding(selectedHolding)) {
      setIsFetchingRate(false);
      setRateProvider('');
      setRateStatus('Realtime rate is not available for this crypto. Please input rate manually.');
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setIsFetchingRate(true);
      setRateStatus('Detecting actual crypto rate...');

      try {
        const result = await fetchInvestmentPriceForHolding(selectedHolding, exchangeRates);

        if (cancelled) return;

        setRate(String(result.currentPrice));
        setRateProvider(result.provider);
        setRateStatus(`Actual crypto rate detected from ${result.provider}.`);
      } catch (error) {
        if (cancelled) return;

        setRateProvider('');
        setRateStatus(
          error instanceof Error
            ? `${error.message} You can input rate manually.`
            : 'Unable to detect crypto rate. You can input rate manually.'
        );
      } finally {
        if (!cancelled) setIsFetchingRate(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [selectedHolding?.id, rateCurrency, exchangeRates]);

  function handleSubmit() {
    if (!selectedHolding) {
      Alert.alert('Finance OS Mobile', 'Choose crypto holding first.');
      return;
    }

    const result = addCryptoExpense({
      holdingId: selectedHolding.id,
      title: title.trim() || `Crypto Payment ${selectedHolding.symbol}`,
      categoryId: expenseCategoryId || expenseCategories[0]?.id,
      quantity: parsedQuantity,
      rate: parsedRate,
      rateCurrency,
      note,
      provider: rateProvider || undefined,
    });

    Alert.alert('Finance OS Mobile', result.message);

    if (result.success) {
      router.back();
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.headerText}>
          <AppText variant="caption" muted>Crypto transaction</AppText>
          <AppText variant="title">Crypto Payment</AppText>
        </View>
      </View>

      {cryptoHoldings.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="logo-bitcoin" size={30} color={colors.textMuted} />
          <AppText variant="subtitle" style={styles.emptyTitle}>No crypto holding</AppText>
          <AppText variant="body" muted style={styles.emptyText}>
            Add crypto income or create a crypto holding before paying with crypto.
          </AppText>
        </View>
      ) : (
        <>
          <View style={styles.sectionMiniHeader}>
            <View>
              <AppText variant="caption" muted>
                Step 1
              </AppText>

              <AppText variant="subtitle" style={styles.sectionMiniTitle}>
                Pay from holding
              </AppText>
            </View>

            <AppText variant="caption" muted style={styles.sectionMiniHint}>
              Source
            </AppText>
          </View>

          <View style={styles.card}>
            <AppText variant="caption" muted style={styles.label}>Pay From Crypto Holding</AppText>

            <View style={styles.optionGrid}>
              {cryptoHoldings.map((holding) => {
                const active = holding.id === holdingId;

                return (
                  <Pressable
                    key={holding.id}
                    onPress={() => setHoldingId(holding.id)}
                    style={[styles.optionChip, active && styles.optionChipActive]}
                  >
                    <Ionicons name="logo-bitcoin" size={16} color={active ? colors.black : colors.text} />
                    <View style={styles.optionTextBox}>
                      <AppText variant="caption" style={[styles.optionText, active && styles.optionTextActive]} numberOfLines={1}>
                        {holding.symbol}
                      </AppText>
                      <AppText variant="caption" muted={!active} numberOfLines={1}>
                        {formatQuantity(holding.quantity)} available
                      </AppText>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.sectionMiniHeader}>
            <View>
              <AppText variant="caption" muted>
                Step 2
              </AppText>

              <AppText variant="subtitle" style={styles.sectionMiniTitle}>
                Payment detail
              </AppText>
            </View>

            <AppText variant="caption" muted style={styles.sectionMiniHint}>
              Title & category
            </AppText>
          </View>

          <View style={styles.card}>
            <View style={styles.fieldInner}>
              <AppText variant="caption" muted style={styles.label}>Transaction Title</AppText>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Example: Paid hosting"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
            </View>

            <View style={styles.fieldInner}>
              <AppText variant="caption" muted style={styles.label}>Expense Category</AppText>

              <CategoryPicker
                categories={expenseCategories}
                selectedCategoryId={expenseCategoryId}
                onSelect={setExpenseCategoryId}
                colors={colors}
              />
            </View>
          </View>

          <View style={styles.sectionMiniHeader}>
            <View>
              <AppText variant="caption" muted>
                Step 3
              </AppText>

              <AppText variant="subtitle" style={styles.sectionMiniTitle}>
                Quantity & rate
              </AppText>
            </View>

            <AppText variant="caption" muted style={styles.sectionMiniHint}>
              Payment value
            </AppText>
          </View>

          <View style={styles.card}>
            <NumericAmountInput
              label={`Quantity ${selectedHolding?.symbol || ''}`}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="0"
              icon="calculator-outline"
              quickValues={['0.001', '0.01', '0.1', '1']}
              helperText={`Available: ${selectedHolding ? formatQuantity(selectedHolding.quantity) : '0'}`}
              allowDecimal
            />

            <View style={styles.currencyRow}>
              {currencies.map((currency) => {
                const active = currency === rateCurrency;

                return (
                  <Pressable
                    key={currency}
                    onPress={() => setRateCurrency(currency)}
                    style={[styles.currencyChip, active && styles.currencyChipActive]}
                  >
                    <AppText variant="caption" style={[styles.currencyText, active && styles.currencyTextActive]}>
                      {currency}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.rateStatusCard}>
              <View style={styles.rateStatusIcon}>
                <Ionicons name={isFetchingRate ? 'sync-outline' : rateProvider ? 'flash-outline' : 'create-outline'} size={17} color={rateProvider ? colors.black : colors.text} />
              </View>

              <View style={styles.rateStatusTextBox}>
                <AppText variant="caption" muted>Rate per 1 {selectedHolding?.symbol || 'crypto'}</AppText>
                <AppText variant="body" style={styles.rateStatusTitle}>
                  {isFetchingRate ? 'Detecting rate...' : rateProvider ? 'Realtime rate detected' : 'Manual fallback available'}
                </AppText>
                <AppText variant="caption" muted style={styles.rateStatusText}>{rateStatus}</AppText>
              </View>
            </View>

            <NumericAmountInput
              label={`Rate per 1 ${selectedHolding?.symbol || 'crypto'}`}
              value={rate}
              onChangeText={setRate}
              placeholder="0"
              currency={rateCurrency}
              icon="pricetag-outline"
              quickValues={rateCurrency === 'IDR' ? ['1000', '10000', '100000'] : ['1', '10', '100']}
              helperText="Auto-filled when supported. Input manually if unavailable."
              allowDecimal
            />
          </View>

          <View style={styles.sectionMiniHeader}>
            <View>
              <AppText variant="caption" muted>
                Step 4
              </AppText>

              <AppText variant="subtitle" style={styles.sectionMiniTitle}>
                Preview & save
              </AppText>
            </View>

            <AppText variant="caption" muted style={styles.sectionMiniHint}>
              Check value
            </AppText>
          </View>

          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View>
                <AppText variant="caption" muted>Estimated Payment Value</AppText>

                <AppText variant="title" style={styles.previewValue} numberOfLines={1}>
                  {formatCurrency(estimatedValue, rateCurrency)}
                </AppText>
              </View>

              <View style={styles.previewIcon}>
                <Ionicons name="arrow-up-circle-outline" size={22} color={colors.black} />
              </View>
            </View>

            <AppText variant="caption" style={styles.previewDescription} numberOfLines={1}>
              {quantity || '0'} {selectedHolding?.symbol || 'CRYPTO'} · {rateCurrency}
            </AppText>
          </View>

          <View style={styles.field}>
            <AppText variant="caption" muted style={styles.label}>Note</AppText>
            <TextInput value={note} onChangeText={setNote} placeholder="Optional note" placeholderTextColor={colors.textMuted} multiline style={[styles.input, styles.noteInput]} />
          </View>

          <Pressable onPress={handleSubmit} style={styles.submitButton}>
            <Ionicons name="checkmark-circle-outline" size={19} color={colors.black} />

            <AppText variant="body" style={styles.submitText}>Save Crypto Payment</AppText>
          </Pressable>
        </>
      )}
    </Screen>
  );
}


function CategoryPicker({
  categories,
  selectedCategoryId,
  onSelect,
  colors,
}: {
  categories: Category[];
  selectedCategoryId: string;
  onSelect: (categoryId: string) => void;
  colors: ThemeColors;
}) {
  const styles = createStyles(colors);

  if (categories.length === 0) {
    return (
      <View style={styles.emptyCategoryBox}>
        <AppText variant="caption" muted>
          No categories available.
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.categoryList}>
      {categories.map((category) => {
        const active = category.id === selectedCategoryId;
        const categoryDescription =
          category.type === 'income'
            ? 'Income category'
            : 'Expense category';

        return (
          <Pressable
            key={category.id}
            onPress={() => onSelect(category.id)}
            style={[styles.categoryCard, active && styles.categoryCardActive]}
          >
            <View style={styles.categoryTextBox}>
              <AppText
                variant="body"
                style={[styles.categoryName, active && styles.categoryNameActive]}
                numberOfLines={1}
              >
                {category.name}
              </AppText>

              <AppText
                variant="caption"
                muted={!active}
                style={[styles.categoryDescription, active && styles.categoryDescriptionActive]}
                numberOfLines={1}
              >
                {categoryDescription}
              </AppText>
            </View>

            <View style={[styles.categoryRadio, active && styles.categoryRadioActive]}>
              {active ? <View style={styles.categoryRadioDot} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}


function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: { marginBottom: 22, flexDirection: 'row', alignItems: 'center', gap: 14 },
    backButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    headerText: { flex: 1, minWidth: 0 },
    card: { marginBottom: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 14, gap: 12 },
    sectionMiniHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginTop: 4, marginBottom: 10 },
    sectionMiniTitle: { marginTop: 3, color: colors.text },
    sectionMiniHint: { fontWeight: '900' },
    label: { fontWeight: '900' },
    fieldInner: { gap: 8 },
    optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
    optionChip: { minHeight: 50, width: '48%', borderRadius: 17, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
    optionChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    optionTextBox: { flex: 1, minWidth: 0 },
    optionText: { color: colors.text, fontWeight: '900' },
    optionTextActive: { color: colors.black },
    categoryList: { gap: 9 },
    categoryCard: { minHeight: 58, borderRadius: 18, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
    categoryCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    categoryTextBox: { flex: 1, minWidth: 0 },
    categoryName: { color: colors.text, fontWeight: '900' },
    categoryNameActive: { color: colors.black },
    categoryDescription: { marginTop: 3, lineHeight: 16 },
    categoryDescriptionActive: { color: 'rgba(0,0,0,0.62)' },
    categoryRadio: { width: 22, height: 22, borderRadius: 999, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    categoryRadioActive: { borderColor: colors.black },
    categoryRadioDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: colors.black },
    emptyCategoryBox: { minHeight: 42, borderRadius: 15, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, justifyContent: 'center' },
    currencyRow: { flexDirection: 'row', gap: 9 },
    currencyChip: { minHeight: 40, borderRadius: 14, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
    currencyChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    currencyText: { color: colors.text, fontWeight: '900' },
    currencyTextActive: { color: colors.black },
    rateStatusCard: { borderRadius: 18, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border, padding: 12, flexDirection: 'row', gap: 10 },
    rateStatusIcon: { width: 38, height: 38, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    rateStatusTextBox: { flex: 1, minWidth: 0 },
    rateStatusTitle: { marginTop: 2, color: colors.text, fontWeight: '900' },
    rateStatusText: { marginTop: 4, lineHeight: 18 },
    previewCard: { marginBottom: 16, backgroundColor: colors.primary, borderRadius: 24, padding: 18, gap: 8 },
    previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    previewIcon: { width: 42, height: 42, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center' },
    previewValue: { marginTop: 6, color: colors.black },
    previewDescription: { color: 'rgba(0,0,0,0.62)', fontWeight: '900' },
    field: { marginBottom: 18, gap: 9 },
    input: { minHeight: 54, borderRadius: 18, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontWeight: '800' },
    noteInput: { minHeight: 92, textAlignVertical: 'top' },
    submitButton: { minHeight: 56, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 18 },
    submitText: { color: colors.black, fontWeight: '900' },
    emptyCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 22, alignItems: 'center' },
    emptyTitle: { marginTop: 14, textAlign: 'center' },
    emptyText: { marginTop: 8, textAlign: 'center', lineHeight: 21 },
  });
}
