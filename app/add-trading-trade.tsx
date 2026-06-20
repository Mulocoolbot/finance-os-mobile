import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import {
  TradingTradeDirection,
  TradingTradeStatus,
  useFinanceStore,
} from '../src/stores/useFinanceStore';
import { formatCurrency } from '../src/utils/currency';

function parseNumber(value: string) {
  const normalizedValue = value.replace(/,/g, '.').trim();
  const numericValue = Number(normalizedValue);

  return Number.isFinite(numericValue) ? numericValue : 0;
}

function stringifyNumber(value: number | null | undefined, fallback = '') {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return `${value}`;
}

function parseList(value: string) {
  return value
    .split(/[,\n]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentTimeInputValue() {
  const now = new Date();

  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
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
    return '00:00';
  }

  const hours = Math.min(Number(digits.slice(0, 2) || '0'), 23);
  const minutes = Math.min(Number(digits.slice(2, 4) || '0'), 59);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function combineDateAndTime(dateValue: string, timeValue: string) {
  const datePart = dateValue || getTodayInputValue();
  const timePart = normalizeTimeForSave(timeValue);

  return `${datePart}T${timePart}:00`;
}

function getDatePart(value: string | null | undefined) {
  if (!value) {
    return getTodayInputValue();
  }

  return value.slice(0, 10);
}

function getTimePart(value: string | null | undefined) {
  if (!value || !value.includes('T')) {
    return getCurrentTimeInputValue();
  }

  return value.slice(11, 16);
}

function getRealBalance(account: {
  accountType: string;
  balance: number;
}) {
  if (account.accountType === 'cent') {
    return account.balance / 100;
  }

  return account.balance;
}

export default function AddTradingTradeScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ tradingAccountId?: string; tradeId?: string }>();

  const tradingAccounts = useFinanceStore((state) => state.tradingAccounts);
  const tradingPlans = useFinanceStore((state) => state.tradingPlans);
  const tradingTrades = useFinanceStore((state) => state.tradingTrades);
  const addTradingTrade = useFinanceStore((state) => state.addTradingTrade);
  const updateTradingTrade = useFinanceStore((state) => state.updateTradingTrade);

  const existingTrade = tradingTrades.find((trade) => trade.id === params.tradeId);
  const resolvedTradingAccountId = params.tradingAccountId || existingTrade?.tradingAccountId;

  const tradingAccount = tradingAccounts.find(
    (account) => account.id === resolvedTradingAccountId
  );
  const tradingPlan = tradingPlans.find(
    (plan) => plan.tradingAccountId === resolvedTradingAccountId
  );
  const isEditing = Boolean(existingTrade);

  const defaultPair = tradingPlan?.allowedPairs[0] || 'XAUUSD';

  const [status, setStatus] = useState<TradingTradeStatus>('closed');
  const [direction, setDirection] = useState<TradingTradeDirection>('buy');
  const [pair, setPair] = useState(defaultPair);
  const [lotSize, setLotSize] = useState('0.01');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [grossProfitLoss, setGrossProfitLoss] = useState('');
  const [commission, setCommission] = useState('0');
  const [swap, setSwap] = useState('0');
  const [riskAmount, setRiskAmount] = useState('');
  const [rewardRiskRatio, setRewardRiskRatio] = useState('');
  const [setupTag, setSetupTag] = useState('');
  const [mistakeTags, setMistakeTags] = useState('');
  const [emotionBefore, setEmotionBefore] = useState('');
  const [emotionAfter, setEmotionAfter] = useState('');
  const [openDate, setOpenDate] = useState(getTodayInputValue());
  const [closeDate, setCloseDate] = useState(getTodayInputValue());
  const [openTime, setOpenTime] = useState(getCurrentTimeInputValue());
  const [closeTime, setCloseTime] = useState(getCurrentTimeInputValue());
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!existingTrade) {
      return;
    }

    setStatus(existingTrade.status);
    setDirection(existingTrade.direction);
    setPair(existingTrade.pair);
    setLotSize(stringifyNumber(existingTrade.lotSize, '0.01'));
    setEntryPrice(stringifyNumber(existingTrade.entryPrice));
    setExitPrice(stringifyNumber(existingTrade.exitPrice));
    setStopLoss(stringifyNumber(existingTrade.stopLoss));
    setTakeProfit(stringifyNumber(existingTrade.takeProfit));
    setGrossProfitLoss(stringifyNumber(existingTrade.grossProfitLoss));
    setCommission(stringifyNumber(existingTrade.commission, '0'));
    setSwap(stringifyNumber(existingTrade.swap, '0'));
    setRiskAmount(stringifyNumber(existingTrade.riskAmount));
    setRewardRiskRatio(stringifyNumber(existingTrade.rewardRiskRatio));
    setSetupTag(existingTrade.setupTag || '');
    setMistakeTags(existingTrade.mistakeTags.join(', '));
    setEmotionBefore(existingTrade.emotionBefore || '');
    setEmotionAfter(existingTrade.emotionAfter || '');
    setOpenDate(getDatePart(existingTrade.openDate));
    setCloseDate(getDatePart(existingTrade.closeDate));
    setOpenTime(getTimePart(existingTrade.openDate));
    setCloseTime(getTimePart(existingTrade.closeDate));
    setNote(existingTrade.note || '');
  }, [existingTrade]);

  const preview = useMemo(() => {
    const gross = status === 'closed' ? parseNumber(grossProfitLoss) : 0;
    const fee = parseNumber(commission);
    const swapAmount = parseNumber(swap);
    const net = gross - fee + swapAmount;
    const risk = parseNumber(riskAmount);

    return {
      net,
      risk,
      riskPercent:
        tradingAccount && risk > 0
          ? (risk / Math.max(getRealBalance(tradingAccount), 1)) * 100
          : 0,
    };
  }, [commission, grossProfitLoss, riskAmount, status, swap, tradingAccount]);

  if (!tradingAccount) {
    return (
      <Screen>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
          </Pressable>

          <View style={styles.headerText}>
            <AppText variant="caption" muted>
              Add Trade
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

    const payload = {
      tradingAccountId: tradingAccount.id,
      status,
      pair,
      direction,
      lotSize: parseNumber(lotSize),
      entryPrice: parseNumber(entryPrice),
      exitPrice: exitPrice ? parseNumber(exitPrice) : null,
      stopLoss: stopLoss ? parseNumber(stopLoss) : null,
      takeProfit: takeProfit ? parseNumber(takeProfit) : null,
      openDate: combineDateAndTime(openDate, openTime),
      closeDate: status === 'closed' ? combineDateAndTime(closeDate, closeTime) : null,
      grossProfitLoss: parseNumber(grossProfitLoss),
      commission: parseNumber(commission),
      swap: parseNumber(swap),
      riskAmount: parseNumber(riskAmount),
      rewardRiskRatio: parseNumber(rewardRiskRatio),
      setupTag,
      mistakeTags: parseList(mistakeTags),
      emotionBefore,
      emotionAfter,
      note,
    };

    const result =
      isEditing && existingTrade
        ? updateTradingTrade({
            ...payload,
            tradeId: existingTrade.id,
          })
        : addTradingTrade(payload);

    Alert.alert('Finance OS Mobile', result.message);

    if (result.success) {
      router.back();
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.headerText}>
          <AppText variant="caption" muted>
            {isEditing ? 'Edit Trade' : 'Add Trade'}
          </AppText>

          <AppText variant="title" numberOfLines={1}>
            {tradingAccount.name}
          </AppText>
        </View>
      </View>

      <View style={styles.previewCard}>
        <View style={styles.previewHeader}>
          <View style={styles.previewIcon}>
            <Ionicons
              name={direction === 'buy' ? 'trending-up-outline' : 'trending-down-outline'}
              size={22}
              color={direction === 'buy' ? colors.income : colors.expense}
            />
          </View>

          <View style={styles.previewTitleBox}>
            <AppText variant="caption" muted>
              Trade Preview
            </AppText>

            <AppText variant="subtitle" style={styles.previewTitle} numberOfLines={1}>
              {pair || 'Trading Pair'} · {direction.toUpperCase()}
            </AppText>

            <AppText variant="caption" muted style={styles.previewDescription}>
              {status === 'closed' ? 'Closed trade record' : 'Open position tracking'} · {lotSize || '0'} lot
            </AppText>
          </View>

          <View style={styles.statusBadge}>
            <Ionicons
              name={status === 'closed' ? 'checkmark-circle-outline' : 'radio-button-on-outline'}
              size={14}
              color={status === 'closed' ? colors.income : colors.investment}
            />

            <AppText variant="caption" style={styles.statusBadgeText}>
              {status.toUpperCase()}
            </AppText>
          </View>
        </View>

        <View style={styles.previewGrid}>
          <View style={styles.previewMetric}>
            <AppText variant="caption" muted>
              Net P/L Preview
            </AppText>

            <AppText
              variant="body"
              style={[
                styles.previewValue,
                { color: preview.net >= 0 ? colors.income : colors.expense },
              ]}
              numberOfLines={1}
            >
              {formatCurrency(preview.net, tradingAccount.currency)}
            </AppText>
          </View>

          <View style={styles.previewMetric}>
            <AppText variant="caption" muted>
              Risk Preview
            </AppText>

            <AppText variant="body" style={styles.previewValue} numberOfLines={1}>
              {formatCurrency(preview.risk, tradingAccount.currency)} •{' '}
              {preview.riskPercent.toFixed(2)}%
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.formCard}>
        <View style={styles.sectionMiniHeader}>
          <View>
            <AppText variant="caption" muted>
              Step 1
            </AppText>

            <AppText variant="subtitle" style={styles.sectionMiniTitle}>
              Status & direction
            </AppText>
          </View>

          <AppText variant="caption" muted style={styles.sectionMiniHint}>
            Trade flow
          </AppText>
        </View>

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Status
          </AppText>

          <View style={styles.chipRow}>
            <Chip label="Closed" active={status === 'closed'} onPress={() => setStatus('closed')} colors={colors} />
            <Chip label="Open" active={status === 'open'} onPress={() => setStatus('open')} colors={colors} />
          </View>
        </View>

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Direction
          </AppText>

          <View style={styles.chipRow}>
            <Chip label="Buy" active={direction === 'buy'} onPress={() => setDirection('buy')} colors={colors} />
            <Chip label="Sell" active={direction === 'sell'} onPress={() => setDirection('sell')} colors={colors} />
          </View>
        </View>

        {tradingPlan && tradingPlan.allowedPairs.length > 0 ? (
          <View style={styles.field}>
            <AppText variant="caption" muted style={styles.label}>
              Plan Pairs
            </AppText>

            <View style={styles.chipRow}>
              {tradingPlan.allowedPairs.map((item) => (
                <Chip
                  key={item}
                  label={item}
                  active={pair.toUpperCase() === item.toUpperCase()}
                  onPress={() => setPair(item)}
                  colors={colors}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.sectionMiniHeader}>
          <View>
            <AppText variant="caption" muted>
              Step 2
            </AppText>

            <AppText variant="subtitle" style={styles.sectionMiniTitle}>
              Position setup
            </AppText>
          </View>

          <AppText variant="caption" muted style={styles.sectionMiniHint}>
            Pair & price
          </AppText>
        </View>

        <TextField label="Pair" value={pair} onChangeText={setPair} placeholder="XAUUSD" colors={colors} />

        <TextField
          label="Lot Size"
          value={lotSize}
          onChangeText={setLotSize}
          placeholder="0.01"
          keyboardType="decimal-pad"
          colors={colors}
        />

        <TextField
          label="Entry Price"
          value={entryPrice}
          onChangeText={setEntryPrice}
          placeholder="0"
          keyboardType="decimal-pad"
          colors={colors}
        />

        <TextField
          label="Exit Price"
          value={exitPrice}
          onChangeText={setExitPrice}
          placeholder={status === 'closed' ? '0' : 'optional'}
          keyboardType="decimal-pad"
          colors={colors}
        />

        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <TextField
              label="Stop Loss"
              value={stopLoss}
              onChangeText={setStopLoss}
              placeholder="optional"
              keyboardType="decimal-pad"
              colors={colors}
            />
          </View>

          <View style={styles.column}>
            <TextField
              label="Take Profit"
              value={takeProfit}
              onChangeText={setTakeProfit}
              placeholder="optional"
              keyboardType="decimal-pad"
              colors={colors}
            />
          </View>
        </View>

        <View style={styles.sectionMiniHeader}>
          <View>
            <AppText variant="caption" muted>
              Step 3
            </AppText>

            <AppText variant="subtitle" style={styles.sectionMiniTitle}>
              Risk & result
            </AppText>
          </View>

          <AppText variant="caption" muted style={styles.sectionMiniHint}>
            P/L & RR
          </AppText>
        </View>

        {status === 'closed' ? (
          <>
            <TextField
              label="Gross P/L"
              value={grossProfitLoss}
              onChangeText={setGrossProfitLoss}
              placeholder="profit positive, loss negative"
              keyboardType="decimal-pad"
              suffix={tradingAccount.currency}
              colors={colors}
            />

            <View style={styles.twoColumn}>
              <View style={styles.column}>
                <TextField
                  label="Commission"
                  value={commission}
                  onChangeText={setCommission}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  colors={colors}
                />
              </View>

              <View style={styles.column}>
                <TextField
                  label="Swap"
                  value={swap}
                  onChangeText={setSwap}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  colors={colors}
                />
              </View>
            </View>
          </>
        ) : null}

        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <TextField
              label="Risk Amount"
              value={riskAmount}
              onChangeText={setRiskAmount}
              placeholder="0"
              keyboardType="decimal-pad"
              colors={colors}
            />
          </View>

          <View style={styles.column}>
            <TextField
              label="RR"
              value={rewardRiskRatio}
              onChangeText={setRewardRiskRatio}
              placeholder="2"
              keyboardType="decimal-pad"
              prefix="1:"
              colors={colors}
            />
          </View>
        </View>

        <View style={styles.sectionMiniHeader}>
          <View>
            <AppText variant="caption" muted>
              Step 4
            </AppText>

            <AppText variant="subtitle" style={styles.sectionMiniTitle}>
              Time, psychology & notes
            </AppText>
          </View>

          <AppText variant="caption" muted style={styles.sectionMiniHint}>
            Review
          </AppText>
        </View>

        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <TextField
              label="Open Date"
              value={openDate}
              onChangeText={setOpenDate}
              placeholder="YYYY-MM-DD"
              colors={colors}
            />
          </View>

          <View style={styles.column}>
            <TextField
              label="Close Date"
              value={closeDate}
              onChangeText={setCloseDate}
              placeholder="YYYY-MM-DD"
              colors={colors}
            />
          </View>
        </View>

        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <TimeField
              label="Open Time"
              value={openTime}
              onChangeText={setOpenTime}
              colors={colors}
            />
          </View>

          <View style={styles.column}>
            <TimeField
              label="Close Time"
              value={closeTime}
              onChangeText={setCloseTime}
              colors={colors}
            />
          </View>
        </View>

        <TextField
          label="Setup Tag"
          value={setupTag}
          onChangeText={setSetupTag}
          placeholder="FVG, SNR, Breakout..."
          colors={colors}
        />

        <TextField
          label="Mistake Tags"
          value={mistakeTags}
          onChangeText={setMistakeTags}
          placeholder="overlot, late entry, revenge trade"
          multiline
          colors={colors}
        />

        <TextField
          label="Emotion Before"
          value={emotionBefore}
          onChangeText={setEmotionBefore}
          placeholder="calm, greedy, anxious..."
          colors={colors}
        />

        <TextField
          label="Emotion After"
          value={emotionAfter}
          onChangeText={setEmotionAfter}
          placeholder="relieved, regret, confident..."
          colors={colors}
        />

        <TextField
          label="Note"
          value={note}
          onChangeText={setNote}
          placeholder="What happened in this trade?"
          multiline
          colors={colors}
        />
      </View>

      <Pressable onPress={handleSave} style={styles.saveButton}>
        <Ionicons name="save-outline" size={18} color={colors.black} />

        <AppText variant="body" style={styles.saveButtonText}>
          {isEditing ? 'Update Trade' : 'Save Trade'}
        </AppText>
      </Pressable>
    </Screen>
  );
}

function Chip({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ThemeColors;
}) {
  const styles = createStyles(colors);

  return (
    <Pressable onPress={onPress} style={[styles.chip, active ? styles.chipActive : null]}>
      <AppText
        variant="caption"
        style={[styles.chipText, active ? styles.chipTextActive : null]}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function TimeField({
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
    <View style={styles.field}>
      <AppText variant="caption" muted style={styles.label}>
        {label}
      </AppText>

      <View style={styles.inputBox}>
        <TextInput
          value={formatTimeInput(value)}
          onChangeText={(nextValue) => onChangeText(formatTimeInput(nextValue))}
          placeholder="--:--"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          maxLength={5}
          style={styles.input}
        />
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
    previewCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 14,
      gap: 12,
      marginBottom: 16,
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    previewIcon: {
      width: 46,
      height: 46,
      borderRadius: 17,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewTitleBox: {
      flex: 1,
      minWidth: 0,
    },
    previewTitle: {
      marginTop: 4,
      color: colors.text,
    },
    previewDescription: {
      marginTop: 3,
      lineHeight: 18,
    },
    statusBadge: {
      minHeight: 32,
      borderRadius: 999,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 9,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    statusBadgeText: {
      color: colors.text,
      fontWeight: '900',
      fontSize: 10,
    },
    previewGrid: {
      flexDirection: 'row',
      gap: 10,
    },
    previewMetric: {
      flex: 1,
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
    sectionMiniHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: 12,
      marginTop: 2,
      marginBottom: -2,
    },
    sectionMiniTitle: {
      marginTop: 3,
      color: colors.text,
    },
    sectionMiniHint: {
      fontWeight: '900',
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
      borderColor: colors.border,
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
    twoColumn: {
      flexDirection: 'row',
      gap: 10,
    },
    column: {
      flex: 1,
      minWidth: 0,
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
    saveButton: {
      minHeight: 56,
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
