import axios from 'axios';

export const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const COMP  = `${BASE_URL}/api/compensation`;
const AUTH  = `${BASE_URL}/api/auth`;


// ── Interceptor: auto-refresh expired tokens ──────────────────────────────
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry || originalRequest.url.includes('/token/refresh/')) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    
    try {
      const refresh = localStorage.getItem('refresh_token');
      if (!refresh) throw new Error("No refresh token");

      const res = await axios({
        method: 'post',
        url: `${AUTH}/token/refresh/`,
        data: { refresh },
        headers: {}
      });
      
      const token = res.data.access;
      localStorage.setItem('access_token', token);
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      originalRequest.headers['Authorization'] = `Bearer ${token}`;

      return axios(originalRequest);

    } catch (refreshError) {
      forceLogout();
      return Promise.reject(refreshError);
    }
  }
);

export const forceLogout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user'); 
  delete axios.defaults.headers.common['Authorization'];
  window.location.href = '/login';
};


function handleError(err) {
  const data = err.response?.data;
  if (!data) throw new Error(err.message || 'Network error.');
  if (typeof data === 'string') throw new Error(data);
  const msgs = Object.entries(data).map(([k, v]) =>
    `${k}: ${Array.isArray(v) ? v.join(', ') : v}`
  );
  throw new Error(msgs.join(' | '));
}

// ── Helper: always gets latest token from localStorage ────────────────────
const authHeader = () => {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  login:         (data)     => axios.post(`${AUTH}/login/`, data).then(r=>r.data).catch(handleError),
  logout:        (refresh)  => axios.post(`${AUTH}/logout/`, { refresh }).catch(()=>{}),
  profile:       ()         => axios.get(`${AUTH}/profile/`).then(r=>r.data).catch(handleError),
  listUsers:     (params)   => axios.get(`${AUTH}/users/`, { params }).then(r=>r.data).catch(handleError),
  syncHRMIS:     (id)       => axios.post(`${AUTH}/users/${id}/sync/`, {}, { headers: authHeader() }).then(r=>r.data).catch(handleError),
  // Standard createUser (used by UserManagement page — CP_ADMINISTRATION is already logged in, token is in defaults)
  createUser:    (data)     => axios.post(`${AUTH}/users/create/`, data).then(r=>r.data).catch(handleError),
  get_user:      (user_id)  => axios.get(`${AUTH}/users/${user_id}/`).then(r=>r.data).catch(handleError),
  toggleUserActive:  (user_id)  => axios.post(`${AUTH}/users/${user_id}/toggle-active/`, {}, { headers: authHeader() }).then(r=>r.data).catch(handleError),
  changePassword: (user_id, data) => axios.post(`${AUTH}/users/${user_id}/change-password/`, data, { headers: authHeader() }).then(r=>r.data).catch(handleError),
  updateUserRole: (user_id, role) => axios.post(`${AUTH}/users/${user_id}/update-role/`, { role }, { headers: authHeader() }).then(r=>r.data).catch(handleError),

  // Admin createUser — explicitly attaches current user's token (for use inside committee formation
  // where axios.defaults may not yet have the token set at call time)
  createUserAsAdmin: (data) => axios.post(
    `${AUTH}/users/create/`,
    data,
    { headers: authHeader() }
  ).then(r => r.data).catch(handleError),

  lookupSoldier: (checkNumber) =>
       fetch('http://192.168.10.12/api/authentication', {
       method: 'POST',
       headers: {
        'key': 'mainstore',
        'value': 'cc7bdc8b80572f99848145c70d219969d476a53c',
        'Content-Type': 'application/json',
        },
       body: JSON.stringify({
        checkno: checkNumber,
      }),
        }).then(async (res) => {
      if (!res.ok) throw new Error('Authentication failed');
      return res.json();
    }),

  lookupCommitteeMember: (checkNumber) =>
    fetch('http://192.168.10.12/api/authentication', {
      method: 'POST',
      headers: {
        'key': 'mainstore',
        'value': 'cc7bdc8b80572f99848145c70d219969d476a53c',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ checkno: checkNumber }),
    }).then(async (res) => {
      if (!res.ok) throw new Error('Authentication failed');
      return res.json();
    }),

  lookupUserByForceNumber: (force_number) =>
    axios.get(`${AUTH}/users/lookup/?force_number=${force_number}`)
      .then(r => r.data).catch(handleError),
};

