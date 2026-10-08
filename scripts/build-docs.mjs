#!/usr/bin/env node
/**
 * Builds the static documentation site in docs/ (served by GitHub Pages).
 * Every page is plain HTML with no client JavaScript, so search engines and
 * AI crawlers that do not run JavaScript can read the full content.
 *
 * Usage: node scripts/build-docs.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "docs");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

const SITE = "https://nguyenduy1412.github.io/react-native-blur/";
const REPO = "https://github.com/nguyenduy1412/react-native-blur";
const NPM = "https://www.npmjs.com/package/@nguyenduy1412/react-native-blur";
const ASSETS = "https://raw.githubusercontent.com/nguyenduy1412/react-native-blur/main/.github/assets/";
const PKG = pkg.name;
const TODAY = new Date().toISOString().slice(0, 10);

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const code = (src, lang = "tsx") => `<pre><code class="language-${lang}">${esc(src.trim())}</code></pre>`;
const stripTags = (s) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

const INSTALL = `<h3>React Native CLI</h3>
${code(`npm install ${PKG}\ncd ios && pod install`, "sh")}
<p>Rebuild the app. Autolinking picks the library up; no Expo packages are needed.</p>
<h3>Expo</h3>
${code(`npx expo install ${PKG}\nnpx expo run:ios\nnpx expo run:android`, "sh")}
<p>It contains native code, so it does not run in Expo Go. Use a development build or EAS Build.</p>`;

const COMMON_FAQ = [
  ["Does it work in Expo Go?", "No. The package contains native code, so it needs a development build (<code>npx expo run:ios</code> / <code>npx expo run:android</code>) or EAS Build. React Native CLI apps work after <code>pod install</code> and a rebuild."],
  ["Does it work without Expo?", "Yes. Since 2.0 it is a plain React Native Fabric component, so a React Native CLI app only needs <code>npm install</code> and <code>pod install</code>."],
  ["Which Android versions get a real blur?", "Android 12 (API 31) and later, where <code>RenderEffect</code> exists. Android 11 and earlier draw a translucent material plate without blur, so content stays readable."],
];

const pages = [
  {
    slug: "",
    title: "React Native Blur: backdrop blur and frosted glass for React Native and Expo",
    nav: "Overview",
    description: "Native blur view for React Native CLI and Expo on iOS, Android and Web. Frosted-glass headers, tab bars, cards and popups, Android video blur, and Android materials matched to iOS.",
    h1: "React Native Blur",
    lede: "Backdrop blur and frosted glass for React Native and Expo, on iOS and Android. Blur what is behind headers, tab bars, cards, popups and buttons while their content stays sharp, or blur a whole screen or a playing video.",
    body: `
<figure>
  <img src="${ASSETS}blur-comparison.jpg" width="1520" height="784" alt="The same screen with no blur, this library on Android, this library on iOS, and expo-blur on Android" />
  <figcaption>The same screen four ways: no blur, this library on Android, this library on iOS, and a flat-tint blur on Android.</figcaption>
</figure>

<h2 id="features">Features</h2>
<ul>
  <li><strong>Backdrop blur</strong> (<code>mode="backdrop"</code>): frosted headers, tab bars, cards, popups and buttons that blur whatever is behind them, with sharp content on top. Works over scrolling lists and playing video.</li>
  <li><strong>Blurs video on Android</strong>, including <code>SurfaceView</code> players such as <code>expo-video</code> and <code>react-native-video</code>.</li>
  <li><strong>Real iOS materials</strong>: <code>UIVisualEffectView</code> with the system blur styles.</li>
  <li><strong>Android matched to iOS</strong>: a <code>RenderEffect</code> blur plus colour matrix per material, calibrated against iOS screenshots (mean error 1.95 / 255 across 187 sampled colours).</li>
  <li><strong>One <code>intensity</code> prop</strong> from 0 to 100 drives blur, colour and glass rim together.</li>
  <li><strong>Web fallback</strong> with CSS <code>backdrop-filter</code>.</li>
  <li><strong>React Native CLI and Expo</strong>: a native Fabric component with no JS dependencies and no Expo requirement.</li>
</ul>

<h2 id="install">Installation</h2>
${INSTALL}

<h3>Requirements</h3>
<table>
  <thead><tr><th></th><th>Minimum</th></tr></thead>
  <tbody>
    <tr><td>React Native</td><td>0.76 with the New Architecture (Fabric). Tested with React Native 0.86.</td></tr>
    <tr><td>iOS</td><td>15.1</td></tr>
    <tr><td>Android</td><td>API 31 (Android 12) for the blur. Older versions draw a translucent material plate.</td></tr>
    <tr><td>Expo (optional)</td><td>Tested with Expo SDK 57</td></tr>
  </tbody>
</table>

<h2 id="quick-start">Quick start</h2>
<table>
  <thead><tr><th>You want to blur…</th><th>Use</th></tr></thead>
  <tbody>
    <tr><td>What is <strong>behind</strong> the view (header, tab bar, card, popup, button)</td><td><code>mode="backdrop"</code></td></tr>
    <tr><td>What is <strong>inside</strong> the view (a whole screen, an image, a playing video)</td><td><code>mode="content"</code> (default)</td></tr>
  </tbody>
</table>
${code(`import BlurView from "${PKG}";

<BlurView mode="backdrop" intensity={80} tint="systemThinMaterial" style={{ borderRadius: 24, padding: 16 }}>
  <Text>Frosted card</Text>
</BlurView>

<BlurView style={{ flex: 1 }} intensity={50} tint="systemMaterial">
  <YourContent />
</BlurView>`)}

<h2 id="guides">Guides</h2>
<ul class="cards">
  <li><a href="frosted-glass-header-tab-bar/"><strong>Frosted glass header and tab bar</strong><span>Sticky headers and floating tab bars that blur the list scrolling under them.</span></a></li>
  <li><a href="android-video-blur/"><strong>Blur a video on Android</strong><span>Why video stays sharp under most blur libraries, and how to blur it.</span></a></li>
  <li><a href="blur-modal-background/"><strong>Blurred modal background</strong><span>Blur the screen behind a modal, bottom sheet or popup.</span></a></li>
  <li><a href="expo-blur-alternative/"><strong>expo-blur alternative</strong><span>How this library compares with expo-blur and @react-native-community/blur.</span></a></li>
  <li><a href="common-blur-issues/"><strong>Common blur issues and fixes</strong><span>Video stays sharp, grey Android blur, Modal, New Architecture crashes and more.</span></a></li>
</ul>

<h2 id="api">API</h2>
<p><code>&lt;BlurView /&gt;</code> accepts every <code>View</code> prop, plus:</p>
<table>
  <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Platforms</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>mode</code></td><td><code>'content' | 'backdrop'</code></td><td><code>'content'</code></td><td>iOS, Android</td><td><code>'backdrop'</code> blurs what is behind the view and keeps its children sharp. <code>'content'</code> blurs the children.</td></tr>
    <tr><td><code>intensity</code></td><td><code>number</code></td><td><code>50</code></td><td>iOS, Android, Web</td><td>Strength of the whole effect, 0 to 100. <code>0</code> disables it.</td></tr>
    <tr><td><code>tint</code></td><td><code>BlurTint</code></td><td><code>'default'</code></td><td>iOS, Android, Web</td><td>Material to use. See below.</td></tr>
    <tr><td><code>tintColor</code></td><td><code>ColorValue</code></td><td>—</td><td>iOS, Android, Web</td><td>Extra colour layer over the blur, e.g. <code>'rgba(0,0,0,0.3)'</code>.</td></tr>
    <tr><td><code>borderRadius</code></td><td><code>number</code></td><td><code>style.borderRadius</code> or <code>0</code></td><td>iOS, Android</td><td>Corner radius for blur, tint and rim.</td></tr>
    <tr><td><code>blurRadius</code></td><td><code>number</code></td><td>from <code>tint</code></td><td>Android, Web</td><td>Overrides the material's blur radius, in dp.</td></tr>
    <tr><td><code>saturation</code></td><td><code>number</code></td><td><code>1</code></td><td>Android, Web</td><td>Multiplier on the material's saturation boost.</td></tr>
  </tbody>
</table>

<h3 id="tint">tint values</h3>
<table>
  <thead><tr><th><code>tint</code></th><th>iOS style</th><th>Android</th></tr></thead>
  <tbody>
    <tr><td><code>'default'</code></td><td><code>.regular</code></td><td>Light or dark material following the system theme</td></tr>
    <tr><td><code>'light'</code></td><td><code>.light</code></td><td>Light material</td></tr>
    <tr><td><code>'extraLight'</code></td><td><code>.extraLight</code></td><td>Extra light material</td></tr>
    <tr><td><code>'dark'</code></td><td><code>.dark</code></td><td>Dark material</td></tr>
    <tr><td><code>'prominent'</code></td><td><code>.prominent</code></td><td>Extra light in light mode, dark in dark mode</td></tr>
    <tr><td><code>'systemUltraThinMaterial'</code></td><td><code>.systemUltraThinMaterial</code></td><td>Ultra-thin material, light or dark</td></tr>
    <tr><td><code>'systemThinMaterial'</code></td><td><code>.systemThinMaterial</code></td><td>Thin material, light or dark</td></tr>
    <tr><td><code>'systemMaterial'</code></td><td><code>.systemMaterial</code></td><td>Regular material, light or dark</td></tr>
    <tr><td><code>'systemThickMaterial'</code></td><td><code>.systemThickMaterial</code></td><td>Thick material, light or dark</td></tr>
    <tr><td><code>'systemChromeMaterial'</code></td><td><code>.systemChromeMaterial</code></td><td>Chrome material, light or dark</td></tr>
  </tbody>
</table>

<h2 id="how-it-works">How it works</h2>
<p><strong>iOS.</strong> A <code>UIVisualEffectView</code> with the matching <code>UIBlurEffect</code> style sits over the children in content mode and underneath them in backdrop mode. <code>intensity</code> scrubs a paused <code>UIViewPropertyAnimator</code>, so every value is a real system blur rather than an opacity fade.</p>
<p><strong>Android (API 31+).</strong> A <code>RenderEffect</code> chain applies a Gaussian blur, then a <code>ColorMatrix</code> that restores the brightness and saturation the blur removes and lays down the material's tint. The numbers come from Apple's own material recipes and are checked against colours sampled from iOS screenshots.</p>
<p><strong>Video on Android.</strong> <code>SurfaceView</code>s inside the view are copied with <code>PixelCopy</code> (downscaled 4×, every frame) and drawn in place, where the blur applies to them like everything else.</p>
<p><strong>Backdrop on Android.</strong> The view records what is drawn behind it (ancestor backgrounds and earlier siblings, with scroll offsets and transforms) into a <code>RenderNode</code>, blurs it, and draws the children on top. It refreshes on every frame where something changed.</p>
<p><strong>Web.</strong> CSS <code>backdrop-filter: blur() saturate()</code> with a tint background.</p>

<h2 id="limitations">Limitations</h2>
<ul>
  <li>Android 11 and below have no <code>RenderEffect</code>, so they draw a translucent material plate instead of a blur.</li>
  <li><code>blurRadius</code> and <code>saturation</code> are ignored on iOS.</li>
  <li>Backdrop inside <code>&lt;Modal&gt;</code> on Android copies the screen behind with <code>PixelCopy</code> at about 30 fps, half resolution.</li>
  <li>A <code>SurfaceView</code> behind a backdrop on Android (video, maps) is copied with <code>PixelCopy</code> every frame at full resolution. The copy covers the live video so the sharp and blurred parts stay in sync; a <code>TextureView</code> player has no delay at all.</li>
</ul>`,
    faq: [
      ["How do I make a frosted header, tab bar or button in React Native?", "Use <code>&lt;BlurView mode=\"backdrop\"&gt;</code>. The content behind the view is blurred and its children stay sharp, on both iOS and Android."],
      ["Why does my BlurView show only a tint on Android?", "A BlurView laid over other views needs <code>mode=\"backdrop\"</code>; the default <code>mode=\"content\"</code> blurs only its own children. The device must also run Android 12 (API 31) or later."],
      ...COMMON_FAQ,
      ["Does it support the New Architecture?", "Yes, and it requires it. It is a Fabric native component generated with React Native Codegen, tested with React Native 0.86 and Expo SDK 57."],
    ],
  },
  {
    slug: "frosted-glass-header-tab-bar/",
    title: "Frosted glass header and tab bar in React Native (iOS and Android)",
    nav: "Header and tab bar",
    description: "Build a frosted-glass sticky header, floating tab bar or bottom bar in React Native and Expo that blurs the list scrolling beneath it, on iOS and Android.",
    h1: "Frosted glass header and tab bar in React Native",
    lede: "A sticky header or floating tab bar that blurs the list scrolling under it, the way iOS navigation bars do, with the same look on Android.",
    body: `
<figure>
  <img src="${ASSETS}backdrop-demo.webp" loading="lazy" width="854" height="836" alt="Backdrop blur on iOS and Android: a frosted sticky header over a scrolling list, a frosted popup over a map and a frosted button over a video" />
  <figcaption>Backdrop mode on iOS (left) and Android (right).</figcaption>
</figure>

<h2>Install</h2>
${INSTALL}

<h2>Sticky header over a scrolling list</h2>
<p>Put the list first and the header after it, absolutely positioned. <code>mode="backdrop"</code> blurs whatever is drawn behind the header, and the title stays sharp.</p>
${code(`import BlurView from "${PKG}";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function Inbox({ items }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56 }}>{items}</ScrollView>

      <BlurView
        mode="backdrop"
        intensity={85}
        tint="systemMaterial"
        style={{ position: "absolute", top: 0, left: 0, right: 0, paddingTop: insets.top, paddingBottom: 12 }}
      >
        <Text style={{ fontSize: 17, fontWeight: "600", textAlign: "center" }}>Inbox</Text>
      </BlurView>
    </View>
  );
}`)}

<h2>Floating glass tab bar</h2>
${code(`<BlurView
  mode="backdrop"
  intensity={80}
  tint="systemThinMaterial"
  style={{ position: "absolute", left: 16, right: 16, bottom: 24, borderRadius: 32, flexDirection: "row" }}
>
  {tabs}
</BlurView>`)}

<h2>React Navigation tab bar background</h2>
<p>Use the BlurView as the tab bar background and make the tab bar transparent and absolute so screens scroll under it.</p>
${code(`<Tab.Navigator
  screenOptions={{
    tabBarStyle: { position: "absolute", backgroundColor: "transparent", borderTopWidth: 0 },
    tabBarBackground: () => (
      <BlurView mode="backdrop" intensity={80} tint="systemChromeMaterial" style={StyleSheet.absoluteFill} />
    ),
  }}
>
  {/* screens */}
