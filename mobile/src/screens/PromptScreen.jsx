import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RatingComposer from '../components/RatingComposer.jsx';
import HandDrawnIcon from '../components/HandDrawnIcon.jsx';
import RichText from '../components/RichText.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import { useResolvedImageUrl } from '../hooks/useResolvedImageUrl.js';
import BackendApiService from '../services/BackendApiService.js';
import { colors, spacing, text } from '../theme.js';

const PHOTO_LAYER = 'linear-gradient(180deg, rgba(9, 13, 22, 0.35) 0%, rgba(9, 13, 22, 0.08) 38%, rgba(9, 13, 22, 0.92) 100%)';
const FALLBACK_LAYER = 'radial-gradient(circle at bottom right, rgba(255, 48, 58, 0.42), transparent 38%), linear-gradient(180deg, #171b24 0%, #090d16 72%)';

const PromptSlide = ({ prompt, width, height }) => {
  const mediaUrl = useResolvedImageUrl(prompt.mediaObjectKey);
  const layer = mediaUrl ? PHOTO_LAYER : FALLBACK_LAYER;
  const layerStyle = Platform.OS === 'web'
    ? { backgroundImage: layer }
    : { experimental_backgroundImage: layer };
  const fallbackStyle = Platform.OS === 'web'
    ? { backgroundImage: FALLBACK_LAYER }
    : { experimental_backgroundImage: FALLBACK_LAYER };

  return (
    <View style={[styles.slide, { width, height }]}>
      <View style={[styles.layer, fallbackStyle]} />
      {mediaUrl ? <Image source={{ uri: mediaUrl }} resizeMode="contain" style={styles.image} /> : null}
      <View style={[styles.layer, layerStyle]} />
    </View>
  );
};

const PromptScreen = ({ navigation, route }) => {
  const { userId, username, own = false } = route.params || {};
  const { notify } = useNotifications();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [prompts, setPrompts] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [score, setScore] = useState(4);
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const activePrompt = prompts[activeIndex];
  const close = () => navigation.canGoBack()
    ? navigation.goBack()
    : navigation.navigate('MainTabs', { screen: 'Home' });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    const request = own ? BackendApiService.getMyRecentPrompts() : BackendApiService.getRecentPrompts(userId);
    request
      .then((items) => {
        if (active) {
          setPrompts(items);
          setActiveIndex(0);
        }
      })
      .catch((error) => {
        const message = error.message || 'Failed to load prompts';
        if (active) {
          setLoadError(message);
          notify({ message, type: 'error' });
        }
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [notify, own, userId]);

  const submit = async () => {
    if (!activePrompt) {
      return;
    }
    setSaving(true);
    try {
      await BackendApiService.rateTopic(activePrompt.id, score, reviewText);
      setReviewText('');
      notify({ message: 'Rating added.', type: 'info' });
      navigation.navigate('Topic', { rateableItemId: activePrompt.id });
    } catch (error) {
      notify({ message: error.message || 'Failed to add rating', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  }

  if (!prompts.length) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.emptyTitle}>{loadError ? 'Could not load prompts' : 'No recent prompts'}</Text>
        <Text style={text.muted}>
          {loadError || `${username || 'This user'} has not posted a prompt in the last 24 hours.`}
        </Text>
        <Pressable onPress={close} style={styles.emptyBack}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <FlatList
        horizontal
        pagingEnabled
        data={prompts}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <PromptSlide prompt={item} width={width} height={height} />}
        onMomentumScrollEnd={({ nativeEvent }) => {
          setActiveIndex(Math.round(nativeEvent.contentOffset.x / width));
          setReviewText('');
        }}
        showsHorizontalScrollIndicator={false}
      />

      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close prompts"
          onPress={close}
          style={[styles.close, { top: insets.top + spacing.sm }]}
        >
          <HandDrawnIcon name="x" color="#ffffff" size={20} />
        </Pressable>
        <View style={styles.heading} pointerEvents="none">
          <RichText style={styles.title}>{activePrompt.body || 'Photo prompt'}</RichText>
          <Text style={styles.byline}>@{activePrompt.authorUsername} · {activeIndex + 1}/{prompts.length}</Text>
        </View>
      </View>

      <View style={[styles.composer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <RatingComposer
          title="Your rating"
          score={score}
          onScoreChange={setScore}
          textValue={reviewText}
          onTextChange={setReviewText}
          placeholder="Add your take"
          submitLabel="Rate prompt"
          onSubmit={submit}
          loading={saving}
          richText
          cardStyle={styles.composerCard}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#090d16' },
  slide: { backgroundColor: '#090d16' },
  image: { width: '100%', height: '100%' },
  layer: { ...StyleSheet.absoluteFillObject },
  top: { position: 'absolute', top: 0, right: 0, left: 0, zIndex: 10, elevation: 10, paddingHorizontal: spacing.lg },
  heading: { paddingTop: spacing.lg, paddingRight: 42, gap: spacing.xs },
  title: { color: '#fff', fontFamily: 'PlayfairDisplay_400Regular', fontSize: 36, lineHeight: 39 },
  byline: { color: '#d4d7df', fontWeight: '700' },
  close: { position: 'absolute', top: 0, right: spacing.lg, zIndex: 2, width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  composer: { position: 'absolute', right: spacing.md, bottom: 0, left: spacing.md },
  composerCard: { borderColor: 'rgba(255,255,255,0.38)', backgroundColor: 'rgba(20,20,24,0.94)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md, backgroundColor: '#090d16' },
  emptyTitle: { ...text.h2, color: '#fff' },
  emptyBack: { marginTop: spacing.md, borderWidth: 1, borderColor: '#fff', borderRadius: 8, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  backText: { color: '#fff', fontWeight: '800' }
});

export default PromptScreen;
