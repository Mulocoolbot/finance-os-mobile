import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useFinanceStore } from '../src/stores/useFinanceStore';
import { CategoryType } from '../src/types/finance';

const colorOptions = [
  '#22C55E',
  '#EF4444',
  '#38BDF8',
  '#A855F7',
  '#F59E0B',
  '#F97316',
  '#64748B',
];

const iconOptions = [
  'pricetag-outline',
  'fast-food-outline',
  'car-outline',
  'bag-outline',
  'school-outline',
  'medkit-outline',
  'receipt-outline',
  'briefcase-outline',
  'laptop-outline',
  'trending-up-outline',
];

export default function AddCategoryScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const categoryId =
    typeof params.categoryId === 'string' ? params.categoryId : '';

  const categories = useFinanceStore((state) => state.categories);
  const addCategory = useFinanceStore((state) => state.addCategory);
  const updateCategory = useFinanceStore((state) => state.updateCategory);
  const deleteCategory = useFinanceStore((state) => state.deleteCategory);

  const existingCategory = categories.find((category) => category.id === categoryId);
  const isEditMode = Boolean(existingCategory);

  const [name, setName] = useState(existingCategory?.name || '');
  const [type, setType] = useState<CategoryType>(existingCategory?.type || 'expense');
  const [selectedColor, setSelectedColor] = useState(
    existingCategory?.color || colorOptions[0]
  );
  const [selectedIcon, setSelectedIcon] = useState(
    existingCategory?.icon || iconOptions[0]
  );

  function handleSubmit() {
    const result =
      isEditMode && existingCategory
        ? updateCategory({
            categoryId: existingCategory.id,
            name,
            type,
            color: selectedColor,
            icon: selectedIcon,
          })
        : addCategory({
            name,
            type,
            color: selectedColor,
            icon: selectedIcon,
          });

    if (!result.success) {
      Alert.alert('Finance OS Mobile', result.message);
      return;
    }

    Alert.alert('Finance OS Mobile', result.message);
    router.back();
  }

  function handleDelete() {
    if (!isEditMode || !existingCategory) {
      Alert.alert('Finance OS Mobile', 'Category not found.');
      return;
    }

    Alert.alert(
      'Delete Category',
      existingCategory.isDefault
        ? 'Default category will be archived instead of permanently deleted. Continue?'
        : 'This category will be deleted if unused, or archived if it is used by transactions/budgets. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const result = deleteCategory(existingCategory.id);

            if (!result.success) {
              Alert.alert('Finance OS Mobile', result.message);
              return;
            }

            Alert.alert('Finance OS Mobile', result.message);
            router.back();
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
            Categories
          </AppText>

          <AppText variant="title" style={styles.title}>
            {isEditMode ? 'Edit Category' : 'Add Category'}
          </AppText>
        </View>
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Category Type
          </AppText>

          <View style={styles.segment}>
            <Pressable
              onPress={() => setType('expense')}
              style={[styles.segmentButton, type === 'expense' && styles.segmentButtonActive]}
            >
              <AppText
                variant="caption"
                style={[styles.segmentText, type === 'expense' && styles.segmentTextActive]}
              >
                Expense
              </AppText>
            </Pressable>

            <Pressable
              onPress={() => setType('income')}
              style={[styles.segmentButton, type === 'income' && styles.segmentButtonActive]}
            >
              <AppText
                variant="caption"
                style={[styles.segmentText, type === 'income' && styles.segmentTextActive]}
              >
                Income
              </AppText>
            </Pressable>
          </View>
        </View>

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Category Name
          </AppText>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Example: Coffee"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Color
          </AppText>

          <View style={styles.colorGrid}>
            {colorOptions.map((item) => {
              const selected = selectedColor === item;

              return (
                <Pressable
                  key={item}
                  onPress={() => setSelectedColor(item)}
                  style={[
                    styles.colorOption,
                    {
                      backgroundColor: item,
                    },
                    selected && styles.colorOptionSelected,
                  ]}
                >
                  {selected ? (
                    <Ionicons name="checkmark-outline" size={19} color="#050609" />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Icon
          </AppText>

          <View style={styles.iconGrid}>
            {iconOptions.map((item) => {
              const selected = selectedIcon === item;

              return (
                <Pressable
                  key={item}
                  onPress={() => setSelectedIcon(item)}
                  style={[styles.iconOption, selected && styles.iconOptionSelected]}
                >
                  <Ionicons
                    name={item as any}
                    size={22}
                    color={selected ? colors.black : colors.text}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.previewCard}>
          <View
            style={[
              styles.previewIcon,
              {
                borderColor: selectedColor,
              },
            ]}
          >
            <Ionicons name={selectedIcon as any} size={22} color={selectedColor} />
          </View>

          <View style={styles.previewText}>
            <AppText variant="body" style={styles.previewName}>
              {name.trim() || 'Category Preview'}
            </AppText>

            <AppText variant="caption" muted>
              {type === 'income' ? 'Income' : 'Expense'} category
            </AppText>
          </View>
        </View>

        {isEditMode ? (
          <Pressable onPress={handleDelete} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={18} color={colors.expense} />

            <AppText variant="body" style={styles.deleteText}>
              Delete Category
            </AppText>
          </Pressable>
        ) : null}

        <Pressable onPress={handleSubmit} style={styles.submitButton}>
          <AppText variant="body" style={styles.submitText}>
            {isEditMode ? 'Update Category' : 'Save Category'}
          </AppText>
        </Pressable>
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
    segment: {
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
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    colorOption: {
      width: 42,
      height: 42,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorOptionSelected: {
      borderWidth: 3,
      borderColor: colors.text,
    },
    iconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    iconOption: {
      width: 48,
      height: 48,
      borderRadius: 17,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconOptionSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    previewCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
    },
    previewIcon: {
      width: 48,
      height: 48,
      borderRadius: 17,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewText: {
      flex: 1,
      minWidth: 0,
    },
    previewName: {
      fontWeight: '900',
      marginBottom: 4,
    },
    submitButton: {
      minHeight: 54,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteButton: {
      marginTop: 4,
      minHeight: 54,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.expense,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    deleteText: {
      color: colors.expense,
      fontWeight: '900',
    },
    submitText: {
      color: colors.black,
      fontWeight: '900',
    },
  });
}
