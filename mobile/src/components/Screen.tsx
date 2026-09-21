import type { ReactNode } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { Button } from './ui/button';
import { Text } from './ui/text';

interface ScreenProps {
  title: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
  children?: ReactNode;
}

/** Page shell with a title bar, loading/error states and pull-to-refresh. */
export function Screen({
  title,
  loading,
  error,
  onRetry,
  refreshing,
  onRefresh,
  headerLeft,
  headerRight,
  children,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const t = theme;

  return (
    <View style={{ backgroundColor: t.bg, flex: 1, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 }}>
        <View style={{ minWidth: 28, alignItems: 'flex-start' }}>{headerLeft}</View>
        <Text variant="h3">{title}</Text>
        <View style={{ minWidth: 28, alignItems: 'flex-end', justifyContent: 'flex-end' }}>{headerRight}</View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={t.primary} style={{ marginTop: 48 }} />
      ) : error ? (
        <View style={{ marginTop: 48, alignItems: 'center', paddingHorizontal: 24 }}>
          <Text style={{ color: t.danger, textAlign: 'center', marginBottom: 16 }}>{error}</Text>
          {onRetry && <Button onPress={onRetry}>Retry</Button>}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={t.primary} />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      )}
    </View>
  );
}