import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';

type RoadmapItem = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  status: 'Ready' | 'Next' | 'Later';
};

const roadmapItems: RoadmapItem[] = [
  {
    title: 'Manual Trading Account',
    description: 'Add broker, server, account type, leverage, balance, equity, and currency manually.',
    icon: 'person-circle-outline',
    status: 'Next',
  },
  {
    title: 'Manual Trade Journal',
    description: 'Record pair, direction, lot, entry, exit, SL/TP, result, emotion, mistake, and lesson.',
    icon: 'create-outline',
    status: 'Next',
  },
  {
    title: 'MT4/MT5 Statement Import',
    description: 'Import statement/history file to read closed trades, profit, swap, commission, and account summary.',
    icon: 'document-text-outline',
    status: 'Later',
  },
  {
    title: 'MT4/MT5 Auto Sync',
    description: 'Connector layer for balance, equity, account type, leverage, server, broker, and trade history.',
    icon: 'sync-outline',
    status: 'Later',
  },
];

const metricPreview = [
  {
    label: 'Balance',
    value: 'Waiting',
    icon: 'wallet-outline' as const,
  },
  {
    label: 'Equity',
    value: 'Waiting',
    icon: 'pulse-outline' as const,
  },
  {
    label: 'Winrate',
    value: '0%',
    icon: 'analytics-outline' as const,
  },
  {
    label: 'Trades',
    value: '0',
    icon: 'list-outline' as const,
  },
];

