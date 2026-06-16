import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../src/components/ui/AppText';
import { Screen } from '../../src/components/ui/Screen';
import { ThemeColors } from '../../src/constants/colors';
import { useThemeColors } from '../../src/hooks/useThemeColors';

type MenuItem = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?: string;
  badge?: string;
};

const mainMenus: MenuItem[] = [
  {
    title: 'Accounts',
    description: 'Manage cash, bank, wallet, saving, and investment accounts.',
    icon: 'wallet-outline',
    route: '/accounts',
  },
  {
    title: 'Savings',
    description: 'Track saving goals and linked saving wallets.',
    icon: 'sparkles-outline',
    route: '/savings',
  },
  {
    title: 'Categories',
    description: 'Customize income and expense categories.',
    icon: 'pricetags-outline',
    route: '/categories',
  },
  {
    title: 'Investments',
    description: 'View broker and crypto wallet portfolio summary.',
    icon: 'trending-up-outline',
    route: '/investments',
  },
  {
    title: 'Backup & Restore',
    description: 'Export and import local finance data as JSON.',
    icon: 'shield-checkmark-outline',
    route: '/backup',
  },
  {
    title: 'Settings',
    description: 'App preferences, theme, data tools, and finance configuration.',
    icon: 'settings-outline',
    route: '/settings',
  },
];

const upcomingMenus: MenuItem[] = [
  {
    title: 'Trading Pool',
    description: 'Weekly profit allocation for trading income.',
    icon: 'pie-chart-outline',
    badge: 'Soon',
  },
  {
    title: 'Cloud Sync',
    description: 'Sync data across devices with secure online storage.',
    icon: 'cloud-outline',
    badge: 'Soon',
  },
];

export default function MoreScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <AppText variant="caption" muted>
            Finance OS Mobile
          </AppText>

          <AppText variant="title" style={styles.title}>
            More
          </AppText>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons name="grid-outline" size={24} color={colors.text} />
        </View>

        <View style={styles.heroTextBox}>
          <AppText variant="subtitle">Control Center</AppText>

          <AppText variant="body" muted style={styles.heroDescription}>
            Manage supporting modules, app preferences, backup tools, and upcoming finance tools.
          </AppText>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Manage</AppText>
        <AppText variant="caption" muted>Active modules</AppText>
      </View>

      <View style={styles.menuList}>
        {mainMenus.map((item) => (
          <MenuCard key={item.title} item={item} colors={colors} />
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Coming Next</AppText>
        <AppText variant="caption" muted>Planned modules</AppText>
      </View>

      <View style={styles.menuList}>
        {upcomingMenus.map((item) => (
          <MenuCard key={item.title} item={item} disabled colors={colors} />
        ))}
      </View>
    </Screen>
  );
}

function MenuCard({
  item,
  disabled = false,
  colors,
}: {
  item: MenuItem;
  disabled?: boolean;
  colors: ThemeColors;
}) {
  const styles = createStyles(colors);

  return (
    <Pressable
      disabled={disabled || !item.route}
      onPress={() => {
        if (item.route) router.push(item.route as any);
      }}
      style={[styles.menuCard, disabled && styles.menuCardDisabled]}
    >
      <View style={[styles.menuIcon, disabled && styles.menuIconDisabled]}>
        <Ionicons name={item.icon} size={22} color={disabled ? colors.textMuted : colors.text} />
      </View>

      <View style={styles.menuTextBox}>
        <View style={styles.menuTitleRow}>
          <AppText variant="body" style={[styles.menuTitle, disabled && styles.menuTitleDisabled]}>
            {item.title}
          </AppText>

          {item.badge ? (
            <View style={styles.badge}>
              <AppText variant="caption" style={styles.badgeText}>
                {item.badge}
              </AppText>
            </View>
          ) : null}
        </View>

        <AppText variant="caption" muted style={styles.menuDescription}>
          {item.description}
        </AppText>
      </View>

      {!disabled ? (
        <Ionicons name="chevron-forward-outline" size={19} color={colors.textMuted} />
      ) : null}
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: {
      marginBottom: 22,
    },
    title: {
      marginTop: 4,
    },
    heroCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 28,
      padding: 18,
      flexDirection: 'row',
      gap: 14,
      alignItems: 'center',
    },
    heroIcon: {
      width: 52,
      height: 52,
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroTextBox: {
      flex: 1,
      minWidth: 0,
    },
    heroDescription: {
      marginTop: 6,
      lineHeight: 21,
    },
    sectionHeader: {
      marginTop: 28,
      marginBottom: 14,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 12,
    },
    menuList: {
      gap: 10,
    },
    menuCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 15,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
    },
    menuCardDisabled: {
      opacity: 0.72,
    },
    menuIcon: {
      width: 46,
      height: 46,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuIconDisabled: {
      backgroundColor: colors.background,
    },
    menuTextBox: {
      flex: 1,
      minWidth: 0,
    },
    menuTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    menuTitle: {
      fontWeight: '900',
    },
    menuTitleDisabled: {
      color: colors.textMuted,
    },
    menuDescription: {
      marginTop: 4,
      lineHeight: 18,
    },
    badge: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    badgeText: {
      color: colors.textMuted,
      fontWeight: '900',
      fontSize: 9,
    },
  });
}
