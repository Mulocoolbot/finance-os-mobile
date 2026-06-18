import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useFinanceStore } from '../src/stores/useFinanceStore';
import { formatCurrency } from '../src/utils/currency';


function parseNumber(value: string) {
  const normalizedValue = value.replace(/,/g, '.').trim();
  const numericValue = Number(normalizedValue);

  return Number.isFinite(numericValue) ? numericValue : 0;
}

function stringifyNumber(value: number | undefined, fallback = 0) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return `${fallback}`;
  }

  return `${value}`;
}

function parseList(value: string) {
  return value
    .split(/[,\n]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function stringifyList(value: string[] | undefined, fallback: string[]) {
  const nextValue = value && value.length > 0 ? value : fallback;

  return nextValue.join(', ');
}

function getRealBalance(account: { accountType: string; balance: number }) {
  if (account.accountType === 'cent') {
    return account.balance / 100;
  }

  return account.balance;
}

function calculatePercentageAmount(balance: number, percentageText: string) {
  const percentage = parseNumber(percentageText);

  return (balance * percentage) / 100;
}

function formatTimeInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function normalizeTimeForSave(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);

  if (digits.length === 0) {
    return '';
  }

  const hours = Math.min(Number(digits.slice(0, 2) || '0'), 23);
  const minutes = Math.min(Number(digits.slice(2, 4) || '0'), 59);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export default function TradingPlanScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ tradingAccountId?: string }>();

  const tradingAccounts = useFinanceStore((state) => state.tradingAccounts);
  const tradingPlans = useFinanceStore((state) => state.tradingPlans);
  const upsertTradingPlan = useFinanceStore((state) => state.upsertTradingPlan);
  const deleteTradingPlan = useFinanceStore((state) => state.deleteTradingPlan);

  const tradingAccount = tradingAccounts.find(
    (account) => account.id === params.tradingAccountId
  );
  const existingPlan = tradingPlans.find(
    (plan) => plan.tradingAccountId === params.tradingAccountId
  );

  const realBalance = tradingAccount ? getRealBalance(tradingAccount) : 0;

  const [dailyMaxLossPercent, setDailyMaxLossPercent] = useState(
    stringifyNumber(existingPlan?.dailyMaxLossPercent, 3)
  );
  const [dailyProfitTargetPercent, setDailyProfitTargetPercent] = useState(
    stringifyNumber(existingPlan?.dailyProfitTargetPercent, 5)
  );
  const [maxTradesPerDay, setMaxTradesPerDay] = useState(
    stringifyNumber(existingPlan?.maxTradesPerDay, 5)
  );
  const [riskPerTradePercent, setRiskPerTradePercent] = useState(
    stringifyNumber(existingPlan?.riskPerTradePercent, 1)
  );
  const [minimumRewardRiskRatio, setMinimumRewardRiskRatio] = useState(
    stringifyNumber(existingPlan?.minimumRewardRiskRatio, 2)
  );
  const [allowedPairs, setAllowedPairs] = useState(
    stringifyList(existingPlan?.allowedPairs, ['XAUUSD'])
  );
  const [sessionStart, setSessionStart] = useState(existingPlan?.sessionStart || '18:00');
  const [sessionEnd, setSessionEnd] = useState(existingPlan?.sessionEnd || '23:00');
  const [ruleNotes, setRuleNotes] = useState(
    existingPlan?.ruleNotes ||
      'Follow setup only. No revenge trade. Stop trading after daily max loss is hit.'
  );
  const [mentalChecklist, setMentalChecklist] = useState(
    stringifyList(existingPlan?.mentalChecklist, [
      'I am calm before entry',
      'Setup is valid',
      'SL and TP are clear',
      'Risk is within plan',
    ])
  );

  const calculatedDailyLossAmount = calculatePercentageAmount(
    realBalance,
    dailyMaxLossPercent
  );
  const calculatedDailyProfitTargetAmount = calculatePercentageAmount(
    realBalance,
    dailyProfitTargetPercent
  );

  useEffect(() => {
    if (!existingPlan || !tradingAccount) {
      return;
    }

    setDailyMaxLossPercent(stringifyNumber(existingPlan.dailyMaxLossPercent, 3));
    setDailyProfitTargetPercent(
      stringifyNumber(existingPlan.dailyProfitTargetPercent, 5)
    );
    setMaxTradesPerDay(stringifyNumber(existingPlan.maxTradesPerDay, 5));
    setRiskPerTradePercent(stringifyNumber(existingPlan.riskPerTradePercent, 1));
    setMinimumRewardRiskRatio(stringifyNumber(existingPlan.minimumRewardRiskRatio, 2));
    setAllowedPairs(stringifyList(existingPlan.allowedPairs, ['XAUUSD']));
    setSessionStart(existingPlan.sessionStart || '18:00');
    setSessionEnd(existingPlan.sessionEnd || '23:00');
    setRuleNotes(existingPlan.ruleNotes || '');
    setMentalChecklist(stringifyList(existingPlan.mentalChecklist, []));
  }, [existingPlan, tradingAccount]);

  const preview = useMemo(() => {
    if (!tradingAccount) {
      return {
        dailyLossAmount: 0,
        profitTargetAmount: 0,
        riskAmount: 0,
      };
    }

    const riskPercent = parseNumber(riskPerTradePercent);

    return {
      dailyLossAmount: calculatedDailyLossAmount,
      profitTargetAmount: calculatedDailyProfitTargetAmount,
      riskAmount: (realBalance * riskPercent) / 100,
    };
  }, [
    calculatedDailyLossAmount,
    calculatedDailyProfitTargetAmount,
    realBalance,
    riskPerTradePercent,
    tradingAccount,
  ]);

  if (!tradingAccount) {
    return (
      <Screen>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
          </Pressable>

          <View style={styles.headerText}>
            <AppText variant="caption" muted>
              Trading Plan
            </AppText>

            <AppText variant="title">Not Found</AppText>
          </View>
        </View>

        <View style={styles.emptyCard}>
          <Ionicons name="alert-circle-outline" size={30} color={colors.textMuted} />

          <AppText variant="body" muted style={styles.emptyDescription}>
            This trading account may have been deleted.
          </AppText>
        </View>
      </Screen>
    );
  }

  function handleSave() {
    if (!tradingAccount) return;

    const result = upsertTradingPlan({
      tradingAccountId: tradingAccount.id,
      dailyMaxLossPercent: parseNumber(dailyMaxLossPercent),
      dailyMaxLossAmount: calculatedDailyLossAmount,
      dailyProfitTargetPercent: parseNumber(dailyProfitTargetPercent),
      dailyProfitTargetAmount: calculatedDailyProfitTargetAmount,
      maxTradesPerDay: parseNumber(maxTradesPerDay),
      riskPerTradePercent: parseNumber(riskPerTradePercent),
      minimumRewardRiskRatio: parseNumber(minimumRewardRiskRatio),
      allowedPairs: parseList(allowedPairs),
      sessionStart: normalizeTimeForSave(sessionStart),
      sessionEnd: normalizeTimeForSave(sessionEnd),
      ruleNotes,
      mentalChecklist: parseList(mentalChecklist),
    });

    Alert.alert('Finance OS Mobile', result.message);

    if (result.success) {
      router.back();
    }
  }

  function handleDelete() {
    if (!existingPlan || !tradingAccount) {
      Alert.alert('Finance OS Mobile', 'Trading plan not found.');
      return;
    }

    Alert.alert(
      'Delete trading plan?',
      'This will remove the trading plan for this account only.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const result = deleteTradingPlan(tradingAccount.id);

            Alert.alert('Finance OS Mobile', result.message);

            if (result.success) {
              router.back();
            }
          },
        },
      ]
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.headerText}>
          <AppText variant="caption" muted>
            Trading Plan
          </AppText>

          <AppText variant="title" numberOfLines={1}>
            {tradingAccount.name}
          </AppText>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoIcon}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.black} />
        </View>

        <View style={styles.infoTextBox}>
          <AppText variant="body" style={styles.infoTitle}>
            Discipline rules
          </AppText>

          <AppText variant="caption" muted style={styles.infoDescription}>
            Max loss and profit target amounts are calculated automatically from real account balance.
          </AppText>
        </View>
      </View>

      <View style={styles.balanceCard}>
        <AppText variant="caption" muted>
          Calculation Balance
        </AppText>

        <AppText variant="title" style={styles.balanceValue}>
          {formatCurrency(realBalance, tradingAccount.currency)}
        </AppText>

        {tradingAccount.accountType === 'cent' ? (
          <AppText variant="caption" muted style={styles.balanceNote}>
            Cent account uses raw balance ÷ 100 as real USD balance.
          </AppText>
        ) : null}
      </View>

      <View style={styles.previewCard}>
        <View style={styles.previewMetric}>
          <AppText variant="caption" muted>
            Effective Daily Max Loss
          </AppText>

          <AppText variant="body" style={styles.previewValue}>
            {formatCurrency(preview.dailyLossAmount, tradingAccount.currency)}
          </AppText>
        </View>

        <View style={styles.previewMetric}>
          <AppText variant="caption" muted>
            Daily Profit Target
          </AppText>

          <AppText variant="body" style={styles.previewValue}>
            {formatCurrency(preview.profitTargetAmount, tradingAccount.currency)}
          </AppText>
        </View>

        <View style={styles.previewMetric}>
          <AppText variant="caption" muted>
            Risk / Trade Preview
          </AppText>

          <AppText variant="body" style={styles.previewValue}>
            {formatCurrency(preview.riskAmount, tradingAccount.currency)}
          </AppText>
        </View>
      </View>

      <View style={styles.formCard}>
        <TextField
          label="Daily Max Loss"
          value={dailyMaxLossPercent}
          onChangeText={setDailyMaxLossPercent}
          placeholder="3"
          keyboardType="decimal-pad"
          suffix="%"
          helper={`Auto amount: ${formatCurrency(
            calculatedDailyLossAmount,
            tradingAccount.currency
          )}`}
          colors={colors}
        />

        <ReadOnlyAmountField
          label="Daily Max Loss Amount"
          value={formatCurrency(calculatedDailyLossAmount, tradingAccount.currency)}
          colors={colors}
        />

        <TextField
          label="Daily Profit Target"
          value={dailyProfitTargetPercent}
          onChangeText={setDailyProfitTargetPercent}
          placeholder="5"
          keyboardType="decimal-pad"
          suffix="%"
          helper={`Auto amount: ${formatCurrency(
            calculatedDailyProfitTargetAmount,
            tradingAccount.currency
          )}`}
          colors={colors}
        />

        <ReadOnlyAmountField
          label="Daily Profit Target Amount"
          value={formatCurrency(calculatedDailyProfitTargetAmount, tradingAccount.currency)}
          colors={colors}
        />

        <TextField
          label="Max Trades Per Day"
          value={maxTradesPerDay}
          onChangeText={setMaxTradesPerDay}
          placeholder="5"
          keyboardType="decimal-pad"
          colors={colors}
        />

        <TextField
          label="Risk Per Trade"
          value={riskPerTradePercent}
          onChangeText={setRiskPerTradePercent}
          placeholder="1"
          keyboardType="decimal-pad"
          suffix="%"
          colors={colors}
        />

        <TextField
          label="Minimum Reward Risk Ratio"
          value={minimumRewardRiskRatio}
          onChangeText={setMinimumRewardRiskRatio}
          placeholder="2"
          keyboardType="decimal-pad"
          prefix="1:"
          colors={colors}
        />

        <TextField
          label="Allowed Pairs"
          value={allowedPairs}
          onChangeText={setAllowedPairs}
          placeholder="XAUUSD, BTCUSD"
          multiline
          colors={colors}
        />

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Trading Session
          </AppText>

          <View style={styles.sessionMaskBox}>
            <TimeMaskInput
              label="Start"
              value={sessionStart}
              onChangeText={setSessionStart}
              colors={colors}
            />

            <View style={styles.sessionDivider}>
              <AppText variant="body" style={styles.sessionDividerText}>
                -
              </AppText>
            </View>

            <TimeMaskInput
              label="End"
              value={sessionEnd}
              onChangeText={setSessionEnd}
              colors={colors}
            />
          </View>

          <AppText variant="caption" muted style={styles.helperText}>
            Type numbers only. Example: 1800 becomes 18:00.
          </AppText>
        </View>

        <TextField
          label="Rule Notes"
          value={ruleNotes}
          onChangeText={setRuleNotes}
          placeholder="No revenge trade..."
          multiline
          colors={colors}
        />

        <TextField
          label="Mental Checklist"
          value={mentalChecklist}
          onChangeText={setMentalChecklist}
          placeholder="One item per line or comma separated"
          multiline
          colors={colors}
        />
      </View>

      <Pressable onPress={handleSave} style={styles.saveButton}>
        <Ionicons name="save-outline" size={18} color={colors.black} />

        <AppText variant="body" style={styles.saveButtonText}>
          Save Trading Plan
        </AppText>
      </Pressable>

      {existingPlan ? (
        <Pressable onPress={handleDelete} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={18} color={colors.white} />

          <AppText variant="body" style={styles.deleteButtonText}>
            Delete Trading Plan
          </AppText>
        </Pressable>
      ) : null}
    </Screen>
  );
}

