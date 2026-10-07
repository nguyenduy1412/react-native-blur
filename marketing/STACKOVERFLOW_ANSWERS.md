# Stack Overflow Answer Templates

When answering questions on Stack Overflow, **always** follow their community guidelines:
1. Explain the technical "why" first (why the user's current code is failing).
2. Provide the working code solution.
3. Disclose affiliation: e.g., *"Disclaimer: I am the author of this open-source library."* (This prevents the answer from being flagged as spam).

---

### Target Question 1: "How to blur video in React Native on Android?"
*Search on Stack Overflow: `[react-native] blur video android` or `expo-blur video`*

**Template Answer:**

> ### Why this happens:
> 
> Most blur libraries (`expo-blur`, `@react-native-community/blur`) capture snapshots of the standard Android View hierarchy. 
> 
> However, video players in React Native (`expo-video`, `react-native-video`) render onto an Android **`SurfaceView`** by default. `SurfaceView` is rendered on a dedicated compositor layer directly by Android's `SurfaceFlinger` rather than inside the standard view tree. Because of this, software snapshots cannot see the video frames, leaving the video completely sharp.
> 
> ### Solution:
> 
> On Android 12+ (API 31+), you can use hardware-accelerated `RenderEffect` combined with `PixelCopy` to capture and blur the `SurfaceView` frames.
> 
> You can use [`@nguyenduy1412/react-native-blur`](https://github.com/nguyenduy1412/react-native-blur), which handles this natively for both React Native CLI and Expo (New Architecture / Fabric):
> 
> ```bash
> # Expo
> npx expo install @nguyenduy1412/react-native-blur
> 
> # React Native CLI
> npm install @nguyenduy1412/react-native-blur && cd ios && pod install
> ```
> 
> Wrap your video player in `BlurView`:
> 
> ```tsx
> import BlurView from '@nguyenduy1412/react-native-blur';
> import { VideoView, useVideoPlayer } from 'expo-video';
> 
> <BlurView style={{ flex: 1 }} intensity={60} tint="dark">
>   <VideoView player={player} style={StyleSheet.absoluteFill} />
> </BlurView>
> ```
> 
> *(Disclaimer: I am the author of this library).*

---

### Target Question 2: "How to blur background behind sticky header or modal in React Native New Architecture?"
*Search on Stack Overflow: `[react-native] backdrop blur header` or `fabric blurview`*

**Template Answer:**

> To achieve a true backdrop blur (frosted glass) where whatever is scrolling *behind* the header is blurred, but the header's own content (title, back button) remains crisp and sharp, you need a view that captures ancestor and sibling render nodes.
> 
> With the New Architecture (Fabric), you can use [`@nguyenduy1412/react-native-blur`](https://github.com/nguyenduy1412/react-native-blur) with `mode="backdrop"`:
> 
> ```tsx
> import BlurView from '@nguyenduy1412/react-native-blur';
> 
> <View style={{ flex: 1 }}>
>   <ScrollView contentContainerStyle={{ paddingTop: 100 }}>
>     {/* Your scrolling list content */}
>   </ScrollView>
> 
>   <BlurView
>     mode="backdrop"
>     intensity={80}
>     tint="systemThinMaterial"
>     style={styles.floatingHeader}
>   >
>     <Text style={styles.headerTitle}>Sticky Title</Text>
>   </BlurView>
> </View>
> ```
> 
> - On iOS: uses native `UIVisualEffectView`.
> - On Android 12+: uses `RenderEffect` calibrated to match iOS materials.
> 
> *(Disclaimer: I am the author of this library).*
