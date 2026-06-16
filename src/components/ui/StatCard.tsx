import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { ThemeColors } from '../../constants/colors';
import { useThemeColors } from '../../hooks/useThemeColors';
import { AppText } from './AppText';

type StatTone = 'income' | 'expense' | 'saving' | 'investment' | 'transfer';

type StatCardProps = {
  label: string;
  value: string;
  tone?: StatTone;
  style?: StyleProp<ViewStyle>;
};

function getToneColor(colors: ThemeColors, tone?: StatTone) {
  if (tone === 'income') {
    return colors.income;
  }

  if (tone === 'expense') {
    return colors.expense;
  }

  if (tone === 'saving') {
    return colors.saving;
  }

  if (tone === 'investment') {
    return colors.investment;
  }

  if (tone === 'transfer') {
    return colors.transfer;
  }

  return colors.text;
}

export function StatCard({ label, value, tone, style }: StatCardProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const toneColor = getToneColor(colors, tone);

  return (
    <View style={[styles.card, style]}>
      <AppText variant="caption" muted>
        {label}
      </AppText>

      <AppText
        variant="subtitle"
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          styles.value,
          {
            color: toneColor,
          },
        ]}
      >
        {value}
      </AppText>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexBasis: '47%',
      flexGrow: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 16,
      minHeight: 92,
    },
    value: {
      marginTop: 8,
      fontWeight: '900',
    },
  });
}
