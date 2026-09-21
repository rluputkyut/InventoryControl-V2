import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { secureStorage } from '../lib/secureStorage';
import type { Product } from '../api/types';

export interface CartItem {
  productId: number;
  name: string;
  sku: string;
  listPrice: number;
  unitPrice: number;
  quantity: number;
  imageUrl?: string | null;
  unit?: string | null;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (product: Product) => void;
  remove: (productId: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  clear: () => void;
}

const CART_KEY = 'ic.cart';
const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await secureStorage.getItemAsync(CART_KEY);
        if (!cancelled && raw) setItems(JSON.parse(raw) as CartItem[]);
      } catch {
        // ignore corrupt cache
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void secureStorage.setItemAsync(CART_KEY, JSON.stringify(items)).catch(() => undefined);
  }, [items, hydrated]);

  const add = (product: Product) =>
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) => (i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          listPrice: product.sellPrice,
          unitPrice: product.effectivePrice,
          quantity: 1,
          imageUrl: product.imageUrl ?? null,
          unit: product.unitOfMeasurement?.name ?? null,
        },
      ];
    });

  const remove = (productId: number) => setItems((prev) => prev.filter((i) => i.productId !== productId));

  const setQuantity = (productId: number, quantity: number) =>
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.productId !== productId)
        : prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
    );

  const clear = () => setItems([]);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    return { items, count, subtotal, add, remove, setQuantity, clear };
  }, [items, add, remove, setQuantity, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}