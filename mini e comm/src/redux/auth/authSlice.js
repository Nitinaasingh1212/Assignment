import { createSlice } from '@reduxjs/toolkit';

const loadUserFromStorage = () => {
  try {
    const saved = localStorage.getItem('currentUser');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load user from storage', e);
  }
  return null;
};

const loadUsersFromStorage = () => {
  try {
    const saved = localStorage.getItem('users');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load users from storage', e);
  }
  return [];
};

const initialState = {
  user: loadUserFromStorage(),
  users: loadUsersFromStorage(),
  isAuthenticated: !!loadUserFromStorage(),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    registerRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    registerSuccess: (state, action) => {
      state.loading = false;
      state.users.push(action.payload);
      localStorage.setItem('users', JSON.stringify(state.users));
    },
    registerFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    loginRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.user = action.payload;
      state.isAuthenticated = true;
      localStorage.setItem('currentUser', JSON.stringify(action.payload));
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem('currentUser');
    },
    updateProfile: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem('currentUser', JSON.stringify(state.user));
      const index = state.users.findIndex((u) => u.email === state.user.email);
      if (index !== -1) {
        state.users[index] = state.user;
        localStorage.setItem('users', JSON.stringify(state.users));
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  registerRequest,
  registerSuccess,
  registerFailure,
  loginRequest,
  loginSuccess,
  loginFailure,
  logout,
  updateProfile,
  clearError,
} = authSlice.actions;

export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;

export default authSlice.reducer;

