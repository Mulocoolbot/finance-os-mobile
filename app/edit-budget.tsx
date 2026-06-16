import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { NumericAmountInput } from '../src/components/ui/NumericAmountInput';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useFinanceStore } from '../src/stores/useFinanceStore';
import { BudgetPeriod, Currency } from '../src/types/finance';
import { formatCurrency } from '../src/utils/currency';

type BudgetPeriodOption = {
  label: string;
  value: BudgetPeriod;
  description: string;
};

const periodOptions: BudgetPeriodOption[] = [
  {
    label: 'Weekly',
    value: 'weekly',
    description: 'Track spending from Monday to Sunday.',
  },
  {
    label: 'Monthly',
    value: 'monthly',
    description: 'Track spending from the first day to the end of the month.',
  },
  {
    label: 'Custom',
    value: 'custom',
    description: 'Track spending within your own date range.',
  },
];

const currencyOptions: Currency[] = ['IDR', 'USD', 'EUR'];

function parseAmount(value: string) {
  return Number(value.replace(/[^0-9.]/g, '') || 0);
}

function formatAmountInput(value: number) {
  if (!Number.isFinite(value)) {
    return '0';
  }

  return String(value);
}

export default function EditBudgetScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ budgetId?: string }>();

  const budgets = useFinanceStore((state) => state.budgets);
  const categories = useFinanceStore((state) => state.categories);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);
  const updateBudget = useFinanceStore((state) => state.updateBudget);
  const deleteBudget = useFinanceStore((state) => state.deleteBudget);

  const budget = budgets.find((item) => item.id === params.budgetId);
  const expenseCategories = useMemo(() => {
    return categories.filter((category) => category.isActive && category.type === 'expense');
  }, [categories]);

  const [name, setName] = useState(budget?.name || '');
  const [categoryId, setCategoryId] = useState(
    budget?.categoryId || expenseCategories[0]?.id || ''
  );
  const [period, setPeriod] = useState<BudgetPeriod>(budget?.period || 'monthly');
  const [limitAmount, setLimitAmount] = useState(
    formatAmountInput(budget?.limitAmount || 0)
  );
  const [currency, setCurrency] = useState<Currency>(budget?.currency || defaultCurrency);
  const [startDate, setStartDate] = useState(budget?.startDate || '');
  const [endDate, setEndDate] = useState(budget?.endDate || '');

  useEffect(() => {
    if (!budget) {
      return;
    }

    setName(budget.name);
    setCategoryId(budget.categoryId || expenseCategories[0]?.id || '');
    setPeriod(budget.period);
    setLimitAmount(formatAmountInput(budget.limitAmount));
    setCurrency(budget.currency || defaultCurrency);
    setStartDate(budget.startDate || '');
    setEndDate(budget.endDate || '');
  }, [budget?.id, expenseCategories.length, defaultCurrency]);

  const selectedCategory = expenseCategories.find((category) => category.id === categoryId);
  const parsedLimit = parseAmount(limitAmount);

  function handleSave() {
    if (!budget) {
      Alert.alert('Finance OS Mobile', 'Budget not found.');
      return;
    }

    const result = updateBudget({
      budgetId: budget.id,
      name,
      categoryId: categoryId || expenseCategories[0]?.id || '',
      period,
      limitAmount: parsedLimit,
      currency,
      startDate: period === 'custom' ? startDate.trim() : undefined,
      endDate: period === 'custom' ? endDate.trim() : undefined,
    });

    Alert.alert('Finance OS Mobile', result.message);

    if (result.success) {
      router.back();
    }
  }

  function handleDelete() {
    if (!budget) {
      Alert.alert('Finance OS Mobile', 'Budget not found.');
      return;
    }

    Alert.alert(
      'Delete Budget',
      `Delete ${budget.name}? Spending transactions will stay safe, but this budget tracker will be removed.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const result = deleteBudget(budget.id);

            Alert.alert('Finance OS Mobile', result.message);

            if (result.success) {
              router.back();
            }
          },
        },
      ]
    );
  }

  if (!budget) {
    return (
      <Screen>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
          </Pressable>

          <View style={styles.headerText}>
            <AppText variant="caption" muted>
              Budget
            </AppText>

            <AppText variant="title">Budget Not Found</AppText>
          </View>
        </View>

        <View style={styles.emptyCard}>
          <Ionicons name="alert-circle-outline" size={28} color={colors.textMuted} />

          <AppText variant="body" muted style={styles.emptyText}>
            This budget may have been deleted.
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
            Budget
          </AppText>

          <AppText variant="title">Edit Budget</AppText>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons name="wallet-outline" size={24} color={colors.black} />
        </View>

        <View style={styles.heroTextBox}>
          <AppText variant="caption" style={styles.heroLabel}>
            {budget.period.toUpperCase()} • {budget.currency}
          </AppText>

          <AppText variant="title" style={styles.heroTitle} numberOfLines={1}>
            {budget.name}
          </AppText>

          <AppText variant="caption" style={styles.heroSubText} numberOfLines={1}>
            Current limit: {formatCurrency(budget.limitAmount, budget.currency)}
          </AppText>
        </View>
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Budget Name
          </AppText>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Example: Food Budget"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Category
          </AppText>

          <View style={styles.categoryGrid}>
            {expenseCategories.map((category) => {
              const selected = category.id === categoryId;

              return (
                <Pressable
                  key={category.id}
                  onPress={() => setCategoryId(category.id)}
                  style={[styles.categoryChip, selected && styles.categoryChipActive]}
                >
                  <AppText
                    variant="caption"
                    style={[
                      styles.categoryChipText,
                      selected && styles.categoryChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {category.name}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Period
          </AppText>

          <View style={styles.optionList}>
            {periodOptions.map((item) => {
              const selected = period === item.value;

              return (
                <Pressable
                  key={item.value}
                  onPress={() => setPeriod(item.value)}
                  style={[styles.optionCard, selected && styles.optionCardActive]}
                >
                  <View style={[styles.optionIcon, selected && styles.optionIconActive]}>
                    <Ionicons
                      name={
                        item.value === 'weekly'
                          ? 'calendar-outline'
                          : item.value === 'monthly'
                            ? 'calendar-number-outline'
                            : 'options-outline'
                      }
                      size={18}
                      color={selected ? colors.black : colors.text}
                    />
                  </View>

                  <View style={styles.optionTextBox}>
                    <AppText
                      variant="body"
                      style={[styles.optionTitle, selected && styles.optionTitleActive]}
                    >
                      {item.label}
                    </AppText>

                    <AppText
                      variant="caption"
                      muted={!selected}
                      style={styles.optionDescription}
                    >
                      {item.description}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Currency
          </AppText>

          <View style={styles.currencyRow}>
            {currencyOptions.map((item) => {
              const selected = currency === item;

              return (
                <Pressable
                  key={item}
                  onPress={() => setCurrency(item)}
                  style={[styles.currencyChip, selected && styles.currencyChipActive]}
                >
                  <AppText
                    variant="caption"
                    style={[
                      styles.currencyChipText,
                      selected && styles.currencyChipTextActive,
                    ]}
                  >
                    {item}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <NumericAmountInput
          label="Budget Limit"
          value={limitAmount}
          onChangeText={setLimitAmount}
          placeholder="0"
          currency={currency}
          icon="speedometer-outline"
          quickValues={
            currency === 'IDR'
              ? ['100000', '500000', '1000000', '2500000']
              : ['50', '100', '500', '1000']
          }
          previewLabel="Budget Limit"
          helperText="This is the maximum spending target for the selected period."
          allowDecimal
        />

        {period === 'custom' ? (
          <View style={styles.customDateGrid}>
            <View style={styles.customDateField}>
              <AppText variant="caption" muted style={styles.label}>
                Start Date
              </AppText>

              <TextInput
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
            </View>

            <View style={styles.customDateField}>
              <AppText variant="caption" muted style={styles.label}>
                End Date
              </AppText>

              <TextInput
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.previewCard}>
          <View>
            <AppText variant="caption" muted>
              Preview
            </AppText>

            <AppText variant="subtitle" style={styles.previewTitle}>
              {formatCurrency(parsedLimit, currency)}
            </AppText>
          </View>

          <AppText variant="caption" muted style={styles.previewDescription}>
            {selectedCategory?.name || budget.categoryName} • {period}
          </AppText>
        </View>

        <Pressable onPress={handleSave} style={styles.saveButton}>
          <AppText variant="body" style={styles.saveButtonText}>
            Save Budget Changes
          </AppText>
        </Pressable>

        <View style={styles.dangerCard}>
          <View style={styles.dangerTextBox}>
            <AppText variant="body" style={styles.dangerTitle}>
              Delete Budget
            </AppText>

            <AppText variant="caption" muted style={styles.dangerDescription}>
              Deleting a budget only removes this tracker. Your spending transactions remain safe.
            </AppText>
          </View>

          <Pressable onPress={handleDelete} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={17} color={colors.expense} />

            <AppText variant="body" style={styles.deleteButtonText}>
              Delete
            </AppText>
          </Pressable>
        </View>
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
      backgroundColor: colors.primary,
      borderRadius: 28,
      padding: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 18,
    },
    heroIcon: {
      width: 54,
      height: 54,
      borderRadius: 20,
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
    heroTitle: {
      marginTop: 4,
      color: colors.black,
    },
    heroSubText: {
      marginTop: 4,
      color: 'rgba(0,0,0,0.62)',
      fontWeight: '800',
    },
    form: {
      gap: 18,
    },
    field: {
      gap: 9,
    },
    label: {
      fontWeight: '900',
    },
    input: {
      minHeight: 52,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      paddingHorizontal: 15,
      fontSize: 15,
      fontWeight: '800',
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 9,
    },
    categoryChip: {
      minHeight: 38,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    categoryChipText: {
      color: colors.text,
      fontWeight: '900',
    },
    categoryChipTextActive: {
      color: colors.black,
    },
    optionList: {
      gap: 10,
    },
    optionCard: {
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    optionCardActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    optionIcon: {
      width: 42,
      height: 42,
      borderRadius: 15,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionIconActive: {
      backgroundColor: 'rgba(0,0,0,0.08)',
    },
    optionTextBox: {
      flex: 1,
      minWidth: 0,
    },
    optionTitle: {
      color: colors.text,
      fontWeight: '900',
    },
    optionTitleActive: {
      color: colors.black,
    },
    optionDescription: {
      marginTop: 4,
      lineHeight: 18,
    },
    currencyRow: {
      flexDirection: 'row',
      gap: 9,
    },
    currencyChip: {
      minHeight: 42,
      borderRadius: 15,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
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
    customDateGrid: {
      gap: 12,
    },
    customDateField: {
      gap: 9,
    },
    previewCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 15,
    },
    previewTitle: {
      marginTop: 5,
      fontWeight: '900',
    },
    previewDescription: {
      marginTop: 10,
      lineHeight: 18,
    },
    saveButton: {
      minHeight: 56,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
    },
    saveButtonText: {
      color: colors.black,
      fontWeight: '900',
    },
    dangerCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 15,
      gap: 14,
    },
    dangerTextBox: {
      minWidth: 0,
    },
    dangerTitle: {
      color: colors.text,
      fontWeight: '900',
    },
    dangerDescription: {
      marginTop: 4,
      lineHeight: 18,
    },
    deleteButton: {
      minHeight: 46,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.expense,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },
    deleteButtonText: {
      color: colors.expense,
      fontWeight: '900',
    },
    emptyCard: {
      borderRadius: 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
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
