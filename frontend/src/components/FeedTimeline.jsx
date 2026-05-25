import PostCard from './PostCard.jsx';

const FeedTimeline = ({
    items = [],
    onAuthorClick,
    onPostClick,
    renderFooter,
    renderAfterItem,
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
                    <div key={getItemKey(item)}>
                        <PostCard
                            post={item}
                            onAuthorClick={onAuthorClick}
                            onPostClick={onPostClick}
                            footer={typeof renderFooter === 'function' ? renderFooter(item) : null}
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
