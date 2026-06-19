import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors, spacing, text } from '../theme.js';

const Screen = ({
  title,
  subtitle,
  children,
  actions,
  scroll = true,
  contentStyle,
  headerStyle
}) => {
  const { height } = useWindowDimensions();
  const header = (title || subtitle || actions) ? (
    <View style={[styles.header, headerStyle]}>
      <View style={styles.headerText}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  ) : null;

  if (!scroll) {
    return (
      <SafeAreaView style={[styles.safeArea, { height }]}>
        <View style={[styles.fillContent, contentStyle]}>
          {header}
          {children}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <View style={[styles.content, contentStyle]}>
          {header}
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  scroll: {
    flexGrow: 1
  },
  fillContent: {
    flex: 1
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 112,
    gap: spacing.lg
  },
  header: {
    gap: spacing.md
  },
  headerText: {
    gap: spacing.xs
  },
  title: text.h1,
  subtitle: text.muted,
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  }
});

export default Screen;
