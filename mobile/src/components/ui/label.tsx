import { Pressable, type PressableProps, type TextStyle } from 'react-native';
import { theme } from '../../theme';

type Style = TextStyle | Array<TextStyle | undefined | false>;

interface LabelProps extends PressableProps {
  style?: Style;
  disabled?: boolean;
}

function Label({ style, disabled, ...props }: LabelProps) {
  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }, style]}
      {...props}
    />
  );
}

export { Label };