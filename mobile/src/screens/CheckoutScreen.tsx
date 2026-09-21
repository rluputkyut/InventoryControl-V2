import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { UploadFile } from '../api/client';
import { useCart } from '../cart/CartContext';
import { useAuth } from '../auth/AuthContext';
import type { OrdersStackParamList } from '../navigation';
import { checkoutApi, ordersApi } from '../api/endpoints';
import type { CheckoutDelivery, CheckoutPayment } from '../api/types';
import { Screen } from '../components/Screen';
import { BackButton, Card, formatMoney } from '../components/ui';
import { Text } from '../components/ui/text';
import { Input } from '../components/ui/input';
import { AddressInput } from '../components/AddressInput';
import { API_URL } from '../config';
import { theme } from '../theme';
import { alert } from '../lib/alert';

type Nav = NativeStackNavigationProp<OrdersStackParamList, 'Checkout'>;

export function CheckoutScreen() {
  const t = theme;
  const navigation = useNavigation<Nav>();
  const { items, subtotal, clear } = useCart();
  const { user } = useAuth();
  const savedAddress = user?.address?.trim() ?? '';

  const [useMyAddress, setUseMyAddress] = useState(savedAddress.length > 0);

  const [deliveryMethods, setDeliveryMethods] = useState<CheckoutDelivery[]>([]);
  const [payments, setPayments] = useState<CheckoutPayment[]>([]);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<number | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [customShippingAddress, setCustomShippingAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [proof, setProof] = useState<UploadFile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingOptions(true);
    checkoutApi
      .options()
      .then((res) => {
        if (!active) return;
        const dels = res.deliveries ?? [];
        setDeliveryMethods(dels);
        const first = dels[0] ?? null;
        setSelectedDeliveryId(first?.id ?? null);
        setPayments(first?.payments ?? []);
        setSelectedPaymentId(first?.payments?.[0]?.id ?? null);
      })
      .catch(() => {
        if (active) {
          alert('Unavailable', 'Could not load checkout options.');
        }
      })
      .finally(() => {
        if (active) setLoadingOptions(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const onPickDelivery = (d: CheckoutDelivery) => {
    setSelectedDeliveryId(d.id);
    setPayments(d.payments);
    setSelectedPaymentId(d.payments[0]?.id ?? null);
  };

  const pickProof = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const ext = (asset.uri.split('.').pop() ?? 'jpg').toLowerCase();
      const type =
        ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      setProof({
        uri: asset.uri,
        name: `proof.${ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpg'}`,
        type,
      });
    } catch {
      alert('Pick failed', 'Could not open your photo library.');
    }
  };

  const placeOrder = async () => {
    if (items.length === 0)
      return alert('Empty cart', 'Add products before checking out.');
    const shippingAddress = useMyAddress ? savedAddress : customShippingAddress.trim();
    if (!recipientName.trim() || !recipientPhone.trim() || !shippingAddress) {
      return alert(
        'Missing details',
        'Recipient name, phone, and shipping address are required.',
      );
    }
    if (!selectedDeliveryId || !selectedPaymentId)
      return alert('Missing selection', 'Please choose a delivery and payment method.');

    setSubmitting(true);
    try {
      const order = await ordersApi.create({
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        shippingAddress,
        deliveryMethodId: selectedDeliveryId,
        paymentMethodId: selectedPaymentId,
        notes: notes.trim() || null,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      if (proof) {
        try {
          await ordersApi.uploadProof(order.id, proof);
        } catch {
          // Order still stands; the proof can be attached from My orders.
        }
      }
      clear();
      alert('Order placed', `Order ${order.number} is pending approval.`, [
        { text: 'View orders', onPress: () => navigation.navigate('OrdersList') },
      ]);
    } catch (e) {
      alert(
        'Order failed',
        e instanceof Error ? e.message : 'Could not place the order.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <Screen title="Checkout" headerLeft={<BackButton onPress={() => navigation.goBack()} />}>
        <Text style={{ paddingVertical: 40, textAlign: 'center', fontSize: 14, color: t.textSecondary }}>
          Your cart is empty — add products from the shop first.
        </Text>
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <Screen title="Checkout" headerLeft={<BackButton onPress={() => navigation.goBack()} />}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Card>
            {items.map((i) => (
              <View
                key={i.productId}
                style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: t.border, paddingVertical: 6 }}
              >
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                  {i.name}
                </Text>
                <Text style={{ marginRight: 10, fontSize: 12, color: t.textSecondary }}>× {i.quantity}</Text>
                <Text style={{ fontSize: 14, fontWeight: '700' }}>
                  {formatMoney(i.unitPrice * i.quantity)}
                </Text>
              </View>
            ))}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
              <Text style={{ flex: 1, fontSize: 16, fontWeight: '800' }}>Total</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: t.primary }}>
                {formatMoney(subtotal)}
              </Text>
            </View>
          </Card>

          <Text style={{ marginBottom: 8, marginTop: 14, fontSize: 14, fontWeight: '700' }}>Receiver</Text>
          <Input
            value={recipientName}
            onChangeText={setRecipientName}
            placeholder="Recipient name"
          />
          <Input
            value={recipientPhone}
            onChangeText={setRecipientPhone}
            placeholder="Phone number"
            keyboardType="phone-pad"
          />

          <Text style={{ marginBottom: 8, marginTop: 14, fontSize: 14, fontWeight: '700' }}>
            Shipping address
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            <Pressable
              onPress={() => { if (savedAddress) setUseMyAddress(true); }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                borderRadius: 8, borderWidth: 1,
                borderColor: useMyAddress ? t.primary : t.border,
                backgroundColor: useMyAddress ? 'rgba(37,99,235,0.08)' : t.card,
                paddingHorizontal: 10, paddingVertical: 8,
                opacity: savedAddress ? 1 : 0.45,
              }}
            >
              <Ionicons name="home-outline" size={16} color={useMyAddress ? t.primary : t.textSecondary} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: useMyAddress ? t.primary : t.text }}>
                Same as my address
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setUseMyAddress(false)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                borderRadius: 8, borderWidth: 1,
                borderColor: !useMyAddress ? t.primary : t.border,
                backgroundColor: !useMyAddress ? 'rgba(37,99,235,0.08)' : t.card,
                paddingHorizontal: 10, paddingVertical: 8,
              }}
            >
              <Ionicons name="location-outline" size={16} color={!useMyAddress ? t.primary : t.textSecondary} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: !useMyAddress ? t.primary : t.text }}>
                Different address
              </Text>
            </Pressable>
          </View>
          {useMyAddress ? (
            savedAddress ? (
              <View style={{ borderRadius: 8, borderWidth: 1, borderColor: t.border, backgroundColor: t.card, padding: 12 }}>
                <Text style={{ fontSize: 14, color: t.text }}>{savedAddress}</Text>
              </View>
            ) : (
              <Text style={{ fontSize: 13, color: t.textSecondary }}>
                You have no saved address — choose "Different address" to enter one.
              </Text>
            )
          ) : (
            <AddressInput
              value={customShippingAddress}
              onChangeText={setCustomShippingAddress}
              placeholder="Start typing an address…"
            />
          )}
          <View style={{ height: 4 }} />

          <Input
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes (optional)"
          />

          <Text style={{ marginBottom: 8, marginTop: 14, fontSize: 14, fontWeight: '700' }}>
            Delivery method
          </Text>
          {loadingOptions ? (
            <ActivityIndicator style={{ marginBottom: 10 }} color={t.primary} />
          ) : deliveryMethods.length === 0 ? (
            <Text style={{ marginBottom: 10, fontSize: 13, color: t.textSecondary }}>
              No delivery methods available for this shop.
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {deliveryMethods.map((d) => (
                <Pressable
                  key={d.id}
                  onPress={() => onPickDelivery(d)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    borderRadius: 8, borderWidth: 1,
                    borderColor: selectedDeliveryId === d.id ? t.primary : t.border,
                    backgroundColor: selectedDeliveryId === d.id ? 'rgba(37,99,235,0.08)' : t.card,
                    paddingHorizontal: 10, paddingVertical: 8,
                  }}
                >
                  {d.logoUrl ? (
                    <Image source={{ uri: `${API_URL}${d.logoUrl}` }} style={{ width: 18, height: 18, borderRadius: 4 }} />
                  ) : null}
                  <Text style={{ fontSize: 13, fontWeight: '600', color: selectedDeliveryId === d.id ? t.primary : t.text }}>
                    {d.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <Text style={{ marginBottom: 8, marginTop: 6, fontSize: 14, fontWeight: '700' }}>
            Payment method
          </Text>
          {payments.length === 0 ? (
            <Text style={{ marginBottom: 10, fontSize: 13, color: t.textSecondary }}>
              Select a delivery method first.
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {payments.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => setSelectedPaymentId(p.id)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    borderRadius: 8, borderWidth: 1,
                    borderColor: selectedPaymentId === p.id ? t.primary : t.border,
                    backgroundColor: selectedPaymentId === p.id ? 'rgba(37,99,235,0.08)' : t.card,
                    paddingHorizontal: 10, paddingVertical: 8,
                  }}
                >
                  {p.logoUrl ? (
                    <Image source={{ uri: `${API_URL}${p.logoUrl}` }} style={{ width: 18, height: 18, borderRadius: 4 }} />
                  ) : null}
                  <Text style={{ fontSize: 13, fontWeight: '600', color: selectedPaymentId === p.id ? t.primary : t.text }}>
                    {p.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <Text style={{ marginBottom: 8, marginTop: 6, fontSize: 14, fontWeight: '700' }}>
            Payment proof (optional)
          </Text>
          {proof ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image
                source={{ uri: proof.uri }}
                style={{ height: 88, width: 88, borderRadius: 10, borderWidth: 1, borderColor: t.border, backgroundColor: t.card }}
              />
              <Pressable
                style={{ paddingHorizontal: 12, paddingVertical: 8 }}
                onPress={() => void pickProof()}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: t.primary }}>Change</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: t.primary, backgroundColor: t.card, paddingVertical: 16 }}
              onPress={() => void pickProof()}
            >
              <Ionicons name="image-outline" size={20} color={theme.primary} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: t.primary, marginLeft: 8 }}>
                Upload payment proof (optional)
              </Text>
            </Pressable>
          )}
        </ScrollView>

        <Pressable
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            backgroundColor: t.primary,
            paddingVertical: 14,
            marginTop: 4,
            opacity: submitting ? 0.6 : 1,
          }}
          onPress={() => void placeOrder()}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
              Place order · {formatMoney(subtotal)}
            </Text>
          )}
        </Pressable>
      </Screen>
    </KeyboardAvoidingView>
  );
}