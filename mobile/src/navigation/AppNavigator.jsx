import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import AdminCommentsScreen from '../screens/admin/AdminCommentsScreen.jsx';
import AdminHomeScreen from '../screens/admin/AdminHomeScreen.jsx';
import AdminJobsScreen from '../screens/admin/AdminJobsScreen.jsx';
import AdminPostsScreen from '../screens/admin/AdminPostsScreen.jsx';
import AdminSuggestionsScreen from '../screens/admin/AdminSuggestionsScreen.jsx';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen.jsx';
import BacklogScreen from '../screens/BacklogScreen.jsx';
import CreateScreen from '../screens/CreateScreen.jsx';
import FollowListScreen from '../screens/FollowListScreen.jsx';
import HomeScreen from '../screens/HomeScreen.jsx';
import InstallInfoScreen from '../screens/InstallInfoScreen.jsx';
import LoginScreen from '../screens/LoginScreen.jsx';
import MenuScreen from '../screens/MenuScreen.jsx';
import PostEditorScreen from '../screens/PostEditorScreen.jsx';
import ProfileEditorScreen from '../screens/ProfileEditorScreen.jsx';
import ProfileScreen from '../screens/ProfileScreen.jsx';
import SearchUsersScreen from '../screens/SearchUsersScreen.jsx';
import SuggestionSubmitScreen from '../screens/SuggestionSubmitScreen.jsx';
import TopicScreen from '../screens/TopicScreen.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { colors } from '../theme.js';

const Stack = createNativeStackNavigator();

const MenuButton = ({ navigation }) => (
  <Pressable onPress={() => navigation.navigate('Menu')} style={styles.menuButton}>
    <Text style={styles.menuText}>Menu</Text>
  </Pressable>
);

const screenOptions = ({ navigation }) => ({
  headerStyle: {
    backgroundColor: colors.surface
  },
  headerTitleStyle: {
    color: colors.text,
    fontWeight: '800'
  },
  headerRight: () => <MenuButton navigation={navigation} />
});

const AppNavigator = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const isAdmin = user?.role === 'ROLE_ADMIN';

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={isAuthenticated ? screenOptions : { headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="InstallInfo" component={InstallInfoScreen} options={{ headerShown: true, title: 'Install' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Menu" component={MenuScreen} />
            <Stack.Screen name="Create" component={CreateScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="ProfileEditor" component={ProfileEditorScreen} options={{ title: 'Profile Photo' }} />
            <Stack.Screen name="PostEditor" component={PostEditorScreen} options={{ title: 'Edit Post' }} />
            <Stack.Screen name="Topic" component={TopicScreen} />
            <Stack.Screen name="SearchUsers" component={SearchUsersScreen} options={{ title: 'Search' }} />
            <Stack.Screen name="FollowList" component={FollowListScreen} options={{ title: 'People' }} />
            <Stack.Screen name="Backlog" component={BacklogScreen} />
            <Stack.Screen name="SuggestionSubmit" component={SuggestionSubmitScreen} options={{ title: 'Suggestion' }} />
            <Stack.Screen name="InstallInfo" component={InstallInfoScreen} options={{ title: 'Install' }} />
            {isAdmin ? (
              <>
                <Stack.Screen name="AdminHome" component={AdminHomeScreen} options={{ title: 'Admin' }} />
                <Stack.Screen name="AdminUsers" component={AdminUsersScreen} options={{ title: 'Admin Users' }} />
                <Stack.Screen name="AdminPosts" component={AdminPostsScreen} options={{ title: 'Admin Posts' }} />
                <Stack.Screen name="AdminComments" component={AdminCommentsScreen} options={{ title: 'Admin Comments' }} />
                <Stack.Screen name="AdminSuggestions" component={AdminSuggestionsScreen} options={{ title: 'Admin Suggestions' }} />
                <Stack.Screen name="AdminJobs" component={AdminJobsScreen} options={{ title: 'Admin Jobs' }} />
              </>
            ) : null}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background
  },
  menuButton: {
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  menuText: {
    color: colors.accent,
    fontWeight: '800'
  }
});

export default AppNavigator;
