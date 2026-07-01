import { memo, useState } from 'react';
import { View } from 'react-native';
import CommentComposer from './CommentComposer.jsx';
import CommentThread from './CommentThread.jsx';
import PostActions from './PostActions.jsx';
import PostCard from './PostCard.jsx';
import RatingComposer from './RatingComposer.jsx';
import BackendApiService from '../services/BackendApiService.js';

const RatingFeedItem = ({
  item,
  currentUserId,
  interactions,
  onAuthorPress,
  onTopicPress,
  onCardPress,
  onEditPress,
  shareUrl,
  refresh,
  showMedia = true,
  showTopicText = true,
  reviewNumberOfLines,
  openCardOnlyWhenTruncated = false,
  showReply = false,
  commentOpensRerate = false,
  onCommentOpen,
  commentNumberOfLines,
  renderTopicRatings,
  cardStyle
}) => {
  const [activeEditKey, setActiveEditKey] = useState(null);
  const [editDrafts, setEditDrafts] = useState({});
  const [showTopicRatings, setShowTopicRatings] = useState(false);
  // Topic fan-out mode: the bubble shows the topic's rating count and expands to
  // all ratings on the topic instead of this rating's comments.
  const topicFanOut = Boolean(renderTopicRatings);
  const comments = interactions.commentsByRating[item.ratingId] || [];
  const isCommentsOpen = interactions.expandedRatings.includes(item.ratingId);
  const rootComposerKey = interactions.getComposerKey(item.ratingId, 'comment');
  const isRootComposerOpen = interactions.activeComposer === rootComposerKey;
  const rerateKey = interactions.getComposerKey(item.ratingId, 'rerate');
  const canEdit = item.author?.userId != null && currentUserId != null && item.author.userId === currentUserId && !item.deleted && !item.deletedAt;

  const toggleComments = () => {
    if (isCommentsOpen) {
      interactions.toggleComments(item.ratingId);
      if (interactions.activeComposer?.startsWith(`${item.ratingId}:comment`)) {
        interactions.setActiveComposer(null);
      }
      return;
    }
    interactions.openCommentComposer(item.ratingId);
  };

  const renderCommentComposer = (parentCommentId = null) => {
    const draft = interactions.getDraft(item.ratingId, parentCommentId);
    return (
      <CommentComposer
        nested={parentCommentId != null}
        score={Number(draft.score || 2.5)}
        onScoreChange={(score) => interactions.updateDraft(item.ratingId, parentCommentId, { score: String(score) })}
        text={draft.text}
        onTextChange={(text) => interactions.updateDraft(item.ratingId, parentCommentId, { text })}
        onSubmit={() => interactions.submitComment(item, parentCommentId).catch((error) => {
          interactions.notify?.({ message: error.message, type: 'error' });
        })}
      />
    );
  };

  const renderEditComposer = (comment) => {
    const editKey = `edit:${comment.id}`;
    const draft = editDrafts[editKey] || {
      text: comment.text || '',
      score: String(comment.score || 2.5)
    };

    return (
      <RatingComposer
        title="Edit comment"
        score={Number(draft.score)}
        onScoreChange={(score) => setEditDrafts((current) => ({
          ...current,
          [editKey]: { ...draft, score: String(score) }
        }))}
        textValue={draft.text}
        onTextChange={(text) => setEditDrafts((current) => ({
          ...current,
          [editKey]: { ...draft, text }
        }))}
        submitLabel="Save"
        multilineLabel="Comment"
        richText
        onSubmit={async () => {
          try {
            await BackendApiService.updateRatingComment(comment.id, draft.text, Number(draft.score));
            await interactions.loadComments(item.ratingId, true);
            setActiveEditKey(null);
          } catch (error) {
            interactions.notify?.({ message: error.message || 'Failed to edit comment', type: 'error' });
          }
        }}
      />
    );
  };

  const topicFanOutContent = topicFanOut && showTopicRatings ? renderTopicRatings(item) : null;

  const expandedContent = isCommentsOpen && (comments.length > 0 || isRootComposerOpen) ? (
    <View style={{ gap: 8 }}>
      {comments.length > 0 ? (
        <CommentThread
          comments={comments}
          currentUserId={currentUserId}
          onAuthorPress={onAuthorPress}
          onLikePress={async (comment) => {
            try {
              if (comment.likedByCurrentUser) {
                await BackendApiService.unlikeComment(comment.id);
              } else {
                await BackendApiService.likeComment(comment.id);
              }
              await interactions.loadComments(item.ratingId, true);
            } catch (error) {
              interactions.notify?.({ message: error.message || 'Failed to like comment', type: 'error' });
            }
          }}
          onReplyPress={(comment) => {
            const replyKey = interactions.getReplyKey(item.ratingId, comment.id);
            interactions.setActiveComposer(interactions.activeComposer === replyKey ? rootComposerKey : replyKey);
            setActiveEditKey(null);
          }}
          activeReplyKey={interactions.activeComposer}
          activeEditKey={activeEditKey}
          getReplyKey={(comment) => interactions.getReplyKey(item.ratingId, comment.id)}
          getEditKey={(comment) => `edit:${comment.id}`}
          renderReplyComposer={(comment) => renderCommentComposer(comment.id)}
          renderEditComposer={renderEditComposer}
          onEditPress={(comment) => {
            const editKey = `edit:${comment.id}`;
            setEditDrafts((current) => ({
              ...current,
              [editKey]: current[editKey] || { text: comment.text || '', score: String(comment.score || 2.5) }
            }));
            setActiveEditKey((current) => (current === editKey ? null : editKey));
            interactions.setActiveComposer(null);
          }}
          expandedReplyKeys={interactions.expandedReplyKeys}
          onToggleReplies={interactions.toggleReplies}
          onCommentPress={onCommentOpen ? (comment) => onCommentOpen(item, comment) : undefined}
          commentNumberOfLines={commentNumberOfLines}
        />
      ) : null}
      {isRootComposerOpen ? renderCommentComposer() : null}
    </View>
  ) : null;

  const rerateComposer = interactions.activeComposer === rerateKey ? (
    <RatingComposer
      title="Re-rate"
      score={Number(interactions.rerateDrafts[item.ratingId]?.score || item.score || 4)}
      onScoreChange={(score) => interactions.setRerateDrafts((current) => ({
        ...current,
        [item.ratingId]: { ...current[item.ratingId], score: String(score) }
      }))}
      textValue={interactions.rerateDrafts[item.ratingId]?.reviewText || ''}
      onTextChange={(reviewText) => interactions.setRerateDrafts((current) => ({
        ...current,
        [item.ratingId]: { ...current[item.ratingId], reviewText }
      }))}
      submitLabel="Re-rate"
      showStars
      onSubmit={() => interactions.submitRerate(item.ratingId, refresh).catch((error) => {
        interactions.notify?.({ message: error.message, type: 'error' });
      })}
    />
  ) : null;

  return (
    <View>
      <PostCard
        post={item}
        onAuthorPress={onAuthorPress}
        onTopicPress={onTopicPress}
        onCardPress={onCardPress}
        showMedia={showMedia}
        showTopicText={showTopicText}
        reviewNumberOfLines={reviewNumberOfLines}
        openCardOnlyWhenTruncated={openCardOnlyWhenTruncated}
        style={cardStyle}
        actions={(
          <PostActions
            liked={item.likedByCurrentUser}
            likeCount={item.likeCount}
            commentCount={topicFanOut ? (item.rateableItem?.ratingCount ?? item.commentCount) : item.commentCount}
            onLike={() => interactions.toggleLike(item)}
            onRerate={() => interactions.toggleRerateComposer(item)}
            onComment={topicFanOut
              ? () => setShowTopicRatings((open) => !open)
              : commentOpensRerate ? () => interactions.toggleRerateComposer(item) : toggleComments}
            onReply={showReply ? () => interactions.openCommentComposer(item.ratingId) : undefined}
            onEdit={canEdit ? () => onEditPress?.(item.ratingId) : undefined}
            shareUrl={shareUrl}
            commentLabel={topicFanOut
              ? (showTopicRatings ? 'Hide ratings' : 'Ratings')
              : (isCommentsOpen ? 'Hide comments' : 'Comments')}
            replyLabel="Reply"
          />
        )}
        expandedContent={topicFanOut ? topicFanOutContent : expandedContent}
      />
      {rerateComposer ? <View style={{ marginTop: 16 }}>{rerateComposer}</View> : null}
    </View>
  );
};

