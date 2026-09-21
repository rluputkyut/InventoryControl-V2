import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import { apiImage } from '../api/client';
import { theme } from '../theme';
import { loadPublicShop } from '../shop/useShop';
import { Text } from './ui/text';

interface Props {
  variant?: 'center' | 'row';
}

/** Renders the shop logo (falling back to a storefront icon) and its name. */
export function ShopBrand({ variant = 'center' }: Props) {
  const t = theme;
  const [name, setName] = useState('Inventory Control');
  const [uri, setUri] = useState<string | null | undefined>(undefined);
  const [logoUrl, setLogoUrl] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    loadPublicShop()
      .then((shop) => {
        if (!active) return;
        setName(shop.name);
        setLogoUrl(shop.logoUrl);
        if (shop.logoUrl) {
          apiImage(shop.logoUrl)
            .then((u) => active && setUri(u))
            .catch(() => active && setUri(null));
        } else {
          setUri(null);
        }
      })
      .catch(() => {
        if (active) setUri(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const size = variant === 'center' ? 64 : 34;

  const logoStyle = {
    width: size,
    height: size,
    borderRadius: variant === 'center' ? 16 : 9,
  };

  const logo =
    logoUrl === undefined ? null : uri === undefined ? (
      <ActivityIndicator size="small" color={t.primary} />
    ) : uri ? (
      <Image source={{ uri }} style={logoStyle} resizeMode="cover" />
    ) : (
      <View
        style={[
          logoStyle,
          { alignItems: 'center', justifyContent: 'center', backgroundColor: t.card, borderWidth: 1, borderColor: t.border },
        ]}
      >
        <Ionicons name="storefront-outline" size={size * 0.55} color={t.primary} />
      </View>
    );

  if (variant === 'row') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {logo}
        <Text style={{ fontSize: 18, fontWeight: '800', flexShrink: 1 }} numberOfLines={1}>
          {name}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ alignItems: 'center' }}>
      {logo}
      <Text style={{ marginTop: 12, textAlign: 'center', fontSize: 28, fontWeight: '800' }}>{name}</Text>
    </View>
  );
}