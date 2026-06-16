import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemeColors } from '../../constants/colors';
import { useThemeColors } from '../../hooks/useThemeColors';
import { Currency } from '../../types/finance';
import { formatCurrency } from '../../utils/currency';
import { AppText } from './AppText';
import { NumericKeyboard } from './NumericKeyboard';

type NumericAmountInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  currency?: Currency;
  helperText?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  quickValues?: string[];
  previewLabel?: string;
  allowDecimal?: boolean;
};

function sanitizeNumericInput(value: string, allowDecimal: boolean) {
  const normalizedValue = value.replace(',', '.');
  const sanitizedValue = normalizedValue.replace(/[^0-9.]/g, '');

  if (!allowDecimal) {
    return sanitizedValue.replace(/\./g, '');
  }

  const parts = sanitizedValue.split('.');
  const firstPart = parts.shift() || '';
  const decimalPart = parts.join('');

  if (sanitizedValue.includes('.')) {
    return `${firstPart}.${decimalPart}`;
  }

  return firstPart;
}

function appendNumericInput(currentValue: string, nextValue: string, allowDecimal: boolean) {
  if (nextValue === '.' && (!allowDecimal || currentValue.includes('.'))) {
    return currentValue;
  }

  if (currentValue === '0' && nextValue !== '.') {
    return sanitizeNumericInput(nextValue, allowDecimal);
  }

  return sanitizeNumericInput(`${currentValue}${nextValue}`, allowDecimal);
}

function parseNumericValue(value: string) {
  const parsedValue = Number(value || 0);

  if (!Number.isFinite(parsedValue)) {
    return 0;
  }

  return parsedValue;
}

function formatPlainNumber(value: number) {
  return value.toLocaleString('id-ID', {
    maximumFractionDigits: value >= 100 ? 0 : 2,
  });
}

function getDisplayValue(value: string, placeholder: string) {
  if (!value) {
    return placeholder;
  }

  return value;
}

export function NumericAmountInput({
  label,
  value,
  onChangeText,
  placeholder = '0',
  currency,
  helperText,
  icon = 'calculator-outline',
  quickValues = [],
  previewLabel = 'Preview',
  allowDecimal = true,
}: NumericAmountInputProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);

  const parsedValue = parseNumericValue(value);
  const hasValue = value.trim().length > 0;
  const hasDecimal = value.includes('.');
  const previewValue = currency
    ? formatCurrency(parsedValue, currency)
    : formatPlainNumber(parsedValue);

  function handleInput(nextValue: string) {
    onChangeText(appendNumericInput(value, nextValue, allowDecimal));
  }

  function handleBackspace() {
    onChangeText(value.slice(0, -1));
  }

  function handleQuickValue(nextValue: string) {
    onChangeText(sanitizeNumericInput(nextValue, allowDecimal));
    setIsKeypadOpen(true);
  }

  function handleClear() {
    onChangeText('');
    setIsKeypadOpen(true);
  }

  function handleDone() {
    setIsKeypadOpen(false);
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.labelBox}>
          <View style={styles.labelIcon}>
            <Ionicons name={icon} size={17} color={colors.text} />
          </View>

          <AppText variant="caption" muted style={styles.label}>
            {label}
          </AppText>
        </View>

        {currency ? (
          <View style={styles.currencyBadge}>
            <AppText variant="caption" style={styles.currencyText}>
              {currency}
            </AppText>
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={() => setIsKeypadOpen(true)}
        style={[styles.inputCard, hasValue && styles.inputCardActive, isKeypadOpen && styles.inputCardFocused]}
      >
        <View style={styles.inputTextBox}>
          <AppText
            variant="title"
            style={[styles.inputValue, !hasValue && styles.placeholderValue]}
            numberOfLines={1}
          >
            {getDisplayValue(value, placeholder)}
          </AppText>

          <AppText variant="caption" muted style={styles.tapHint}>
            {isKeypadOpen ? 'Custom keypad active' : 'Tap to open custom keypad'}
          </AppText>
        </View>

        {hasValue ? (
          <Pressable onPress={handleClear} style={styles.clearButton}>
            <Ionicons name="close-outline" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}

        <View style={styles.keypadStatusIcon}>
          <Ionicons
            name={isKeypadOpen ? 'chevron-up-outline' : 'keypad-outline'}
            size={18}
            color={colors.textMuted}
          />
        </View>
      </Pressable>

      <View style={styles.previewCard}>
        <View style={styles.previewTextBox}>
          <AppText variant="caption" muted>
            {previewLabel}
          </AppText>

          <AppText variant="body" style={styles.previewValue} numberOfLines={1}>
            {previewValue}
          </AppText>
        </View>

        <View style={styles.previewIcon}>
          <Ionicons name="eye-outline" size={17} color={colors.textMuted} />
        </View>
      </View>

      {quickValues.length > 0 ? (
        <View style={styles.quickRow}>
          {quickValues.map((quickValue, quickValueIndex) => (
            <Pressable
              key={`${quickValue}-${quickValueIndex}`}
              onPress={() => handleQuickValue(quickValue)}
              style={styles.quickChip}
            >
              <AppText variant="caption" style={styles.quickText}>
                {currency ? formatCurrency(parseNumericValue(quickValue), currency) : quickValue}
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : null}

      {isKeypadOpen ? (
        <NumericKeyboard
          onInput={handleInput}
          onBackspace={handleBackspace}
          onClear={handleClear}
          onDone={handleDone}
          allowDecimal={allowDecimal}
          hasDecimal={hasDecimal}
        />
      ) : null}

      {helperText ? (
        <View style={styles.helperRow}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />

          <AppText variant="caption" muted style={styles.helperText}>
            {helperText}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrapper: {
      gap: 10,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    labelBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
      minWidth: 0,
    },
    labelIcon: {
      width: 28,
      height: 28,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      fontWeight: '900',
    },
    currencyBadge: {
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    currencyText: {
      color: colors.black,
      fontWeight: '900',
    },
    inputCard: {
      minHeight: 76,
      borderRadius: 22,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingLeft: 16,
      paddingRight: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    inputCardActive: {
      borderColor: colors.primary,
    },
    inputCardFocused: {
      backgroundColor: colors.surfaceSoft,
    },
    inputTextBox: {
      flex: 1,
      minWidth: 0,
    },
    inputValue: {
      color: colors.text,
      fontSize: 28,
      fontWeight: '900',
      letterSpacing: -0.8,
    },
    placeholderValue: {
      color: colors.textMuted,
    },
    tapHint: {
      marginTop: 4,
      fontSize: 11,
      fontWeight: '800',
    },
    clearButton: {
      width: 36,
      height: 36,
      borderRadius: 13,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keypadStatusIcon: {
      width: 36,
      height: 36,
      borderRadius: 13,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewCard: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    previewTextBox: {
      flex: 1,
      minWidth: 0,
    },
    previewValue: {
      marginTop: 4,
      fontWeight: '900',
    },
    previewIcon: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    quickChip: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    quickText: {
      color: colors.text,
      fontWeight: '900',
    },
    helperRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 7,
    },
    helperText: {
      flex: 1,
      lineHeight: 18,
    },
  });
}
