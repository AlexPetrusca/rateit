import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import UserAvatar from './UserAvatar.jsx';
import { colors, spacing } from '../theme.js';

const STORY_RING = 'linear-gradient(135deg, #ffb020 0%, #ff3b45 48%, #d72b91 100%)';

const Story = ({ person, own = false, hasPrompt = false, hasUnseen = false, onPress }) => {
  // Own circle: gradient whenever you have a prompt to open. Others: gradient only
  // when they have prompts this user hasn't seen yet (otherwise a muted grey ring).
  const gradientRing = own ? hasPrompt : hasUnseen;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={own ? (hasPrompt ? 'Open your prompt' : 'Create prompt') : `Open ${person?.username || 'user'} prompts`}
      onPress={onPress}
      style={({ pressed }) => [styles.story, pressed && styles.storyPressed]}
    >
      <View style={[
        styles.ring,
        gradientRing ? styles.activeRing : styles.ownRing,
        gradientRing && (Platform.OS === 'web'
          ? { backgroundImage: STORY_RING }
          : { experimental_backgroundImage: STORY_RING })
      ]}>
        <UserAvatar username={person?.username} profilePicUrl={person?.profilePicUrl} size={60} />
        {own && !hasPrompt ? (
          <View pointerEvents="none" style={styles.plusBadge}>
            <Image source={require('../../assets/icons/create.png')} style={styles.plusIcon} />
          </View>
        ) : null}
      </View>
      <Text numberOfLines={1} style={styles.label}>{own ? 'Your prompts' : person?.username}</Text>
    </Pressable>
  );
};

const StoryBar = ({ user, people = [], ownHasPrompt = false, onAddStory, onOpenStories, onOpenOwnStories }) => {
  const currentUserId = user?.userId ?? user?.id;
  const seen = new Set([currentUserId]);
  const storyPeople = [];

  people.forEach((person) => {
    const userId = person?.userId ?? person?.id;
    if (userId != null && !seen.has(userId)) {
      seen.add(userId);
      storyPeople.push(person);
    }
  });

  return (
    <View style={styles.bar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Story
          person={user}
          own
          hasPrompt={ownHasPrompt}
          onPress={ownHasPrompt ? onOpenOwnStories : onAddStory}
        />
        {storyPeople.map((person) => (
          <Story
            key={person.userId ?? person.id}
            person={person}
            hasUnseen={person.hasUnseen}
            onPress={() => onOpenStories?.(person)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border
  },
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.xs
  },
  story: {
    width: 72,
    alignItems: 'center',
    gap: 6
  },
  storyPressed: {
    opacity: 0.72
  },
  ring: {
    position: 'relative',
    width: 68,
    height: 68,
    padding: 4,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center'
  },
  activeRing: {
    backgroundColor: colors.accent
  },
  ownRing: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface
  },
  plusBadge: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 24,
    height: 24,
    borderWidth: 3,
    borderColor: colors.background,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent
  },
  plusIcon: {
    width: 12,
    height: 12,
    tintColor: '#ffffff'
  },
  label: {
    width: '100%',
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center'
  }
});

export default StoryBar;
