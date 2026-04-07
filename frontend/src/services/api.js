const getToken = () => localStorage.getItem('token');

export const api = {
  get: (url) => fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } }).then(r => r.json()),
  post: (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(body) }).then(r => r.json()),
  put: (url, body) => fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(body) }).then(r => r.json()),
  delete: (url) => fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } }).then(r => r.json()),
  postForm: (url, formData) => fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: formData }).then(r => r.json()),
};
