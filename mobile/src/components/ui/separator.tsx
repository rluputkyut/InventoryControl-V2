import { View, type ViewProps, type ViewStyle } from 'react-native';
import { theme } from '../../theme';

type Style = ViewStyle | Array<ViewStyle | undefined | false>;

interface SeparatorProps extends ViewProps {
  orientation?: 'horizontal' | 'vertical';
  style?: Style;
}

function Separator({ orientation = 'horizontal', style, ...props }: SeparatorProps) {
  return (
    <View
      style={[
        {
          backgroundColor: theme.border,
          flexShrink: 0,
        },
        orientation === 'horizontal' ? { height: 1, width: '100%' } : { height: '100%', width: 1 },
        style,
      ]}
      {...props}
    />
  );
}

export { Separator };