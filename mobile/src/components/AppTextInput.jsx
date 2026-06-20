import { forwardRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, text } from '../theme.js';

const AppTextInput = forwardRef(({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
  secureTextEntry = false,
  autoCapitalize = 'sentences',
  style,
  inputStyle,
  ...inputProps
}, ref) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.field, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        ref={ref}
        {...inputProps}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        selectionColor={colors.accent}
        cursorColor={colors.accent}
        keyboardAppearance="dark"
        multiline={multiline}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        style={[styles.input, focused && styles.focused, multiline && styles.multiline, inputStyle]}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
});

AppTextInput.displayName = 'AppTextInput';

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs
  },
  label: {
    ...text.muted,
    color: colors.text,
    fontWeight: '600'
  },
  input: {
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 16,
    outlineStyle: 'none'
  },
  focused: {
    borderColor: colors.text,
    backgroundColor: colors.surface
  },
  multiline: {
    minHeight: 96
  }
});

export default AppTextInput;