</Tab.Navigator>`)}

<h2>Which tint to use</h2>
<ul>
  <li><code>systemChromeMaterial</code>: closest to the iOS navigation and tab bar.</li>
  <li><code>systemThinMaterial</code> / <code>systemUltraThinMaterial</code>: lighter glass that shows more of the content.</li>
  <li><code>systemMaterial</code> / <code>systemThickMaterial</code>: more opaque, better text contrast.</li>
</ul>
<p>All <code>system*</code> materials follow light and dark mode on both platforms.</p>`,
    faq: [
      ["Why does my header show only a grey tint on Android?", "Use <code>mode=\"backdrop\"</code>. The default content mode blurs the view's own children, and a header has nothing of its own to blur. Real blur also needs Android 12 (API 31)+."],
      ["Does the header blur stay in sync while scrolling?", "Yes. On Android the backdrop recording is refreshed on every frame where something changed, including scroll offsets. On iOS it is the system UIVisualEffectView."],
      ...COMMON_FAQ,
    ],
  },
  {
    slug: "android-video-blur/",
    title: "Blur a playing video in React Native on Android (expo-video, react-native-video)",
    nav: "Android video blur",
    description: "Why expo-blur and @react-native-community/blur leave video sharp on Android, and how to blur expo-video or react-native-video SurfaceView playback in React Native.",
    h1: "Blur a playing video in React Native on Android",
    lede: "On Android, most blur libraries leave a playing video perfectly sharp behind the glass. This page explains why, and how to blur expo-video and react-native-video.",
    body: `
<figure>
  <img src="${ASSETS}video-comparison.webp" loading="lazy" width="1100" height="1212" alt="Left: this library blurs the playing video. Right: a typical blur library lets the video show through sharp." />
  <figcaption>Left: this library. Right: a typical React Native blur library, with blur on but the video still sharp.</figcaption>
</figure>

<h2>Why the video stays sharp</h2>
<p>Android players such as <code>expo-video</code> and <code>react-native-video</code> draw frames into a <code>SurfaceView</code>. The system compositor puts a <code>SurfaceView</code> in its own layer, outside your app's view tree. A blur that captures or renders the view tree never sees that layer, so the video shows through untouched.</p>

<h2>How this library blurs it</h2>
<p><code>BlurView</code> finds <code>SurfaceView</code>s among its children, copies their frames with <code>PixelCopy</code> (downscaled 4×, every frame) and draws the copy in their place. The <code>RenderEffect</code> blur then applies to the video like everything else.</p>

<h2>Install</h2>
${INSTALL}

<h2>Blur a whole video (content mode)</h2>
${code(`import BlurView from "${PKG}";
import { useVideoPlayer, VideoView } from "expo-video";

export function BlurredVideo({ source, locked }) {
  const player = useVideoPlayer(source, (p) => p.play());
  return (
    <BlurView style={{ flex: 1 }} intensity={locked ? 60 : 0}>
      <VideoView player={player} style={{ flex: 1 }} />
    </BlurView>
  );
}`)}
<p>Content mode works with the default <code>SurfaceView</code>. Set <code>intensity</code> to <code>0</code> to remove the blur without unmounting the player.</p>

<h2>Frosted button over a video (backdrop mode)</h2>
<p>To blur only the area under a button and keep the rest of the video sharp, use backdrop mode and render the video into a <code>TextureView</code> on Android:</p>
${code(`<View style={{ flex: 1 }}>
  <VideoView player={player} surfaceType="textureView" style={StyleSheet.absoluteFill} />

  <BlurView mode="backdrop" intensity={85} tint="dark" style={{ borderRadius: 999, paddingVertical: 12, alignItems: "center" }}>
    <Text style={{ color: "white" }}>Play</Text>
  </BlurView>
</View>`)}
<p>With <code>react-native-video</code>, render into a <code>TextureView</code> on Android (<code>viewType={ViewType.TEXTURE}</code>, or <code>useTextureView</code> in older versions).</p>

<h2>Limits</h2>
<ul>
  <li>Video copies are made every frame at quarter resolution. The blurred video trails the real one by one or two frames.</li>
  <li>Backdrop mode copies a <code>SurfaceView</code> behind it with <code>PixelCopy</code>; a <code>TextureView</code> is drawn directly.</li>
</ul>`,
    faq: [
      ["Why doesn't expo-blur blur my video on Android?", "Android video plays in a SurfaceView, which the system composites outside the app's view tree. View-based blurs never see it. This library copies SurfaceView frames with PixelCopy and blurs the copy."],
      ["Does it work with react-native-video?", "Yes. Wrap the Video in a BlurView for content mode. For backdrop mode over the video, render it into a TextureView (<code>viewType={ViewType.TEXTURE}</code>)."],
      ...COMMON_FAQ,
    ],
  },
  {
    slug: "blur-modal-background/",
    title: "Blur the background behind a modal or bottom sheet in React Native",
    nav: "Modal background",
    description: "Blur the screen behind a modal, popup or bottom sheet in React Native and Expo on iOS and Android, with sharp modal content on top.",
    h1: "Blur the background behind a modal in React Native",
    lede: "Dim and blur the screen behind a modal, popup or bottom sheet while the modal content stays sharp, on both iOS and Android.",
    body: `
<h2>Install</h2>
${INSTALL}

<h2>In-screen overlay (iOS and Android)</h2>
<p>Render the overlay in the same screen, absolutely positioned, and put a backdrop <code>BlurView</code> behind its content:</p>
${code(`import BlurView from "${PKG}";

<View style={{ flex: 1 }}>
  <Screen />
  {visible && (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={StyleSheet.absoluteFill} onPress={close}>
        <BlurView mode="backdrop" intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
      </Pressable>
      <ModalCard />
    </View>
  )}
</View>`)}

<h2>Animate the blur in</h2>
<p>Keep the <code>BlurView</code> mounted and drive <code>intensity</code>; every value from 0 to 100 is a real blur, not an opacity fade.</p>
${code(`const [intensity, setIntensity] = useState(0);
useEffect(() => setIntensity(visible ? 60 : 0), [visible]);

<BlurView mode="backdrop" intensity={intensity} style={StyleSheet.absoluteFill} />`)}

<h2>Bottom sheet backdrop</h2>
<p>Libraries such as <code>@gorhom/bottom-sheet</code> render in the same window, so a backdrop <code>BlurView</code> works as the sheet's backdrop component:</p>
${code(`<BottomSheet
  backdropComponent={({ style }) => (
    <BlurView mode="backdrop" intensity={50} tint="systemMaterial" style={[style, StyleSheet.absoluteFill]} />
  )}
>
  {content}
</BottomSheet>`)}

<h2>Inside React Native &lt;Modal&gt;</h2>
<p>Backdrop mode also works inside <code>&lt;Modal transparent&gt;</code> on iOS and Android. Keep the modal's root view transparent, or the blur only sees that background:</p>
${code(`<Modal transparent visible={visible}>
  <View style={{ flex: 1 }}>
    <BlurView mode="backdrop" intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
    <ModalCard />
  </View>
</Modal>`)}
<p>On Android a <code>&lt;Modal&gt;</code> is a separate window. The library copies the activity window behind it with <code>PixelCopy</code> (about 30 fps, half resolution) and blurs the copy, so the screen behind the modal is blurred like on iOS.</p>`,
    faq: [
      ["Does backdrop blur work inside React Native Modal on Android?", "Yes, since 2.1. Use <code>&lt;Modal transparent&gt;</code> with a transparent root view. The screen behind the modal window is copied with PixelCopy and blurred."],
      ...COMMON_FAQ,
    ],
  },
  {
    slug: "expo-blur-alternative/",
    title: "expo-blur alternative for React Native: compared with @react-native-community/blur",
    nav: "vs expo-blur",
    description: "Comparison of @nguyenduy1412/react-native-blur, expo-blur and @react-native-community/blur: Android video blur, backdrop overlays, iOS-matched Android materials and New Architecture support.",
    h1: "An expo-blur alternative for React Native",
    lede: "How @nguyenduy1412/react-native-blur compares with expo-blur and @react-native-community/blur, and when each one fits.",
    body: `
<h2>Comparison</h2>
<table>
  <thead><tr><th>Feature</th><th>@nguyenduy1412/react-native-blur</th><th>expo-blur</th><th>@react-native-community/blur</th></tr></thead>
  <tbody>
    <tr><td>New Architecture (Fabric)</td><td>Native Fabric component</td><td>Expo Module</td><td>Legacy bridge</td></tr>
    <tr><td>Blurs playing video on Android (SurfaceView)</td><td>Yes (PixelCopy + RenderEffect)</td><td>No, video stays sharp</td><td>No, video stays sharp</td></tr>
    <tr><td>Backdrop overlays (headers, tab bars, popups)</td><td>Yes, <code>mode="backdrop"</code></td><td>Limited on Android</td><td>Platform differences</td></tr>
    <tr><td>Android look matched to iOS materials</td><td>Colour-calibrated (1.95 / 255 mean error)</td><td>Flat tint</td><td>Flat tint</td></tr>
    <tr><td>React Native CLI without Expo</td><td>Yes</td><td>Needs Expo Modules</td><td>Yes</td></tr>
    <tr><td>Expo Go</td><td>No (development build)</td><td>Yes</td><td>No</td></tr>
  </tbody>
</table>

<figure>
  <img src="${ASSETS}blur-comparison.jpg" loading="lazy" width="1520" height="784" alt="The same screen with no blur, this library on Android, this library on iOS, and expo-blur on Android" />
  <figcaption>From left: no blur, this library on Android, this library on iOS, expo-blur on Android.</figcaption>
</figure>

<h2>When to pick which</h2>
<ul>
  <li><strong>Pick this library</strong> when Android has to look like iOS, when you blur video, or when you need frosted overlays that blur what is behind them on Android.</li>
  <li><strong>Pick expo-blur</strong> when you must run in Expo Go, or when you only target iOS.</li>
</ul>

<h2>Migrating from expo-blur</h2>
<p>The props are close to expo-blur's. Change the import, and add <code>mode="backdrop"</code> where the BlurView sits over other views:</p>
${code(`- import { BlurView } from "expo-blur";
+ import BlurView from "${PKG}";

- <BlurView intensity={80} tint="systemMaterial" style={styles.header}>
+ <BlurView mode="backdrop" intensity={80} tint="systemMaterial" style={styles.header}>`, "diff")}
<p>expo-blur's <code>tint</code> names (<code>light</code>, <code>dark</code>, <code>default</code>, <code>prominent</code>, <code>system*Material</code>) are supported.</p>

<h2>Migrating from @react-native-community/blur</h2>
${code(`- import { BlurView } from "@react-native-community/blur";
+ import BlurView from "${PKG}";

- <BlurView blurType="dark" blurAmount={10} style={styles.card} />
+ <BlurView mode="backdrop" tint="dark" intensity={60} style={styles.card} />`, "diff")}

<h2>Install</h2>
${INSTALL}`,
    faq: [
      ["What is the best blur library for React Native?", "For Expo Go or iOS-only apps, expo-blur is the simplest. When Android must match iOS, when you blur video, or when you need frosted overlays on Android, @nguyenduy1412/react-native-blur covers those cases."],
      ["Does it support the New Architecture?", "Yes, and it requires it. @nguyenduy1412/react-native-blur is a Fabric native component generated with React Native Codegen."],
      ...COMMON_FAQ,
    ],
  },
  {
    slug: "common-blur-issues/",
    title: "Common React Native blur issues and fixes (expo-blur, @react-native-community/blur)",
    nav: "Common issues",
    description: "Fixes for the most reported React Native blur problems: video stays sharp on Android, grey flat Android blur, blur inside Modal, New Architecture crashes, BlurView 2.0.3 build failures, animating intensity and more.",
    h1: "Common React Native blur issues and how to fix them",
    lede: "The problems developers report most often in expo-blur and @react-native-community/blur, why they happen, and how @nguyenduy1412/react-native-blur handles each one.",
    body: `
<table>
  <thead><tr><th>Problem</th><th>Why it happens</th><th>In this library</th></tr></thead>
  <tbody>
    <tr><td>Video stays sharp behind the blur on Android</td><td>Players draw into a <code>SurfaceView</code>, outside the view tree</td><td>SurfaceView frames are copied with PixelCopy and blurred</td></tr>
    <tr><td>Android blur looks grey and flat</td><td>One Gaussian blur plus a flat tint</td><td>Per-material colour matrix calibrated against iOS (1.95 / 255 mean error)</td></tr>
    <tr><td>Overlay shows only a tint on Android</td><td>A view-based blur over other views has nothing of its own to blur</td><td><code>mode="backdrop"</code> records and blurs what is behind the view</td></tr>
    <tr><td>Blur does not work inside <code>&lt;Modal&gt;</code> on Android</td><td>Modal is a separate window</td><td>The activity window is copied with PixelCopy and blurred</td></tr>
    <tr><td>Crashes or "not found in UIManager" on the New Architecture</td><td>Legacy bridge components</td><td>Native Fabric component generated with Codegen</td></tr>
    <tr><td>Build fails: <code>Could not find BlurView-version-2.0.3.aar</code></td><td>Dependency on a JitPack artifact</td><td>No third-party native dependencies</td></tr>
    <tr><td>Android 15 16 KB page size warnings</td><td>Prebuilt native <code>.so</code> libraries</td><td>Pure Kotlin and Swift, no native libraries</td></tr>
    <tr><td>Cannot animate <code>intensity</code> with Reanimated</td><td>Ref or props land on a wrapper view</td><td>The ref is forwarded to the native view; <code>useAnimatedProps</code> works</td></tr>
    <tr><td>Blur ignores the app's dark mode override on Android</td><td>Night-mode overrides are not dispatched to views</td><td>The current <code>Appearance</code> scheme is passed to the native view</td></tr>
    <tr><td><code>borderTopLeftRadius</code> and other corners ignored</td><td>Only a uniform radius is applied</td><td>Per-corner radii clip the blur, tint and rim</td></tr>
    <tr><td>Backdrop freezes while scrolling on Android 12</td><td>Android 12 caches the blurred layer of a reused RenderNode</td><td>A fresh RenderNode per frame on API 31-32</td></tr>
    <tr><td>Blur strength changes after navigation or returning from background (iOS)</td><td>The paused animator behind <code>intensity</code> is reset</td><td>The effect is rebuilt when the view re-enters a window or the app returns to the foreground</td></tr>
    <tr><td>Android 11 and older show an unreadable overlay</td><td>No RenderEffect, and no fallback</td><td>A translucent plate in the material's colour</td></tr>
  </tbody>
</table>

<h2>Animate intensity with Reanimated</h2>
${code(`import Animated, { useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import BlurView from "${PKG}";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

function Overlay({ visible }) {
  const intensity = useSharedValue(0);
  useEffect(() => {
    intensity.value = withTiming(visible ? 80 : 0);
  }, [visible]);
  const animatedProps = useAnimatedProps(() => ({ intensity: intensity.value }));
  return <AnimatedBlurView mode="backdrop" animatedProps={animatedProps} style={StyleSheet.absoluteFill} />;
}`)}

<h2>Install</h2>
${INSTALL}`,
    faq: [
      ["Why is my BlurView grey on Android?", "Either the BlurView sits over other views in content mode (use <code>mode=\"backdrop\"</code>), the device runs Android 11 or earlier (no RenderEffect), or the library applies a flat tint. This library rebuilds iOS materials with a calibrated colour matrix."],
      ["How do I fix 'Could not find BlurView-version-2.0.3.aar'?", "That error comes from libraries depending on Dimezis BlurView from JitPack. This library has no third-party native dependencies."],
      ...COMMON_FAQ,
    ],
  },
];