export default function JournalScreen() {
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
            Journal
          </AppText>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons name="book-outline" size={26} color={colors.text} />
        </View>

        <View style={styles.heroTextBox}>
          <AppText variant="subtitle">Trading Journal</AppText>

          <AppText variant="body" muted style={styles.heroDescription}>
            A dedicated module for trading accounts, trade history, performance analytics, and MT4/MT5 integration.
          </AppText>
        </View>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={styles.statusIcon}>
            <Ionicons name="construct-outline" size={20} color={colors.black} />
          </View>

          <View style={styles.statusTextBox}>
            <AppText variant="body" style={styles.statusTitle}>
              Module shell is ready
            </AppText>

            <AppText variant="caption" muted style={styles.statusDescription}>
              This page is prepared as the base for Trading Journal. MT4/MT5 connector will be added in later phases.
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Account Snapshot</AppText>
        <AppText variant="caption" muted>
          Future sync target
        </AppText>
      </View>

      <View style={styles.metricGrid}>
        {metricPreview.map((metric) => (
          <View key={metric.label} style={styles.metricCard}>
            <View style={styles.metricIcon}>
              <Ionicons name={metric.icon} size={18} color={colors.textMuted} />
            </View>

            <AppText variant="caption" muted>
              {metric.label}
            </AppText>

            <AppText variant="body" style={styles.metricValue}>
              {metric.value}
            </AppText>
          </View>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">MT4/MT5 Connector Plan</AppText>
        <AppText variant="caption" muted>
          Safe architecture
        </AppText>
      </View>

      <View style={styles.connectorCard}>
        <View style={styles.connectorRow}>
          <View style={styles.connectorIcon}>
            <Ionicons name="phone-portrait-outline" size={20} color={colors.text} />
          </View>

          <View style={styles.connectorTextBox}>
            <AppText variant="body" style={styles.connectorTitle}>
              Mobile app
            </AppText>

            <AppText variant="caption" muted style={styles.connectorDescription}>
              Reads journal data, account summary, and trade history.
            </AppText>
          </View>
        </View>

        <View style={styles.connectorArrow}>
          <Ionicons name="arrow-down-outline" size={16} color={colors.textMuted} />
        </View>

        <View style={styles.connectorRow}>
          <View style={styles.connectorIcon}>
            <Ionicons name="cloud-outline" size={20} color={colors.text} />
          </View>

          <View style={styles.connectorTextBox}>
            <AppText variant="body" style={styles.connectorTitle}>
              Connector layer
            </AppText>

            <AppText variant="caption" muted style={styles.connectorDescription}>
              Backend/API bridge for MT4/MT5 sync, statement import, and account metadata parsing.
            </AppText>
          </View>
        </View>

        <View style={styles.connectorArrow}>
          <Ionicons name="arrow-down-outline" size={16} color={colors.textMuted} />
        </View>

        <View style={styles.connectorRow}>
          <View style={styles.connectorIcon}>
            <Ionicons name="desktop-outline" size={20} color={colors.text} />
          </View>

          <View style={styles.connectorTextBox}>
            <AppText variant="body" style={styles.connectorTitle}>
              MT4 / MT5 account
            </AppText>

            <AppText variant="caption" muted style={styles.connectorDescription}>
              Broker, server, leverage, balance, equity, account type, and trade history.
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Build Roadmap</AppText>
        <AppText variant="caption" muted>
          Phase by phase
        </AppText>
      </View>

      <View style={styles.roadmapList}>
        {roadmapItems.map((item) => (
          <View key={item.title} style={styles.roadmapCard}>
            <View style={styles.roadmapIcon}>
              <Ionicons name={item.icon} size={20} color={colors.text} />
            </View>

            <View style={styles.roadmapTextBox}>
              <View style={styles.roadmapTitleRow}>
                <AppText variant="body" style={styles.roadmapTitle}>
                  {item.title}
                </AppText>

                <View style={styles.statusBadge}>
                  <AppText variant="caption" style={styles.statusBadgeText}>
                    {item.status}
                  </AppText>
                </View>
              </View>

              <AppText variant="caption" muted style={styles.roadmapDescription}>
                {item.description}
              </AppText>
            </View>
          </View>
        ))}
      </View>

      <Pressable disabled style={styles.disabledButton}>
        <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />

        <AppText variant="body" muted style={styles.disabledButtonText}>
          Trading account setup will be added in Phase 7B
        </AppText>
      </Pressable>
    </Screen>
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
      marginBottom: 16,
    },
    heroIcon: {
      width: 58,
      height: 58,
      borderRadius: 22,
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
      marginTop: 7,
      lineHeight: 21,
    },
    statusCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 15,
      marginBottom: 20,
    },
    statusHeader: {
      flexDirection: 'row',
      gap: 12,
    },
    statusIcon: {
      width: 42,
      height: 42,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusTextBox: {
      flex: 1,
      minWidth: 0,
    },
    statusTitle: {
      color: colors.text,
      fontWeight: '900',
    },
    statusDescription: {
      marginTop: 5,
      lineHeight: 19,
    },
    sectionHeader: {
      marginTop: 10,
      marginBottom: 12,
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
      borderColor: colors.border,
      borderRadius: 22,
      padding: 14,
      gap: 7,
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
    },
    connectorCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 15,
      gap: 8,
      marginBottom: 18,
    },
    connectorRow: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    connectorIcon: {
      width: 42,
      height: 42,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    connectorTextBox: {
      flex: 1,
      minWidth: 0,
    },
    connectorTitle: {
      color: colors.text,
      fontWeight: '900',
    },
    connectorDescription: {
      marginTop: 4,
      lineHeight: 18,
    },
    connectorArrow: {
      paddingLeft: 13,
    },
    roadmapList: {
      gap: 10,
      marginBottom: 16,
    },
    roadmapCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 14,
      flexDirection: 'row',
      gap: 12,
    },
    roadmapIcon: {
      width: 42,
      height: 42,
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    roadmapTextBox: {
      flex: 1,
      minWidth: 0,
    },
    roadmapTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    roadmapTitle: {
      flex: 1,
      color: colors.text,
      fontWeight: '900',
    },
    roadmapDescription: {
      marginTop: 6,
      lineHeight: 19,
    },
    statusBadge: {
      borderRadius: 999,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    statusBadgeText: {
      color: colors.text,
      fontWeight: '900',
      fontSize: 10,
    },
    disabledButton: {
      minHeight: 54,
      borderRadius: 19,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
      marginBottom: 8,
    },
    disabledButtonText: {
      fontWeight: '800',
      textAlign: 'center',
    },
  });
}
