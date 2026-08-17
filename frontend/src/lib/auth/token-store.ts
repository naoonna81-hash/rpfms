// เก็บ access token ไว้ใน memory เป็นหลัก และ fallback ไปที่ localStorage
// (refresh token เป็น httpOnly cookie ที่ backend ตั้งให้ ไม่ต้องจัดการฝั่ง client)

const STORAGE_KEY = "rpfms_access_token";

let accessToken: string | null = null;
const listeners = new Set<(token: string | null) => void>();

function readFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function initTokenStore() {
  if (accessToken === null) {
    accessToken = readFromStorage();
  }
  return accessToken;
}

export function getAccessToken(): string | null {
  if (accessToken !== null) return accessToken;
  return readFromStorage();
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof window !== "undefined") {
    try {
      if (token) window.localStorage.setItem(STORAGE_KEY, token);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage errors (e.g. private mode)
    }
  }
  listeners.forEach((l) => l(token));
}

export function subscribeToken(listener: (token: string | null) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearAccessToken() {
  setAccessToken(null);
}
