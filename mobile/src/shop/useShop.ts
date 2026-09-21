import { useEffect, useState } from 'react';
import { shopApi } from '../api/endpoints';
import type { PublicShop } from '../api/types';
import { setShopCurrencyCode } from '../components/ui';

let cached: PublicShop | null = null;
let pending: Promise<PublicShop> | null = null;

function applyCachedShop(shop: PublicShop): PublicShop {
  setShopCurrencyCode(shop.countryCurrencyCode || 'USD');
  return shop;
}

/** Fetches the public shop once and caches it module-wide for all consumers. */
export function loadPublicShop(): Promise<PublicShop> {
  if (cached) return Promise.resolve(applyCachedShop(cached));
  if (!pending) {
    pending = shopApi
      .public()
      .then((shop) => {
        cached = shop;
        pending = null;
        return applyCachedShop(shop);
      })
      .catch((error) => {
        pending = null;
        throw error;
      });
  }
  return pending;
}

export function useShop(): { shop: PublicShop | null } {
  const [shop, setShop] = useState<PublicShop | null>(cached);

  useEffect(() => {
    if (cached) {
      setShop(cached);
      return;
    }
    let active = true;
    loadPublicShop()
      .then((s) => {
        if (active) setShop(s);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  return { shop };
}

/** Example phone placeholder for the shop's country, e.g. "+95 000 000 000". */
export function phonePlaceholder(shop: PublicShop | null): string {
  const code = shop?.countryPhoneCode?.trim();
  return code ? `${code} 000 000 000` : '+1 555 000 1234';
}