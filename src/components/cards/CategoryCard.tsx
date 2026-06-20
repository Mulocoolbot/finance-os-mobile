import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemeColors } from '../../constants/colors';
import { useThemeColors } from '../../hooks/useThemeColors';
import { Category } from '../../types/finance';
import { AppText } from '../ui/AppText';

type CategoryCardProps = {
  category: Category;
  onPress?: () => void;
};

export function CategoryCard({ category, onPress }: CategoryCardProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View
        style={[
          styles.iconBox,
          {
            borderColor: category.color || colors.border,
          },
        ]}
      >
        <Ionicons
          name={(category.icon || 'pricetag-outline') as any}
          size={21}
          color={category.color || colors.text}
        />
      </View>

      <View style={styles.textBox}>
        <AppText variant="body" style={styles.name} numberOfLines={1}>
          {category.name}
        </AppText>

        <AppText variant="caption" muted numberOfLines={1}>
          {category.type === 'income' ? 'Income' : 'Expense'} •{' '}
          {category.isDefault ? 'Default' : 'Custom'}
        </AppText>
      </View>

      {onPress ? (
        <View style={styles.actionHint}>
          <Ionicons name="create-outline" size={16} color={colors.textMuted} />
        </View>
      ) : null}
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 15,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
    },
    iconBox: {
      width: 48,
      height: 48,
      borderRadius: 17,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textBox: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      color: colors.text,
      fontWeight: '900',
    },
    actionHint: {
      width: 34,
      height: 34,
      borderRadius: 13,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
