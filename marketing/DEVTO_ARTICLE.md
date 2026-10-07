---
title: React Native Blur: Real Frosted Glass & Video Blur on Android (Demo & Logic)
published: true
description: The logic behind blurring Android SurfaceView video and matching iOS materials with RenderEffect in React Native Fabric.
tags: reactnative, android, ios, webdev
canonical_url: https://github.com/nguyenduy1412/react-native-blur
---

![Backdrop Blur Demo](https://raw.githubusercontent.com/nguyenduy1412/react-native-blur/main/.github/assets/backdrop-demo.webp)
*Backdrop blur on iOS and Android: frosted button over a playing video, frosted popup over a map, and frosted sticky header over a scrolling list.*

---

## The Problem: Why Video Escapes The Blur on Android

On iOS, `UIVisualEffectView` handles blur at the system compositor level, blurring everything underneath—including live video.

On Android, players like `expo-video` and `react-native-video` default to **`SurfaceView`** for hardware playback:
* The WindowManager punches a hole in the app window.
* Video frames are composited directly by Android's `SurfaceFlinger` outside the standard View hierarchy.
* Standard blur libraries (which rely on taking snapshots of the View tree) **cannot see the SurfaceView**. The video stays 100% sharp behind the glass.

---

## The Logic: Native PixelCopy + RenderEffect

To solve this in **`@nguyenduy1412/react-native-blur`**, we implemented a native pipeline for the New Architecture (Fabric):

1. **`PixelCopy` Frame Capture:** The native view finds child `SurfaceView` instances, captures frames via Android's `PixelCopy` API (downscaled 4× at ~30 FPS on a worker thread), and replaces the transparent hole with the captured stream.
2. **`RenderEffect` Blur (Android 12+):** Applies a hardware-accelerated Gaussian blur to the stream on the GPU.
3. **Color Matrix Calibration:** Gaussian blurs wash out luminance and contrast. We recreated Apple's internal `.materialrecipe` specs using a `ColorMatrix` chain. It matches native iOS materials with a mean color error of only **1.95 / 255** (instead of a flat, washed-out grey tint).

![Color Calibration Comparison](https://raw.githubusercontent.com/nguyenduy1412/react-native-blur/main/.github/assets/blur-comparison.jpg)
*Four ways: No blur, this library on Android, this library on iOS, and standard Expo blur on Android.*

---

## Quick Comparison

| Feature | `@nguyenduy1412/react-native-blur` | `expo-blur` | `@react-native-community/blur` |
| :--- | :---: | :---: | :---: |
| **New Architecture (Fabric)** | ✅ Native Fabric Component | ⚠️ Expo Module | ❌ Deprecated / Legacy Bridge |
| **Blurs Playing Video (Android SurfaceView)** | ✅ Yes (`PixelCopy` + `RenderEffect`) | ❌ Video stays sharp | ❌ Video stays sharp |
| **Backdrop Overlays (Headers, Popups)** | ✅ Yes (`mode="backdrop"`) | ⚠️ Limited / Tint only | ⚠️ Inconsistent |
| **iOS Material Match on Android** | ✅ Color-calibrated (1.95/255 error) | ❌ Flat grey tint | ❌ Flat grey tint |
| **Works with RN CLI & Expo** | ✅ Standalone Fabric library | ⚠️ Primarily Expo | ⚠️ Complex setup |

---

## Code & Documentation

Full installation instructions, props API, and examples are available on GitHub and npm:

* ⭐️ **GitHub:** [https://github.com/nguyenduy1412/react-native-blur](https://github.com/nguyenduy1412/react-native-blur)
* 📦 **npm:** [https://www.npmjs.com/package/@nguyenduy1412/react-native-blur](https://www.npmjs.com/package/@nguyenduy1412/react-native-blur)
