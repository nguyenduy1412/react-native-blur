import React, { useEffect, useState } from 'react';
import {
  Appearance,
  Linking,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type ColorSchemeName,
} from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import BlurView, { type BlurTint } from '@nguyenduy1412/react-native-blur';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

// Screens are switched with deep links so tests can drive them, e.g.
//   blurexample://header
//   blurexample://theme?scheme=dark
//   blurexample://anim?to=100
//   blurexample://tint?tint=dark
type Route = { screen: string; params: Record<string, string> };

function parse(url: string | null): Route {
  if (!url) return { screen: 'header', params: {} };
  const [, rest = ''] = url.split('://');
  const [screen, query = ''] = rest.split('?');
  const params: Record<string, string> = {};
  query.split('&').filter(Boolean).forEach((pair) => {
    const [k, v = ''] = pair.split('=');
    params[decodeURIComponent(k)] = decodeURIComponent(v);
  });
  return { screen: screen.replace(/\/$/, '') || 'header', params };
}

const COLORS = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#00c7be', '#007aff', '#5856d6', '#af52de', '#ff2d55'];

function Stripes({ count = 24, label = 'Row' }: { count?: number; label?: string }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.stripe, { backgroundColor: COLORS[i % COLORS.length] }]}>
          <Text style={styles.stripeText}>
            {label} {i + 1} · The quick brown fox
          </Text>
        </View>
      ))}
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

function HeaderScreen() {
  return (
    <View style={styles.fill}>
      <ScrollView contentContainerStyle={{ paddingTop: 140, paddingBottom: 140 }}>
        <Stripes />
      </ScrollView>
      <BlurView mode="backdrop" intensity={85} tint="systemMaterial" style={styles.header}>
        <Label>Backdrop header (paddingTop 60)</Label>
      </BlurView>
      <BlurView mode="backdrop" intensity={80} tint="systemThinMaterial" style={styles.tabBar}>
        <Label>Tab bar</Label>
      </BlurView>
    </View>
  );
}

function ContentScreen() {
  return (
    <View style={styles.fill}>
      <View style={styles.half}>
        <Stripes count={8} label="Sharp" />
      </View>
      <BlurView intensity={60} tint="systemMaterial" style={styles.half}>
        <Stripes count={8} label="Blurred" />
      </BlurView>
    </View>
  );
}

function TintScreen({ tint }: { tint: BlurTint }) {
  return (
    <View style={styles.fill}>
      <View style={StyleSheet.absoluteFill}>
        <Stripes />
      </View>
      <View style={styles.cards}>
        <BlurView mode="backdrop" intensity={70} tint={tint} tintColor="rgba(255, 0, 0, 0.35)" style={styles.card}>
          <Label>tintColor rgba(255,0,0,0.35)</Label>
        </BlurView>
        <BlurView mode="backdrop" intensity={70} tint={tint} tintColor="#00ff0060" style={styles.card}>
          <Label>tintColor #00ff0060</Label>
        </BlurView>
        <BlurView mode="backdrop" intensity={70} tint={tint} tintColor="blue" style={[styles.card, { opacity: 0.9 }]}>
          <Label>tintColor blue</Label>
        </BlurView>
        <BlurView mode="backdrop" intensity={70} tint={tint} style={styles.card}>
          <Label>tint={tint}</Label>
        </BlurView>
      </View>
    </View>
  );
}

function CornersScreen() {
  return (
    <View style={styles.fill}>
      <View style={StyleSheet.absoluteFill}>
        <Stripes />
      </View>
      <View style={styles.cards}>
        <BlurView
          mode="backdrop"
          intensity={80}
          tint="systemThinMaterial"
          style={[styles.card, styles.tall, { borderTopLeftRadius: 48, borderBottomRightRadius: 48 }]}
        >
          <Label>Per-corner (TL 48, BR 48)</Label>
        </BlurView>
        <BlurView mode="backdrop" intensity={80} tint="systemThinMaterial" style={[styles.card, styles.tall, { borderRadius: 32 }]}>
          <Label>Uniform 32</Label>
        </BlurView>
        <BlurView intensity={60} style={[styles.card, styles.tall, { borderTopRightRadius: 60, borderBottomLeftRadius: 20 }]}>
          <Stripes count={3} label="Content" />
        </BlurView>
      </View>
    </View>
  );
}

