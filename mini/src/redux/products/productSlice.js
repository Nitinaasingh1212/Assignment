import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = 'https://dummyjson.com';

export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async ({ limit = 20, skip = 0, category = '', search = '' } = {}, { rejectWithValue }) => {
    try {
      let url = `${API_URL}/products`;
      if (category && category !== 'all') {
        url = `${API_URL}/products/category/${category}`;
      } else if (search) {
        url = `${API_URL}/products/search?q=${search}`;
      }
      url += `${url.includes('?') ? '&' : '?'}limit=${limit}&skip=${skip}`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchProductById = createAsyncThunk(
  'products/fetchProductById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/products/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchAllProducts = createAsyncThunk(
  'products/fetchAllProducts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/products?limit=100`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const initialState = {
  items: [],
  total: 0,
  selectedProduct: null,
  loading: false,
  error: null,
  allProducts: [],
};

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    addProduct: (state, action) => {
      state.items.unshift(action.payload);
      state.total += 1;
    },
    updateProduct: (state, action) => {
      const index = state.items.findIndex((p) => p.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = { ...state.items[index], ...action.payload };
      }
    },
    deleteProduct: (state, action) => {
      state.items = state.items.filter((p) => p.id !== action.payload);
      state.total = Math.max(0, state.total - 1);
    },
    clearSelectedProduct: (state) => {
      state.selectedProduct = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.products;
        state.total = action.payload.total;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchProductById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedProduct = action.payload;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchAllProducts.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchAllProducts.fulfilled, (state, action) => {
        state.allProducts = action.payload.products;
      })
      .addCase(fetchAllProducts.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const {
  addProduct,
  updateProduct,
  deleteProduct,
  clearSelectedProduct,
} = productSlice.actions;

export const selectProducts = (state) => state.products;
export const selectAllProducts = (state) => state.products.allProducts;

export default productSlice.reducer;

