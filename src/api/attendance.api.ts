import api from './axiosConfig';

export interface MarkAttendancePayload {
  sessionId: string;
  qrToken: string;
  bleRSSI?: number | null;
  scannedBLEUUID?: string;
  deviceId?: string;
  deviceInfo?: any;
}

export interface StartSessionPayload {
  subjectId: string;
  departmentId?: string;
  year?: number | string;
  semester?: number | string;
  division?: string;
  lectureNumber?: string;
  topic?: string;
  classId?: string;
  location?: { room?: string; building?: string; [key: string]: any };
}

export const attendanceApi = {
  // Student API calls
  markAttendance: async (payload: MarkAttendancePayload) => {
    const res = await api.post('/attendance/mark', payload);
    return res.data;
  },

  getStudentHistory: async (page = 1, limit = 20, subjectId?: string) => {
    const res = await api.get('/attendance/history', {
      params: { page, limit, subjectId },
    });
    return res.data;
  },

  getStudentStats: async () => {
    const res = await api.get('/attendance/stats');
    return res.data;
  },

  getSubjectHistory: async (subjectId: string) => {
    const res = await api.get(`/attendance/subject/${subjectId}/history`);
    return res.data;
  },

  // Faculty API calls
  startSession: async (payload: StartSessionPayload) => {
    const res = await api.post('/attendance/sessions/start', payload);
    return res.data;
  },

  getActiveSession: async () => {
    const res = await api.get('/attendance/sessions/active');
    return res.data;
  },

  refreshQR: async (sessionId: string) => {
    const res = await api.get(`/attendance/sessions/qr-refresh/${sessionId}`);
    return res.data;
  },

  endSession: async (sessionId: string) => {
    const res = await api.put(`/attendance/sessions/end/${sessionId}`);
    return res.data;
  },

  getSessionRecords: async (sessionId: string) => {
    const res = await api.get(`/attendance/sessions/${sessionId}/records`);
    return res.data;
  },

  getSessionRosterAttendance: async (sessionId: string) => {
    const res = await api.get(`/reports/session/${sessionId}/roster`);
    return res.data;
  },
};

