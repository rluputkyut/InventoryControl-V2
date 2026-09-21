import { TextInput, type TextInputProps, type TextStyle } from 'react-native';
import { theme } from '../../theme';

type InputStyle = TextStyle | Array<TextStyle | undefined | false>;

function Input({ style, ...props }: TextInputProps & { style?: InputStyle }) {
  return (
    <TextInput
      style={[
        {
          height: 40,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: theme.bg,
          color: theme.text,
          fontSize: 16,
        },
        style,
      ]}
      placeholderTextColor={theme.textSecondary}
      {...props}
    />
  );
}

export { Input };