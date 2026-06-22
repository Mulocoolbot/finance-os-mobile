import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, TextInput, View } from 'react-native';
import { AnimatedPressable } from '../src/components/ui/AnimatedPressable';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { ThemeColors } from '../src/constants/colors';
import { useThemeColors } from '../src/hooks/useThemeColors';

export default function LoginScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <Screen>
      <View style={styles.headerRow}>
        <AnimatedPressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={20} color={colors.text} />
        </AnimatedPressable>

        <View style={styles.headerTextBox}>
          <AppText variant="title">Login</AppText>
          <AppText variant="caption" muted>
            Returning user entry
          </AppText>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons name="lock-closed-outline" size={28} color={colors.text} />
        </View>

        <AppText variant="subtitle">Welcome back</AppText>
        <AppText variant="body" muted style={styles.heroDescription}>
          This screen is prepared for the next auth phase. Local finance data remains untouched until cloud sync is connected.
        </AppText>
      </View>

      <View style={styles.formCard}>
        <AuthInput label="Email" placeholder="your@email.com" icon="mail-outline" colors={colors} />
        <AuthInput label="Password" placeholder="••••••••" icon="key-outline" secure colors={colors} />

        <View style={styles.disabledAction}>
          <Ionicons name="construct-outline" size={18} color={colors.textMuted} />
          <AppText variant="caption" muted>
            Email login will be connected after backend setup.
          </AppText>
        </View>
      </View>

      <AnimatedPressable onPress={() => router.push('/sign-in' as any)} style={styles.secondaryAction}>
        <Ionicons name="logo-google" size={18} color={colors.text} />
        <AppText variant="body" style={styles.secondaryActionText}>
          Open Google sign-in page
        </AppText>
      </AnimatedPressable>
    </Screen>
  );
}

function AuthInput({
  label,
  placeholder,
  icon,
  secure = false,
  colors,
}: {
  label: string;
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
  secure?: boolean;
  colors: ThemeColors;
}) {
  const styles = createStyles(colors);

  return (
    <View style={styles.inputGroup}>
      <AppText variant="caption" muted>
        {label}
      </AppText>

      <View style={styles.inputShell}>
        <Ionicons name={icon} size={18} color={colors.textMuted} />
        <TextInput
          editable={false}
          secureTextEntry={secure}
          placeholder={placeholder}
          placeholderTextColor={colors.textSubtle}
          style={[styles.input, { color: colors.text }]}
        />
      </View>
    </View>
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
    heroIcon: {
      width: 56,
      height: 56,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    heroDescription: {
      lineHeight: 20,
    },
    formCard: {
      gap: 14,
      padding: 16,
      borderRadius: 26,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    inputGroup: {
      gap: 8,
    },
    inputShell: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
    },
    input: {
      flex: 1,
      fontSize: 15,
      fontWeight: '650' as any,
    },
    disabledAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 13,
      borderRadius: 18,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
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
