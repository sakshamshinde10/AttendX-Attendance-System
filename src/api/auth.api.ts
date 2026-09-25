import api from './axiosConfig';

export interface LoginPayload {
  email: string;
  password: string;
  deviceId?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: 'student' | 'faculty' | 'admin';
  department?: string;
  year?: number;
  semester?: number;
  division?: string;
  phone?: string;
  deviceId?: string;
  studentId?: string;
  subjects?: string | string[];
}

export const authApi = {
  getDepartments: async () => {
    const res = await api.get('/auth/departments');
    return res.data;
  },

  login: async (credentials: LoginPayload) => {
    const res = await api.post('/auth/login', credentials);
    return res.data;
  },

  register: async (payload: RegisterPayload) => {
    const res = await api.post('/auth/register', payload);
    return res.data;
  },

  logout: async () => {
    try {
      const res = await api.post('/auth/logout');
      return res.data;
    } catch (err) {
      // Ignore API failure on logout so local state is cleared regardless
      return { success: true };
    }
  },

  forgotPassword: async (email: string) => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  },

  resetPassword: async (token: string, password: string) => {
    const res = await api.put(`/auth/reset-password/${token}`, { password });
    return res.data;
  },

  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  updateFCMToken: async (fcmToken: string) => {
    const res = await api.put('/auth/update-fcm-token', { fcmToken });
    return res.data;
  },
};
