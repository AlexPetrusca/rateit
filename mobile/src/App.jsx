import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { NotificationProvider } from './contexts/NotificationContext.jsx';
import AppNavigator from './navigation/AppNavigator.jsx';

const App = () => (
  <AuthProvider>
    <NotificationProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </NotificationProvider>
  </AuthProvider>
);

export default App;
