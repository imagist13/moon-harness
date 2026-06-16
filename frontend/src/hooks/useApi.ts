import { ToolConfig, AuthResponse } from '@/types';
import { useAuthStore } from '@/stores/authStore';

const API_BASE = '/api';
const TOKEN_KEY = 'her-claw-token';

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(res: Response) {
  // 401 path: log the user out, then surface the API's error message.
  // We clone the body so the caller's own `res.json()` (or any other
  // reader) can still consume the original response.
  if (res.status === 401) {
    useAuthStore.getState().logout();
    let message = '认证已过期，请重新登录';
    try {
      const clone = res.clone();
      const data = await clone.json();
      if (data && typeof data.detail === 'string') {
        message = data.detail;
      }
    } catch {
      // body wasn't JSON; fall back to the default message
    }
    throw new Error(message);
  }
  return res;
}

export async function register(email: string | undefined, phone: string | undefined, password: string): Promise<AuthResponse> {
  const body: Record<string, string> = { password };
  if (email) body.email = email;
  if (phone) body.phone = phone;

  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || '注册失败');
  }
  const data = await res.json();
  return data.data;
}

export async function login(email: string | undefined, phone: string | undefined, password: string): Promise<AuthResponse> {
  const body: Record<string, string> = { password };
  if (email) body.email = email;
  if (phone) body.phone = phone;

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || '登录失败');
  }
  const data = await res.json();
  return data.data;
}

export async function fetchSessions(mode?: string) {
  const url = mode ? `${API_BASE}/sessions?mode=${mode}` : `${API_BASE}/sessions`;
  const res = await fetch(url, { headers: getHeaders() });
  await handleResponse(res);
  const data = await res.json();
  return data.data || [];
}

export async function fetchSession(sessionId: string) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}`, { headers: getHeaders() });
  await handleResponse(res);
  const data = await res.json();
  return data.data;
}

export async function createSession(title?: string, mode?: string, domainId?: string) {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ title: title || '新会话', mode, domain_id: domainId }),
  });
  await handleResponse(res);
  const data = await res.json();
  return data.data;
}

export async function updateSession(sessionId: string, data: { title?: string; pinned?: boolean }) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  await handleResponse(res);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || '更新失败');
  }
  return res.json();
}

export async function deleteSession(id: string) {
  const res = await fetch(`${API_BASE}/sessions/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  await handleResponse(res);
}

export async function fetchMessages(sessionId: string) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/messages`, { headers: getHeaders() });
  await handleResponse(res);
  const data = await res.json();
  return data.data || [];
}

export async function fetchTools() {
  const res = await fetch(`${API_BASE}/tools`, { headers: getHeaders() });
  await handleResponse(res);
  const data = await res.json();
  return data.data || [];
}

export async function createTool(tool: Omit<ToolConfig, 'created_at' | 'updated_at'>) {
  const res = await fetch(`${API_BASE}/tools`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(tool),
  });
  await handleResponse(res);
  const data = await res.json();
  return data.data;
}

export async function updateTool(name: string, updates: Partial<Omit<ToolConfig, 'type'>>) {
  const res = await fetch(`${API_BASE}/tools/${name}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });
  await handleResponse(res);
  const data = await res.json();
  return data.data;
}

export async function deleteTool(name: string) {
  const res = await fetch(`${API_BASE}/tools/${name}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  await handleResponse(res);
}

export async function toggleTool(name: string) {
  const res = await fetch(`${API_BASE}/tools/${name}/toggle`, {
    method: 'PUT',
    headers: getHeaders(),
  });
  await handleResponse(res);
  const data = await res.json();
  return data.data;
}

export async function fetchWeComBindingStatus() {
  const res = await fetch(`${API_BASE}/wecom/bind`, { headers: getHeaders() });
  await handleResponse(res);
  const data = await res.json();
  return data.data || { bound: false };
}

export async function unbindWeCom() {
  const res = await fetch(`${API_BASE}/wecom/bind`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  await handleResponse(res);
}

export async function bindWeCom(botId: string, secret: string) {
  const res = await fetch(`${API_BASE}/wecom/bind`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ bot_id: botId, secret }),
  });
  await handleResponse(res);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || '绑定失败');
  }
  const data = await res.json();
  return data;
}

// Skills
export async function fetchSkills() {
  const res = await fetch(`${API_BASE}/skills`, { headers: getHeaders() });
  await handleResponse(res);
  const data = await res.json();
  return data.data || [];
}

// RAG APIs
export async function fetchRagDocuments(domainId?: string) {
  const url = domainId ? `${API_BASE}/rag/documents?domain_id=${domainId}` : `${API_BASE}/rag/documents`;
  const res = await fetch(url, { headers: getHeaders() });
  await handleResponse(res);
  const data = await res.json();
  return data;
}

export async function uploadRagDocument(file: File, config: { chunk_size: number; chunk_overlap: number; smart_split: boolean }, domainId?: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('chunk_size', String(config.chunk_size));
  formData.append('chunk_overlap', String(config.chunk_overlap));
  formData.append('smart_split', String(config.smart_split));
  if (domainId) formData.append('domain_id', domainId);
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(`${API_BASE}/rag/documents`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  await handleResponse(res);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || '上传失败');
  }
  return res.json();
}

export async function deleteRagDocument(docId: string) {
  const res = await fetch(`${API_BASE}/rag/documents/${docId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  await handleResponse(res);
}

export async function retrainRagDocument(docId: string, config: { chunk_size: number; chunk_overlap: number; smart_split: boolean }) {
  const res = await fetch(`${API_BASE}/rag/documents/${docId}/retrain`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(config),
  });
  await handleResponse(res);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || '重新训练失败');
  }
  return res.json();
}

export async function testRagRetrieval(query: string, topK: number = 20, rerankTopN: number = 5, domainId?: string) {
  const url = domainId ? `${API_BASE}/rag/domains/${domainId}/test-retrieval` : `${API_BASE}/rag/test-retrieval`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ query, top_k: topK, rerank_top_n: rerankTopN }),
  });
  await handleResponse(res);
  const data = await res.json();
  return data;
}

export async function fetchRagStats(domainId?: string) {
  const url = domainId ? `${API_BASE}/rag/domains/${domainId}/stats` : `${API_BASE}/rag/stats`;
  const res = await fetch(url, { headers: getHeaders() });
  await handleResponse(res);
  const data = await res.json();
  return data;
}

// RAG Domain APIs
export async function fetchRagDomains() {
  const res = await fetch(`${API_BASE}/rag/domains`, { headers: getHeaders() });
  await handleResponse(res);
  const data = await res.json();
  return data.items || [];
}

export async function createRagDomain(name: string, description: string = '') {
  const res = await fetch(`${API_BASE}/rag/domains`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ name, description }),
  });
  await handleResponse(res);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || '创建领域失败');
  }
  return res.json();
}

export async function deleteRagDomain(domainId: string) {
  const res = await fetch(`${API_BASE}/rag/domains/${domainId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  await handleResponse(res);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || '删除领域失败');
  }
  return res.json();
}

export async function updateRagDomain(domainId: string, name: string, description: string = '') {
  const res = await fetch(`${API_BASE}/rag/domains/${domainId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ name, description }),
  });
  await handleResponse(res);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || '更新领域失败');
  }
  return res.json();
}

export async function fetchRagDocumentChunks(docId: string) {
  const res = await fetch(`${API_BASE}/rag/documents/${docId}/chunks`, { headers: getHeaders() });
  await handleResponse(res);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || '获取 chunks 失败');
  }
  const data = await res.json();
  return data.chunks || [];
}
