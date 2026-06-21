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
import { Category, Transaction } from '../src/types/finance';

const weekLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getMonthLabel(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(value);
}

function parseCryptoQuantity(value: string) {
  return Number(value.replace(/,/g, '.').replace(/[^0-9.]/g, '') || 0);
}

function formatCryptoQuantity(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return '';
  }

  return String(value);
}

function getCryptoQuantity(transaction?: Transaction) {
  if (!transaction) {
    return 0;
  }

  const noteText = `${transaction.title || ''} ${transaction.note || ''}`;
  const structuredMatch = noteText.match(/Crypto qty:\s*([0-9.]+)/i);
  const legacyMatch = noteText.match(/([0-9.]+)\s+[A-Z0-9]+\s+@\s+[0-9.]+\s+[A-Z]{3}/i);
  const value = Number(structuredMatch?.[1] || legacyMatch?.[1] || 0);

  return Number.isFinite(value) ? value : 0;
}

function getCryptoSymbol(transaction?: Transaction) {
  if (!transaction) {
    return 'Crypto';
  }

  const noteText = `${transaction.title || ''} ${transaction.note || ''}`;
  const structuredMatch = noteText.match(/Crypto qty:\s*[0-9.]+\s+([A-Z0-9]+)/i);
  const legacyMatch = noteText.match(/[0-9.]+\s+([A-Z0-9]+)\s+@\s+[0-9.]+\s+[A-Z]{3}/i);
  const titleMatch = transaction.title.match(/Crypto\s+(?:Income|Payment)\s+([A-Z0-9]+)/i);

  return (structuredMatch?.[1] || legacyMatch?.[1] || titleMatch?.[1] || 'Crypto').toUpperCase();
}

function getLongDateLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function startOfMonth(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getCalendarCells(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ key: string; day?: number; dateKey?: string }> = [];

  for (let index = 0; index < firstDay; index += 1) {
    cells.push({ key: `empty-${index}` });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, month, day);

    cells.push({
      key: getDateKey(date),
      day,
      dateKey: getDateKey(date),
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: `tail-${cells.length}` });
  }

  return cells;
}


function isCryptoTransaction(transaction: Transaction) {
  const noteText = transaction.note || '';
  const titleText = transaction.title.toLowerCase();

  return (
    transaction.categoryName === 'Crypto Income' ||
    transaction.categoryName === 'Crypto Payment' ||
    titleText.startsWith('crypto income') ||
    titleText.startsWith('crypto payment') ||
    noteText.includes('Crypto qty:') ||
    /[0-9.]+\s+[A-Z0-9]+\s+@\s+[0-9.]+\s+[A-Z]{3}/i.test(noteText)
  );
}

function getCryptoUserNote(transaction?: Transaction) {
  if (!transaction?.note) {
    return '';
  }

  const noteMarker = ' • Note: ';
  const markerIndex = transaction.note.indexOf(noteMarker);

  if (markerIndex === -1) {
    return '';
  }

  return transaction.note.slice(markerIndex + noteMarker.length);
}

