import { Image, View, type ImageProps, type ViewProps, type ViewStyle } from 'react-native';
import { theme } from '../../theme';

type Style = ViewStyle | Array<ViewStyle | undefined | false>;

interface AvatarProps extends ViewProps {
  alt?: string;
  style?: Style;
}

interface AvatarImageProps extends ImageProps {
  style?: ImageProps['style'];
}

interface AvatarFallbackProps extends ViewProps {
  style?: Style;
}

function Avatar({ alt, style, ...props }: AvatarProps) {
  return (
    <View
      style={[
        {
          width: 32,
          height: 32,
          borderRadius: 999,
          overflow: 'hidden',
        },
        style,
      ]}
      {...props}
      accessibilityLabel={alt}
    />
  );
}

function AvatarImage({ style, ...props }: AvatarImageProps) {
  return <Image style={[{ width: '100%', height: '100%' }, style]} {...props} />;
}

function AvatarFallback({ style, ...props }: AvatarFallbackProps) {
  return (
    <View
      style={[
        {
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 999,
          backgroundColor: theme.primary,
        },
        style,
      ]}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };