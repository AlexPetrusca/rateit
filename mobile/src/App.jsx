import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import AppErrorBoundary from './components/AppErrorBoundary.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { NotificationProvider } from './contexts/NotificationContext.jsx';
import AppNavigator from './navigation/AppNavigator.jsx';

const App = () => {
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_900Black: require('@expo-google-fonts/playfair-display/900Black/PlayfairDisplay_900Black.ttf'),
    PlayfairDisplay_400Regular: require('@expo-google-fonts/playfair-display/400Regular/PlayfairDisplay_400Regular.ttf'),
    Gelasio_400Regular: require('@expo-google-fonts/gelasio/400Regular/Gelasio_400Regular.ttf')
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AppErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <StatusBar style="light" />
          <AppNavigator />
        </NotificationProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
};

export default App;
