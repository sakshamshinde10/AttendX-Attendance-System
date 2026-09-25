import api from './axiosConfig';

export const adminApi = {
  getDashboard: async () => {
    const res = await api.get('/admin/dashboard');
    return res.data;
  },

  // Students
  getStudents: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    department?: string;
    year?: number | string;
    semester?: number | string;
    division?: string;
  }) => {
    const res = await api.get('/admin/students', { params });
    return res.data;
  },
  createStudent: async (data: any) => {
    const res = await api.post('/admin/students', data);
    return res.data;
  },
  updateStudent: async (id: string, data: any) => {
    const res = await api.put(`/admin/students/${id}`, data);
    return res.data;
  },
  deleteStudent: async (id: string) => {
    const res = await api.delete(`/admin/students/${id}`);
    return res.data;
  },

  // Faculty
  getFaculty: async (params?: { department?: string; year?: number | string; semester?: number | string; subject?: string }) => {
    const res = await api.get('/admin/faculty', { params });
    return res.data;
  },
  getPendingFaculty: async () => {
    const res = await api.get('/admin/faculty/pending');
    return res.data;
  },
  approveFaculty: async (id: string) => {
    const res = await api.put(`/admin/faculty/${id}/approve`);
    return res.data;
  },
  rejectFaculty: async (id: string) => {
    const res = await api.delete(`/admin/faculty/${id}/reject`);
    return res.data;
  },
  createFaculty: async (data: any) => {
    const res = await api.post('/admin/faculty', data);
    return res.data;
  },
  updateFaculty: async (id: string, data: any) => {
    const res = await api.put(`/admin/faculty/${id}`, data);
    return res.data;
  },
  assignSubject: async (facultyId: string, subjectId: string) => {
    const res = await api.post(`/admin/faculty/${facultyId}/assign-subject`, { subjectId });
    return res.data;
  },
  unassignSubject: async (facultyId: string, subjectId: string) => {
    const res = await api.delete(`/admin/faculty/${facultyId}/subjects/${subjectId}`);
    return res.data;
  },

  // Departments
  getDepartments: async () => {
    const res = await api.get('/admin/departments');
    return res.data;
  },
  getDepartmentTeachers: async (deptId: string) => {
    const res = await api.get(`/admin/departments/${deptId}/teachers`);
    return res.data;
  },
  createDepartment: async (data: any) => {
    const res = await api.post('/admin/departments', data);
    return res.data;
  },
  updateDepartment: async (id: string, data: any) => {
    const res = await api.put(`/admin/departments/${id}`, data);
    return res.data;
  },
  deleteDepartment: async (id: string) => {
    const res = await api.delete(`/admin/departments/${id}`);
    return res.data;
  },

  // Subjects
  getSubjects: async (params?: { department?: string; year?: number | string; semester?: number | string }) => {
    const res = await api.get('/admin/subjects', { params });
    return res.data;
  },
  createSubject: async (data: any) => {
    const res = await api.post('/admin/subjects', data);
    return res.data;
  },
  updateSubject: async (id: string, data: any) => {
    const res = await api.put(`/admin/subjects/${id}`, data);
    return res.data;
  },

  // Classes
  getClasses: async () => {
    const res = await api.get('/admin/classes');
    return res.data;
  },
  createClass: async (data: any) => {
    const res = await api.post('/admin/classes', data);
    return res.data;
  },
  addStudentToClass: async (classId: string, studentId: string) => {
    const res = await api.post(`/admin/classes/${classId}/students/${studentId}`);
    return res.data;
  },
};
