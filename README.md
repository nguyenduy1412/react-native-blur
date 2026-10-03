<div align="center">

# React Native Blur

**A React Native blur view for Expo and bare React Native that also blurs video.**

Real iOS system materials on iOS, and the same materials rebuilt on Android with `RenderEffect`, calibrated against iOS colour for colour.

[![npm version](https://img.shields.io/npm/v/@nguyenduy1412/react-native-blur.svg?style=flat-square)](https://www.npmjs.com/package/@nguyenduy1412/react-native-blur)
[![npm downloads](https://img.shields.io/npm/dm/@nguyenduy1412/react-native-blur.svg?style=flat-square)](https://www.npmjs.com/package/@nguyenduy1412/react-native-blur)
[![license](https://img.shields.io/npm/l/@nguyenduy1412/react-native-blur.svg?style=flat-square)](./LICENSE)
![platforms](https://img.shields.io/badge/platforms-iOS%20%7C%20Android%20%7C%20Web-blue?style=flat-square)

<img src="https://raw.githubusercontent.com/nguyenduy1412/react-native-blur/main/.github/assets/video-comparison.webp" width="720" alt="Left: this library blurs the playing video. Right: a typical blur library lets the video show through sharp." />

<sub><b>Left:</b> this library. The video behind the glass is blurred like everything else.<br/><b>Right:</b> a typical React Native blur library. Blur is on, but the video stays sharp.</sub>

</div>

---

## Why another blur library?

Most blur libraries for React Native look fine over a static screen and break down in two places.

**Video escapes the blur.** On Android, video plays in a `SurfaceView`, which the system composites directly on top of your app's window. Libraries that blur by taking a snapshot of the view tree never see that layer, so the video stays perfectly sharp behind your "glass".

**Android looks grey and flat.** A single Gaussian blur plus a flat tint washes the colour out. Light and shadow merge into one grey smear, and the result looks nothing like the iOS material on the same screen.

This library fixes both:

<div align="center">
<img src="https://raw.githubusercontent.com/nguyenduy1412/react-native-blur/main/.github/assets/blur-comparison.jpg" width="100%" alt="The same screen with no blur, this library on Android, this library on iOS, and expo-blur on Android" />
</div>

The same screen, four ways. Android and iOS from this library land on the same brightness, saturation and depth. The flat-tint approach (right) turns the same content into a grey wash.

📖 **Deep dive with video:** [Kaizer Blur: real blur, even over video](https://kaizer-app.vercel.app) (see the *Library* section).

## Features

- 🎬 **Blurs video**, including `SurfaceView` players such as `expo-video` and `react-native-video` on Android.
- 🍎 **Real iOS materials.** On iOS it is `UIVisualEffectView` with the system blur styles, not an imitation.
- 🤖 **Android matched to iOS.** A `RenderEffect` chain (Gaussian blur, then a colour matrix) per material, calibrated against iOS screenshots: mean error **1.95 / 255** across 187 sampled colours.
- ✨ **Glass edge.** A specular rim highlight on the top edge gives the "glass has thickness" look.
- 🌗 **Light and dark aware.** Material tints follow the system appearance on Android.
- 🎚️ **One `intensity` prop** from 0 to 100 drives blur, colour and rim together.
- 🌐 **Web fallback** with CSS `backdrop-filter`.
- 📦 **Tiny.** About 11 kB packed, no JS dependencies, built on the Expo Modules API.

## Installation

```sh
npx expo install @nguyenduy1412/react-native-blur
```

<details>
<summary>npm, yarn, pnpm or bun</summary>

```sh
npm install @nguyenduy1412/react-native-blur
yarn add @nguyenduy1412/react-native-blur
pnpm add @nguyenduy1412/react-native-blur
bun add @nguyenduy1412/react-native-blur
```

</details>

This package contains native code, so it **does not run in Expo Go**. Rebuild your development build:

```sh
npx expo run:ios
npx expo run:android
```

**Bare React Native:** install Expo Modules first with `npx install-expo-modules@latest`, then `cd ios && pod install`.

### Requirements

| | Minimum |
| --- | --- |
| iOS | 15.1 |
| Android | API 31 (Android 12) for the blur. Older versions render the tint and rim without blur. |
| Expo | Built and tested with Expo SDK 57 and React Native 0.86 |

## Quick start

`BlurView` has two modes. Pick the one that matches what you want frosted.

### `mode="backdrop"`: blur what is behind the view

The classic frosted-glass overlay: headers, tab bars, cards, popups and buttons over content. Everything behind the `BlurView` is blurred, and its children stay sharp on top.

```tsx
import BlurView from "@nguyenduy1412/react-native-blur";

<View style={{ flex: 1 }}>
  <ScrollView>{/* content scrolls under the header */}</ScrollView>

  <BlurView mode="backdrop" intensity={80} tint="systemMaterial" style={styles.header}>
    <Text>Header</Text>
  </BlurView>
</View>
```

### `mode="content"` (default): blur what is inside the view

Blurs the children themselves. Use it to frost a whole screen, an image or a playing video.

```tsx
<BlurView style={{ flex: 1 }} intensity={50} tint="systemMaterial">
  <YourContent />
</BlurView>
```

## Examples

### Toggle a blur over a whole screen

Keep the content mounted and drive `intensity`. `0` turns the effect off completely.

```tsx
const [blurred, setBlurred] = useState(false);

<BlurView style={{ flex: 1 }} intensity={blurred ? 60 : 0}>
  <Feed />
</BlurView>;
```

### Frosted card

`borderRadius` clips the blur, the tint and the rim together. It is also read from `style.borderRadius`.

```tsx
<BlurView
  intensity={70}
  tint="systemThinMaterial"
  style={{ borderRadius: 24, padding: 20 }}
>
  <Text>Frosted glass</Text>
</BlurView>
```

### Blur a playing video

Nothing special is needed. `SurfaceView` players are picked up automatically.

```tsx
import { useVideoPlayer, VideoView } from "expo-video";

const player = useVideoPlayer(source, (p) => p.play());

<BlurView style={{ flex: 1 }} intensity={60}>
  <VideoView player={player} style={{ flex: 1 }} />
</BlurView>;
```

### Custom tint colour and stronger blur (Android)

```tsx
<BlurView
  intensity={80}
  tint="dark"
  tintColor="rgba(10, 20, 40, 0.35)"
  blurRadius={30}
  saturation={1.4}
  style={{ flex: 1 }}
>
  <Content />
</BlurView>
```

## API

### `<BlurView />`

Accepts every `View` prop, plus:

| Prop | Type | Default | Platforms | Description |
| --- | --- | --- | --- | --- |
| `mode` | `'content' \| 'backdrop'` | `'content'` | iOS, Android | `'backdrop'` blurs what is behind the view and keeps its children sharp. `'content'` blurs the children. |
| `intensity` | `number` | `50` | iOS, Android, Web | Strength of the whole effect, `0` to `100`. Scales blur, colour and rim together. `0` disables it. |
| `tint` | `BlurTint` | `'default'` | iOS, Android, Web | Material to use. See the table below. |
| `tintColor` | `string` | — | iOS, Android, Web | Extra colour layer drawn over the blur, for example `'rgba(0,0,0,0.3)'`. |
| `borderRadius` | `number` | `style.borderRadius` or `0` | iOS, Android | Corner radius for the blur, tint and rim. |
| `blurRadius` | `number` | from `tint` | Android, Web | Overrides the material's blur radius, in dp. |
| `saturation` | `number` | `1` | Android, Web | Multiplier on the material's saturation boost. |
| `children` | `ReactNode` | — | all | The content to blur. |

### `tint` values

| `tint` | iOS style | Android |
| --- | --- | --- |
| `'default'` | `.regular` | Light or dark material following the system theme |
| `'light'` | `.light` | Light material |
| `'extraLight'` | `.extraLight` | Extra light material |
| `'dark'` | `.dark` | Dark material |
| `'prominent'` | `.prominent` | Extra light in light mode, dark in dark mode |
| `'systemUltraThinMaterial'` | `.systemUltraThinMaterial` | Ultra-thin material, light or dark |
| `'systemThinMaterial'` | `.systemThinMaterial` | Thin material, light or dark |
| `'systemMaterial'` | `.systemMaterial` | Regular material, light or dark |
| `'systemThickMaterial'` | `.systemThickMaterial` | Thick material, light or dark |
| `'systemChromeMaterial'` | `.systemChromeMaterial` | Chrome material, light or dark |

## How it works

**iOS.** A `UIVisualEffectView` with the matching `UIBlurEffect` style sits over the children. `intensity` is applied by scrubbing a paused `UIViewPropertyAnimator`, so every value between 0 and 100 is a real system blur rather than an opacity fade. A specular highlight layer draws the glass edge.

**Android (API 31+).** The view applies a `RenderEffect` chain to its children: a Gaussian blur, then a `ColorMatrix` that restores the brightness and saturation the blur removes and lays down the material's tint plate. The material numbers come from Apple's own `.materialrecipe` files in the iOS runtime, and `scripts/check-material-recipes.py` checks the Android output against colours sampled from iOS screenshots.

**Video on Android.** A `SurfaceView` is composited by the system, outside the normal view hierarchy, so no `RenderEffect` can reach it. The view finds `SurfaceView`s among its children, copies their frames with `PixelCopy` (downscaled 4×, about 30 fps) and draws the copy in their place, where the blur applies like it does to everything else.

**Backdrop mode.** On iOS the effect view is placed underneath the children, so `UIVisualEffectView` blurs whatever is behind the `BlurView`. On Android the view records what is drawn behind it (ancestor backgrounds and the sibling views before it, with their scroll offsets and transforms) into a `RenderNode`, applies the same blur and material chain, and draws the children on top. The recording is refreshed on every frame where something on screen changed, so scrolling lists and playing videos stay in sync.

**Web.** CSS `backdrop-filter: blur() saturate()` with a tint background.

## Limitations

- **Android 11 and below** have no `RenderEffect`, so only the tint and rim are drawn.
- **`blurRadius` and `saturation`** are ignored on iOS, which uses the system material as is.
- **Video copies on Android** refresh at about 30 fps at quarter resolution. That is invisible once blurred, but you will notice it at a very low `intensity`.
- **Colour fidelity:** Android fits each iOS luminance curve with a single colour matrix, so it averages about 2 / 255 off iOS. `systemChromeMaterial` is the outlier, at up to about 23 / 255.
- **Backdrop mode on Android only sees its own window.** Inside React Native's `<Modal>` (a separate window) it cannot blur the screen behind; use an in-screen overlay instead.
- **Backdrop mode on Android cannot see a `SurfaceView` behind it.** Render the video with a `TextureView` instead, for example `<VideoView surfaceType="textureView" />` in expo-video. Content mode blurs `SurfaceView` video fine.

## FAQ

<details>
<summary><b>How do I make a frosted header, tab bar or button over content?</b></summary>

Use `mode="backdrop"`. The content behind the `BlurView` is blurred and its children stay sharp:

```tsx
<BlurView mode="backdrop" intensity={80} tint="systemThinMaterial" style={{ borderRadius: 24, padding: 16 }}>
  <Text>Frosted card</Text>
</BlurView>
```

</details>

<details>
<summary><b>expo-blur or <code>@react-native-community/blur</code> doesn't blur my video on Android. Why?</b></summary>

Android plays video in a `SurfaceView` (`expo-video`, `react-native-video` and most players do). The system composites a `SurfaceView` in its own layer, outside your app's view tree, so a blur that works by capturing the view tree never sees the video, and it stays sharp behind the glass.

This library finds `SurfaceView`s inside the `BlurView`, copies their frames with `PixelCopy` and blurs the copy, so the video is blurred like everything else. Wrap the video in `BlurView`:

```tsx
<BlurView style={{ flex: 1 }} intensity={60}>
  <VideoView player={player} style={{ flex: 1 }} />
</BlurView>
```

</details>

<details>
<summary><b>Blur looks grey and flat on Android compared with iOS. How do I make it match?</b></summary>

A single Gaussian blur plus a flat tint washes out the colours. This library rebuilds each iOS material on Android with a `RenderEffect` blur followed by a colour matrix that restores the brightness and saturation the blur removes. The numbers come from Apple's own material recipes, and the result lands within about 2 / 255 of iOS on average. Use the same `tint` on both platforms, for example `tint="systemMaterial"`.

</details>

<details>
<summary><b>My <code>BlurView</code> shows only a tint on Android, with no blur.</b></summary>

Check two things:

1. **Use `mode="backdrop"` for overlays.** The default `mode="content"` blurs the view's own children, so a `BlurView` laid over other views has nothing of its own to blur. `mode="backdrop"` blurs what is behind it.
2. **The device must run Android 12 (API 31) or later.** `RenderEffect` does not exist on older versions, so they get the tint and rim only.

</details>

<details>
<summary><b>How do I blur the screen behind a modal or overlay?</b></summary>

Render the overlay in the same screen (an absolutely positioned view, or a portal) and put a backdrop `BlurView` behind its content. The screen underneath is blurred and the overlay content stays sharp.

```tsx
<View style={{ flex: 1 }}>
  <Screen />
  {visible && (
    <View style={StyleSheet.absoluteFill}>
      <BlurView mode="backdrop" intensity={60} style={StyleSheet.absoluteFill} />
      <ModalCard />
    </View>
  )}
</View>
```

On Android, React Native's `<Modal>` opens a separate window, and backdrop mode only sees content in its own window. Inside a `<Modal>` it works on iOS but not on Android, so prefer an in-screen overlay when you need the blur on both platforms.

</details>

<details>
<summary><b>Does it work in Expo Go?</b></summary>

No. It contains native code, so you need a development build (`npx expo run:ios` / `npx expo run:android`) or EAS Build. It works with Expo prebuild, and with bare React Native once Expo Modules is installed.

</details>

<details>
<summary><b>Does it support the New Architecture?</b></summary>

Yes. It is built on the Expo Modules API and is tested with React Native 0.86 and Expo SDK 57.

</details>

## Contributing

Issues and pull requests are welcome at [github.com/nguyenduy1412/react-native-blur](https://github.com/nguyenduy1412/react-native-blur/issues). When reporting a visual issue, include the platform, OS version, the `tint` and `intensity` you used, and a screenshot.

## Support

⭐ If this library saves you time, a star on [GitHub](https://github.com/nguyenduy1412/react-native-blur) helps other developers find it.

## License

[MIT](./LICENSE) © nguyenduy1412
