import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { AnimatedPressable } from '../src/components/ui/AnimatedPressable';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useAppToast } from '../src/components/ui/AppToast';
import {
  TradingAccount,
  TradingCashEventType,
  useFinanceStore,
} from '../src/stores/useFinanceStore';
import { Account, Currency } from '../src/types/finance';
import { formatCurrency } from '../src/utils/currency';
import { convertCurrencyAmount } from '../src/utils/currencyConversion';

const currencies: Currency[] = ['IDR', 'USD', 'EUR'];

function parseNumber(value: string) {
  const normalizedValue = value.replace(/,/g, '.').trim();
  const numericValue = Number(normalizedValue);

  return Number.isFinite(numericValue) ? numericValue : 0;
}

function getRealTradingAmount(account: TradingAccount, rawAmount: number) {
  if (account.accountType === 'cent') {
    return rawAmount / 100;
  }

  return rawAmount;
}

function getTradingRawAmountFromReal(account: TradingAccount, realAmount: number) {
  if (account.accountType === 'cent') {
    return realAmount * 100;
  }

  return realAmount;
}

function getAvailableCurrencies() {
  return currencies;
}

function getLinkedBrokerWallet(account: TradingAccount | undefined, accounts: Account[]) {
  if (!account?.linkedBrokerWalletAccountId) {
    return null;
  }

  return accounts.find((item) => item.id === account.linkedBrokerWalletAccountId) || null;
}

