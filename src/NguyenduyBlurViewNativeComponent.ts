import { codegenNativeComponent, type CodegenTypes, type ColorValue, type ViewProps } from 'react-native';

export interface NativeProps extends ViewProps {
  mode?: CodegenTypes.WithDefault<string, 'content'>;
  intensity?: CodegenTypes.WithDefault<CodegenTypes.Float, 50>;
  blurRadius?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  saturation?: CodegenTypes.WithDefault<CodegenTypes.Float, 1>;
  tint?: CodegenTypes.WithDefault<string, 'default'>;
  tintColor?: ColorValue;
  // The app's colour scheme ('light' | 'dark'), so materials follow
  // Appearance.setColorScheme overrides on Android.
  colorScheme?: string;
  // Corner radii in dp: top-left, top-right, bottom-right, bottom-left.
  cornerRadii?: ReadonlyArray<CodegenTypes.Float>;
}

export default codegenNativeComponent<NativeProps>('NguyenduyBlurView');
