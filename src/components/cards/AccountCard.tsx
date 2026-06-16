import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { ThemeColors } from '../../constants/colors';
import { useThemeColors } from '../../hooks/useThemeColors';
import { Account, Currency } from '../../types/finance';
import { formatCurrency } from '../../utils/currency';
import { convertCurrencyAmount, ExchangeRates } from '../../utils/currencyConversion';
import { formatCompactCurrency } from '../../utils/formatCompactCurrency';
import { AppText } from '../ui/AppText';

type AccountCardProps = {
  account: Account;
  displayCurrency?: Currency;
  exchangeRates?: ExchangeRates;
};

const fallbackExchangeRates: ExchangeRates = {
  IDR: 1,
  USD: 1,
  EUR: 1,
};

function getAccountIcon(type: Account['type']) {
  if (type === 'cash') return 'cash-outline';
  if (type === 'bank') return 'business-outline';
  if (type === 'e_wallet') return 'phone-portrait-outline';
  if (type === 'saving') return 'sparkles-outline';
  if (type === 'broker') return 'trending-up-outline';
  if (type === 'crypto_wallet') return 'logo-bitcoin';

  return 'wallet-outline';
}

function getAccountTypeLabel(type: Account['type']) {
  if (type === 'cash') return 'Cash';
  if (type === 'bank') return 'Bank';
  if (type === 'e_wallet') return 'E-Wallet';
  if (type === 'saving') return 'Saving';
  if (type === 'broker') return 'Investment';
  if (type === 'crypto_wallet') return 'Crypto';

  return 'Custom';
}

function getAccountTone(colors: ThemeColors, type: Account['type']) {
  if (type === 'saving') return colors.saving;
  if (type === 'broker' || type === 'crypto_wallet') return colors.investment;
  if (type === 'e_wallet') return colors.transfer;

  return colors.text;
}

export function AccountCard({
  account,
  displayCurrency,
  exchangeRates,
}: AccountCardProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const tone = getAccountTone(colors, account.type);

  const currencyBase = displayCurrency || account.currency;
  const convertedBalance = convertCurrencyAmount(
    account.balance,
    account.currency,
    currencyBase,
    exchangeRates || fallbackExchangeRates
  );
  const hasConvertedDisplay = account.currency !== currencyBase;

  return (
    <View style={styles.card}>
      <View style={[styles.iconBox, { borderColor: tone }]}>
        <Ionicons name={getAccountIcon(account.type) as any} size={23} color={tone} />
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.nameBox}>
            <AppText variant="body" style={styles.name} numberOfLines={1}>
              {account.name}
            </AppText>

            <AppText variant="caption" muted>
              {getAccountTypeLabel(account.type)} • Original {account.currency}
            </AppText>
          </View>

          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: account.isActive ? colors.income : colors.textMuted,
                },
              ]}
            />

            <AppText variant="caption" muted>
              {account.isActive ? 'Active' : 'Inactive'}
            </AppText>
          </View>
        </View>

        <View style={styles.balanceBox}>
          <AppText variant="caption" muted>
            Balance • {currencyBase} base
          </AppText>

          <AppText variant="subtitle" style={styles.balance} numberOfLines={1}>
            {formatCompactCurrency(convertedBalance, currencyBase)}
          </AppText>

          <AppText variant="caption" muted style={styles.fullBalance} numberOfLines={1}>
            {formatCurrency(convertedBalance, currencyBase)}
          </AppText>

          {hasConvertedDisplay ? (
            <AppText variant="caption" muted style={styles.originalBalance} numberOfLines={1}>
              Original: {formatCurrency(account.balance, account.currency)}
            </AppText>
          ) : null}
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
      padding: 16,
      flexDirection: 'row',
      gap: 14,
    },
    iconBox: {
      width: 50,
      height: 50,
      borderRadius: 18,
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
      gap: 12,
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    nameBox: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      fontWeight: '900',
      marginBottom: 4,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 999,
    },
    balanceBox: {
      marginTop: 16,
    },
    balance: {
      marginTop: 4,
      fontWeight: '900',
    },
    fullBalance: {
      marginTop: 3,
    },
    originalBalance: {
      marginTop: 5,
      lineHeight: 18,
    },
  });
}
