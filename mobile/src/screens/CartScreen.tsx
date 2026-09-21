import { FlatList, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { CartItem } from '../cart/CartContext';
import { useCart } from '../cart/CartContext';
import type { OrdersStackParamList } from '../navigation';
import { Screen } from '../components/Screen';
import { BackButton, Card, formatMoney } from '../components/ui';
import { Text } from '../components/ui/text';
import { theme } from '../theme';

type Nav = NativeStackNavigationProp<OrdersStackParamList, 'Cart'>;

export function CartScreen() {
  const t = theme;
  const navigation = useNavigation<Nav>();
  const { items, count, subtotal, setQuantity, remove, clear } = useCart();

  return (
    <Screen
      title={`Cart${count > 0 ? ` (${count})` : ''}`}
      headerLeft={<BackButton onPress={() => navigation.goBack()} />}
    >
      {items.length === 0 ? (
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 60 }}>
          <Ionicons name="cart-outline" size={44} color={t.textSecondary} />
          <Text style={{ textAlign: 'center', fontSize: 16, color: t.textSecondary }}>
            Your cart is empty.
          </Text>
          <TouchableOpacity
            style={{ marginTop: 6, borderRadius: 8, backgroundColor: t.primary, paddingHorizontal: 18, paddingVertical: 10 }}
            onPress={() => navigation.navigate('OrdersList')}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Browse products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            scrollEnabled={false}
            data={items}
            keyExtractor={(i) => String(i.productId)}
            renderItem={({ item }) => (
              <CartRow
                item={item}
                onQty={(q) => setQuantity(item.productId, q)}
                onRemove={() => remove(item.productId)}
              />
            )}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: t.border, paddingVertical: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '600' }}>Total</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: t.primary }}>{formatMoney(subtotal)}</Text>
          </View>
          <TouchableOpacity
            style={{ alignItems: 'center', borderRadius: 8, backgroundColor: t.primary, paddingVertical: 15 }}
            onPress={() => navigation.navigate('Checkout')}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Checkout</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ alignSelf: 'center', paddingVertical: 10 }} onPress={clear}>
            <Text style={{ fontSize: 14, color: t.danger }}>Clear cart</Text>
          </TouchableOpacity>
        </>
      )}
    </Screen>
  );
}

function CartRow({
  item,
  onQty,
  onRemove,
}: {
  item: CartItem;
  onQty: (q: number) => void;
  onRemove: () => void;
}) {
  const t = theme;
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '600' }}>{item.name}</Text>
        <Text style={{ marginTop: 2, fontSize: 12, color: t.textSecondary }}>
          {item.sku}
          {item.unitPrice !== item.listPrice ? ` · ${formatMoney(item.listPrice)}` : ''}
        </Text>
        <Text style={{ marginTop: 4, fontSize: 14, fontWeight: '700', color: t.primary }}>{formatMoney(item.unitPrice)}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={{ height: 26, width: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: t.primary }}
            onPress={() => onQty(item.quantity - 1)}
            hitSlop={8}
          >
            <Ionicons name="remove" size={16} color={t.primary} />
          </TouchableOpacity>
          <Text style={{ minWidth: 18, textAlign: 'center', fontSize: 14, fontWeight: '700' }}>
            {item.quantity}
          </Text>
          <TouchableOpacity
            style={{ height: 26, width: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: t.primary }}
            onPress={() => onQty(item.quantity + 1)}
            hitSlop={8}
          >
            <Ionicons name="add" size={16} color={t.primary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={onRemove} hitSlop={10} style={{ marginTop: 8, alignSelf: 'flex-end' }}>
          <Ionicons name="trash-outline" size={18} color={t.danger} />
        </TouchableOpacity>
      </View>
    </Card>
  );
}