const CSS = `:root{--bg:#fbfbfd;--fg:#1d1d1f;--muted:#5f6368;--line:#e3e4e8;--card:#fff;--code:#f2f3f5;--accent:#0a66d8}
@media (prefers-color-scheme:dark){:root{--bg:#0b0d12;--fg:#e8eaed;--muted:#9aa0a6;--line:#262a33;--card:#12151c;--code:#161a22;--accent:#6aa8ff}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
a{color:var(--accent)}
header.top{border-bottom:1px solid var(--line);background:var(--card)}
header.top .in,main,footer .in{max-width:880px;margin:0 auto;padding:0 16px}
header.top .in{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;min-height:56px}
header.top .brand{font-weight:700;color:var(--fg);text-decoration:none;margin-right:auto}
header.top nav a{color:var(--muted);text-decoration:none;font-size:14px}header.top nav{display:flex;flex-wrap:wrap;gap:6px 16px}
header.top nav a[aria-current]{color:var(--fg);font-weight:600}
main{padding-top:32px;padding-bottom:48px}
h1{font-size:clamp(28px,5vw,40px);line-height:1.15;margin:0 0 12px}
.lede{font-size:18px;color:var(--muted);margin:0 0 20px}
.cta{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 28px}.cta a{padding:8px 14px;border:1px solid var(--line);border-radius:8px;text-decoration:none;background:var(--card);font-size:14px}
h2{font-size:24px;margin:40px 0 12px;padding-top:8px;border-top:1px solid var(--line)}h3{font-size:18px;margin:24px 0 8px}
pre{background:var(--code);border:1px solid var(--line);border-radius:8px;padding:14px;overflow-x:auto;font-size:13.5px;line-height:1.5}
code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.92em}p code,li code,td code{background:var(--code);padding:1px 5px;border-radius:4px}
table{width:100%;border-collapse:collapse;font-size:14px;display:block;overflow-x:auto}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}th{white-space:nowrap}
figure{margin:24px 0}figure img{width:100%;height:auto;border-radius:10px;border:1px solid var(--line)}figcaption{font-size:13px;color:var(--muted);margin-top:6px}
.cards{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
.cards a{display:block;height:100%;padding:14px;border:1px solid var(--line);border-radius:10px;background:var(--card);text-decoration:none;color:var(--fg)}.cards span{display:block;color:var(--muted);font-size:14px;margin-top:4px}
details{border:1px solid var(--line);border-radius:8px;padding:10px 14px;margin:8px 0;background:var(--card)}summary{cursor:pointer;font-weight:600}
footer{border-top:1px solid var(--line);color:var(--muted);font-size:14px}footer .in{padding-top:20px;padding-bottom:28px}`;

