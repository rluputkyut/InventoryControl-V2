import { Alert, Platform } from 'react-native';
import type { AlertButton } from 'react-native';

interface AlertAction {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

/** Cross-platform alert. Alert.alert is a no-op on web, so it maps to window.confirm/window.alert there. */
export function alert(title: string, message?: string, buttons?: AlertAction[]): void {
  const g = globalThis as { confirm?: (message: string) => boolean; alert?: (message?: string) => void };

  if (Platform.OS === 'web') {
    const text = `${title}${message ? `\n\n${message}` : ''}`;

    if (buttons && buttons.length === 2 && buttons.some((b) => b.style === 'cancel')) {
      // Confirm-style dialog: Cancel + one action.
      if (typeof g.confirm === 'function' && g.confirm(text)) {
        buttons.find((b) => b.style !== 'cancel')?.onPress?.();
      }
      return;
    }

    if (buttons && buttons.length === 1 && buttons[0]?.onPress) {
      // Informational dialog with a single action: show it, then perform the action.
      if (typeof g.alert === 'function') g.alert(text);
      buttons[0].onPress();
      return;
    }

    if (typeof g.alert === 'function') g.alert(text);
    return;
  }

  Alert.alert(title, message, buttons as AlertButton[]);
}