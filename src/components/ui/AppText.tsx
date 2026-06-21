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
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: -0.55,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '850' as any,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '550' as any,
  },
  caption: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '750' as any,
    letterSpacing: 0.15,
  },
});
