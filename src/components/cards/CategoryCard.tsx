import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { ThemeColors } from '../../constants/colors';
import { useThemeColors } from '../../hooks/useThemeColors';
import { Category } from '../../types/finance';
import { AppText } from '../ui/AppText';

type CategoryCardProps = {
  category: Category;
};

export function CategoryCard({ category }: CategoryCardProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.card}>
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
          size={22}
          color={category.color || colors.text}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.nameBox}>
            <AppText variant="body" style={styles.name} numberOfLines={1}>
              {category.name}
            </AppText>

            <AppText variant="caption" muted>
              {category.type === 'income' ? 'Income' : 'Expense'} category
            </AppText>
          </View>

          <View style={styles.badge}>
            <AppText variant="caption" muted>
              {category.isDefault ? 'Default' : 'Custom'}
            </AppText>
          </View>
        </View>
      </View>
    </View>
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
    content: {
      flex: 1,
      minWidth: 0,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      justifyContent: 'space-between',
    },
    nameBox: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      fontWeight: '900',
      marginBottom: 4,
    },
    badge: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
  });
}
