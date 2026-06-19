import { Platform, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../theme.js';

const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    gap: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOpacity: 0.22,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 }
      },
      android: { elevation: 2 }
    })
  }
});

export default Card;
