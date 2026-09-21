import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef } from 'react';
import { FlatList, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAsyncData } from '../hooks/useAsyncData';
import { useCart } from '../cart/CartContext';
import type { CustomerOrder } from '../api/types';
import type { OrdersStackParamList } from '../navigation';
import { ordersApi } from '../api/endpoints';
import { Screen } from '../components/Screen';
import { Card, formatDate, formatMoney, StatusBadge } from '../components/ui';
import { Text } from '../components/ui/text';
import { theme } from '../theme';

type Nav = NativeStackNavigationProp<OrdersStackParamList, 'OrdersList'>;

const statusLabel: Record<CustomerOrder['status'], string> = {
  PendingApproval: 'Pending approval',
  Approved: 'Approved — awaiting delivery',
  Delivered: 'Delivered',
  Rejected: 'Rejected',
};

export function OrdersScreen() {
  const t = theme;
  const navigation = useNavigation<Nav>();
  const { count } = useCart();
  const { data: orders = [], loading, error, reload } = useAsyncData(useCallback(() => ordersApi.listMy(), []), []);

  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      void reload();
    }, [reload]),
  );

  return (
    <Screen
      title="My orders"
      loading={loading}
      error={error}
      onRetry={() => void reload()}
      onRefresh={() => void reload()}
      headerRight={
        <TouchableOpacity onPress={() => navigation.navigate('Cart')} hitSlop={12} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="cart-outline" size={23} color={t.textSecondary} />
          {count > 0 && (
            <View style={{ position: 'absolute', top: -6, right: -8, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: '#ef4444', paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>{count}</Text>
            </View>
          )}
        </TouchableOpacity>
      }
    >
      <FlatList
        scrollEnabled={false}
        data={orders}
        keyExtractor={(o) => String(o.id)}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('OrderDetail', { id: item.id })}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 16, fontWeight: '800' }}>{item.number}</Text>
                <StatusBadge status={item.status} />
              </View>
              <Text style={{ marginTop: 2, fontSize: 12, color: t.textSecondary }}>{formatDate(item.createdAtUtc)}</Text>
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '600' }}>
                  {item.items?.length ?? 0} item(s) · {formatMoney(item.total)}
                </Text>
              </View>
              <Text style={{ marginTop: 2, fontSize: 12, color: t.textSecondary }}>{statusLabel[item.status]}</Text>
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={{ paddingVertical: 24, textAlign: 'center', color: t.textSecondary }}>
            No orders yet — browse the shop and place your first order.
          </Text>
        }
      />
    </Screen>
  );
}