function render(page) {
  const url = SITE + page.slug;
  const depth = page.slug ? "../" : "";
  const nav = pages
    .map((p) => `<a href="${depth}${p.slug}"${p === page ? ' aria-current="page"' : ""}>${p.nav}</a>`)
    .join("");
  const faqHtml = page.faq
    .map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${a}</p></details>`)
    .join("\n");
  const graph = [
    {
      "@type": "SoftwareSourceCode",
      "@id": SITE + "#software",
      name: PKG,
      alternateName: "React Native Blur",
      description: pkg.description,
      codeRepository: REPO,
      programmingLanguage: ["TypeScript", "Swift", "Kotlin", "Objective-C++"],
      runtimePlatform: ["React Native", "Expo", "iOS", "Android", "Web"],
      license: "https://opensource.org/licenses/MIT",
      version: pkg.version,
      keywords: pkg.keywords.join(", "),
      url: SITE,
      sameAs: [REPO, NPM],
      author: { "@type": "Person", name: "nguyenduy1412", url: "https://github.com/nguyenduy1412" },
    },
    {
      "@type": "TechArticle",
      headline: page.title,
      description: page.description,
      url,
      dateModified: TODAY,
      inLanguage: "en",
      about: { "@id": SITE + "#software" },
      author: { "@type": "Person", name: "nguyenduy1412", url: "https://github.com/nguyenduy1412" },
    },
    {
      "@type": "FAQPage",
      mainEntity: page.faq.map(([q, a]) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: stripTags(a) },
      })),
    },
  ];
  if (page.slug) {
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "React Native Blur", item: SITE },
        { "@type": "ListItem", position: 2, name: page.nav, item: url },
      ],
    });
  }
  const jsonLd = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}" />
<meta name="keywords" content="${esc(pkg.keywords.join(", "))}" />
<meta name="robots" content="index,follow,max-image-preview:large" />
<link rel="canonical" href="${url}" />
<link rel="alternate" type="text/plain" title="llms.txt" href="${SITE}llms.txt" />
<meta name="theme-color" content="#0b0d12" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="React Native Blur" />
<meta property="og:title" content="${esc(page.title)}" />
<meta property="og:description" content="${esc(page.description)}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${SITE}og.png" />
<meta property="og:image:width" content="1280" />
<meta property="og:image:height" content="640" />
<meta property="og:image:alt" content="React Native Blur: frosted glass for iOS and Android" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(page.title)}" />
<meta name="twitter:description" content="${esc(page.description)}" />
<meta name="twitter:image" content="${SITE}og.png" />
<script type="application/ld+json">${jsonLd}</script>
<style>${CSS}</style>
</head>
<body>
<header class="top"><div class="in"><a class="brand" href="${depth || "./"}">React Native Blur</a><nav aria-label="Guides">${nav}</nav></div></header>
<main>
<h1>${page.h1}</h1>
<p class="lede">${page.lede}</p>
<p class="cta"><a href="${REPO}">GitHub</a><a href="${NPM}">npm</a><a href="${REPO}/blob/main/CHANGELOG.md">Changelog</a><a href="${depth}llms.txt">llms.txt</a></p>
${page.body}
<h2 id="faq">FAQ</h2>
${faqHtml}
</main>
<footer><div class="in"><code>${PKG}</code> v${pkg.version} · MIT · <a href="${REPO}">GitHub</a> · <a href="${NPM}">npm</a> · by <a href="https://kaizer-app.vercel.app">nguyenduy1412</a> · Updated ${TODAY}</div></footer>
</body>
</html>
`;
}

fs.mkdirSync(out, { recursive: true });
for (const page of pages) {
  const dir = path.join(out, page.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), render(page));
}

fs.writeFileSync(
  path.join(out, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${SITE}${p.slug}</loc><lastmod>${TODAY}</lastmod></url>`).join("\n")}
</urlset>
`,
);

for (const f of ["llms.txt", "llms-full.txt"]) {
  fs.copyFileSync(path.join(root, f), path.join(out, f));
}
fs.writeFileSync(path.join(out, ".nojekyll"), "");

console.log(`Built ${pages.length} pages into docs/`);
