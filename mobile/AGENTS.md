# Mobile Agent Notes

React Native + Expo app for Critic. Root repo instructions still apply.

## Commands

- `npm install`
- `EXPO_PUBLIC_API_BASE_URL=http://localhost:8080 npm start`
- `npm run ios`
- `npm run android`
- `npm run web`
- `npx expo install --check`
- `npx expo export --platform android --output-dir dist-check`

The Expo dev server is pinned to port `3002` in package scripts.

Use a backend URL reachable from the simulator or device. A physical phone usually needs the host machine LAN address instead of `localhost`.

## Conventions

- Keep shared UI in `src/components/`.
- Keep API calls in `src/services/BackendApiService.js`.
- Keep page orchestration in `src/screens/`.
- Reuse `RatingFeedItem`, `PostCard`, `CommentThread`, and composer components for feed-like surfaces.
- Do not change the web `frontend/` package for mobile-only work unless the backend or shared docs require it.
