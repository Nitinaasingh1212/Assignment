import { createSlice } from '@reduxjs/toolkit';

const loadCartFromStorage = () => {
  try {
    const saved = localStorage.getItem('cart');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load cart from storage', e);
  }
  return [];
};

const initialState = {
  items: loadCartFromStorage(),
  coupon: null,
  discount: 0,
  shippingCharge: 49,
  taxRate: 0.18,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const { id, title, price, image, discount } = action.payload;
      const existing = state.items.find((item) => item.id === id);
      if (existing) {
        existing.quantity += 1;
      } else {
        state.items.push({
          id,
          title,
          price,
          image,
          discount: discount || 0,
          quantity: 1,
        });
      }
      localStorage.setItem('cart', JSON.stringify(state.items));
    },
    removeFromCart: (state, action) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
      localStorage.setItem('cart', JSON.stringify(state.items));
    },
    updateQuantity: (state, action) => {
      const { id, quantity } = action.payload;
      const item = state.items.find((item) => item.id === id);
      if (item) {
        item.quantity = Math.max(1, quantity);
      }
      localStorage.setItem('cart', JSON.stringify(state.items));
    },
    increaseQuantity: (state, action) => {
      const item = state.items.find((item) => item.id === action.payload);
      if (item) {
        item.quantity += 1;
      }
      localStorage.setItem('cart', JSON.stringify(state.items));
    },
    decreaseQuantity: (state, action) => {
      const item = state.items.find((item) => item.id === action.payload);
      if (item && item.quantity > 1) {
        item.quantity -= 1;
      }
      localStorage.setItem('cart', JSON.stringify(state.items));
    },
    clearCart: (state) => {
      state.items = [];
      state.coupon = null;
      state.discount = 0;
      localStorage.removeItem('cart');
    },
    applyCoupon: (state, action) => {
      state.coupon = action.payload;
      state.discount = 10; // 10% discount
    },
    removeCoupon: (state) => {
      state.coupon = null;
      state.discount = 0;
    },
    moveToCart: (state, action) => {
      const existing = state.items.find((item) => item.id === action.payload.id);
      if (!existing) {
        state.items.push(action.payload);
        localStorage.setItem('cart', JSON.stringify(state.items));
      }
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  updateQuantity,
  increaseQuantity,
  decreaseQuantity,
  clearCart,
  applyCoupon,
  removeCoupon,
  moveToCart,
} = cartSlice.actions;

export const selectCart = (state) => state.cart;
export const selectCartItems = (state) => state.cart.items;
export const selectCartTotal = (state) => {
  const subtotal = state.cart.items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
  const discountAmount = subtotal * (state.cart.discount / 100);
  const afterDiscount = subtotal - discountAmount;
  const tax = afterDiscount * state.cart.taxRate;
  const shipping = state.cart.items.length > 0 ? state.cart.shippingCharge : 0;
  return {
    subtotal,
    discount: discountAmount,
    tax,
    shipping,
    total: afterDiscount + tax + shipping,
  };
};
export const selectCartCount = (state) =>
  state.cart.items.reduce((count, item) => count + item.quantity, 0);

export default cartSlice.reducer;

