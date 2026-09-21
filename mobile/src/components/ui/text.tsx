import * as React from 'react';
import { Text as RNText, type Role, type TextStyle } from 'react-native';
import { theme } from '../../theme';

type TextProps = React.ComponentProps<typeof RNText> & {
  variant?: 'default' | 'h1' | 'h2' | 'h3' | 'h4' | 'muted' | 'small';
};

const TextStyleContext = React.createContext<TextStyle | undefined>(undefined);

const VARIANT_STYLES: Record<string, TextStyle> = {
  h1: { fontSize: 34, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5 },
  h2: { fontSize: 26, fontWeight: '700', letterSpacing: -0.4 },
  h3: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  h4: { fontSize: 19, fontWeight: '700', letterSpacing: -0.2 },
  muted: { fontSize: 14, color: theme.textSecondary },
  small: { fontSize: 13, fontWeight: '500' },
};

function Text({ variant = 'default', style, ...props }: TextProps) {
  const ctx = React.useContext(TextStyleContext);
  const role: Role | undefined =
    variant === 'h1' || variant === 'h2' || variant === 'h3' || variant === 'h4'
      ? 'heading'
      : undefined;
  const level =
    variant === 'h1' ? 1 : variant === 'h2' ? 2 : variant === 'h3' ? 3 : variant === 'h4' ? 4 : undefined;

  return (
    <RNText
      style={[{ color: theme.text, fontSize: 16 }, VARIANT_STYLES[variant], ctx, style]}
      role={role}
      accessibilityRole={role === 'heading' ? 'header' : role}
      aria-level={level}
      {...props}
    />
  );
}

export { Text, TextStyleContext };