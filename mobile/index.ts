import { registerRootComponent } from 'expo';

import App from './App';

if (typeof console !== 'undefined' && typeof console.warn === 'function') {
  const originalWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    const message = typeof args[0] === 'string' ? args[0] : '';
    if (message.includes('props.pointerEvents is deprecated')) {
      return;
    }
    originalWarn(...args);
  };
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);