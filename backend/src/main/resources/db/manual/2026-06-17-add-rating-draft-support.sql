-- Allow NULL rateable_item_id and score for DRAFT ratings
alter table ratings alter column rateable_item_id drop not null;
alter table ratings alter column score drop not null;

-- Status: DRAFT or PUBLISHED (existing rows are published)
alter table ratings add column status varchar(20) not null default 'PUBLISHED';

-- Draft-specific fields (populated before rateableItem/mediaAsset are created)
alter table ratings add column draft_body text;
alter table ratings add column draft_media_key varchar(500);
alter table ratings add column draft_media_type varchar(100);
