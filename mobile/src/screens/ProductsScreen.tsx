import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAsyncData } from '../hooks/useAsyncData';
import type { CartItem } from '../cart/CartContext';
import type { Product, ProductImage } from '../api/types';
import type { RootTabParamList } from '../navigation';
import { catalogApi } from '../api/endpoints';
import { apiImage } from '../api/client';
import { useCart } from '../cart/CartContext';
import { Screen } from '../components/Screen';
import { formatMoney } from '../components/ui';
import { Text } from '../components/ui/text';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { theme } from '../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = 10;
const CARD_PADDING = 10;
const GRID_CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - GRID_GAP) / 2;
const GRID_IMAGE_SIZE = GRID_CARD_WIDTH - CARD_PADDING * 2;

function ProductImageFx({ url, size }: { url?: string | null; size: number }) {
  const t = theme;
  const [uri, setUri] = useState<string | null | undefined>(undefined);
  const frame = { width: size, height: size, borderRadius: size / 4 };

  useEffect(() => {
    let active = true;
    setUri(undefined);
    if (!url) {
      setUri(null);
      return;
    }
    apiImage(url)
      .then((u) => {
        if (active) setUri(u);
      })
      .catch(() => {
        if (active) setUri(null);
      });
    return () => {
      active = false;
    };
  }, [url]);

  if (uri === undefined) {
    return (
      <View style={[frame, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="small" color={t.primary} />
      </View>
    );
  }
  if (uri === null) {
    return (
      <View style={[frame, { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border }]}>
        <Ionicons name="image-outline" size={size / 2.5} color={t.textSecondary} />
      </View>
    );
  }
  return <Image source={{ uri }} style={frame} resizeMode="cover" />;
}

function GalleryModal({ product, visible, onClose }: { product: Product | null; visible: boolean; onClose: () => void }) {
  const t = theme;
  const [images, setImages] = useState<ProductImage[]>([]);
  const [uris, setUris] = useState<(string | null)[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (!visible || !product || opened) return;
    setOpened(true);
    setLoading(true);
    setIndex(0);
    (async () => {
      try {
        const list = await catalogApi.productImages(product.id);
        setImages(list);
        setUris(await Promise.all(list.map((img) => apiImage(img.url).catch(() => null))));
      } catch {
        setImages([]);
        setUris([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [visible, product, opened]);

  useEffect(() => {
    if (!visible) {
      setOpened(false);
      setImages([]);
      setUris([]);
    }
  }, [visible]);

  const slideWidth = SCREEN_WIDTH - 48;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <View style={{ backgroundColor: t.bg, marginHorizontal: 24, borderRadius: 16, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', flex: 1, marginRight: 12 }} numberOfLines={1}>
              {product?.name ?? ''}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={t.primary} />
            </TouchableOpacity>
          </View>

          {loading && <ActivityIndicator color={t.primary} style={{ marginVertical: 60 }} />}

          {!loading && images.length === 0 && (
            <Text style={{ color: t.textSecondary, textAlign: 'center', paddingVertical: 40 }}>
              This product has no images yet.
            </Text>
          )}

          {!loading && images.length > 0 && (
            <>
              <FlatList
                data={uris}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, i) => String(i)}
                onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / slideWidth))}
                renderItem={({ item }) =>
                  item ? (
                    <Image source={{ uri: item }} style={{ width: slideWidth, height: 260, borderRadius: 12 }} resizeMode="contain" />
                  ) : (
                    <View style={{ alignItems: 'center', justifyContent: 'center', backgroundColor: t.card, borderRadius: 12, width: slideWidth, height: 260 }}>
                      <Ionicons name="image-outline" size={48} color={t.textSecondary} />
                    </View>
                  )
                }
              />
              <Text style={{ textAlign: 'center', color: t.textSecondary, fontSize: 13, marginTop: 8 }}>
                {index + 1} of {images.length}
              </Text>
            </>
          )}
          <Button onPress={onClose} style={{ alignSelf: 'center', marginTop: 16, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10 }}>
            <Text style={{ fontWeight: '700', fontSize: 15 }}>Done</Text>
          </Button>
        </View>
      </View>
    </Modal>
  );
}

function QtyStepper({ item, onChange }: { item: CartItem; onChange: (qty: number) => void }) {
  const t = theme;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <TouchableOpacity
        style={{ width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: t.primary, alignItems: 'center', justifyContent: 'center' }}
        onPress={() => onChange(item.quantity - 1)}
        hitSlop={8}
      >
        <Ionicons name="remove" size={18} color={t.primary} />
      </TouchableOpacity>
      <Text style={{ fontSize: 15, fontWeight: '700', minWidth: 20, textAlign: 'center' }}>{item.quantity}</Text>
      <TouchableOpacity
        style={{ width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: t.primary, alignItems: 'center', justifyContent: 'center' }}
        onPress={() => onChange(item.quantity + 1)}
        hitSlop={8}
      >
        <Ionicons name="add" size={18} color={t.primary} />
      </TouchableOpacity>
    </View>
  );
}

export function ProductsScreen() {
  const t = theme;
  const { data: products = [], loading, error, reload } = useAsyncData(() => catalogApi.products(), []);
  const { items, count, add, setQuantity } = useCart();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);

  const inCart: Record<number, CartItem> = useMemo(() => {
    const map: Record<number, CartItem> = {};
    for (const item of items) map[item.productId] = item;
    return map;
  }, [items]);

  const typeOf = (p: Product) => p.productType?.name ?? null;
  const groupOf = (p: Product) => p.productGroup?.name ?? null;

  const allTypes = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      const n = typeOf(p);
      if (n) set.add(n);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [products]);

  const availableGroups = useMemo(() => {
    const scoped = typeFilter ? products.filter((p) => typeOf(p) === typeFilter) : products;
    const set = new Set<string>();
    for (const p of scoped) {
      const n = groupOf(p);
      if (n) set.add(n);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [products, typeFilter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...products]
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q))
      .filter((p) => !typeFilter || typeOf(p) === typeFilter)
      .filter((p) => !groupFilter || groupOf(p) === groupFilter)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, query, typeFilter, groupFilter]);

  const renderProduct = (p: Product) => {
    const cartItem = inCart[p.id];
    return (
      <View
        style={{
          width: GRID_CARD_WIDTH,
          backgroundColor: t.card,
          borderWidth: 1,
          borderColor: t.border,
          borderRadius: 12,
          padding: CARD_PADDING,
        }}
      >
        <Pressable onPress={() => setSelected(p)}>
          <ProductImageFx url={p.imageUrl} size={GRID_IMAGE_SIZE} />
        </Pressable>
        <Pressable onPress={() => setSelected(p)} style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '600' }} numberOfLines={2}>
            {p.name}
          </Text>
          <Text style={{ fontSize: 11, color: t.textSecondary, marginTop: 2 }} numberOfLines={1}>
            {p.sku} · {p.unitOfMeasurement?.name ?? '-'}
          </Text>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 6, minHeight: 18 }}>
          {p.discountPercent ? (
            <>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#ef4444' }}>{formatMoney(p.effectivePrice)}</Text>
              <Text style={{ fontSize: 11, color: t.textSecondary, textDecorationLine: 'line-through' }}>{formatMoney(p.sellPrice)}</Text>
              <View style={{ backgroundColor: '#ef4444', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>-{p.discountPercent}%</Text>
              </View>
            </>
          ) : (
            <Text style={{ fontSize: 14, fontWeight: '800', color: t.primary }}>{formatMoney(p.sellPrice)}</Text>
          )}
        </View>
        <View style={{ marginTop: 8 }}>
          {cartItem ? (
            <View style={{ alignItems: 'center' }}>
              <QtyStepper item={cartItem} onChange={(q) => setQuantity(p.id, q)} />
            </View>
          ) : (
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: t.primary, borderRadius: 8, paddingVertical: 8 }}
              onPress={() => add(p)}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <Screen
      title="Shop"
      loading={loading}
      error={error}
      onRetry={() => void reload()}
      onRefresh={() => void reload()}
      headerRight={
        <TouchableOpacity onPress={() => navigation.navigate('Orders', { screen: 'Cart' })} hitSlop={12} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="cart-outline" size={24} color={t.textSecondary} />
          {count > 0 && (
            <View style={{ position: 'absolute', top: -6, right: -8, backgroundColor: '#ef4444', borderRadius: 8, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{count}</Text>
            </View>
          )}
        </TouchableOpacity>
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Input
          style={{ flex: 1, backgroundColor: t.card, borderRadius: 8, borderColor: t.border, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 }}
          value={query}
          onChangeText={setQuery}
          placeholder="Search products…"
          placeholderTextColor={t.textSecondary}
          autoCapitalize="none"
        />
        <FilterChip icon="pricetags-outline" label={typeFilter ?? 'Type'} active={typeFilter !== null} onPress={() => setTypePickerOpen(true)} />
        <FilterChip icon="grid-outline" label={groupFilter ?? 'Group'} active={groupFilter !== null} onPress={() => setGroupPickerOpen(true)} />
      </View>
      <FlatList
        scrollEnabled={false}
        data={filtered}
        numColumns={2}
        keyExtractor={(p) => String(p.id)}
        columnWrapperStyle={{ gap: GRID_GAP }}
        contentContainerStyle={{ gap: GRID_GAP }}
        renderItem={({ item }) => renderProduct(item)}
        ListEmptyComponent={
          <Text style={{ color: t.textSecondary, textAlign: 'center', paddingVertical: 24 }}>
            {query || typeFilter || groupFilter ? 'No products match your filters.' : 'No products yet.'}
          </Text>
        }
      />
      <GalleryModal product={selected} visible={selected !== null} onClose={() => setSelected(null)} />
      <PickerModal
        visible={typePickerOpen}
        title="Product type"
        options={allTypes}
        selected={typeFilter}
        onSelect={(v) => {
          setTypeFilter(v);
          setGroupFilter(null);
          setTypePickerOpen(false);
        }}
        onClose={() => setTypePickerOpen(false)}
      />
      <PickerModal
        visible={groupPickerOpen}
        title="Product group"
        options={availableGroups}
        selected={groupFilter}
        onSelect={(v) => {
          setGroupFilter(v);
          setGroupPickerOpen(false);
        }}
        onClose={() => setGroupPickerOpen(false)}
      />
    </Screen>
  );
}

function FilterChip({ icon, label, active, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; active: boolean; onPress: () => void }) {
  const t = theme;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 4,
        borderRadius: 8, borderWidth: 1,
        borderColor: active ? t.primary : t.border,
        backgroundColor: active ? 'rgba(37,99,235,0.08)' : t.card,
        paddingHorizontal: 10, paddingVertical: 10,
        maxWidth: 108,
      }}
    >
      <Ionicons name={icon} size={15} color={active ? t.primary : t.textSecondary} />
      <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '600', color: active ? t.primary : t.text }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function PickerRow({ label, selected, onPress, last }: { label: string; selected: boolean; onPress: () => void; last: boolean }) {
  const t = theme;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: t.border }}
    >
      <Text style={{ fontSize: 15, fontWeight: selected ? '700' : '400', color: selected ? t.primary : t.text }}>{label}</Text>
      {selected && <Ionicons name="checkmark" size={18} color={t.primary} />}
    </TouchableOpacity>
  );
}

function PickerModal({ visible, title, options, selected, onSelect, onClose }: { visible: boolean; title: string; options: string[]; selected: string | null; onSelect: (value: string | null) => void; onClose: () => void }) {
  const t = theme;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <View style={{ backgroundColor: t.bg, marginHorizontal: 24, borderRadius: 16, padding: 16, maxHeight: 420 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 17, fontWeight: '700' }}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={t.primary} />
            </TouchableOpacity>
          </View>
          {options.length === 0 ? (
            <Text style={{ color: t.textSecondary, fontSize: 13, paddingVertical: 8 }}>No options available.</Text>
          ) : (
            <ScrollView style={{ maxHeight: 320 }}>
              <PickerRow label="All" selected={selected === null} onPress={() => onSelect(null)} last={false} />
              {options.map((opt, i) => (
                <PickerRow key={opt} label={opt} selected={selected === opt} onPress={() => onSelect(opt)} last={i === options.length - 1} />
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}