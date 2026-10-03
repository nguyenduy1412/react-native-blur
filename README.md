<div align="center">

# React Native Blur

**A React Native blur view for Expo and bare React Native that also blurs video.**

Real iOS system materials on iOS, and the same materials rebuilt on Android with `RenderEffect`, calibrated against iOS colour for colour.

[![npm version](https://img.shields.io/npm/v/@nguyenduy1412/react-native-blur.svg?style=flat-square)](https://www.npmjs.com/package/@nguyenduy1412/react-native-blur)
[![npm downloads](https://img.shields.io/npm/dm/@nguyenduy1412/react-native-blur.svg?style=flat-square)](https://www.npmjs.com/package/@nguyenduy1412/react-native-blur)
[![license](https://img.shields.io/npm/l/@nguyenduy1412/react-native-blur.svg?style=flat-square)](./LICENSE)
![platforms](https://img.shields.io/badge/platforms-iOS%20%7C%20Android%20%7C%20Web-blue?style=flat-square)

English · [Tiếng Việt](./README.vi.md)

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

`BlurView` blurs **the content you put inside it**. Wrap the screen or the part of the screen you want frosted:

```tsx
import BlurView from "@nguyenduy1412/react-native-blur";

export default function Screen() {
  return (
    <BlurView style={{ flex: 1 }} intensity={50} tint="systemMaterial">
      <YourContent />
    </BlurView>
  );
}
```

> [!IMPORTANT]
> On Android the blur is applied to the view's **children**. An empty `<BlurView />` placed on top of other views has nothing to blur, so it only draws the tint and rim. Put the content you want blurred inside the `BlurView`.

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

**Web.** CSS `backdrop-filter: blur() saturate()` with a tint background.

## Limitations

- **Android 11 and below** have no `RenderEffect`, so only the tint and rim are drawn.
- **`blurRadius` and `saturation`** are ignored on iOS, which uses the system material as is.
- **Video copies on Android** refresh at about 30 fps at quarter resolution. That is invisible once blurred, but you will notice it at a very low `intensity`.
- **Colour fidelity:** Android fits each iOS luminance curve with a single colour matrix, so it averages about 2 / 255 off iOS. `systemChromeMaterial` is the outlier, at up to about 23 / 255.
- **Blur applies to children.** To frost something drawn *behind* an overlay, render that content inside the `BlurView` instead of placing an empty `BlurView` on top.

## Contributing

Issues and pull requests are welcome at [github.com/nguyenduy1412/react-native-blur](https://github.com/nguyenduy1412/react-native-blur/issues). When reporting a visual issue, include the platform, OS version, the `tint` and `intensity` you used, and a screenshot.

## License

[MIT](./LICENSE) © nguyenduy1412
