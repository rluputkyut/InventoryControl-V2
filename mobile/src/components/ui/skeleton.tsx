import { View, type ViewProps, type ViewStyle } from 'react-native';
import { theme } from '../../theme';

type Style = ViewStyle | Array<ViewStyle | undefined | false>;

function Skeleton({ style, ...props }: ViewProps & { style?: Style }) {
  return <View style={[{ backgroundColor: '#e2e8f0', borderRadius: 6 }, style]} {...props} />;
}

export { Skeleton };