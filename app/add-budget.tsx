import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { NumericAmountInput } from '../src/components/ui/NumericAmountInput';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useFinanceStore } from '../src/stores/useFinanceStore';
import { BudgetPeriod, Category } from '../src/types/finance';

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

function parseAmount(value: string) {
  return Number(value.replace(/[^0-9.]/g, '') || 0);
}

export default function AddBudgetScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const categories = useFinanceStore((state) => state.categories);
  const addBudget = useFinanceStore((state) => state.addBudget);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);

  const expenseCategories = useMemo(() => {
    return categories.filter((category) => category.isActive && category.type === 'expense');
  }, [categories]);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState(expenseCategories[0]?.id || '');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [limitAmount, setLimitAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  function handleSubmit() {
    const effectiveCategoryId = categoryId || expenseCategories[0]?.id || '';

    const result = addBudget({
      name,
      categoryId: effectiveCategoryId,
      period,
      limitAmount: parseAmount(limitAmount),
      currency: defaultCurrency,
      startDate: period === 'custom' ? startDate.trim() : undefined,
      endDate: period === 'custom' ? endDate.trim() : undefined,
    });

    if (!result.success) {
      Alert.alert('Finance OS Mobile', result.message);
      return;
    }

    Alert.alert('Finance OS Mobile', result.message);
    router.back();
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

          <AppText variant="title" style={styles.title}>
            Add Budget
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
            placeholder="Example: Monthly Food Budget"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </View>

        <CategoryPicker
          categories={expenseCategories}
          selectedCategoryId={categoryId}
          onSelect={setCategoryId}
          colors={colors}
        />

        <NumericAmountInput
          label="Budget Limit"
          value={limitAmount}
          onChangeText={setLimitAmount}
          placeholder="1000000"
          currency={defaultCurrency}
          icon="speedometer-outline"
          quickValues={defaultCurrency === 'IDR' ? ['500000', '1000000', '2000000'] : ['50', '100', '250']}
          helperText="Budget limit uses your current Currency Base."
        />

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
                      style={[styles.optionDescription, selected && styles.optionDescriptionActive]}
                    >
                      {item.description}
                    </AppText>
                  </View>

                  <Radio selected={selected} colors={colors} />
                </Pressable>
              );
            })}
          </View>
        </View>

        {period === 'custom' ? (
          <>
            <View style={styles.field}>
              <AppText variant="caption" muted style={styles.label}>
                Start Date
              </AppText>

              <TextInput
                value={startDate}
                onChangeText={setStartDate}
                placeholder="Example: 2026-06-01"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <AppText variant="caption" muted style={styles.label}>
                End Date
              </AppText>

              <TextInput
                value={endDate}
                onChangeText={setEndDate}
                placeholder="Example: 2026-06-30"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
            </View>
          </>
        ) : null}

        <Pressable onPress={handleSubmit} style={styles.submitButton}>
          <AppText variant="body" style={styles.submitText}>
            Save Budget
          </AppText>
        </Pressable>
      </View>
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

  return (
    <View style={styles.field}>
      <AppText variant="caption" muted style={styles.label}>
        Expense Category
      </AppText>

      {categories.length === 0 ? (
        <View style={styles.emptyBox}>
          <AppText variant="caption" muted>
            No expense categories available.
          </AppText>
        </View>
      ) : null}

      <View style={styles.optionList}>
        {categories.map((category) => {
          const selected = selectedCategoryId === category.id;

          return (
            <Pressable
              key={category.id}
              onPress={() => onSelect(category.id)}
              style={[styles.optionCard, selected && styles.optionCardActive]}
            >
              <View style={styles.optionTextBox}>
                <AppText
                  variant="body"
                  style={[styles.optionTitle, selected && styles.optionTitleActive]}
                >
                  {category.name}
                </AppText>

                <AppText
                  variant="caption"
                  muted={!selected}
                  style={[styles.optionDescription, selected && styles.optionDescriptionActive]}
                >
                  Expense category
                </AppText>
              </View>

              <Radio selected={selected} colors={colors} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Radio({ selected, colors }: { selected: boolean; colors: ThemeColors }) {
  const styles = createStyles(colors);

  return (
    <View style={[styles.radioOuter, selected && styles.radioOuterActive]}>
      {selected ? <View style={styles.radioInner} /> : null}
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
    form: {
      gap: 18,
    },
    field: {
      gap: 10,
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
      paddingHorizontal: 16,
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    optionList: {
      gap: 10,
    },
    optionCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 15,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
    },
    optionCardActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    optionTextBox: {
      flex: 1,
      minWidth: 0,
    },
    optionTitle: {
      fontWeight: '900',
    },
    optionTitleActive: {
      color: colors.black,
    },
    optionDescription: {
      marginTop: 4,
      lineHeight: 18,
    },
    optionDescriptionActive: {
      color: 'rgba(0,0,0,0.68)',
    },
    emptyBox: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 14,
    },
    radioOuter: {
      width: 22,
      height: 22,
      borderRadius: 999,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOuterActive: {
      borderColor: colors.black,
    },
    radioInner: {
      width: 10,
      height: 10,
      borderRadius: 999,
      backgroundColor: colors.black,
    },
    submitButton: {
      marginTop: 8,
      minHeight: 54,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitText: {
      color: colors.black,
      fontWeight: '900',
    },
  });
}
