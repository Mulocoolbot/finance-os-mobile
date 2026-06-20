import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AccountCard } from '../src/components/cards/AccountCard';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { StatCard } from '../src/components/ui/StatCard';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { TradingAccount, useFinanceStore } from '../src/stores/useFinanceStore';
import { Account, Currency } from '../src/types/finance';
import { formatCurrency } from '../src/utils/currency';
import { formatCompactCurrency } from '../src/utils/formatCompactCurrency';
import { convertCurrencyAmount, ExchangeRates } from '../src/utils/currencyConversion';

type AccountGroup = {
  key: string;
  title: string;
  description: string;
  accounts: Account[];
};

function getAccountSummary(
  accounts: Account[],
  tradingAccounts: TradingAccount[],
  currencyBase: Currency,
  exchangeRates: ExchangeRates
) {
  const activeAccounts = accounts.filter((account) => account.isActive);
  const activeTradingAccounts = tradingAccounts.filter((account) => account.isActive);

  const getAccountBalanceInBaseCurrency = (account: Account) => {
    return convertCurrencyAmount(
      account.balance,
      account.currency || currencyBase,
      currencyBase,
      exchangeRates
    );
  };

  const getTradingBalanceInBaseCurrency = (account: TradingAccount) => {
    return convertCurrencyAmount(
      getTradingAccountRealAmount(account, account.balance),
      account.currency || currencyBase,
      currencyBase,
      exchangeRates
    );
  };

  const availableBalance = activeAccounts
    .filter(
      (account) =>
        account.type !== 'saving' &&
        account.type !== 'broker' &&
        account.type !== 'crypto_wallet'
    )
    .reduce((total, account) => total + getAccountBalanceInBaseCurrency(account), 0);

  const totalSavings = activeAccounts
    .filter((account) => account.type === 'saving')
    .reduce((total, account) => total + getAccountBalanceInBaseCurrency(account), 0);

  const totalInvestment = activeAccounts
    .filter((account) => account.type === 'broker' || account.type === 'crypto_wallet')
    .reduce((total, account) => total + getAccountBalanceInBaseCurrency(account), 0);

  const totalTrading = activeTradingAccounts.reduce(
    (total, account) => total + getTradingBalanceInBaseCurrency(account),
    0
  );

  const netWorth = activeAccounts.reduce(
    (total, account) => total + getAccountBalanceInBaseCurrency(account),
    0
  );

  return {
    activeCount: activeAccounts.length + activeTradingAccounts.length,
    availableBalance,
    totalSavings,
    totalInvestment,
    totalTrading,
    netWorth,
  };
}
function buildAccountGroups(accounts: Account[]): AccountGroup[] {
  const activeAccounts = accounts.filter((account) => account.isActive);
  const archivedAccounts = accounts.filter((account) => !account.isActive);

  return [
    {
      key: 'cash-bank',
      title: 'Cash & Bank',
      description: 'Cash, bank accounts, and main money sources.',
      accounts: activeAccounts.filter(
        (account) => account.type === 'cash' || account.type === 'bank'
      ),
    },
    {
      key: 'wallets',
      title: 'E-Wallets',
      description: 'Digital wallets and payment accounts.',
      accounts: activeAccounts.filter((account) => account.type === 'e_wallet'),
    },
    {
      key: 'savings',
      title: 'Savings',
      description: 'Sub-wallets connected to saving goals.',
      accounts: activeAccounts.filter((account) => account.type === 'saving'),
    },
    {
      key: 'investments',
      title: 'Investments',
      description: 'Broker and crypto wallet balances.',
      accounts: activeAccounts.filter(
        (account) => account.type === 'broker' || account.type === 'crypto_wallet'
      ),
    },
    {
      key: 'custom',
      title: 'Custom',
      description: 'Other custom account types.',
      accounts: activeAccounts.filter((account) => account.type === 'custom'),
    },
    {
      key: 'archived',
      title: 'Archived Accounts',
      description: 'Inactive accounts kept to preserve historical records.',
      accounts: archivedAccounts,
    },
  ].filter((group) => group.accounts.length > 0);
}


function getTradingAccountTypeLabel(accountType: TradingAccount['accountType']) {
  if (accountType === 'cent') return 'Cent';
  if (accountType === 'standard') return 'Standard';
  if (accountType === 'ecn') return 'ECN';
  if (accountType === 'demo') return 'Demo';
  if (accountType === 'raw') return 'Raw';

  return 'Unknown';
}

