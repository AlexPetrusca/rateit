import { useState } from 'react';
import { View } from 'react-native';
import CommentComposer from './CommentComposer.jsx';
import CommentThread from './CommentThread.jsx';
import PostActions from './PostActions.jsx';
import PostCard from './PostCard.jsx';
import RatingComposer from './RatingComposer.jsx';
import EmptyState from './EmptyState.jsx';
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
  cardStyle
}) => {
  const [activeEditKey, setActiveEditKey] = useState(null);
  const [editDrafts, setEditDrafts] = useState({});
  const comments = interactions.commentsByRating[item.ratingId] || [];
  const isCommentsOpen = interactions.expandedRatings.includes(item.ratingId);
  const rootComposerKey = interactions.getComposerKey(item.ratingId, 'comment');
  const isRootComposerOpen = interactions.activeComposer === rootComposerKey;
  const rerateKey = interactions.getComposerKey(item.ratingId, 'rerate');
  const canEdit = item.author?.userId != null && currentUserId != null && item.author.userId === currentUserId && !item.deleted && !item.deletedAt;

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

  const expandedContent = isCommentsOpen ? (
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
          }}
          expandedReplyKeys={interactions.expandedReplyKeys}
          onToggleReplies={interactions.toggleReplies}
        />
      ) : !isRootComposerOpen ? (
        <EmptyState title="No comments yet." />
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
            commentCount={item.commentCount}
            onLike={() => interactions.toggleLike(item)}
            onRerate={() => interactions.toggleRerateComposer(item)}
            onComment={() => interactions.toggleComments(item.ratingId)}
            onReply={() => interactions.openCommentComposer(item.ratingId)}
            onEdit={canEdit ? () => onEditPress?.(item.ratingId) : undefined}
            shareUrl={shareUrl}
            commentLabel={isCommentsOpen ? 'Hide comments' : 'Comments'}
            replyLabel="Reply"
          />
        )}
        expandedContent={expandedContent}
      />
      {rerateComposer ? <View style={{ marginTop: 16 }}>{rerateComposer}</View> : null}
    </View>
  );
};

export default RatingFeedItem;
