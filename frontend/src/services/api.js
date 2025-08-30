import axios from 'axios';

const API_URL = 'http://localhost:5000/api';
export const SOCKET_URL = 'http://localhost:5000/';


// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create a multipart form instance for file uploads
const apiForm = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});


// Authentication services
export const authService = {
  // Register a new user
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Login a user
  login: async (credentials) => {
    try {
      console.log(credentials);
      const response = await api.post('/auth/login', credentials);
      // Store token and user in sessionStorage
      if (response.data.token) {
        sessionStorage.setItem('token', response.data.token);
        sessionStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data.user;
    } catch (error) {
      throw error;
    }
  },

  // Get current user
  getCurrentUser: () => {
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  },

  // Logout user
  logout: () => {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
  },
};

/**
 * Axios request interceptor to add JWT token to Authorization header.
 */
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token && !config.url.includes('/auth/login') && !config.url.includes('/auth/register')) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Axios response interceptor to handle token expiration/invalid.
 * If a 401 error is received, clear session and redirect to login.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('token');
      // Try to redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Items services
export const itemsService = {
  // Get all items
  getItems: async () => {
    try {
      const response = await api.get('/items');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get a specific item
  getItem: async (id) => {
    try {
      const response = await api.get(`/items/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create a new item
  createItem: async (itemData) => {
    try {
      const response = await api.post('/items', itemData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update an item
  updateItem: async (id, itemData) => {
    try {
      const response = await api.put(`/items/${id}`, itemData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete an item
  deleteItem: async (id) => {
    try {
      const response = await api.delete(`/items/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Detection services
export const detectionService = {
  // Detect weapons in an image
  detectImage: async (imageFile) => {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      
      const response = await apiForm.post('/detect/image', formData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Detect weapons in a video
  detectVideo: async (videoFile) => {
    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      
      const response = await apiForm.post('/detect/video', formData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default api;
