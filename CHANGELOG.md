# Changelog

All notable changes to `@nguyenduy1412/react-native-blur` are listed here. The project follows [Semantic Versioning](https://semver.org).

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
