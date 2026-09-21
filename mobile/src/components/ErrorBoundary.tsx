import { Component } from 'react';
import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' }}>
          <ScrollView>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#ef4444', marginBottom: 12 }}>Something crashed</Text>
            <Text style={{ fontSize: 14, color: '#333', marginBottom: 8 }}>{this.state.error.message}</Text>
            <Text style={{ fontSize: 12, color: '#666', fontFamily: 'monospace' }}>{this.state.error.stack}</Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}
