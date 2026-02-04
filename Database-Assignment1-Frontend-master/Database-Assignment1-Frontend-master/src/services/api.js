import axios from 'axios';

// Base API URL
const API_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData)
};

// Bills APIs
export const billsAPI = {
  getAll: () => api.get('/bills'),
  getMy: () => api.get('/bills/my'),
  getById: (billId) => api.get(`/bills/${billId}`),
  create: (billData) => api.post('/bills', billData),
  update: (billId, billData) => api.put(`/bills/${billId}`, billData),
  delete: (billId) => api.delete(`/bills/${billId}`)
};

// Customers APIs (For Admin/Staff management of customers)
export const customersAPI = {
  getAll: () => api.get('/customers'),
  getByProfileId: (profileId) => api.get(`/customers/${profileId}`),
  create: (customerData) => api.post('/customers', customerData),
  update: (profileId, customerData) => api.put(`/customers/${profileId}`, customerData),
  remove: (profileId) => api.delete(`/customers/${profileId}`)
};

// Single Customer API (For the logged-in user to manage themselves)
export const customerAPI = {
  getProfile: () => api.get('/customers/me'),
  updateProfile: (data) => api.put('/customers/me', data),
};

// Feedbacks APIs
export const feedbacksAPI = {
  getAll: () => api.get('/feedbacks'),
  getMy: () => api.get('/feedbacks/my'),
  getById: (feedbackId) => api.get(`/feedbacks/${feedbackId}`),
  create: (feedbackData) => api.post('/feedbacks', feedbackData),
  updateStatus: (feedbackId, status) => api.put(`/feedbacks/${feedbackId}/status`, { status }),
  addReply: (feedbackId, replyData) => api.post(`/feedbacks/${feedbackId}/replies`, replyData)
};

// Users APIs (Admin only)
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (userId) => api.get(`/users/${userId}`)
};

// Staffs APIs (Admin only)
export const staffsAPI = {
  getAll: () => api.get('/staffs'),
  getByProfileId: (profileId) => api.get(`/staffs/${profileId}`),
  create: (staffData) => api.post('/staffs', staffData),
  update: (profileId, staffData) => api.put(`/staffs/${profileId}`, staffData),
  remove: (profileId) => api.delete(`/staffs/${profileId}`)
};

// Admins APIs (Admin only)
export const adminsAPI = {
  getAll: () => api.get('/admins'),
  getByProfileId: (profileId) => api.get(`/admins/${profileId}`),
  create: (adminData) => api.post('/admins', adminData),
  update: (profileId, adminData) => api.put(`/admins/${profileId}`, adminData),
  remove: (profileId) => api.delete(`/admins/${profileId}`)
};

// Tariffs APIs
export const tariffsAPI = {
  getAll: () => api.get('/tariffs'),
  getById: (tariffId) => api.get(`/tariffs/${tariffId}`),
  create: (tariffData) => api.post('/tariffs', tariffData),
  update: (tariffId, tariffData) => api.put(`/tariffs/${tariffId}`, tariffData)
};

export default api;