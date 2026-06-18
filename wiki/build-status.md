# Critic Build Status

This is the planning note for tracking MVP and post-MVP work. Most of `wiki/` stays local-only, but `build-status.md` is tracked in git.

Maintenance rule: keep this page current when features are started, completed, descoped, moved between MVP and post-MVP, or when new to-do items are discovered.

## Current Status

- Local WSL + Docker Desktop Kubernetes development flow is working.
- Backend, frontend, and phone simulator can run locally with Kubernetes port-forwards.
- Local backend auto-refresh is available with `cd backend && ./scripts/dev.sh`; the script recompiles changed Java/resources so Spring Boot devtools restarts the running app.
- Mocker verification codes can be read from the mocker API.
- Local login now routes through the mocker backend on `localhost:3001` instead of hitting Twilio.
- Deploying the full stack takes about 5 minutes, so prefer the repo deploy path only when the live image actually needs to change.

## To Do
### P1
- Need to spend time on the search function.
- Loading is ugly everywhere, will need to do a visual overhaul
- instead of showing ratings with no text, those should just be accessible by tapping the avg star rating on the topic. no need to create cards for every empty rating
- Dark mode/light mode switcher
- Need ability to share link to profile
- OP should be able to add multiple photos to a topic
- Add filter for profile pages to order by date or review
- everyones a critic as refresh indicator
- Add profile pic sizing to create account page
- Need the ability to @people in posts
- Pulling down on mobile doesnt always refresh the page. only if finger is in the top bar labeled "home". if the screen is being dragged and grey at the top is exposed, the screen should refresh.
- Clean up the `users` table so `first_name` and `last_name` are no longer required, and make `username` the required profile field instead. Ensure usernames have to be unique.
- Add a basic censor that stops you from posting slurs
- Add ability to edit topics
- Add the ability to make your account private so only approved followers can see your posts.
- Make the stars bigger, nicer, and flashier when rating.
- Add a notifications pane for likes, comments, follows, and other activity.
- Resolve the container registry namespace mismatch so Critic backend and mocker images can live under the right owner/repo instead of depending on legacy RateIt image names.
- Set up DNS so critic-app.com and www.critic-app.com redirect to app.critic-app.com. Needs A/ALIAS/CNAME records at the registrar pointing to the same load balancer IP as app.critic-app.com, plus an nginx server block and ingress hosts entry for the bare domain.
### P2
- have enter button on home page live in the bottom left
- There is a delay when loading things that seems unnecessary (alex item)
- Add the ability to tag your own ratings.
- Add videos.
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

- Added a single-node remote deployment preset that disables the local-only mocker backend, ingress controller, metrics sidecars, and heavier observability workloads so the app can fit on a small remote node.
- Local backend startup with Java 25 in WSL.
- The create-account setup now expands inline on the login page after OTP verification instead of sending verified users to a separate handoff screen.
- Add a post editor, allowing the author to change rating, text of rating, text of topic, and delete the post with tombstoning.
- Enable half-star ratings from `0.5` to `5`.
- Backlog page added at `/backlog`, rendering the `To Do` section of `wiki/build-status.md` as an in-app project board.
- Docker Desktop Kubernetes dependency flow.
- Photo topic hero image blur now increases as the page scrolls down and relaxes again when scrolling back up.
- Photo topic title and rating metadata now blur along with the hero image during scroll.
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
- Topic rating cards now expand inline when clicked or when their comment action is toggled, loading the shared comment thread and comment composer inside the card instead of showing every thread by default.
- Topics without a photo now reuse the same fixed hero layout as photo-backed topics, with a black background fallback instead of a separate summary card.
- Topics without a photo now reuse the same dark topic thread and composer card styling as photo-backed topics, so nested replies and the reply box no longer fall back to the white feed-composer look.
- Topics without a photo now also use the same scroll-driven blur effect, but over an abstract red-tinted gradient background instead of image artwork.
- Topic pages now reset to the top on entry so the fixed hero starts crisp and only blurs after the user scrolls.
- Expanded topic rating cards now own their rating-level comment composer, while the bottom topic composer stays focused on adding another rating.
- Comment composers on threaded replies now anchor to the clicked comment itself, so the box sits directly under the comment being discussed and before that comment's child replies.
- Comment rows now have like/comment/edit controls too, so replies behave like first-class ratings instead of being limited to a single reply action.
- Home, profile, and topic pages now render the same expanded comment-card layout, with the comment icon toggling the thread and the arrow icon opening the reply composer.
- When a topic has a photo, the image now lives in the raised topic summary card instead of repeating inside each rating row.
- The topic summary stars now render the true average score exactly, rather than snapping the display to a half-star feel.
- The topic page now renders ratings oldest-to-newest so the newest rating sits at the bottom.
- Clicking a post now goes straight to the shared topic page, and the old `/posts/:ratingId` detail page has been removed.
- Improve the star controls on mobile so they are easier to slide across and feel better to use.
- The extra page header bar under the top nav on Home and Create is gone, so those pages now start directly at the content.
- Added a public iPhone install page at `/install` with directions for adding Critic to the home screen.
- The top bar now uses a hamburger menu for Home, Backlog, Install, and Login for signed-out users, and Home, Backlog, Install, and Admin for signed-in admins, leaving only Create and the profile avatar visible on the right when signed in.
- Desktop post cards no longer flash bright blue on hover or click.
- Desktop topic labels no longer change color, underline, or flash a blue background on hover.
- The logged-out entry path now sends `/` directly to `/login`, hides the top bar on the login page, and uses a layered full-screen DM Sans `EVERYONES A CRITIC` background with an overlaid phone-entry field, clickable flag/country-code picker, visible phone-field caret, automatic OTP send after a complete 10-digit number, and an in-place verification-code field.
- Shared comment, rating composer, admin selection toolbar, rating display, timestamp, and text truncation helpers now replace duplicated UI/helper code across feed, topic, profile, and admin pages.
- Feed is split into two views: a public home feed and a following-only feed, selectable via the bottom nav.
- The bottom nav bar uses a hand-drawn SVG icon pack with a user-selectable fallback to MUI icons, persisted in localStorage and settable in the profile editor.
- Photo upload UI on the Create page now uses camera and upload icon buttons instead of a plain file input; the photo section is first in the form.
- Rich text composer supports bold, italic, underline, links, and combined bold+italic (`_**word**_`); bold text renders in primary color in dark mode.
- Textareas in all composers auto-expand as content grows.
- Draft saving is fully backed by the database: drafts are stored as `DRAFT`-status ratings, listed on a dedicated Drafts page, and published on submit; back/draft/submit buttons sit at the bottom of the Create page with double-click protection.
- Tapping a review card on a topic page opens it fullscreen for easier reading on narrow screens.
- Submitting a post or deleting a draft is protected against double-clicks by disabling the action button while the request is in flight.
- Topic, profile, and home composers now each have a back button that closes the composer and a checkmark button that submits, replacing the old labeled submit buttons.
- Make topic page full image with scroll-driven blur; ratings and comments scroll beneath the fixed hero.
- Added a separate Expo React Native app under `mobile/` with native screens for login/account setup, feed, create, profile, search, follow lists, topic, post editing, backlog/suggestions, install info, and admin moderation/automation.
- Mobile app styling now follows the current frontend shell more closely: dark theme tokens, floating bottom nav, shared feed cards/comments, following feed, drafts, rich-text rendering, compact profile banner, and topic hero/rating stack layout.
- Mobile topic screen now mirrors the frontend topic layout with a fixed full-screen background image, scroll-driven blur, raised narrow rating cards, and matching topic composer treatment.
