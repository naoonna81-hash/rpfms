import { clearAccessToken, getAccessToken, setAccessToken } from "@/lib/auth/token-store";
import type { ApiResponse } from "@/types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export class ApiClientError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = "ApiClientError";
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  isForm?: boolean;
  skipAuth?: boolean;
  /** ใช้ภายในเพื่อกันการ refresh วนซ้ำ */
  _retried?: boolean;
}

let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) return false;
        const json = (await res.json()) as ApiResponse<{ accessToken: string }>;
        if (json.success && json.data?.accessToken) {
          setAccessToken(json.data.accessToken);
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, isForm, skipAuth, _retried, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(headers as Record<string, string> | undefined),
  };

  let payload: BodyInit | undefined;
  if (body !== undefined) {
    if (isForm) {
      payload = body as FormData;
    } else {
      finalHeaders["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
  }

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: payload,
    credentials: "include",
  });

  // 401 -> ลอง refresh หนึ่งครั้งแล้ว retry
  if (res.status === 401 && !skipAuth && !_retried) {
    const refreshed = await doRefresh();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, _retried: true });
    }
    clearAccessToken();
    if (typeof window !== "undefined") {
      const next = window.location.pathname + window.location.search;
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = `/login?next=${encodeURIComponent(next)}`;
      }
    }
    throw new ApiClientError("UNAUTHORIZED", "กรุณาเข้าสู่ระบบใหม่อีกครั้ง", 401);
  }

  let json: ApiResponse<T> | undefined;
  try {
    json = await res.json();
  } catch {
    if (!res.ok) {
      throw new ApiClientError("INTERNAL_ERROR", `เกิดข้อผิดพลาด (HTTP ${res.status})`, res.status);
    }
    // no-content responses (e.g. 204)
    return undefined as T;
  }

  if (!json || !json.success) {
    const err = json && "error" in json ? json.error : undefined;
    throw new ApiClientError(
      err?.code ?? "INTERNAL_ERROR",
      err?.message ?? "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ",
      res.status,
    );
  }

  return json.data;
}

export interface ApiListResult<T> {
  items: T[];
  meta: { page: number; limit: number; total: number };
}

export async function apiFetchList<T>(path: string, options: RequestOptions = {}): Promise<ApiListResult<T>> {
  const { body, isForm, skipAuth, headers, ...rest } = options;
  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(headers as Record<string, string> | undefined),
  };
  let payload: BodyInit | undefined;
  if (body !== undefined) {
    if (isForm) payload = body as FormData;
    else {
      finalHeaders["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
  }
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: payload,
    credentials: "include",
  });

  if (res.status === 401 && !skipAuth) {
    const refreshed = await doRefresh();
    if (refreshed) return apiFetchList<T>(path, options);
    clearAccessToken();
    throw new ApiClientError("UNAUTHORIZED", "กรุณาเข้าสู่ระบบใหม่อีกครั้ง", 401);
  }

  const json = (await res.json()) as ApiResponse<T[]>;
  if (!json.success) {
    throw new ApiClientError(json.error.code, json.error.message, res.status);
  }
  return {
    items: json.data ?? [],
    meta: {
      page: (json.meta?.page as number) ?? 1,
      limit: (json.meta?.limit as number) ?? 20,
      total: (json.meta?.total as number) ?? json.data?.length ?? 0,
    },
  };
}

export function buildQuery<T extends object>(params: T): string {
  const usp = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") usp.set(k, String(v));
  });
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

/** ดาวน์โหลดไฟล์ (report export) จาก endpoint ที่คืนค่าเป็นไฟล์ ไม่ใช่ envelope JSON */
export async function apiDownload(path: string, filename: string): Promise<void> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: "include",
  });
  if (!res.ok) {
    throw new ApiClientError("INTERNAL_ERROR", "ไม่สามารถดาวน์โหลดไฟล์ได้", res.status);
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