export default function TradingCashEventScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const toast = useAppToast();
  const params = useLocalSearchParams<{
    tradingAccountId?: string;
    eventType?: TradingCashEventType;
  }>();

  const accounts = useFinanceStore((state) => state.accounts);
  const tradingAccounts = useFinanceStore((state) => state.tradingAccounts);
  const exchangeRates = useFinanceStore((state) => state.exchangeRates);
  const addTradingCashEvent = useFinanceStore((state) => state.addTradingCashEvent);

  const [tradingAccountId, setTradingAccountId] = useState(params.tradingAccountId || '');
  const [eventType, setEventType] = useState<TradingCashEventType>(
    params.eventType === 'withdrawal' ? 'withdrawal' : 'deposit'
  );
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [note, setNote] = useState('');

  const tradingAccount = tradingAccounts.find((account) => account.id === tradingAccountId);
  const brokerWallet = getLinkedBrokerWallet(tradingAccount, accounts);

  useEffect(() => {
    if (!tradingAccountId && tradingAccounts[0]?.id) {
      setTradingAccountId(tradingAccounts[0].id);
    }
  }, [tradingAccountId, tradingAccounts]);

  useEffect(() => {
    if (brokerWallet?.currency) {
      setCurrency(brokerWallet.currency);
      return;
    }

    if (tradingAccount?.currency) {
      setCurrency(tradingAccount.currency);
    }
  }, [brokerWallet?.currency, tradingAccount?.currency]);

  const parsedAmount = parseNumber(amount);

  const preview = useMemo(() => {
    if (!tradingAccount || !brokerWallet) {
      return {
        brokerWalletAmount: 0,
        tradingRealAmount: 0,
        tradingRawAmount: 0,
      };
    }

    const brokerWalletAmount = convertCurrencyAmount(
      parsedAmount,
      currency,
      brokerWallet.currency,
      exchangeRates
    );
    const tradingRealAmount = convertCurrencyAmount(
      parsedAmount,
      currency,
      tradingAccount.currency,
      exchangeRates
    );
    const tradingRawAmount = getTradingRawAmountFromReal(tradingAccount, tradingRealAmount);

    return {
      brokerWalletAmount,
      tradingRealAmount,
      tradingRawAmount,
    };
  }, [brokerWallet, currency, exchangeRates, parsedAmount, tradingAccount]);

  function handleSave() {
    if (!tradingAccount) {
      toast.showWarning('Trading Account Missing', 'Trading account not found.');
      return;
    }

    const result = addTradingCashEvent({
      tradingAccountId: tradingAccount.id,
      eventType,
      amount: parsedAmount,
      currency,
      note,
    });

    if (!result.success) {
      toast.showError('Could Not Save Cash Event', result.message);
      return;
    }

    toast.showSuccess(eventType === 'deposit' ? 'Deposit Saved' : 'Withdrawal Saved', result.message);
    router.back();
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
        </AnimatedPressable>

        <View style={styles.headerText}>
          <AppText variant="caption" muted>
            Cash Event
          </AppText>

          <AppText variant="title">
            {eventType === 'deposit' ? 'Deposit' : 'Withdrawal'}
          </AppText>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoIcon}>
          <Ionicons
            name={eventType === 'deposit' ? 'arrow-down-outline' : 'arrow-up-outline'}
            size={20}
            color={colors.black}
          />
        </View>

        <View style={styles.infoTextBox}>
          <AppText variant="body" style={styles.infoTitle}>
            Wallet Sync
          </AppText>

          <AppText variant="caption" muted style={styles.infoDescription}>
            Input converts to wallet and trading account currency.
          </AppText>
        </View>
      </View>

      <View style={styles.formCard}>
        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Event Type
          </AppText>

          <View style={styles.chipRow}>
            <AnimatedPressable
              onPress={() => setEventType('deposit')}
              style={[styles.chip, eventType === 'deposit' ? styles.chipActive : null]}
            >
              <AppText
                variant="caption"
                style={[styles.chipText, eventType === 'deposit' ? styles.chipTextActive : null]}
              >
                Deposit
              </AppText>
            </AnimatedPressable>

            <AnimatedPressable
              onPress={() => setEventType('withdrawal')}
              style={[styles.chip, eventType === 'withdrawal' ? styles.chipActive : null]}
            >
              <AppText
                variant="caption"
                style={[styles.chipText, eventType === 'withdrawal' ? styles.chipTextActive : null]}
              >
                Withdrawal
              </AppText>
            </AnimatedPressable>
          </View>
        </View>

        <TradingAccountPicker
          accounts={tradingAccounts}
          selectedId={tradingAccountId}
          onSelect={setTradingAccountId}
          colors={colors}
        />

        <View style={styles.linkCard}>
          <AppText variant="caption" muted>
            Broker Wallet
          </AppText>

          <AppText variant="body" style={styles.linkValue} numberOfLines={1}>
            {brokerWallet ? brokerWallet.name : 'No linked wallet'}
          </AppText>

          {brokerWallet ? (
            <AppText variant="caption" muted style={styles.linkSubValue} numberOfLines={1}>
              Balance {formatCurrency(brokerWallet.balance, brokerWallet.currency)}
            </AppText>
          ) : (
            <AppText variant="caption" muted style={styles.linkSubValue}>
              Link broker wallet first.
            </AppText>
          )}
        </View>

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Currency
          </AppText>

          <View style={styles.chipRow}>
            {getAvailableCurrencies().map((item) => {
              const active = currency === item;

              return (
                <AnimatedPressable
                  key={item}
                  onPress={() => setCurrency(item)}
                  style={[styles.chip, active ? styles.chipActive : null]}
                >
                  <AppText
                    variant="caption"
                    style={[styles.chipText, active ? styles.chipTextActive : null]}
                  >
                    {item}
                  </AppText>
                </AnimatedPressable>
              );
            })}
          </View>

          {brokerWallet && tradingAccount ? (
            <AppText variant="caption" muted style={styles.currencyHelper}>
              Converts to {brokerWallet.currency} wallet and{' '}
              {tradingAccount.currency} trading account.
            </AppText>
          ) : null}
        </View>

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Amount
          </AppText>

          <View style={styles.inputBox}>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.previewCard}>
          <AppText variant="caption" muted>
            Preview
          </AppText>

          <AppText variant="body" style={styles.previewMain}>
            {eventType === 'deposit' ? 'Wallet → Trading Account' : 'Trading Account → Wallet'}
          </AppText>

          {brokerWallet && tradingAccount ? (
            <>
              <AppText variant="caption" muted style={styles.previewLine}>
                Input amount: {formatCurrency(parsedAmount, currency)}
              </AppText>

              <AppText variant="caption" muted style={styles.previewLine}>
                Wallet movement: {formatCurrency(preview.brokerWalletAmount, brokerWallet.currency)}
              </AppText>

              <AppText variant="caption" muted style={styles.previewLine}>
                Trading movement: {formatCurrency(preview.tradingRealAmount, tradingAccount.currency)}
              </AppText>

              {tradingAccount.accountType === 'cent' ? (
                <AppText variant="caption" muted style={styles.previewLine}>
                  Cent raw: {preview.tradingRawAmount.toLocaleString('en-US', {
                    maximumFractionDigits: 2,
                  })}{' '}
                  cents
                </AppText>
              ) : null}
            </>
          ) : null}
        </View>

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Note
          </AppText>

          <View style={[styles.inputBox, styles.noteInputBox]}>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Optional note"
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
              style={[styles.input, styles.noteInput]}
            />
          </View>
        </View>
      </View>

      <AnimatedPressable onPress={handleSave} style={styles.saveButton}>
        <Ionicons name="save-outline" size={18} color={colors.black} />

        <AppText variant="body" style={styles.saveButtonText}>
          Save {eventType === 'deposit' ? 'Deposit' : 'Withdrawal'}
        </AppText>
      </AnimatedPressable>
    </Screen>
  );
}

