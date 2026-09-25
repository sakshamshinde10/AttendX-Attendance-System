import api from './axiosConfig';

export const facultyApi = {
  getDashboard: async () => {
    const res = await api.get('/faculty/dashboard');
    return res.data;
  },

  getMySubjects: async () => {
    const res = await api.get('/faculty/subjects');
    return res.data;
  },

  getDepartments: async () => {
    const res = await api.get('/faculty/departments');
    return res.data;
  },

  getMyClasses: async () => {
    const res = await api.get('/faculty/classes');
    return res.data;
  },

  getSessionHistory: async (page = 1, limit = 20, subjectId?: string) => {
    const res = await api.get('/faculty/sessions', {
      params: { page, limit, subjectId },
    });
    return res.data;
  },

  getClassStudents: async (classId: string) => {
    const res = await api.get(`/faculty/students/${classId}`);
    return res.data;
  },

  getFlaggedRecords: async (sessionId: string) => {
    const res = await api.get(`/attendance/session/${sessionId}/flagged`);
    return res.data;
  },

  reviewRecord: async (recordId: string, status: 'present' | 'rejected', reviewNote?: string) => {
    const res = await api.put(`/attendance/record/${recordId}/review`, { status, reviewNote });
    return res.data;
  },

  updateProfile: async (data: { name?: string; phone?: string; profilePic?: string }) => {
    const res = await api.put('/faculty/profile', data);
    return res.data;
  },
};
