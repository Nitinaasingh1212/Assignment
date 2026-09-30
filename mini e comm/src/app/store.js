import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../redux/auth/authSlice';
import cartReducer from '../redux/cart/cartSlice';
import wishlistReducer from '../redux/wishlist/wishlistSlice';
import productReducer from '../redux/products/productSlice';
import categoryReducer from '../redux/categories/categorySlice';
import searchReducer from '../redux/search/searchSlice';
import filterReducer from '../redux/filters/filterSlice';
import orderReducer from '../redux/orders/orderSlice';
import themeReducer from '../redux/theme/themeSlice';
import notificationReducer from '../redux/notifications/notificationSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    wishlist: wishlistReducer,
    products: productReducer,
    categories: categoryReducer,
    search: searchReducer,
    filters: filterReducer,
    orders: orderReducer,
    theme: themeReducer,
    notifications: notificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;