// ── Cases ─────────────────────────────────────────────────────────────────
export const casesApi = {
  lookupSoldier: (fn)       => axios.get(`${COMP}/soldiers/${fn}/`).then(r=>r.data).catch(handleError),
  list:          (params)   => axios.get(`${COMP}/cases/`, { params }).then(r=>r.data).catch(handleError),
  submit:        (data)     => axios.post(`${COMP}/cases/submit/`, data).then(r=>r.data).catch(handleError),
  get:           (id)       => axios.get(`${COMP}/cases/${id}/`).then(r=>r.data).catch(handleError),
  uploadDocument:(id,form)  => axios.post(`${COMP}/cases/${id}/documents/upload/`, form,
                                 { headers:{'Content-Type':'multipart/form-data'} })
                                 .then(r=>r.data).catch(handleError),
  verifyDocument:(id,data)  => axios.post(`${COMP}/cases/${id}/documents/verify/`, data).then(r=>r.data).catch(handleError),
  review:        (id,data)  => axios.post(`${COMP}/cases/${id}/review/`, data).then(r=>r.data).catch(handleError),
  resubmit:      (id)       => axios.post(`${COMP}/cases/${id}/resubmit/`).then(r=>r.data).catch(handleError),
  suggestCommittee:(id)     => axios.get(`${COMP}/cases/${id}/committee/suggest/`).then(r=>r.data).catch(handleError),
  formCommittee: (id,data)  => axios.post(`${COMP}/cases/${id}/committee/`, data).then(r=>r.data).catch(handleError),
  submitInput:   (id,data)  => axios.post(`${COMP}/cases/${id}/assessment/input/`, data).then(r=>r.data).catch(handleError),
  getAssessment: (id)       => axios.get(`${COMP}/cases/${id}/assessment/`).then(r=>r.data).catch(handleError),
  getAudit:      (id)       => axios.get(`${COMP}/cases/${id}/audit/`).then(r=>r.data).catch(handleError),
  hqReview: (caseId, endpoint, data) =>
    axios.post(`${COMP}/cases/${caseId}/${endpoint}/`, data)
         .then(r => r.data)
         .catch(handleError),
};

// ── Formulas ──────────────────────────────────────────────────────────────
export const formulasApi = {
  list:   ()      => axios.get(`${COMP}/formulas/`).then(r=>r.data).catch(handleError),
  create: (data)  => axios.post(`${COMP}/formulas/`, data).then(r=>r.data).catch(handleError),
  update: (id,d)  => axios.patch(`${COMP}/formulas/${id}/`, d).then(r=>r.data).catch(handleError),
  remove: (id)    => axios.delete(`${COMP}/formulas/${id}/`).then(r=>r.data).catch(handleError),
};

// ── Notifications ─────────────────────────────────────────────────────────
export const notifApi = {
  list:       ()   => axios.get(`${COMP}/notifications/`).then(r=>r.data).catch(handleError),
  markRead:   (id) => axios.patch(`${COMP}/notifications/${id}/read/`).then(r=>r.data).catch(handleError),
  markAllRead:()   => axios.post(`${COMP}/notifications/read-all/`).then(r=>r.data).catch(handleError),
};

// ── Reminders ─────────────────────────────────────────────────────────────
export const systemApi = {
  sendReminders: () => axios.post(`${COMP}/reminders/`).then(r=>r.data).catch(handleError),
};
