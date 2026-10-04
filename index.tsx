import React from 'react';
import {
  Platform,
  View,
  ViewProps,
  ViewStyle,
  StyleSheet,
  StyleProp,
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
  tintColor?: string;
  blurRadius?: number;
  saturation?: number;
  borderRadius?: number;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const BlurView: React.FC<BlurViewProps> = ({
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
}) => {
  const flattenedStyle = (StyleSheet.flatten(style) || {}) as ViewStyle;
  const computedBorderRadius =
    customBorderRadius ??
    (flattenedStyle.borderRadius as number) ??
    0;

  if (NativeBlurView) {
    const nativeProps = {
      mode,
      intensity,
      blurRadius,
      saturation,
      tint,
      tintColor,
      cornerRadius: computedBorderRadius,
    };
    const containerStyle = [
      styles.container,
      style,
      computedBorderRadius > 0 && {
        borderRadius: computedBorderRadius,
        overflow: 'hidden' as const,
      },
    ];

    if (Platform.OS === 'ios' || mode === 'backdrop') {
      return (
        <View style={containerStyle} {...props}>
          {mode === 'backdrop' && (
            <NativeBlurView
              {...nativeProps}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          )}
          {children}
          {mode !== 'backdrop' && (
            <NativeBlurView
              {...nativeProps}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          )}
        </View>
      );
    }

    return (
      <NativeBlurView
        {...nativeProps}
        style={containerStyle}
        {...props}
      >
        {children}
      </NativeBlurView>
    );
  }

  return (
    <View
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
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
});

export default BlurView;
