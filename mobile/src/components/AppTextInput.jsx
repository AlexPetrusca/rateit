import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, text } from '../theme.js';

const AppTextInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
  secureTextEntry = false,
  autoCapitalize = 'sentences',
  style,
  inputStyle
}) => (
  <View style={[styles.field, style]}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textSubtle}
      multiline={multiline}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
      autoCapitalize={autoCapitalize}
      style={[styles.input, multiline && styles.multiline, inputStyle]}
      textAlignVertical={multiline ? 'top' : 'center'}
    />
  </View>
);

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs
  },
  label: {
    ...text.muted,
    fontWeight: '700'
  },
  input: {
    minHeight: 46,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 16
  },
  multiline: {
    minHeight: 96
  }
});

export default AppTextInput;
