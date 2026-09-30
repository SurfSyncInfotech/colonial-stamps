import { createContext, useContext, useState, useCallback } from 'react';
import { cartApi } from '../api/client';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await cartApi.get();
      setCart(res.data);
    } catch {
      setCart(null);
    }
  }, []);

  const addToCart = async (productId, qty = 1) => {
    setLoading(true);
    try {
      const res = await cartApi.addItem(productId, qty);
      setCart(res.data);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const updateQty = async (itemId, qty) => {
    const res = await cartApi.updateItem(itemId, qty);
    setCart(res.data);
  };

  return (
    <CartContext.Provider value={{ cart, loading, refresh, addToCart, updateQty, itemCount: cart?.itemCount || 0 }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
