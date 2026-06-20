import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AppTextInput from './AppTextInput.jsx';
import HandDrawnIcon from './HandDrawnIcon.jsx';
import { colors, spacing, text } from '../theme.js';
import { insertLink, wrapSelection } from '../utils/richTextEditing.js';

const FORMATS = [
  { marker: '**', icon: 'bold', accessibilityLabel: 'Bold' },
  { marker: '_', icon: 'italic', accessibilityLabel: 'Italic' },
  { marker: '~', icon: 'underline', accessibilityLabel: 'Underline' }
];

const RichTextInput = ({ label, value = '', onChangeText, ...props }) => {
  const inputRef = useRef(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const applyEdit = (edit) => {
    onChangeText?.(edit.value);
    const nextSelection = { start: edit.cursor, end: edit.cursor };
    setSelection(nextSelection);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View accessibilityRole="toolbar" style={styles.toolbar}>
        {FORMATS.map((format) => (
          <Pressable
            key={format.marker}
            accessibilityRole="button"
            accessibilityLabel={format.accessibilityLabel}
            onPress={() => applyEdit(wrapSelection(value, selection, format.marker))}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <HandDrawnIcon name={format.icon} color={colors.textMuted} size={18} />
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Insert link"
          onPress={() => applyEdit(insertLink(value, selection))}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <HandDrawnIcon name="link" color={colors.textMuted} size={18} />
        </Pressable>
      </View>
      <AppTextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onSelectionChange={({ nativeEvent }) => setSelection(nativeEvent.selection)}
        selection={selection}
        multiline
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs
  },
  label: {
    ...text.muted,
    color: colors.text,
    fontWeight: '700'
  },
  toolbar: {
    flexDirection: 'row',
    gap: spacing.xs
  },
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10
  },
  buttonPressed: {
    backgroundColor: colors.surfacePressed
  },
});

export default RichTextInput;
