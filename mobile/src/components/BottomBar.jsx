import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme.js';

const tabsFor = (profileUserId) => [
  { route: 'Home', label: 'Home', icon: '⌂', match: ['Home'] },
  { route: 'Following', label: 'Following', icon: '♟', match: ['Following'] },
  { route: 'Create', label: 'Create', icon: '+', match: ['Create', 'Drafts'] },
  { route: 'SearchUsers', label: 'Search', icon: '⌕', match: ['SearchUsers'] },
  { route: 'Profile', label: 'Profile', icon: '◉', params: { userId: profileUserId }, match: ['Profile', 'ProfileEditor', 'FollowList'] }
];

const BottomBar = ({ user, activeRouteName, onNavigate }) => {
  const profileUserId = user?.userId ?? user?.id;
  const tabs = tabsFor(profileUserId);

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <View style={styles.bar}>
        {tabs.map((tab) => {
          const active = tab.match.includes(activeRouteName);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              key={tab.label}
              onPress={() => onNavigate(tab.route, tab.params)}
              style={({ pressed }) => [
                styles.button,
                active && styles.active,
                pressed && !active && styles.pressed
              ]}
            >
              <Text style={[styles.icon, active && styles.activeIcon]}>{tab.icon}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 20,
    alignItems: 'center',
    zIndex: 1000
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.13)',
    borderRadius: 40,
    backgroundColor: colors.navGlass,
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 4 }
  },
  button: {
    width: 40,
    height: 34,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center'
  },
  active: {
    backgroundColor: colors.navActive
  },
  pressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)'
  },
  icon: {
    color: colors.navText,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28
  },
  activeIcon: {
    color: '#ffffff'
  }
});

export default BottomBar;
