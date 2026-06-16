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
import { useFinanceStore } from '../src/stores/useFinanceStore';
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
  currencyBase: Currency,
  exchangeRates: ExchangeRates
) {
  const activeAccounts = accounts.filter((account) => account.isActive);

  const getAccountBalanceInBaseCurrency = (account: Account) => {
    return convertCurrencyAmount(
      account.balance,
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

  const netWorth = activeAccounts.reduce(
    (total, account) => total + getAccountBalanceInBaseCurrency(account),
    0
  );

  return {
    activeCount: activeAccounts.length,
    availableBalance,
    totalSavings,
    totalInvestment,
    netWorth,
  };
}
function buildAccountGroups(accounts: Account[]): AccountGroup[] {
  return [
    {
      key: 'cash-bank',
      title: 'Cash & Bank',
      description: 'Cash, bank accounts, and main money sources.',
      accounts: accounts.filter((account) => account.type === 'cash' || account.type === 'bank'),
    },
    {
      key: 'wallets',
      title: 'E-Wallets',
      description: 'Digital wallets and payment accounts.',
      accounts: accounts.filter((account) => account.type === 'e_wallet'),
    },
    {
      key: 'savings',
      title: 'Savings',
      description: 'Sub-wallets connected to saving goals.',
      accounts: accounts.filter((account) => account.type === 'saving'),
    },
    {
      key: 'investments',
      title: 'Investments',
      description: 'Broker and crypto wallet balances.',
      accounts: accounts.filter(
        (account) => account.type === 'broker' || account.type === 'crypto_wallet'
      ),
    },
    {
      key: 'custom',
      title: 'Custom',
      description: 'Other custom account types.',
      accounts: accounts.filter((account) => account.type === 'custom'),
    },
  ].filter((group) => group.accounts.length > 0);
}

export default function AccountsScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const accounts = useFinanceStore((state) => state.accounts);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);
  const exchangeRates = useFinanceStore((state) => state.exchangeRates);

  const accountSummary = useMemo(() => {
    return getAccountSummary(accounts, defaultCurrency, exchangeRates);
  }, [accounts, defaultCurrency, exchangeRates]);
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

      <View style={styles.grid}>
        <StatCard label="Available" value={formatCompactCurrency(accountSummary.availableBalance, defaultCurrency)} />
        <StatCard label="Savings" value={formatCompactCurrency(accountSummary.totalSavings, defaultCurrency)} tone="saving" />
        <StatCard label="Investment" value={formatCompactCurrency(accountSummary.totalInvestment, defaultCurrency)} tone="investment" />
        <StatCard label="Accounts" value={`${accounts.length}`} tone="transfer" />
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
                      Edit Account
                    </AppText>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </Screen>
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
