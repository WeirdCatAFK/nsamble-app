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
  update: (id, data) => json("PATCH", `/projects/${id}`, data),
};

export const models = {
  list: () => json("GET", "/models"),
};

export const conversations = {
  list: (projectId) =>
    json("GET", `/projects/${projectId}/conversations`),
  start: (projectId, modelSlug) =>
    json("POST", `/projects/${projectId}/conversations`, { modelSlug }),
  send: (projectId, sessionId, content) =>
    json("POST", `/projects/${projectId}/conversations/${sessionId}/messages`, { message: content }),
  stream: async (projectId, sessionId, content, onEvent, { signal } = {}) => {
    const res = await fetch(`${BASE}/projects/${projectId}/conversations/${sessionId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ..._token ? { Authorization: `Bearer ${_token}` } : {},
      },
      body: JSON.stringify({ message: content }),
      signal,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Request failed: ${res.status}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result = null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const event = JSON.parse(line.slice(6));
        if (event.type === "done") {
          result = event;
        } else {
          onEvent(event);
        }
      }
    }
    return result;
  },
  messages: (projectId, sessionId) =>
    json("GET", `/projects/${projectId}/conversations/${sessionId}/messages`),
};

export const files = {
  list: (projectId) => json("GET", `/projects/${projectId}/files`),
  meta: (projectId, id) => json("GET", `/projects/${projectId}/files/${id}`),
  contentUrl: (projectId, id) => `${BASE}/projects/${projectId}/files/${id}/content`,
  contentBlob: async (projectId, id) => {
    const res = await fetch(`${BASE}/projects/${projectId}/files/${id}/content`, {
      headers: _token ? { Authorization: `Bearer ${_token}` } : {},
    });
    if (!res.ok) throw new Error(`File fetch failed: ${res.status}`);
    return URL.createObjectURL(await res.blob());
  },
  upload: async (projectId, file, opts) => {
    const form = new FormData();
    form.append("file", file);
    const params = opts?.createPart ? "?createPart=true" : "";
    const res = await fetch(`${BASE}/projects/${projectId}/files/upload${params}`, {
      method: "POST",
      headers: _token ? { Authorization: `Bearer ${_token}` } : {},
      body: form,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Upload failed: ${res.status}`);
    }
    return res.json();
  },
};

export const scans = {
  start: async (projectId, video, calibration) => {
    const form = new FormData();
    form.append("video", video);
    if (calibration) form.append("calibration", calibration);
    const res = await fetch(`${BASE}/projects/${projectId}/scans`, {
      method: "POST",
      headers: _token ? { Authorization: `Bearer ${_token}` } : {},
      body: form,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Scan failed: ${res.status}`);
    }
    return res.json();
  },
  status: (projectId, scanId) =>
    json("GET", `/projects/${projectId}/scans/${scanId}`),
  import: (projectId, scanId, name) =>
    json("POST", `/projects/${projectId}/scans/${scanId}/import`, { name }),
};
