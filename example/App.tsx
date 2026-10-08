import React, { useEffect, useState } from 'react';
import {
  Appearance,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  requireNativeComponent,
  type ColorSchemeName,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Video, { ViewType } from 'react-native-video';
import BlurView, { type BlurTint } from '@nguyenduy1412/react-native-blur';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

// Android-only native TextureView video player (example/android/.../texturevideo).
// react-native-video 6.19 always renders into a SurfaceView on Android.
const TextureVideoView =
  Platform.OS === 'android'
    ? requireNativeComponent<{ paused?: boolean; style?: StyleProp<ViewStyle> }>('TextureVideoView')
    : null;

const VIDEO_SOURCE = Platform.select({
  ios: { uri: 'sample', type: 'mp4' },
  android: { uri: 'sample' },
  default: { uri: 'sample' },
});

// 60 fps test pattern (Android only, res/raw/sample60.mp4).
const VIDEO_SOURCE_60 = Platform.select({ android: { uri: 'sample60' }, default: VIDEO_SOURCE });

const COLORS = [
  '#ff3b30',
  '#ff9500',
  '#ffcc00',
  '#34c759',
  '#00c7be',
  '#007aff',
  '#5856d6',
  '#af52de',
  '#ff2d55',
];

function ColorfulBackground({ height = 220, count = 6, label = 'Row' }: { height?: number; count?: number; label?: string }) {
  const rowHeight = height / count;
  return (
    <View style={[styles.colorBackdrop, { height }]}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[
            styles.stripe,
            { height: rowHeight, backgroundColor: COLORS[i % COLORS.length] },
          ]}
        >
          <Text style={styles.stripeText}>
            {label} {i + 1} · THE QUICK BROWN FOX JUMPS
          </Text>
        </View>
      ))}
    </View>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

