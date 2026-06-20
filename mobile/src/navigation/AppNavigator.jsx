import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, Image, Platform, StyleSheet, View } from 'react-native';
import AdminCommentsScreen from '../screens/admin/AdminCommentsScreen.jsx';
import AdminHomeScreen from '../screens/admin/AdminHomeScreen.jsx';
import AdminJobsScreen from '../screens/admin/AdminJobsScreen.jsx';
import AdminPostsScreen from '../screens/admin/AdminPostsScreen.jsx';
import AdminSuggestionsScreen from '../screens/admin/AdminSuggestionsScreen.jsx';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen.jsx';
import BacklogScreen from '../screens/BacklogScreen.jsx';
import CreateScreen from '../screens/CreateScreen.jsx';
import DraftsScreen from '../screens/DraftsScreen.jsx';
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
import { APP_PUBLIC_URL } from '../config.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { colors } from '../theme.js';

const Stack = createNativeStackNavigator();
const Tab = Platform.OS === 'web' ? createBottomTabNavigator() : createNativeBottomTabNavigator();

const linking = {
  prefixes: [APP_PUBLIC_URL],
  config: {
    screens: {
      MainTabs: {
        path: '',
        screens: {
          Home: '',
          Following: 'following',
          Create: 'create',
          Search: 'search',
          Me: 'me'
        }
      },
      Topic: 'topics/:rateableItemId',
      Profile: 'users/:userId',
      ProfileEditor: 'profile/edit',
      PostEditor: 'posts/:ratingId/edit',
      Drafts: 'drafts',
      FollowList: 'people',
      Menu: 'menu',
      Backlog: 'backlog',
      SuggestionSubmit: 'suggestions/new',
      InstallInfo: 'install'
    }
  }
};

const tabIcons = {
  Home: require('../../assets/tab-icons/home.png'),
  Following: require('../../assets/tab-icons/following.png'),
  Create: require('../../assets/tab-icons/create.png'),
  Search: require('../../assets/tab-icons/search.png'),
  Me: require('../../assets/tab-icons/profile.png')
};

const tabOptions = ({ route }) => {
  const common = {
    headerShown: true,
    headerShadowVisible: false,
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.text,
    headerTitleStyle: { fontWeight: '700' },
    tabBarActiveTintColor: colors.accent,
    tabBarInactiveTintColor: colors.textMuted
  };

  if (Platform.OS === 'web') {
    return {
      ...common,
      tabBarIcon: ({ color }) => (
        <Image source={tabIcons[route.name]} style={[styles.webTabIcon, { tintColor: color }]} />
      ),
      tabBarStyle: styles.webTabBar
    };
  }

  return {
    ...common,
    headerLargeTitle: true,
    headerLargeTitleShadowVisible: false,
    tabBarIcon: { type: 'image', source: tabIcons[route.name] },
    tabBarActiveIndicatorColor: colors.accentSoft,
    tabBarRippleColor: colors.accentSoft,
    tabBarBlurEffect: 'systemChromeMaterialDark',
    tabBarMinimizeBehavior: 'onScrollDown',
    tabBarControllerMode: 'tabBar'
  };
};

const MainTabs = ({ user }) => {
  const userId = user?.userId ?? user?.id;

  return (
    <Tab.Navigator backBehavior="history" screenOptions={tabOptions}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Critic', tabBarLabel: 'Home' }} />
      <Tab.Screen name="Following" component={HomeScreen} initialParams={{ feedType: 'following' }} />
      <Tab.Screen name="Create" component={CreateScreen} />
      <Tab.Screen name="Search" component={SearchUsersScreen} options={{ title: 'Search' }} />
      <Tab.Screen name="Me" component={ProfileScreen} initialParams={{ userId }} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
};

const stackOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.text,
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal',
  contentStyle: { backgroundColor: colors.background }
};

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

  const theme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: colors.accent,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
      notification: colors.accent
    }
  };

  return (
    <NavigationContainer linking={linking} theme={theme}>
      <Stack.Navigator screenOptions={stackOptions}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="InstallInfo" component={InstallInfoScreen} options={{ title: 'Install' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" options={{ headerShown: false }}>
              {() => <MainTabs user={user} />}
            </Stack.Screen>
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="ProfileEditor" component={ProfileEditorScreen} options={{ title: 'Edit Profile' }} />
            <Stack.Screen name="PostEditor" component={PostEditorScreen} options={{ title: 'Edit post' }} />
            <Stack.Screen name="Topic" component={TopicScreen} options={{ headerShown: Platform.OS === 'web', title: 'Topic' }} />
            <Stack.Screen name="Drafts" component={DraftsScreen} />
            <Stack.Screen name="FollowList" component={FollowListScreen} options={{ title: 'People' }} />
            <Stack.Screen name="Menu" component={MenuScreen} />
            <Stack.Screen name="Backlog" component={BacklogScreen} />
            <Stack.Screen name="SuggestionSubmit" component={SuggestionSubmitScreen} options={{ title: 'Suggestion' }} />
            <Stack.Screen name="InstallInfo" component={InstallInfoScreen} options={{ title: 'Install' }} />
            {isAdmin ? (
              <>
                <Stack.Screen name="AdminHome" component={AdminHomeScreen} options={{ title: 'Admin' }} />
                <Stack.Screen name="AdminUsers" component={AdminUsersScreen} options={{ title: 'Admin users' }} />
                <Stack.Screen name="AdminPosts" component={AdminPostsScreen} options={{ title: 'Admin posts' }} />
                <Stack.Screen name="AdminComments" component={AdminCommentsScreen} options={{ title: 'Admin comments' }} />
                <Stack.Screen name="AdminSuggestions" component={AdminSuggestionsScreen} options={{ title: 'Admin suggestions' }} />
                <Stack.Screen name="AdminJobs" component={AdminJobsScreen} options={{ title: 'Admin jobs' }} />
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
  webTabBar: {
    height: 68,
    paddingTop: 6,
    backgroundColor: colors.surface,
    borderTopColor: colors.border
  },
  webTabIcon: {
    width: 24,
    height: 24
  }
});

export default AppNavigator;
