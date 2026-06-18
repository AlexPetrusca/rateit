# Critic Mobile

React Native mobile app for Critic, built with Expo.

## Run

```sh
npm install
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080 npm start
```

Expo starts on port `3002` by default for this package. For web testing, use:

```sh
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080 npm run web
```

Then open `http://localhost:3002`.

Use a backend or nginx URL the simulator can reach. For a physical phone, use the machine's LAN IP instead of `localhost`.

If the browser origin still shows `http://localhost:8081`, stop the old Expo process and restart `npm run web`; the package scripts pin Expo to `3002`.

## Checks

```sh
npx expo install --check
npx expo export --platform android --output-dir dist-check
```

The app keeps the web product surface but uses native card/list/form layouts instead of desktop tables and browser-specific UI.