// The feed re-renders its parent on every pagination tick (and on any shared
// interaction-state change), which would otherwise rebuild every visible card's
// DOM subtree — the dominant cost when scrolling. Skip a card's re-render unless
// its own data or the interaction state that actually affects it has changed.
// Function props (navigation callbacks) are treated as stable and ignored.
// Fingerprint of all comment/reply draft state belonging to this rating, so the
// card re-renders as the user types in its comment composer (its draft lives in
// shared interaction state, not local). Keys are `${ratingId}:comment[:commentId]`.
const draftsForItem = (interactions, ratingId) => {
  const drafts = interactions.commentDrafts;
  if (!drafts) return '';
  const prefix = `${ratingId}:`;
  return Object.keys(drafts)
    .filter((k) => k.startsWith(prefix))
    .sort()
    .map((k) => `${k}~${drafts[k].text}~${drafts[k].score}`)
    .join('|');
};

const interactionRelevantToItem = (interactions, ratingId) => ({
  comments: interactions.commentsByRating[ratingId],
  expanded: interactions.expandedRatings.includes(ratingId),
  rerate: interactions.rerateDrafts[ratingId],
  drafts: draftsForItem(interactions, ratingId),
  // activeComposer only affects this card when it targets this rating.
  composer: interactions.activeComposer && String(interactions.activeComposer).startsWith(`${ratingId}:`)
    ? interactions.activeComposer
    : null,
  // expandedReplyKeys only matters while this card's comments are open.
  replies: interactions.expandedRatings.includes(ratingId) ? interactions.expandedReplyKeys : null
});

const areEqual = (prev, next) => {
  if (
    prev.item !== next.item
    || prev.currentUserId !== next.currentUserId
    || prev.commentOpensRerate !== next.commentOpensRerate
    || prev.showReply !== next.showReply
    || prev.reviewNumberOfLines !== next.reviewNumberOfLines
    || prev.shareUrl !== next.shareUrl
  ) {
    return false;
  }
  const id = prev.item.ratingId;
  const a = interactionRelevantToItem(prev.interactions, id);
  const b = interactionRelevantToItem(next.interactions, id);
  return a.comments === b.comments
    && a.expanded === b.expanded
    && a.rerate === b.rerate
    && a.drafts === b.drafts
    && a.composer === b.composer
    && a.replies === b.replies;
};

export default memo(RatingFeedItem, areEqual);
