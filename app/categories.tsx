import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CategoryCard } from '../src/components/cards/CategoryCard';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { StatCard } from '../src/components/ui/StatCard';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useFinanceStore } from '../src/stores/useFinanceStore';
import { CategoryType } from '../src/types/finance';

const filters: { label: string; value: CategoryType }[] = [
  { label: 'Expense', value: 'expense' },
  { label: 'Income', value: 'income' },
];

export default function CategoriesScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const categories = useFinanceStore((state) => state.categories);
  const [selectedType, setSelectedType] = useState<CategoryType>('expense');

  const filteredCategories = useMemo(() => {
    return categories.filter((category) => category.type === selectedType && category.isActive);
  }, [categories, selectedType]);

  const expenseCount = categories.filter((category) => category.type === 'expense' && category.isActive).length;
  const incomeCount = categories.filter((category) => category.type === 'income' && category.isActive).length;
  const customCount = categories.filter((category) => !category.isDefault && category.isActive).length;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.headerText}>
          <AppText variant="caption" muted>
            Finance OS Mobile
          </AppText>

          <AppText variant="title" style={styles.title}>
            Categories
          </AppText>
        </View>

        <Pressable onPress={() => router.push('/add-category')} style={styles.addButton}>
          <Ionicons name="add-outline" size={24} color={colors.black} />
        </Pressable>
      </View>

      <View style={styles.grid}>
        <StatCard label="Expense" value={`${expenseCount}`} tone="expense" />
        <StatCard label="Income" value={`${incomeCount}`} tone="income" />
        <StatCard label="Custom" value={`${customCount}`} tone="transfer" />
      </View>

      <View style={styles.segment}>
        {filters.map((filter) => {
          const isActive = selectedType === filter.value;

          return (
            <Pressable
              key={filter.value}
              onPress={() => setSelectedType(filter.value)}
              style={[styles.segmentButton, isActive && styles.segmentButtonActive]}
            >
              <AppText variant="caption" style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                {filter.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">{selectedType === 'expense' ? 'Expense' : 'Income'} Categories</AppText>
        <AppText variant="caption" muted>{filteredCategories.length} items</AppText>
      </View>

      <View style={styles.list}>
        {filteredCategories.length === 0 ? (
          <View style={styles.emptyCard}>
            <AppText variant="subtitle">No categories yet</AppText>
            <AppText variant="body" muted style={styles.emptyDescription}>
              Add a custom category to organize your transactions.
            </AppText>
          </View>
        ) : null}

        {filteredCategories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
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
    addButton: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: colors.primary,
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
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    segment: {
      marginTop: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 5,
      flexDirection: 'row',
    },
    segmentButton: {
      flex: 1,
      borderRadius: 14,
      paddingVertical: 10,
      alignItems: 'center',
    },
    segmentButtonActive: {
      backgroundColor: colors.primary,
    },
    segmentText: {
      color: colors.textMuted,
      fontWeight: '900',
    },
    segmentTextActive: {
      color: colors.black,
    },
    sectionHeader: {
      marginTop: 28,
      marginBottom: 14,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: 12,
    },
    list: {
      gap: 10,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 18,
    },
    emptyDescription: {
      marginTop: 8,
      lineHeight: 22,
    },
  });
}
