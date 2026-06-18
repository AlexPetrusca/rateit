import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '../theme.js';

const variants = {
  primary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    color: '#ffffff'
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
  children,
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
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: variantStyle.backgroundColor,
          borderColor: variantStyle.borderColor,
          opacity: disabled ? 0.55 : pressed ? 0.78 : 1
        },
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.color} />
      ) : (
        <Text style={[styles.text, { color: variantStyle.color }, textStyle]}>
          {children || label}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center'
  },
  text: {
    fontSize: 15,
    fontWeight: '700'
  }
});

export default AppButton;
