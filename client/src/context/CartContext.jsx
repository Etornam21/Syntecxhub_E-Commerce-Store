import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

const EMPTY = { items: [], subtotal: 0, count: 0, shippingFee: 0, total: 0, freeShippingFrom: 500 };
const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(EMPTY);

  const refresh = useCallback(async () => {
    if (!user) return setCart(EMPTY);
    try {
      setCart(await api.get('/cart'));
    } catch {
      setCart(EMPTY);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = async (fn) => {
    const next = await fn();
    setCart(next);
    return next;
  };

  const value = {
    cart,
    refresh,
    add: (productId, quantity = 1) => run(() => api.post('/cart/items', { productId, quantity })),
    setQuantity: (productId, quantity) => run(() => api.patch(`/cart/items/${productId}`, { quantity })),
    remove: (productId) => run(() => api.del(`/cart/items/${productId}`)),
  };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
