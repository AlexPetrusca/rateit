import { DarkTheme, NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, View } from 'react-native';
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
import PromptScreen from '../screens/PromptScreen.jsx';
import SearchUsersScreen from '../screens/SearchUsersScreen.jsx';
import SuggestionSubmitScreen from '../screens/SuggestionSubmitScreen.jsx';
import TopicScreen from '../screens/TopicScreen.jsx';
import TourneyCreateScreen from '../screens/TourneyCreateScreen.jsx';
import TourneyDashboardScreen from '../screens/TourneyDashboardScreen.jsx';
import TourneyDetailScreen from '../screens/TourneyDetailScreen.jsx';
import TourneyLeaderboardScreen from '../screens/TourneyLeaderboardScreen.jsx';
import TourneyScreen from '../screens/TourneyScreen.jsx';
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
      Prompts: 'prompts/users/:userId',
      Profile: 'users/:userId',
      ProfileEditor: 'profile/edit',
      PostEditor: 'posts/:ratingId/edit',
      Drafts: 'drafts',
      FollowList: 'people',
      Menu: 'menu',
      Backlog: 'backlog',
      SuggestionSubmit: 'suggestions/new',
      Tourney: 'tourney',
      TourneyDashboard: 'tourney/dashboard',
      TourneyLeaderboard: 'tourney/leaderboard',
      TourneyCreate: 'tourney/new',
      TourneyDetail: 'tournaments/:tournamentId',
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

// On web the density-suffixed (@2x/@3x) variants aren't selected for the tinted
// nav icons, so the 24px @1x got upscaled and looked pixelated on retina. Use a
// single high-res (72px) source for the web nav bar so it stays crisp.
const webTabIcons = {
  Home: require('../../assets/tab-icons/home_hd.png'),
  Following: require('../../assets/tab-icons/following_hd.png'),
  Create: require('../../assets/tab-icons/create_hd.png'),
  Search: require('../../assets/tab-icons/search_hd.png'),
  Me: require('../../assets/tab-icons/profile_hd.png')
};

const tourneyTabIcons = {
  TourneyDashboard: require('../../assets/tab-icons/tourney-dashboard.png'),
  Tourney: require('../../assets/tab-icons/tourney-list.png'),
  TourneyLeaderboard: require('../../assets/tab-icons/tourney-trophy.png')
};

const webTourneyTabIcons = {
  TourneyDashboard: require('../../assets/tab-icons/tourney-dashboard_hd.png'),
  Tourney: require('../../assets/tab-icons/tourney-list_hd.png'),
  TourneyLeaderboard: require('../../assets/tab-icons/tourney-trophy_hd.png')
};

const tabOptions = ({ route }) => {
  const common = {
    headerShown: false,
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
      tabBarStyle: { display: 'none' }
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

const TAB_NAMES = Object.keys(tabIcons);
const TOURNEY_TAB_NAMES = Object.keys(tourneyTabIcons);
const WEB_NAV_W = 320;
const BUBBLE_W = 40;

const WebNavBar = ({ activeTab, onNavigate, tabNames = TAB_NAMES, icons = webTabIcons }) => {
  const [hidden, setHidden] = useState(false);
  const slotWidth = WEB_NAV_W / tabNames.length;
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, tabNames.indexOf(activeTab)));

  useEffect(() => {
    const handler = ({ detail }) => setHidden(detail === 'down');
    window.addEventListener('rateit-scroll-direction', handler);
    return () => window.removeEventListener('rateit-scroll-direction', handler);
  }, []);

  // Sync bubble to nav state for back/forward + deep links; press sets it instantly.
  useEffect(() => {
    const idx = tabNames.indexOf(activeTab);
    if (idx >= 0) setActiveIndex(idx);
  }, [activeTab, tabNames]);

  return (
    <View style={[styles.webTabBar, hidden && styles.webTabBarHidden]}>
      <View
        style={[
          styles.bubble,
          {
            left: (slotWidth - BUBBLE_W) / 2,
            transform: [{ translateX: activeIndex * slotWidth }]
          }
        ]}
      />
      {tabNames.map((name, i) => (
        <Pressable
          key={name}
          style={styles.webTabItem}
          onPress={() => { setHidden(false); setActiveIndex(i); onNavigate(name); }}
        >
          <View style={styles.webTabIconWrap}>
            <Image source={icons[name]} style={styles.webTabIcon} />
          </View>
        </Pressable>
      ))}
    </View>
  );
};

