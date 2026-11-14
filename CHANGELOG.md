# Changelog

All notable changes to `@nguyenduy1412/react-native-blur` are listed here. The project follows [Semantic Versioning](https://semver.org).

## 2.2.0 (2026-11-14)

### Highlight: real blur on Android 11 and below (API 21-30)

`RenderEffect` only exists on Android 12+, so older versions used to draw a translucent material plate instead of a blur. 2.2.0 captures the backdrop into a bitmap an eighth of the view size, blurs it on the CPU (three box-blur passes) and draws it back scaled up with the material's colour matrix, so Android 11 and below now get a real, live blur in `mode="backdrop"` and `mode="content"`.

| Android | API | Before 2.2.0 | 2.2.0 |
| --- | --- | --- | --- |
| 13 and later | 33+ | Real blur | Real blur, no flash while navigating |
| 12 / 12L | 31-32 | Real blur | Real blur, no flash while navigating |
| **11 and below** | **≤ 30** | Translucent plate, no blur | **Real CPU blur, backdrop and content** |

```tsx
<BlurView mode="backdrop" tint="light" intensity={50} style={styles.header}>
  {/* Android 11 and below now blur the content behind this, not just tint it */}
</BlurView>
```

Video also works there: `SurfaceView` frames are copied with `PixelCopy` and a `TextureView` is read back with `getBitmap()`, so a playing video behind (or inside) a `BlurView` is blurred on API 30 and below too.

The CPU blur refreshes at 30 fps, which keeps the frame budget free and avoids the flash described below.

### Highlight: no more white flash when a screen transitions on Android 13+

Pushing or popping a screen with a backdrop `BlurView` on it could show one fully white frame and then draw the outgoing screen blank for the whole slide. The BlurView re-captured its backdrop by invalidating itself from the pre-draw callback of every frame; when that landed on the frame a screen transition started, Android dropped the outgoing screen's display list.

- The redraw is now posted for the next frame, and skipped while a screen-sized view animation (the fragment transition) runs.
- The capture and its tint are drawn by a child view of their own, and only that child is invalidated: re-recording a child is harmless.
- The last capture is kept when the screen's content is detached for a few frames, so the blurred plate never turns white.
- Android 12: the backdrop renderer alternates between two `RenderNode`s instead of allocating one per frame, so transitions stay flash-free while the blur still updates.

Measured with a 60 fps recording, counting pixels above 235 in every frame (a flash is >15%):

| | Back / push, all modes | Stress (push, back 1.5 s later, ×4) |
| --- | --- | --- |
| Before | 100% white frame in every run, then a blank slide | — |
| Android 13+ (API 37) | 0 / 25 runs | — |
| Android 12 (API 31) | 0 / 7 runs | — |
| Android 11 (API 29) | 0 / 7 runs | — |
| Galaxy A21s, Android 12 (real device) | 0 / 15 runs | 0 / 2 runs |

### Features

- Android 11 and below: real backdrop and content blur on the CPU, at 30 fps (was: material plate only).
- Android 11 and below: video blur with `expo-video` / `react-native-video`, both `SurfaceView` (`PixelCopy` mirror) and `TextureView` (`getBitmap()`).
- Touched only the Android implementation; the JS API is unchanged, so this is a drop-in update.

### Bug fixes

- Android 13+: one white frame at the start of a back or push transition, and the outgoing screen drawn blank until the slide ended.
- Android 12: the same flash during transitions (the pre-draw redraw), and a new `RenderNode` per frame.
- Android 12: the backdrop capture taken while a screen transition ran was white, because the screen's content is detached for a few frames; the last good capture is now kept.
- Android 11 and below: the CPU blur no longer forces a redraw that can land on a transition frame.
- Android 11 and below: `SurfaceView` mirrors were only collected when a `RenderEffect` existed, so the CPU blur never saw a video.

## 2.1.0 (2026-10-08)

### Highlight: video blur with `expo-video` and `react-native-video`

Frosted glass over a playing video now works on both platforms with the two most used video players:

- **[`expo-video`](https://docs.expo.dev/versions/latest/sdk/video/)** (`VideoView`)
- **[`react-native-video`](https://github.com/TheWidlarzGroup/react-native-video)** (`<Video>`, both `viewType={ViewType.SURFACE}` and `viewType={ViewType.TEXTURE}`)

On Android these players render into a `SurfaceView`, which `RenderEffect` cannot see, so earlier versions showed a black or frozen blur. 2.1.0 copies the video frames with `PixelCopy` while the player is on screen, so:

- `mode="backdrop"` (headers, cards, controls over the video) blurs the live video and stays in sync with it (new `syncVideo` prop, default `true`).
- `mode="content"` blurs a whole video player, including on Android 12.
- Copies run off the UI thread, are shared between every `BlurView` over the same video, and are skipped when the video is paused or off screen.

```tsx
import { VideoView, useVideoPlayer } from 'expo-video';
import BlurView from '@nguyenduy1412/react-native-blur';

<View style={{ flex: 1 }}>
  <VideoView player={player} style={StyleSheet.absoluteFill} />
  <BlurView mode="backdrop" tint="systemMaterial" intensity={60} style={styles.controls}>
    {/* sharp controls over a blurred video */}
  </BlurView>
</View>
```

### Highlight: full support for Android 12 (API 31-32), not only API 33+

Android 12 (API 31-32) has `RenderEffect` but behaves differently from API 33+, and earlier versions broke there. 2.1.0 has a separate renderer for API 31-32, so Android 12 now gets the same results as Android 13+:

| Android | API | 2.1.0 |
| --- | --- | --- |
| 13 and later | 33+ | Real blur, backdrop and content, video blur |
| **12 / 12L** | **31-32** | **Real blur, backdrop and content, video blur (fixed in 2.1.0)** |
| 11 and earlier | ≤ 30 | Translucent material plate (no blur), stays readable |

- Backdrop no longer freezes while content behind it scrolls on Android 12.
- Video blur works on Android 12: content mode no longer shows black, backdrop over `expo-video` / `react-native-video` stays in sync with the video.
- Faster on Android 12: half-size video copies (a full copy took ~48 ms on API 31) taken off the UI thread.
- Android 11 and below: the fallback plate stays readable at low `intensity`.

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
