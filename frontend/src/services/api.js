/**
 * api.js  –  Frontend API client for the ShellForge backend.
 * All calls go through Vite's /api proxy → http://127.0.0.1:3001
 */

const BASE = '/api';

async function req(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Request failed');
  return json.data;
}

export const api = {
  /* Health check */
  health: () => req('GET', '/health'),

  /* Directory listing */
  list: (path = '')    => req('GET', `/files?path=${encodeURIComponent(path)}`),
  metadata: (path)     => req('GET', `/files/metadata?path=${encodeURIComponent(path)}`),
  content: (path)      => req('GET', `/files/content?path=${encodeURIComponent(path)}`),

  /* Create */
  createFile: (path)   => req('POST', '/files', { path, type: 'file' }),
  createDir:  (path)   => req('POST', '/files', { path, type: 'directory' }),

  /* Write */
  writeFile: (path, content) => req('PUT', '/files/content', { path, content }),

  /* File operations */
  copy:   (src, dst)      => req('POST', '/files/copy',   { src, dst }),
  move:   (src, dst)      => req('POST', '/files/move',   { src, dst }),
  rename: (src, newName)  => req('POST', '/files/rename', { src, newName }),
  remove: (path)          => req('DELETE', '/files',      { path }),

  /* Search */
  search: (q, path = '') =>
    req('GET', `/search?q=${encodeURIComponent(q)}&path=${encodeURIComponent(path)}`),

  /* Permissions */
  getPermissions: (path) =>
    req('GET', `/files/permissions?path=${encodeURIComponent(path)}`),
  setPermissions: (path, mode) =>
    req('PATCH', '/files/permissions', { path, mode }),

  /* Upload */
  uploadFile: async (file, path = '') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);
    const res = await fetch(`${BASE}/files/upload`, {
      method: 'POST',
      body: formData,
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Upload failed');
    return json.data;
  },

  /* Download URL */
  downloadUrl: (path) => `${BASE}/files/download?path=${encodeURIComponent(path)}`,

  /* System Info */
  systemInfo: () => req('GET', '/system'),
};
