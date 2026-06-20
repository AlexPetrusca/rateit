import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '../theme.js';

const variants = {
  primary: {
    backgroundColor: 'transparent',
    borderColor: colors.text,
    color: colors.text
  },
  secondary: {
    backgroundColor: 'transparent',
    borderColor: colors.borderStrong,
    color: colors.text
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    color: colors.accent
  },
  danger: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
    color: '#ffffff'
  }
};

const AppButton = ({
  label,
  icon,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
  textStyle
}) => {
  const variantStyle = variants[variant] || variants.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      android_ripple={{ color: variant === 'primary' ? 'rgba(255,255,255,0.18)' : colors.accentSoft }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed ? colors.surfacePressed : variantStyle.backgroundColor,
          borderColor: variantStyle.borderColor,
          opacity: disabled ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }]
        },
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.color} />
      ) : icon ? (
        icon
      ) : (
        <Text style={[styles.text, { color: variantStyle.color }, textStyle]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center'
  },
  text: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: -0.1
  }
});

export default AppButton;
