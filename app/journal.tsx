import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AnimatedPressable } from '../src/components/ui/AnimatedPressable';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { TradingAccount, useFinanceStore } from '../src/stores/useFinanceStore';
import { formatCurrency } from '../src/utils/currency';
import {
  convertCurrencyAmount,
  ExchangeRates,
} from '../src/utils/currencyConversion';

function getAccountTypeLabel(accountType: TradingAccount['accountType']) {
  if (accountType === 'cent') return 'Cent';
  if (accountType === 'standard') return 'Standard';
  if (accountType === 'ecn') return 'ECN';
  if (accountType === 'demo') return 'Demo';
  if (accountType === 'raw') return 'Raw';

  return 'Unknown';
}

function getPlatformLabel(platform: TradingAccount['platform']) {
  return platform === 'mt5' ? 'MT5' : 'MT4';
}

function getTradingAccountRealAmount(account: TradingAccount, amount: number) {
  if (account.accountType === 'cent') {
    return amount / 100;
  }

  return amount;
}

function getLinkedWalletName(
  linkedBrokerWalletAccountId: string | null | undefined,
  accounts: { id: string; name: string }[]
) {
  if (!linkedBrokerWalletAccountId) {
    return 'No linked broker wallet';
  }

  return accounts.find((account) => account.id === linkedBrokerWalletAccountId)?.name || 'Linked wallet not found';
}


function convertTradingAccountAmount(
  amount: number,
  fromCurrency: TradingAccount['currency'],
  toCurrency: TradingAccount['currency'],
  exchangeRates: ExchangeRates
) {
  return convertCurrencyAmount(amount, fromCurrency, toCurrency, exchangeRates);
}

function getJournalSummary(
  tradingAccounts: TradingAccount[],
  baseCurrency: TradingAccount['currency'],
  exchangeRates: ExchangeRates
) {
  const totalBalance = tradingAccounts.reduce((total, account) => {
    return (
      total +
      convertTradingAccountAmount(
        getTradingAccountRealAmount(account, account.balance),
        account.currency,
        baseCurrency,
        exchangeRates
      )
    );
  }, 0);

  const totalEquity = tradingAccounts.reduce((total, account) => {
    return (
      total +
      convertTradingAccountAmount(
        getTradingAccountRealAmount(account, account.equity),
        account.currency,
        baseCurrency,
        exchangeRates
      )
    );
  }, 0);

  const floatingPnL = totalEquity - totalBalance;

  return {
    totalBalance,
    totalEquity,
    floatingPnL,
    accountCount: tradingAccounts.length,
  };
}

