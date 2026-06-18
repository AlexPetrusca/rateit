import { Text } from 'react-native';
import Card from '../components/Card.jsx';
import Screen from '../components/Screen.jsx';
import { text } from '../theme.js';

const InstallInfoScreen = () => (
  <Screen title="Install" subtitle="Native app setup notes.">
    <Card>
      <Text style={text.body}>This package is the React Native mobile app for Critic.</Text>
      <Text style={text.body}>Run it with Expo, then point EXPO_PUBLIC_API_BASE_URL at the backend or nginx URL reachable from your simulator or phone.</Text>
    </Card>
  </Screen>
);

export default InstallInfoScreen;
