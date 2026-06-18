import AppButton from '../../components/AppButton.jsx';
import Card from '../../components/Card.jsx';
import Screen from '../../components/Screen.jsx';

const AdminHomeScreen = ({ navigation }) => (
  <Screen title="Admin" subtitle="Moderation and automation.">
    <Card>
      <AppButton variant="secondary" label="Users" onPress={() => navigation.navigate('AdminUsers')} />
      <AppButton variant="secondary" label="Posts" onPress={() => navigation.navigate('AdminPosts')} />
      <AppButton variant="secondary" label="Comments" onPress={() => navigation.navigate('AdminComments')} />
      <AppButton variant="secondary" label="Suggestions" onPress={() => navigation.navigate('AdminSuggestions')} />
      <AppButton variant="secondary" label="Jobs" onPress={() => navigation.navigate('AdminJobs')} />
    </Card>
  </Screen>
);

export default AdminHomeScreen;
