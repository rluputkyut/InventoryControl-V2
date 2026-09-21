import { Pressable, type PressableProps, type ViewStyle } from 'react-native';
import { theme } from '../../theme';
import { TextStyleContext } from './text';

type ButtonStyle = ViewStyle | Array<ViewStyle | undefined | false>;

type ButtonProps = Omit<PressableProps, 'style'> & {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  style?: ButtonStyle;
};

const VARIANT_BTN: Record<string, ViewStyle> = {
  default: { backgroundColor: theme.primary, borderRadius: 8 },
  destructive: { backgroundColor: theme.danger, borderRadius: 8 },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
  },
  secondary: { backgroundColor: '#f1f5f9', borderRadius: 8 },
  ghost: { backgroundColor: 'transparent', borderRadius: 8 },
  link: { backgroundColor: 'transparent' },
};

const VARIANT_TEXT: Record<string, { color: string }> = {
  default: { color: '#ffffff' },
  destructive: { color: '#ffffff' },
  outline: { color: theme.text },
  secondary: { color: theme.text },
  ghost: { color: theme.text },
  link: { color: theme.primary },
};

const SIZE_STYLE: Record<string, ViewStyle> = {
  default: { height: 40, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  sm: { height: 34, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  lg: { height: 48, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  icon: { height: 40, width: 40, alignItems: 'center', justifyContent: 'center' },
};

function Button({ variant = 'default', size = 'default', style, disabled, ...props }: ButtonProps) {
  return (
    <TextStyleContext.Provider value={VARIANT_TEXT[variant]}>
      <Pressable
        role="button"
        disabled={disabled}
        style={({ pressed }) => [
          VARIANT_BTN[variant],
          SIZE_STYLE[size],
          { opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
          style,
        ]}
        {...props}
      />
    </TextStyleContext.Provider>
  );
}

export { Button };
export type { ButtonProps };