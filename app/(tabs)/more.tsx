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
    description: 'Trading journal, trading plan, account detail, profit pool, and AI coach.',
    icon: 'book-outline',
    route: '/journal',
  },
  {
    title: 'AI Coach',
    description: 'Local trading performance summary with insights and next action plan.',
    icon: 'sparkles-outline',
    route: '/trading-ai-performance',
  },
  {
    title: 'Profit Pool',
    description: 'Split realized trading profit into reinvest, withdraw, reserve, and other pools.',
    icon: 'pie-chart-outline',
    route: '/trading-profit-pool',
  },
  {
    title: 'Crypto Wallets',
    description: 'Save Web3/CEX wallet profiles using crypto assets returned by API/provider.',
    icon: 'logo-bitcoin',
    route: '/crypto-wallets',
  },
  {
    title: 'Investments',
    description: 'View broker and crypto wallet portfolio summary.',
    icon: 'trending-up-outline',
    route: '/investments',
  },
];

const systemMenus: MenuItem[] = [
  {
    title: 'Settings',
    description: 'Theme, currency base, exchange-rate audit, and navigation hub.',
    icon: 'settings-outline',
    route: '/settings',
  },
  {
    title: 'Backup & Restore',
    description: 'Export and import local finance data as JSON.',
    icon: 'shield-checkmark-outline',
    route: '/backup',
  },
];

const upcomingMenus: MenuItem[] = [
  {
    title: 'Database + Auth',
    description: 'Cloud database, email login, Google sign-in, and account-based sync.',
    icon: 'cloud-outline',
    badge: 'Planned',
  },
  {
    title: 'Real AI API',
    description: 'External AI summary through secure backend after auth/database.',
    icon: 'sparkles-outline',
    badge: 'Planned',
  },
  {
    title: 'MetaTrader Link',
    description: 'MT4/MT5 statement import or account sync preparation.',
    icon: 'sync-outline',
    badge: 'Planned',
  },
  {
    title: 'Crypto Access',
    description: 'Connect real crypto account or wallet through provider/API access.',
    icon: 'logo-bitcoin',
    badge: 'Planned',
  },
  {
    title: 'Codebase Refactor',
    description: 'Split large files, reduce duplication, and improve maintainability.',
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
            Open finished modules and see what is planned next: finance, budgets, reports, trading journal, AI coach, settings, and backup tools.
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
