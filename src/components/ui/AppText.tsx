import { Text, TextProps, StyleSheet } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';

type AppTextVariant = 'title' | 'subtitle' | 'body' | 'caption';

type AppTextProps = TextProps & {
  variant?: AppTextVariant;
  muted?: boolean;
};

export function AppText({
  variant = 'body',
  muted = false,
  style,
  ...props
}: AppTextProps) {
  const colors = useThemeColors();

  return (
    <Text
      {...props}
      style={[
        styles.base,
        {
          color: muted ? colors.textMuted : colors.text,
        },
        variant === 'title' && styles.title,
        variant === 'subtitle' && styles.subtitle,
        variant === 'body' && styles.body,
        variant === 'caption' && styles.caption,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    letterSpacing: -0.25,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
});
