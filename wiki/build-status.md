# Critic Build Status

This is the planning note for tracking MVP and post-MVP work. Most of `wiki/` stays local-only, but `build-status.md` is tracked in git.

Maintenance rule: keep this page current when features are started, completed, descoped, moved between MVP and post-MVP, or when new to-do items are discovered.

## Current Status

- Local WSL + Docker Desktop Kubernetes development flow is working.
- Backend, frontend, and phone simulator can run locally with Kubernetes port-forwards.
- Mocker verification codes can be read from the mocker API.
- Local login now routes through the mocker backend on `localhost:3001` instead of hitting Twilio.
- Deploying the full stack takes about 5 minutes, so prefer the repo deploy path only when the live image actually needs to change.

## To Do
### P1
- change hover and click of post on desktop to not be bright blue
- add page with directions on how to add site to homepage on iphone.
- Pulling down on mobile doesnt always refresh the page. only if finger is in the top bar labeled "home". if the screen is being dragged and grey at the top is exposed, the screen should refresh.
- Clean up the `users` table so `first_name` and `last_name` are no longer required, and make `username` the required profile field instead. Ensure usernames have to be unique.
- Add a basic censor that stops you from posting slurs
- Add the ability to make your account private so only approved followers can see your posts.
- Update ui to add photos, it should be first and have symbols for upload vs use camera
- Make the stars bigger, nicer, and flashier when rating.
- Add a suggestion box in the bottom-right corner and route it into a suggestion tab where suggestions are rated and sorted by rating.
- Split the feed into two views, one public and one following-only.
- Add a notifications pane for likes, comments, follows, and other activity.
- Resolve the container registry namespace mismatch so Critic backend and mocker images can live under the right owner/repo instead of depending on legacy RateIt image names.
### P2
- There is a delay when loading things that seems unnecessary (alex item)
- Add the ability to tag your own ratings.
- Add videos.
- Fix the re-rate logo/icon. The current cycle icon looks bad.
### P3
- Find a way to categorize ratings.
- Make topics show an overall average rating and a way to view all ratings tied to a topic.
- Add a daily random thing generator to rate.
- Add people-tagging in reviews, including highlighted `@username` mentions and standardized self-references. Example: if OP writes "my waiter" and someone re-rates it, render that context as `OP_username's waiter`; words like `I` and `my` should be highlighted in the same blue style as tagged people.
### P4
- Get the app into the App Store once the sideloadable build path is stable.
- Make the app sideloadable so it can be installed outside the dev workflow.
- Improve the phone-number entry flow for OTP: the current input now uses a country selector plus one autofill-friendly phone field with caret mapping for the formatted phone string, but it still needs the broader international pattern and more complete E.164 handling for non-US numbers.

## Completed

- Local backend startup with Java 25 in WSL.
- Add a post editor, allowing the author to change rating, text of rating, text of topic, and delete the post with tombstoning.
- Enable half-star ratings from `0.5` to `5`.
- Backlog page added at `/backlog`, rendering the `To Do` section of `wiki/build-status.md` as an in-app project board.
- Docker Desktop Kubernetes dependency flow.
- Port-forward setup for Postgres, Redis, MinIO, mocker, and nginx.
- Phone simulator connectivity using the extra mocker API bridge on `localhost:8090`.
- Local troubleshooting wiki.
- Re-rate now creates a new rating row for the same item instead of blocking duplicate author/item ratings.
- Shared `PostActions` component added for like, re-rate, and comment controls.
- Profile pages no longer expose private profile info such as user ID, phone number, role/status, created date, or profile post count metadata.
- Users can follow/unfollow accounts from profile pages and user search.
- Profiles show follower/following counts that open public-safe follower/following list pages.
- User search can find people by username so follows can be started without already knowing a profile URL.
- Local OTP routing now uses the mocker-backed nginx path, and the local upload path allows profile images up to 25 MB.
- Localhost deploy now routes OTP through the mocker backend instead of Twilio, so local testing stays self-contained.
- The phone-number entry flow now uses a country selector plus one autofill-friendly formatted field with caret mapping for the `(   )   -    ` mask.
- The profile button in the top-right menu now opens the signed-in user's real profile page instead of the dead `/profile` fallback.
- The main app shell, feed cards, search forms, profile layouts, and composer controls now adapt to phone-width screens without horizontal page overflow.
- Feed/profile loading now batches rating counts instead of issuing per-item count queries, and the home timeline pages forward instead of refetching the whole list on each scroll step.
- Investigate and fix slow loading paths; common page/data loads that were taking about 3 seconds were improved by batching feed/profile counts and paging the home timeline forward instead of refetching the whole list.
- Real Twilio OTP delivery is wired into the deployed backend profile, while local WSL auth still uses the mocker profile for verification codes.
- The Twilio Verify service friendly name is now set to `Critic`, so outbound OTPs are branded correctly instead of using the sample-test wording.
- Add a refresh feature so the page can be refreshed without relying on the browser chrome; mobile drag-down refresh is now in place.
- Admin posts and comments tables now include a content preview so moderation decisions can be made without opening the row first.
- The admin comments page now has a real backend API for loading, editing, and deleting comments, so the moderation table is no longer pointing at a dead endpoint.
- Admin post removal now preserves comment threads by soft-deleting the rating and rendering deleted posts as `This post has been deleted.` on direct post detail pages.
- Posted photos are clickable and open in a larger full-screen lightbox from the shared post card.
- Profile editor page added at `/profile/edit`; users can update their profile picture from the top-right profile menu.
- Profile picture uploads can be cropped and resized before saving; the editor uploads a 512x512 cropped image.
- Topic metadata now comes from a stable topic lookup, and deleting a rating hard-deletes empty ratings while preserving tombstones only when comments still exist.
- Backlog suggestions now have a submit page, a suggestions table below the backlog board, and an admin moderation page for deleting suggestions.
- The shared star control is now a little larger, uses blue selected stars, and supports sliding across the control on mobile to set a rating.
- Clicking the topic text on a post now opens a linked topic page at `/topics/:rateableItemId` that shows every rating on the same shared topic.
- Topic discussion rows now keep only like, comment, and edit actions, and the bottom of the topic page has a single rating + description composer for adding another rating.
- The topic page now uses a raised summary card for the topic itself, and the summary shows the average star rating plus the raw count of ratings while individual ratings no longer repeat the topic text above each review.
- When a topic has a photo, the image now lives in the raised topic summary card instead of repeating inside each rating row.
- The topic summary stars now render the true average score exactly, rather than snapping the display to a half-star feel.
- The topic page now renders ratings oldest-to-newest so the newest rating sits at the bottom.
- Clicking a post now goes straight to the shared topic page, and the old `/posts/:ratingId` detail page has been removed.
- Improve the star controls on mobile so they are easier to slide across and feel better to use.
- The extra page header bar under the top nav on Home and Create is gone, so those pages now start directly at the content.