export default function EditCryptoTransactionScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ transactionId?: string }>();

  const transactions = useFinanceStore((state) => state.transactions);
  const categories = useFinanceStore((state) => state.categories);
  const updateCryptoTransactionDetails = useFinanceStore(
    (state) => state.updateCryptoTransactionDetails
  );

  const transaction = transactions.find((item) => item.id === params.transactionId);
  const editable = transaction ? isCryptoTransaction(transaction) : false;
  const isPayment =
    transaction?.type === 'expense' ||
    transaction?.categoryName === 'Crypto Payment' ||
    transaction?.title.toLowerCase().startsWith('crypto payment') ||
    transaction?.note?.toLowerCase().includes('crypto payment');
  const categoryList = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.isActive && category.type === (isPayment ? 'expense' : 'income')
      ),
    [categories, isPayment]
  );

  const [title, setTitle] = useState(transaction?.title || '');
  const [categoryId, setCategoryId] = useState(transaction?.categoryId || '');
  const [quantity, setQuantity] = useState(
    formatCryptoQuantity(getCryptoQuantity(transaction))
  );
  const [selectedDate, setSelectedDate] = useState(
    getDateKey(transaction?.date || new Date())
  );
  const [calendarMonth, setCalendarMonth] = useState(
    startOfMonth(transaction?.date || new Date().toISOString())
  );
  const [note, setNote] = useState(getCryptoUserNote(transaction));

  useEffect(() => {
    if (!transaction) {
      return;
    }

    setTitle(transaction.title || '');
    setCategoryId(transaction.categoryId || categoryList[0]?.id || '');
    setQuantity(formatCryptoQuantity(getCryptoQuantity(transaction)));
    setSelectedDate(getDateKey(transaction.date));
    setCalendarMonth(startOfMonth(transaction.date));
    setNote(getCryptoUserNote(transaction));
  }, [transaction?.id, categoryList]);

  const calendarCells = useMemo(() => getCalendarCells(calendarMonth), [calendarMonth]);

  function moveCalendarMonth(direction: -1 | 1) {
    setCalendarMonth((currentMonth) => {
      return new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + direction,
        1
      );
    });
  }

  function handleSave() {
    if (!transaction) {
      Alert.alert('Finance OS Mobile', 'Crypto transaction not found.');
      return;
    }

    if (!editable) {
      Alert.alert(
        'Locked Transaction',
        'Only crypto transactions can be edited here.'
      );
      return;
    }

    const result = updateCryptoTransactionDetails({
      transactionId: transaction.id,
      title,
      categoryId: categoryId || categoryList[0]?.id,
      quantity: parseCryptoQuantity(quantity),
      date: selectedDate,
      note,
    });

    Alert.alert('Finance OS Mobile', result.message);

    if (result.success) {
      router.back();
    }
  }

  if (!transaction) {
    return (
      <Screen>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
          </Pressable>

          <View style={styles.headerText}>
            <AppText variant="caption" muted>
              Edit Crypto Transaction
            </AppText>

            <AppText variant="title">Not Found</AppText>
          </View>
        </View>

        <View style={styles.lockedCard}>
          <AppText variant="body" muted>
            Crypto transaction not found.
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
            Edit Crypto Transaction
          </AppText>

          <AppText variant="title" numberOfLines={1}>
            Basic Details
          </AppText>
        </View>
      </View>

      {!editable ? (
        <View style={styles.lockedCard}>
          <Ionicons name="lock-closed-outline" size={24} color={colors.textMuted} />

          <AppText variant="body" muted style={styles.lockedText}>
            This is not a crypto transaction.
          </AppText>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <View style={styles.sectionMiniHeader}>
              <View>
                <AppText variant="caption" muted>
                  Step 1
                </AppText>

                <AppText variant="subtitle" style={styles.sectionMiniTitle}>
                  Crypto transaction detail
                </AppText>
              </View>

              <AppText variant="caption" muted style={styles.sectionMiniHint}>
                Title & category
              </AppText>
            </View>

            <View style={styles.field}>
              <AppText variant="caption" muted style={styles.label}>
                Transaction Title
              </AppText>

              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Transaction title"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <AppText variant="caption" muted style={styles.label}>
                Category
              </AppText>

              <CategoryPicker
                categories={categoryList}
                selectedCategoryId={categoryId}
                onSelect={setCategoryId}
                colors={colors}
              />
            </View>

            <View style={styles.sectionMiniHeader}>
              <View>
                <AppText variant="caption" muted>
                  Step 2
                </AppText>

                <AppText variant="subtitle" style={styles.sectionMiniTitle}>
                  Quantity correction
                </AppText>
              </View>

              <AppText variant="caption" muted style={styles.sectionMiniHint}>
                Rate locked
              </AppText>
            </View>

            <NumericAmountInput
              label={`Quantity (${getCryptoSymbol(transaction)})`}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="0.00"
              icon="keypad-outline"
              allowDecimal
              previewLabel="Quantity preview"
              quickValues={['0.0001', '0.001', '0.01', '0.1', '1']}
              helperText="Rate is locked. Amount will be recalculated using the stored transaction rate."
            />

            <View style={styles.sectionMiniHeader}>
              <View>
                <AppText variant="caption" muted>
                  Step 3
                </AppText>

                <AppText variant="subtitle" style={styles.sectionMiniTitle}>
                  Transaction date
                </AppText>
              </View>

              <AppText variant="caption" muted style={styles.sectionMiniHint}>
                Calendar
              </AppText>
            </View>

            <View style={styles.calendarCard}>
              <View style={styles.calendarHeader}>
                <Pressable onPress={() => moveCalendarMonth(-1)} style={styles.calendarArrow}>
                  <Ionicons name="chevron-back-outline" size={18} color={colors.text} />
                </Pressable>

                <View style={styles.calendarTitleBox}>
                  <AppText variant="caption" muted>
                    Transaction Date
                  </AppText>

                  <AppText variant="subtitle" style={styles.calendarTitle}>
                    {getMonthLabel(calendarMonth)}
                  </AppText>
                </View>

                <Pressable onPress={() => moveCalendarMonth(1)} style={styles.calendarArrow}>
                  <Ionicons name="chevron-forward-outline" size={18} color={colors.text} />
                </Pressable>
              </View>

              <View style={styles.weekRow}>
                {weekLabels.map((label) => (
                  <AppText key={label} variant="caption" muted style={styles.weekLabel}>
                    {label}
                  </AppText>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {calendarCells.map((cell) => {
                  if (!cell.day || !cell.dateKey) {
                    return <View key={cell.key} style={styles.dayCell} />;
                  }

                  const selected = cell.dateKey === selectedDate;
                  const today = cell.dateKey === getDateKey(new Date());

                  return (
                    <Pressable
                      key={cell.key}
                      onPress={() => setSelectedDate(cell.dateKey || selectedDate)}
                      style={[
                        styles.dayCell,
                        styles.dayButton,
                        today && styles.dayToday,
                        selected && styles.daySelected,
                      ]}
                    >
                      <AppText
                        variant="caption"
                        style={[
                          styles.dayText,
                          selected && styles.dayTextSelected,
                        ]}
                      >
                        {cell.day}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.selectedDateCard}>
                <Ionicons name="calendar-outline" size={17} color={colors.text} />

                <AppText variant="caption" style={styles.selectedDateText}>
                  {getLongDateLabel(selectedDate)}
                </AppText>
              </View>
            </View>

            <View style={styles.sectionMiniHeader}>
              <View>
                <AppText variant="caption" muted>
                  Step 4
                </AppText>

                <AppText variant="subtitle" style={styles.sectionMiniTitle}>
                  Note & save
                </AppText>
              </View>

              <AppText variant="caption" muted style={styles.sectionMiniHint}>
                Final
              </AppText>
            </View>

            <View style={styles.field}>
              <AppText variant="caption" muted style={styles.label}>
                Note
              </AppText>

              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Optional note"
                placeholderTextColor={colors.textMuted}
                multiline
                style={[styles.input, styles.noteInput]}
              />
            </View>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.textMuted} />

            <AppText variant="caption" muted style={styles.infoText}>
              This screen edits title, category, quantity, date, and note. Rate edit is
              intentionally unavailable because crypto asset value follows the actual
              holding/current market price.
            </AppText>
          </View>

          <Pressable onPress={handleSave} style={styles.saveButton}>
            <Ionicons name="checkmark-circle-outline" size={19} color={colors.black} />

            <AppText variant="body" style={styles.saveButtonText}>
              Save Crypto Details
            </AppText>
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
                {category.type === 'income' ? 'Income category' : 'Expense category'}
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
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 16,
      gap: 16,
      marginBottom: 14,
    },
    sectionMiniHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: 12,
      marginTop: 2,
      marginBottom: -2,
    },
    sectionMiniTitle: {
      marginTop: 3,
      color: colors.text,
    },
    sectionMiniHint: {
      fontWeight: '900',
    },
    field: {
      gap: 8,
    },
    label: {
      fontWeight: '900',
    },
    input: {
      minHeight: 50,
      borderRadius: 17,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      color: colors.text,
      fontWeight: '800',
    },
    noteInput: {
      minHeight: 92,
      paddingTop: 13,
      textAlignVertical: 'top',
    },
    categoryList: {
      gap: 9,
    },
    categoryCard: {
      minHeight: 58,
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 13,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    categoryCardActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    categoryTextBox: {
      flex: 1,
      minWidth: 0,
    },
    categoryName: {
      color: colors.text,
      fontWeight: '900',
    },
    categoryNameActive: {
      color: colors.black,
    },
    categoryDescription: {
      marginTop: 3,
      lineHeight: 16,
    },
    categoryDescriptionActive: {
      color: 'rgba(0,0,0,0.62)',
    },
    categoryRadio: {
      width: 22,
      height: 22,
      borderRadius: 999,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryRadioActive: {
      borderColor: colors.black,
    },
    categoryRadioDot: {
      width: 10,
      height: 10,
      borderRadius: 999,
      backgroundColor: colors.black,
    },
    emptyCategoryBox: {
      minHeight: 42,
      borderRadius: 15,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      justifyContent: 'center',
    },
    calendarCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 15,
      gap: 12,
    },
    calendarHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    calendarArrow: {
      width: 38,
      height: 38,
      borderRadius: 14,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    calendarTitleBox: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
    },
    calendarTitle: {
      marginTop: 3,
    },
    weekRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    weekLabel: {
      width: '13%',
      textAlign: 'center',
      fontWeight: '900',
    },
    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    dayCell: {
      width: '13%',
      height: 46,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    dayButton: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dayToday: {
      borderColor: colors.primary,
    },
    daySelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    dayText: {
      color: colors.text,
      fontWeight: '900',
      textAlign: 'center',
      includeFontPadding: false,
    },
    dayTextSelected: {
      color: colors.black,
    },
    selectedDateCard: {
      minHeight: 42,
      borderRadius: 15,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    selectedDateText: {
      color: colors.text,
      fontWeight: '900',
    },
    infoCard: {
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 13,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 9,
      marginBottom: 14,
    },
    infoText: {
      flex: 1,
      lineHeight: 18,
    },
    saveButton: {
      minHeight: 54,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
    },
    saveButtonText: {
      color: colors.black,
      fontWeight: '900',
    },
    lockedCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 22,
      alignItems: 'center',
      gap: 10,
    },
    lockedText: {
      textAlign: 'center',
      lineHeight: 21,
    },
  });
}
