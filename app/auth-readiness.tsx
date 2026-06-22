import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AnimatedPressable } from '../src/components/ui/AnimatedPressable';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';

const readinessItems = [
  {
    title: 'Current storage',
    description: 'Finance data still runs locally from AsyncStorage, so existing data stays untouched.',
    icon: 'phone-portrait-outline',
  },
  {
    title: 'Auth foundation',
    description: 'Login and sign-in pages are prepared first before connecting Google or cloud sync.',
    icon: 'person-circle-outline',
  },
  {
    title: 'Next backend step',
    description: 'After this skeleton is safe, the next phase can add Supabase or another auth provider.',
    icon: 'cloud-outline',
  },
] as const;

export default function AuthReadinessScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <Screen>
      <View style={styles.headerRow}>
        <AnimatedPressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={20} color={colors.text} />
        </AnimatedPressable>

        <View style={styles.headerTextBox}>
          <AppText variant="title">Database + Auth</AppText>
          <AppText variant="caption" muted>
            Auth preparation
          </AppText>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons name="shield-checkmark-outline" size={28} color={colors.text} />
        </View>

        <View style={styles.heroTextBox}>
          <AppText variant="subtitle">Safe auth foundation</AppText>
          <AppText variant="body" muted style={styles.heroDescription}>
            This phase only prepares the entry screens and readiness map. No data migration, route protection, or cloud sync is active yet.
          </AppText>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Readiness Check</AppText>
        <AppText variant="caption" muted>
          No backend yet
        </AppText>
      </View>

      <View style={styles.cardList}>
        {readinessItems.map((item) => (
          <View key={item.title} style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Ionicons name={item.icon} size={21} color={colors.text} />
            </View>

            <View style={styles.infoTextBox}>
              <AppText variant="body" style={styles.infoTitle}>
                {item.title}
              </AppText>
              <AppText variant="caption" muted style={styles.infoDescription}>
                {item.description}
              </AppText>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Entry Preview</AppText>
        <AppText variant="caption" muted>
          UI only
        </AppText>
      </View>

      <View style={styles.actionGrid}>
        <AuthActionCard
          title="Login Page"
          description="Returning user entry screen."
          icon="log-in-outline"
          onPress={() => router.push('/login' as any)}
          colors={colors}
        />

        <AuthActionCard
          title="Sign In Page"
          description="Google sign-in entry screen."
          icon="logo-google"
          onPress={() => router.push('/sign-in' as any)}
          colors={colors}
        />
      </View>
    </Screen>
  );
}

function AuthActionCard({
  title,
  description,
  icon,
  onPress,
  colors,
}: {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  colors: ThemeColors;
}) {
  const styles = createStyles(colors);

  return (
    <AnimatedPressable onPress={onPress} style={styles.actionCard}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={22} color={colors.black} />
      </View>

      <View style={styles.actionTextBox}>
        <AppText variant="body" style={styles.actionTitle}>
          {title}
        </AppText>
        <AppText variant="caption" muted>
          {description}
        </AppText>
      </View>

      <Ionicons name="chevron-forward-outline" size={18} color={colors.textMuted} />
    </AnimatedPressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 18,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerTextBox: {
      flex: 1,
    },
    heroCard: {
      flexDirection: 'row',
      gap: 14,
      padding: 18,
      borderRadius: 26,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
    },
    heroIcon: {
      width: 54,
      height: 54,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    heroTextBox: {
      flex: 1,
      gap: 8,
    },
    heroDescription: {
      lineHeight: 20,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    cardList: {
      gap: 10,
      marginBottom: 24,
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 22,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    infoIcon: {
      width: 42,
      height: 42,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceSoft,
    },
    infoTextBox: {
      flex: 1,
      gap: 4,
    },
    infoTitle: {
      fontWeight: '800' as any,
    },
    infoDescription: {
      lineHeight: 16,
    },
    actionGrid: {
      gap: 12,
    },
    actionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      borderRadius: 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionIcon: {
      width: 44,
      height: 44,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    actionTextBox: {
      flex: 1,
      gap: 4,
    },
    actionTitle: {
      fontWeight: '850' as any,
    },
  });
}
