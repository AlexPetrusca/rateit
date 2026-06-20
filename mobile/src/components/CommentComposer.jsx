import RatingComposer from './RatingComposer.jsx';

const CommentComposer = ({
  score,
  onScoreChange,
  text,
  onTextChange,
  onSubmit,
  loading,
  nested = false
}) => (
  <RatingComposer
    title={nested ? 'Reply rating' : 'Your rating'}
    score={score}
    onScoreChange={onScoreChange}
    textValue={text}
    onTextChange={onTextChange}
    placeholder={nested ? 'Reply in thread' : 'Add your take on this take'}
    submitLabel="Reply"
    onSubmit={onSubmit}
    loading={loading}
    multilineLabel="Comment"
    richText
  />
);

export default CommentComposer;
