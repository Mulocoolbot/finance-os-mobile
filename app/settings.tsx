import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors, useResolvedThemeMode } from '../src/hooks/useThemeColors';
import { useFinanceStore } from '../src/stores/useFinanceStore';
import { ThemeMode, useThemeStore } from '../src/stores/useThemeStore';
import { Currency } from '../src/types/finance';

const themeOptions: {
  label: string;
  value: ThemeMode;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}[] = [
  {
    label: 'Dark',
    value: 'dark',
    icon: 'moon-outline',
    description: 'Always use dark appearance.',
  },
  {
    label: 'Light',
    value: 'light',
    icon: 'sunny-outline',
    description: 'Always use light appearance.',
  },
  {
    label: 'System',
    value: 'system',
    icon: 'phone-portrait-outline',
    description: 'Follow your device appearance.',
  },
];

const currencyOptions: {
  label: string;
  value: Currency;
  description: string;
}[] = [
  {
    label: 'IDR',
    value: 'IDR',
    description: 'Use Indonesian Rupiah as your summary/base currency.',
  },
  {
    label: 'USD',
    value: 'USD',
    description: 'Use US Dollar as your summary/base currency.',
  },
  {
    label: 'EUR',
    value: 'EUR',
    description: 'Use Euro as your summary/base currency.',
  },
];


function formatRate(value: number) {
  return value.toLocaleString('id-ID', {
    maximumFractionDigits: 2,
  });
}

function getLiveStatusLabel(value: string) {
  if (value === 'updating') return 'Updating';
  if (value === 'live') return 'Live';
  if (value === 'fallback') return 'Fallback';
  if (value === 'rate_limited') return 'Limit reached';
  if (value === 'failed') return 'Failed';

  return 'Idle';
}

