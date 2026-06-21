import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { AnimatedPressable } from '../src/components/ui/AnimatedPressable';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import {
  getProviderLabel,
  searchInvestmentAssets,
  type InvestmentAssetSearchResult,
} from '../src/services/investmentAssetSearch';
import { useFinanceStore } from '../src/stores/useFinanceStore';
import { Account, CryptoWalletKind, Currency, InvestmentHolding } from '../src/types/finance';
import { formatCurrency } from '../src/utils/currency';

const walletKinds: {
  label: string;
  value: CryptoWalletKind;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}[] = [
  {
    label: 'Web3',
    value: 'web3',
    icon: 'globe-outline',
    description: 'Self-custody wallet.',
  },
  {
    label: 'CEX',
    value: 'cex',
    icon: 'business-outline',
    description: 'Exchange wallet.',
  },
  {
    label: 'Hardware',
    value: 'hardware',
    icon: 'hardware-chip-outline',
    description: 'Hardware wallet.',
  },
  {
    label: 'Custodial',
    value: 'custodial',
    icon: 'shield-checkmark-outline',
    description: 'Managed wallet.',
  },
  {
    label: 'Other',
    value: 'other',
    icon: 'wallet-outline',
    description: 'Other wallet.',
  },
];

const currencyOptions: Currency[] = ['IDR', 'USD', 'EUR'];

function getWalletKindLabel(kind?: CryptoWalletKind) {
  return walletKinds.find((item) => item.value === kind)?.label || 'Crypto Wallet';
}

function normalizeSymbol(value: string) {
  return value.trim().toUpperCase();
}

function getHoldingValue(holding: InvestmentHolding) {
  return holding.quantity * holding.currentPrice;
}

function uniqueAssetsBySymbol(items: InvestmentAssetSearchResult[]) {
  const seen = new Set<string>();
  const results: InvestmentAssetSearchResult[] = [];

  items.forEach((item) => {
    const symbol = normalizeSymbol(item.symbol);

    if (!symbol || seen.has(symbol)) {
      return;
    }

    seen.add(symbol);
    results.push({
      ...item,
      symbol,
    });
  });

  return results;
}

