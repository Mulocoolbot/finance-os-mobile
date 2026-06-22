import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AnimatedPressable } from '../src/components/ui/AnimatedPressable';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';

const signInBenefits = [
  'Google auth connection point',
  'Account-based cloud sync later',
  'AI, MT4/MT5, and wallet access foundation',
];

export default function SignInScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <Screen>
      <View style={styles.headerRow}>
        <AnimatedPressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={20} color={colors.text} />
        </AnimatedPressable>

        <View style={styles.headerTextBox}>
          <AppText variant="title">Sign In</AppText>
          <AppText variant="caption" muted>
            Google entry preview
          </AppText>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.googleBadge}>
          <Ionicons name="logo-google" size={30} color={colors.black} />
        </View>

        <AppText variant="subtitle">Sign in with Google</AppText>
        <AppText variant="body" muted style={styles.heroDescription}>
          Google sign-in is prepared as a separate entry screen. The real provider connection will be added after backend setup.
        </AppText>
      </View>

      <View style={styles.benefitCard}>
        {signInBenefits.map((benefit) => (
          <View key={benefit} style={styles.benefitRow}>
            <View style={styles.checkIcon}>
              <Ionicons name="checkmark-outline" size={15} color={colors.black} />
            </View>
            <AppText variant="body" style={styles.benefitText}>
              {benefit}
            </AppText>
          </View>
        ))}
      </View>

      <View style={styles.disabledGoogleButton}>
        <Ionicons name="logo-google" size={20} color={colors.textMuted} />
        <AppText variant="body" muted style={styles.googleButtonText}>
          Google provider not connected yet
        </AppText>
      </View>

      <AnimatedPressable onPress={() => router.push('/login' as any)} style={styles.secondaryAction}>
        <Ionicons name="log-in-outline" size={18} color={colors.text} />
        <AppText variant="body" style={styles.secondaryActionText}>
          Open login page
        </AppText>
      </AnimatedPressable>
    </Screen>
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
      gap: 12,
      padding: 20,
      borderRadius: 28,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    googleBadge: {
      width: 58,
      height: 58,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    heroDescription: {
      lineHeight: 20,
    },
    benefitCard: {
      gap: 12,
      padding: 16,
      borderRadius: 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    benefitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    checkIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    benefitText: {
      flex: 1,
      fontWeight: '700' as any,
    },
    disabledGoogleButton: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderRadius: 20,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      marginBottom: 12,
    },
    googleButtonText: {
      fontWeight: '850' as any,
    },
    secondaryAction: {
      minHeight: 54,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryActionText: {
      fontWeight: '850' as any,
    },
  });
}
