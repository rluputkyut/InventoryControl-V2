import { View, type ViewProps, type ViewStyle } from 'react-native';
import { theme } from '../../theme';

type Style = ViewStyle | Array<ViewStyle | undefined | false>;

type CardProps = ViewProps & {
  style?: Style;
};

function Card({ style, ...props }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
        },
        style,
      ]}
      {...props}
    />
  );
}

export { Card };