alter table rateable_items
    drop constraint if exists rateable_items_item_type_check;

alter table rateable_items
    add constraint rateable_items_item_type_check
    check (item_type in ('PHOTO', 'TEXT_POST', 'PROMPT', 'EXTERNAL_REVIEW', 'RATING'));
