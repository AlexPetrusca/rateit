alter table ratings
    drop constraint if exists uk_ratings_author_rateable_item;