export default function SettingsScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const resolvedThemeMode = useResolvedThemeMode();

  const themeMode = useThemeStore((state) => state.themeMode);
  const setThemeMode = useThemeStore((state) => state.setThemeMode);

  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);
  const exchangeRates = useFinanceStore((state) => state.exchangeRates);
  const exchangeRateLastUpdated = useFinanceStore((state) => state.exchangeRateLastUpdated);
  const exchangeRateSourceUpdatedAt = useFinanceStore(
    (state) => state.exchangeRateSourceUpdatedAt
  );
  const exchangeRateNextUpdateAt = useFinanceStore((state) => state.exchangeRateNextUpdateAt);
  const exchangeRateProvider = useFinanceStore((state) => state.exchangeRateProvider);
  const exchangeRateApiKey = useFinanceStore((state) => state.exchangeRateApiKey);
  const exchangeRateAutoRefreshIntervalMs = useFinanceStore(
    (state) => state.exchangeRateAutoRefreshIntervalMs
  );
  const exchangeRateLiveStatus = useFinanceStore((state) => state.exchangeRateLiveStatus);
  const exchangeRateLastError = useFinanceStore((state) => state.exchangeRateLastError);
  const setDefaultCurrency = useFinanceStore((state) => state.setDefaultCurrency);
  const lockExistingTransactionsWithCurrentRate = useFinanceStore(
    (state) => state.lockExistingTransactionsWithCurrentRate
  );

  const accounts = useFinanceStore((state) => state.accounts);
  const categories = useFinanceStore((state) => state.categories);
  const budgets = useFinanceStore((state) => state.budgets);
  const savingGoals = useFinanceStore((state) => state.savingGoals);
  const transactions = useFinanceStore((state) => state.transactions);

  const activeAccounts = accounts.filter((account) => account.isActive).length;
  const lockedTransactions = transactions.filter(
    (transaction) =>
      transaction.exchangeRateSnapshot &&
      transaction.baseCurrencyAtTransaction &&
      typeof transaction.baseAmountAtTransaction === 'number'
  ).length;
  const unlockedTransactions = Math.max(transactions.length - lockedTransactions, 0);
  const isRealtimeKeyConfigured =
    Boolean(exchangeRateApiKey) &&
    exchangeRateApiKey !== 'PASTE_YOUR_ALPHA_VANTAGE_API_KEY_HERE';

  function handleCurrencyChange(currency: Currency) {
    const result = setDefaultCurrency(currency);

    Alert.alert('Finance OS Mobile', result.message);
  }

  function handleLockExistingTransactions() {
    const result = lockExistingTransactionsWithCurrentRate();

    Alert.alert('Finance OS Mobile', result.message);
  }

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
            Settings
          </AppText>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </View>

        <View style={styles.heroTextBox}>
          <AppText variant="subtitle">App Configuration</AppText>

          <AppText variant="body" muted style={styles.heroDescription}>
            Manage appearance, currency base, exchange-rate audit, navigation, backup tools, and finance preferences.
          </AppText>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <MiniStat label="Accounts" value={`${activeAccounts}`} colors={colors} />
        <MiniStat label="Categories" value={`${categories.length}`} colors={colors} />
        <MiniStat label="Budgets" value={`${budgets.length}`} colors={colors} />
        <MiniStat label="Savings" value={`${savingGoals.length}`} colors={colors} />
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Appearance</AppText>

        <AppText variant="caption" muted>
          Current: {resolvedThemeMode}
        </AppText>
      </View>

      <View style={styles.themeList}>
        {themeOptions.map((option) => {
          const isActive = themeMode === option.value;

          return (
            <Pressable
              key={option.value}
              onPress={() => setThemeMode(option.value)}
              style={[styles.themeOption, isActive && styles.themeOptionActive]}
            >
              <View style={[styles.themeIcon, isActive && styles.themeIconActive]}>
                <Ionicons
                  name={option.icon}
                  size={21}
                  color={isActive ? colors.black : colors.text}
                />
              </View>

              <View style={styles.themeTextBox}>
                <AppText
                  variant="body"
                  style={[styles.themeTitle, isActive && styles.themeTitleActive]}
                >
                  {option.label}
                </AppText>

                <AppText
                  variant="caption"
                  muted={!isActive}
                  style={[styles.themeDescription, isActive && styles.themeDescriptionActive]}
                >
                  {option.description}
                </AppText>
              </View>

              {isActive ? (
                <Ionicons name="checkmark-circle" size={21} color={colors.black} />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Currency Base</AppText>

        <AppText variant="caption" muted>
          Base: {defaultCurrency}
        </AppText>
      </View>

      <View style={styles.currencyList}>
        {currencyOptions.map((option) => {
          const isActive = defaultCurrency === option.value;

          return (
            <Pressable
              key={option.value}
              onPress={() => handleCurrencyChange(option.value)}
              style={[styles.currencyOption, isActive && styles.currencyOptionActive]}
            >
              <View style={[styles.currencyIcon, isActive && styles.currencyIconActive]}>
                <AppText
                  variant="caption"
                  style={[styles.currencyIconText, isActive && styles.currencyIconTextActive]}
                >
                  {option.value}
                </AppText>
              </View>

              <View style={styles.currencyTextBox}>
                <AppText
                  variant="body"
                  style={[styles.currencyTitle, isActive && styles.currencyTitleActive]}
                >
                  {option.label}
                </AppText>

                <AppText
                  variant="caption"
                  muted={!isActive}
                  style={[styles.currencyDescription, isActive && styles.currencyDescriptionActive]}
                >
                  {option.description}
                </AppText>
              </View>

              {isActive ? (
                <Ionicons name="checkmark-circle" size={21} color={colors.black} />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Live Exchange Rate</AppText>

        <AppText variant="caption" muted>
          Auto update
        </AppText>
      </View>

      <View style={styles.exchangeCard}>
        <View style={styles.exchangeHeader}>
          <View style={styles.exchangeTitleBox}>
            <AppText variant="body" style={styles.exchangeTitle}>
              Current rate
            </AppText>

            <AppText variant="caption" muted style={styles.exchangeDescription}>
              Currency rates update automatically in the background while the app is active.
            </AppText>
          </View>

          <View style={styles.liveBadge}>
            <Ionicons
              name={exchangeRateLiveStatus === 'failed' || exchangeRateLiveStatus === 'rate_limited'
                ? 'alert-circle-outline'
                : exchangeRateLiveStatus === 'updating'
                  ? 'sync-outline'
                  : 'checkmark-circle-outline'}
              size={16}
              color={colors.black}
            />

            <AppText variant="caption" style={styles.liveBadgeText}>
              {getLiveStatusLabel(exchangeRateLiveStatus)}
            </AppText>
          </View>
        </View>

        <View style={styles.cleanRateGrid}>
          <View style={styles.cleanRateItem}>
            <AppText variant="caption" muted>
              USD / IDR
            </AppText>

            <AppText variant="body" style={styles.cleanRateValue}>
              Rp {formatRate(exchangeRates.USD)}
            </AppText>
          </View>

          <View style={styles.cleanRateItem}>
            <AppText variant="caption" muted>
              EUR / IDR
            </AppText>

            <AppText variant="body" style={styles.cleanRateValue}>
              Rp {formatRate(exchangeRates.EUR)}
            </AppText>
          </View>
        </View>

        <View style={styles.autoInfoCard}>
          <Ionicons name="cloud-done-outline" size={18} color={colors.saving} />

          <AppText variant="caption" muted style={styles.autoInfoText}>
            {exchangeRateLastError
              ? 'Live update is temporarily unavailable. The app is using the last saved rate.'
              : 'Currency rates update automatically.'}
          </AppText>
        </View>

        {!isRealtimeKeyConfigured ? (
          <View style={styles.apiKeyCard}>
            <View style={styles.integratedKeyRow}>
              <Ionicons name="alert-circle-outline" size={19} color={colors.investment} />

              <View style={styles.integratedKeyTextBox}>
                <AppText variant="caption" style={styles.apiKeyLabel}>
                  API key not configured
                </AppText>

                <AppText variant="caption" muted style={styles.apiKeyHint}>
                  Fill the API key in src/config/exchangeRateConfig.ts.
                </AppText>
              </View>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.warningCard}>
        <Ionicons name="information-circle-outline" size={19} color={colors.transfer} />

        <AppText variant="caption" muted style={styles.warningText}>
          Currency base affects summary display. Transaction currency can be selected when adding transactions. Original account balances and transaction records stay in their own currencies.
        </AppText>
      </View>


      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Historical Rate Lock</AppText>

        <AppText variant="caption" muted>
          Transaction audit
        </AppText>
      </View>

      <View style={styles.auditCard}>
        <View style={styles.auditRow}>
          <View style={styles.auditIcon}>
            <Ionicons name="receipt-outline" size={20} color={colors.text} />
          </View>

          <View style={styles.auditTextBox}>
            <AppText variant="body" style={styles.auditTitle}>
              Total Transactions
            </AppText>

            <AppText variant="caption" muted>
              All records saved in local storage.
            </AppText>
          </View>

          <AppText variant="subtitle" style={styles.auditValue}>
            {transactions.length}
          </AppText>
        </View>

        <View style={styles.auditDivider} />

        <View style={styles.auditRow}>
          <View style={[styles.auditIcon, styles.auditIconLocked]}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.income} />
          </View>

          <View style={styles.auditTextBox}>
            <AppText variant="body" style={styles.auditTitle}>
              Locked
            </AppText>

            <AppText variant="caption" muted>
              Protected with historical exchange-rate snapshot.
            </AppText>
          </View>

          <AppText variant="subtitle" style={[styles.auditValue, { color: colors.income }]}>
            {lockedTransactions}
          </AppText>
        </View>

        <View style={styles.auditDivider} />

        <View style={styles.auditRow}>
          <View style={[styles.auditIcon, styles.auditIconUnlocked]}>
            <Ionicons name="alert-circle-outline" size={20} color={unlockedTransactions > 0 ? colors.investment : colors.textMuted} />
          </View>

          <View style={styles.auditTextBox}>
            <AppText variant="body" style={styles.auditTitle}>
              Unlocked
            </AppText>

            <AppText variant="caption" muted>
              Tap Lock Existing Transactions if this is not zero.
            </AppText>
          </View>

          <AppText
            variant="subtitle"
            style={[
              styles.auditValue,
              {
                color: unlockedTransactions > 0 ? colors.investment : colors.textMuted,
              },
            ]}
          >
            {unlockedTransactions}
          </AppText>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Navigation Hub</AppText>

        <AppText variant="caption" muted>
          Active modules
        </AppText>
      </View>

      <View style={styles.list}>
        <SettingRow
          title="Accounts"
          description="Manage active and archived accounts safely."
          icon="wallet-outline"
          value="Open"
          colors={colors}
          onPress={() => router.push('/accounts')}
        />

        <SettingRow
          title="Savings"
          description="Saving goals, deposit, withdrawal, edit, and archive flow."
          icon="sparkles-outline"
          value="Open"
          colors={colors}
          onPress={() => router.push('/savings')}
        />

        <SettingRow
          title="Budget"
          description="Active and archived budget trackers."
          icon="speedometer-outline"
          value="Open"
          colors={colors}
          onPress={() => router.push('/budget')}
        />

        <SettingRow
          title="Categories"
          description="Manage custom income and expense categories."
          icon="pricetags-outline"
          value="Open"
          colors={colors}
          onPress={() => router.push('/categories')}
        />

        <SettingRow
          title="Reports"
          description="Cashflow, transaction, investment, crypto, and trading reports."
          icon="bar-chart-outline"
          value="Open"
          colors={colors}
          onPress={() => router.push('/reports')}
        />

        <SettingRow
          title="Advanced Search"
          description="Search and filter transactions by keyword, type, account, category, period, and amount."
          icon="search-outline"
          value="Open"
          colors={colors}
          onPress={() => router.push('/advanced-search')}
        />

        <SettingRow
          title="Crypto Wallets"
          description="Save Web3/CEX wallet profiles using crypto assets returned by API/provider."
          icon="logo-bitcoin"
          value="Open"
          colors={colors}
          onPress={() => router.push('/crypto-wallets')}
        />

        <SettingRow
          title="Journal"
          description="Trading workflow, account journal, and trading plan."
          icon="book-outline"
          value="Open"
          colors={colors}
          onPress={() => router.push('/journal')}
        />
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Data Safety</AppText>

        <AppText variant="caption" muted>
          Backup & audit
        </AppText>
      </View>

      <View style={styles.list}>
        <SettingRow
          title="Backup & Restore"
          description="Export and import local finance data as JSON."
          icon="shield-checkmark-outline"
          value="Open"
          colors={colors}
          onPress={() => router.push('/backup')}
        />

        <SettingRow
          title="Lock Existing Transactions"
          description="Freeze old transactions with the current exchange rate snapshot."
          icon="lock-closed-outline"
          value="Run"
          colors={colors}
          onPress={handleLockExistingTransactions}
        />

        <SettingRow
          title="Cloud Sync"
          description="Online sync will be added later after local backup is stable."
          icon="cloud-outline"
          badge="Soon"
          colors={colors}
        />
      </View>
    </Screen>
  );
}


function MiniStat({
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
    <View style={styles.miniStat}>
      <AppText variant="caption" muted>
        {label}
      </AppText>

      <AppText variant="subtitle" style={styles.miniStatValue}>
        {value}
      </AppText>
    </View>
  );
}

function SettingRow({
  title,
  description,
  icon,
  value,
  badge,
  colors,
  onPress,
}: {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  value?: string;
  badge?: string;
  colors: ThemeColors;
  onPress?: () => void;
}) {
  const styles = createStyles(colors);
  const isPressable = Boolean(onPress);

  return (
    <Pressable disabled={!isPressable} onPress={onPress} style={styles.settingRow}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={21} color={colors.text} />
      </View>

      <View style={styles.settingTextBox}>
        <View style={styles.settingTitleRow}>
          <AppText variant="body" style={styles.settingTitle}>
            {title}
          </AppText>

          {badge ? (
            <View style={styles.badge}>
              <AppText variant="caption" style={styles.badgeText}>
                {badge}
              </AppText>
            </View>
          ) : null}
        </View>

        <AppText variant="caption" muted style={styles.settingDescription}>
          {description}
        </AppText>
      </View>

      {value ? (
        <View style={styles.valueBadge}>
          <AppText variant="caption" style={styles.valueText}>
            {value}
          </AppText>
        </View>
      ) : null}

      {isPressable ? (
        <Ionicons name="chevron-forward-outline" size={18} color={colors.textMuted} />
      ) : null}
    </Pressable>
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
    statsGrid: {
      marginTop: 18,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    miniStat: {
      flexBasis: '47%',
      flexGrow: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 15,
    },
    miniStatValue: {
      marginTop: 6,
      fontWeight: '900',
    },
    sectionHeader: {
      marginTop: 28,
      marginBottom: 14,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 12,
    },
    themeList: {
      gap: 10,
    },
    themeOption: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 15,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    themeOptionActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    themeIcon: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeIconActive: {
      backgroundColor: 'rgba(0,0,0,0.08)',
      borderColor: 'rgba(0,0,0,0.12)',
    },
    themeTextBox: {
      flex: 1,
      minWidth: 0,
    },
    themeTitle: {
      fontWeight: '900',
    },
    themeTitleActive: {
      color: colors.black,
    },
    themeDescription: {
      marginTop: 4,
      lineHeight: 18,
    },
    themeDescriptionActive: {
      color: 'rgba(0,0,0,0.68)',
    },
    currencyList: {
      gap: 10,
    },
    currencyOption: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 15,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    currencyOptionActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    currencyIcon: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    currencyIconActive: {
      backgroundColor: 'rgba(0,0,0,0.08)',
      borderColor: 'rgba(0,0,0,0.12)',
    },
    currencyIconText: {
      color: colors.text,
      fontWeight: '900',
    },
    currencyIconTextActive: {
      color: colors.black,
    },
    currencyTextBox: {
      flex: 1,
      minWidth: 0,
    },
    currencyTitle: {
      fontWeight: '900',
    },
    currencyTitleActive: {
      color: colors.black,
    },
    currencyDescription: {
      marginTop: 4,
      lineHeight: 18,
    },
    currencyDescriptionActive: {
      color: 'rgba(0,0,0,0.68)',
    },
    modeList: {
      gap: 10,
    },
    modeOption: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 15,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    modeOptionActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    modeIcon: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modeIconActive: {
      backgroundColor: 'rgba(0,0,0,0.08)',
      borderColor: 'rgba(0,0,0,0.12)',
    },
    modeTextBox: {
      flex: 1,
      minWidth: 0,
    },
    modeTitle: {
      fontWeight: '900',
    },
    modeTitleActive: {
      color: colors.black,
    },
    modeDescription: {
      marginTop: 4,
      lineHeight: 18,
    },
    modeDescriptionActive: {
      color: 'rgba(0,0,0,0.68)',
    },
    exchangeCard: {
      marginTop: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 16,
      gap: 14,
    },
    exchangeHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    exchangeTitleBox: {
      flex: 1,
      minWidth: 0,
    },
    exchangeTitle: {
      fontWeight: '900',
    },
    exchangeDescription: {
      marginTop: 5,
      lineHeight: 19,
    },
    liveBadge: {
      minHeight: 40,
      borderRadius: 14,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    liveBadgeText: {
      color: colors.black,
      fontWeight: '900',
    },
    refreshButton: {
      minHeight: 42,
      borderRadius: 14,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    refreshButtonDisabled: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
    },
    refreshButtonText: {
      color: colors.black,
      fontWeight: '900',
    },
    refreshButtonTextDisabled: {
      color: colors.textMuted,
    },
    cleanRateGrid: {
      flexDirection: 'row',
      gap: 10,
    },
    cleanRateItem: {
      flex: 1,
      minWidth: 0,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 13,
    },
    cleanRateValue: {
      marginTop: 6,
      fontWeight: '900',
    },
    updatedCard: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    updatedTextBox: {
      flex: 1,
      gap: 4,
    },
    updatedText: {
      flex: 1,
      lineHeight: 18,
    },
    autoInfoCard: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    autoInfoText: {
      flex: 1,
      lineHeight: 18,
    },
    providerCard: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 14,
      gap: 12,
    },
    providerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    providerTitle: {
      fontWeight: '900',
    },
    providerDescription: {
      marginTop: 3,
      lineHeight: 17,
    },
    providerOptions: {
      flexDirection: 'row',
      gap: 10,
    },
    providerOption: {
      flex: 1,
      minHeight: 62,
      borderRadius: 17,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    providerOptionActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    providerOptionText: {
      flex: 1,
      minWidth: 0,
    },
    providerOptionTitle: {
      color: colors.text,
      fontWeight: '900',
    },
    providerOptionTitleActive: {
      color: colors.black,
    },
    providerOptionDescription: {
      marginTop: 2,
      color: colors.textMuted,
      fontSize: 10,
    },
    providerOptionDescriptionActive: {
      color: 'rgba(0,0,0,0.62)',
    },
    apiKeyCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 12,
      gap: 10,
    },
    apiKeyLabel: {
      fontWeight: '900',
    },
    integratedKeyRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    integratedKeyTextBox: {
      flex: 1,
      minWidth: 0,
    },
    apiKeyInput: {
      minHeight: 50,
      borderRadius: 15,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      paddingHorizontal: 14,
      fontSize: 14,
      fontWeight: '800',
    },
    apiKeyHint: {
      lineHeight: 18,
    },
    exchangeInputBlock: {
      gap: 10,
    },
    exchangeInputRow: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    exchangeInputText: {
      flex: 1,
      minWidth: 0,
      gap: 8,
    },
    exchangeInput: {
      minHeight: 44,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    saveRateButton: {
      minHeight: 48,
      borderRadius: 16,
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveRateText: {
      color: colors.black,
      fontWeight: '900',
    },
    warningCard: {
      marginTop: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    warningText: {
      flex: 1,
      lineHeight: 18,
    },
    auditCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 16,
      gap: 14,
    },
    auditRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    auditIcon: {
      width: 42,
      height: 42,
      borderRadius: 15,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    auditIconLocked: {
      borderColor: colors.income,
    },
    auditIconUnlocked: {
      borderColor: colors.border,
    },
    auditTextBox: {
      flex: 1,
      minWidth: 0,
    },
    auditTitle: {
      fontWeight: '900',
      marginBottom: 3,
    },
    auditValue: {
      fontWeight: '900',
    },
    auditDivider: {
      height: 1,
      backgroundColor: colors.border,
    },
    list: {
      gap: 10,
    },
    settingRow: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 15,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    settingIcon: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingTextBox: {
      flex: 1,
      minWidth: 0,
    },
    settingTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    settingTitle: {
      fontWeight: '900',
    },
    settingDescription: {
      marginTop: 4,
      lineHeight: 18,
    },
    valueBadge: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    valueText: {
      color: colors.text,
      fontWeight: '900',
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
