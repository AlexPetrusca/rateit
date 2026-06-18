import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, text } from '../theme.js';

const EmptyState = ({ title = 'Nothing here yet.', message }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    {message ? <Text style={styles.message}>{message}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background
  },
  title: {
    ...text.h3,
    textAlign: 'center'
  },
  message: {
    ...text.muted,
    textAlign: 'center',
    color: colors.textMuted
  }
});

export default EmptyState;
