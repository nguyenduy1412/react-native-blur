import React from 'react';
import {
  I18nManager,
  View,
  type ColorValue,
  ViewProps,
  ViewStyle,
  StyleSheet,
  StyleProp,
  useColorScheme,
} from 'react-native';
import NativeBlurView from './src/NguyenduyBlurViewNativeComponent';

export type BlurTint =
  | 'light'
  | 'dark'
  | 'default'
  | 'extraLight'
  | 'prominent'
  | 'systemUltraThinMaterial'
  | 'systemThinMaterial'
  | 'systemMaterial'
  | 'systemThickMaterial'
  | 'systemChromeMaterial';

export type BlurMode = 'content' | 'backdrop';

export interface BlurViewProps extends ViewProps {
  mode?: BlurMode;
  intensity?: number;
  tint?: BlurTint;
  tintColor?: ColorValue;
  blurRadius?: number;
  saturation?: number;
  borderRadius?: number;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

type Radius = ViewStyle['borderRadius'];

const radius = (...values: Radius[]): number | undefined => {
  for (const value of values) {
    if (typeof value === 'number') return value;
  }
  return undefined;
};

// Resolves the four corner radii (top-left, top-right, bottom-right,
// bottom-left) from `borderRadius` and the per-corner style properties.
function resolveCornerRadii(style: ViewStyle, override?: number): number[] {
  const rtl = I18nManager.isRTL;
  const base = override ?? radius(style.borderRadius) ?? 0;
  const topStart = radius(style.borderTopStartRadius, style.borderStartStartRadius);
  const topEnd = radius(style.borderTopEndRadius, style.borderStartEndRadius);
  const bottomStart = radius(style.borderBottomStartRadius, style.borderEndStartRadius);
  const bottomEnd = radius(style.borderBottomEndRadius, style.borderEndEndRadius);
  if (override !== undefined) return [base, base, base, base];
  return [
    radius(rtl ? topEnd : topStart, style.borderTopLeftRadius) ?? base,
    radius(rtl ? topStart : topEnd, style.borderTopRightRadius) ?? base,
    radius(rtl ? bottomStart : bottomEnd, style.borderBottomRightRadius) ?? base,
    radius(rtl ? bottomEnd : bottomStart, style.borderBottomLeftRadius) ?? base,
  ];
}

export const BlurView = React.forwardRef<View, BlurViewProps>(function BlurView(
  {
    mode = 'content',
    intensity = 50,
    tint = 'default',
    tintColor,
    blurRadius,
    saturation,
    borderRadius: customBorderRadius,
    style,
    children,
    ...props
  },
  ref,
) {
  const flattenedStyle = (StyleSheet.flatten(style) || {}) as ViewStyle;
  const colorScheme = useColorScheme();

  if (NativeBlurView) {
    const cornerRadii = resolveCornerRadii(flattenedStyle, customBorderRadius);
    const rounded = cornerRadii.some((r) => r > 0);
    return (
      <NativeBlurView
        ref={ref as React.Ref<any>}
        mode={mode}
        intensity={intensity}
        blurRadius={blurRadius}
        saturation={saturation}
        tint={tint}
        tintColor={tintColor}
        cornerRadii={cornerRadii}
        colorScheme={colorScheme ?? undefined}
        style={[
          styles.container,
          style,
          customBorderRadius !== undefined && { borderRadius: customBorderRadius },
          rounded && styles.clip,
        ]}
        {...props}
      >
        {children}
      </NativeBlurView>
    );
  }

  return (
    <View
      ref={ref}
      style={[
        styles.container,
        {
          // @ts-ignore
          backdropFilter: `blur(${blurRadius || intensity * 0.3}px) saturate(${(saturation ?? 1.35) * 100}%)`,
          backgroundColor:
            tintColor ||
            (tint === 'dark'
              ? 'rgba(20, 20, 20, 0.6)'
              : 'rgba(255, 255, 255, 0.4)'),
        },
        style,
        customBorderRadius !== undefined && { borderRadius: customBorderRadius },
      ]}
      {...props}
    >
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  clip: {
    overflow: 'hidden',
  },
});

export default BlurView;
