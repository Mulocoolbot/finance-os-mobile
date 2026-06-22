import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AnimatedPressable } from '../../src/components/ui/AnimatedPressable';
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
    title: 'Dashboard',
    description: 'Back to net worth, quick actions, and recent activity.',
    icon: 'home-outline',
    route: '/',
  },
  {
    title: 'Accounts',
    description: 'Manage cash, bank, wallet, saving, archived, and investment accounts.',
    icon: 'wallet-outline',
    route: '/accounts',
  },
  {
    title: 'Savings',
    description: 'Saving goals, deposit flow, withdrawal flow, and linked saving wallets.',
    icon: 'sparkles-outline',
    route: '/savings',
  },
  {
    title: 'Budget',
    description: 'Active and archived budget trackers for category spending control.',
    icon: 'speedometer-outline',
    route: '/budget',
  },
  {
    title: 'Categories',
    description: 'Edit, archive, and manage income/expense categories.',
    icon: 'pricetags-outline',
    route: '/categories',
  },
  {
    title: 'Reports',
    description: 'Cashflow, investment, crypto, trading, and transaction analysis.',
    icon: 'bar-chart-outline',
    route: '/reports',
  },
  {
    title: 'Advanced Search',
    description: 'Search and filter transactions by keyword, type, account, category, date, and amount.',
    icon: 'search-outline',
    route: '/advanced-search',
  },
  {
    title: 'Journal',
    description: 'Trading workspace.',
    icon: 'book-outline',
    route: '/journal',
  },
  {
    title: 'AI Coach',
    description: 'Trading insights.',
    icon: 'sparkles-outline',
    route: '/trading-ai-performance',
  },
  {
    title: 'Profit Pool',
    description: 'Profit allocation.',
    icon: 'pie-chart-outline',
    route: '/trading-profit-pool',
  },
  {
    title: 'Crypto Wallets',
    description: 'Wallet profiles.',
    icon: 'logo-bitcoin',
    route: '/crypto-wallets',
  },
  {
    title: 'Investments',
    description: 'Portfolio overview.',
    icon: 'trending-up-outline',
    route: '/investments',
  },
];

const systemMenus: MenuItem[] = [
  {
    title: 'Settings',
    description: 'App preferences.',
    icon: 'settings-outline',
    route: '/settings',
  },
  {
    title: 'Backup & Restore',
    description: 'JSON backup.',
    icon: 'shield-checkmark-outline',
    route: '/backup',
  },
];

const upcomingMenus: MenuItem[] = [
  {
    title: 'Database + Auth',
    description: 'Auth foundation.',
    icon: 'cloud-outline',
    route: '/auth-readiness',
    badge: 'Next',
  },
  {
    title: 'Real AI API',
    description: 'Server AI.',
    icon: 'sparkles-outline',
    badge: 'Planned',
  },
  {
    title: 'MetaTrader Link',
    description: 'Broker sync.',
    icon: 'sync-outline',
    badge: 'Planned',
  },
  {
    title: 'Crypto Access',
    description: 'Provider/API.',
    icon: 'logo-bitcoin',
    badge: 'Planned',
  },
  {
    title: 'Codebase Refactor',
    description: 'Cleanup.',
    icon: 'construct-outline',
    badge: 'Later',
  },
];

export default function MoreScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <Screen>
      <View style={styles.header}>
        <View>
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

          <AppText variant="caption" muted style={styles.heroDescription}>
            Fast access to active modules and upcoming upgrades.
          </AppText>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Finance Modules</AppText>
        <AppText variant="caption" muted>Active</AppText>
      </View>

      <View style={styles.menuList}>
        {mainMenus.map((item) => (
          <MenuCard key={item.title} item={item} colors={colors} />
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">System</AppText>
        <AppText variant="caption" muted>Control</AppText>
      </View>

      <View style={styles.menuList}>
        {systemMenus.map((item) => (
          <MenuCard key={item.title} item={item} colors={colors} />
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Coming Next</AppText>
        <AppText variant="caption" muted>Planned</AppText>
      </View>

      <View style={styles.menuList}>
        {upcomingMenus.map((item) => (
          <MenuCard key={item.title} item={item} disabled={!item.route} colors={colors} />
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
    <AnimatedPressable
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
    </AnimatedPressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: {
      marginBottom: 18,
    },
    title: {
      marginTop: 4,
    },
    heroCard: {
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 28,
      padding: 16,
      flexDirection: 'row',
      gap: 13,
      alignItems: 'center',
      shadowColor: colors.shadow,
      shadowOpacity: 0.14,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 2,
    },
    heroIcon: {
      width: 50,
      height: 50,
      borderRadius: 18,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroTextBox: {
      flex: 1,
      minWidth: 0,
    },
    heroDescription: {
      marginTop: 5,
      lineHeight: 17,
    },
    sectionHeader: {
      marginTop: 22,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 12,
    },
    menuList: {
      gap: 8,
    },
    menuCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 21,
      padding: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    menuCardDisabled: {
      opacity: 0.72,
    },
    menuIcon: {
      width: 42,
      height: 42,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
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
      marginTop: 3,
      lineHeight: 16,
    },
    badge: {
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
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
