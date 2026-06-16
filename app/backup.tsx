import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { StatCard } from '../src/components/ui/StatCard';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useFinanceStore } from '../src/stores/useFinanceStore';

export default function BackupScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const accounts = useFinanceStore((state) => state.accounts);
  const transactions = useFinanceStore((state) => state.transactions);
  const budgets = useFinanceStore((state) => state.budgets);
  const savingGoals = useFinanceStore((state) => state.savingGoals);
  const categories = useFinanceStore((state) => state.categories);
  const getFinanceExportData = useFinanceStore((state) => state.getFinanceExportData);
  const importFinanceData = useFinanceStore((state) => state.importFinanceData);

  const [backupText, setBackupText] = useState('');
  const [importText, setImportText] = useState('');

  const backupSummary = useMemo(() => {
    return {
      accounts: accounts.length,
      transactions: transactions.length,
      budgets: budgets.length,
      savings: savingGoals.length,
      categories: categories.length,
    };
  }, [accounts, transactions, budgets, savingGoals, categories]);

  function handleGenerateBackup() {
    setBackupText(getFinanceExportData());
  }

  function handleImportBackup() {
    const result = importFinanceData(importText);

    Alert.alert('Finance OS Mobile', result.message);

    if (result.success) {
      setImportText('');
      setBackupText(getFinanceExportData());
    }
  }

  function handleClearExportText() {
    setBackupText('');
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.headerText}>
          <AppText variant="caption" muted>
            Data Tools
          </AppText>

          <AppText variant="title" style={styles.title}>
            Backup & Restore
          </AppText>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons name="shield-checkmark-outline" size={25} color={colors.text} />
        </View>

        <View style={styles.heroTextBox}>
          <AppText variant="subtitle">Manual JSON Backup</AppText>

          <AppText variant="body" muted style={styles.heroDescription}>
            Export your finance data as text, then save it somewhere safe. You can paste it back here to restore.
          </AppText>
        </View>
      </View>

      <View style={styles.grid}>
        <StatCard label="Accounts" value={`${backupSummary.accounts}`} />
        <StatCard label="Transactions" value={`${backupSummary.transactions}`} tone="transfer" />
        <StatCard label="Budgets" value={`${backupSummary.budgets}`} tone="investment" />
        <StatCard label="Savings" value={`${backupSummary.savings}`} tone="saving" />
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Export Data</AppText>

        <AppText variant="caption" muted>
          JSON backup
        </AppText>
      </View>

      <View style={styles.card}>
        <AppText variant="body" style={styles.cardTitle}>
          Generate backup text
        </AppText>

        <AppText variant="caption" muted style={styles.cardDescription}>
          Tap generate, then select/copy all JSON text and save it to Notes, Drive, or another safe place.
        </AppText>

        <View style={styles.buttonRow}>
          <Pressable onPress={handleGenerateBackup} style={styles.primaryButton}>
            <Ionicons name="document-text-outline" size={18} color={colors.black} />

            <AppText variant="body" style={styles.primaryButtonText}>
              Generate
            </AppText>
          </Pressable>

          <Pressable onPress={handleClearExportText} style={styles.secondaryButton}>
            <AppText variant="body" style={styles.secondaryButtonText}>
              Clear
            </AppText>
          </Pressable>
        </View>

        <TextInput
          value={backupText}
          onChangeText={setBackupText}
          placeholder="Generated backup JSON will appear here."
          placeholderTextColor={colors.textMuted}
          multiline
          selectTextOnFocus
          style={styles.textArea}
        />
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Import Data</AppText>

        <AppText variant="caption" muted>
          Restore backup
        </AppText>
      </View>

      <View style={styles.card}>
        <AppText variant="body" style={styles.cardTitle}>
          Paste backup JSON
        </AppText>

        <AppText variant="caption" muted style={styles.cardDescription}>
          Importing will replace your current local finance data with the backup content.
        </AppText>

        <TextInput
          value={importText}
          onChangeText={setImportText}
          placeholder="Paste Finance OS Mobile backup JSON here."
          placeholderTextColor={colors.textMuted}
          multiline
          style={styles.textArea}
        />

        <Pressable onPress={handleImportBackup} style={styles.dangerButton}>
          <Ionicons name="cloud-upload-outline" size={18} color={colors.black} />

          <AppText variant="body" style={styles.primaryButtonText}>
            Import Backup
          </AppText>
        </Pressable>
      </View>

      <View style={styles.warningCard}>
        <Ionicons name="alert-circle-outline" size={20} color={colors.transfer} />

        <AppText variant="caption" muted style={styles.warningText}>
          Backup is manual in this phase. Automatic file picker, share sheet, and cloud sync can be added later.
        </AppText>
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
    grid: {
      marginTop: 18,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    sectionHeader: {
      marginTop: 28,
      marginBottom: 14,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 12,
    },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 16,
      gap: 14,
    },
    cardTitle: {
      fontWeight: '900',
    },
    cardDescription: {
      lineHeight: 19,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 10,
    },
    primaryButton: {
      flex: 1,
      minHeight: 50,
      borderRadius: 17,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    primaryButtonText: {
      color: colors.black,
      fontWeight: '900',
    },
    secondaryButton: {
      minHeight: 50,
      borderRadius: 17,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
    },
    secondaryButtonText: {
      color: colors.text,
      fontWeight: '900',
    },
    dangerButton: {
      minHeight: 50,
      borderRadius: 17,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    textArea: {
      minHeight: 180,
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      color: colors.text,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '600',
      textAlignVertical: 'top',
    },
    warningCard: {
      marginTop: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 14,
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
    },
    warningText: {
      flex: 1,
      lineHeight: 18,
    },
  });
}
