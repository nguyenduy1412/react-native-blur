# Changelog

All notable changes to `@nguyenduy1412/react-native-blur` are listed here. The project follows [Semantic Versioning](https://semver.org).

## 2.1.0 (2026-10-08)

### Features

- Backdrop mode works inside React Native `<Modal>` on Android. The screen behind the modal window is copied with `PixelCopy` and blurred, as on iOS.
- Per-corner radii: `borderTopLeftRadius`, `borderTopStartRadius` and the other corner styles clip the blur, tint and glass rim.
- `tintColor` accepts any React Native colour (`ColorValue`): `rgba()`, `#RRGGBBAA`, named colours and `PlatformColor`.
- `BlurView` forwards its ref to the native view, so `intensity` can be animated with Reanimated (`Animated.createAnimatedComponent` + `useAnimatedProps`) on the UI thread.
- Android 11 and below draw a translucent plate in the material's colour instead of an almost invisible overlay.
- Android: backdrop mode blurs a `SurfaceView` behind it (video players such as `react-native-video` and `expo-video`, maps). Its frames are copied with `PixelCopy` while it is on screen.
- Android: `BlurView` can be used from native code (non-exact measure specs no longer throw; native children fill the view).

- `syncVideo` prop (Android, default `true`): choose between keeping backdrop blur over a `SurfaceView` video in sync with it, or keeping the live video and a lighter quarter-size copy.

### Bug fixes

- Android 12 (API 31-32): the backdrop froze while content behind it scrolled. Android 12 kept the blurred layer of a reused `RenderNode`; a fresh node is used per frame there.
- Android: materials now follow `Appearance.setColorScheme` overrides and light/dark switches while the app is running.
- Android: changing `tint`, `blurRadius` or `saturation` in backdrop mode redraws immediately.
- Android: `#RRGGBBAA` colours were read as `#AARRGGBB`.
- Android 12 (API 31-32): content mode around a playing video showed black. Hiding the SurfaceView also hid the blurred copy drawn over it, so the SurfaceView stays visible there, and the content is recorded into a fresh `RenderNode` per frame so the blur follows the video.
- Android: backdrop blur over a `SurfaceView` no longer lags the sharp video around it. A full-size copy covers the live video, so both come from the same frame.
- Android: the blurred copy of a video trails it by less. Copies start again as soon as the previous one lands (no fixed 30 fps timer), and one copy of a `SurfaceView` is shared by every `BlurView` that blurs it instead of each waiting its turn.
- Android: a failed `PixelCopy` request no longer leaves a video copy stuck.
- Android 12: the copy that covers a `SurfaceView` is half size (a full-size copy took ~48 ms on API 31 against ~27 ms on API 37), and copies are uploaded to the GPU as soon as they arrive.
- Android 11 and below: the fallback plate stays at least half opaque at low `intensity`, so text over it stays readable.
- Android: video copies no longer block the UI thread. Up to Android 13 `PixelCopy.request` copied synchronously on the calling thread (9-27 ms per copy on API 31); copies now run on a background thread.
- Android: a copy that is identical to the one on screen (paused video, or a video slower than the copies) is dropped without uploading or redrawing, and the next copy waits a frame.
- Android: screens with many backdrop `BlurView`s froze (seconds per frame). Nested backdrop captures no longer re-capture their own backdrop, and only on-screen `BlurView`s re-capture every frame.
- iOS: `tintColor` values such as `rgba(...)` and named colours were ignored; only `#RRGGBB` worked.
- iOS: the blur effect is rebuilt when the view re-enters a window or the app returns to the foreground, so `intensity` stays consistent after navigation.
- iOS: the glass rim is hidden at `intensity={0}`.

### Other

- Example app in `example/` (React Native CLI 0.86, Reanimated) covering every case above.

## 2.0.3 (2026-10-07)

### Documentation

- Add a static documentation site at https://nguyenduy1412.github.io/react-native-blur/ with guides for frosted headers and tab bars, Android video blur, blurred modal backgrounds, and a comparison with expo-blur.
- Add this changelog.
- Point the npm and GitHub homepage at the documentation site.

## 2.0.2 (2026-10-07)

### Documentation

- Improve package description and keywords for search.
- Expand `llms-full.txt`, the full reference for AI assistants.

## 2.0.1 (2026-10-04)

### Bug fixes

- Native default props now match the Codegen defaults (`intensity` 50, `tint` `"default"`) on iOS and Android.

## 2.0.0 (2026-10-04)

### Breaking changes

- Rewritten as a React Native Fabric component. The library no longer depends on Expo Modules and works in React Native CLI apps as well as Expo apps.
- Requires React Native 0.76+ with the New Architecture and a native rebuild. The iOS pod is now `NguyenduyBlur`.
- Removed the `CrystalBlurView` alias (use `BlurView`) and the iOS debug helper `dumpGlassInternals`.

### Bug fixes

- `borderRadius` on Android is applied in dp, matching iOS. In 1.x it was applied in pixels.

## 1.1.2 (2026-10-04)

- Link the author website.

## 1.1.1 (2026-10-03)

- README rewritten around backdrop blur use cases, with an iOS and Android demo.

## 1.1.0 (2026-10-03)

### Features

- `mode="backdrop"` blurs what is behind the view and keeps its children sharp, for frosted headers, tab bars, cards, popups and buttons.

## 1.0.6 (2026-10-03)

- Add FAQ, `llms.txt` and Context7 configuration.

## 1.0.5 (2026-10-03)

- Add dev dependencies so the package builds standalone.

## 1.0.4 (2026-10-03)

- Search keywords and install options for yarn, pnpm and bun.

## 1.0.1 (2026-10-03)

- Repository links.

## 1.0.0 (2026-10-03)

- Initial release: native blur view for React Native and Expo with iOS system materials, Android `RenderEffect` materials matched to iOS, Android `SurfaceView` video blur and a web fallback.
