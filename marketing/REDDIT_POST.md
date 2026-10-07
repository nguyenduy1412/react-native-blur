# Reddit Post Draft for r/reactnative and r/expo

**Subreddits:** `r/reactnative` & `r/expo` (Flair: `Showcase`)

---

### **Post Title:**
> [Showcase] A React Native Blur library that actually blurs playing video on Android (and matches iOS materials)

---

### **Post Body:**

Hey everyone,

If you’ve ever tried building frosted glass / backdrop blur in React Native, you know how video players (`expo-video`, `react-native-video`) break on Android: **the video plays right through your blur view completely sharp.**

### Why does this happen? (The Logic)
On Android, video players render onto a **`SurfaceView`**. The system WindowManager punches a hole in the app window and composites video directly via `SurfaceFlinger`. Standard blur libraries (which rely on taking snapshots of the View tree) literally cannot see the video surface layer.

### How we solved it:
In [`@nguyenduy1412/react-native-blur`](https://github.com/nguyenduy1412/react-native-blur):
1. **`PixelCopy`**: Inspects children for `SurfaceView`, extracts frames at ~30 FPS on a worker thread, and renders them in place.
2. **`RenderEffect` (Android 12+)**: Hardware-accelerates the blur on the GPU.
3. **Calibrated Materials**: Instead of a flat grey smear, we calibrated against Apple’s `.materialrecipe` specs with a `ColorMatrix` chain (mean color error of only **1.95 / 255** matching iOS).
4. **New Architecture (Fabric)**: Full native Fabric component.

---

### Demo:

- **Backdrop & Overlays (iOS & Android):**  
  https://raw.githubusercontent.com/nguyenduy1412/react-native-blur/main/.github/assets/backdrop-demo.webp

- **iOS vs Android Color Matching:**  
  https://raw.githubusercontent.com/nguyenduy1412/react-native-blur/main/.github/assets/blur-comparison.jpg

---

### Feature Comparison:

| Feature | `@nguyenduy1412/react-native-blur` | `expo-blur` | `@react-native-community/blur` |
| :--- | :---: | :---: | :---: |
| **New Architecture (Fabric)** | ✅ Native Fabric Component | ⚠️ Expo Module | ❌ Deprecated / Legacy Bridge |
| **Blurs Playing Video (Android SurfaceView)** | ✅ Yes (`PixelCopy` + `RenderEffect`) | ❌ Video stays sharp | ❌ Video stays sharp |
| **Backdrop Overlays (Headers, Popups)** | ✅ Yes (`mode="backdrop"`) | ⚠️ Limited / Tint only | ⚠️ Inconsistent |
| **iOS Material Match on Android** | ✅ Color-calibrated (1.95/255) | ❌ Flat grey tint | ❌ Flat grey tint |
| **Works with RN CLI & Expo** | ✅ Standalone Fabric library | ⚠️ Primarily Expo | ⚠️ Complex setup |

---

Full docs, props API, and examples:
* ⭐️ **GitHub:** https://github.com/nguyenduy1412/react-native-blur
* 📦 **npm:** https://www.npmjs.com/package/@nguyenduy1412/react-native-blur
