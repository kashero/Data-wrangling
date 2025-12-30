import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const api = {
  // Bookings
  createBooking: async (data) => {
    const response = await axios.post(`${API}/bookings`, data, { headers: getAuthHeader() });
    return response.data;
  },
  
  createSOSBooking: async (latitude, longitude) => {
    const response = await axios.post(`${API}/bookings/sos`, { latitude, longitude }, { headers: getAuthHeader() });
    return response.data;
  },
  
  getBookings: async () => {
    const response = await axios.get(`${API}/bookings`, { headers: getAuthHeader() });
    return response.data;
  },
  
  getPendingBookings: async () => {
    const response = await axios.get(`${API}/bookings/pending`, { headers: getAuthHeader() });
    return response.data;
  },
  
  getActiveBooking: async () => {
    const response = await axios.get(`${API}/bookings/active`, { headers: getAuthHeader() });
    return response.data;
  },
  
  getBooking: async (id) => {
    const response = await axios.get(`${API}/bookings/${id}`, { headers: getAuthHeader() });
    return response.data;
  },
  
  acceptBooking: async (id) => {
    const response = await axios.put(`${API}/bookings/${id}/accept`, {}, { headers: getAuthHeader() });
    return response.data;
  },
  
  updateBookingStatus: async (id, status) => {
    const response = await axios.put(`${API}/bookings/${id}/status?status=${status}`, {}, { headers: getAuthHeader() });
    return response.data;
  },
  
  rateBooking: async (id, rating, review) => {
    const response = await axios.post(`${API}/bookings/${id}/rate`, { rating, review }, { headers: getAuthHeader() });
    return response.data;
  },
  
  // Driver
  updateDriverProfile: async (data) => {
    const response = await axios.put(`${API}/driver/profile`, data, { headers: getAuthHeader() });
    return response.data;
  },
  
  updateDriverLocation: async (latitude, longitude) => {
    const response = await axios.put(`${API}/driver/location`, { latitude, longitude }, { headers: getAuthHeader() });
    return response.data;
  },
  
  getAvailableDrivers: async (ambulanceType) => {
    const url = ambulanceType ? `${API}/driver/available?ambulance_type=${ambulanceType}` : `${API}/driver/available`;
    const response = await axios.get(url, { headers: getAuthHeader() });
    return response.data;
  },
  
  getNearbyAmbulances: async (latitude, longitude, radiusKm = 50) => {
    const response = await axios.post(`${API}/driver/nearby`, {
      latitude,
      longitude,
      radius_km: radiusKm
    }, { headers: getAuthHeader() });
    return response.data;
  }
};
