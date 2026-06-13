/** 前端 API 客户端 — fetch 封装、JWT 注入、错误处理 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';

let onUnauthorized: (() => void) | null = null;

/** 注册 401 回调（由 AuthProvider 注入，用于清除过期登录态） */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
  meta: { total: number; page: number; limit: number } | null;
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  }

  private getApiKey(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('api_key');
    }
    return null;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    authMode: 'jwt' | 'apiKey' | 'none' = 'jwt'
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    if (authMode === 'jwt') {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } else if (authMode === 'apiKey') {
      const apiKey = this.getApiKey();
      if (apiKey) {
        headers['X-API-Key'] = apiKey;
      }
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });
    } catch {
      throw new ApiError(
        'NETWORK_ERROR',
        '无法连接服务器，请确认后端已启动（http://localhost:8000）',
        0,
      );
    }

    let json: ApiResponse<T>;
    try {
      json = await response.json();
    } catch {
      throw new ApiError('INVALID_RESPONSE', '服务器返回无效响应', response.status);
    }

    if (!response.ok) {
      if (response.status === 401 && onUnauthorized) {
        onUnauthorized();
      }
      const error = json.error || { code: 'UNKNOWN', message: '未知错误' };
      throw new ApiError(error.code, error.message, response.status);
    }

    return json;
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async upload<T>(endpoint: string, file: File): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
      });
    } catch {
      throw new ApiError(
        'NETWORK_ERROR',
        '无法连接服务器，请确认后端已启动（http://localhost:8000）',
        0,
      );
    }

    let json: ApiResponse<T>;
    try {
      json = await response.json();
    } catch {
      throw new ApiError('INVALID_RESPONSE', '服务器返回无效响应', response.status);
    }

    if (!response.ok) {
      if (response.status === 401 && onUnauthorized) {
        onUnauthorized();
      }
      const error = json.error || { code: 'UNKNOWN', message: '未知错误' };
      throw new ApiError(error.code, error.message, response.status);
    }

    return json;
  }
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiClient = new ApiClient();