const MainTabs = ({ user }) => {
  const userId = user?.userId ?? user?.id;

  return (
    <Tab.Navigator
      backBehavior="history"
      screenOptions={tabOptions}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Critic', tabBarLabel: 'Home' }} />
      <Tab.Screen name="Following" component={HomeScreen} initialParams={{ feedType: 'following' }} />
      <Tab.Screen name="Create" component={CreateScreen} />
      <Tab.Screen name="Search" component={SearchUsersScreen} options={{ title: 'Search' }} />
      <Tab.Screen name="Me" component={ProfileScreen} initialParams={{ userId }} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
};

const stackOptions = {
  headerShown: false,
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.text,
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal',
  contentStyle: { backgroundColor: colors.background }
};

const AppNavigator = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const isAdmin = user?.role === 'ROLE_ADMIN';
  const navigationRef = useNavigationContainerRef();
  const [activeTab, setActiveTab] = useState('Home');
  const [activeTourneyTab, setActiveTourneyTab] = useState('TourneyDashboard');
  const [showNav, setShowNav] = useState(true);
  const [showTourneyNav, setShowTourneyNav] = useState(false);

  const handleStateChange = useCallback(() => {
    // getCurrentRoute() returns the deepest focused route, regardless of how the
    // state tree is nested (client nav vs deep link) — more reliable than parsing
    // state.routes[index] by hand.
    const name = navigationRef.getCurrentRoute?.()?.name;
    if (TAB_NAMES.includes(name)) {
      setActiveTab(name);
    }
    if (TOURNEY_TAB_NAMES.includes(name)) {
      setActiveTourneyTab(name);
    }
    setShowNav(
      name !== 'Topic'
      && name !== 'PostEditor'
      && name !== 'Prompts'
      && name !== 'Create'
      // Everything tourney-related (selector, creator, future screens) is its own
      // full-screen flow — hide the main nav bar.
      && !String(name || '').startsWith('Tourney')
    );
    setShowTourneyNav(TOURNEY_TAB_NAMES.includes(name));
  }, [navigationRef]);

  const navigateToTab = useCallback((name) => {
    navigationRef.navigate('MainTabs', { screen: name });
  }, [navigationRef]);

  const navigateToTourneyTab = useCallback((name) => {
    navigationRef.navigate(name);
  }, [navigationRef]);

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
    <NavigationContainer ref={navigationRef} linking={linking} theme={theme} onReady={handleStateChange} onStateChange={handleStateChange}>
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
            <Stack.Screen name="Topic" component={TopicScreen} />
            <Stack.Screen name="Prompts" component={PromptScreen} />
            <Stack.Screen name="Drafts" component={DraftsScreen} />
            <Stack.Screen name="FollowList" component={FollowListScreen} options={{ title: 'People' }} />
            <Stack.Screen name="Menu" component={MenuScreen} />
            <Stack.Screen name="Backlog" component={BacklogScreen} />
            <Stack.Screen name="SuggestionSubmit" component={SuggestionSubmitScreen} options={{ title: 'Suggestion' }} />
            <Stack.Screen name="TourneyDashboard" component={TourneyDashboardScreen} />
            <Stack.Screen name="Tourney" component={TourneyScreen} />
            <Stack.Screen name="TourneyLeaderboard" component={TourneyLeaderboardScreen} />
            <Stack.Screen name="TourneyCreate" component={TourneyCreateScreen} />
            <Stack.Screen name="TourneyDetail" component={TourneyDetailScreen} />
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
      {Platform.OS === 'web' && isAuthenticated && showNav && <WebNavBar activeTab={activeTab} onNavigate={navigateToTab} />}
      {Platform.OS === 'web' && isAuthenticated && showTourneyNav ? (
        <WebNavBar
          activeTab={activeTourneyTab}
          onNavigate={navigateToTourneyTab}
          tabNames={TOURNEY_TAB_NAMES}
          icons={webTourneyTabIcons}
        />
      ) : null}
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
    position: 'absolute',
    left: '50%',
    bottom: 18,
    width: WEB_NAV_W,
    height: 58,
    marginLeft: -(WEB_NAV_W / 2),
    zIndex: 9999,
    flexDirection: 'row',
    paddingVertical: 5,
    borderWidth: 1,
    borderTopWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 30,
    backgroundColor: 'rgba(24, 24, 28, 0.9)',
    backdropFilter: 'blur(14px)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.42)',
    transform: [{ translateY: 0 }],
    opacity: 1,
    transitionProperty: 'transform, opacity',
    transitionDuration: '360ms'
  },
  webTabBarHidden: {
    transform: [{ translateY: 65 }],
    opacity: 1
  },
  webTabItem: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center'
  },
  bubble: {
    position: 'absolute',
    top: 9,
    width: BUBBLE_W,
    height: BUBBLE_W,
    borderRadius: BUBBLE_W / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    transitionProperty: 'transform',
    transitionDuration: '240ms',
    transitionTimingFunction: 'ease-out'
  },
  webTabIconWrap: {
    width: 40,
    height: 40,
    marginVertical: 'auto',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  webTabIcon: {
    width: 22,
    height: 22,
    tintColor: colors.text
  }
});

export default AppNavigator;
