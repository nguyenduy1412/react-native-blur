import { codegenNativeComponent, type CodegenTypes, type ViewProps } from 'react-native';

export interface NativeProps extends ViewProps {
  mode?: CodegenTypes.WithDefault<string, 'content'>;
  intensity?: CodegenTypes.WithDefault<CodegenTypes.Float, 50>;
  blurRadius?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  saturation?: CodegenTypes.WithDefault<CodegenTypes.Float, 1>;
  tint?: CodegenTypes.WithDefault<string, 'default'>;
  tintColor?: string;
  cornerRadius?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
}

export default codegenNativeComponent<NativeProps>('NguyenduyBlurView');
