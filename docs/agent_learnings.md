# Agent Learnings

This file is a running record of repeatable implementation lessons, invariants, and repo-specific pitfalls that future agents should keep in mind.

## What Belongs Here

Add an entry when you learn something that is likely to matter again later, such as:

- a recurring integration pitfall
- a schema or payload compatibility rule
- a shared component convention that should not be broken
- a backend/frontend mismatch that caused an avoidable failure
- a test or build expectation that future changes should preserve

Do not use this file for:

- one-off bug tickets
- minor styling changes
- transient implementation noise

## Current Learnings

### Shared UI

- Reuse existing shared components before creating page-specific copies for feed, post, comment, avatar, modal, notification, or admin grid UI.
- The home feed and profile feed should stay visually aligned and should share the same backing rendering path when possible.
- Use `sx` for MUI layout styling unless the component API clearly expects a different prop.
- Mobile hand-drawn icons are 72px PNG assets rendered through `HandDrawnIcon` at 24px, avoiding an SVG runtime and Metro transformer.
- Native tab icons use 24px base images with `@2x` and `@3x` variants; passing the 72px content assets directly makes iOS render them at 72pt.
- The Expo 56 app supports iOS, Android, and mobile web; native bottom tabs require `react-native-screens` 4.25+, web selects JavaScript bottom tabs, and Liquid Glass appears on iOS 26 only when compiled with Xcode 26+.
- Android emulators reach services on the development host through `10.0.2.2`, not `localhost`; mobile config rewrites loopback API URLs automatically on Android.
- Backend CORS allows credentialed development origins on any `localhost` or `127.0.0.1` port, but must continue rejecting remote origins.
- `port-forward.sh` must leave an existing source backend as the sole owner of port `8080`; forwarding `critic-backend-local` there at the same time makes simulator routing inconsistent.
- Mobile paginated feeds use one measured scroll-end trigger, synchronously lock load-more requests, and merge by `ratingId`; combining it with FlatList's native end trigger causes runaway pagination.

### Admin

- Keep admin delete flows separate from user-facing delete behavior.
- Any new admin table should use the shared admin grid wrapper so alignment and selection stay consistent.
- Any new admin job type must update the enum, schema constraint, service dispatch, controller, UI, and docs together.
- Comment moderation needs subtree-aware deletion; deleting a parent comment should delete all nested replies before removing the parent row.
- Admin post removal is a rating tombstone, not a hard post/comment delete; preserve comment threads and render deleted posts as placeholders on direct post detail routes.

### Backend JSON and time types

- If a custom `ObjectMapper` is introduced, it must register modules so Java time types like `Instant` round-trip correctly.
- Job payload/result JSON should be backward-compatible enough that older queued jobs can still be opened in the UI.
- Spring Boot devtools restarts when compiled classpath files change, so command-line backend hot reload should use `backend/scripts/dev.sh` to recompile changed sources/resources.

### Auth and roles

- `ROLE_ADMIN` is the backend authorization guard for admin APIs.
- `ROLE_TEST_USER` is reserved for synthetic accounts and test-user OTP bypass behavior.
- User role state lives on the `users` row and must stay consistent with JWT/session handling.
- The live `users` table still requires legacy `first_name` and `last_name` columns, so create/update flows must populate them even though the UI is username-first.
- Authenticated users without a profile should be allowed to stay on the login route long enough to finish inline profile setup; do not force them back to the homepage before the username/photo form renders.
- After OTP verification, give `/api/users/me` a short retry window before concluding that the user has no profile; the first authenticated lookup can arrive before the session is fully settled and can otherwise flash the account-setup form for an existing user.
- Phone-number auth lookups should tolerate legacy formatting drift in stored rows; use a fallback that matches the digits-only form so existing users are not misclassified as brand new accounts.
- If the source backend fails with Postgres `28P01` after a rename or secret change, check ignored `backend/.env` against `rateit-chart/values.secret.yaml`; stale local passwords keep Spring from staying up on `8080`.

### Twilio Verify

- The branding in Twilio Verify OTP text comes from the Verify service `friendlyName`, not from the app's OTP request payload.
- Use the Verify service API directly for OTP delivery; do not wire the app to a separate Messaging Service sender pool for this flow.

### Single-node hosting

- For a cheap one-node remote deployment, disable `localBackend`, `mocker`, ingress controllers, metrics sidecars, `kafka`, `prometheus`, and `grafana`; expose the app nginx service directly with one cloud `LoadBalancer`.

### Helm chart

- `helm dependency update` refreshes every range-pinned dependency in `rateit-chart/Chart.lock`, so adding one chart can also bump other lockfile versions.
- `helm lint rateit-chart` needs `rateit-chart/values.secret.yaml`; `templates/secrets.yaml` dereferences secret values directly.

### Images and mobile web

- Never fall back to uploading the original asset when a resize fails; a silent fallback is how multi-megabyte camera originals became profile pictures, and rendering ~18 of them at once in the tourney player picker decoded to ~160 MB of bitmap and got the tab killed by mobile Safari. Fail loudly instead.
- CSS/`style` dimensions do not bound image decode cost: a 12 MP JPEG costs ~48 MB of bitmap even when painted as a 32px avatar. Downscale at upload, and virtualize any list that renders many avatars.
- `expo-image-manipulator` is unreliable on web; the web build resizes with a canvas instead (see `src/utils/imageUpload.js`).
- Object keys containing spaces return 400 through the app nginx (they resolve fine straight from Spaces), so sanitize upload filenames.

### Client error reporting

- Metro only resolves platform variants (`Foo.web.js`) when the import has **no** file extension. This repo otherwise imports with explicit extensions, so a `Foo.js` import silently bundles the native stub into web — which quietly disabled Sentry until caught by grepping the built bundle.
- `EXPO_PUBLIC_*` vars are inlined at Metro transform time, and a stale Metro cache will ship a bundle built against an older `.env` — changing `.env` alone is not enough. `mobile/scripts/deploy.sh` passes `--clear` and then greps the bundle for the DSN, because a DSN-less bundle looks perfectly healthy and reports nothing.
- Sentry catches JavaScript exceptions only. It cannot report a tab that mobile Safari kills under memory pressure, so silence after a reported crash is evidence *for* an OOM, not against a bug.

### Working against the deployed cluster

- Check `git fetch && git status` before reasoning about infrastructure. A stale checkout makes the running cluster look inexplicable (missing MinIO, an empty `critic` database, "undocumented" Spaces hosting were all just unpulled commits) and building the web bundle from a stale tree silently reverts production to old code.

## How To Update

When you discover a reusable lesson during implementation, add it here and keep it short. Prefer a single sentence that captures the invariant or pitfall.
