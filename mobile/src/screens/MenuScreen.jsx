import AppButton from '../components/AppButton.jsx';
import Card from '../components/Card.jsx';
import Screen from '../components/Screen.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

const MenuScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const currentUserId = user?.userId ?? user?.id;
  const isAdmin = user?.role === 'ROLE_ADMIN';

  return (
    <Screen title="Menu" subtitle={user?.username ? `@${user.username}` : undefined}>
      <Card>
        <UserAvatar username={user?.username} profilePicUrl={user?.profilePicUrl} size="xl" />
        <AppButton variant="secondary" label="Home" onPress={() => navigation.navigate('Home')} />
        <AppButton variant="secondary" label="Create" onPress={() => navigation.navigate('Create')} />
        <AppButton variant="secondary" label="Search users" onPress={() => navigation.navigate('SearchUsers')} />
        <AppButton variant="secondary" label="Profile" onPress={() => navigation.navigate('Profile', { userId: currentUserId })} />
        <AppButton variant="secondary" label="Backlog" onPress={() => navigation.navigate('Backlog')} />
        <AppButton variant="secondary" label="Install" onPress={() => navigation.navigate('InstallInfo')} />
        {isAdmin ? <AppButton variant="secondary" label="Admin" onPress={() => navigation.navigate('AdminHome')} /> : null}
        <AppButton variant="ghost" label="Log out" onPress={logout} />
      </Card>
    </Screen>
  );
};

export default MenuScreen;
