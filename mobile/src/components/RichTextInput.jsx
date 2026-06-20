import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AppTextInput from './AppTextInput.jsx';
import { colors, spacing, text } from '../theme.js';
import { insertLink, wrapSelection } from '../utils/richTextEditing.js';

const FORMATS = [
  { marker: '**', label: 'B', accessibilityLabel: 'Bold', styleName: 'bold' },
  { marker: '_', label: 'I', accessibilityLabel: 'Italic', styleName: 'italic' },
  { marker: '~', label: 'U', accessibilityLabel: 'Underline', styleName: 'underline' }
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
            <Text style={[styles.buttonText, styles[format.styleName]]}>{format.label}</Text>
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Insert link"
          onPress={() => applyEdit(insertLink(value, selection))}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.link}>⌁</Text>
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
  buttonText: {
    color: colors.textMuted,
    fontSize: 15
  },
  bold: {
    fontWeight: '900'
  },
  italic: {
    fontStyle: 'italic'
  },
  underline: {
    textDecorationLine: 'underline'
  },
  link: {
    color: colors.textMuted,
    fontSize: 22,
    lineHeight: 24
  }
});

export default RichTextInput;