function TimeMaskInput({
  label,
  value,
  onChangeText,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  colors: ThemeColors;
}) {
  const styles = createStyles(colors);

  return (
    <View style={styles.timeMaskField}>
      <AppText variant="caption" muted style={styles.timeMaskLabel}>
        {label}
      </AppText>

      <TextInput
        value={formatTimeInput(value)}
        onChangeText={(nextValue) => onChangeText(formatTimeInput(nextValue))}
        placeholder="--:--"
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
        maxLength={5}
        style={styles.timeMaskInput}
      />
    </View>
  );
}

function ReadOnlyAmountField({
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
    <View style={styles.field}>
      <AppText variant="caption" muted style={styles.label}>
        {label}
      </AppText>

      <View style={styles.readOnlyAmountBox}>
        <Ionicons name="calculator-outline" size={17} color={colors.textMuted} />

        <AppText variant="body" style={styles.readOnlyAmountText}>
          {value}
        </AppText>
      </View>
    </View>
  );
}

function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline = false,
  prefix,
  suffix,
  helper,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  multiline?: boolean;
  prefix?: string;
  suffix?: string;
  helper?: string;
  colors: ThemeColors;
}) {
  const styles = createStyles(colors);

  return (
    <View style={styles.field}>
      <AppText variant="caption" muted style={styles.label}>
        {label}
      </AppText>

      <View style={[styles.inputBox, multiline ? styles.inputBoxMultiline : null]}>
        {prefix ? (
          <AppText variant="body" style={styles.inputAffix}>
            {prefix}
          </AppText>
        ) : null}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType || 'default'}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={[styles.input, multiline ? styles.inputMultiline : null]}
        />

        {suffix ? (
          <AppText variant="caption" muted style={styles.inputSuffix}>
            {suffix}
          </AppText>
        ) : null}
      </View>

      {helper ? (
        <AppText variant="caption" muted style={styles.helperText}>
          {helper}
        </AppText>
      ) : null}
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
    headerText: {
      flex: 1,
      minWidth: 0,
    },
    infoCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 14,
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
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
    balanceCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 14,
      gap: 5,
      marginBottom: 16,
    },
    balanceValue: {
      color: colors.text,
      marginTop: 2,
    },
    balanceNote: {
      lineHeight: 18,
    },
    previewCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 14,
      gap: 10,
      marginBottom: 16,
    },
    previewMetric: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 17,
      padding: 11,
      gap: 4,
    },
    previewValue: {
      color: colors.text,
      fontWeight: '900',
    },
    formCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 16,
      gap: 15,
      marginBottom: 16,
    },
    field: {
      gap: 8,
    },
    label: {
      fontWeight: '900',
    },
    inputBox: {
      minHeight: 52,
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    inputBoxMultiline: {
      minHeight: 94,
      alignItems: 'flex-start',
      paddingTop: 12,
    },
    input: {
      flex: 1,
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
      paddingVertical: 10,
      outlineStyle: 'none' as any,
    },
    inputMultiline: {
      minHeight: 70,
      lineHeight: 20,
    },
    inputAffix: {
      color: colors.text,
      fontWeight: '900',
    },
    inputSuffix: {
      fontWeight: '900',
    },
    helperText: {
      lineHeight: 18,
    },
    readOnlyAmountBox: {
      minHeight: 52,
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    readOnlyAmountText: {
      color: colors.text,
      fontWeight: '900',
    },
    sessionMaskBox: {
      minHeight: 62,
      borderRadius: 20,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    timeMaskField: {
      flex: 1,
      minWidth: 0,
      borderRadius: 15,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 4,
    },
    timeMaskLabel: {
      fontSize: 10,
      fontWeight: '900',
    },
    timeMaskInput: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
      paddingVertical: 0,
      letterSpacing: 0.5,
      outlineStyle: 'none' as any,
    },
    sessionDivider: {
      width: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sessionDividerText: {
      color: colors.textMuted,
      fontWeight: '900',
      fontSize: 18,
    },
    saveButton: {
      minHeight: 56,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 9,
      paddingHorizontal: 18,
      marginBottom: 12,
    },
    saveButtonText: {
      color: colors.black,
      fontWeight: '900',
    },
    deleteButton: {
      minHeight: 56,
      borderRadius: 20,
      backgroundColor: colors.expense,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 9,
      paddingHorizontal: 18,
      marginBottom: 8,
    },
    deleteButtonText: {
      color: colors.white,
      fontWeight: '900',
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 22,
      alignItems: 'center',
    },
    emptyDescription: {
      marginTop: 10,
      textAlign: 'center',
      lineHeight: 21,
    },
  });
}
