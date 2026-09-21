import { FlatList, TouchableOpacity, View } from 'react-native';
import { useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAsyncData } from '../hooks/useAsyncData';
import type { RootTabParamList } from '../navigation';
import { inventoryApi, ordersApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import { Screen } from '../components/Screen';
import { ShopBrand } from '../components/ShopBrand';
import { Card, StatusBadge, formatDate, formatMoney } from '../components/ui';
import { Text } from '../components/ui/text';
import { theme } from '../theme';

type TabNav = BottomTabNavigationProp<RootTabParamList>;

export function HomeScreen() {
  const { user } = useAuth();
  const t = theme;
  const navigation = useNavigation<TabNav>();
  const isStaff = Boolean(user?.roles.some((r) => r === 'Admin' || r === 'ShopAdmin'));

  const { data: balances = [], loading, error, reload } = useAsyncData(useCallback(() => inventoryApi.balances(), []), []);
  const { data: myOrders = [], reload: reloadOrders } = useAsyncData(useCallback(() => ordersApi.listMy(), []), []);

  useFocusEffect(
    useCallback(() => {
      void reload();
      void reloadOrders();
    }, [reload, reloadOrders]),
  );

  const firstName = user?.name?.trim() || user?.userName || 'there';

  if (isStaff) {
    const onHand = balances.reduce((sum, b) => sum + b.quantity, 0);
    const productKinds = balances.length;
    return (
      <Screen
        title={`Hello, ${firstName}`}
        loading={loading}
        error={error}
        onRetry={() => void reload()}
        onRefresh={() => void reload()}
      >
        <View style={{ marginBottom: 16 }}>
          <ShopBrand variant="row" />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Card style={{ flex: 1 }}>
            <Text style={{ color: t.primary, fontSize: 26, fontWeight: '800' }}>{productKinds}</Text>
            <Text style={{ color: t.textSecondary, marginTop: 2, fontSize: 13 }}>Products in stock</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={{ color: t.primary, fontSize: 26, fontWeight: '800' }}>{onHand}</Text>
            <Text style={{ color: t.textSecondary, marginTop: 2, fontSize: 13 }}>Units on hand</Text>
          </Card>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      title={`Hello, ${firstName}`}
      onRefresh={() => void reloadOrders()}
    >
      <View style={{ marginBottom: 16 }}>
        <ShopBrand variant="row" />
      </View>
      <TouchableOpacity
        style={{ backgroundColor: t.primary, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderRadius: 8, padding: 18 }}
        onPress={() => navigation.navigate('Products')}
      >
        <Ionicons name="storefront-outline" size={28} color="#fff" />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>Browse the shop</Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 2, fontSize: 13 }}>Order products and track delivery</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#fff" />
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1 }}>
          <Text style={{ color: t.primary, fontSize: 26, fontWeight: '800' }}>{myOrders.length}</Text>
          <Text style={{ color: t.textSecondary, marginTop: 2, fontSize: 13 }}>Orders placed</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={{ color: t.primary, fontSize: 26, fontWeight: '800' }}>
            {myOrders.filter((o) => o.status === 'Delivered').length}
          </Text>
          <Text style={{ color: t.textSecondary, marginTop: 2, fontSize: 13 }}>Delivered</Text>
        </Card>
      </View>

      <Text style={{ marginTop: 16, marginBottom: 10, fontSize: 17, fontWeight: '700' }}>My orders</Text>
      {myOrders.length === 0 ? (
        <Card>
          <Text style={{ color: t.textSecondary, fontSize: 14, textAlign: 'center' }}>
            No orders yet — tap "Browse the shop" to get started.
          </Text>
        </Card>
      ) : (
        <FlatList
          scrollEnabled={false}
          data={myOrders.slice(0, 5)}
          keyExtractor={(o) => String(o.id)}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => navigation.navigate('Orders', { screen: 'OrderDetail', params: { id: item.id } })}>
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 15, fontWeight: '800' }}>{item.number}</Text>
                  <StatusBadge status={item.status} />
                </View>
                <Text style={{ color: t.textSecondary, marginTop: 4, fontSize: 13 }}>
                  {item.items?.length ?? 0} item(s) · {formatMoney(item.total)} · {formatDate(item.createdAtUtc)}
                </Text>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity style={{ alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10 }} onPress={() => navigation.navigate('Orders', { screen: 'OrdersList' })}>
        <Text style={{ color: t.primary, fontSize: 15, fontWeight: '700' }}>View all orders</Text>
      </TouchableOpacity>
    </Screen>
  );
}