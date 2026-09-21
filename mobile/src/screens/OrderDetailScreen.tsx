import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { UploadFile } from '../api/client';
import { useAsyncData } from '../hooks/useAsyncData';
import { apiImage } from '../api/client';
import type { OrdersStackParamList } from '../navigation';
import { ordersApi } from '../api/endpoints';
import { Screen } from '../components/Screen';
import { BackButton, Card, formatDate, formatDateTime, formatMoney, StatusBadge } from '../components/ui';
import { Text } from '../components/ui/text';
import { theme } from '../theme';
import { alert } from '../lib/alert';

type Props = { route: RouteProp<OrdersStackParamList, 'OrderDetail'> };

export function OrderDetailScreen({ route }: Props) {
  const t = theme;
  const { id } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<OrdersStackParamList>>();
  const { data: order, loading, error, reload } = useAsyncData(useCallback(() => ordersApi.get(id), [id]), [id]);
  const [proof, setProof] = useState<string | null | undefined>(undefined);
  const [uploading, setUploading] = useState(false);

  const pending = order?.status === 'PendingApproval';

  const loadProof = useCallback(async () => {
    if (!order?.paymentProofUrl) {
      setProof(null);
      return;
    }
    setProof(undefined);
    try {
      setProof(await apiImage(order.paymentProofUrl));
    } catch {
      setProof(null);
    }
  }, [order?.paymentProofUrl]);

  useEffect(() => {
    if (order?.paymentProofUrl) void loadProof();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.paymentProofUrl]);

  const pickAndUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.7 });
      if (result.canceled) return;
      const asset = result.assets[0];
      const ext = (asset.uri.split('.').pop() ?? 'jpg').toLowerCase();
      const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const file: UploadFile = {
        uri: asset.uri,
        name: `proof.${ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpg'}`,
        type,
      };
      setUploading(true);
      await ordersApi.uploadProof(id, file);
      await reload();
      await loadProof();
      alert('Proof uploaded', 'The payment screenshot has been submitted for review.');
    } catch (e) {
      alert('Upload failed', e instanceof Error ? e.message : 'Could not upload the screenshot.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Screen
      title={order?.number ?? `Order #${id}`}
      headerLeft={<BackButton onPress={() => navigation.goBack()} />}
      loading={loading}
      error={error}
      onRetry={() => void reload()}
    >
      {order && (
        <>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <StatusBadge status={order.status} />
              <Text style={{ fontSize: 12, color: t.textSecondary }}>{formatDate(order.createdAtUtc)}</Text>
            </View>
            {order.items?.map((line) => (
              <View key={line.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: t.border }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600' }}>{line.productName}</Text>
                  <Text style={{ fontSize: 12, color: t.textSecondary, marginTop: 2 }}>
                    {line.sku} · {line.quantity} × {formatMoney(line.unitPrice)}
                  </Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700' }}>{formatMoney(line.lineTotal)}</Text>
              </View>
            ))}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
              <Text style={{ fontSize: 13, color: t.textSecondary }}>Subtotal</Text>
              <Text style={{ fontSize: 14, fontWeight: '700' }}>{formatMoney(order.subtotal)}</Text>
            </View>
            {order.discountAmount > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
                <Text style={{ fontSize: 13, color: t.textSecondary }}>Discount</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#ef4444' }}>-{formatMoney(order.discountAmount)}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
              <Text style={{ fontSize: 15, color: t.textSecondary }}>Total</Text>
              <Text style={{ fontSize: 18, fontWeight: '700' }}>{formatMoney(order.total)}</Text>
            </View>
          </Card>

          <Card>
            <Text style={{ fontSize: 15, fontWeight: '700', marginBottom: 8 }}>Shipping</Text>
            <Detail label="Recipient" value={order.recipientName} />
            <Detail label="Phone" value={order.recipientPhone} />
            <Detail label="Address" value={order.shippingAddress} />
            {order.deliveryMethod ? <Detail label="Delivery" value={order.deliveryMethod.name} /> : null}
            {order.paymentMethod ? <Detail label="Payment" value={order.paymentMethod.name} /> : null}
            {order.notes ? <Detail label="Notes" value={order.notes} /> : null}
            <Detail label="Placed" value={formatDateTime(order.createdAtUtc)} />
            {order.approvedAtUtc ? <Detail label="Approved" value={formatDateTime(order.approvedAtUtc)} /> : null}
            {order.deliveredAtUtc ? <Detail label="Delivered" value={formatDateTime(order.deliveredAtUtc)} /> : null}
            {order.adminNote ? <Detail label="Admin note" value={order.adminNote} /> : null}
          </Card>

          <Card>
            <Text style={{ fontSize: 15, fontWeight: '700', marginBottom: 8 }}>Payment proof</Text>
            {proof === undefined && <ActivityIndicator color={t.primary} style={{ marginVertical: 12 }} />}
            {proof === null && !pending && <Text style={{ color: t.textSecondary, fontSize: 13, marginBottom: 8 }}>No payment proof submitted.</Text>}
            {proof && <Image source={{ uri: proof }} style={{ width: '100%', height: 220, borderRadius: 10, backgroundColor: t.card, marginBottom: 10 }} resizeMode="contain" />}
            {pending && (
              <Pressable
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: t.primary,
                  borderRadius: 8,
                  paddingVertical: 14,
                  marginTop: 4,
                  opacity: uploading ? 0.6 : 1,
                }}
                onPress={() => void pickAndUpload()}
                disabled={uploading}
              >
                {uploading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', marginLeft: 6 }}>{proof === null ? 'Upload payment proof' : 'Replace payment proof'}</Text>
                  </>
                )}
              </Pressable>
            )}
          </Card>
        </>
      )}
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  const t = theme;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: t.border }}>
      <Text style={{ fontSize: 13, color: t.textSecondary, marginRight: 12 }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}