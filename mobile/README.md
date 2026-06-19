# Critic Mobile

Native iOS and Android app for Critic, built with Expo 56.

## Run

```sh
npm install
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080 npm start
```

Expo starts on port `3002` by default. Run the native app with:

```sh
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080 npm run ios
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080 npm run android
```

The app uses React Navigation's native bottom tabs and supports iOS and Android, not web. On iOS 26, Liquid Glass requires a native build compiled with Xcode 26 or newer.

Use a backend or nginx URL the simulator can reach. For a physical phone, use the machine's LAN IP instead of `localhost`.
Android emulator builds also rewrite `localhost` and `127.0.0.1` API URLs to `10.0.2.2` automatically.
For the local Kubernetes backend, run `./port-forward.sh` from the repo root; it exposes `critic-backend-local` on host port `8080`.

Set `EXPO_PUBLIC_APP_PUBLIC_URL` when shared post links should point somewhere other than the current Expo web origin, for example a LAN URL when testing from a phone.

## Checks

```sh
npx expo install --check
npx expo export --platform ios --output-dir dist-check-ios
npx expo export --platform android --output-dir dist-check
```

The app preserves the product behavior of the web app but uses native navigation, headers, controls, gestures, safe areas, and compact phone layouts.
