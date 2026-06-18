import PostCard from './PostCard.jsx';

const FeedTimeline = ({
    items = [],
    onAuthorClick,
    onPostClick,
    onTopicClick,
    onItemClick,
    showTopicText = true,
    showMedia = true,
    renderFooter,
    renderAfterItem,
    renderExpandedContent,
    getItemClassName,
    getItemKey = (item) => item.ratingId,
    sentinelRef,
    hasMore = true,
    isLoadingMore = false,
    loadingMoreMessage = 'Loading more...',
    endMessage = '',
    className = 'timeline'
}) => {
    if (!items.length) {
        return null;
    }

    return (
        <>
            <section className={className} aria-label="Recent ratings">
                {items.map((item) => (
                    <div key={getItemKey(item)} id={`rating-${getItemKey(item)}`}>
                        <PostCard
                            post={item}
                            onAuthorClick={onAuthorClick}
                            onPostClick={onPostClick}
                            onTopicClick={onTopicClick}
                            onCardClick={typeof onItemClick === 'function' ? () => onItemClick(item) : undefined}
                            showTopicText={showTopicText}
                            showMedia={showMedia}
                            className={typeof getItemClassName === 'function' ? getItemClassName(item) : ''}
                            footer={typeof renderFooter === 'function' ? renderFooter(item) : null}
                            expandedContent={typeof renderExpandedContent === 'function' ? renderExpandedContent(item) : null}
                        />
                        {typeof renderAfterItem === 'function' ? renderAfterItem(item) : null}
                    </div>
                ))}
            </section>

            {sentinelRef && <div ref={sentinelRef} className="feed-sentinel" aria-hidden="true" />}
            {isLoadingMore && <p className="feed-status">{loadingMoreMessage}</p>}
            {!hasMore && endMessage && <p className="feed-end-message">{endMessage}</p>}
        </>
    );
};

export default FeedTimeline;
