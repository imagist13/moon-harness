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
  // Clone the body so the caller's own `res.json()` can still consume
  // the original response without "body already read" errors.
  if (res.status === 401) {
    const { useAuthStore } = await import('@/stores/authStore');
    useAuthStore.getState().logout();
    let message = '认证已过期，请重新登录';
    try {
      const data = await res.clone().json();
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

export interface ModelConfig {
  api_key: string;
  base_url: string;
  model: string;
  timeout?: string;
  dimension?: string;
}

export interface CustomModel {
  id: string;
  type: 'llm' | 'embedding' | 'rerank';
  name: string;
  api_key: string;
  base_url: string;
  model: string;
  timeout?: string;
  dimension?: string;
  enabled?: boolean;
}

export interface SettingsData {
  milvus: {
    host: string;
    port: string;
  };
  models: {
    llm: ModelConfig;
    embedding: ModelConfig;
    rerank: ModelConfig;
  };
  custom_models: CustomModel[];
  default_models_enabled?: Record<string, boolean>;
}

export interface SystemStatus {
  milvus_configured: boolean;
  models_configured: boolean;
}

export async function fetchSettings(): Promise<SettingsData> {
  const res = await fetch(`${API_BASE}/settings`, { headers: getHeaders() });
  await handleResponse(res);
  const data = await res.json();
  return data.data;
}

export async function updateSettings(updates: Record<string, string>): Promise<Record<string, string>> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });
  await handleResponse(res);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || '保存失败');
  }
  const data = await res.json();
  return data.data;
}

export async function fetchSystemStatus(): Promise<SystemStatus> {
  const res = await fetch(`${API_BASE}/settings/system-status`, { headers: getHeaders() });
  await handleResponse(res);
  const data = await res.json();
  return data.data;
}

export async function testMilvusConnection(host?: string, port?: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/settings/test-milvus`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ host, port }),
  });
  await handleResponse(res);
  const data = await res.json();
  return data.data;
}

export async function testModelConnection(
  modelType: 'llm' | 'embedding' | 'rerank',
  params: { api_key?: string; base_url?: string; model?: string }
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/settings/test-model`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ model_type: modelType, ...params }),
  });
  await handleResponse(res);
  const data = await res.json();
  return data.data;
}