export default function App() {
  const scrollRef = React.useRef<ScrollView>(null);
  const [scheme, setScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme() ?? 'light'
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [animVal, setAnimVal] = useState(10);

  const animatedIntensity = useSharedValue(10);
  useEffect(() => {
    animatedIntensity.value = withTiming(animVal, { duration: 450 });
  }, [animVal, animatedIntensity]);

  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      const url = event?.url;
      if (!url) return;
      if (url.includes('modal=true') || url.includes('modal=1')) {
        setModalVisible(true);
      } else if (url.includes('modal=false') || url.includes('modal=0')) {
        setModalVisible(false);
      }
      if (url.includes('theme=dark')) {
        setScheme('dark');
        Appearance.setColorScheme('dark');
      } else if (url.includes('theme=light')) {
        setScheme('light');
        Appearance.setColorScheme('light');
      }
      const matchY = url.match(/[?&]y=(\d+)/);
      if (matchY) {
        const y = parseInt(matchY[1], 10);
        scrollRef.current?.scrollTo({ y, animated: false });
      }
      if (url.includes('play=1')) {
        setPlayAll(true);
        setVideo6Paused(false);
        setVideo7Paused(false);
      }
      if (url.includes('play=7')) {
        setPlayAll(false);
        setVideo6Paused(true);
        setVideo7Paused(false);
      }
      if (url.includes('v60=1')) setVideo60(true);
      if (url.includes('v60=0')) setVideo60(false);
      if (url.includes('sync=0')) setSyncVideo(false);
      if (url.includes('sync=1')) setSyncVideo(true);
      if (url.includes('play=6')) {
        setPlayAll(false);
        setVideo6Paused(false);
        setVideo7Paused(true);
        setVideo9Paused(true);
      }
      if (url.includes('play=9')) {
        setPlayAll(false);
        setVideo6Paused(true);
        setVideo7Paused(true);
        setVideo9Paused(false);
      }
      if (url.includes('play=7') || url.includes('play=8')) setVideo9Paused(true);
      if (url.includes('play=8')) {
        setPlayAll(true);
        setVideo6Paused(true);
        setVideo7Paused(true);
      }
      if (url.includes('only8=1')) setOnly8(true);
      if (url.includes('only8=0')) setOnly8(false);
      const matchI8 = url.match(/[?&]i8=(\d+)/);
      if (matchI8) setIntensity8(parseInt(matchI8[1], 10));
      const matchMode = url.match(/[?&]mode=(split|full|sharp)/);
      if (matchMode) setBlurEffectMode(matchMode[1] as 'split' | 'full' | 'sharp');
      const matchAnim = url.match(/[?&]anim=(\d+)/);
      if (matchAnim) {
        setAnimVal(parseInt(matchAnim[1], 10));
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });
    const sub = Linking.addEventListener('url', handleUrl);
    // Test driver: polls a local server for the current deep link so the
    // three simulators can be driven without the iOS "Open in" prompt.
    let last = '';
    const timer = setInterval(() => {
      fetch(`http://localhost:8099/route.txt?${Date.now()}`)
        .then((r) => (r.ok ? r.text() : ''))
        .then((text) => {
          const url = text.trim();
          if (url && url !== last) {
            last = url;
            handleUrl({ url });
          }
        })
        .catch(() => {});
    }, 300);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);

  const [videoBlurIntensity, setVideoBlurIntensity] = useState(10);
  const [videoTint, setVideoTint] = useState<BlurTint>('systemMaterial');
  const [video6Paused, setVideo6Paused] = useState(true);
  const [video7Paused, setVideo7Paused] = useState(false);
  const [blurEffectMode, setBlurEffectMode] = useState<'split' | 'full' | 'sharp'>('split');
  const [playAll, setPlayAll] = useState(false);
  const [intensity8, setIntensity8] = useState(10);
  const [only8, setOnly8] = useState(false);
  const [video9Paused, setVideo9Paused] = useState(false);
  const [syncVideo, setSyncVideo] = useState(true);
  const [video60, setVideo60] = useState(false);

  const animatedProps = useAnimatedProps(() => ({
    intensity: animatedIntensity.value,
  }));

  const toggleTheme = () => {
    const next = scheme === 'dark' ? 'light' : 'dark';
    Appearance.setColorScheme(next);
    setScheme(next);
  };

  const scrollToVideo = () => {
    scrollRef.current?.scrollTo({ y: 1550, animated: true });
  };

  return (
    <View style={styles.fill}>
      <StatusBar
        barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
      />

      {/* FULL SCROLLVIEW OF ALL BLUR USE-CASES */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO TITLE CARD */}
        <View style={styles.heroWrapper}>
          <ColorfulBackground height={120} count={3} label="Intro" />
          <BlurView
            mode="backdrop" syncVideo={syncVideo}
            intensity={10}
            tint="systemMaterial"
            style={styles.heroCard}
          >
            <Text style={styles.heroBadge}>REACT NATIVE BLUR</Text>
            <Text style={styles.heroTitle}>All Features Showcase</Text>
            <Text style={styles.heroDesc}>
              Toàn bộ tính năng BlurView trên 1 màn hình cuộn: Materials, Custom
              Tints, Bo từng góc, Content Mode, Animation & Modal.
            </Text>
          </BlurView>
        </View>

        {/* 1. APPLE MATERIAL RECIPES */}
        <SectionHeading
          title="1. Apple Material Recipes (Backdrop Mode)"
          subtitle="Các cấp độ kính mờ Liquid Glass chuẩn Apple với viền Specular Rim"
        />
        <View style={styles.featureBlock}>
          <ColorfulBackground height={360} count={9} label="Material" />
          <View style={styles.overlayCards}>
            <BlurView
              mode="backdrop" syncVideo={syncVideo}
              intensity={10}
              tint="systemUltraThinMaterial"
              style={styles.glassCard}
            >
              <Text style={styles.cardTitle}>systemUltraThinMaterial</Text>
              <Text style={styles.cardSub}>Ultra-thin Liquid Glass · Trong suốt cao nhất</Text>
            </BlurView>

            <BlurView
              mode="backdrop" syncVideo={syncVideo}
              intensity={10}
              tint="systemThinMaterial"
              style={styles.glassCard}
            >
              <Text style={styles.cardTitle}>systemThinMaterial</Text>
              <Text style={styles.cardSub}>Thin Frost · Kính mờ nhẹ thanh lịch</Text>
            </BlurView>

            <BlurView
              mode="backdrop" syncVideo={syncVideo}
              intensity={10}
              tint="systemMaterial"
              style={styles.glassCard}
            >
              <Text style={styles.cardTitle}>systemMaterial (Default)</Text>
              <Text style={styles.cardSub}>Regular Material · Cân bằng độ mờ và tương phản</Text>
            </BlurView>

            <BlurView
              mode="backdrop" syncVideo={syncVideo}
              intensity={10}
              tint="systemThickMaterial"
              style={styles.glassCard}
            >
              <Text style={styles.cardTitle}>systemThickMaterial</Text>
              <Text style={styles.cardSub}>Thick Frost · Lớp phủ dày, bảo vệ độ đọc chữ</Text>
            </BlurView>

            <BlurView
              mode="backdrop" syncVideo={syncVideo}
              intensity={10}
              tint="systemChromeMaterial"
              style={styles.glassCard}
            >
              <Text style={styles.cardTitle}>systemChromeMaterial</Text>
              <Text style={styles.cardSub}>Chrome Material · Tăng bão hòa sắc độ</Text>
            </BlurView>

            <View style={styles.rowTwo}>
              <BlurView
                mode="backdrop" syncVideo={syncVideo}
                intensity={10}
                tint="light"
                style={[styles.glassCard, styles.half]}
              >
                <Text style={styles.cardTitle}>tint="light"</Text>
                <Text style={styles.cardSub}>Phong cách sáng</Text>
              </BlurView>
              <BlurView
                mode="backdrop" syncVideo={syncVideo}
                intensity={10}
                tint="dark"
                style={[styles.glassCard, styles.half]}
              >
                <Text style={styles.cardTitle}>tint="dark"</Text>
                <Text style={styles.cardSub}>Phong cách tối</Text>
              </BlurView>
            </View>
          </View>
        </View>

        {/* 2. CUSTOM TINT COLORS & ALPHA */}
        <SectionHeading
          title="2. Custom Tint Colors & Alpha"
          subtitle="tintColor hỗ trợ rgba, hex #RRGGBBAA và tên màu CSS"
        />
        <View style={styles.featureBlock}>
          <ColorfulBackground height={260} count={6} label="Color Tint" />
          <View style={styles.overlayCards}>
            <BlurView
              mode="backdrop" syncVideo={syncVideo}
              intensity={10}
              tint="systemMaterial"
              tintColor="rgba(255, 59, 48, 0.35)"
              style={styles.glassCard}
            >
              <Text style={styles.cardTitle}>tintColor="rgba(255, 59, 48, 0.35)"</Text>
              <Text style={styles.cardSub}>Ánh đỏ Apple Red phủ đều qua lớp kính mờ</Text>
            </BlurView>

            <BlurView
              mode="backdrop" syncVideo={syncVideo}
              intensity={10}
              tint="systemMaterial"
              tintColor="#00c7be60"
              style={styles.glassCard}
            >
              <Text style={styles.cardTitle}>tintColor="#00c7be60"</Text>
              <Text style={styles.cardSub}>Màu xanh Teal ngọc lục bảo (hex + alpha)</Text>
            </BlurView>

            <BlurView
              mode="backdrop" syncVideo={syncVideo}
              intensity={10}
              tint="systemMaterial"
              tintColor="rgba(88, 86, 214, 0.45)"
              style={styles.glassCard}
            >
              <Text style={styles.cardTitle}>tintColor="rgba(88, 86, 214, 0.45)"</Text>
              <Text style={styles.cardSub}>Sắc tím Indigo Violet huyền bí</Text>
            </BlurView>
          </View>
        </View>

        {/* 3. INDEPENDENT CORNER RADII */}
        <SectionHeading
          title="3. Independent Corner Radii"
          subtitle="Bo từng góc riêng biệt (top-left, top-right, bottom-right, bottom-left)"
        />
        <View style={styles.featureBlock}>
          <ColorfulBackground height={210} count={5} label="Corners" />
          <View style={styles.overlayCards}>
            <BlurView
              mode="backdrop" syncVideo={syncVideo}
              intensity={10}
              tint="systemThinMaterial"
              style={[
                styles.glassCard,
                {
                  borderTopLeftRadius: 48,
                  borderBottomRightRadius: 48,
                  borderTopRightRadius: 8,
                  borderBottomLeftRadius: 8,
                },
              ]}
            >
              <Text style={styles.cardTitle}>Asymmetric Corners</Text>
              <Text style={styles.cardSub}>TL: 48px · BR: 48px · TR: 8px · BL: 8px</Text>
            </BlurView>

            <BlurView
              mode="backdrop" syncVideo={syncVideo}
              intensity={10}
              tint="systemThinMaterial"
              style={[styles.glassCard, { borderRadius: 36 }]}
            >
              <Text style={styles.cardTitle}>Pill / Capsule (Uniform 36px)</Text>
              <Text style={styles.cardSub}>Bo tròn đều toàn bộ 4 góc</Text>
            </BlurView>
          </View>
        </View>

        {/* 4. CONTENT MODE VS BACKDROP MODE */}
        <SectionHeading
          title="4. Content Mode vs Backdrop Mode"
          subtitle="So sánh giữa làm mờ thành phần bên trong và làm mờ nền phía sau"
        />
        <View style={styles.rowTwo}>
          {/* Content Mode */}
          <View style={[styles.compareCard, styles.half]}>
            <Text style={styles.compareTitle}>Content Mode</Text>
            <BlurView
              mode="content"
              intensity={10}
              tint="systemMaterial"
              style={styles.compareBlur}
            >
              <View style={styles.innerBox}>
                <Text style={styles.innerBold}>Inner Content</Text>
                <Text style={styles.innerSub}>Chữ bị làm mờ</Text>
                <View style={styles.tagPill}>
                  <Text style={styles.tagText}>BLURRED</Text>
                </View>
              </View>
            </BlurView>
            <Text style={styles.compareDesc}>
              Làm mờ view con nằm bên trong component.
            </Text>
          </View>

          {/* Backdrop Mode */}
          <View style={[styles.compareCard, styles.half]}>
            <Text style={styles.compareTitle}>Backdrop Mode</Text>
            <View style={styles.backdropCompareWrapper}>
              <ColorfulBackground height={110} count={3} label="Under" />
              <BlurView
                mode="backdrop" syncVideo={syncVideo}
                intensity={10}
                tint="systemMaterial"
                style={StyleSheet.absoluteFill}
              >
                <View style={styles.innerBox}>
                  <Text style={styles.innerBold}>Frosted Glass</Text>
                  <Text style={styles.innerSub}>Kính mờ phía trên</Text>
                  <View style={[styles.tagPill, { backgroundColor: '#34c759' }]}>
                    <Text style={styles.tagText}>FROSTED</Text>
                  </View>
                </View>
              </BlurView>
            </View>
            <Text style={styles.compareDesc}>
              Làm mờ các view con nằm bên dưới kính.
            </Text>
          </View>
        </View>

        {/* 5. DYNAMIC REANIMATED INTENSITY */}
        <SectionHeading
          title="5. Reanimated Dynamic Intensity"
          subtitle="Điều chỉnh cường độ blur mượt mà qua React Native Reanimated"
        />
        <View style={styles.featureBlock}>
          <ColorfulBackground height={160} count={4} label="Dynamic" />
          <View style={styles.overlayCards}>
            <AnimatedBlurView
              mode="backdrop" syncVideo={syncVideo}
              tint="systemMaterial"
              animatedProps={animatedProps}
              style={styles.glassCard}
            >
              <Text style={styles.cardTitle}>Dynamic Intensity: {animVal}%</Text>
              <Text style={styles.cardSub}>
                Reanimated useAnimatedProps chuyển đổi mượt mà không khựng hình.
              </Text>
              <View style={styles.btnRow}>
                {[10, 20, 50, 100].map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[
                      styles.smallBtn,
                      animVal === v && styles.smallBtnActive,
                    ]}
                    onPress={() => setAnimVal(v)}
                  >
                    <Text
                      style={[
                        styles.smallBtnText,
                        animVal === v && styles.smallBtnTextActive,
                      ]}
                    >
                      {v}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </AnimatedBlurView>
          </View>
        </View>

        {/* 6. LIVE VIDEO BLUR (sample.mp4) */}
        <SectionHeading
          title="6. Live Video Blur (sample.mp4)"
          subtitle="Video Mercedes-Benz phát trực tiếp trên màn hình chính với Backdrop & Content Blur"
        />

        {/* Card: Live Video Player (sample.mp4) */}
        <View style={styles.videoContainer}>
          <Video
            source={VIDEO_SOURCE}
            style={styles.videoPlayer}
            resizeMode="cover"
            repeat
            muted
            paused={video6Paused}
            viewType={ViewType.TEXTURE}
          />

          {/* Dynamic Overlay Modes */}
          {blurEffectMode === 'split' && (
            <View style={styles.videoSplitOverlay} pointerEvents="none">
              <View style={styles.videoSplitLeft}>
                <View style={styles.splitTag}>
                  <Text style={styles.splitTagText}>GỐC (SHARP)</Text>
                </View>
              </View>
              <BlurView
                mode="backdrop" syncVideo={syncVideo}
                intensity={videoBlurIntensity}
                tint={videoTint}
                style={styles.videoSplitRight}
              >
                <View style={styles.splitTag}>
                  <Text style={styles.splitTagText}>BACKDROP BLUR</Text>
                </View>
              </BlurView>
            </View>
          )}

          {blurEffectMode === 'full' && (
            <BlurView
              mode="backdrop" syncVideo={syncVideo}
              intensity={videoBlurIntensity}
              tint={videoTint}
              style={[StyleSheet.absoluteFill, styles.videoFullBlurOverlay]}
              pointerEvents="none"
            >
              <View style={styles.splitTag}>
                <Text style={styles.splitTagText}>TOÀN PHẦN KÍNH MỜ (10%)</Text>
              </View>
            </BlurView>
          )}

          {blurEffectMode === 'sharp' && (
            <View style={styles.videoSharpOverlay} pointerEvents="none">
              <View style={styles.splitTag}>
                <Text style={styles.splitTagText}>VIDEO GỐC (KHÔNG BLUR)</Text>
              </View>
            </View>
          )}

          {/* Floating Glass Control Card */}
          <BlurView
            mode="backdrop" syncVideo={syncVideo}
            intensity={10}
            tint="systemUltraThinMaterial"
            style={styles.videoFloatingCard}
          >
            <View style={styles.videoCardHeader}>
              <View style={styles.videoHeaderLeft}>
                <View style={[styles.liveDot, video6Paused && styles.liveDotPaused]} />
                <Text style={styles.videoCardBadge}>
                  {video6Paused ? 'TẠM DỪNG' : 'ĐANG PHÁT'} · sample.mp4
                </Text>
              </View>
              <Text style={styles.videoCardInfo}>
                {videoBlurIntensity}% · {videoTint}
              </Text>
            </View>

            {/* Mode Selector Row */}
            <View style={styles.videoModeRow}>
              <TouchableOpacity
                style={[styles.modeBtn, blurEffectMode === 'split' && styles.modeBtnActive]}
                onPress={() => setBlurEffectMode('split')}
              >
                <Text style={[styles.modeBtnText, blurEffectMode === 'split' && styles.modeBtnTextActive]}>
                  🌓 Cắt đôi (Split)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, blurEffectMode === 'full' && styles.modeBtnActive]}
                onPress={() => setBlurEffectMode('full')}
              >
                <Text style={[styles.modeBtnText, blurEffectMode === 'full' && styles.modeBtnTextActive]}>
                  🌫 Mờ toàn màn
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, blurEffectMode === 'sharp' && styles.modeBtnActive]}
                onPress={() => setBlurEffectMode('sharp')}
              >
                <Text style={[styles.modeBtnText, blurEffectMode === 'sharp' && styles.modeBtnTextActive]}>
                  ✨ Video gốc
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick Controls Row */}
            <View style={styles.videoControlsRow}>
              <TouchableOpacity
                style={styles.videoBtn}
                onPress={() =>
                  setVideoBlurIntensity((prev) =>
                    prev === 20 ? 50 : prev === 50 ? 80 : 20
                  )
                }
              >
                <Text style={styles.videoBtnText}>Độ mờ: {videoBlurIntensity}%</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.videoBtn}
                onPress={() =>
                  setVideoTint((prev) =>
                    prev === 'systemMaterial'
                      ? 'dark'
                      : prev === 'dark'
                      ? 'light'
                      : 'systemMaterial'
                  )
                }
              >
                <Text style={styles.videoBtnText}>Màu: {videoTint}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.videoBtn, video6Paused && styles.videoBtnPaused]}
                onPress={() => setVideo6Paused((prev) => !prev)}
              >
                <Text style={styles.videoBtnText}>
                  {video6Paused ? '▶ Tiếp tục' : '⏸ Tạm dừng'}
                </Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>

        {/* Specs and Performance Info */}
        <View style={styles.videoSpecsCard}>
          <Text style={styles.specsTitle}>🎬 Chi tiết Video & Blur Engine</Text>
          <Text style={styles.specsText}>• File: sample.mp4 (Mercedes-Benz cinematic H.264)</Text>
          <Text style={styles.specsText}>• Android: TextureView + RenderEffect Backdrop Blur (API 31+)</Text>
          <Text style={styles.specsText}>• iOS: UIVisualEffectView Liquid Glass thời gian thực</Text>
          <Text style={styles.specsText}>• Tối ưu: 1 MediaCodec decoder, 60fps mượt mà không nóng máy</Text>
        </View>

        {/* 7. LIVE VIDEO TRÊN SURFACEVIEW & TEXTVIEW (10% BLUR) */}
        <SectionHeading
          title="7. SurfaceView Video & TextView (10% Blur)"
          subtitle="Video render trên Surface (viewType={ViewType.SURFACE}) cùng TextView, phủ kính mờ 10% cho cả 3 máy ảo"
        />

        {/* Card: SurfaceView Video + TextView (10% Blur) */}
        <View style={styles.surfaceVideoContainer}>
          <Video
            source={video60 ? VIDEO_SOURCE_60 : VIDEO_SOURCE}
            style={styles.videoPlayer}
            resizeMode="cover"
            repeat
            muted
            paused={video7Paused}
            viewType={ViewType.SURFACE}
          />

          {/* Sibling TextView overlay directly over the SurfaceView video */}
          <View style={styles.surfaceTextOverlay} pointerEvents="none">
            <View style={styles.surfaceBadge}>
              <Text style={styles.surfaceBadgeText}>SURFACE + TEXTVIEW</Text>
            </View>
            <Text style={styles.surfaceTitleText}>Mercedes-Benz Live Surface</Text>
            <Text style={styles.surfaceSubtitleText}>
              Video render trên SurfaceView & TextView sibling phủ mờ 10%
            </Text>
          </View>

          {/* Backdrop Blur Card (10% Blur Intensity) */}
          <BlurView
            mode="backdrop" syncVideo={syncVideo}
            intensity={10}
            tint="systemMaterial"
            style={styles.surfaceBackdropCard}
          >
            <View style={styles.surfaceCardInner}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.liveDot, video7Paused && styles.liveDotPaused]} />
                  <View style={styles.surfaceBlurTag}>
                    <Text style={styles.surfaceBlurTagText}>10% BLUR INTENSITY</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.smallBtn, video7Paused && { backgroundColor: 'rgba(255, 149, 0, 0.8)' }]}
                  onPress={() => setVideo7Paused((p) => !p)}
                >
                  <Text style={[styles.smallBtnText, { fontWeight: '700' }]}>
                    {video7Paused ? '▶ Tiếp tục' : '⏸ Tạm dừng'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.surfaceCardInnerTitle}>
                Backdrop Kính Mờ 10%
              </Text>
              <Text style={styles.surfaceCardInnerDesc}>
                PixelCopy mirror chụp SurfaceView + TextView mượt mà 60fps
              </Text>
            </View>
          </BlurView>
        </View>

        {/* 8. CONTENT MODE OVER VIDEO */}
        <SectionHeading
          title="8. Content Mode: Blur the Video Itself"
          subtitle="BlurView bọc video, intensity 10. Lưu ý: react-native-video 6.19 trên Android luôn dùng SurfaceView (viewType TEXTURE chưa được hỗ trợ); TextureView thật được test trong VideoTestActivity."
        />
        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16 }}>
          <BlurView intensity={intensity8} tint="systemMaterial" style={{ flex: 1, height: 180, borderRadius: 16 }}>
            <Video source={VIDEO_SOURCE} style={StyleSheet.absoluteFill} resizeMode="cover" repeat muted paused={!playAll} viewType={ViewType.SURFACE} />
            <Text style={{ color: 'white', fontWeight: '700', margin: 8 }}>SurfaceView</Text>
          </BlurView>
          {!only8 && (
          <BlurView intensity={intensity8} tint="systemMaterial" style={{ flex: 1, height: 180, borderRadius: 16 }}>
            <Video source={VIDEO_SOURCE} style={StyleSheet.absoluteFill} resizeMode="cover" repeat muted paused={!playAll} viewType={ViewType.TEXTURE} />
            <Text style={{ color: 'white', fontWeight: '700', margin: 8 }}>TextureView</Text>
          </BlurView>
          )}
        </View>

        {/* 9. TEXTUREVIEW VIDEO (ANDROID) */}
        <SectionHeading
          title="9. TextureView Video (10% Blur)"
          subtitle={
            TextureVideoView
              ? 'Video render bằng TextureView native (MediaPlayer), kính mờ backdrop 10% phía trên'
              : 'Chỉ có trên Android (iOS không có TextureView)'
          }
        />
        {TextureVideoView && (
          <View style={styles.surfaceVideoContainer}>
            <TextureVideoView paused={video9Paused} style={styles.videoPlayer} />
            <View style={styles.surfaceTextOverlay} pointerEvents="none">
              <View style={styles.surfaceBadge}>
                <Text style={styles.surfaceBadgeText}>TEXTUREVIEW</Text>
              </View>
              <Text style={styles.surfaceTitleText}>Mercedes-Benz Live Texture</Text>
            </View>
            <BlurView mode="backdrop" syncVideo={syncVideo} intensity={10} tint="systemMaterial" style={styles.surfaceBackdropCard}>
              <View style={styles.surfaceCardInner}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={styles.surfaceBlurTag}>
                    <Text style={styles.surfaceBlurTagText}>10% BLUR · TEXTUREVIEW</Text>
                  </View>
                  <TouchableOpacity style={styles.smallBtn} onPress={() => setVideo9Paused((p) => !p)}>
                    <Text style={[styles.smallBtnText, { fontWeight: '700' }]}>
                      {video9Paused ? '▶ Tiếp tục' : '⏸ Tạm dừng'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.surfaceCardInnerTitle}>Backdrop Kính Mờ 10%</Text>
                <Text style={styles.surfaceCardInnerDesc}>TextureView vẽ trực tiếp vào backdrop, không cần PixelCopy</Text>
              </View>
            </BlurView>
          </View>
        )}

        {/* Spacing for bottom floating bar */}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* FIXED TOP HEADER (Backdrop Blur) */}
      <BlurView
        mode="backdrop" syncVideo={syncVideo}
        intensity={10}
        tint="systemMaterial"
        style={styles.topHeader}
      >
        <View style={styles.topHeaderRow}>
          <View>
            <Text style={styles.topHeaderTitle}>React Native Blur</Text>
            <Text style={styles.topHeaderSub}>All Features · Single ScrollView</Text>
          </View>
          <View style={styles.headerBtnGroup}>
            <TouchableOpacity style={styles.headerBtn} onPress={toggleTheme}>
              <Text style={styles.headerBtnText}>
                {scheme === 'dark' ? '☀️ Sáng' : '🌙 Tối'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerBtn, styles.headerBtnModal]}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.headerBtnText}>🪟 Modal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>

      {/* FLOATING BOTTOM TAB BAR (Backdrop Blur) */}
      <BlurView
        mode="backdrop" syncVideo={syncVideo}
        intensity={10}
        tint="systemUltraThinMaterial"
        style={styles.bottomBar}
      >
        <TouchableOpacity style={styles.barItem} onPress={toggleTheme}>
          <Text style={styles.barText}>Theme: {String(scheme || 'sys')}</Text>
        </TouchableOpacity>
        <View style={styles.barDivider} />
        <TouchableOpacity
          style={styles.barItem}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.barText}>Full Modal Blur</Text>
        </TouchableOpacity>
        <View style={styles.barDivider} />
        <TouchableOpacity style={styles.barItem} onPress={scrollToVideo}>
          <Text style={styles.barText}>🎬 Video</Text>
        </TouchableOpacity>
      </BlurView>

      {/* FULL SCREEN MODAL WITH FROSTED BACKDROP BLUR */}
      {modalVisible && (
        <View style={styles.modalContainer}>
          <BlurView
            mode="backdrop" syncVideo={syncVideo}
            intensity={10}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setModalVisible(false)}
          />
          <BlurView
            mode="backdrop" syncVideo={syncVideo}
            intensity={10}
            tint="systemMaterial"
            style={styles.modalCard}
          >
            <Text style={styles.modalTitle}>Full-Screen Glass Modal</Text>
            <Text style={styles.modalBody}>
              Toàn bộ màn hình scroll phía sau đang được làm mờ bởi lớp kính Backdrop
              Blur 10%. Hộp thoại này là một thẻ kính mờ 10% (systemMaterial).
            </Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Đóng Modal</Text>
            </TouchableOpacity>
          </BlurView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#0f0f11' },
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 116 : 94,
    paddingBottom: 40,
    paddingHorizontal: 16,
    gap: 16,
  },

  /* Section Header */
  sectionHeader: {
    marginTop: 14,
    marginBottom: 4,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },

  /* Colorful Stripes Background Box */
  featureBlock: {
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  colorBackdrop: {
    width: '100%',
    overflow: 'hidden',
  },
  stripe: {
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  stripeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    opacity: 0.9,
  },
  overlayCards: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    justifyContent: 'space-around',
    gap: 8,
  },

  /* Hero Card */
  heroWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  heroCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    justifyContent: 'center',
    borderRadius: 24,
  },
  heroBadge: {
    color: '#4dabf7',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  heroDesc: {
    color: '#e5e5e5',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },

  /* Glass Cards */
  glassCard: {
    borderRadius: 16,
    padding: 12,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  cardSub: {
    color: '#eee',
    fontSize: 11,
    marginTop: 2,
  },

  /* Row Two */
  rowTwo: {
    flexDirection: 'row',
    gap: 10,
  },
  half: {
    flex: 1,
  },

  /* Compare Section */
  compareCard: {
    backgroundColor: '#1b1b1e',
    borderRadius: 20,
    padding: 12,
  },
  compareTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  compareBlur: {
    height: 110,
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropCompareWrapper: {
    height: 110,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  innerBox: {
    alignItems: 'center',
    padding: 6,
  },
  innerBold: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  innerSub: {
    color: '#ddd',
    fontSize: 10,
    marginTop: 1,
  },
  tagPill: {
    backgroundColor: '#007aff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  tagText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  compareDesc: {
    color: '#888',
    fontSize: 10,
    marginTop: 8,
    textAlign: 'center',
  },

  /* Buttons & Controls */
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  smallBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  smallBtnActive: {
    backgroundColor: '#007aff',
  },
  smallBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  smallBtnTextActive: {
    fontWeight: '800',
  },
  /* Video Section */
  videoContainer: {
    height: 240,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: 16,
  },
  videoPlayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  videoSplitOverlay: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
  },
  videoSplitLeft: {
    flex: 1,
    padding: 12,
    justifyContent: 'flex-start',
  },
  videoSplitRight: {
    flex: 1,
    padding: 12,
    justifyContent: 'flex-start',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.3)',
  },
  splitTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  splitTagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  videoFloatingCard: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  videoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  videoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34c759',
  },
  liveDotPaused: {
    backgroundColor: '#ff9500',
  },
  videoCardBadge: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  videoCardInfo: {
    color: '#ddd',
    fontSize: 11,
    fontWeight: '600',
  },
  videoModeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  modeBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.75)',
  },
  modeBtnText: {
    color: '#ccc',
    fontSize: 10,
    fontWeight: '600',
  },
  modeBtnTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  videoControlsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  videoBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  videoBtnPaused: {
    backgroundColor: 'rgba(255, 149, 0, 0.8)',
  },
  videoBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  videoFullBlurOverlay: {
    justifyContent: 'flex-start',
    padding: 12,
  },
  videoSharpOverlay: {
    ...StyleSheet.absoluteFill,
    padding: 12,
  },
  videoSpecsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
    gap: 4,
  },

  /* SurfaceView Video Section */
  surfaceVideoContainer: {
    height: 240,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: 16,
  },
  surfaceTextOverlay: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    gap: 4,
  },
  surfaceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#007aff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  surfaceBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  surfaceTitleText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  surfaceSubtitleText: {
    color: '#e0e0e0',
    fontSize: 11,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  surfaceBackdropCard: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  surfaceCardInner: {
    padding: 12,
    gap: 3,
  },
  surfaceBlurTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  surfaceBlurTagText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  surfaceCardInnerTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  surfaceCardInnerDesc: {
    color: '#ddd',
    fontSize: 11,
  },
  specsTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  specsText: {
    color: '#bbb',
    fontSize: 11,
    lineHeight: 16,
  },

  /* Top Header */
  topHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 12,
    paddingHorizontal: 16,
    zIndex: 100,
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topHeaderTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  topHeaderSub: {
    color: '#ccc',
    fontSize: 11,
    fontWeight: '500',
  },
  headerBtnGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  headerBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
  },
  headerBtnModal: {
    backgroundColor: 'rgba(0,122,255,0.5)',
  },
  headerBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  /* Bottom Bar */
  bottomBar: {
    position: 'absolute',
    bottom: 22,
    left: 18,
    right: 18,
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    zIndex: 100,
  },
  barItem: {
    flex: 1,
    alignItems: 'center',
  },
  barText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  barDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  /* Modal */
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalBody: {
    color: '#ddd',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  modalCloseBtn: {
    backgroundColor: '#007aff',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginTop: 6,
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