function TradingAccountPicker({
  accounts,
  selectedId,
  onSelect,
  colors,
}: {
  accounts: TradingAccount[];
  selectedId: string;
  onSelect: (id: string) => void;
  colors: ThemeColors;
}) {
  const styles = createStyles(colors);

  return (
    <View style={styles.field}>
      <AppText variant="caption" muted style={styles.label}>
        Trading Account
      </AppText>

      <View style={styles.optionList}>
        {accounts.map((account) => {
          const active = selectedId === account.id;
          const realBalance = getRealTradingAmount(account, account.balance);

          return (
            <AnimatedPressable
              key={account.id}
              onPress={() => onSelect(account.id)}
              style={[styles.optionCard, active ? styles.optionCardActive : null]}
            >
              <View style={styles.optionIcon}>
                <Ionicons
                  name="desktop-outline"
                  size={18}
                  color={active ? colors.black : colors.text}
                />
              </View>

              <View style={styles.optionTextBox}>
                <AppText
                  variant="body"
                  style={[styles.optionTitle, active ? styles.optionTextActive : null]}
                  numberOfLines={1}
                >
                  {account.name}
                </AppText>

                <AppText
                  variant="caption"
                  muted={!active}
                  style={active ? styles.optionDescriptionActive : styles.optionDescription}
                  numberOfLines={1}
                >
                  {account.broker} • {account.accountType.toUpperCase()}
                </AppText>

                <AppText
                  variant="caption"
                  muted={!active}
                  style={active ? styles.optionDescriptionActive : styles.optionDescription}
                  numberOfLines={1}
                >
                  Real balance {formatCurrency(realBalance, account.currency)}
                </AppText>
              </View>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: {
      marginBottom: 18,
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
      borderColor: colors.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: {
      flex: 1,
      minWidth: 0,
    },
    infoCard: {
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 24,
      padding: 14,
      flexDirection: 'row',
      gap: 12,
      marginBottom: 14,
      shadowColor: colors.shadow,
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 7 },
      elevation: 2,
    },
    infoIcon: {
      width: 42,
      height: 42,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoTextBox: {
      flex: 1,
      minWidth: 0,
    },
    infoTitle: {
      color: colors.text,
      fontWeight: '900',
    },
    infoDescription: {
      marginTop: 5,
      lineHeight: 18,
    },
    formCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 24,
      padding: 14,
      gap: 14,
      marginBottom: 14,
    },
    field: {
      gap: 8,
    },
    label: {
      fontWeight: '900',
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      minHeight: 38,
      borderRadius: 999,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      color: colors.textMuted,
      fontWeight: '900',
    },
    chipTextActive: {
      color: colors.black,
    },
    currencyHelper: {
      marginTop: 8,
      lineHeight: 18,
    },
    optionList: {
      gap: 9,
    },
    optionCard: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 18,
      padding: 12,
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
    },
    optionCardActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    optionIcon: {
      width: 36,
      height: 36,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionTextBox: {
      flex: 1,
      minWidth: 0,
    },
    optionTitle: {
      color: colors.text,
      fontWeight: '900',
    },
    optionTextActive: {
      color: colors.black,
    },
    optionDescription: {
      marginTop: 3,
    },
    optionDescriptionActive: {
      color: colors.black,
      marginTop: 3,
      opacity: 0.78,
    },
    linkCard: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 18,
      padding: 13,
      gap: 4,
    },
    linkValue: {
      color: colors.text,
      fontWeight: '900',
    },
    linkSubValue: {
      lineHeight: 18,
    },
    inputBox: {
      minHeight: 52,
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      paddingHorizontal: 13,
      justifyContent: 'center',
    },
    input: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '900',
      paddingVertical: 10,
      outlineStyle: 'none' as any,
    },
    noteInputBox: {
      minHeight: 92,
      justifyContent: 'flex-start',
      paddingTop: 10,
    },
    noteInput: {
      minHeight: 70,
      fontSize: 14,
      lineHeight: 19,
    },
    previewCard: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 18,
      padding: 13,
      gap: 5,
    },
    previewMain: {
      color: colors.text,
      fontWeight: '900',
    },
    previewLine: {
      lineHeight: 18,
    },
    saveButton: {
      minHeight: 54,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 9,
      paddingHorizontal: 18,
      marginBottom: 8,
    },
    saveButtonText: {
      color: colors.black,
      fontWeight: '900',
    },
  });
}
