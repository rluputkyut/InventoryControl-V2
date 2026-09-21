import { View, type ViewProps, type ViewStyle } from 'react-native';
import { theme } from '../../theme';
import { Text, TextStyleContext } from './text';

type Style = ViewStyle | Array<ViewStyle | undefined | false>;

type BadgeStyle = ViewStyle | Array<ViewStyle | undefined | false>;

type BadgeProps = ViewProps & {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  style?: BadgeStyle;
};

const VARIANT: Record<string, ViewStyle> = {
  default: { backgroundColor: theme.primary },
  secondary: { backgroundColor: '#f1f5f9' },
  destructive: { backgroundColor: theme.danger },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.border },
};

const TEXT_COLOR: Record<string, string> = {
  default: '#ffffff',
  secondary: theme.text,
  destructive: '#ffffff',
  outline: theme.text,
};

function Badge({ variant = 'default', style, ...props }: BadgeProps) {
  return (
    <TextStyleContext.Provider value={{ color: TEXT_COLOR[variant] }}>
      <View
        style={[
          {
            borderRadius: 999,
            paddingHorizontal: 8,
            paddingVertical: 3,
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'flex-start',
            overflow: 'hidden',
          },
          VARIANT[variant],
          style,
        ]}
        {...props}
      />
    </TextStyleContext.Provider>
  );
}

export { Badge };