export default function CryptoWalletsScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const accounts = useFinanceStore((state) => state.accounts);
  const holdings = useFinanceStore((state) => state.investmentHoldings);
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);
  const addAccount = useFinanceStore((state) => state.addAccount);

  const cryptoWallets = useMemo(
    () => accounts.filter((account) => account.type === 'crypto_wallet'),
    [accounts]
  );

  const [name, setName] = useState('');
  const [walletKind, setWalletKind] = useState<CryptoWalletKind>('web3');
  const [network, setNetwork] = useState('Ethereum');
  const [address, setAddress] = useState('');
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [assetQuery, setAssetQuery] = useState('');
  const [assetResults, setAssetResults] = useState<InvestmentAssetSearchResult[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<InvestmentAssetSearchResult[]>([]);
  const [assetStatus, setAssetStatus] = useState(
    'Search API/provider assets.'
  );
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const query = assetQuery.trim();

    if (query.length < 2) {
      setAssetResults([]);
      setIsSearching(false);
      setAssetStatus('Type 2+ characters.');
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      setAssetStatus('Searching provider...');

      try {
        const results = await searchInvestmentAssets(query, 'crypto', 16);

        if (cancelled) return;

        const uniqueResults = uniqueAssetsBySymbol(results);

        setAssetResults(uniqueResults);
        setAssetStatus(
          uniqueResults.length > 0
            ? `${uniqueResults.length} crypto asset${uniqueResults.length > 1 ? 's' : ''} found from API/provider.`
            : 'No crypto asset found from API/provider. Try another symbol or name.'
        );
      } catch (error) {
        if (cancelled) return;

        setAssetResults([]);
        setAssetStatus(
          error instanceof Error
            ? `${error.message} Try another query or check your connection.`
            : 'Unable to search crypto API/provider. Try another query or check your connection.'
        );
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [assetQuery]);

  function toggleAsset(asset: InvestmentAssetSearchResult) {
    const normalizedSymbol = normalizeSymbol(asset.symbol);

    setSelectedAssets((current) => {
      const exists = current.some((item) => normalizeSymbol(item.symbol) === normalizedSymbol);

      if (exists) {
        return current.filter((item) => normalizeSymbol(item.symbol) !== normalizedSymbol);
      }

      return uniqueAssetsBySymbol([...current, { ...asset, symbol: normalizedSymbol }]);
    });
  }

  function handleCreateWallet() {
    if (!name.trim()) {
      Alert.alert('Finance OS Mobile', 'Wallet name is required.');
      return;
    }

    if (selectedAssets.length === 0) {
      Alert.alert(
        'Finance OS Mobile',
        'Choose at least one crypto asset returned from the API/provider.'
      );
      return;
    }

    const result = addAccount({
      name,
      type: 'crypto_wallet',
      currency,
      initialBalance: 0,
      walletKind,
      walletNetwork: network,
      walletAddress: address,
      supportedCryptoSymbols: selectedAssets.map((asset) => normalizeSymbol(asset.symbol)),
    });

    Alert.alert('Finance OS Mobile', result.message);

    if (result.success) {
      setName('');
      setWalletKind('web3');
      setNetwork('Ethereum');
      setAddress('');
      setSelectedAssets([]);
      setAssetQuery('');
      setAssetResults([]);
      setAssetStatus('Wallet saved.');
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
        </AnimatedPressable>

        <View style={styles.headerText}>
          <AppText variant="caption" muted>
            Crypto
          </AppText>

          <AppText variant="title" style={styles.title}>
            Crypto Wallets
          </AppText>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons name="logo-bitcoin" size={26} color={colors.text} />
        </View>

        <View style={styles.heroTextBox}>
          <AppText variant="subtitle">Wallet Manager</AppText>

          <AppText variant="body" muted style={styles.heroDescription}>
            Save wallet profiles with provider-backed crypto assets.
          </AppText>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Add Crypto Wallet</AppText>

        <AppText variant="caption" muted>
          Provider assets
        </AppText>
      </View>

      <View style={styles.formCard}>
        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Wallet Name
          </AppText>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Example: MetaMask Main Wallet"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Wallet Type
          </AppText>

          <View style={styles.optionList}>
            {walletKinds.map((item) => {
              const active = walletKind === item.value;

              return (
                <AnimatedPressable
                  key={item.value}
                  onPress={() => setWalletKind(item.value)}
                  style={[styles.optionCard, active ? styles.optionCardActive : null]}
                >
                  <View style={[styles.optionIcon, active ? styles.optionIconActive : null]}>
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={active ? colors.black : colors.text}
                    />
                  </View>

                  <View style={styles.optionTextBox}>
                    <AppText
                      variant="body"
                      style={[styles.optionTitle, active ? styles.optionTitleActive : null]}
                    >
                      {item.label}
                    </AppText>

                    <AppText
                      variant="caption"
                      muted={!active}
                      style={[styles.optionDescription, active ? styles.optionDescriptionActive : null]}
                    >
                      {item.description}
                    </AppText>
                  </View>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Network / Chain
          </AppText>

          <TextInput
            value={network}
            onChangeText={setNetwork}
            placeholder="Ethereum, Solana, BSC, TRON, Bitcoin..."
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Wallet Address / Account ID
          </AppText>

          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="0x..., bc1..., exchange UID, or optional note"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Value Currency
          </AppText>

          <View style={styles.currencyRow}>
            {currencyOptions.map((item) => {
              const active = currency === item;

              return (
                <AnimatedPressable
                  key={item}
                  onPress={() => setCurrency(item)}
                  style={[styles.currencyChip, active ? styles.currencyChipActive : null]}
                >
                  <AppText
                    variant="caption"
                    style={[styles.currencyText, active ? styles.currencyTextActive : null]}
                  >
                    {item}
                  </AppText>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Search Crypto
          </AppText>

          <TextInput
            value={assetQuery}
            onChangeText={setAssetQuery}
            placeholder="Search BTC, ETH, Solana, USDT..."
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            style={styles.input}
          />

          <View style={styles.statusCard}>
            <Ionicons
              name={isSearching ? 'sync-outline' : 'cloud-outline'}
              size={16}
              color={colors.textMuted}
            />

            <AppText variant="caption" muted style={styles.statusText}>
              {assetStatus}
            </AppText>
          </View>

          {assetResults.length > 0 ? (
            <View style={styles.resultList}>
              {assetResults.map((asset) => {
                const active = selectedAssets.some(
                  (item) => normalizeSymbol(item.symbol) === normalizeSymbol(asset.symbol)
                );

                return (
                  <AnimatedPressable
                    key={asset.id}
                    onPress={() => toggleAsset(asset)}
                    style={[styles.resultCard, active ? styles.resultCardActive : null]}
                  >
                    <View style={styles.resultTextBox}>
                      <AppText
                        variant="body"
                        style={[styles.resultSymbol, active ? styles.resultSymbolActive : null]}
                      >
                        {normalizeSymbol(asset.symbol)}
                      </AppText>

                      <AppText
                        variant="caption"
                        muted={!active}
                        style={active ? styles.resultDescriptionActive : undefined}
                        numberOfLines={1}
                      >
                        {asset.name} • {getProviderLabel(asset.provider)}
                      </AppText>
                    </View>

                    <Ionicons
                      name={active ? 'checkmark-circle' : 'add-circle-outline'}
                      size={20}
                      color={active ? colors.black : colors.textMuted}
                    />
                  </AnimatedPressable>
                );
              })}
            </View>
          ) : null}
        </View>

        <View style={styles.field}>
          <AppText variant="caption" muted style={styles.label}>
            Selected Assets
          </AppText>

          <View style={styles.selectedRow}>
            {selectedAssets.length === 0 ? (
              <View style={styles.emptySelected}>
                <AppText variant="caption" muted>
                  No asset selected.
                </AppText>
              </View>
            ) : null}

            {selectedAssets.map((asset) => (
              <AnimatedPressable
                key={asset.id}
                onPress={() => toggleAsset(asset)}
                style={styles.selectedPill}
              >
                <AppText variant="caption" style={styles.selectedPillText}>
                  {normalizeSymbol(asset.symbol)}
                </AppText>

                <Ionicons name="close-outline" size={14} color={colors.text} />
              </AnimatedPressable>
            ))}
          </View>
        </View>

        <AnimatedPressable onPress={handleCreateWallet} style={styles.submitButton}>
          <Ionicons name="add-outline" size={18} color={colors.black} />

          <AppText variant="body" style={styles.submitText}>
            Save Crypto Wallet
          </AppText>
        </AnimatedPressable>
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Saved Wallets</AppText>

        <AppText variant="caption" muted>
          {cryptoWallets.length} wallet{cryptoWallets.length === 1 ? '' : 's'}
        </AppText>
      </View>

      <View style={styles.walletList}>
        {cryptoWallets.length === 0 ? (
          <View style={styles.emptyCard}>
            <AppText variant="subtitle">No wallet yet</AppText>

            <AppText variant="body" muted style={styles.emptyDescription}>
              Search provider assets and save your first wallet.
            </AppText>
          </View>
        ) : null}

        {cryptoWallets.map((wallet) => (
          <CryptoWalletCard
            key={wallet.id}
            wallet={wallet}
            holdings={holdings.filter((holding) => holding.accountId === wallet.id)}
            colors={colors}
          />
        ))}
      </View>
    </Screen>
  );
}

function CryptoWalletCard({
  wallet,
  holdings,
  colors,
}: {
  wallet: Account;
  holdings: InvestmentHolding[];
  colors: ThemeColors;
}) {
  const styles = createStyles(colors);
  const selectedSymbols = wallet.supportedCryptoSymbols || [];
  const holdingValue = holdings.reduce((total, holding) => total + getHoldingValue(holding), 0);

  return (
    <View style={styles.walletCard}>
      <View style={styles.walletHeader}>
        <View style={styles.walletIcon}>
          <Ionicons name="logo-bitcoin" size={22} color={colors.investment} />
        </View>

        <View style={styles.walletTitleBox}>
          <AppText variant="body" style={styles.walletTitle} numberOfLines={1}>
            {wallet.name}
          </AppText>

          <AppText variant="caption" muted numberOfLines={1}>
            {getWalletKindLabel(wallet.walletKind)} • {wallet.walletNetwork || 'No network'}
          </AppText>
        </View>

        <View style={styles.walletBadge}>
          <AppText variant="caption" style={styles.walletBadgeText}>
            Assets
          </AppText>
        </View>
      </View>

      <View style={styles.walletInfoBox}>
        <AppText variant="caption" muted>
          Address
        </AppText>

        <AppText variant="caption" style={styles.walletAddress} numberOfLines={2}>
          {wallet.walletAddress || 'No address saved'}
        </AppText>
      </View>

      <View style={styles.walletMetricRow}>
        <View style={styles.walletMetric}>
          <AppText variant="caption" muted>
            Holdings
          </AppText>

          <AppText variant="body" style={styles.walletMetricValue}>
            {holdings.length}
          </AppText>
        </View>

        <View style={styles.walletMetric}>
          <AppText variant="caption" muted>
            Value
          </AppText>

          <AppText variant="body" style={styles.walletMetricValue}>
            {formatCurrency(holdingValue, wallet.currency)}
          </AppText>
        </View>
      </View>

      <View style={styles.supportedRow}>
        {selectedSymbols.length === 0 ? (
          <View style={styles.supportedPill}>
            <AppText variant="caption" style={styles.supportedText}>
              No API assets
            </AppText>
          </View>
        ) : null}

        {selectedSymbols.map((symbol) => (
          <View key={symbol} style={styles.supportedPill}>
            <AppText variant="caption" style={styles.supportedText}>
              {symbol}
            </AppText>
          </View>
        ))}
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
      backgroundColor: colors.investmentSoft,
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
    formCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 24,
      padding: 14,
      gap: 14,
    },
    field: {
      gap: 9,
    },
    label: {
      fontWeight: '900',
    },
    input: {
      minHeight: 52,
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      color: colors.text,
      paddingHorizontal: 15,
      fontSize: 14,
      fontWeight: '800',
    },
    optionList: {
      gap: 10,
    },
    optionCard: {
      borderRadius: 20,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    optionCardActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    optionIcon: {
      width: 40,
      height: 40,
      borderRadius: 15,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionIconActive: {
      backgroundColor: 'rgba(0,0,0,0.08)',
    },
    optionTextBox: {
      flex: 1,
      minWidth: 0,
    },
    optionTitle: {
      fontWeight: '900',
    },
    optionTitleActive: {
      color: colors.black,
    },
    optionDescription: {
      marginTop: 3,
      lineHeight: 16,
    },
    optionDescriptionActive: {
      color: 'rgba(0,0,0,0.68)',
    },
    currencyRow: {
      flexDirection: 'row',
      gap: 9,
    },
    currencyChip: {
      minHeight: 42,
      borderRadius: 15,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    currencyChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    currencyText: {
      color: colors.textMuted,
      fontWeight: '900',
    },
    currencyTextActive: {
      color: colors.black,
    },
    statusCard: {
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      padding: 12,
      flexDirection: 'row',
      gap: 9,
      alignItems: 'flex-start',
    },
    statusText: {
      flex: 1,
      lineHeight: 18,
    },
    resultList: {
      gap: 8,
    },
    resultCard: {
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    resultCardActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    resultTextBox: {
      flex: 1,
      minWidth: 0,
    },
    resultSymbol: {
      color: colors.text,
      fontWeight: '900',
    },
    resultSymbolActive: {
      color: colors.black,
    },
    resultDescriptionActive: {
      color: 'rgba(0,0,0,0.68)',
    },
    selectedRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    emptySelected: {
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    selectedPill: {
      borderRadius: 999,
      backgroundColor: colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 7,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    selectedPillText: {
      color: colors.black,
      fontWeight: '900',
    },
    submitButton: {
      minHeight: 54,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    submitText: {
      color: colors.black,
      fontWeight: '900',
    },
    walletList: {
      gap: 10,
    },
    walletCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 24,
      padding: 14,
      gap: 11,
    },
    walletHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
    },
    walletIcon: {
      width: 44,
      height: 44,
      borderRadius: 17,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    walletTitleBox: {
      flex: 1,
      minWidth: 0,
    },
    walletTitle: {
      color: colors.text,
      fontWeight: '900',
    },
    walletBadge: {
      borderRadius: 999,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    walletBadgeText: {
      color: colors.text,
      fontWeight: '900',
      fontSize: 10,
    },
    walletInfoBox: {
      borderRadius: 17,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      padding: 12,
    },
    walletAddress: {
      marginTop: 4,
      color: colors.text,
      fontWeight: '800',
      lineHeight: 18,
    },
    walletMetricRow: {
      flexDirection: 'row',
      gap: 10,
    },
    walletMetric: {
      flex: 1,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      padding: 11,
    },
    walletMetricValue: {
      marginTop: 5,
      color: colors.text,
      fontWeight: '900',
    },
    supportedRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
    },
    supportedPill: {
      borderRadius: 999,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    supportedText: {
      color: colors.text,
      fontWeight: '900',
      fontSize: 10,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 22,
      padding: 18,
    },
    emptyDescription: {
      marginTop: 8,
      lineHeight: 22,
    },
  });
}
