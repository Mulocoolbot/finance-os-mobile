import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemeColors } from '../../constants/colors';
import { useThemeColors } from '../../hooks/useThemeColors';
import { AppText } from './AppText';

type NumericKeyboardProps = {
  onInput: (value: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onDone: () => void;
  allowDecimal?: boolean;
  hasDecimal?: boolean;
};

const keyRows = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

export function NumericKeyboard({
  onInput,
  onBackspace,
  onClear,
  onDone,
  allowDecimal = true,
  hasDecimal = false,
}: NumericKeyboardProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.keyboardCard}>
      <View style={styles.utilityRow}>
        <Pressable onPress={onClear} style={styles.utilityButton}>
          <Ionicons name="trash-outline" size={17} color={colors.textMuted} />

          <AppText variant="caption" style={styles.utilityText}>
            Clear
          </AppText>
        </Pressable>

        <Pressable onPress={onDone} style={styles.doneButton}>
          <Ionicons name="checkmark-outline" size={18} color={colors.black} />

          <AppText variant="caption" style={styles.doneText}>
            Done
          </AppText>
        </Pressable>
      </View>

      {keyRows.map((row) => (
        <View key={row.join('-')} style={styles.row}>
          {row.map((key) => (
            <NumericKey key={key} label={key} onPress={() => onInput(key)} colors={colors} />
          ))}
        </View>
      ))}

      <View style={styles.row}>
        <NumericKey label="00" onPress={() => onInput('00')} colors={colors} />

        <NumericKey label="0" onPress={() => onInput('0')} colors={colors} />

        {allowDecimal ? (
          <NumericKey
            label="."
            onPress={() => {
              if (!hasDecimal) {
                onInput('.');
              }
            }}
            colors={colors}
            disabled={hasDecimal}
          />
        ) : (
          <NumericKey label="⌫" onPress={onBackspace} colors={colors} isAction />
        )}
      </View>

      {allowDecimal ? (
        <View style={styles.row}>
          <Pressable onPress={onBackspace} style={styles.backspaceButton}>
            <Ionicons name="backspace-outline" size={24} color={colors.text} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function NumericKey({
  label,
  onPress,
  colors,
  disabled = false,
  isAction = false,
}: {
  label: string;
  onPress: () => void;
  colors: ThemeColors;
  disabled?: boolean;
  isAction?: boolean;
}) {
  const styles = createStyles(colors);

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.key,
        isAction && styles.actionKey,
        disabled && styles.disabledKey,
      ]}
    >
      <AppText
        variant="subtitle"
        style={[
          styles.keyText,
          disabled && styles.disabledKeyText,
        ]}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    keyboardCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 26,
      padding: 12,
      gap: 9,
    },
    utilityRow: {
      flexDirection: 'row',
      gap: 9,
      marginBottom: 2,
    },
    utilityButton: {
      flex: 1,
      minHeight: 42,
      borderRadius: 15,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 7,
    },
    utilityText: {
      color: colors.textMuted,
      fontWeight: '900',
    },
    doneButton: {
      flex: 1,
      minHeight: 42,
      borderRadius: 15,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 7,
    },
    doneText: {
      color: colors.black,
      fontWeight: '900',
    },
    row: {
      flexDirection: 'row',
      gap: 9,
    },
    key: {
      flex: 1,
      minHeight: 58,
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionKey: {
      backgroundColor: colors.surface,
    },
    disabledKey: {
      opacity: 0.35,
    },
    keyText: {
      color: colors.text,
      fontWeight: '900',
    },
    disabledKeyText: {
      color: colors.textMuted,
    },
    backspaceButton: {
      flex: 1,
      minHeight: 54,
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
