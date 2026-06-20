import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import UserAvatar from './UserAvatar.jsx';
import { colors, spacing } from '../theme.js';

const STORY_RING = 'linear-gradient(135deg, #ffb020 0%, #ff3b45 48%, #d72b91 100%)';

const Story = ({ person, own = false, onPress, onAddStory }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={own ? 'Create prompt' : `Open ${person?.username || 'user'} prompts`}
    onPress={onPress}
    style={({ pressed }) => [styles.story, pressed && styles.storyPressed]}
  >
    <View style={[
      styles.ring,
      own ? styles.ownRing : styles.activeRing,
      !own && (Platform.OS === 'web'
        ? { backgroundImage: STORY_RING }
        : { experimental_backgroundImage: STORY_RING })
    ]}>
      <UserAvatar username={person?.username} profilePicUrl={person?.profilePicUrl} size={60} />
      {own ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create prompt"
          hitSlop={6}
          onPress={(event) => {
            event.stopPropagation();
            onAddStory?.();
          }}
          style={styles.plusBadge}
        >
          <Text style={styles.plus}>+</Text>
        </Pressable>
      ) : null}
    </View>
    <Text numberOfLines={1} style={styles.label}>{own ? 'Your story' : person?.username}</Text>
  </Pressable>
);

const StoryBar = ({ user, people = [], items = [], onAddStory, onOpenStories, onOpenOwnStories }) => {
  const currentUserId = user?.userId ?? user?.id;
  const seen = new Set([currentUserId]);
  const storyPeople = [];

  [...people, ...items.map((item) => item.author)].forEach((person) => {
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
          onAddStory={onAddStory}
          onPress={onOpenOwnStories}
        />
        {storyPeople.map((person) => (
          <Story
            key={person.userId ?? person.id}
            person={person}
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
  plus: {
    color: '#ffffff',
    fontSize: 19,
    lineHeight: 19,
    fontWeight: '800'
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