function getTradingPlatformLabel(platform: TradingAccount['platform']) {
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
  accounts: Account[]
) {
  if (!linkedBrokerWalletAccountId) {
    return 'No linked wallet';
  }

  return accounts.find((account) => account.id === linkedBrokerWalletAccountId)?.name || 'Linked wallet not found';
}


export default function AccountsScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const accounts = useFinanceStore((state) => state.accounts);
  const tradingAccounts = useFinanceStore((state) => state.tradingAccounts);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);
  const exchangeRates = useFinanceStore((state) => state.exchangeRates);

  const accountSummary = useMemo(() => {
    return getAccountSummary(accounts, tradingAccounts, defaultCurrency, exchangeRates);
  }, [accounts, tradingAccounts, defaultCurrency, exchangeRates]);
  const accountGroups = useMemo(() => buildAccountGroups(accounts), [accounts]);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.headerText}>
          <AppText variant="caption" muted>
            Finance OS Mobile
          </AppText>

          <AppText variant="title" style={styles.title}>
            Accounts
          </AppText>
        </View>

        <Pressable onPress={() => router.push('/add-account')} style={styles.addButton}>
          <Ionicons name="add-outline" size={24} color={colors.black} />
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroTextBox}>
            <AppText variant="caption" muted>
              Total Net Worth • {defaultCurrency} base
            </AppText>

            <AppText variant="title" style={styles.netWorth}>
              {formatCompactCurrency(accountSummary.netWorth, defaultCurrency)}
            </AppText>

            <AppText variant="caption" muted style={styles.fullValue}>
              {formatCurrency(accountSummary.netWorth, defaultCurrency)}
            </AppText>
          </View>

          <View style={styles.activeBadge}>
            <Ionicons name="wallet-outline" size={15} color={colors.text} />

            <AppText variant="caption" style={styles.activeBadgeText}>
              {accountSummary.activeCount} active
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => router.push('/transfer-balance' as any)} style={styles.transferButton}>
          <Ionicons name="swap-horizontal-outline" size={18} color={colors.black} />

          <AppText variant="body" style={styles.transferButtonText}>
            Transfer Balance
          </AppText>
        </Pressable>
      </View>

      <View style={styles.grid}>
        <StatCard label="Available" value={formatCompactCurrency(accountSummary.availableBalance, defaultCurrency)} />
        <StatCard label="Savings" value={formatCompactCurrency(accountSummary.totalSavings, defaultCurrency)} tone="saving" />
        <StatCard label="Investment" value={formatCompactCurrency(accountSummary.totalInvestment, defaultCurrency)} tone="investment" />
        <StatCard label="Trading Monitor" value={formatCompactCurrency(accountSummary.totalTrading, defaultCurrency)} tone="transfer" />
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Account Groups</AppText>
        <AppText variant="caption" muted>{accountGroups.length} groups</AppText>
      </View>

      <View style={styles.groupList}>
        {accountGroups.length === 0 ? (
          <View style={styles.emptyCard}>
            <AppText variant="subtitle">No accounts yet</AppText>
            <AppText variant="body" muted style={styles.emptyDescription}>
              Create your first account to start tracking balances.
            </AppText>
          </View>
        ) : null}

        {accountGroups.map((group) => (
          <View key={group.key} style={styles.group}>
            <View style={styles.groupHeader}>
              <View style={styles.groupTitleBox}>
                <AppText variant="body" style={styles.groupTitle}>
                  {group.title}
                </AppText>

                <AppText variant="caption" muted style={styles.groupDescription}>
                  {group.description}
                </AppText>
              </View>

              <View style={styles.groupCount}>
                <AppText variant="caption" muted>
                  {group.accounts.length}
                </AppText>
              </View>
            </View>

            <View style={styles.accountsList}>
              {group.accounts.map((account) => (
                <View key={account.id} style={styles.accountEditWrapper}>
                  <AccountCard
                    account={account}
                    displayCurrency={defaultCurrency}
                    exchangeRates={exchangeRates}
                  />

                  <Pressable
                    onPress={() => router.push(`/edit-account?accountId=${account.id}`)}
                    style={styles.accountEditAction}
                  >
                    <Ionicons name="create-outline" size={15} color={colors.text} />

                    <AppText variant="caption" style={styles.accountEditActionText}>
                      Manage Account
                    </AppText>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ))}

        {tradingAccounts.length > 0 ? (
          <View style={styles.group}>
            <View style={styles.groupHeader}>
              <View style={styles.groupTitleBox}>
                <AppText variant="body" style={styles.groupTitle}>
                  Trading Journal
                </AppText>

                <AppText variant="caption" muted style={styles.groupDescription}>
                  MT4/MT5 trading accounts connected to Journal.
                </AppText>
              </View>

              <View style={styles.groupCount}>
                <AppText variant="caption" muted>
                  {tradingAccounts.length}
                </AppText>
              </View>
            </View>

            <View style={styles.accountsList}>
              {tradingAccounts.map((account) => (
                <TradingAccountCard
                  key={account.id}
                  account={account}
                  accounts={accounts}
                  colors={colors}
                  displayCurrency={defaultCurrency}
                  exchangeRates={exchangeRates}
                />
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}


function TradingAccountCard({
  account,
  accounts,
  colors,
  displayCurrency,
  exchangeRates,
}: {
  account: TradingAccount;
  accounts: Account[];
  colors: ThemeColors;
  displayCurrency: Currency;
  exchangeRates: ExchangeRates;
}) {
  const styles = createStyles(colors);
  const realBalance = getTradingAccountRealAmount(account, account.balance);
  const realEquity = getTradingAccountRealAmount(account, account.equity);
  const displayBalance = convertCurrencyAmount(
    realBalance,
    account.currency,
    displayCurrency,
    exchangeRates
  );
  const displayEquity = convertCurrencyAmount(
    realEquity,
    account.currency,
    displayCurrency,
    exchangeRates
  );
  const floatingPnL = displayEquity - displayBalance;

  return (
    <View style={styles.tradingCard}>
      <View style={styles.tradingHeader}>
        <View style={styles.tradingIcon}>
          <Ionicons name="desktop-outline" size={21} color={colors.text} />
        </View>

        <View style={styles.tradingTextBox}>
          <AppText variant="body" style={styles.tradingTitle} numberOfLines={1}>
            {account.name}
          </AppText>

          <AppText variant="caption" muted numberOfLines={1}>
            {account.broker} • {getTradingPlatformLabel(account.platform)} • {account.server}
          </AppText>
        </View>

        <View style={styles.tradingBadge}>
          <AppText variant="caption" style={styles.tradingBadgeText}>
            {getTradingAccountTypeLabel(account.accountType)}
          </AppText>
        </View>
      </View>

      <View style={styles.tradingMetaGrid}>
        <View style={styles.tradingMeta}>
          <AppText variant="caption" muted>
            Balance
          </AppText>

          <AppText variant="caption" style={styles.tradingMetaValue} numberOfLines={1}>
            {formatCurrency(account.balance, account.currency)}
          </AppText>
        </View>

        <View style={styles.tradingMeta}>
          <AppText variant="caption" muted>
            Equity
          </AppText>

          <AppText variant="caption" style={styles.tradingMetaValue} numberOfLines={1}>
            {formatCurrency(account.equity, account.currency)}
          </AppText>
        </View>

        <View style={styles.tradingMeta}>
          <AppText variant="caption" muted>
            Base Value
          </AppText>

          <AppText variant="caption" style={styles.tradingMetaValue} numberOfLines={1}>
            {formatCurrency(displayBalance, displayCurrency)}
          </AppText>
        </View>

        <View style={styles.tradingMeta}>
          <AppText variant="caption" muted>
            Real Value
          </AppText>

          <AppText variant="caption" style={styles.tradingMetaValue} numberOfLines={1}>
            {formatCurrency(realBalance, account.currency)}
          </AppText>
        </View>

        <View style={styles.tradingMeta}>
          <AppText variant="caption" muted>
            Linked Wallet
          </AppText>

          <AppText variant="caption" style={styles.tradingMetaValue} numberOfLines={1}>
            {getLinkedWalletName(account.linkedBrokerWalletAccountId, accounts)}
          </AppText>
        </View>
      </View>

      <View style={styles.tradingFooter}>
        <AppText variant="caption" muted numberOfLines={1}>
          Account #{account.accountNumber}
        </AppText>

        <AppText
          variant="caption"
          style={[styles.tradingPnl, { color: floatingPnL >= 0 ? colors.income : colors.expense }]}
          numberOfLines={1}
        >
          Floating {formatCurrency(floatingPnL, displayCurrency)}
        </AppText>
      </View>

      <Pressable
        onPress={() => router.push(`/trading-account-detail?tradingAccountId=${account.id}` as any)}
        style={styles.tradingOpenJournalAction}
      >
        <Ionicons name="analytics-outline" size={15} color={colors.black} />

        <AppText variant="caption" style={styles.tradingOpenJournalActionText}>
          Open Account Journal
        </AppText>
      </Pressable>

      <Pressable
        onPress={() => router.push(`/edit-trading-account?tradingAccountId=${account.id}` as any)}
        style={styles.tradingEditAction}
      >
        <Ionicons name="create-outline" size={15} color={colors.text} />

        <AppText variant="caption" style={styles.tradingEditActionText}>
          Edit Trading Account
        </AppText>
      </Pressable>

      <View style={styles.tradingCashActionRow}>
        <Pressable
          onPress={() =>
            router.push(`/trading-cash-event?tradingAccountId=${account.id}&eventType=deposit` as any)
          }
          style={styles.tradingCashPrimary}
        >
          <Ionicons name="arrow-down-outline" size={15} color={colors.black} />

          <AppText variant="caption" style={styles.tradingCashPrimaryText}>
            Deposit
          </AppText>
        </Pressable>

        <Pressable
          onPress={() =>
            router.push(`/trading-cash-event?tradingAccountId=${account.id}&eventType=withdrawal` as any)
          }
          style={styles.tradingCashSecondary}
        >
          <Ionicons name="arrow-up-outline" size={15} color={colors.text} />

          <AppText variant="caption" style={styles.tradingCashSecondaryText}>
            Withdraw
          </AppText>
        </Pressable>
      </View>
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
    addButton: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      marginTop: 4,
    },
    heroCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 28,
      padding: 22,
      marginBottom: 18,
    },
    heroTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 14,
      alignItems: 'flex-start',
    },
    heroTextBox: {
      flex: 1,
      minWidth: 0,
    },
    netWorth: {
      marginTop: 8,
      fontSize: 32,
      lineHeight: 38,
    },
    fullValue: {
      marginTop: 4,
    },
    activeBadge: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 7,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    activeBadgeText: {
      fontWeight: '900',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    sectionHeader: {
      marginTop: 28,
      marginBottom: 14,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: 12,
    },
    actionRow: {
      marginBottom: 18,
    },
    transferButton: {
      minHeight: 52,
      borderRadius: 18,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 16,
    },
    transferButtonText: {
      color: colors.black,
      fontWeight: '900',
    },
    groupList: {
      gap: 20,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 18,
    },
    emptyDescription: {
      marginTop: 8,
      lineHeight: 22,
    },
    group: {
      gap: 12,
    },
    groupHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      alignItems: 'flex-start',
    },
    groupTitleBox: {
      flex: 1,
      minWidth: 0,
    },
    groupTitle: {
      fontWeight: '900',
    },
    groupDescription: {
      marginTop: 4,
      lineHeight: 18,
    },
    groupCount: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      minWidth: 34,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    accountsList: {
      gap: 10,
    },
    tradingCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 14,
      gap: 13,
    },
    tradingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
    },
    tradingIcon: {
      width: 44,
      height: 44,
      borderRadius: 17,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tradingTextBox: {
      flex: 1,
      minWidth: 0,
    },
    tradingTitle: {
      color: colors.text,
      fontWeight: '900',
    },
    tradingBadge: {
      borderRadius: 999,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    tradingBadgeText: {
      color: colors.text,
      fontWeight: '900',
      fontSize: 10,
    },
    tradingMetaGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 9,
    },
    tradingMeta: {
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
    tradingMetaValue: {
      color: colors.text,
      fontWeight: '900',
    },
    tradingFooter: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 11,
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    tradingPnl: {
      fontWeight: '900',
      flexShrink: 0,
    },
    tradingOpenJournalAction: {
      minHeight: 42,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 7,
    },
    tradingOpenJournalActionText: {
      color: colors.black,
      fontWeight: '900',
    },    tradingEditAction: {
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
    tradingEditActionText: {
      color: colors.text,
      fontWeight: '900',
    },
    tradingCashActionRow: {
      flexDirection: 'row',
      gap: 9,
    },
    tradingCashPrimary: {
      flex: 1,
      minHeight: 40,
      borderRadius: 15,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 7,
    },
    tradingCashPrimaryText: {
      color: colors.black,
      fontWeight: '900',
    },
    tradingCashSecondary: {
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
    tradingCashSecondaryText: {
      color: colors.text,
      fontWeight: '900',
    },
    accountEditWrapper: {
      gap: 8,
    },
    accountEditAction: {
      alignSelf: 'flex-end',
      minHeight: 36,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      marginRight: 4,
    },
    accountEditActionText: {
      color: colors.text,
      fontWeight: '900',
    },
  });
}