export default function JournalScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const tradingAccounts = useFinanceStore((state) => state.tradingAccounts);
  const tradingTrades = useFinanceStore((state) => state.tradingTrades);
  const tradingPlans = useFinanceStore((state) => state.tradingPlans);
  const accounts = useFinanceStore((state) => state.accounts);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);
  const exchangeRates = useFinanceStore((state) => state.exchangeRates);

  const summary = getJournalSummary(tradingAccounts, defaultCurrency, exchangeRates);
  const openTradeCount = tradingTrades.filter((trade) => trade.status === 'open').length;
  const closedTradeCount = tradingTrades.filter((trade) => trade.status === 'closed').length;
  const plannedAccountCount = new Set(tradingPlans.map((plan) => plan.tradingAccountId)).size;

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <AppText variant="title" style={styles.title}>
            Journal
          </AppText>
        </View>

        <AnimatedPressable onPress={() => router.push('/add-trading-account' as any)} style={styles.addButton}>
          <Ionicons name="add-outline" size={20} color={colors.black} />
        </AnimatedPressable>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons name="book-outline" size={26} color={colors.text} />
        </View>

        <View style={styles.heroTextBox}>
          <AppText variant="subtitle">Trading Journal</AppText>

          <AppText variant="caption" muted style={styles.heroDescription}>
            Accounts, trades, plan, reports, and AI coach.
          </AppText>
        </View>
      </View>

      <View style={styles.workspaceCard}>
        <View style={styles.workspaceHeader}>
          <View>
            <AppText variant="caption" muted>
              Trading Workspace
            </AppText>

            <AppText variant="subtitle" style={styles.workspaceTitle}>
              Overview
            </AppText>
          </View>

          <View style={styles.workspaceBadge}>
            <Ionicons name="pulse-outline" size={15} color={colors.text} />

            <AppText variant="caption" style={styles.workspaceBadgeText}>
              Live
            </AppText>
          </View>
        </View>

        <View style={styles.workspaceMetricRow}>
          <View style={styles.workspaceMetric}>
            <AppText variant="caption" muted>
              Accounts
            </AppText>

            <AppText variant="subtitle" style={styles.workspaceMetricValue}>
              {tradingAccounts.length}
            </AppText>
          </View>

          <View style={styles.workspaceMetric}>
            <AppText variant="caption" muted>
              Open Trades
            </AppText>

            <AppText variant="subtitle" style={[styles.workspaceMetricValue, { color: openTradeCount > 0 ? colors.investment : colors.text }]}>
              {openTradeCount}
            </AppText>
          </View>

          <View style={styles.workspaceMetric}>
            <AppText variant="caption" muted>
              Closed
            </AppText>

            <AppText variant="subtitle" style={styles.workspaceMetricValue}>
              {closedTradeCount}
            </AppText>
          </View>
        </View>

        <AppText variant="caption" muted style={styles.workspaceDescription}>
          {plannedAccountCount} planned account{plannedAccountCount === 1 ? '' : 's'}.
        </AppText>
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Trading Tools</AppText>
        <AppText variant="caption" muted>
          Shortcuts
        </AppText>
      </View>

      <View style={styles.workflowGrid}>
        <JournalShortcut
          icon="add-circle-outline"
          label="Add Trade"
          description="Record position"
          onPress={() => router.push('/add-trading-trade' as any)}
          colors={colors}
        />

        <JournalShortcut
          icon="shield-checkmark-outline"
          label="Trading Plan"
          description="Risk rules"
          onPress={() => router.push('/trading-plan' as any)}
          colors={colors}
        />

        <JournalShortcut
          icon="bar-chart-outline"
          label="Reports"
          description="Performance"
          onPress={() => router.push('/reports' as any)}
          colors={colors}
        />

        <JournalShortcut
          icon="swap-horizontal-outline"
          label="Cash Flow"
          description="Deposit/withdraw"
          onPress={() => router.push('/trading-cash-event' as any)}
          colors={colors}
        />

        <JournalShortcut
          icon="pie-chart-outline"
          label="Profit Pool"
          description="Split realized profit"
          onPress={() => router.push('/trading-profit-pool' as any)}
          colors={colors}
        />

        <JournalShortcut
          icon="sparkles-outline"
          label="AI Coach"
          description="Performance summary"
          onPress={() => router.push('/trading-ai-performance' as any)}
          colors={colors}
        />
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Account Snapshot</AppText>
        <AppText variant="caption" muted>
          {defaultCurrency}
        </AppText>
      </View>

      <View style={styles.metricGrid}>
        <MetricCard
          label="Balance"
          value={formatCurrency(summary.totalBalance, defaultCurrency)}
          icon="wallet-outline"
          colors={colors}
        />

        <MetricCard
          label="Equity"
          value={formatCurrency(summary.totalEquity, defaultCurrency)}
          icon="pulse-outline"
          colors={colors}
        />

        <MetricCard
          label="Floating P/L"
          value={formatCurrency(summary.floatingPnL, defaultCurrency)}
          icon="analytics-outline"
          colors={colors}
          tone={summary.floatingPnL >= 0 ? colors.income : colors.expense}
        />

        <MetricCard
          label="Accounts"
          value={`${summary.accountCount}`}
          icon="desktop-outline"
          colors={colors}
        />
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Trading Accounts</AppText>
        <AppText variant="caption" muted>
          {tradingAccounts.length} account{tradingAccounts.length === 1 ? '' : 's'}
        </AppText>
      </View>

      {tradingAccounts.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons name="server-outline" size={24} color={colors.textMuted} />
          </View>

          <AppText variant="subtitle">No trading account yet</AppText>

          <AppText variant="body" muted style={styles.emptyDescription}>
            Add your MT4/MT5 account manually first. Later, this module can read account info from import or auto-sync.
          </AppText>

          <Pressable onPress={() => router.push('/add-trading-account' as any)} style={styles.primaryButton}>
            <Ionicons name="add-outline" size={18} color={colors.black} />

            <AppText variant="body" style={styles.primaryButtonText}>
              Add Trading Account
            </AppText>
          </Pressable>
        </View>
      ) : (
        <View style={styles.accountList}>
          {tradingAccounts.map((account) => (
            <TradingAccountCard key={account.id} account={account} accounts={accounts} colors={colors} />
          ))}
        </View>
      )}

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Trading Workflow Status</AppText>
        <AppText variant="caption" muted>
          Active
        </AppText>
      </View>

      <View style={styles.roadmapCard}>
        <View style={styles.roadmapRow}>
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.income} />

          <AppText variant="body" style={styles.roadmapText}>
            Trading accounts, cash flow, and trade history are active
          </AppText>
        </View>

        <View style={styles.roadmapRow}>
          <Ionicons name="document-text-outline" size={20} color={colors.textMuted} />

          <AppText variant="body" muted style={styles.roadmapText}>
            Trading plan, plan compliance, and AI summary are active
          </AppText>
        </View>

        <View style={styles.roadmapRow}>
          <Ionicons name="pie-chart-outline" size={20} color={colors.textMuted} />

          <AppText variant="body" muted style={styles.roadmapText}>
            Profit pool planner is active inside Journal
          </AppText>
        </View>

        <View style={styles.roadmapRow}>
          <Ionicons name="sparkles-outline" size={20} color={colors.textMuted} />

          <AppText variant="body" muted style={styles.roadmapText}>
            AI performance coach is active inside Journal
          </AppText>
        </View>

        <View style={styles.roadmapRow}>
          <Ionicons name="sync-outline" size={20} color={colors.textMuted} />

          <AppText variant="body" muted style={styles.roadmapText}>
            Later: MT4/MT5 statement import or cloud sync
          </AppText>
        </View>
      </View>
    </Screen>
  );
}

