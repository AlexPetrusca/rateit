import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import LoginScreen from './screens/LoginScreen.jsx';
import TourneyScreen from './screens/TourneyScreen.jsx';
import { colors } from './theme.js';

const AppContent = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return isAuthenticated ? <TourneyScreen /> : <LoginScreen />;
};

const App = () => (
  <SafeAreaProvider>
    <AuthProvider>
      <StatusBar style="dark" />
      <AppContent />
    </AuthProvider>
  </SafeAreaProvider>
);

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background
  }
});

export default App;
