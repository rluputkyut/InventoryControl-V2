import { Platform, TextInput, type TextInputProps, type TextStyle } from 'react-native';
import { theme } from '../../theme';

type Style = TextStyle | Array<TextStyle | undefined | false>;

type TextareaProps = TextInputProps & {
  placeholderClassName?: TextStyle;
  style?: Style;
};

function Textarea({
  multiline = true,
  numberOfLines = Platform.select({ web: 2, native: 8 }),
  placeholderClassName,
  style,
  ...props
}: TextareaProps) {
  return (
    <TextInput
      style={[
        {
          minHeight: 64,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: 'transparent',
          color: theme.text,
          fontSize: 16,
          textAlignVertical: 'top',
        },
        style,
      ]}
      placeholderTextColor={placeholderClassName?.color ?? theme.textSecondary}
      multiline={multiline}
      numberOfLines={numberOfLines}
      {...props}
    />
  );
}

export { Textarea };