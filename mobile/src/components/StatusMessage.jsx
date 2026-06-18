import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme.js';

const palette = {
  error: {
    backgroundColor: colors.dangerSoft,
    color: colors.danger
  },
  warning: {
    backgroundColor: '#fef3c7',
    color: colors.warning
  },
  info: {
    backgroundColor: colors.accentSoft,
    color: colors.accent
  }
};

const StatusMessage = ({ message, type = 'info' }) => {
  if (!message) {
    return null;
  }

  const theme = palette[type] || palette.info;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <Text style={[styles.text, { color: theme.color }]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: radius.md
  },
  text: {
    fontWeight: '700'
  }
});

export default StatusMessage;
