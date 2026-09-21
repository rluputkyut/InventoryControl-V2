import type { ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { Badge } from './ui/badge';
import { Text } from './ui/text';

export function BackButton({ onPress }: { onPress: () => void }) {
  const t = theme;
  return (
    <Pressable onPress={onPress} hitSlop={16} style={{ paddingRight: 12 }}>
      <Ionicons name="arrow-back" size={22} color={t.primary} />
    </Pressable>
  );
}

let activeCurrencyCode = 'USD';

export function setShopCurrencyCode(code?: string | null): void {
  activeCurrencyCode = code?.trim() || 'USD';
}

export function formatMoney(value: number): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: activeCurrencyCode }).format(value);
  } catch {
    return `${activeCurrencyCode} ${value.toFixed(2)}`;
  }
}

export function formatDateTime(utc: string): string {
  try {
    return new Date(utc).toLocaleString();
  } catch {
    return utc;
  }
}

export function formatDate(utc: string): string {
  try {
    return new Date(utc).toLocaleDateString();
  } catch {
    return utc;
  }
}

type CardStyle = ViewStyle | Array<ViewStyle | undefined | false>;

export function Card({ children, style }: { children: ReactNode; style?: CardStyle }) {
  return (
    <View
      style={[
        {
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const statusVariant: Record<string, string> = {
  PendingApproval: '#f59e0b',
  Approved: theme.primary,
  Delivered: '#16a34a',
  Rejected: '#ef4444',
};

const typeVariant: Record<string, string> = {
  Purchase: '#16a34a',
  Sale: '#ef4444',
  TransferOut: '#f59e0b',
  TransferIn: theme.primary,
  Transfer: '#f59e0b',
};

export function StatusBadge({ status }: { status: string }) {
  const color = statusVariant[status];
  return (
    <Badge variant={color ? 'default' : 'outline'} style={color ? { backgroundColor: color } : undefined}>
      <Text variant="small">{status}</Text>
    </Badge>
  );
}

export function TypeBadge({ label }: { label: string }) {
  const color = typeVariant[label];
  return (
    <Badge variant={color ? 'default' : 'outline'} style={color ? { backgroundColor: color } : undefined}>
      <Text variant="small">{label}</Text>
    </Badge>
  );
}