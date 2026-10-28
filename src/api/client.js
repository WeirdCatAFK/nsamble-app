const BASE = "/api";

let _token = localStorage.getItem("nsamble_token");

function headers() {
  const h = { "Content-Type": "application/json" };
  if (_token) h.Authorization = `Bearer ${_token}`;
  return h;
}

async function request(method, path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return response;
}

async function json(method, path, body) {
  const response = await request(method, path, body);
  return response.json();
}

export function setToken(token) {
  _token = token;
  if (token) localStorage.setItem("nsamble_token", token);
  else localStorage.removeItem("nsamble_token");
}

export function getToken() {
  return _token;
}

export const auth = {
  register: (data) => json("POST", "/auth/register", data),
  login: (data) => json("POST", "/auth/login", data),
  me: () => json("GET", "/auth/me"),
  google: (credential) => json("POST", "/auth/google", { credential }),
};

export const projects = {
  create: (data) => json("POST", "/projects", data),
  list: () => json("GET", "/projects"),
  get: (id) => json("GET", `/projects/${id}`),
};

export const conversations = {
  start: (projectId) => json("POST", "/conversations", { projectId }),
  send: (sessionId, content) =>
    json("POST", `/conversations/${sessionId}/messages`, { content }),
  messages: (sessionId) => json("GET", `/conversations/${sessionId}/messages`),
};

export const files = {
  list: (projectId) => json("GET", `/files?projectId=${projectId}`),
  meta: (id) => json("GET", `/files/${id}`),
  contentUrl: (id) => `${BASE}/files/${id}/content`,
};