function JournalShortcut({
  icon,
  label,
  description,
  onPress,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  onPress: () => void;
  colors: ThemeColors;
}) {
  const styles = createStyles(colors);

  return (
    <AnimatedPressable onPress={onPress} style={styles.workflowCard}>
      <View style={styles.workflowIcon}>
        <Ionicons name={icon} size={19} color={colors.text} />
      </View>

      <View style={styles.workflowTextBox}>
        <AppText variant="caption" style={styles.workflowLabel} numberOfLines={1}>
          {label}
        </AppText>

        <AppText variant="caption" muted style={styles.workflowDescription} numberOfLines={1}>
          {description}
        </AppText>
      </View>
    </AnimatedPressable>
  );
}

function MetricCard({
  label,
  value,
  icon,
  colors,
  tone,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: ThemeColors;
  tone?: string;
}) {
  const styles = createStyles(colors);

  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIcon}>
        <Ionicons name={icon} size={18} color={tone || colors.textMuted} />
      </View>

      <AppText variant="caption" muted>
        {label}
      </AppText>

      <AppText variant="body" style={[styles.metricValue, tone ? { color: tone } : null]} numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

function TradingAccountCard({
  account,
  accounts,
  colors,
}: {
  account: TradingAccount;
  accounts: { id: string; name: string }[];
  colors: ThemeColors;
}) {
  const styles = createStyles(colors);
  const realBalance = getTradingAccountRealAmount(account, account.balance);
  const realEquity = getTradingAccountRealAmount(account, account.equity);
  const floatingPnL = realEquity - realBalance;

  return (
    <View style={styles.accountCard}>
      <View style={styles.accountHeader}>
        <View style={styles.accountIcon}>
          <Ionicons name="desktop-outline" size={21} color={colors.text} />
        </View>

        <View style={styles.accountTitleBox}>
          <AppText variant="body" style={styles.accountTitle} numberOfLines={1}>
            {account.name}
          </AppText>

          <AppText variant="caption" muted numberOfLines={1}>
            {account.broker} • {getPlatformLabel(account.platform)}
          </AppText>
        </View>

        <View style={styles.accountTypeBadge}>
          <AppText variant="caption" style={styles.accountTypeText}>
            {getAccountTypeLabel(account.accountType)}
          </AppText>
        </View>
      </View>

      <View style={styles.accountMetaGrid}>
        <InfoPill label="Server" value={account.server} colors={colors} />
        <InfoPill label="Leverage" value={`1:${account.leverage}`} colors={colors} />
        <InfoPill label={account.accountType === 'cent' ? 'Cent Balance' : 'Balance'} value={formatCurrency(account.balance, account.currency)} colors={colors} />
        <InfoPill label="Real Balance" value={formatCurrency(realBalance, account.currency)} colors={colors} />
        <InfoPill label="Equity" value={formatCurrency(account.equity, account.currency)} colors={colors} />
        <InfoPill label="Linked Wallet" value={getLinkedWalletName(account.linkedBrokerWalletAccountId, accounts)} colors={colors} />
      </View>

      <View style={styles.accountFooter}>
        <AppText variant="caption" muted numberOfLines={1}>
          Account #{account.accountNumber}
        </AppText>

        <AppText
          variant="caption"
          style={[styles.pnlText, { color: floatingPnL >= 0 ? colors.income : colors.expense }]}
          numberOfLines={1}
        >
          Floating {formatCurrency(floatingPnL, account.currency)}
        </AppText>
      </View>

      <Pressable
        onPress={() => router.push(`/trading-account-detail?tradingAccountId=${account.id}` as any)}
        style={styles.openJournalButton}
      >
        <Ionicons name="analytics-outline" size={15} color={colors.black} />

        <AppText variant="caption" style={styles.openJournalButtonText}>
          Open Account Journal
        </AppText>
      </Pressable>

      <Pressable
        onPress={() => router.push(`/edit-trading-account?tradingAccountId=${account.id}` as any)}
        style={styles.editTradingButton}
      >
        <Ionicons name="create-outline" size={15} color={colors.text} />

        <AppText variant="caption" style={styles.editTradingButtonText}>
          Edit Trading Account
        </AppText>
      </Pressable>

      <View style={styles.cashActionRow}>
        <Pressable
          onPress={() =>
            router.push(`/trading-cash-event?tradingAccountId=${account.id}&eventType=deposit` as any)
          }
          style={styles.cashActionButton}
        >
          <Ionicons name="arrow-down-outline" size={15} color={colors.black} />

          <AppText variant="caption" style={styles.cashActionButtonText}>
            Deposit
          </AppText>
        </Pressable>

        <Pressable
          onPress={() =>
            router.push(`/trading-cash-event?tradingAccountId=${account.id}&eventType=withdrawal` as any)
          }
          style={styles.cashActionButtonMuted}
        >
          <Ionicons name="arrow-up-outline" size={15} color={colors.text} />

          <AppText variant="caption" style={styles.cashActionButtonMutedText}>
            Withdraw
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

function InfoPill({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ThemeColors;
}) {
  const styles = createStyles(colors);

  return (
    <View style={styles.infoPill}>
      <AppText variant="caption" muted numberOfLines={1}>
        {label}
      </AppText>

      <AppText variant="caption" style={styles.infoPillValue} numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: {
      marginBottom: 18,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 14,
    },
    title: {
      marginTop: 4,
    },
    addButton: {
      width: 46,
      height: 46,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.shadow,
      shadowOpacity: 0.22,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    heroCard: {
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 28,
      padding: 16,
      flexDirection: 'row',
      gap: 13,
      marginBottom: 14,
      shadowColor: colors.shadow,
      shadowOpacity: 0.14,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 2,
    },
    heroIcon: {
      width: 52,
      height: 52,
      borderRadius: 20,
      backgroundColor: colors.accentSoft,
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
    workspaceCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 24,
      padding: 14,
      marginTop: 0,
      marginBottom: 2,
    },
    workspaceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    workspaceTitle: {
      marginTop: 4,
    },
    workspaceBadge: {
      minHeight: 32,
      borderRadius: 999,
      backgroundColor: colors.incomeSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    workspaceBadgeText: {
      color: colors.text,
      fontWeight: '900',
    },
    workspaceMetricRow: {
      marginTop: 12,
      flexDirection: 'row',
      gap: 8,
    },
    workspaceMetric: {
      flex: 1,
      minHeight: 60,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      padding: 10,
      justifyContent: 'center',
    },
    workspaceMetricValue: {
      marginTop: 5,
      color: colors.text,
    },
    workspaceDescription: {
      marginTop: 10,
      lineHeight: 17,
    },
    workflowGrid: {
      marginTop: 0,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 9,
    },
    workflowCard: {
      flexGrow: 1,
      flexBasis: '47%',
      minHeight: 68,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      padding: 11,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    workflowIcon: {
      width: 36,
      height: 36,
      borderRadius: 15,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    workflowTextBox: {
      flex: 1,
      minWidth: 0,
    },
    workflowLabel: {
      color: colors.text,
      fontWeight: '900',
    },
    workflowDescription: {
      marginTop: 3,
      lineHeight: 16,
    },
    sectionHeader: {
      marginTop: 14,
      marginBottom: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: 12,
    },
    metricGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 18,
    },
    metricCard: {
      flexGrow: 1,
      flexBasis: '47%',
      minWidth: 140,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 22,
      padding: 13,
      gap: 6,
    },
    metricIcon: {
      width: 34,
      height: 34,
      borderRadius: 13,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
    metricValue: {
      color: colors.text,
      fontWeight: '900',
      fontSize: 13,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 20,
      alignItems: 'center',
      marginBottom: 18,
    },
    emptyIcon: {
      width: 52,
      height: 52,
      borderRadius: 20,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    emptyDescription: {
      marginTop: 8,
      lineHeight: 21,
      textAlign: 'center',
    },
    primaryButton: {
      marginTop: 16,
      minHeight: 52,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 18,
      alignSelf: 'stretch',
    },
    primaryButtonText: {
      color: colors.black,
      fontWeight: '900',
    },
    accountList: {
      gap: 12,
      marginBottom: 18,
    },
    accountCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 14,
      gap: 13,
    },
    accountHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
    },
    accountIcon: {
      width: 44,
      height: 44,
      borderRadius: 17,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    accountTitleBox: {
      flex: 1,
      minWidth: 0,
    },
    accountTitle: {
      color: colors.text,
      fontWeight: '900',
    },
    accountTypeBadge: {
      borderRadius: 999,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    accountTypeText: {
      color: colors.text,
      fontWeight: '900',
      fontSize: 10,
    },
    accountMetaGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 9,
    },
    infoPill: {
      flexGrow: 1,
      flexBasis: '47%',
      minWidth: 130,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
      gap: 3,
    },
    infoPillValue: {
      color: colors.text,
      fontWeight: '900',
    },
    accountFooter: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 11,
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    pnlText: {
      fontWeight: '900',
      flexShrink: 0,
    },
    openJournalButton: {
      minHeight: 42,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 7,
    },
    openJournalButtonText: {
      color: colors.black,
      fontWeight: '900',
    },
    editTradingButton: {
      minHeight: 38,
      borderRadius: 15,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 7,
    },
    editTradingButtonText: {
      color: colors.text,
      fontWeight: '900',
    },
    cashActionRow: {
      flexDirection: 'row',
      gap: 9,
    },
    cashActionButton: {
      flex: 1,
      minHeight: 40,
      borderRadius: 15,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 7,
    },
    cashActionButtonText: {
      color: colors.black,
      fontWeight: '900',
    },
    cashActionButtonMuted: {
      flex: 1,
      minHeight: 40,
      borderRadius: 15,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 7,
    },
    cashActionButtonMutedText: {
      color: colors.text,
      fontWeight: '900',
    },
    roadmapCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 15,
      gap: 12,
      marginBottom: 8,
    },
    roadmapRow: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
    },
    roadmapText: {
      flex: 1,
      lineHeight: 20,
      color: colors.text,
      fontWeight: '800',
    },
  });
}
