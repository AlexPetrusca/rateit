import { Component } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
// Extensionless on purpose: Metro only picks the platform variant
// (ErrorReportingService.web.js) when the import has no explicit extension.
import { captureException } from '../services/ErrorReportingService';
import { colors, radius, spacing, text } from '../theme.js';

// A render-time throw anywhere below this boundary used to unmount the whole
// tree and leave a blank screen with nothing recorded. Catch it, report it, and
// show the user something they can act on.
class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    captureException(error, { componentStack: errorInfo?.componentStack });
  }

  handleReload = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
      return;
    }

    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Something broke</Text>
        <Text style={styles.body}>
          The app hit an unexpected error. It has been reported.
        </Text>
        <Pressable
          onPress={this.handleReload}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonLabel}>
            {Platform.OS === 'web' ? 'Reload' : 'Try again'}
          </Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background
  },
  title: {
    ...text.h2
  },
  body: {
    ...text.muted,
    textAlign: 'center'
  },
  button: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.accent
  },
  buttonPressed: {
    opacity: 0.85
  },
  buttonLabel: {
    ...text.body,
    color: colors.background
  }
});

export default AppErrorBoundary;
