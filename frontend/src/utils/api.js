const API_URL = import.meta.env.VITE_API_URL || ''; // Supports custom production API endpoint, defaults to relative proxy


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

    const response = await fetch(path, {
      method: 'POST',
      headers,
      body: formData
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to upload file');
    }
    return data;
  }
};
export default api;
