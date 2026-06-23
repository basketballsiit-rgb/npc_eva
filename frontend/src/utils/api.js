import Swal from 'sweetalert2';

const API_URL = import.meta.env.VITE_API_URL || ''; // Supports custom production API endpoint, defaults to relative proxy

let isRedirecting = false;

const handleUnauthorized = () => {
  if (!isRedirecting) {
    isRedirecting = true;
    localStorage.removeItem('npc_token');
    localStorage.removeItem('npc_user');
    
    Swal.fire({
      title: 'เซสชันหมดอายุ',
      text: 'เซสชันการใช้งานของคุณหมดอายุหรือระบบได้รับการอัปเดต กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
      icon: 'warning',
      confirmButtonColor: '#4A2C6D',
      confirmButtonText: 'ตกลง'
    }).then(() => {
      window.location.href = '/login';
    });
  }
  return new Promise(() => {}); // Never-resolving promise to block further execution in components
};


const request = async (method, path, body = null) => {
  const token = localStorage.getItem('npc_token');
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${path}`, config);

  if (response.status === 401 && !window.location.pathname.includes('/login')) {
    return handleUnauthorized();
  }

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.message || 'An unexpected error occurred';
    throw new Error(errorMsg);
  }

  return data;
};

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path),
  upload: async (path, file) => {
    const token = localStorage.getItem('npc_token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData
    });

    if (response.status === 401 && !window.location.pathname.includes('/login')) {
      return handleUnauthorized();
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to upload file');
    }
    return data;
  }
};
export const getUploadUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/api/uploads')) {
    return `${API_URL}${url}`;
  }
  return url;
};

export default api;