function ThemeScreen({ scheme }: { scheme: ColorSchemeName }) {
  return (
    <View style={styles.fill}>
      <View style={StyleSheet.absoluteFill}>
        <Stripes />
      </View>
      <View style={styles.cards}>
        <BlurView mode="backdrop" intensity={90} tint="systemMaterial" style={[styles.card, styles.tall]}>
          <Label>systemMaterial · app scheme: {String(scheme)}</Label>
        </BlurView>
        <BlurView mode="backdrop" intensity={90} tint="default" style={[styles.card, styles.tall]}>
          <Label>default</Label>
        </BlurView>
      </View>
    </View>
  );
}

function AnimScreen({ to }: { to: number }) {
  const value = useSharedValue(0);
  useEffect(() => {
    value.value = withTiming(to, { duration: 400 });
  }, [to, value]);
  const animatedProps = useAnimatedProps(() => ({ intensity: value.value }));
  return (
    <View style={styles.fill}>
      <View style={StyleSheet.absoluteFill}>
        <Stripes />
      </View>
      <View style={styles.cards}>
        <AnimatedBlurView mode="backdrop" tint="systemMaterial" animatedProps={animatedProps} style={[styles.card, styles.tall]}>
          <Label>Reanimated backdrop → {to}</Label>
        </AnimatedBlurView>
        <AnimatedBlurView tint="systemMaterial" animatedProps={animatedProps} style={[styles.card, styles.tall]}>
          <Stripes count={3} label="Reanimated content" />
        </AnimatedBlurView>
      </View>
    </View>
  );
}

function ModalScreen() {
  return (
    <View style={styles.fill}>
      <View style={StyleSheet.absoluteFill}>
        <Stripes />
      </View>
      <Modal transparent visible animationType="none">
        <View style={{ flex: 1 }}>
          <BlurView mode="backdrop" intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.modalCard}>
            <Text style={styles.modalText}>Inside React Native {'<Modal>'}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function App() {
  const [route, setRoute] = useState<Route>({ screen: 'header', params: {} });
  const [scheme, setScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());

  useEffect(() => {
    Linking.getInitialURL().then((url) => url && setRoute(parse(url)));
    const sub = Linking.addEventListener('url', ({ url }) => setRoute(parse(url)));
    const themeSub = Appearance.addChangeListener(({ colorScheme }) => setScheme(colorScheme));
    // Test driver: polls the route from a local server (see scripts in the
    // test harness) so screens can be switched without a URL prompt.
    let last = '';
    const timer = setInterval(() => {
      fetch('http://localhost:8099/route.txt', { cache: 'no-store' })
        .then((r) => (r.ok ? r.text() : ''))
        .then((text) => {
          const url = text.trim();
          if (url && url !== last) {
            last = url;
            setRoute(parse(url));
          }
        })
        .catch(() => {});
    }, 300);
    return () => {
      sub.remove();
      themeSub.remove();
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const requested = route.params.scheme;
    if (requested === 'dark' || requested === 'light') Appearance.setColorScheme(requested);
    if (requested === 'system') Appearance.setColorScheme('unspecified');
  }, [route]);

  const { screen, params } = route;
  return (
    <View style={styles.fill}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      {screen === 'header' && <HeaderScreen />}
      {screen === 'content' && <ContentScreen />}
      {screen === 'tint' && <TintScreen tint={(params.tint as BlurTint) || 'light'} />}
      {screen === 'corners' && <CornersScreen />}
      {screen === 'theme' && <ThemeScreen scheme={scheme} />}
      {screen === 'anim' && <AnimScreen to={Number(params.to ?? 100)} />}
      {screen === 'modal' && <ModalScreen />}
      <Text style={styles.route} pointerEvents="none">
        {screen}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'white' },
  half: { flex: 1, overflow: 'hidden' },
  stripe: { height: 56, justifyContent: 'center', paddingHorizontal: 16 },
  stripeText: { color: 'white', fontSize: 18, fontWeight: '700' },
  header: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 60, paddingBottom: 16, paddingHorizontal: 16 },
  tabBar: { position: 'absolute', left: 16, right: 16, bottom: 40, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 17, fontWeight: '600', color: '#111' },
  cards: { flex: 1, justifyContent: 'center', padding: 20, gap: 16 },
  card: { borderRadius: 18, padding: 16, overflow: 'hidden' },
  tall: { height: 150, justifyContent: 'center' },
  modalCard: { position: 'absolute', left: 32, right: 32, top: '40%', padding: 24, borderRadius: 20, backgroundColor: 'white' },
  modalText: { fontSize: 18, fontWeight: '600', textAlign: 'center', color: '#111' },
  route: { position: 'absolute', right: 8, bottom: 8, fontSize: 12, color: '#000', backgroundColor: '#fffa', padding: 2 },
});
